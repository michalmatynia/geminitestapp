import 'server-only';

import { tick } from '@/features/jobs/processors/ai-insights-processor';
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
  process.env["AI_INSIGHTS_REPEAT_EVERY_MS"],
  180_000,
  60_000,
);
const AI_INSIGHTS_LOCK_DURATION_MS = parseMsFromEnv(
  process.env["AI_INSIGHTS_LOCK_DURATION_MS"],
  180_000,
  60_000,
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
    try {
      const { ErrorSystem } = await import('@/features/observability/services/error-system');
      void ErrorSystem.captureException(error, {
        service: 'ai-insights-queue',
      });
    } catch {
      console.error('[aiInsightsQueue] Fatal queue error', error);
    }
  },
});

export const startAiInsightsQueue = (): void => {
  if (!aiInsightsQueueState.workerStarted) {
    aiInsightsQueueState.workerStarted = true;
    queue.startWorker();
  }

  if (aiInsightsQueueState.schedulerRegistered) return;
  aiInsightsQueueState.schedulerRegistered = true;

  void queue
    .enqueue(
      { type: 'scheduled-tick' },
      { repeat: { every: AI_INSIGHTS_REPEAT_EVERY_MS }, jobId: 'ai-insights-tick' },
    )
    .catch(async (error) => {
      aiInsightsQueueState.schedulerRegistered = false;
      try {
        const { ErrorSystem } = await import('@/features/observability/services/error-system');
        void ErrorSystem.captureException(error, {
          service: 'ai-insights-queue',
          action: 'registerScheduler'
        });
      } catch {
        console.error('[aiInsightsQueue] Failed to register repeat scheduler', error);
      }
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
