import 'server-only';

import { tickDatabaseBackupScheduler } from '@/features/database/services/database-backup-scheduler';
import { createManagedQueue } from '@/shared/lib/queue';

type DatabaseBackupSchedulerJobData = {
  type: 'scheduled-tick';
};

const parseMsFromEnv = (raw: string | undefined, fallback: number, min: number): number => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.floor(parsed));
};

export const DATABASE_BACKUP_SCHEDULER_REPEAT_EVERY_MS = parseMsFromEnv(
  process.env['DATABASE_BACKUP_SCHEDULER_REPEAT_EVERY_MS'],
  60_000,
  30_000,
);
const DATABASE_BACKUP_SCHEDULER_LOCK_DURATION_MS = parseMsFromEnv(
  process.env['DATABASE_BACKUP_SCHEDULER_LOCK_DURATION_MS'],
  60_000,
  30_000,
);

type DatabaseBackupSchedulerQueueState = {
  workerStarted: boolean;
  schedulerRegistered: boolean;
};

const globalWithState = globalThis as typeof globalThis & {
  __databaseBackupSchedulerQueueState__?: DatabaseBackupSchedulerQueueState;
};

const queueState =
  globalWithState.__databaseBackupSchedulerQueueState__ ??
  (globalWithState.__databaseBackupSchedulerQueueState__ = {
    workerStarted: false,
    schedulerRegistered: false,
  });

const queue = createManagedQueue<DatabaseBackupSchedulerJobData>({
  name: 'database-backup-scheduler',
  concurrency: 1,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
  },
  workerOptions: {
    lockDuration: DATABASE_BACKUP_SCHEDULER_LOCK_DURATION_MS,
  },
  processor: async () => {
    await tickDatabaseBackupScheduler();
  },
  onFailed: async (_jobId, error) => {
    try {
      const { ErrorSystem } = await import('@/features/observability/services/error-system');
      void ErrorSystem.captureException(error, {
        service: 'database-backup-scheduler-queue',
      });
    } catch {
      console.error('[databaseBackupSchedulerQueue] Fatal queue error', error);
    }
  },
});

export const startDatabaseBackupSchedulerQueue = (): void => {
  if (!queueState.workerStarted) {
    queueState.workerStarted = true;
    queue.startWorker();
  }

  if (queueState.schedulerRegistered) return;
  queueState.schedulerRegistered = true;

  void queue
    .enqueue(
      { type: 'scheduled-tick' },
      {
        repeat: { every: DATABASE_BACKUP_SCHEDULER_REPEAT_EVERY_MS },
        jobId: 'database-backup-scheduler-tick',
      },
    )
    .catch(async (error) => {
      queueState.schedulerRegistered = false;
      try {
        const { ErrorSystem } = await import('@/features/observability/services/error-system');
        void ErrorSystem.captureException(error, {
          service: 'database-backup-scheduler-queue',
          action: 'registerScheduler',
        });
      } catch {
        console.error('[databaseBackupSchedulerQueue] Failed to register repeat scheduler', error);
      }
    });
};

export const getDatabaseBackupSchedulerQueueStatus = async (): Promise<{
  running: boolean;
  healthy: boolean;
  processing: boolean;
  activeJobs: number;
  waitingJobs: number;
  failedJobs: number;
  completedJobs: number;
  lastPollTime: number;
  timeSinceLastPoll: number;
}> => {
  const health = await queue.getHealthStatus();
  return {
    running: health.running,
    healthy: health.healthy,
    processing: health.processing,
    activeJobs: health.activeCount,
    waitingJobs: health.waitingCount,
    failedJobs: health.failedCount,
    completedJobs: health.completedCount,
    lastPollTime: health.lastPollTime,
    timeSinceLastPoll: health.timeSinceLastPoll,
  };
};
