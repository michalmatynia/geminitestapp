import 'server-only';

import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { processRun } from '@/features/jobs/processors/ai-path-run-processor';
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
    }
    await processRun({ ...run, status: 'running' });
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
}> => {
  const now = Date.now();
  const health = await queue.getHealthStatus();
  const repo = getPathRunRepository();
  const stats = await repo.getQueueStats();
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
  };
};

export const processSingleRun = async (runId: string): Promise<void> => {
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
  const { executePathRun } = await import('@/features/ai/ai-paths/services/path-run-executor');
  await executePathRun({ ...run, status: 'running' });
};

export const enqueuePathRunJob = async (runId: string): Promise<void> => {
  await queue.enqueue({ runId });
};

// Re-export for backward compatibility with tests
export { processRun, computeBackoffMs } from '@/features/jobs/processors/ai-path-run-processor';
