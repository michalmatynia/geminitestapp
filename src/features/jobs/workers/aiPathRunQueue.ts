import 'server-only';

import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { getRuntimeAnalyticsSummary, recordRuntimeRunStarted } from '@/features/ai/ai-paths/services/runtime-analytics-service';
import { processRun } from '@/features/jobs/processors/ai-path-run-processor';
import { getAiInsightsQueueStatus } from '@/features/jobs/workers/aiInsightsQueue';
import { createManagedQueue } from '@/shared/lib/queue';

const DEFAULT_CONCURRENCY = Number(process.env.AI_PATHS_RUN_CONCURRENCY ?? '1');

type AiPathRunJobData = {
  runId: string;
};

const queue = createManagedQueue<AiPathRunJobData>({
  name: 'ai-path-run',
  concurrency: Math.max(1, DEFAULT_CONCURRENCY),
  defaultJobOptions: {
    attempts: 1, // Retries are handled by the processor (custom dead-letter logic)
    removeOnComplete: true,
    removeOnFail: false,
  },
  processor: async (data) => {
    const repo = getPathRunRepository();
    const run = await repo.findRunById(data.runId);
    if (!run) {
      console.warn(`[aiPathRunQueue] Run ${data.runId} not found, skipping`);
      return;
    }
    if (run.status !== 'running' && run.status !== 'queued') {
      console.log(`[aiPathRunQueue] Run ${data.runId} has status "${run.status}", skipping`);
      return;
    }
    if (run.status === 'queued') {
      await repo.updateRun(run.id, {
        status: 'running',
        startedAt: new Date(),
      });
      await recordRuntimeRunStarted({ runId: run.id });
    }
    await processRun({ ...run, status: 'running' });
  },
  onFailed: async (_jobId, error, data) => {
    try {
      const { ErrorSystem } = await import('@/features/observability/services/error-system');
      void ErrorSystem.captureException(error, {
        service: 'ai-path-run-queue',
        runId: data.runId,
      });
    } catch {
      console.error('[aiPathRunQueue] Fatal queue error', error);
    }
  },
});

export const startAiPathRunQueue = (): void => {
  queue.startWorker();
};

export const getAiPathRunQueueStatus = async (): Promise<{
  running: boolean;
  healthy: boolean;
  processing: boolean;
  activeRuns: number;
  concurrency: number;
  lastPollTime: number;
  timeSinceLastPoll: number;
  queuedCount: number;
  oldestQueuedAt: number | null;
  queueLagMs: number | null;
  completedLastMinute: number;
  throughputPerMinute: number;
  avgRuntimeMs: number | null;
  p50RuntimeMs: number | null;
  p95RuntimeMs: number | null;
  brainQueue: {
    running: boolean;
    healthy: boolean;
    processing: boolean;
    activeJobs: number;
    waitingJobs: number;
    failedJobs: number;
    completedJobs: number;
  };
  brainAnalytics24h: {
    analyticsReports: number;
    logReports: number;
    totalReports: number;
    warningReports: number;
    errorReports: number;
  };
}> => {
  const now = Date.now();
  const health = await queue.getHealthStatus();
  const repo = getPathRunRepository();
  const [stats, insightsQueueHealth, runtimeAnalyticsSummary] = await Promise.all([
    repo.getQueueStats(),
    getAiInsightsQueueStatus(),
    getRuntimeAnalyticsSummary({
      from: new Date(now - 24 * 60 * 60 * 1000),
      to: new Date(now),
      range: '24h',
    }),
  ]);
  const oldestQueuedAt = stats.oldestQueuedAt ? stats.oldestQueuedAt.getTime() : null;
  const queueLagMs = oldestQueuedAt !== null ? Math.max(0, now - oldestQueuedAt) : null;

  return {
    running: health.running,
    healthy: health.healthy,
    processing: health.processing,
    activeRuns: health.activeCount,
    concurrency: Math.max(1, DEFAULT_CONCURRENCY),
    lastPollTime: health.lastPollTime,
    timeSinceLastPoll: health.timeSinceLastPoll,
    queuedCount: stats.queuedCount,
    oldestQueuedAt,
    queueLagMs,
    completedLastMinute: health.completedCount,
    throughputPerMinute: health.completedCount,
    avgRuntimeMs: null, // BullMQ doesn't track this natively; can be added via QueueEvents
    p50RuntimeMs: null,
    p95RuntimeMs: null,
    brainQueue: {
      running: insightsQueueHealth.running,
      healthy: insightsQueueHealth.healthy,
      processing: insightsQueueHealth.processing,
      activeJobs: insightsQueueHealth.activeJobs,
      waitingJobs: insightsQueueHealth.waitingJobs,
      failedJobs: insightsQueueHealth.failedJobs,
      completedJobs: insightsQueueHealth.completedJobs,
    },
    brainAnalytics24h: {
      analyticsReports: runtimeAnalyticsSummary.brain.analyticsReports,
      logReports: runtimeAnalyticsSummary.brain.logReports,
      totalReports: runtimeAnalyticsSummary.brain.totalReports,
      warningReports: runtimeAnalyticsSummary.brain.warningReports,
      errorReports: runtimeAnalyticsSummary.brain.errorReports,
    },
  };
};

export const processSingleRun = async (runId: string): Promise<void> => {
  try {
    const repo = getPathRunRepository();
    const run = await repo.findRunById(runId);
    if (!run) {
      throw new Error('Run not found');
    }
    if (run.status !== 'queued') {
      return;
    }
    await repo.updateRun(run.id, {
      status: 'running',
      startedAt: new Date(),
    });
    await recordRuntimeRunStarted({ runId: run.id });
    const { executePathRun } = await import('@/features/ai/ai-paths/services/path-run-executor');
    await executePathRun({ ...run, status: 'running' });
  } catch (error) {
    try {
      const { ErrorSystem } = await import('@/features/observability/services/error-system');
      void ErrorSystem.captureException(error, {
        service: 'ai-path-run-queue-single',
        runId,
      });
    } catch {
      console.error('[aiPathRunQueue] Fatal inline execution error', error);
    }
    throw error;
  }
};

export const enqueuePathRunJob = async (runId: string): Promise<void> => {
  await queue.enqueue({ runId });
};

// Re-export for backward compatibility with tests
export { processRun, computeBackoffMs } from '@/features/jobs/processors/ai-path-run-processor';
