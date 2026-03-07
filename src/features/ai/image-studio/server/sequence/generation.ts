import { createImageStudioRun, getImageStudioRunById } from '@/features/ai/image-studio/server';
import { listImageStudioSlots } from '@/features/ai/image-studio/server';
import type {
  ImageStudioSlotRecord,
  ImageStudioSequenceRunRecord,
  ImageStudioSequenceMaskContext,
} from '@/shared/contracts/image-studio';
import { resolvePromptPlaceholders } from '@/features/ai/image-studio/utils/run-request-preview';
import { enqueueImageStudioRunJob } from '@/features/ai/image-studio/workers/imageStudioRunQueue';
import { type ImageStudioSequenceGenerateStep } from '@/features/ai/image-studio/utils/studio-settings';
import { sleep } from './utils';

const POLL_INTERVAL_MS = 1200;
const DEFAULT_GENERATION_WAIT_MS = 18 * 60 * 1000;

export async function executeGenerateStep(params: {
  run: ImageStudioSequenceRunRecord;
  step: ImageStudioSequenceGenerateStep;
  currentSlot: ImageStudioSlotRecord;
  _runtimeMask?: ImageStudioSequenceMaskContext | null;
}): Promise<{ nextSlotId: string; producedSlotIds: string[]; generatedRunId: string }> {
  const { run, step, currentSlot } = params;
  const config = step.config;

  const promptTemplate = config.promptTemplate || '';
  const prompt = resolvePromptPlaceholders(promptTemplate, {
    projectId: run.projectId,
    slotId: currentSlot.id,
  });

  const genRun = await createImageStudioRun({
    projectId: run.projectId,
    request: {
      projectId: run.projectId,
      prompt,
    },
    expectedOutputs: config.outputCount ?? 1,
  });

  await enqueueImageStudioRunJob(genRun.id);

  const startTime = Date.now();

  while (Date.now() - startTime < DEFAULT_GENERATION_WAIT_MS) {
    const status = await getImageStudioRunById(genRun.id);
    if (status?.status === 'completed') break;
    if (status?.status === 'failed') {
      throw new Error(`Generation failed: ${status.errorMessage || 'Unknown error'}`);
    }
    await sleep(POLL_INTERVAL_MS);
  }

  const producedSlots = await listImageStudioSlots(run.projectId);
  const newSlots = producedSlots
    .filter((s) => {
      const metadata = s.metadata;
      return metadata?.['generationRunId'] === genRun.id;
    })
    .map((s) => s.id);

  if (newSlots.length === 0) {
    throw new Error('Generation completed but no output slots found.');
  }

  return {
    nextSlotId: newSlots[0]!,
    producedSlotIds: newSlots,
    generatedRunId: genRun.id,
  };
}
