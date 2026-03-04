import 'server-only';

import { getImageStudioSlotById } from '@/features/ai/image-studio/server/slot-repository';
import {
  IMAGE_STUDIO_SEQUENCE_OPERATIONS,
  normalizeImageStudioSequenceSteps,
  parsePersistedImageStudioSettings,
  resolveImageStudioSequenceActiveSteps,
  type ImageStudioSequenceOperation,
  type ImageStudioSequenceStep,
} from '@/features/ai/image-studio/utils/studio-settings';

import type {
  ImageStudioSequenceMaskContext,
  ImageStudioSequenceRunRecord,
} from '@/shared/contracts/image-studio';

import { executeCropStep, executeUpscaleStep } from './sequence/image-processing';
import { executeGenerateStep } from './sequence/generation';

const isSequenceOperation = (value: unknown): value is ImageStudioSequenceOperation =>
  typeof value === 'string' &&
  IMAGE_STUDIO_SEQUENCE_OPERATIONS.includes(value as ImageStudioSequenceOperation);

const resolveFallbackOperations = (steps: unknown[]): ImageStudioSequenceOperation[] =>
  steps
    .map((step) => {
      if (!step || typeof step !== 'object' || Array.isArray(step)) return null;
      const stepRecord = step as Record<string, unknown>;
      return stepRecord['type'];
    })
    .filter(isSequenceOperation);

export type ImageStudioSequenceStepExecutionContext = {
  run: ImageStudioSequenceRunRecord;
  step: ImageStudioSequenceStep;
  inputSlotId: string;
  runtimeMask: ImageStudioSequenceMaskContext | null;
};

export type ImageStudioSequenceStepExecutionResult = {
  nextSlotId: string;
  producedSlotIds: string[];
  runtimeMask: ImageStudioSequenceMaskContext | null;
  details?: Record<string, unknown>;
};

export async function executeImageStudioSequenceStep(
  context: ImageStudioSequenceStepExecutionContext
): Promise<ImageStudioSequenceStepExecutionResult> {
  const currentSlot = await getImageStudioSlotById(context.inputSlotId);
  if (currentSlot?.projectId !== context.run.projectId || !currentSlot) {
    throw new Error('Step input slot is missing or does not belong to the sequence project.');
  }

  if (context.step.type === 'crop_center') {
    const result = await executeCropStep({
      run: context.run,
      step: context.step,
      currentSlot,
    });
    return {
      nextSlotId: result.nextSlotId,
      producedSlotIds: result.producedSlotIds,
      runtimeMask: context.runtimeMask,
      details: {
        kind: context.step.config.kind,
      },
    };
  }

  // Placeholder for mask step
  if (context.step.type === 'mask') {
    return {
      nextSlotId: context.inputSlotId,
      producedSlotIds: [],
      runtimeMask: context.runtimeMask,
    };
  }

  if (context.step.type === 'generate' || context.step.type === 'regenerate') {
    const result = await executeGenerateStep({
      run: context.run,
      step: context.step,
      currentSlot,
      _runtimeMask: context.runtimeMask,
    });

    return {
      nextSlotId: result.nextSlotId,
      producedSlotIds: result.producedSlotIds,
      runtimeMask: context.runtimeMask,
      details: {
        generationRunId: result.generatedRunId,
        outputCount: result.producedSlotIds.length,
      },
    };
  }

  if (context.step.type !== 'upscale') {
    throw new Error(`Unsupported sequence step type: ${context.step.type}`);
  }

  const upscaleResult = await executeUpscaleStep({
    run: context.run,
    step: context.step,
    currentSlot,
  });
  return {
    nextSlotId: upscaleResult.nextSlotId,
    producedSlotIds: upscaleResult.producedSlotIds,
    runtimeMask: context.runtimeMask,
    details: {
      strategy: context.step.config.strategy,
    },
  };
}

export function resolveSequenceStepsForExecution(
  run: ImageStudioSequenceRunRecord
): ImageStudioSequenceStep[] {
  const parsedSettings = parsePersistedImageStudioSettings(
    run.request.studioSettings ? JSON.stringify(run.request.studioSettings) : null
  );

  if (Array.isArray(run.request.steps) && run.request.steps.length > 0) {
    return normalizeImageStudioSequenceSteps(run.request.steps, {
      fallbackOperations: resolveFallbackOperations(run.request.steps),
    });
  }

  return resolveImageStudioSequenceActiveSteps(parsedSettings.projectSequencing);
}
