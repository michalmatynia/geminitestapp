import { type ImageStudioSequenceStep } from '@/features/ai/image-studio/server';
import { supportsImageSequenceGeneration } from '@/features/ai/image-studio/utils/image-models';
import { DEFAULT_PRODUCT_STUDIO_SEQUENCE_READINESS } from '@/shared/contracts/products/studio';
import { type ProductStudioExecutionRoute, type ProductStudioSequenceGenerationMode, type ProductStudioSequencingConfig, type ProductStudioSequencingDiagnostics, type ProductStudioSequenceStepPlanEntry, type ProductStudioSequenceReadiness } from '@/shared/contracts/products';
import { badRequestError } from '@/shared/errors/app-error';

import { clamp01, trimString } from './product-studio-service.helpers';

export type { ProductStudioSequenceStepPlanEntry };

export type ResolvePostProductionRouteInput = {
  sequencing: ProductStudioSequencingConfig;
  requestedMode: ProductStudioSequenceGenerationMode;
  modelId: string;
};

export type ResolvePostProductionRouteResult = {
  executionRoute: ProductStudioExecutionRoute;
  runKind: 'generation' | 'sequence';
  resolvedMode: ProductStudioSequenceGenerationMode;
  warnings: string[];
};

const PRODUCT_STUDIO_STRICT_SEQUENCE_MODE =
  process.env['PRODUCT_STUDIO_STRICT_SEQUENCE_MODE'] !== 'false';

const buildRouteDecision = (params: {
  executionRoute: ProductStudioExecutionRoute;
  runKind: 'generation' | 'sequence';
  resolvedMode: ProductStudioSequenceGenerationMode;
  warnings?: string[];
}): ResolvePostProductionRouteResult => ({
  executionRoute: params.executionRoute,
  runKind: params.runKind,
  resolvedMode: params.resolvedMode,
  warnings: params.warnings ?? [],
});

const resolveForcedPostProductionRoute = (
  requestedMode: ProductStudioSequenceGenerationMode
): ResolvePostProductionRouteResult | null => {
  if (requestedMode === 'studio_prompt_then_sequence') {
    return buildRouteDecision({
      executionRoute: 'studio_sequencer',
      runKind: 'sequence',
      resolvedMode: 'studio_prompt_then_sequence',
    });
  }
  if (requestedMode === 'studio_native_sequencer_prior_generation') {
    return buildRouteDecision({
      executionRoute: 'studio_native_sequencer_prior_generation',
      runKind: 'sequence',
      resolvedMode: 'studio_native_sequencer_prior_generation',
    });
  }
  return null;
};

const resolveStrictSequencerRoute = (params: {
  sequencerEnabled: boolean;
  requestedMode: ProductStudioSequenceGenerationMode;
}): ResolvePostProductionRouteResult | null => {
  if (!params.sequencerEnabled || !PRODUCT_STUDIO_STRICT_SEQUENCE_MODE) {
    return null;
  }
  const warnings =
    params.requestedMode === 'model_full_sequence'
      ? [
          'Project sequencing is enabled, so Product Studio runs the Image Studio sequence exactly as configured.',
        ]
      : [];
  return buildRouteDecision({
    executionRoute: 'studio_sequencer',
    runKind: 'sequence',
    resolvedMode: 'studio_prompt_then_sequence',
    warnings,
  });
};

const resolveDisabledSequencerRoute = (params: {
  requestedMode: ProductStudioSequenceGenerationMode;
  modelSupportsFullSequence: boolean;
  hasConfiguredSequenceSteps: boolean;
  modelId: string;
}): ResolvePostProductionRouteResult => {
  const warnings: string[] = [];

  if (params.requestedMode === 'model_full_sequence') {
    if (params.modelSupportsFullSequence) {
      return buildRouteDecision({
        executionRoute: 'ai_model_full_sequence',
        runKind: 'generation',
        resolvedMode: 'model_full_sequence',
      });
    }
    if (params.hasConfiguredSequenceSteps) {
      warnings.push(
        `Model "${params.modelId || 'selected model'}" does not support full-sequence generation and persisted project sequencing is disabled, so Product Studio will run direct generation only.`
      );
    }
    return buildRouteDecision({
      executionRoute: 'ai_direct_generation',
      runKind: 'generation',
      resolvedMode: 'model_full_sequence',
      warnings,
    });
  }

  if (params.requestedMode === 'auto' && params.modelSupportsFullSequence) {
    return buildRouteDecision({
      executionRoute: 'ai_model_full_sequence',
      runKind: 'generation',
      resolvedMode: 'model_full_sequence',
    });
  }

  if (params.hasConfiguredSequenceSteps) {
    warnings.push(
      'Persisted project sequencing is disabled, so Product Studio cannot run project sequence steps until Image Studio Sequencing defaults are saved.'
    );
  }

  return buildRouteDecision({
    executionRoute: 'ai_direct_generation',
    runKind: 'generation',
    resolvedMode:
      params.requestedMode === 'auto' ? 'studio_prompt_then_sequence' : params.requestedMode,
    warnings,
  });
};

const resolveEnabledSequencerRoute = (params: {
  requestedMode: ProductStudioSequenceGenerationMode;
  modelSupportsFullSequence: boolean;
  modelId: string;
}): ResolvePostProductionRouteResult => {
  if (params.requestedMode === 'model_full_sequence') {
    if (params.modelSupportsFullSequence) {
      return buildRouteDecision({
        executionRoute: 'ai_model_full_sequence',
        runKind: 'generation',
        resolvedMode: 'model_full_sequence',
      });
    }
    return buildRouteDecision({
      executionRoute: 'studio_native_sequencer_prior_generation',
      runKind: 'sequence',
      resolvedMode: 'studio_native_sequencer_prior_generation',
      warnings: [
        `Model "${params.modelId || 'selected model'}" does not support full-sequence generation. Falling back to native Image Studio sequencer with prior generation.`,
      ],
    });
  }

  return params.modelSupportsFullSequence
    ? buildRouteDecision({
        executionRoute: 'ai_model_full_sequence',
        runKind: 'generation',
        resolvedMode: 'model_full_sequence',
      })
    : buildRouteDecision({
        executionRoute: 'studio_native_sequencer_prior_generation',
        runKind: 'sequence',
        resolvedMode: 'studio_native_sequencer_prior_generation',
      });
};

export const resolvePostProductionRoute = (
  input: ResolvePostProductionRouteInput
): ResolvePostProductionRouteResult => {
  const modelSupportsFullSequence = supportsImageSequenceGeneration(input.modelId);
  const sequencerEnabled = input.sequencing.enabled && input.sequencing.runViaSequence;
  const hasConfiguredSequenceSteps = input.sequencing.sequenceStepCount > 0;

  return (
    resolveForcedPostProductionRoute(input.requestedMode) ??
    resolveStrictSequencerRoute({
      sequencerEnabled,
      requestedMode: input.requestedMode,
    }) ??
    (sequencerEnabled
      ? resolveEnabledSequencerRoute({
          requestedMode: input.requestedMode,
          modelSupportsFullSequence,
          modelId: input.modelId,
        })
      : resolveDisabledSequencerRoute({
          requestedMode: input.requestedMode,
          modelSupportsFullSequence,
          hasConfiguredSequenceSteps,
          modelId: input.modelId,
        }))
  );
};

export const validateProductStudioSequenceSteps = (inputSteps: ImageStudioSequenceStep[]): void => {
  const errors: string[] = [];
  if (inputSteps.length === 0) {
    errors.push('No enabled sequence steps are available for execution.');
  } else if (inputSteps.length > 20) {
    errors.push(
      `Project sequence has ${inputSteps.length} enabled steps. Product Studio supports up to 20 enabled sequence steps.`
    );
  }

  const seenStepIds = new Set<string>();
  for (const step of inputSteps) {
    const stepId = trimString(step.id);
    if (!stepId) {
      errors.push(`Sequence step "${step.type}" is missing a valid step id.`);
    } else if (seenStepIds.has(stepId)) {
      errors.push(`Sequence step id "${stepId}" is duplicated. Use unique step ids.`);
    } else {
      seenStepIds.add(stepId);
    }

    if (step.runtime !== 'server') {
      errors.push(
        `Step "${step.id}" (${step.type}) is configured for "${step.runtime}" runtime. Product Studio executes project sequences on server runtime only.`
      );
    }

    if (step.type !== 'crop_center') continue;
    if (step.config.kind !== 'selected_shape') continue;
    const hasBbox = Boolean(step.config.bbox);
    const hasPolygon = Array.isArray(step.config.polygon) && step.config.polygon.length >= 3;
    if (hasBbox || hasPolygon) continue;
    const selectedShapeId = trimString(step.config.selectedShapeId);
    errors.push(
      selectedShapeId
        ? `Sequence step "${step.id}" uses selected shape "${selectedShapeId}" but no crop geometry snapshot was saved. Open Image Studio for this project, re-select the shape in the sequence step, save project, and retry.`
        : `Sequence step "${step.id}" uses selected shape crop but has no selected shape. Configure the shape in Image Studio and retry.`
    );
  }

  if (errors.length > 0) {
    throw badRequestError(errors[0] ?? 'Sequence preflight validation failed.', {
      errors,
    });
  }
};

export const stepProducesRenderableOutput = (step: ImageStudioSequenceStep): boolean => {
  if (step.type === 'mask') {
    return Boolean(step.config.persistMaskSlot);
  }
  return (
    step.type === 'crop_center' ||
    step.type === 'generate' ||
    step.type === 'regenerate' ||
    step.type === 'upscale'
  );
};

export const buildProductStudioSequenceStepPlan = (
  steps: ImageStudioSequenceStep[]
): ProductStudioSequenceStepPlanEntry[] => {
  let hasProducedOutput = false;
  return steps.map((step, index) => {
    const inputSource = step.inputSource === 'source' ? 'source' : 'previous';
    const resolvedInput = inputSource === 'source' || hasProducedOutput ? inputSource : 'source';
    const producesOutput = stepProducesRenderableOutput(step);
    if (producesOutput) {
      hasProducedOutput = true;
    }
    return {
      index,
      stepId: step.id,
      stepType: step.type,
      inputSource,
      resolvedInput,
      producesOutput,
    };
  });
};

export const buildSequenceStepPlanWarnings = (
  plan: ProductStudioSequenceStepPlanEntry[]
): string[] =>
  plan
    .filter(
      (entry) =>
        entry.index > 0 && entry.inputSource === 'previous' && entry.resolvedInput === 'source'
    )
    .map(
      (entry) =>
        `Step ${entry.index + 1} (${entry.stepType}) is set to use previous output, but no prior step output exists yet. It will run on the source image.`
    );

export const isSequenceExecutionRoute = (route: ProductStudioExecutionRoute): boolean =>
  route === 'studio_sequencer' || route === 'studio_native_sequencer_prior_generation';

export const doesRequestedModeRequireProjectSequence = (
  mode: ProductStudioSequenceGenerationMode
): boolean =>
  mode === 'studio_prompt_then_sequence' || mode === 'studio_native_sequencer_prior_generation';

export const resolveSequenceReadiness = (params: {
  sequencing: ProductStudioSequencingConfig;
  sequencingDiagnostics: ProductStudioSequencingDiagnostics;
  requestedMode: ProductStudioSequenceGenerationMode;
  route: ProductStudioExecutionRoute;
}): ProductStudioSequenceReadiness => {
  const projectSettingsKey =
    params.sequencingDiagnostics.projectSettingsKey ?? 'project settings key';

  const requiresSequence =
    doesRequestedModeRequireProjectSequence(params.requestedMode) ||
    isSequenceExecutionRoute(params.route);
  if (!requiresSequence) {
    return {
      ...DEFAULT_PRODUCT_STUDIO_SEQUENCE_READINESS,
      requiresProjectSequence: false,
    };
  }

  if (
    params.sequencingDiagnostics.selectedScope === 'project' &&
    !params.sequencing.persistedEnabled &&
    params.sequencingDiagnostics.globalSequencingEnabled
  ) {
    return {
      ready: false,
      requiresProjectSequence: true,
      state: 'project_sequence_disabled',
      message: `Project sequencing is disabled in "${projectSettingsKey}" while global sequencing is enabled. Product Studio always uses project-scoped settings. Enable Sequencing and click "Save Project" in this project.`,
    };
  }

  if (!params.sequencing.persistedEnabled) {
    return {
      ready: false,
      requiresProjectSequence: true,
      state: 'project_sequence_disabled',
      message:
        'Image Studio project sequencing is disabled in persisted project settings. Enable Sequencing and click "Save Project" in Image Studio.',
    };
  }

  if (params.sequencing.sequenceStepCount <= 0) {
    return {
      ready: false,
      requiresProjectSequence: true,
      state: 'project_steps_empty',
      message:
        'Image Studio project sequencing has no enabled steps. Configure at least one enabled step and click "Save Project".',
    };
  }

  if (!params.sequencing.runViaSequence || params.sequencing.needsSaveDefaults) {
    return {
      ready: false,
      requiresProjectSequence: true,
      state: 'project_snapshot_stale',
      message:
        params.sequencing.needsSaveDefaultsReason ??
        'Image Studio sequence configuration changed and is not saved. Click "Save Project" in Image Studio.',
    };
  }

  return {
    ready: true,
    requiresProjectSequence: true,
    state: 'ready',
    message: null,
  };
};

export const resolveFirstSequenceCropRect = (
  steps: ImageStudioSequenceStep[]
): { x: number; y: number; width: number; height: number } | null => {
  for (const step of steps) {
    if (step.type !== 'crop_center') continue;
    if (step.config.kind !== 'selected_shape') continue;
    if (step.config.bbox) {
      return {
        x: clamp01(step.config.bbox.x),
        y: clamp01(step.config.bbox.y),
        width: clamp01(step.config.bbox.width),
        height: clamp01(step.config.bbox.height),
      };
    }

    if (Array.isArray(step.config.polygon) && step.config.polygon.length >= 3) {
      const xs = step.config.polygon.map((point) => clamp01(point.x));
      const ys = step.config.polygon.map((point) => clamp01(point.y));
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      return {
        x: minX,
        y: minY,
        width: Math.max(0, maxX - minX),
        height: Math.max(0, maxY - minY),
      };
    }
  }

  return null;
};
