import 'server-only';

import { type ImageStudioSequenceRunDispatchMode } from '@/shared/contracts/image-studio';
import { getBrainAssignmentForFeature } from '@/shared/lib/ai-brain/server';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { isRedisAvailable } from '@/shared/lib/queue';
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
  throw new Error(
    'Image Studio is disabled in AI Brain. Enable it in /admin/brain?tab=routing before running this action.'
  );
};

export const startImageStudioSequenceQueue = (): void => {
  if (reconcileInFlight) return;
  /* eslint-disable require-atomic-updates */
  reconcileInFlight = (async (): Promise<void> => {
    let enabled: boolean;
    try {
      enabled = await isImageStudioEnabled();
    } catch (error) {
      void ErrorSystem.captureException(error);
      await ErrorSystem.captureException(error, {
        service: LOG_SOURCE,
        action: 'validateBrainGate',
      });
      return;
    }

    if (!enabled) {
      if (!workerStarted) return;
      await queue.stopWorker().catch(async (error) => {
        await ErrorSystem.captureException(error, {
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
    await queue.processInline({ runId });
    return 'inline';
  }

  try {
    await queue.enqueue({ runId }, { jobId: runId });
    return 'queued';
  } catch (enqueueError) {
    void ErrorSystem.captureException(enqueueError);
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
      void ErrorSystem.captureException(inlineError);
      await ErrorSystem.captureException(inlineError, {
        service: LOG_SOURCE,
        action: 'inline-fallback-failed',
        runId,
      });
      throw inlineError;
    }
  }
};
