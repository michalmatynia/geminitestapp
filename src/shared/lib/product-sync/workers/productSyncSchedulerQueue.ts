import 'server-only';

import { ErrorSystem } from '@/shared/utils/observability/error-system';
import {
  findDueProductSyncProfiles,
  recoverStaleProductSyncRuns,
} from '@/shared/lib/product-sync/services/product-sync-repository';
import { startProductSyncRun } from '@/shared/lib/product-sync/services/product-sync-run-starter';
import { createManagedQueue } from '@/shared/lib/queue';

type ProductSyncSchedulerJobData = {
  type: 'scheduled-tick';
};

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
  const message =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
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

type ProductSyncSchedulerQueueState = {
  workerStarted: boolean;
  schedulerRegistered: boolean;
};

const globalWithQueueState = globalThis as typeof globalThis & {
  __productSyncSchedulerQueueState__?: ProductSyncSchedulerQueueState;
};

const queueState =
  globalWithQueueState.__productSyncSchedulerQueueState__ ??
  (globalWithQueueState.__productSyncSchedulerQueueState__ = {
    workerStarted: false,
    schedulerRegistered: false,
  });

const queue = createManagedQueue<ProductSyncSchedulerJobData>({
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
        await startProductSyncRun({
          profileId: profile.id,
          trigger: 'scheduled',
        });
        started += 1;
      } catch (error) {
        skipped += 1;
        const reason = normalizeSkipReason(error);
        skipReasons.set(reason, (skipReasons.get(reason) ?? 0) + 1);

        if (!isExpectedSkipReason(reason)) {
          await ErrorSystem.captureException(error, {
            service: 'product-sync-scheduler-queue',
            action: 'startProductSyncRun',
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
        service: 'product-sync-scheduler-queue',
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
      service: 'product-sync-scheduler-queue',
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
        service: 'product-sync-scheduler-queue',
        action: 'registerScheduler',
      });
    });
};
