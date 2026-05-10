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

type DueProductSyncProfile = Awaited<ReturnType<typeof findDueProductSyncProfiles>>[number];

type SchedulerTickRunSummary = {
  skipped: number;
  skipReasons: Map<string, number>;
  started: number;
};

const buildInitialSchedulerTickRunSummary = (): SchedulerTickRunSummary => ({
  skipped: 0,
  skipReasons: new Map<string, number>(),
  started: 0,
});

const processDueProductSyncProfile = async (
  summary: SchedulerTickRunSummary,
  profile: DueProductSyncProfile
): Promise<SchedulerTickRunSummary> => {
  try {
    await startProductSyncRun({
      profileId: profile.id,
      trigger: 'scheduled',
    });
    return { ...summary, started: summary.started + 1 };
  } catch (error) {
    void ErrorSystem.captureException(error);
    const reason = normalizeSkipReason(error);
    summary.skipReasons.set(reason, (summary.skipReasons.get(reason) ?? 0) + 1);

    if (!isExpectedSkipReason(reason)) {
      await ErrorSystem.captureException(error, {
        service: buildProductSyncSource('start-sync-run-failed'),
        profileId: profile.id,
      });
    }

    return { ...summary, skipped: summary.skipped + 1 };
  }
};

const processDueProductSyncProfiles = (
  dueProfiles: DueProductSyncProfile[]
): Promise<SchedulerTickRunSummary> =>
  dueProfiles.reduce<Promise<SchedulerTickRunSummary>>(
    async (previousSummary, profile) =>
      processDueProductSyncProfile(await previousSummary, profile),
    Promise.resolve(buildInitialSchedulerTickRunSummary())
  );

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
    const { skipped, skipReasons, started } = await processDueProductSyncProfiles(dueProfiles);

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
