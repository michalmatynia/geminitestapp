import 'server-only';

import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { createManagedQueue } from '@/shared/lib/queue';
import type { ScheduledTickJobData, SchedulerQueueState } from '@/shared/lib/queue/scheduler-queue-types';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { listFilemakerMailAccounts } from '../server/filemaker-mail-service';
import { enqueueFilemakerMailSyncJob, startFilemakerMailSyncQueue } from './filemakerMailSyncQueue';

const LOG_SOURCE = 'filemaker-mail-sync-scheduler';

const parseMsFromEnv = (raw: string | undefined, fallback: number, min: number): number => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.floor(parsed));
};

export const FILEMAKER_MAIL_SYNC_SCHEDULER_REPEAT_EVERY_MS = parseMsFromEnv(
  process.env['FILEMAKER_MAIL_SYNC_SCHEDULER_REPEAT_EVERY_MS'],
  5 * 60_000,
  60_000
);

const FILEMAKER_MAIL_SYNC_SCHEDULER_LOCK_DURATION_MS = parseMsFromEnv(
  process.env['FILEMAKER_MAIL_SYNC_SCHEDULER_LOCK_DURATION_MS'],
  2 * 60_000,
  30_000
);

const globalWithState = globalThis as typeof globalThis & {
  __filemakerMailSyncSchedulerQueueState__?: SchedulerQueueState;
};

const queueState =
  globalWithState.__filemakerMailSyncSchedulerQueueState__ ??
  (globalWithState.__filemakerMailSyncSchedulerQueueState__ = {
    workerStarted: false,
    schedulerRegistered: false,
  });

const queue = createManagedQueue<ScheduledTickJobData>({
  name: 'filemaker-mail-sync-scheduler',
  concurrency: 1,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
  },
  workerOptions: {
    lockDuration: FILEMAKER_MAIL_SYNC_SCHEDULER_LOCK_DURATION_MS,
  },
  processor: async () => {
    const accounts = await listFilemakerMailAccounts();
    const activeAccounts = accounts.filter((account) => account.status === 'active');
    if (activeAccounts.length > 0) {
      startFilemakerMailSyncQueue();
    }
    const requestedAt = new Date().toISOString();
    const results = await Promise.allSettled(
      activeAccounts.map((account) =>
        enqueueFilemakerMailSyncJob({
          accountId: account.id,
          reason: 'scheduler',
          requestedAt,
        })
      )
    );
    const succeeded = results.filter((result) => result.status === 'fulfilled').length;
    const failed = results.length - succeeded;
    if (failed > 0) {
      await logSystemEvent({
        level: 'warn',
        source: LOG_SOURCE,
        message: `Mail sync tick completed with ${failed} enqueue failures of ${activeAccounts.length} accounts`,
      }).catch(() => {});
    }
    return { attempted: activeAccounts.length, enqueued: succeeded, failed };
  },
  onFailed: async (_jobId, error) => {
    await ErrorSystem.captureException(error, { service: LOG_SOURCE });
  },
});

export const startFilemakerMailSyncSchedulerQueue = (): void => {
  if ((process.env['DISABLE_FILEMAKER_MAIL_SYNC_SCHEDULER'] ?? '').toLowerCase() === 'true') return;

  if (queueState.workerStarted === false) {
    queueState.workerStarted = true;
    startFilemakerMailSyncQueue();
    queue.startWorker();
  }

  if (queueState.schedulerRegistered === true) return;
  queueState.schedulerRegistered = true;

  queue
    .enqueue(
      { type: 'scheduled-tick' },
      {
        repeat: { every: FILEMAKER_MAIL_SYNC_SCHEDULER_REPEAT_EVERY_MS },
        jobId: 'filemaker-mail-sync-scheduler-tick',
      }
    )
    .catch((error) => {
      queueState.schedulerRegistered = false;
      ErrorSystem.captureException(error, {
        service: LOG_SOURCE,
        action: 'registerScheduler',
      }).catch(() => {});
    });
};
