/**
 * Image Studio Sequence Queue Worker
 * 
 * Manages the background processing of sequential AI image transformations.
 * Coordinates between the Redis-based task queue and inline fallback execution
 * to ensure that sequence runs are processed reliably even if background 
 * worker infrastructure is degraded.
 * 
 * Features:
 * - Queue Management: Handles worker lifecycles and Redis availability checks.
 * - Sequential Processing: Ensures ordered execution of AI image sequences.
 * - Reliability: Implements seamless fallback to inline processing if the queue
 *   is unreachable or worker jobs fail.
 * - Observability: Provides detailed logging for queue state transitions and
 *   fallback triggers.
 */

import 'server-only';

import { type ImageStudioSequenceRunDispatchMode } from '@/shared/contracts/image-studio';
import { getBrainAssignmentForFeature } from '@/shared/lib/ai-brain/server';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { isRedisAvailable } from '@/shared/lib/queue';
import { AppError, AppErrorCodes } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { queue } from './sequence-queue/queue-definition';

const LOG_SOURCE = 'image-studio-sequence-queue';

export type ImageStudioSequenceDispatchMode = ImageStudioSequenceRunDispatchMode;

let workerStarted = false;
let reconcileInFlight: Promise<void> | null = null;

const isImageStudioEnabled = async (): Promise<boolean> => {
  const brain = await getBrainAssignmentForFeature('image_studio');
  return brain.enabled;
};

const assertImageStudioEnabled = async (): Promise<void> => {
  const enabled = await isImageStudioEnabled();
  if (enabled) return;
  throw new AppError(
    'Image Studio is disabled in AI Brain configuration. Enable it via the routing settings before initiating sequence runs.',
    {
      code: AppErrorCodes.forbidden,
      httpStatus: 403,
      meta: { feature: 'image_studio' },
    }
  );
};

/**
 * Initializes or tears down the sequence queue worker based on feature configuration.
 */
export const startImageStudioSequenceQueue = (): void => {
  if (reconcileInFlight) return;
  /* eslint-disable require-atomic-updates */
  reconcileInFlight = (async (): Promise<void> => {
    let enabled: boolean;
    try {
      enabled = await isImageStudioEnabled();
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: LOG_SOURCE,
        action: 'validateBrainGate',
      });
      return;
    }

    if (!enabled) {
      if (!workerStarted) return;
      await queue.stopWorker().catch((error: unknown) => {
        void ErrorSystem.captureException(error, {
          service: LOG_SOURCE,
          action: 'stopWorker',
        });
      });
      workerStarted = false;
      return;
    }

    if (workerStarted) return;
    workerStarted = true;
    queue.startWorker();
  })().finally(() => {
    reconcileInFlight = null;
  });
};

/**
 * Enqueues an image studio sequence job for asynchronous processing.
 * Falls back to inline execution if the queue service is unavailable.
 * 
 * @param runId - The identifier of the image sequence run.
 * @returns Dispatch mode (queued or inline).
 * @throws AppError if the sequence run fails during inline fallback.
 */
export const enqueueImageStudioSequenceJob = async (
  runId: string
): Promise<ImageStudioSequenceDispatchMode> => {
  await assertImageStudioEnabled();

  if (!isRedisAvailable()) {
    await logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: `Redis unavailable for sequence run ${runId}; processing inline`,
      context: { runId },
    });
    
    try {
      await queue.processInline({ runId });
      return 'inline';
    } catch (error) {
      throw new AppError(`Inline sequence execution failed for run: ${runId}`, {
        code: AppErrorCodes.internal,
        httpStatus: 500,
        cause: error,
        meta: { runId, fallback: 'inline' },
      });
    }
  }

  try {
    await queue.enqueue({ runId }, { jobId: runId });
    return 'queued';
  } catch (enqueueError: unknown) {
    void ErrorSystem.captureException(enqueueError, {
      service: LOG_SOURCE,
      action: 'enqueue',
      runId,
    });
    
    await logSystemEvent({
      level: 'warn',
      source: LOG_SOURCE,
      message: `Queue enqueue failed for sequence run ${runId}; falling back to inline processing`,
      context: {
        runId,
        error: enqueueError instanceof Error ? enqueueError.message : String(enqueueError),
      },
    });

    try {
      await queue.processInline({ runId });
      return 'inline';
    } catch (inlineError) {
      throw new AppError(`Failed to process sequence run ${runId} after queue failure.`, {
        code: AppErrorCodes.internal,
        httpStatus: 500,
        cause: inlineError,
        meta: { runId, fallback: 'inline' },
      });
    }
  }
};
