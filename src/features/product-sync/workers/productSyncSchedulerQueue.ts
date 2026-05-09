import 'server-only';

import {
  findDueProductSyncProfiles,
  recoverStaleProductSyncRuns,
} from '@/features/product-sync/services/product-sync-repository';
import { startProductSyncRun } from '@/features/product-sync/services/product-sync-run-starter';
import { createManagedQueue } from '@/shared/lib/queue';
import type {
  ScheduledTickJobData,
  SchedulerQueueState,
} from '@/shared/lib/queue/scheduler-queue-types';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

/**
 * Builds a standardized source string for logging: 'product-sync.sync.<action>'
 */
const buildProductSyncSource = (action: string): string => `product-sync.sync.${action}`;

const parseMsFromEnv = (raw: string | undefined, fallback: number, min: number): number => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.floor(parsed));
};

export const PRODUCT_SYNC_SCHEDULER_REPEAT_EVERY_MS = parseMsFromEnv(
  process.env['PRODUCT_SYNC_SCHEDULER_REPEAT_EVERY_MS'],
  60_000,
  30_000
);

const PRODUCT_SYNC_SCHEDULER_LOCK_DURATION_MS = parseMsFromEnv(
  process.env['PRODUCT_SYNC_SCHEDULER_LOCK_DURATION_MS'],
  60_000,
  30_000
);

const normalizeSkipReason = (error: unknown): string => {
  const trimmedMessage = error instanceof Error ? error.message.trim() : '';
  const message =
    trimmedMessage.length > 0
      ? trimmedMessage
      : 'Unknown scheduler skip reason';
  return message.length > 160 ? `${message.slice(0, 157)}...` : message;
};

const isExpectedSkipReason = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('already queued or running') ||
    normalized.includes('profile is disabled') ||
    normalized.includes('profile not found')
  );
};

const globalWithQueueState = globalThis as typeof globalThis & {
  __productSyncSchedulerQueueState__?: SchedulerQueueState;
};

const queueState =
  globalWithQueueState.__productSyncSchedulerQueueState__ ??
  (globalWithQueueState.__productSyncSchedulerQueueState__ = {
    workerStarted: false,
    schedulerRegistered: false,
  });

const queue = createManagedQueue<ScheduledTickJobData>({
  name: 'product-sync-scheduler',
  concurrency: 1,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
  },
  workerOptions: {
    lockDuration: PRODUCT_SYNC_SCHEDULER_LOCK_DURATION_MS,
  },
  processor: async () => {
    const staleRecovery = await recoverStaleProductSyncRuns({
      limit: 500,
    });
    const dueProfiles = await findDueProductSyncProfiles(new Date());
    let started = 0;
    let skipped = 0;
    const skipReasons = new Map<string, number>();

    for (const profile of dueProfiles) {
      try {
        // Keep scheduler starts sequential so queue de-duplication and logging stay deterministic.
        // eslint-disable-next-line no-await-in-loop
        await startProductSyncRun({
          profileId: profile.id,
          trigger: 'scheduled',
        });
        started += 1;
      } catch (error) {
        void ErrorSystem.captureException(error);
        skipped += 1;
        const reason = normalizeSkipReason(error);
        skipReasons.set(reason, (skipReasons.get(reason) ?? 0) + 1);

        if (!isExpectedSkipReason(reason)) {
          // eslint-disable-next-line no-await-in-loop
          await ErrorSystem.captureException(error, {
            service: buildProductSyncSource('start-sync-run-failed'),
            profileId: profile.id,
          });
        }
      }
    }

    const skippedByReason = Array.from(skipReasons.entries())
      .sort((left, right) => right[1] - left[1])
      .map(([reason, count]) => ({ reason, count }));

    if (staleRecovery.recoveredRuns > 0 || skippedByReason.length > 0) {
      await ErrorSystem.logInfo('Product sync scheduler tick processed', {
        service: buildProductSyncSource('tick-processed'),
        dueProfiles: dueProfiles.length,
        started,
        skipped,
        staleRecoveredRuns: staleRecovery.recoveredRuns,
        staleRecoveredQueuedRuns: staleRecovery.recoveredQueuedRuns,
        staleRecoveredRunningRuns: staleRecovery.recoveredRunningRuns,
        skippedByReason,
      });
    }

    return {
      due: dueProfiles.length,
      started,
      skipped,
      skippedByReason,
      staleRecovery,
    };
  },
  onFailed: async (_jobId, error) => {
    await ErrorSystem.captureException(error, {
      service: buildProductSyncSource('scheduler-failed'),
    });
  },
});

export const startProductSyncSchedulerQueue = (): void => {
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
        repeat: { every: PRODUCT_SYNC_SCHEDULER_REPEAT_EVERY_MS },
        jobId: 'product-sync-scheduler-tick',
      }
    )
    .catch(async (error) => {
      queueState.schedulerRegistered = false;
      await ErrorSystem.captureException(error, {
        service: buildProductSyncSource('register-scheduler-failed'),
      });
    });
};
