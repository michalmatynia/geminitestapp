 
import { createManagedQueue } from '@/shared/lib/queue';
import { 
  AI_PATH_RUN_QUEUE_NAME, 
  DEFAULT_CONCURRENCY, 
  JOB_EXECUTION_TIMEOUT_MS,
  LOG_SOURCE
} from './config';
import { type AiPathRunJobData } from './types';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { 
  processRun, 
  processStaleRunRecovery 
} from '@/features/ai/ai-paths/workers/ai-path-run-processor';
import { recordRuntimeRunStarted } from '@/features/ai/ai-paths/services/runtime-analytics-service';
import { createDebugQueueLogger } from '../ai-path-run-queue-utils';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

const { log: debugQueueLog, warn: debugQueueWarn } = createDebugQueueLogger(
  LOG_SOURCE,
  process.env['AI_PATHS_QUEUE_DEBUG'] === 'true'
);

export const enqueuePathRunJob = async (
  runId: string,
  options: { delayMs?: number } = {}
): Promise<void> => {
  await queue.enqueue({ runId }, { delay: options.delayMs, jobId: runId });
};

export const queue = createManagedQueue<AiPathRunJobData>({
  name: AI_PATH_RUN_QUEUE_NAME,
  concurrency: Math.max(1, DEFAULT_CONCURRENCY),
  jobTimeoutMs: JOB_EXECUTION_TIMEOUT_MS > 0 ? JOB_EXECUTION_TIMEOUT_MS : undefined,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false,
  },
  workerOptions: {
    stalledInterval: 30_000,
    maxStalledCount: 2,
  },
  processor: async (data, _jobId, signal) => {
    if (data.runId === '__recovery__' || data.type === 'recovery') {
      await processStaleRunRecovery();
      return;
    }

    const repo = await getPathRunRepository();
    const run = await repo.claimRunForProcessing(data.runId);
    if (!run) {
      const latest = await repo.findRunById(data.runId);
      if (!latest) {
        debugQueueWarn(`[aiPathRunQueue] Run ${data.runId} not found, skipping`);
        return;
      }
      if (latest.status === 'running') {
        debugQueueLog(
          `[aiPathRunQueue] Run ${data.runId} is already running, skipping duplicate job`
        );
        return;
      }
      debugQueueLog(`[aiPathRunQueue] Run ${data.runId} has status "${latest.status}", skipping`);
      return;
    }
    await recordRuntimeRunStarted({ runId: run.id });
    const outcome = await processRun(run, signal);
    if (outcome?.requeueDelayMs !== undefined) {
      await enqueuePathRunJob(run.id, { delayMs: outcome.requeueDelayMs });
    }
  },
  onFailed: async (_jobId, error, data) => {
    try {
      const { ErrorSystem } = await import('@/shared/lib/observability/system-logger');
      void ErrorSystem.captureException(error, {
        service: LOG_SOURCE,
        runId: data.runId,
      });
    } catch {
      void logSystemEvent({
        level: 'error',
        source: LOG_SOURCE,
        message: 'Fatal queue error',
        error,
      });
    }
  },
});
