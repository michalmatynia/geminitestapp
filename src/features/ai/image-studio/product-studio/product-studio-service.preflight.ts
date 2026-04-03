import 'server-only';

import { resolveImageStudioSequenceActiveSteps } from '@/features/ai/image-studio/server';
import {
  normalizeProductStudioSequenceGenerationMode,
  type ProductStudioConfig,
  type ProductStudioPreflightResponse,
  type ProductStudioSequenceGenerationMode,
  type ProductStudioVariantsResponse,
} from '@/shared/contracts/products';

import { resolveGenerationVariants } from './product-studio-service.analysis';
import {
  resolveProductAndStudioTarget,
  resolveSourceSlotIdForIndex,
} from './product-studio-service.resolution';
import {
  buildProductStudioSequenceStepPlan,
  buildSequenceStepPlanWarnings,
  resolvePostProductionRoute,
  resolveSequenceReadiness,
} from './product-studio-service.sequencing';
import { resolveStudioSettingsBundle } from './product-studio-service.settings';

export type ProductStudioVariantsResult = ProductStudioVariantsResponse;
export type ProductStudioSequencePreflightResult = ProductStudioPreflightResponse;

const buildProductStudioVariantsResultBase = (
  preflight: ProductStudioSequencePreflightResult
): Omit<ProductStudioVariantsResult, 'sourceSlotId' | 'sourceSlot' | 'variants'> => ({
  config: preflight.config,
  sequencing: preflight.sequencing,
  sequencingDiagnostics: preflight.sequencingDiagnostics,
  sequenceReadiness: preflight.sequenceReadiness,
  sequenceStepPlan: preflight.sequenceStepPlan,
  sequenceGenerationMode: preflight.sequenceGenerationMode,
  projectId: preflight.projectId,
});

const normalizeSourceSlotCandidate = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveSourceSlotHistory = (
  config: ProductStudioConfig,
  imageSlotIndex: number
): unknown[] => {
  const history = config.sourceSlotHistoryByImageIndex[String(imageSlotIndex)];
  return Array.isArray(history) ? history : [];
};

export const resolveProductStudioSourceSlotCandidates = (
  config: ProductStudioConfig,
  imageSlotIndex: number
): string[] =>
  Array.from(
    new Set<string>(
      [
        resolveSourceSlotIdForIndex(config, imageSlotIndex),
        ...resolveSourceSlotHistory(config, imageSlotIndex),
      ]
        .map(normalizeSourceSlotCandidate)
        .filter((value): value is string => value !== null)
    )
  );

const buildEmptyProductStudioVariantsResult = (
  preflight: ProductStudioSequencePreflightResult
): ProductStudioVariantsResult => ({
  ...buildProductStudioVariantsResultBase(preflight),
  sourceSlotId: null,
  sourceSlot: null,
  variants: [],
});

const buildResolvedProductStudioVariantsResult = (
  preflight: ProductStudioSequencePreflightResult,
  sourceSlotCandidates: string[],
  resolved: Awaited<ReturnType<typeof resolveGenerationVariants>>
): ProductStudioVariantsResult => ({
  ...buildProductStudioVariantsResultBase(preflight),
  sourceSlotId: resolved.sourceSlot?.id ?? sourceSlotCandidates[0] ?? null,
  sourceSlot: resolved.sourceSlot,
  variants: resolved.variants,
});

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
    parsedStudioSettings.projectSequencing
  ).filter((step) => step.enabled);
  const sequenceStepPlan = buildProductStudioSequenceStepPlan(activeSequenceSteps);
  const requestedSequenceMode = normalizeProductStudioSequenceGenerationMode(
    params.sequenceGenerationMode ?? sequenceGenerationMode
  );
  const routeDecision = resolvePostProductionRoute({
    sequencing,
    requestedMode: requestedSequenceMode,
    modelId,
  });
  const warnings = [...routeDecision.warnings, ...buildSequenceStepPlanWarnings(sequenceStepPlan)];
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
  const sourceSlotCandidates = resolveProductStudioSourceSlotCandidates(
    preflight.config,
    preflight.imageSlotIndex
  );

  if (sourceSlotCandidates.length === 0) {
    return buildEmptyProductStudioVariantsResult(preflight);
  }

  const resolved = await resolveGenerationVariants({
    projectId: preflight.projectId,
    sourceSlotIds: sourceSlotCandidates,
  });

  return buildResolvedProductStudioVariantsResult(preflight, sourceSlotCandidates, resolved);
}

export async function getProductStudioSequencePreflight(params: {
  productId: string;
  imageSlotIndex: number;
  projectId?: string | null | undefined;
  sequenceGenerationMode?: ProductStudioSequenceGenerationMode | null | undefined;
}): Promise<ProductStudioSequencePreflightResult> {
  return await resolveProductStudioSequencePreflight(params);
}
