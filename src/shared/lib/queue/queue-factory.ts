import 'server-only';

import { Queue, Worker } from 'bullmq';

import type { ManagedQueue, QueueConfig, QueueHealthStatus } from '@/shared/contracts/jobs';

import { getRedisConnection } from './redis-connection';
import { registerQueue } from './registry';

import { logSystemEvent } from '../observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import type { Job } from 'bullmq';

const TRANSIENT_REDIS_ERROR_CODES = new Set(['EPIPE', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT']);

const transientErrorLoggedAt = new Map<string, number>();
const TRANSIENT_ERROR_LOG_COOLDOWN_MS = 30_000;

const isTransientRedisTransportError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const code = (error as NodeJS.ErrnoException).code;
  if (typeof code === 'string' && TRANSIENT_REDIS_ERROR_CODES.has(code.toUpperCase())) {
    return true;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes('write epipe') ||
    message.includes('read econnreset') ||
    message.includes('econnreset') ||
    message.includes('econnrefused') ||
    message.includes('connection is closed') ||
    message.includes('socket closed unexpectedly') ||
    message.includes('timeout')
  );
};

const shouldLogTransientQueueError = (queueName: string, message: string): boolean => {
  const key = `${queueName}:${message}`;
  const now = Date.now();
  const lastLoggedAt = transientErrorLoggedAt.get(key) ?? 0;
  if (now - lastLoggedAt < TRANSIENT_ERROR_LOG_COOLDOWN_MS) return false;
  transientErrorLoggedAt.set(key, now);
  return true;
};

export function createManagedQueue<TJobData>(
  config: QueueConfig<TJobData>
): ManagedQueue<TJobData> {
  let queue: Queue | null = null;
  let worker: Worker | null = null;
  let workerStarted = false;
  let lastProcessTime = 0;

  const ensureQueue = (): Queue | null => {
    if (queue) return queue;
    const connection = getRedisConnection();
    if (!connection) return null;
    queue = new Queue(config.name, {
      connection,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 100,
        ...config.defaultJobOptions,
      },
    });
    queue.on('error', (err: Error) => {
      if (isTransientRedisTransportError(err)) {
        const normalizedMessage = err.message.trim() || 'Redis transport error';
        if (shouldLogTransientQueueError(config.name, normalizedMessage)) {
          void logSystemEvent({
            level: 'warn',
            source: 'queue-factory',
            message: `[queue-factory:${config.name}] transient queue transport error: ${normalizedMessage}`,
            context: { queueName: config.name },
          });
        }
        return;
      }
      void ErrorSystem.captureException(err, {
        service: `queue:${config.name}`,
        category: 'SYSTEM',
      });
    });
    return queue;
  };

  const processInline = async (data: TJobData): Promise<unknown> => {
    return config.processor(data, `inline-${Date.now()}`);
  };

  const enqueue = async (
    data: TJobData,
    opts?: Partial<import('bullmq').JobsOptions> & {
      repeat?: { every: number };
      jobId?: string;
    }
  ): Promise<string> => {
    const q = ensureQueue();
    if (!q) {
      // Fallback: process inline when Redis is not available
      await processInline(data);
      return `inline-${Date.now()}`;
    }
    const { repeat, jobId, ...jobOpts } = opts ?? {};
    const job = await q.add(config.name, data as Record<string, unknown>, {
      ...jobOpts,
      ...(repeat ? { repeat } : {}),
      ...(jobId ? { jobId } : {}),
    });
    return job.id ?? `unknown-${Date.now()}`;
  };

  const startWorker = (): void => {
    if (workerStarted) return;
    const connection = getRedisConnection();
    if (!connection) {
      void logSystemEvent({
        level: 'info',
        message: `[queue-factory:${config.name}] Redis not available, using inline processing mode`,
        source: 'queue-factory',
      });
      return;
    }
    workerStarted = true;

    // lockDuration must exceed the per-job timeout so BullMQ never declares a
    // still-running job stalled.  Add 60 s buffer for final DB writes after the
    // job resolves.  Fall back to 30 s (BullMQ default) when no timeout is set.
    const jobTimeoutMs = config.jobTimeoutMs ?? 0;
    const lockDuration =
      jobTimeoutMs > 0
        ? jobTimeoutMs + 60_000
        : ((config.workerOptions?.['lockDuration'] as number | undefined) ?? 30_000);

    worker = new Worker(
      config.name,
      async (job: Job) => {
        lastProcessTime = Date.now();
        const data = job.data as TJobData;

        if (!jobTimeoutMs) {
          return config.processor(data, job.id ?? 'unknown');
        }

        // Per-job wall-clock timeout.  Abort the processor signal; the engine
        // honours the signal and stops iteration cleanly (run → canceled).
        const timeoutController = new AbortController();
        const timer = setTimeout(() => {
          void logSystemEvent({
            level: 'warn',
            source: `queue:${config.name}`,
            message: `[queue-factory:${config.name}] job ${job.id ?? 'unknown'} timed out after ${jobTimeoutMs}ms`,
            context: {
              event: 'job.timeout',
              jobId: job.id,
              queueName: config.name,
              timeoutMs: jobTimeoutMs,
            },
          });
          timeoutController.abort(
            new Error(`Job ${job.id ?? 'unknown'} timed out after ${jobTimeoutMs} ms`)
          );
        }, jobTimeoutMs);
        try {
          return await config.processor(data, job.id ?? 'unknown', timeoutController.signal);
        } finally {
          clearTimeout(timer);
        }
      },
      {
        ...config.workerOptions,
        connection,
        concurrency: config.concurrency,

        lockDuration,
        removeOnComplete: { count: 0 },
        removeOnFail: { count: 100 },
      }
    );

    if (config.onCompleted) {
      worker.on('completed', (job: Job, result: unknown) => {
        void config.onCompleted!(job.id ?? 'unknown', result, job.data as TJobData);
      });
    }

    if (config.onFailed) {
      worker.on('failed', (job: Job | undefined, error: Error) => {
        if (job) {
          const maxAttempts =
            typeof job.opts.attempts === 'number' && Number.isFinite(job.opts.attempts)
              ? Math.max(1, Math.floor(job.opts.attempts))
              : 1;
          const attemptsMade = Math.max(1, Math.floor(job.attemptsMade || 0));
          void config.onFailed!(job.id ?? 'unknown', error, job.data as TJobData, {
            attemptsMade,
            maxAttempts,
          });
        }
      });
    }

    worker.on('error', (err: Error) => {
      if (isTransientRedisTransportError(err)) {
        const normalizedMessage = err.message.trim() || 'Redis transport error';
        if (shouldLogTransientQueueError(config.name, normalizedMessage)) {
          void logSystemEvent({
            level: 'warn',
            source: 'queue-factory',
            message: `[queue-factory:${config.name}] transient worker transport error: ${normalizedMessage}`,
            context: { queueName: config.name },
          });
        }
        return;
      }
      void ErrorSystem.captureException(err, {
        service: `queue-worker:${config.name}`,
        category: 'SYSTEM',
      });
    });

    void logSystemEvent({
      level: 'info',
      message: `[queue-factory:${config.name}] BullMQ worker started (concurrency: ${config.concurrency})`,
      source: 'queue-factory',
      context: { concurrency: config.concurrency },
    });
  };

  const stopWorker = async (): Promise<void> => {
    if (worker) {
      await worker.close();
      worker = null;
    }
    if (queue) {
      await queue.close();
      queue = null;
    }
    workerStarted = false;
    void logSystemEvent({
      level: 'info',
      message: `[queue-factory:${config.name}] Worker stopped`,
      source: 'queue-factory',
    });
  };

  const getHealthStatus = async (): Promise<QueueHealthStatus> => {
    const q = ensureQueue();
    if (!q) {
      return {
        running: false,
        healthy: false,
        processing: false,
        activeCount: 0,
        waitingCount: 0,
        failedCount: 0,
        completedCount: 0,
        lastPollTime: 0,
        timeSinceLastPoll: 0,
      };
    }
    const counts = await q.getJobCounts('active', 'waiting', 'failed', 'completed');
    const now = Date.now();
    return {
      running: workerStarted,
      healthy: workerStarted && (lastProcessTime === 0 || now - lastProcessTime < 120_000),
      processing: (counts['active'] ?? 0) > 0,
      activeCount: counts['active'] ?? 0,
      waitingCount: counts['waiting'] ?? 0,
      failedCount: counts['failed'] ?? 0,
      completedCount: counts['completed'] ?? 0,
      lastPollTime: lastProcessTime,
      timeSinceLastPoll: lastProcessTime > 0 ? now - lastProcessTime : 0,
    };
  };

  const managed: ManagedQueue<TJobData> = {
    enqueue,
    startWorker,
    stopWorker,
    getHealthStatus,
    processInline,
    getQueue: () => queue,
  };

  registerQueue(config.name, managed as ManagedQueue<unknown>);

  return managed;
}
