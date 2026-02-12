import 'server-only';

import { executeImageStudioRun } from '@/features/ai/image-studio/server/run-executor';
import {
  getImageStudioRunById,
  updateImageStudioRun,
} from '@/features/ai/image-studio/server/run-repository';
import { ErrorSystem, logSystemEvent } from '@/features/observability/server';
import { createManagedQueue } from '@/shared/lib/queue';
import { publishRunEvent } from '@/shared/lib/redis-pubsub';

const LOG_SOURCE = 'image-studio-run-queue';

type ImageStudioRunJobData = {
  runId: string;
};

export type ImageStudioRunDispatchMode = 'queued' | 'inline';

const queue = createManagedQueue<ImageStudioRunJobData>({
  name: 'image-studio-run',
  concurrency: 1,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1500,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
  processor: async (data) => {
    const run = await getImageStudioRunById(data.runId);
    if (!run) {
      await logSystemEvent({
        level: 'warn',
        source: LOG_SOURCE,
        message: `Run ${data.runId} not found, skipping`,
        context: { runId: data.runId },
      });
      return;
    }

    if (run.status === 'completed' || run.status === 'failed') {
      await logSystemEvent({
        level: 'info',
        source: LOG_SOURCE,
        message: `Run ${run.id} already terminal (${run.status}), skipping`,
        context: { runId: run.id, status: run.status },
      });
      return;
    }

    const startedAt = new Date().toISOString();
    await updateImageStudioRun(run.id, {
      status: 'running',
      startedAt,
      finishedAt: null,
      errorMessage: null,
    });

    publishRunEvent(`image-studio:run:${run.id}`, {
      type: 'run',
      data: { runId: run.id, status: 'running', startedAt },
      ts: Date.now(),
    });

    try {
      const result = await executeImageStudioRun(run.request);
      const finishedAt = new Date().toISOString();
      await updateImageStudioRun(run.id, {
        status: 'completed',
        outputs: result.outputs,
        finishedAt,
        errorMessage: null,
      });

      publishRunEvent(`image-studio:run:${run.id}`, {
        type: 'done',
        data: {
          runId: run.id,
          status: 'completed',
          finishedAt,
          outputCount: result.outputs.length,
          outputs: result.outputs,
        },
        ts: Date.now(),
      });

      return {
        outputCount: result.outputs.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Image Studio run failed.';
      const finishedAt = new Date().toISOString();

      await updateImageStudioRun(run.id, {
        status: 'failed',
        errorMessage: message,
        finishedAt,
      });

      publishRunEvent(`image-studio:run:${run.id}`, {
        type: 'error',
        data: {
          runId: run.id,
          status: 'failed',
          finishedAt,
          message,
        },
        ts: Date.now(),
      });

      await ErrorSystem.captureException(error, {
        service: LOG_SOURCE,
        runId: run.id,
      });

      throw error;
    }
  },
  onFailed: async (jobId, error, data) => {
    await ErrorSystem.captureException(error, {
      service: LOG_SOURCE,
      action: 'onFailed',
      jobId,
      runId: data.runId,
    });
  },
});

export const startImageStudioRunQueue = (): void => {
  queue.startWorker();
};

export const enqueueImageStudioRunJob = async (runId: string): Promise<ImageStudioRunDispatchMode> => {
  try {
    await queue.enqueue({ runId }, { jobId: runId });
    return 'queued';
  } catch (enqueueError) {
    await logSystemEvent({
      level: 'warn',
      source: LOG_SOURCE,
      message: `Queue enqueue failed for run ${runId}; falling back to inline processing`,
      context: {
        runId,
        error: enqueueError instanceof Error ? enqueueError.message : String(enqueueError),
      },
    });

    try {
      await queue.processInline({ runId });
      return 'inline';
    } catch (inlineError) {
      await ErrorSystem.captureException(inlineError, {
        service: LOG_SOURCE,
        action: 'inline-fallback-failed',
        runId,
      });
      throw inlineError;
    }
  }
};
