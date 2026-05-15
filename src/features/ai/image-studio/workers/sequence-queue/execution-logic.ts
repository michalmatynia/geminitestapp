import 'server-only';

import {
  executeImageStudioSequenceStep,
  resolveSequenceStepsForExecution,
  type ImageStudioSequenceStepExecutionResult,
} from '@/features/ai/image-studio/server/sequence-executor';
import {
  getImageStudioSequenceRunById,
  updateImageStudioSequenceRun,
} from '@/features/ai/image-studio/server/sequence-run-repository';
import { type ImageStudioSequenceStep } from '@/features/ai/image-studio/utils/studio-settings';
import {
  type ImageStudioSequenceMaskContext,
  type ImageStudioSequenceRunRecord,
} from '@/shared/contracts/image-studio';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { publishRunEvent } from '@/shared/lib/redis-pubsub';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const LOG_SOURCE = 'image-studio-sequence-execution';

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const toMaskContext = (
  value: ImageStudioSequenceMaskContext | null | undefined
): ImageStudioSequenceMaskContext => {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value.polygons) || value.polygons.length === 0) {
    return null;
  }
  return {
    polygons: value.polygons,
    invert: Boolean(value.invert),
    feather:
      typeof value.feather === 'number' && Number.isFinite(value.feather)
        ? Number(Math.max(0, Math.min(50, value.feather)).toFixed(2))
        : 0,
    slotId: value.slotId ?? null,
  };
};

export const getSequenceEventChannel = (runId: string): string => `image-studio:sequence:${runId}`;

export const appendUniqueIds = (source: string[], next: string[]): string[] => {
  const unique = new Set(source);
  next.forEach((id) => {
    if (typeof id !== 'string') return;
    const normalized = id.trim();
    if (normalized.length > 0) {
      unique.add(normalized);
    }
  });
  return Array.from(unique);
};

export const markSequenceCancelled = async (
  run: ImageStudioSequenceRunRecord,
  reason: string
): Promise<ImageStudioSequenceRunRecord | null> => {
  const finishedAt = new Date().toISOString();
  const next = await updateImageStudioSequenceRun(run.id, {
    status: 'cancelled',
    errorMessage: reason,
    activeStepIndex: null,
    activeStepId: null,
    finishedAt,
    appendHistoryEvents: [
      {
        type: 'cancelled',
        source: 'worker',
        message: reason,
        payload: {
          runId: run.id,
          status: 'cancelled',
          finishedAt,
        },
      },
    ],
  });

  publishRunEvent(getSequenceEventChannel(run.id), {
    type: 'done',
    data: {
      runId: run.id,
      status: 'cancelled',
      finishedAt,
      reason,
    },
    ts: Date.now(),
  });

  return next;
};

export const maybeRefreshRun = async (runId: string): Promise<ImageStudioSequenceRunRecord | null> => {
  return await getImageStudioSequenceRunById(runId);
};

export async function handleTerminalStatus(run: ImageStudioSequenceRunRecord): Promise<void> {
  if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
    await logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: `Sequence run ${run.id} already terminal (${run.status}), skipping`,
      context: { runId: run.id, status: run.status },
    });
  }
}

export async function notifySequenceStarted(run: ImageStudioSequenceRunRecord, startedAt: string): Promise<void> {
  await updateImageStudioSequenceRun(run.id, {
    status: 'running',
    startedAt,
    finishedAt: null,
    errorMessage: null,
    appendHistoryEvents: [
      {
        type: 'running',
        source: 'worker',
        message: 'Sequence started.',
        payload: {
          runId: run.id,
          status: 'running',
          startedAt,
        },
      },
    ],
  });

  publishRunEvent(getSequenceEventChannel(run.id), {
    type: 'run',
    data: {
      runId: run.id,
      status: 'running',
      startedAt,
    },
    ts: Date.now(),
  });
}

export type ExecutionState = {
  currentSlotId: string;
  outputSlotIds: string[];
  runtimeMask: ImageStudioSequenceMaskContext;
};

export async function executeSequenceSteps(params: {
  run: ImageStudioSequenceRunRecord;
  currentSlotId: string;
  outputSlotIds: string[];
  runtimeMask: ImageStudioSequenceMaskContext;
}): Promise<ExecutionState> {
  const { run } = params;
  let { currentSlotId, outputSlotIds, runtimeMask } = params;
  
  const allSteps = resolveSequenceStepsForExecution(run);
  const steps = allSteps.filter((step) => step.enabled);
  
  const startIndex =
    typeof run.activeStepIndex === 'number' && Number.isFinite(run.activeStepIndex)
      ? Math.max(0, Math.floor(run.activeStepIndex))
      : 0;

  /* eslint-disable no-await-in-loop */
  for (let index = startIndex; index < steps.length; index += 1) {
    const step = steps[index];
    if (!step) continue;
    
    const result = await processStepIteration({ run, step, index, stepCount: steps.length, currentSlotId, outputSlotIds, runtimeMask });
    if (result.halted) break;
    
    currentSlotId = result.currentSlotId;
    outputSlotIds = result.outputSlotIds;
    runtimeMask = result.runtimeMask;
  }
  /* eslint-enable no-await-in-loop */
  
  return { currentSlotId, outputSlotIds, runtimeMask };
}

async function processStepIteration(params: {
  run: ImageStudioSequenceRunRecord;
  step: ImageStudioSequenceStep;
  index: number;
  stepCount: number;
  currentSlotId: string;
  outputSlotIds: string[];
  runtimeMask: ImageStudioSequenceMaskContext;
}): Promise<ExecutionState & { halted: boolean }> {
  const { run, step, index, stepCount, currentSlotId, outputSlotIds, runtimeMask } = params;
  
  const preStepCurrentSlotId = currentSlotId;
  const stepInputSlotId = step.inputSource === 'source' ? run.sourceSlotId : preStepCurrentSlotId;

  const maybeCancelledRun = await maybeRefreshRun(run.id);
  if (!maybeCancelledRun) {
    throw new Error('Sequence run was removed while processing.');
  }
  if (maybeCancelledRun.cancelRequested === true) {
    await markSequenceCancelled(maybeCancelledRun, 'Sequence cancelled by user.');
    return { currentSlotId, outputSlotIds, runtimeMask, halted: true };
  }

  await notifyStepStarted({ run, step, index, stepCount, preStepCurrentSlotId, stepInputSlotId, currentSlotId, outputSlotIds, runtimeMask });

  const stepResult = await runStepWithRetries({ run, step, index, stepCount, stepInputSlotId, runtimeMask, preStepCurrentSlotId });
  
  if (stepResult.skipped) {
    return { currentSlotId: preStepCurrentSlotId, outputSlotIds, runtimeMask, halted: false };
  }
  
  return {
    currentSlotId: stepResult.producedSlotIds.length > 0 ? stepResult.nextSlotId : preStepCurrentSlotId,
    outputSlotIds: appendUniqueIds(outputSlotIds, stepResult.producedSlotIds),
    runtimeMask: toMaskContext(stepResult.runtimeMask),
    halted: false
  };
}

async function notifyStepStarted(params: {
  run: ImageStudioSequenceRunRecord;
  step: ImageStudioSequenceStep;
  index: number;
  stepCount: number;
  preStepCurrentSlotId: string;
  stepInputSlotId: string;
  currentSlotId: string;
  outputSlotIds: string[];
  runtimeMask: ImageStudioSequenceMaskContext;
}): Promise<void> {
  const { run, step, index, stepCount, preStepCurrentSlotId, stepInputSlotId, currentSlotId, outputSlotIds, runtimeMask } = params;
  const stepRuntime = step.runtime === 'client' ? 'client' : 'server';
  const stepInputSource = step.inputSource === 'source' ? 'source' : 'previous';

  await updateImageStudioSequenceRun(run.id, {
    activeStepIndex: index,
    activeStepId: step.id,
    currentSlotId,
    outputSlotIds,
    runtimeMask,
    appendHistoryEvents: [
      {
        type: 'step_started',
        source: 'worker',
        message: `Step ${index + 1}/${stepCount} started (${step.type}).`,
        payload: {
          runId: run.id,
          stepId: step.id,
          stepType: step.type,
          stepRuntime,
          stepInputSource,
          stepInputSlotId,
          stepIndex: index,
          stepCount,
          preStepCurrentSlotId,
        },
      },
    ],
  });

  publishRunEvent(getSequenceEventChannel(run.id), {
    type: 'step',
    data: {
      runId: run.id,
      status: 'running',
      phase: 'started',
      stepId: step.id,
      stepType: step.type,
      stepRuntime,
      stepInputSource,
      stepInputSlotId,
      stepIndex: index,
      stepCount,
      preStepCurrentSlotId,
    },
    ts: Date.now(),
  });
}

type RunStepResult = {
  skipped: boolean;
  producedSlotIds: string[];
  nextSlotId: string;
  runtimeMask: ImageStudioSequenceMaskContext | null;
};

async function runStepWithRetries(params: {
  run: ImageStudioSequenceRunRecord;
  step: ImageStudioSequenceStep;
  index: number;
  stepCount: number;
  stepInputSlotId: string;
  runtimeMask: ImageStudioSequenceMaskContext;
  preStepCurrentSlotId: string;
}): Promise<RunStepResult> {
  const { run, step, index, stepCount, stepInputSlotId, runtimeMask, preStepCurrentSlotId } = params;
  const attempts = 1 + Math.max(0, step.retries);
  let attempt = 0;

  while (attempt < attempts) {
    attempt += 1;
    try {
      const result = await executeImageStudioSequenceStep({
        run,
        step,
        inputSlotId: stepInputSlotId,
        runtimeMask,
      });

      await notifyStepCompleted({ run, step, index, stepCount, attempt, preStepCurrentSlotId, result });
      return { ...result, skipped: false };
    } catch (error) {
      void ErrorSystem.captureException(error);
      const message = error instanceof Error ? error.message : `Step ${step.type} failed.`;

      if (attempt < attempts) {
        const waitMs = Math.max(0, step.retryBackoffMs) * attempt;
        await notifyStepRetry({ run, step, index, stepCount, attempt, attempts, preStepCurrentSlotId, waitMs, message, stepInputSlotId });
        if (waitMs > 0) {
          await sleep(waitMs);
        }
        continue;
      }

      if (step.onFailure === 'continue' || step.onFailure === 'skip') {
        await notifyStepSkipped({ run, step, index, stepCount, preStepCurrentSlotId, message, stepInputSlotId, onFailure: step.onFailure });
        return { skipped: true, producedSlotIds: [], nextSlotId: preStepCurrentSlotId, runtimeMask: null };
      }

      throw error;
    }
  }
  throw new Error('Step failed after retries');
}

async function notifyStepCompleted(params: {
  run: ImageStudioSequenceRunRecord;
  step: ImageStudioSequenceStep;
  index: number;
  stepCount: number;
  attempt: number;
  preStepCurrentSlotId: string;
  result: ImageStudioSequenceStepExecutionResult;
}): Promise<void> {
  const { run, step, index, stepCount, attempt, preStepCurrentSlotId, result } = params;
  const currentSlotId = result.producedSlotIds.length > 0 ? result.nextSlotId : preStepCurrentSlotId;

  await updateImageStudioSequenceRun(run.id, {
    currentSlotId,
    activeStepIndex: index + 1,
    activeStepId: step.id,
    outputSlotIds: appendUniqueIds(run.outputSlotIds, result.producedSlotIds),
    runtimeMask: toMaskContext(result.runtimeMask),
    appendHistoryEvents: [
      {
        type: 'step_completed',
        source: 'worker',
        message: `Step ${index + 1}/${stepCount} completed (${step.type}).`,
        payload: {
          runId: run.id,
          stepId: step.id,
          stepType: step.type,
          stepRuntime: step.runtime === 'client' ? 'client' : 'server',
          stepInputSource: step.inputSource === 'source' ? 'source' : 'previous',
          stepInputSlotId: step.inputSource === 'source' ? run.sourceSlotId : preStepCurrentSlotId,
          stepIndex: index,
          stepCount,
          attempt,
          preStepCurrentSlotId,
          currentSlotId,
          producedSlotIds: result.producedSlotIds,
          details: result.details,
        },
      },
    ],
  });

  publishRunEvent(getSequenceEventChannel(run.id), {
    type: 'step',
    data: {
      runId: run.id,
      status: 'running',
      phase: 'completed',
      stepId: step.id,
      stepType: step.type,
      stepRuntime: step.runtime === 'client' ? 'client' : 'server',
      stepInputSource: step.inputSource === 'source' ? 'source' : 'previous',
      stepInputSlotId: step.inputSource === 'source' ? run.sourceSlotId : preStepCurrentSlotId,
      stepIndex: index,
      stepCount,
      attempt,
      preStepCurrentSlotId,
      currentSlotId,
      producedSlotIds: result.producedSlotIds,
      details: result.details,
    },
    ts: Date.now(),
  });
}

async function notifyStepRetry(params: {
  run: ImageStudioSequenceRunRecord;
  step: ImageStudioSequenceStep;
  index: number;
  stepCount: number;
  attempt: number;
  attempts: number;
  preStepCurrentSlotId: string;
  waitMs: number;
  message: string;
  stepInputSlotId: string;
}): Promise<void> {
  const { run, step, index, stepCount, attempt, attempts, preStepCurrentSlotId, waitMs, message, stepInputSlotId } = params;

  await updateImageStudioSequenceRun(run.id, {
    appendHistoryEvents: [
      {
        type: 'step_retry',
        source: 'worker',
        message: `Step ${step.type} failed on attempt ${attempt}/${attempts}; retrying.`,
        payload: {
          runId: run.id,
          stepId: step.id,
          stepType: step.type,
          stepRuntime: step.runtime === 'client' ? 'client' : 'server',
          stepInputSource: step.inputSource === 'source' ? 'source' : 'previous',
          stepInputSlotId,
          stepIndex: index,
          stepCount,
          attempt,
          attempts,
          preStepCurrentSlotId,
          waitMs,
          reason: message,
        },
      },
    ],
  });

  publishRunEvent(getSequenceEventChannel(run.id), {
    type: 'step',
    data: {
      runId: run.id,
      status: 'running',
      phase: 'retry',
      stepId: step.id,
      stepType: step.type,
      stepRuntime: step.runtime === 'client' ? 'client' : 'server',
      stepInputSource: step.inputSource === 'source' ? 'source' : 'previous',
      stepInputSlotId,
      stepIndex: index,
      stepCount,
      attempt,
      attempts,
      preStepCurrentSlotId,
      waitMs,
      reason: message,
    },
    ts: Date.now(),
  });
}

async function notifyStepSkipped(params: {
  run: ImageStudioSequenceRunRecord;
  step: ImageStudioSequenceStep;
  index: number;
  stepCount: number;
  preStepCurrentSlotId: string;
  message: string;
  stepInputSlotId: string;
  onFailure: string;
}): Promise<void> {
  const { run, step, index, stepCount, preStepCurrentSlotId, message, stepInputSlotId, onFailure } = params;

  await updateImageStudioSequenceRun(run.id, {
    appendHistoryEvents: [
      {
        type: 'step_failed_non_terminal',
        source: 'worker',
        message: `Step ${step.type} failed and was skipped (${onFailure}).`,
        payload: {
          runId: run.id,
          stepId: step.id,
          stepType: step.type,
          stepRuntime: step.runtime === 'client' ? 'client' : 'server',
          stepInputSource: step.inputSource === 'source' ? 'source' : 'previous',
          stepInputSlotId,
          stepIndex: index,
          stepCount,
          onFailure,
          preStepCurrentSlotId,
          currentSlotId: preStepCurrentSlotId,
          reason: message,
        },
      },
    ],
  });

  publishRunEvent(getSequenceEventChannel(run.id), {
    type: 'step',
    data: {
      runId: run.id,
      status: 'running',
      phase: 'skipped',
      stepId: step.id,
      stepType: step.type,
      stepRuntime: step.runtime === 'client' ? 'client' : 'server',
      stepInputSource: step.inputSource === 'source' ? 'source' : 'previous',
      stepInputSlotId,
      stepIndex: index,
      stepCount,
      onFailure,
      preStepCurrentSlotId,
      currentSlotId: preStepCurrentSlotId,
      reason: message,
    },
    ts: Date.now(),
  });
}

export async function finalizeSequenceRun(params: {
  run: ImageStudioSequenceRunRecord;
  currentSlotId: string;
  outputSlotIds: string[];
  runtimeMask: ImageStudioSequenceMaskContext;
  stepCount: number;
}): Promise<void> {
  const { run, currentSlotId, outputSlotIds, runtimeMask, stepCount } = params;
  const finishedAt = new Date().toISOString();
  
  await updateImageStudioSequenceRun(run.id, {
    status: 'completed',
    currentSlotId,
    outputSlotIds,
    runtimeMask,
    activeStepIndex: null,
    activeStepId: null,
    finishedAt,
    errorMessage: null,
    appendHistoryEvents: [
      {
        type: 'completed',
        source: 'worker',
        message: 'Sequence completed successfully.',
        payload: {
          runId: run.id,
          status: 'completed',
          finishedAt,
          stepCount,
          currentSlotId,
          outputSlotIds,
        },
      },
    ],
  });

  publishRunEvent(getSequenceEventChannel(run.id), {
    type: 'done',
    data: {
      runId: run.id,
      status: 'completed',
      finishedAt,
      currentSlotId,
      outputSlotIds,
      stepCount,
    },
    ts: Date.now(),
  });
}

export async function handleSequenceError(params: {
  run: ImageStudioSequenceRunRecord;
  error: any;
  currentSlotId: string;
  outputSlotIds: string[];
  runtimeMask: ImageStudioSequenceMaskContext;
}): Promise<void> {
  const { run, error, currentSlotId, outputSlotIds, runtimeMask } = params;
  void ErrorSystem.captureException(error);
  const message = error instanceof Error ? error.message : 'Image Studio sequence failed.';
  const finishedAt = new Date().toISOString();

  await updateImageStudioSequenceRun(run.id, {
    status: 'failed',
    currentSlotId,
    outputSlotIds,
    runtimeMask,
    activeStepIndex: null,
    activeStepId: null,
    errorMessage: message,
    finishedAt,
    appendHistoryEvents: [
      {
        type: 'failed',
        source: 'worker',
        message: 'Sequence failed.',
        payload: {
          runId: run.id,
          status: 'failed',
          finishedAt,
          reason: message,
          currentSlotId,
          outputSlotIds,
        },
      },
    ],
  });

  publishRunEvent(getSequenceEventChannel(run.id), {
    type: 'error',
    data: {
      runId: run.id,
      status: 'failed',
      finishedAt,
      message,
      currentSlotId,
      outputSlotIds,
    },
    ts: Date.now(),
  });

  await ErrorSystem.captureException(error, {
    service: LOG_SOURCE,
    runId: run.id,
  });
}
