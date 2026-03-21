import 'server-only';

import { getDatabaseEngineBackupSchedule } from '@/shared/lib/db/database-engine-policy';
import { tickDatabaseBackupScheduler } from '@/shared/lib/db/services/database-backup-scheduler';
import { createManagedQueue } from '@/shared/lib/queue';
import type {
  ManagedQueueStatus,
  ScheduledTickJobData,
  SchedulerQueueState,
} from '@/shared/lib/queue/scheduler-queue-types';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import type { Queue } from 'bullmq';

const parseMsFromEnv = (raw: string | undefined, fallback: number, min: number): number => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.floor(parsed));
};

export const DATABASE_BACKUP_SCHEDULER_REPEAT_EVERY_MS = parseMsFromEnv(
  process.env['DATABASE_BACKUP_SCHEDULER_REPEAT_EVERY_MS'],
  60_000,
  30_000
);
const DATABASE_BACKUP_SCHEDULER_LOCK_DURATION_MS = parseMsFromEnv(
  process.env['DATABASE_BACKUP_SCHEDULER_LOCK_DURATION_MS'],
  60_000,
  30_000
);

type DatabaseBackupSchedulerQueueState = SchedulerQueueState & {
  schedulerSyncInFlight: boolean;
  startupTickQueued: boolean;
};

const globalWithState = globalThis as typeof globalThis & {
  __databaseBackupSchedulerQueueState__?: DatabaseBackupSchedulerQueueState;
};

const queueState =
  globalWithState.__databaseBackupSchedulerQueueState__ ??
  (globalWithState.__databaseBackupSchedulerQueueState__ = {
    workerStarted: false,
    schedulerRegistered: false,
    schedulerSyncInFlight: false,
    startupTickQueued: false,
  });

const SCHEDULER_REPEAT_JOB_ID = 'database-backup-scheduler-tick';
const STARTUP_TICK_JOB_ID = 'database-backup-scheduler-startup-tick';
const SCHEDULER_QUEUE_NAME = 'database-backup-scheduler';

const queue = createManagedQueue<ScheduledTickJobData>({
  name: SCHEDULER_QUEUE_NAME,
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
    void ErrorSystem.captureException(error, {
      service: 'database-backup-scheduler-queue',
    });
  },
});

const unregisterRepeatScheduler = async (): Promise<void> => {
  if (!queueState.schedulerRegistered) return;

  try {
    const rawQueue = queue.getQueue();
    const bullQueue = (rawQueue ?? null) as Queue | null;
    if (bullQueue) {
      await bullQueue.removeRepeatable(
        SCHEDULER_QUEUE_NAME,
        { every: DATABASE_BACKUP_SCHEDULER_REPEAT_EVERY_MS },
        SCHEDULER_REPEAT_JOB_ID
      );
    }
  } catch (error) {
    void ErrorSystem.captureException(error);
    void ErrorSystem.captureException(error, {
      service: 'database-backup-scheduler-queue',
      action: 'unregisterRepeatScheduler',
    });
  } finally {
    queueState.schedulerRegistered = false;
  }
};

const syncRepeatSchedulerRegistration = (): void => {
  if (queueState.schedulerSyncInFlight) return;
  queueState.schedulerSyncInFlight = true;

  void (async () => {
    try {
      const schedule = await getDatabaseEngineBackupSchedule();

      if (!schedule.repeatTickEnabled) {
        await unregisterRepeatScheduler();
        return;
      }

      if (queueState.schedulerRegistered) return;

      await queue.enqueue(
        { type: 'scheduled-tick' },
        {
          repeat: { every: DATABASE_BACKUP_SCHEDULER_REPEAT_EVERY_MS },
          jobId: SCHEDULER_REPEAT_JOB_ID,
        }
      );
      queueState.schedulerRegistered = true;
    } catch (error) {
      void ErrorSystem.captureException(error);
      queueState.schedulerRegistered = false;
      void ErrorSystem.captureException(error, {
        service: 'database-backup-scheduler-queue',
        action: 'registerScheduler',
      });
    } finally {
      queueState.schedulerSyncInFlight = false;
    }
  })();
};

export const startDatabaseBackupSchedulerQueue = (): void => {
  if (!queueState.workerStarted) {
    queueState.workerStarted = true;
    queue.startWorker();
  }

  if (!queueState.startupTickQueued) {
    queueState.startupTickQueued = true;
    void queue
      .enqueue(
        { type: 'scheduled-tick' },
        {
          jobId: STARTUP_TICK_JOB_ID,
          removeOnComplete: true,
          removeOnFail: true,
        }
      )
      .catch((error) => {
        queueState.startupTickQueued = false;
        void ErrorSystem.captureException(error, {
          service: 'database-backup-scheduler-queue',
          action: 'enqueueStartupTick',
        });
      });
  }

  syncRepeatSchedulerRegistration();
};

export const getDatabaseBackupSchedulerQueueStatus = async (): Promise<ManagedQueueStatus> => {
  const health = await queue.getHealthStatus();
  return {
    running: health.running ?? false,
    healthy: health.healthy ?? false,
    processing: health.processing ?? false,
    activeJobs: health.activeCount,
    waitingJobs: health.waitingCount,
    failedJobs: health.failedCount,
    completedJobs: health.completedCount,
    lastPollTime: health.lastPollTime ?? 0,
    timeSinceLastPoll: health.timeSinceLastPoll ?? 0,
  };
};
