import 'server-only';

import { Queue, Worker } from 'bullmq';

import { getRedisConnection } from './redis-connection';
import { registerQueue } from './registry';

import type { QueueConfig, ManagedQueue, QueueHealthStatus } from './types';
import type { Job } from 'bullmq';

const logSystemEvent = async (params: { level: string; message: string; source: string; context?: Record<string, unknown> }): Promise<void> => {
  try {
    // eslint-disable-next-line import/no-restricted-paths
    const { logSystemEvent: realLogSystemEvent } = await import('@/features/observability/server');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    await realLogSystemEvent(params as any);
  } catch {
    // ignore
  }
};

const captureException = async (error: unknown, context: { service: string; category?: string; context?: Record<string, unknown> }): Promise<void> => {
  try {
    // eslint-disable-next-line import/no-restricted-paths
    const { ErrorSystem } = await import('@/features/observability/server');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    await ErrorSystem.captureException(error, context as any);
  } catch {
    // ignore
  }
};

export function createManagedQueue<TJobData>(
  config: QueueConfig<TJobData>,
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
    return queue;
  };

  const processInline = async (data: TJobData): Promise<unknown> => {
    return config.processor(data, `inline-${Date.now()}`);
  };

  const enqueue = async (
    data: TJobData,
    opts?: Partial<import('bullmq').JobsOptions> & { repeat?: { every: number }; jobId?: string },
  ): Promise<string> => {
    const q = ensureQueue();
    if (!q) {
      // Fallback: process inline when Redis is not available
      await processInline(data);
      return `inline-${Date.now()}`;
    }
    const { repeat, jobId, ...jobOpts } = opts ?? {};
    const job = await q.add(
      config.name,
      data as Record<string, unknown>,
      {
        ...jobOpts,
        ...(repeat ? { repeat } : {}),
        ...(jobId ? { jobId } : {}),
      },
    );
    return job.id ?? `unknown-${Date.now()}`;
  };

  const startWorker = (): void => {
    if (workerStarted) return;
    const connection = getRedisConnection();
    if (!connection) {
      void logSystemEvent({
        level: 'info',
        message: `[queue-factory:${config.name}] Redis not available, using inline processing mode`,
        source: 'queue-factory'
      });
      return;
    }
    workerStarted = true;
    worker = new Worker(
      config.name,
      async (job: Job) => {
        lastProcessTime = Date.now();
        const data = job.data as TJobData;
        return config.processor(data, job.id ?? 'unknown');
      },
      {
        ...config.workerOptions,
        connection,
        concurrency: config.concurrency,
        removeOnComplete: { count: 0 },
        removeOnFail: { count: 100 },
      },
    );

    if (config.onCompleted) {
      worker.on('completed', (job: Job, result: unknown) => {
        void config.onCompleted!(job.id ?? 'unknown', result, job.data as TJobData);
      });
    }

    if (config.onFailed) {
      worker.on('failed', (job: Job | undefined, error: Error) => {
        if (job) {
          void config.onFailed!(job.id ?? 'unknown', error, job.data as TJobData);
        }
      });
    }

    worker.on('error', (err: Error) => {
      void captureException(err, {
        service: `queue-worker:${config.name}`,
        category: 'SYSTEM',
      });
    });

    void logSystemEvent({
      level: 'info',
      message: `[queue-factory:${config.name}] BullMQ worker started (concurrency: ${config.concurrency})`,
      source: 'queue-factory',
      context: { concurrency: config.concurrency }
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
      source: 'queue-factory'
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
