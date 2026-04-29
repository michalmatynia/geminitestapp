'use client';

import { useMemo } from 'react';

import { getImageStudioSlotImageSrc } from '@/features/ai/public';
import { buildProductStudioWorkspaceContextBundle } from '@/features/products/context-registry/workspace';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { ContextRegistryPageSource } from '@/shared/lib/ai-context-registry/page-context-shared';

import type {
  ProductImageSlotPreview,
  ProductStudioAuditEntry,
  ProductStudioRunStatus,
  ProductStudioVariantsResponse,
} from './ProductStudioContext.types';

type UseProductStudioDerivedStateInput = {
  product: ProductWithImages | null | undefined;
  studioProjectId: string | null;
  selectedImageIndex: number | null;
  imageSlotPreviews: ProductImageSlotPreview[];
  productImagesExternalBaseUrl: string;
  selectedVariantSlotId: string | null;
  variantsData: ProductStudioVariantsResponse | null;
  activeRunId: string | null;
  runStatus: ProductStudioRunStatus | null;
  activeRunBaselineVariantIds: string[];
  pendingExpectedOutputs: number;
  auditEntries: ProductStudioAuditEntry[];
};

type ProductStudioDerivedState = {
  variants: ProductStudioVariantsResponse['variants'];
  selectedVariant: ProductStudioVariantsResponse['variants'][number] | null;
  selectedSourcePreview: ProductImageSlotPreview | null;
  sourceImageSrc: string | null;
  variantImageSrc: string | null;
  canCompareWithSource: boolean;
  sequenceReadinessMessage: string | null;
  blockSendForSequenceReadiness: boolean;
  pendingVariantPlaceholderCount: number;
  registrySource: Omit<ContextRegistryPageSource, 'sourceId'> | null;
};

type ProductStudioVariant = ProductStudioVariantsResponse['variants'][number];

const selectProductStudioVariant = (
  variants: ProductStudioVariantsResponse['variants'],
  selectedVariantSlotId: string | null
): ProductStudioVariant | null =>
  variants.find((slot) => slot.id === selectedVariantSlotId) ?? variants[0] ?? null;

const resolveSourceImageSrc = ({
  productImagesExternalBaseUrl,
  selectedSourcePreview,
  variantsData,
}: {
  productImagesExternalBaseUrl: string;
  selectedSourcePreview: ProductImageSlotPreview | null;
  variantsData: ProductStudioVariantsResponse | null;
}): string | null =>
  getImageStudioSlotImageSrc(variantsData?.sourceSlot, productImagesExternalBaseUrl) ??
  selectedSourcePreview?.src ??
  null;

const resolveSequenceReadinessMessage = (
  variantsData: ProductStudioVariantsResponse | null
): string | null => {
  const sequenceReadiness = variantsData?.sequenceReadiness ?? null;
  if (sequenceReadiness === null || sequenceReadiness.ready === true) {
    return null;
  }
  return sequenceReadiness.message ?? 'Not ready.';
};

const countVariantsProducedForActiveRun = (
  variants: ProductStudioVariantsResponse['variants'],
  activeRunBaselineVariantIds: readonly string[]
): number => {
  const activeRunBaselineVariantIdSet = new Set(activeRunBaselineVariantIds);
  return variants.filter(
    (slot) => slot.id.length > 0 && !activeRunBaselineVariantIdSet.has(slot.id)
  ).length;
};

const resolvePendingVariantPlaceholderCount = ({
  activeRunBaselineVariantIds,
  activeRunId,
  pendingExpectedOutputs,
  runStatus,
  variants,
}: {
  activeRunBaselineVariantIds: readonly string[];
  activeRunId: string | null;
  pendingExpectedOutputs: number;
  runStatus: ProductStudioRunStatus | null;
  variants: ProductStudioVariantsResponse['variants'];
}): number => {
  const isActiveRunPending =
    activeRunId !== null && (runStatus === 'queued' || runStatus === 'running');
  if (!isActiveRunPending) {
    return 0;
  }

  const variantsProducedForActiveRun = countVariantsProducedForActiveRun(
    variants,
    activeRunBaselineVariantIds
  );
  return Math.max(0, pendingExpectedOutputs - variantsProducedForActiveRun);
};

const resolveRegistrySource = ({
  activeRunId,
  auditEntries,
  imageSlotPreviews,
  pendingVariantPlaceholderCount,
  product,
  runStatus,
  selectedImageIndex,
  selectedVariantSlotId,
  sequenceReadinessMessage,
  studioProjectId,
  variantsData,
}: {
  activeRunId: string | null;
  auditEntries: ProductStudioAuditEntry[];
  imageSlotPreviews: ProductImageSlotPreview[];
  pendingVariantPlaceholderCount: number;
  product: ProductWithImages | null | undefined;
  runStatus: ProductStudioRunStatus | null;
  selectedImageIndex: number | null;
  selectedVariantSlotId: string | null;
  sequenceReadinessMessage: string | null;
  studioProjectId: string | null;
  variantsData: ProductStudioVariantsResponse | null;
}): Omit<ContextRegistryPageSource, 'sourceId'> | null => {
  if (product === null || product === undefined) {
    return null;
  }
  if (product.id.length === 0) {
    return null;
  }

  return {
    label: 'Product Studio workspace state',
    resolved: buildProductStudioWorkspaceContextBundle({
      product,
      studioProjectId,
      selectedImageIndex,
      imageSlotPreviews,
      selectedVariantSlotId,
      variantsData,
      activeRunId,
      runStatus,
      pendingVariantPlaceholderCount,
      sequenceReadinessMessage,
      auditEntries,
    }),
  };
};

const buildProductStudioDerivedState = ({
  product,
  studioProjectId,
  selectedImageIndex,
  imageSlotPreviews,
  productImagesExternalBaseUrl,
  selectedVariantSlotId,
  variantsData,
  activeRunId,
  runStatus,
  activeRunBaselineVariantIds,
  pendingExpectedOutputs,
  auditEntries,
}: UseProductStudioDerivedStateInput): ProductStudioDerivedState => {
  const variants = variantsData?.variants ?? [];
  const selectedVariant = selectProductStudioVariant(variants, selectedVariantSlotId);
  const selectedSourcePreview =
    imageSlotPreviews.find((preview) => preview.index === selectedImageIndex) ?? null;
  const sourceImageSrc = resolveSourceImageSrc({
    productImagesExternalBaseUrl,
    selectedSourcePreview,
    variantsData,
  });
  const variantImageSrc = getImageStudioSlotImageSrc(selectedVariant, productImagesExternalBaseUrl);
  const sequenceReadinessMessage = resolveSequenceReadinessMessage(variantsData);
  const pendingVariantPlaceholderCount = resolvePendingVariantPlaceholderCount({
    activeRunBaselineVariantIds,
    activeRunId,
    pendingExpectedOutputs,
    runStatus,
    variants,
  });

  return {
    variants,
    selectedVariant,
    selectedSourcePreview,
    sourceImageSrc,
    variantImageSrc,
    canCompareWithSource: sourceImageSrc !== null && variantImageSrc !== null,
    sequenceReadinessMessage,
    blockSendForSequenceReadiness: sequenceReadinessMessage !== null,
    pendingVariantPlaceholderCount,
    registrySource: resolveRegistrySource({
      activeRunId,
      auditEntries,
      imageSlotPreviews,
      pendingVariantPlaceholderCount,
      product,
      runStatus,
      selectedImageIndex,
      selectedVariantSlotId,
      sequenceReadinessMessage,
      studioProjectId,
      variantsData,
    }),
  };
};

export const useProductStudioDerivedState = ({
  product,
  studioProjectId,
  selectedImageIndex,
  imageSlotPreviews,
  productImagesExternalBaseUrl,
  selectedVariantSlotId,
  variantsData,
  activeRunId,
  runStatus,
  activeRunBaselineVariantIds,
  pendingExpectedOutputs,
  auditEntries,
}: UseProductStudioDerivedStateInput): ProductStudioDerivedState =>
  useMemo(() => {
    return buildProductStudioDerivedState({
      product,
      studioProjectId,
      selectedImageIndex,
      imageSlotPreviews,
      productImagesExternalBaseUrl,
      selectedVariantSlotId,
      variantsData,
      activeRunId,
      runStatus,
      activeRunBaselineVariantIds,
      pendingExpectedOutputs,
      auditEntries,
    });
  }, [
    activeRunBaselineVariantIds,
    activeRunId,
    auditEntries,
    imageSlotPreviews,
    pendingExpectedOutputs,
    product,
    productImagesExternalBaseUrl,
    runStatus,
    selectedImageIndex,
    selectedVariantSlotId,
    studioProjectId,
    variantsData,
  ]);
