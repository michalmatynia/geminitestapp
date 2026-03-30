'use client';

import { useMemo } from 'react';

import { buildProductStudioWorkspaceContextBundle } from '@/features/products/context-registry/workspace';
import type { ProductWithImages } from '@/shared/contracts/products';
import type { ContextRegistryPageSource } from '@/shared/lib/ai-context-registry/page-context-shared';
import { getImageStudioSlotImageSrc } from '@/features/ai/public';

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
    const variants = variantsData?.variants ?? [];
    const selectedVariant =
      variants.find((slot) => slot.id === selectedVariantSlotId) ?? variants[0] ?? null;
    const selectedSourcePreview =
      imageSlotPreviews.find((preview) => preview.index === selectedImageIndex) ?? null;
    const sourceImageSrc =
      getImageStudioSlotImageSrc(variantsData?.sourceSlot, productImagesExternalBaseUrl) ??
      selectedSourcePreview?.src ??
      null;
    const variantImageSrc = getImageStudioSlotImageSrc(
      selectedVariant,
      productImagesExternalBaseUrl
    );
    const canCompareWithSource = Boolean(sourceImageSrc && variantImageSrc);
    const sequenceReadiness = variantsData?.sequenceReadiness ?? null;
    const sequenceReadinessMessage =
      sequenceReadiness && !sequenceReadiness.ready
        ? (sequenceReadiness.message ?? 'Not ready.')
        : null;
    const blockSendForSequenceReadiness = Boolean(sequenceReadinessMessage);
    const activeRunBaselineVariantIdSet = new Set(activeRunBaselineVariantIds);
    const variantsProducedForActiveRun = variants.filter(
      (slot) => slot.id && !activeRunBaselineVariantIdSet.has(slot.id)
    ).length;
    const pendingVariantPlaceholderCount =
      activeRunId && (runStatus === 'queued' || runStatus === 'running')
        ? Math.max(0, pendingExpectedOutputs - variantsProducedForActiveRun)
        : 0;
    const registrySource =
      product?.id
        ? {
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
        }
        : null;

    return {
      variants,
      selectedVariant,
      selectedSourcePreview,
      sourceImageSrc,
      variantImageSrc,
      canCompareWithSource,
      sequenceReadinessMessage,
      blockSendForSequenceReadiness,
      pendingVariantPlaceholderCount,
      registrySource,
    };
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
