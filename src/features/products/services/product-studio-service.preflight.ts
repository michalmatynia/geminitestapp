import 'server-only';

import {
  resolveImageStudioSequenceActiveSteps,
} from '@/features/ai/image-studio/utils/studio-settings';
import type { ImageStudioSlotRecord } from '@/features/ai/image-studio/server/slot-repository';
import {
  normalizeProductStudioSequenceGenerationMode,
  type ProductStudioExecutionRoute,
  type ProductStudioSequenceGenerationMode,
  type ProductStudioSequencingConfig,
  type ProductStudioSequencingDiagnostics,
  type ProductStudioSequenceReadiness,
} from '@/shared/contracts/products';
import type { ProductStudioConfig } from '@/features/products/services/product-studio-config';

import {
  buildProductStudioSequenceStepPlan,
  buildSequenceStepPlanWarnings,
  resolvePostProductionRoute,
  resolveSequenceReadiness,
  type ProductStudioSequenceStepPlanEntry,
} from './product-studio-service.sequencing';
import { resolveGenerationVariants } from './product-studio-service.analysis';
import {
  resolveProductAndStudioTarget,
  resolveSourceSlotIdForIndex,
} from './product-studio-service.resolution';
import { resolveStudioSettingsBundle } from './product-studio-service.settings';

export type ProductStudioVariantsResult = {
  config: ProductStudioConfig;
  sequencing: ProductStudioSequencingConfig;
  sequencingDiagnostics: ProductStudioSequencingDiagnostics;
  sequenceReadiness: ProductStudioSequenceReadiness;
  sequenceStepPlan: ProductStudioSequenceStepPlanEntry[];
  sequenceGenerationMode: ProductStudioSequenceGenerationMode;
  projectId: string | null;
  sourceSlotId: string | null;
  sourceSlot: ImageStudioSlotRecord | null;
  variants: ImageStudioSlotRecord[];
};

export type ProductStudioSequencePreflightResult = {
  config: ProductStudioConfig;
  projectId: string;
  imageSlotIndex: number;
  sequenceStepPlan: ProductStudioSequenceStepPlanEntry[];
  sequenceGenerationMode: ProductStudioSequenceGenerationMode;
  requestedSequenceMode: ProductStudioSequenceGenerationMode;
  resolvedSequenceMode: ProductStudioSequenceGenerationMode;
  executionRoute: ProductStudioExecutionRoute;
  sequencing: ProductStudioSequencingConfig;
  sequencingDiagnostics: ProductStudioSequencingDiagnostics;
  sequenceReadiness: ProductStudioSequenceReadiness;
  modelId: string;
  warnings: string[];
};

export const resolveProductStudioSequencePreflight = async (params: {
  productId: string;
  imageSlotIndex: number;
  projectId?: string | null | undefined;
  sequenceGenerationMode?: ProductStudioSequenceGenerationMode | null | undefined;
}): Promise<ProductStudioSequencePreflightResult> => {
  const resolved = await resolveProductAndStudioTarget(params);
  const {
    parsedStudioSettings,
    sequencing,
    sequencingDiagnostics,
    sequenceGenerationMode,
    modelId,
  } = await resolveStudioSettingsBundle(resolved.projectId);
  const activeSequenceSteps = resolveImageStudioSequenceActiveSteps(
    parsedStudioSettings.projectSequencing,
  ).filter((step) => step.enabled);
  const sequenceStepPlan = buildProductStudioSequenceStepPlan(activeSequenceSteps);
  const requestedSequenceMode = normalizeProductStudioSequenceGenerationMode(
    params.sequenceGenerationMode ?? sequenceGenerationMode,
  );
  const routeDecision = resolvePostProductionRoute({
    sequencing,
    requestedMode: requestedSequenceMode,
    modelId,
  });
  const warnings = [
    ...routeDecision.warnings,
    ...buildSequenceStepPlanWarnings(sequenceStepPlan),
  ];
  const sequenceReadiness = resolveSequenceReadiness({
    sequencing,
    sequencingDiagnostics,
    requestedMode: requestedSequenceMode,
    route: routeDecision.executionRoute,
  });
  return {
    config: resolved.config,
    projectId: resolved.projectId,
    imageSlotIndex: resolved.imageSlotIndex,
    sequenceStepPlan,
    sequenceGenerationMode,
    requestedSequenceMode,
    resolvedSequenceMode: routeDecision.resolvedMode,
    executionRoute: routeDecision.executionRoute,
    sequencing,
    sequencingDiagnostics,
    sequenceReadiness,
    modelId,
    warnings,
  };
};

export async function getProductStudioVariants(params: {
  productId: string;
  imageSlotIndex: number;
  projectId?: string | null | undefined;
}): Promise<ProductStudioVariantsResult> {
  const preflight = await resolveProductStudioSequencePreflight({
    productId: params.productId,
    imageSlotIndex: params.imageSlotIndex,
    projectId: params.projectId,
  });
  const sourceSlotId = resolveSourceSlotIdForIndex(
    preflight.config,
    preflight.imageSlotIndex,
  );
  const sourceSlotHistory = Array.isArray(
    preflight.config.sourceSlotHistoryByImageIndex[String(preflight.imageSlotIndex)],
  )
    ? preflight.config.sourceSlotHistoryByImageIndex[String(preflight.imageSlotIndex)] ?? []
    : [];
  const sourceSlotCandidates = Array.from(
    new Set<string>(
      [sourceSlotId, ...sourceSlotHistory]
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );

  if (sourceSlotCandidates.length === 0) {
    return {
      config: preflight.config,
      sequencing: preflight.sequencing,
      sequencingDiagnostics: preflight.sequencingDiagnostics,
      sequenceReadiness: preflight.sequenceReadiness,
      sequenceStepPlan: preflight.sequenceStepPlan,
      sequenceGenerationMode: preflight.sequenceGenerationMode,
      projectId: preflight.projectId,
      sourceSlotId: null,
      sourceSlot: null,
      variants: [],
    };
  }

  const { sourceSlot, variants } = await resolveGenerationVariants({
    projectId: preflight.projectId,
    sourceSlotIds: sourceSlotCandidates,
  });

  return {
    config: preflight.config,
    sequencing: preflight.sequencing,
    sequencingDiagnostics: preflight.sequencingDiagnostics,
    sequenceReadiness: preflight.sequenceReadiness,
    sequenceStepPlan: preflight.sequenceStepPlan,
    sequenceGenerationMode: preflight.sequenceGenerationMode,
    projectId: preflight.projectId,
    sourceSlotId: sourceSlot?.id ?? sourceSlotCandidates[0] ?? null,
    sourceSlot,
    variants,
  };
}

export async function getProductStudioSequencePreflight(params: {
  productId: string;
  imageSlotIndex: number;
  projectId?: string | null | undefined;
  sequenceGenerationMode?: ProductStudioSequenceGenerationMode | null | undefined;
}): Promise<ProductStudioSequencePreflightResult> {
  return await resolveProductStudioSequencePreflight(params);
}
