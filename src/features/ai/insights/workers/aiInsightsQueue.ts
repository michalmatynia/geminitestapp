/**
 * AI Insights Queue
 * 
 * Queue management for scheduled AI insights generation.
 * Provides:
 * - Managed queue creation and coordination
 * - Repeatable job scheduling
 * - Schedule settings integration
 * - Brain capability assignment
 * - Tick-based processing coordination
 *
 * Scheduled generation is disabled by default. Manual insight routes call the generators
 * directly; set ENABLE_SCHEDULED_AI_INSIGHTS=true to opt into background ticks.
 */

import 'server-only';

import { getScheduleSettings, type InsightScheduleSettings } from '@/features/ai/insights/server';

import { isScheduledAiInsightsEnabled } from '@/features/ai/insights/scheduling';
import { tick } from '@/features/ai/insights/workers/ai-insights-processor';
import { getBrainAssignmentForCapability } from '@/shared/lib/ai-brain/server';
import { createManagedQueue } from '@/shared/lib/queue';
import type {
  ManagedQueueStatus,
  RepeatableJobEntry,
  ScheduledTickJobData,
  SchedulerQueueState,
} from '@/shared/lib/queue/scheduler-queue-types';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const parseMsFromEnv = (raw: string | undefined, fallback: number, min: number): number => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.floor(parsed));
};

const AI_INSIGHTS_REPEAT_EVERY_MS = parseMsFromEnv(
  process.env['AI_INSIGHTS_REPEAT_EVERY_MS'],
  180_000,
  60_000
);
const AI_INSIGHTS_LOCK_DURATION_MS = parseMsFromEnv(
  process.env['AI_INSIGHTS_LOCK_DURATION_MS'],
  180_000,
  60_000
);

type AiInsightsQueueStatus = ManagedQueueStatus;

const EMPTY_AI_INSIGHTS_QUEUE_STATUS: AiInsightsQueueStatus = {
  running: false,
  healthy: false,
  processing: false,
  activeJobs: 0,
  waitingJobs: 0,
  failedJobs: 0,
  completedJobs: 0,
  lastPollTime: 0,
  timeSinceLastPoll: 0,
};

const globalWithAiInsightsQueueState = globalThis as typeof globalThis & {
  __aiInsightsQueueState__?: SchedulerQueueState;
};

// Next dev can evaluate this module in multiple route bundles; keep one worker/scheduler per process.
const aiInsightsQueueState =
  globalWithAiInsightsQueueState.__aiInsightsQueueState__ ??
  (globalWithAiInsightsQueueState.__aiInsightsQueueState__ = {
    workerStarted: false,
    schedulerRegistered: false,
  });

let reconcileInFlight: Promise<void> | null = null;

const queue = createManagedQueue<ScheduledTickJobData>({
  name: 'ai-insights',
  concurrency: 1,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
  },
  workerOptions: {
    lockDuration: AI_INSIGHTS_LOCK_DURATION_MS,
  },
  processor: async () => {
    if (!isScheduledAiInsightsEnabled()) return;
    await tick();
  },
  onFailed: async (_jobId, error) => {
    await ErrorSystem.captureException(error, {
      service: 'ai-insights-queue',
    }).catch(() => {
      // Ignore
    });
  },
});

const checkInsightsCapabilities = async (schedule: InsightScheduleSettings): Promise<boolean> => {
  const [analyticsBrain, runtimeAnalyticsBrain, logsBrain, aiPathsBrain] = await Promise.all([
    getBrainAssignmentForCapability('insights.analytics'),
    getBrainAssignmentForCapability('insights.runtime_analytics'),
    getBrainAssignmentForCapability('insights.system_logs'),
    getBrainAssignmentForCapability('ai_paths.model'),
  ]);

  const analyticsReady = schedule.analyticsEnabled && analyticsBrain.enabled;
  const runtimeReady =
    schedule.runtimeAnalyticsEnabled && runtimeAnalyticsBrain.enabled && aiPathsBrain.enabled;
  const logsReady = (schedule.logsEnabled || schedule.logsAutoOnError) && logsBrain.enabled;

  return analyticsReady || runtimeReady || logsReady;
};


const shouldRegisterInsightsScheduler = async (): Promise<boolean> => {
  const schedule = await getScheduleSettings();
  return checkInsightsCapabilities(schedule);
};


const hasRepeatableQueueApi = (
  value: unknown
): value is {
  getRepeatableJobs: () => Promise<RepeatableJobEntry[]>;
  removeRepeatableByKey: (key: string) => Promise<void>;
} =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { getRepeatableJobs?: unknown }).getRepeatableJobs === 'function' &&
  typeof (value as { removeRepeatableByKey?: unknown }).removeRepeatableByKey === 'function';

const removeInsightsTickRepeatJobs = async (): Promise<void> => {
  const bullQueueUnknown = queue.getQueue();
  if (!hasRepeatableQueueApi(bullQueueUnknown)) return;
  const bullQueue = bullQueueUnknown;
  const repeatableJobs = await bullQueue.getRepeatableJobs();
  const targets = repeatableJobs.filter(
    (job) =>
      job.id === 'ai-insights-tick' ||
      (job.name === 'ai-insights' && job.every === AI_INSIGHTS_REPEAT_EVERY_MS)
  );
  await Promise.all(
    targets.map(async (job) => {
      await bullQueue.removeRepeatableByKey(job.key);
    })
  );
};

const reportQueueActionError = (error: unknown, action: string): void => {
  ErrorSystem.captureException(error, {
    service: 'ai-insights-queue',
    action,
  }).catch(() => {
    // Ignore
  });
};

const stopInsightsWorker = async (): Promise<void> => {
  if (!aiInsightsQueueState.workerStarted) return;
  aiInsightsQueueState.workerStarted = false;
  await queue.stopWorker();
};

export const startAiInsightsQueue = (): void => {
  if (reconcileInFlight) return;

  reconcileInFlight = (async (): Promise<void> => {
    if (!isScheduledAiInsightsEnabled()) {
      await removeInsightsTickRepeatJobs().catch((error) => {
        reportQueueActionError(error, 'removeScheduler');
      });
      aiInsightsQueueState.schedulerRegistered = false;
      await stopInsightsWorker().catch((error) => {
        reportQueueActionError(error, 'stopWorker');
      });
      return;
    }

    let shouldRegister: boolean;
    try {
      shouldRegister = await shouldRegisterInsightsScheduler();
    } catch (error) {
      ErrorSystem.captureException(error).catch(() => {
        // Ignore
      });
      reportQueueActionError(error, 'validateScheduler');
      return;
    }

    if (!shouldRegister) {
      await removeInsightsTickRepeatJobs().catch((error) => {
        reportQueueActionError(error, 'removeScheduler');
      });
      aiInsightsQueueState.schedulerRegistered = false;
      await stopInsightsWorker().catch((error) => {
        reportQueueActionError(error, 'stopWorker');
      });
      return;
    }

    aiInsightsQueueState.workerStarted = true;
    queue.startWorker();

    if (aiInsightsQueueState.schedulerRegistered) return;

    aiInsightsQueueState.schedulerRegistered = true;
    await queue
      .enqueue(
        { type: 'scheduled-tick' },
        { repeat: { every: AI_INSIGHTS_REPEAT_EVERY_MS }, jobId: 'ai-insights-tick' }
      )
      .catch((error) => {
        aiInsightsQueueState.schedulerRegistered = false;
        reportQueueActionError(error, 'registerScheduler');
      });
  })().finally(() => {
    reconcileInFlight = null;
  });
};

export const getAiInsightsQueueStatus = async (): Promise<AiInsightsQueueStatus> => {
  if (!aiInsightsQueueState.workerStarted) {
    return EMPTY_AI_INSIGHTS_QUEUE_STATUS;
  }

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

