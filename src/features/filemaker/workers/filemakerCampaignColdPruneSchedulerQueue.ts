import 'server-only';

import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { createManagedQueue } from '@/shared/lib/queue';
import type { ScheduledTickJobData, SchedulerQueueState } from '@/shared/lib/queue/scheduler-queue-types';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { pruneFilemakerCampaignColdRecipients } from '../server/campaign-engagement-pruning';

const LOG_SOURCE = 'filemaker-campaign-cold-prune-scheduler';

const parseMsFromEnv = (raw: string | undefined, fallback: number, min: number): number => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.floor(parsed));
};

const parseIntFromEnv = (raw: string | undefined, fallback: number, min: number): number => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.floor(parsed));
};

export const FILEMAKER_CAMPAIGN_COLD_PRUNE_REPEAT_EVERY_MS = parseMsFromEnv(
  process.env['FILEMAKER_CAMPAIGN_COLD_PRUNE_REPEAT_EVERY_MS'],
  24 * 60 * 60_000,
  60 * 60_000
);

const FILEMAKER_CAMPAIGN_COLD_PRUNE_LOCK_DURATION_MS = parseMsFromEnv(
  process.env['FILEMAKER_CAMPAIGN_COLD_PRUNE_LOCK_DURATION_MS'],
  10 * 60_000,
  60_000
);

const FILEMAKER_CAMPAIGN_COLD_PRUNE_MIN_SENDS = parseIntFromEnv(
  process.env['FILEMAKER_CAMPAIGN_COLD_PRUNE_MIN_SENDS'],
  5,
  1
);

const globalWithState = globalThis as typeof globalThis & {
  __filemakerCampaignColdPruneSchedulerQueueState__?: SchedulerQueueState;
};

const queueState =
  globalWithState.__filemakerCampaignColdPruneSchedulerQueueState__ ??
  (globalWithState.__filemakerCampaignColdPruneSchedulerQueueState__ = {
    workerStarted: false,
    schedulerRegistered: false,
  });

const queue = createManagedQueue<ScheduledTickJobData>({
  name: 'filemaker-campaign-cold-prune-scheduler',
  concurrency: 1,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
  },
  workerOptions: {
    lockDuration: FILEMAKER_CAMPAIGN_COLD_PRUNE_LOCK_DURATION_MS,
  },
  processor: async () => {
    const result = await pruneFilemakerCampaignColdRecipients({
      minSendsWithoutEngagement: FILEMAKER_CAMPAIGN_COLD_PRUNE_MIN_SENDS,
      actor: 'cold-prune-scheduler',
    });
    if (result.addedCount > 0) {
      await logSystemEvent({
        level: 'info',
        source: LOG_SOURCE,
        message: `Auto-suppressed ${result.addedCount} cold recipients (≥${FILEMAKER_CAMPAIGN_COLD_PRUNE_MIN_SENDS} sends, no opens/clicks); ${result.skippedCount} already suppressed.`,
        context: {
          addedCount: result.addedCount,
          skippedCount: result.skippedCount,
          candidateCount: result.candidates.length,
        },
      }).catch(() => {});
    }
    return {
      candidateCount: result.candidates.length,
      addedCount: result.addedCount,
      skippedCount: result.skippedCount,
    };
  },
  onFailed: async (_jobId, error) => {
    await ErrorSystem.captureException(error, { service: LOG_SOURCE });
  },
});

export const startFilemakerCampaignColdPruneSchedulerQueue = (): void => {
  if (
    (process.env['DISABLE_FILEMAKER_CAMPAIGN_COLD_PRUNE_SCHEDULER'] ?? '').toLowerCase() ===
    'true'
  ) {
    return;
  }

  if (queueState.workerStarted === false) {
    queueState.workerStarted = true;
    queue.startWorker();
  }

  if (queueState.schedulerRegistered === true) return;
  queueState.schedulerRegistered = true;

  queue
    .enqueue(
      { type: 'scheduled-tick' },
      {
        repeat: { every: FILEMAKER_CAMPAIGN_COLD_PRUNE_REPEAT_EVERY_MS },
        jobId: 'filemaker-campaign-cold-prune-scheduler-tick',
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
