import 'server-only';

import { createManagedQueue } from '@/shared/lib/queue';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { getImageStudioSequenceRunById } from '@/features/ai/image-studio/server/sequence-run-repository';
import {
  executeSequenceSteps,
  finalizeSequenceRun,
  handleSequenceError,
  handleTerminalStatus,
  markSequenceCancelled,
  notifySequenceStarted,
  toMaskContext,
  type ExecutionState,
} from './execution-logic';
import { type ImageStudioSequenceRunRecord } from '@/shared/contracts/image-studio';

const LOG_SOURCE = 'image-studio-sequence-queue';

export type ImageStudioSequenceJobData = {
  runId: string;
};

export const queue = createManagedQueue<ImageStudioSequenceJobData>({
  name: 'image-studio-sequence',
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
    const run = await getImageStudioSequenceRunById(data.runId);
    if (!run) {
      await logSystemEvent({
        level: 'warn',
        source: LOG_SOURCE,
        message: `Sequence run ${data.runId} not found, skipping`,
        context: { runId: data.runId },
      });
      return;
    }

    if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
      await handleTerminalStatus(run);
      return;
    }

    if (run.cancelRequested === true) {
      await markSequenceCancelled(run, 'Sequence was cancelled before execution.');
      return;
    }

    await runSequenceJobProcessor(run);
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

async function runSequenceJobProcessor(run: ImageStudioSequenceRunRecord): Promise<void> {
  const { currentSlotId, outputSlotIds, runtimeMask } = resolveInitialExecutionState(run);

  try {
    await notifySequenceStarted(run, new Date().toISOString());

    const result = await executeSequenceSteps({
      run,
      currentSlotId,
      outputSlotIds,
      runtimeMask,
    });

    await finalizeSequenceRun({
      run,
      currentSlotId: result.currentSlotId,
      outputSlotIds: result.outputSlotIds,
      runtimeMask: result.runtimeMask,
      stepCount: run.request.steps.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'CANCELLED') {
      return;
    }
    await handleSequenceError({
      run,
      error,
      currentSlotId,
      outputSlotIds,
      runtimeMask,
    });
    throw error;
  }
}

function resolveInitialExecutionState(run: ImageStudioSequenceRunRecord): ExecutionState {
  const currentSlotId = run.currentSlotId.length > 0 ? run.currentSlotId : run.sourceSlotId;
  const outputSlotIds = Array.isArray(run.outputSlotIds) ? [...run.outputSlotIds] : [];
  const runtimeMask = toMaskContext(run.runtimeMask ?? run.request.mask);
  
  return { currentSlotId, outputSlotIds, runtimeMask };
}
