/**
 * Queue Factory
 * 
 * Centralized factory for creating and managing BullMQ queues.
 * This factory abstracts the complexities of:
 * - Redis connection management (shared via `getRedisConnection`).
 * - Worker lifecycle: Managing starting, stopping, and handling job timeouts.
 * - Observability: Automatically attaches error handlers, slow-job tracking, 
 *   and system-level events for all managed queues.
 * - Inline Fallback: Seamlessly falls back to inline execution when Redis is unavailable.
 * - Health Monitoring: Provides a standard `QueueHealthStatus` interface for admin monitoring.
 */

import 'server-only';

import { Queue, Worker } from 'bullmq';

import type { ManagedQueue, QueueConfig, QueueHealthStatus } from '@/shared/contracts/jobs';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { getRedisConnection } from './redis-connection';
import { registerQueue } from './registry';
import { logSystemEvent } from '../observability/system-logger';

import type { Job } from 'bullmq';

const TRANSIENT_REDIS_ERROR_CODES = new Set(['EPIPE', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT']);
type BullMqQueueConnection = NonNullable<ConstructorParameters<typeof Queue>[1]>['connection'];
type BullMqWorkerConnection = NonNullable<ConstructorParameters<typeof Worker>[2]>['connection'];

const transientErrorLoggedAt = new Map<string, number>();
const TRANSIENT_ERROR_LOG_COOLDOWN_MS = 30_000;

/**
 * Heuristic to identify recoverable transport-level Redis errors (e.g., socket resets).
 * These errors suggest that the connection may be momentarily unavailable or stale, 
 * warranting a retry or safe fallback rather than crashing the worker.
 */
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

/**
 * Prevents log saturation by enforcing a cooldown period for specific error messages per queue.
 */
const shouldLogTransientQueueError = (queueName: string, message: string): boolean => {
  const key = `${queueName}:${message}`;
  const now = Date.now();
  const lastLoggedAt = transientErrorLoggedAt.get(key) ?? 0;
  if (now - lastLoggedAt < TRANSIENT_ERROR_LOG_COOLDOWN_MS) return false;
  transientErrorLoggedAt.set(key, now);
  return true;
};

/**
 * Creates and registers a new managed queue instance.
 * 
 * @param config - Queue configuration defining name, processor, and operational parameters (concurrency, timeouts).
 * @returns An instance of `ManagedQueue` for interacting with the queue and managing worker lifecycle.
 */
export function createManagedQueue<TJobData>(
  config: QueueConfig<TJobData>
): ManagedQueue<TJobData> {
  let queue: Queue | null = null;
  let worker: Worker | null = null;
  let workerStarted = false;
  let lastProcessTime = 0;

  /**
   * Lazily initializes the BullMQ queue instance and attaches internal observability listeners.
   */
  const ensureQueue = (): Queue | null => {
    if (queue) return queue;
    const connection = getRedisConnection();
    if (!connection) return null;
    queue = new Queue(config.name, {
      connection: connection as BullMqQueueConnection,
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

  /**
   * Executes the job processor function immediately. Used when Redis/Queues are unavailable.
   */
  const processInline = async (data: TJobData): Promise<unknown> => {
    return config.processor(data, `inline-${Date.now()}`, undefined, {
      updateProgress: async () => {},
    });
  };

  /**
   * Enqueues a job into the queue, or falls back to inline processing if Redis is unavailable.
   */
  const enqueue = async (
    data: TJobData,
    opts?: Partial<import('bullmq').JobsOptions> & {
      repeat?: { every: number };
      jobId?: string;
    }
  ): Promise<string> => {
    const q = ensureQueue();
    if (!q) {
      await processInline(data);
      return `inline-${Date.now()}`;
    }
    const { repeat, jobId, ...jobOpts } = opts ?? {};
    try {
      const job = await q.add(config.name, data as Record<string, unknown>, {
        ...jobOpts,
        ...(repeat ? { repeat } : {}),
        ...(jobId ? { jobId } : {}),
      });
      return job.id ?? `unknown-${Date.now()}`;
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: `queue:${config.name}`,
        category: 'SYSTEM',
        action: 'enqueue',
        jobId: jobId ?? null,
      });
      throw error;
    }
  };

  /**
   * Initializes the BullMQ worker.
   * Handles per-job timeouts using `AbortController` and logs performance metrics.
   */
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

    worker = new Worker<TJobData>(
      config.name,
      async (job: Job<TJobData>) => {
        lastProcessTime = Date.now();
        const data = job.data;

        if (!jobTimeoutMs) {
          return config.processor(data, job.id ?? 'unknown', undefined, {
            updateProgress: async (progress: unknown) => {
              await job.updateProgress(progress as object | number);
            },
          });
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
          return await config.processor(
            data,
            job.id ?? 'unknown',
            timeoutController.signal,
            {
              updateProgress: async (progress: unknown) => {
                await job.updateProgress(progress as object | number);
              },
            }
          );
        } finally {
          clearTimeout(timer);
        }
      },
      {
        ...config.workerOptions,
        connection: connection as BullMqWorkerConnection,
        concurrency: config.concurrency,
        lockDuration,
        removeOnComplete: { count: 0 },
        removeOnFail: { count: 100 },
      }
    );

    worker.on('completed', (job: Job<TJobData>, result: unknown) => {
      const durationMs = Date.now() - (job.processedOn ?? Date.now());
      if (durationMs > 10000) {
        void logSystemEvent({
          level: 'warn',
          source: 'queue-factory',
          message: `[queue-factory:${config.name}] slow job ${job.id ?? 'unknown'} completed in ${durationMs}ms`,
          context: {
            queueName: config.name,
            jobId: job.id,
            durationMs,
          },
        });
      }
      if (config.onCompleted) {
        void config.onCompleted(job.id ?? 'unknown', result, job.data);
      }
    });

    const onFailedCallback = config.onFailed;
    if (onFailedCallback) {
      worker.on('failed', (job: Job<TJobData> | undefined, error: Error) => {
        if (job) {
          const maxAttempts =
            typeof job.opts.attempts === 'number' && Number.isFinite(job.opts.attempts)
              ? Math.max(1, Math.floor(job.opts.attempts))
              : 1;
          const attemptsMade = Math.max(1, Math.floor(job.attemptsMade || 0));
          void onFailedCallback(job.id ?? 'unknown', error, job.data, {
            attemptsMade,
            maxAttempts,
          });
        }
      });
    } else {
      worker.on('failed', (job: Job<TJobData> | undefined, error: Error) => {
        void ErrorSystem.captureException(error, {
          service: `queue-worker:${config.name}`,
          category: 'SYSTEM',
          action: 'job-failed',
          jobId: job?.id,
          context: {
            queueName: config.name,
            attemptsMade: job?.attemptsMade,
          },
        });
      });
    }

    const onStalledCallback = config.onStalled;
    if (onStalledCallback) {
      worker.on('stalled', (jobId: string, prevStatus: string) => {
        void onStalledCallback(jobId, prevStatus);
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

  /**
   * Gracefully shuts down the worker and queue instance.
   */
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

  /**
   * Aggregates job counts and worker state to expose queue health metrics.
   */
  const getHealthStatus = async (): Promise<QueueHealthStatus> => {
    const q = ensureQueue();
    if (!q) {
      return {
        deliveryMode: 'inline',
        workerState: 'inline',
        statusReason: 'missing_redis',
        redisAvailable: false,
        workerLocal: false,
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
    const activeCount = counts['active'] ?? 0;
    const waitingCount = counts['waiting'] ?? 0;
    const failedCount = counts['failed'] ?? 0;
    const completedCount = counts['completed'] ?? 0;
    const processing = activeCount > 0;
    const hasObservedQueueActivity =
      processing ||
      waitingCount > 0 ||
      failedCount > 0 ||
      completedCount > 0 ||
      lastProcessTime > 0;
    const workerState = processing
      ? 'running'
      : workerStarted || hasObservedQueueActivity
        ? 'idle'
        : 'offline';

    return {
      deliveryMode: 'queue',
      workerState,
      statusReason: workerState === 'offline' ? 'worker_inactive' : undefined,
      redisAvailable: true,
      workerLocal: workerStarted,
      running: workerStarted || processing,
      healthy: workerState !== 'offline',
      processing,
      activeCount,
      waitingCount,
      failedCount,
      completedCount,
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
