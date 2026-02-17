import 'server-only';

import {
  executeImageStudioSequenceStep,
  resolveSequenceStepsForExecution,
} from '@/features/ai/image-studio/server/sequence-executor';
import {
  getImageStudioSequenceRunById,
  updateImageStudioSequenceRun,
  type ImageStudioSequenceMaskContext,
  type ImageStudioSequenceRunRecord,
} from '@/features/ai/image-studio/server/sequence-run-repository';
import { ErrorSystem, logSystemEvent } from '@/features/observability/server';
import { createManagedQueue, isRedisAvailable } from '@/shared/lib/queue';
import { publishRunEvent } from '@/shared/lib/redis-pubsub';

const LOG_SOURCE = 'image-studio-sequence-queue';

type ImageStudioSequenceJobData = {
  runId: string;
};

export type ImageStudioSequenceDispatchMode = 'queued' | 'inline';

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const toMaskContext = (
  value: ImageStudioSequenceMaskContext | null | undefined,
): ImageStudioSequenceMaskContext => {
  if (!value || !Array.isArray(value.polygons) || value.polygons.length === 0) {
    return null;
  }
  return {
    polygons: value.polygons,
    invert: Boolean(value.invert),
    feather:
      typeof value.feather === 'number' && Number.isFinite(value.feather)
        ? Number(Math.max(0, Math.min(50, value.feather)).toFixed(2))
        : 0,
  };
};

const getSequenceEventChannel = (runId: string): string =>
  `image-studio:sequence:${runId}`;

const appendUniqueIds = (source: string[], next: string[]): string[] => {
  const unique = new Set(source);
  next.forEach((id) => {
    if (typeof id !== 'string') return;
    const normalized = id.trim();
    if (!normalized) return;
    unique.add(normalized);
  });
  return Array.from(unique);
};

const markSequenceCancelled = async (
  run: ImageStudioSequenceRunRecord,
  reason: string,
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

const maybeRefreshRun = async (
  runId: string,
): Promise<ImageStudioSequenceRunRecord | null> => {
  return await getImageStudioSequenceRunById(runId);
};

const queue = createManagedQueue<ImageStudioSequenceJobData>({
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

    if (
      run.status === 'completed' ||
      run.status === 'failed' ||
      run.status === 'cancelled'
    ) {
      await logSystemEvent({
        level: 'info',
        source: LOG_SOURCE,
        message: `Sequence run ${run.id} already terminal (${run.status}), skipping`,
        context: { runId: run.id, status: run.status },
      });
      return;
    }

    if (run.cancelRequested) {
      await markSequenceCancelled(run, 'Sequence was cancelled before execution.');
      return;
    }

    const startedAt = new Date().toISOString();
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

    const allSteps = resolveSequenceStepsForExecution(run);
    const steps = allSteps.filter((step) => step.enabled);

    let currentSlotId = run.currentSlotId || run.sourceSlotId;
    let outputSlotIds = Array.isArray(run.outputSlotIds) ? [...run.outputSlotIds] : [];
    let runtimeMask = toMaskContext(run.runtimeMask ?? run.request.mask);

    try {
      const startIndex =
        typeof run.activeStepIndex === 'number' && Number.isFinite(run.activeStepIndex)
          ? Math.max(0, Math.floor(run.activeStepIndex))
          : 0;

      for (let index = startIndex; index < steps.length; index += 1) {
        const step = steps[index]!;
        const stepRuntime = step.runtime === 'client' ? 'client' : 'server';

        const maybeCancelledRun = await maybeRefreshRun(run.id);
        if (!maybeCancelledRun) {
          throw new Error('Sequence run was removed while processing.');
        }
        if (maybeCancelledRun.cancelRequested) {
          await markSequenceCancelled(maybeCancelledRun, 'Sequence cancelled by user.');
          return;
        }

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
              message: `Step ${index + 1}/${steps.length} started (${step.type}).`,
              payload: {
                runId: run.id,
                stepId: step.id,
                stepType: step.type,
                stepRuntime,
                stepIndex: index,
                stepCount: steps.length,
                currentSlotId,
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
            stepIndex: index,
            stepCount: steps.length,
            currentSlotId,
          },
          ts: Date.now(),
        });

        const attempts = 1 + Math.max(0, step.retries);
        let attempt = 0;
        let completed = false;

        while (!completed) {
          attempt += 1;
          try {
            const result = await executeImageStudioSequenceStep({
              run,
              step,
              stepIndex: index,
              currentSlotId,
              runtimeMask,
              outputSlotIds,
            });

            currentSlotId = result.nextSlotId;
            outputSlotIds = appendUniqueIds(outputSlotIds, result.producedSlotIds);
            runtimeMask = toMaskContext(result.runtimeMask);

            await updateImageStudioSequenceRun(run.id, {
              currentSlotId,
              activeStepIndex: index + 1,
              activeStepId: step.id,
              outputSlotIds,
              runtimeMask,
              appendHistoryEvents: [
                {
                  type: 'step_completed',
                  source: 'worker',
                  message: `Step ${index + 1}/${steps.length} completed (${step.type}).`,
                  payload: {
                    runId: run.id,
                    stepId: step.id,
                    stepType: step.type,
                    stepRuntime,
                    stepIndex: index,
                    stepCount: steps.length,
                    attempt,
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
                stepRuntime,
                stepIndex: index,
                stepCount: steps.length,
                attempt,
                currentSlotId,
                producedSlotIds: result.producedSlotIds,
                details: result.details,
              },
              ts: Date.now(),
            });

            completed = true;
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : `Step ${step.type} failed.`;

            if (attempt < attempts) {
              const waitMs = Math.max(0, step.retryBackoffMs) * attempt;
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
                      stepRuntime,
                      stepIndex: index,
                      stepCount: steps.length,
                      attempt,
                      attempts,
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
                  stepRuntime,
                  stepIndex: index,
                  stepCount: steps.length,
                  attempt,
                  attempts,
                  waitMs,
                  reason: message,
                },
                ts: Date.now(),
              });

              if (waitMs > 0) {
                await sleep(waitMs);
              }
              continue;
            }

            if (step.onFailure === 'continue' || step.onFailure === 'skip') {
              await updateImageStudioSequenceRun(run.id, {
                appendHistoryEvents: [
                  {
                    type: 'step_failed_non_terminal',
                    source: 'worker',
                    message: `Step ${step.type} failed and was skipped (${step.onFailure}).`,
                    payload: {
                      runId: run.id,
                      stepId: step.id,
                      stepType: step.type,
                      stepRuntime,
                      stepIndex: index,
                      stepCount: steps.length,
                      onFailure: step.onFailure,
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
                  stepRuntime,
                  stepIndex: index,
                  stepCount: steps.length,
                  onFailure: step.onFailure,
                  reason: message,
                },
                ts: Date.now(),
              });

              completed = true;
              continue;
            }

            throw error;
          }
        }
      }

      const finishedAt = new Date().toISOString();
      const completedRun = await updateImageStudioSequenceRun(run.id, {
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
              stepCount: steps.length,
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
          stepCount: steps.length,
        },
        ts: Date.now(),
      });

      return {
        runId: run.id,
        status: completedRun?.status ?? 'completed',
        currentSlotId,
        outputCount: outputSlotIds.length,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Image Studio sequence failed.';
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

export const startImageStudioSequenceQueue = (): void => {
  queue.startWorker();
};

export const enqueueImageStudioSequenceJob = async (
  runId: string,
): Promise<ImageStudioSequenceDispatchMode> => {
  if (!isRedisAvailable()) {
    await logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: `Redis unavailable for sequence run ${runId}; processing inline`,
      context: { runId },
    });
    await queue.processInline({ runId });
    return 'inline';
  }

  try {
    await queue.enqueue({ runId }, { jobId: runId });
    return 'queued';
  } catch (enqueueError) {
    await logSystemEvent({
      level: 'warn',
      source: LOG_SOURCE,
      message: `Queue enqueue failed for sequence run ${runId}; falling back to inline processing`,
      context: {
        runId,
        error:
          enqueueError instanceof Error
            ? enqueueError.message
            : String(enqueueError),
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
