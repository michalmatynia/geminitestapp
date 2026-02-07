import 'server-only';

import { Queue } from 'bullmq';

import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { getRuntimeAnalyticsSummary, recordRuntimeRunStarted } from '@/features/ai/ai-paths/services/runtime-analytics-service';
import { processRun } from '@/features/jobs/processors/ai-path-run-processor';
import { getAiInsightsQueueStatus } from '@/features/jobs/workers/aiInsightsQueue';
import { createManagedQueue, getRedisConnection } from '@/shared/lib/queue';

const DEFAULT_CONCURRENCY = Number(process.env.AI_PATHS_RUN_CONCURRENCY ?? '1');
const AI_PATH_RUN_QUEUE_NAME = 'ai-path-run';

type AiPathRunJobData = {
  runId: string;
};

const queue = createManagedQueue<AiPathRunJobData>({
  name: AI_PATH_RUN_QUEUE_NAME,
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
  await queue.enqueue({ runId }, { jobId: runId });
};

const resolveAiPathRunQueue = (): { queue: Queue | null; owned: boolean } => {
  const existing = queue.getQueue();
  if (existing) {
    return { queue: existing as Queue, owned: false };
  }
  const connection = getRedisConnection();
  if (!connection) {
    return { queue: null, owned: false };
  }
  return {
    queue: new Queue(AI_PATH_RUN_QUEUE_NAME, { connection }),
    owned: true,
  };
};

export const removePathRunQueueEntries = async (
  runIds: string[]
): Promise<{ removed: number; requested: number }> => {
  const uniqueRunIds = Array.from(
    new Set(
      runIds
        .map((runId: string): string => runId.trim())
        .filter((runId: string): boolean => runId.length > 0)
    )
  );
  if (uniqueRunIds.length === 0) {
    return { removed: 0, requested: 0 };
  }

  const { queue: bullQueue, owned } = resolveAiPathRunQueue();
  if (!bullQueue) {
    return { removed: 0, requested: uniqueRunIds.length };
  }

  let removed = 0;
  const pendingRunIds = new Set(uniqueRunIds);
  try {
    for (const runId of uniqueRunIds) {
      const directJob = await bullQueue.getJob(runId);
      if (!directJob) continue;
      try {
        await directJob.remove();
        removed += 1;
        pendingRunIds.delete(runId);
      } catch {
        // Active/locked jobs may fail removal; keep deleting run records regardless.
      }
    }

    if (pendingRunIds.size > 0) {
      const queuedJobs = await bullQueue.getJobs(
        ['waiting', 'delayed', 'paused', 'prioritized', 'waiting-children', 'active'],
        0,
        -1
      );
      for (const job of queuedJobs) {
        const runId = (job.data as { runId?: unknown } | undefined)?.runId;
        if (typeof runId !== 'string' || !pendingRunIds.has(runId)) continue;
        try {
          await job.remove();
          removed += 1;
          pendingRunIds.delete(runId);
        } catch {
          // Active/locked jobs may fail removal; keep deleting run records regardless.
        }
      }
    }
  } finally {
    if (owned) {
      await bullQueue.close();
    }
  }

  return { removed, requested: uniqueRunIds.length };
};

// Re-export for backward compatibility with tests
export { processRun, computeBackoffMs } from '@/features/jobs/processors/ai-path-run-processor';
