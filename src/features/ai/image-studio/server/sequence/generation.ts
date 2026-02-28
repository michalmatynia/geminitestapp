import {
  createImageStudioRun,
  getImageStudioRunById,
} from '@/features/ai/image-studio/server/run-repository';
import {
  listImageStudioSlots,
} from '@/features/ai/image-studio/server/slot-repository';
import { resolvePromptPlaceholders } from '@/features/ai/image-studio/utils/run-request-preview';
import {
  enqueueImageStudioRunJob,
} from '@/features/ai/image-studio/workers/imageStudioRunQueue';
import { 
  type ImageStudioSequenceGenerateStep,
  type ImageStudioSequenceMaskContext
} from '@/features/ai/image-studio/utils/studio-settings';
import type { ImageStudioSequenceRunRecord } from '../sequence-run-repository';
import { sleep } from './utils';

const POLL_INTERVAL_MS = 1200;
const DEFAULT_GENERATION_WAIT_MS = 18 * 60 * 1000;

export async function executeGenerateStep(params: {
  run: ImageStudioSequenceRunRecord;
  step: ImageStudioSequenceGenerateStep;
  currentSlot: any;
  runtimeMask?: any | null;
}): Promise<{ nextSlotId: string; producedSlotIds: string[]; generatedRunId: string }> {
  const { run, step, currentSlot, runtimeMask } = params;
  const config = step.config as any;
  
  const prompt = resolvePromptPlaceholders(config.promptTemplate || '', {
    projectId: run.projectId,
    slotId: currentSlot.id,
  });

  const genRun = await createImageStudioRun(run.projectId, {
    mode: config.promptMode === 'override' ? 'server_authoritative' : 'server_assisted',
    model: config.modelOverride || undefined,
    prompt,
    negativePrompt: config.negativePrompt || undefined,
    inputSlotId: currentSlot.id,
    maskSlotId: runtimeMask?.slotId ?? config.maskSlotId ?? null,
    strength: config.strength ?? 0.75,
    guidance: config.guidance ?? 7.5,
    steps: config.steps ?? 30,
    seed: config.seed ?? null,
    outputCount: config.outputCount ?? 1,
    scheduler: config.scheduler || undefined,
  });

  await enqueueImageStudioRunJob({ runId: genRun.id });

  const startTime = Date.now();
  const timeout = step.config.timeoutMs || DEFAULT_GENERATION_WAIT_MS;

  while (Date.now() - startTime < timeout) {
    const status = await getImageStudioRunById(genRun.id) as any;
    if (status?.status === 'completed') break;
    if (status?.status === 'failed') {
      throw new Error(`Generation failed: ${status.error || 'Unknown error'}`);
    }
    await sleep(POLL_INTERVAL_MS);
  }

  const producedSlots = await listImageStudioSlots(run.projectId);
  const newSlots = producedSlots
    .filter(s => (s as any).runId === genRun.id)
    .map(s => s.id);

  if (newSlots.length === 0) {
    throw new Error('Generation completed but no output slots found.');
  }

  return {
    nextSlotId: newSlots[0]!,
    producedSlotIds: newSlots,
    generatedRunId: genRun.id,
  };
}
