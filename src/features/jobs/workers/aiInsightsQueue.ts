import 'server-only';

import { getBrainAssignmentForFeature } from '@/shared/lib/ai-brain/server';
import { getScheduleSettings } from '@/features/ai/insights/generator';
import { tick } from '@/features/jobs/processors/ai-insights-processor';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { createManagedQueue } from '@/shared/lib/queue';

type AiInsightsJobData = {
  type: 'scheduled-tick';
};

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

type AiInsightsQueueState = {
  workerStarted: boolean;
  schedulerRegistered: boolean;
};

const globalWithAiInsightsQueueState = globalThis as typeof globalThis & {
  __aiInsightsQueueState__?: AiInsightsQueueState;
};

// Next dev can evaluate this module in multiple route bundles; keep one worker/scheduler per process.
const aiInsightsQueueState =
  globalWithAiInsightsQueueState.__aiInsightsQueueState__ ??
  (globalWithAiInsightsQueueState.__aiInsightsQueueState__ = {
    workerStarted: false,
    schedulerRegistered: false,
  });

const queue = createManagedQueue<AiInsightsJobData>({
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
    await tick();
  },
  onFailed: async (_jobId, error) => {
    void ErrorSystem.captureException(error, {
      service: 'ai-insights-queue',
    });
  },
});

const shouldRegisterInsightsScheduler = async (): Promise<boolean> => {
  const schedule = await getScheduleSettings();
  const [analyticsBrain, runtimeAnalyticsBrain, logsBrain] = await Promise.all([
    getBrainAssignmentForFeature('analytics'),
    getBrainAssignmentForFeature('runtime_analytics'),
    getBrainAssignmentForFeature('system_logs'),
  ]);
  return (
    (schedule.analyticsEnabled && analyticsBrain.enabled) ||
    (schedule.runtimeAnalyticsEnabled && runtimeAnalyticsBrain.enabled) ||
    (schedule.logsEnabled && logsBrain.enabled) ||
    (schedule.logsAutoOnError && logsBrain.enabled)
  );
};

type RepeatableJobEntry = {
  id?: string | null;
  name?: string;
  every?: number | null;
  key: string;
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

export const startAiInsightsQueue = (): void => {
  if (!aiInsightsQueueState.workerStarted) {
    aiInsightsQueueState.workerStarted = true;
    queue.startWorker();
  }

  if (aiInsightsQueueState.schedulerRegistered) {
    void shouldRegisterInsightsScheduler()
      .then(async (shouldRegister) => {
        if (shouldRegister) return;
        await removeInsightsTickRepeatJobs().catch(async (error) => {
          void ErrorSystem.captureException(error, {
            service: 'ai-insights-queue',
            action: 'removeScheduler',
          });
        });
        aiInsightsQueueState.schedulerRegistered = false;
      })
      .catch(async (error) => {
        void ErrorSystem.captureException(error, {
          service: 'ai-insights-queue',
          action: 'validateScheduler',
        });
      });
    return;
  }
  aiInsightsQueueState.schedulerRegistered = true;

  void shouldRegisterInsightsScheduler()
    .then(async (shouldRegister) => {
      if (!shouldRegister) {
        await removeInsightsTickRepeatJobs().catch(async (error) => {
          void ErrorSystem.captureException(error, {
            service: 'ai-insights-queue',
            action: 'removeScheduler',
          });
        });
        aiInsightsQueueState.schedulerRegistered = false;
        return;
      }
      await queue.enqueue(
        { type: 'scheduled-tick' },
        { repeat: { every: AI_INSIGHTS_REPEAT_EVERY_MS }, jobId: 'ai-insights-tick' }
      );
    })
    .catch(async (error) => {
      aiInsightsQueueState.schedulerRegistered = false;
      void ErrorSystem.captureException(error, {
        service: 'ai-insights-queue',
        action: 'registerScheduler',
      });
    });
};

export const getAiInsightsQueueStatus = async (): Promise<{
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
    running: health.running ?? false,
    healthy: health.healthy ?? false,
    processing: health.processing ?? false,
    activeJobs: health.activeCount ?? 0,
    waitingJobs: health.waitingCount ?? 0,
    failedJobs: health.failedCount ?? 0,
    completedJobs: health.completedCount ?? 0,
    lastPollTime: health.lastPollTime ?? 0,
    timeSinceLastPoll: health.timeSinceLastPoll ?? 0,
  };
};
