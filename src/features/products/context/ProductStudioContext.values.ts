'use client';

import { useMemo } from 'react';

import type { ProductStudioActionHandlers } from './ProductStudioContext.actions';
import type {
  ProductImageSlotPreview,
  ProductStudioActionsContextValue,
  ProductStudioAuditEntry,
  ProductStudioRunStatus,
  ProductStudioStateContextValue,
  ProductStudioVariantsResponse,
} from './ProductStudioContext.types';

type ProductStudioStateValueArgs = {
  accepting: boolean;
  activeRunId: string | null;
  auditEntries: ProductStudioAuditEntry[];
  auditError: string | null;
  auditLoading: boolean;
  blockSendForSequenceReadiness: boolean;
  canCompareWithSource: boolean;
  convertingLinkImageIndex: number | null;
  deletingVariantId: string | null;
  imageSlotPreviews: ProductImageSlotPreview[];
  isStudioLoading: boolean;
  openingInImageStudio: boolean;
  pendingExpectedOutputs: number;
  pendingVariantPlaceholderCount: number;
  rotatingDirection: 'left' | 'right' | null;
  runStatus: ProductStudioRunStatus | null;
  selectedImageIndex: number | null;
  selectedSourcePreview: ProductImageSlotPreview | null;
  selectedVariant: ProductStudioVariantsResponse['variants'][number] | null;
  selectedVariantSlotId: string | null;
  sending: boolean;
  sequenceReadinessMessage: string | null;
  sourceImageSrc: string | null;
  studioActionError: string | null;
  studioProjectId: string | null;
  studioProjectOptions: ProductStudioStateContextValue['studioProjectOptions'];
  variantImageSrc: string | null;
  variants: ProductStudioVariantsResponse['variants'];
  variantsData: ProductStudioVariantsResponse | null;
  variantsLoading: boolean;
};

const buildProductStudioStateValue = (
  args: ProductStudioStateValueArgs
): ProductStudioStateContextValue => ({
  studioProjectId: args.studioProjectId,
  studioProjectOptions: args.studioProjectOptions,
  isStudioLoading: args.isStudioLoading,
  imageSlotPreviews: args.imageSlotPreviews,
  selectedImageIndex: args.selectedImageIndex,
  selectedSourcePreview: args.selectedSourcePreview,
  variants: args.variants,
  variantsLoading: args.variantsLoading,
  selectedVariantSlotId: args.selectedVariantSlotId,
  selectedVariant: args.selectedVariant,
  pendingExpectedOutputs: args.pendingExpectedOutputs,
  pendingVariantPlaceholderCount: args.pendingVariantPlaceholderCount,
  sourceImageSrc: args.sourceImageSrc,
  variantImageSrc: args.variantImageSrc,
  canCompareWithSource: args.canCompareWithSource,
  convertingLinkImageIndex: args.convertingLinkImageIndex,
  variantsData: args.variantsData,
  sequenceReadinessMessage: args.sequenceReadinessMessage,
  blockSendForSequenceReadiness: args.blockSendForSequenceReadiness,
  auditEntries: args.auditEntries,
  auditLoading: args.auditLoading,
  auditError: args.auditError,
  activeRunId: args.activeRunId,
  runStatus: args.runStatus,
  sending: args.sending,
  accepting: args.accepting,
  openingInImageStudio: args.openingInImageStudio,
  rotatingDirection: args.rotatingDirection,
  deletingVariantId: args.deletingVariantId,
  studioActionError: args.studioActionError,
});

export const useProductStudioStateValue = (
  args: ProductStudioStateValueArgs
): ProductStudioStateContextValue =>
  useMemo(() => buildProductStudioStateValue(args), [
    args.accepting, args.activeRunId, args.auditEntries, args.auditError, args.auditLoading,
    args.blockSendForSequenceReadiness, args.canCompareWithSource,
    args.convertingLinkImageIndex, args.deletingVariantId,
    args.imageSlotPreviews, args.isStudioLoading, args.openingInImageStudio,
    args.pendingExpectedOutputs, args.pendingVariantPlaceholderCount, args.rotatingDirection, args.runStatus,
    args.selectedImageIndex, args.selectedSourcePreview, args.selectedVariant,
    args.selectedVariantSlotId, args.sending, args.sequenceReadinessMessage, args.sourceImageSrc,
    args.studioActionError, args.studioProjectId, args.studioProjectOptions,
    args.variantImageSrc, args.variants, args.variantsData, args.variantsLoading,
  ]);

type ProductStudioActionsValueArgs = ProductStudioActionHandlers & {
  refreshAudit: () => Promise<void>;
  refreshVariants: () => Promise<ProductStudioVariantsResponse | null>;
  setSelectedImageIndex: (index: number | null) => void;
  setSelectedVariantSlotId: (id: string | null) => void;
  setStudioProjectId: (id: string | null) => void;
};

export const useProductStudioActionsValue = ({
  handleAcceptVariant,
  handleConvertLinkImageToFile,
  handleDeleteVariant,
  handleOpenInImageStudio,
  handleRotateImageSlot,
  handleSendToStudio,
  refreshAudit,
  refreshVariants,
  setSelectedImageIndex,
  setSelectedVariantSlotId,
  setStudioProjectId,
}: ProductStudioActionsValueArgs): ProductStudioActionsContextValue =>
  useMemo(
    () => ({
      setStudioProjectId,
      setSelectedImageIndex,
      setSelectedVariantSlotId,
      refreshAudit,
      handleSendToStudio,
      handleOpenInImageStudio,
      handleAcceptVariant,
      handleConvertLinkImageToFile,
      handleDeleteVariant,
      handleRotateImageSlot,
      refreshVariants,
    }),
    [
      handleAcceptVariant,
      handleConvertLinkImageToFile,
      handleDeleteVariant,
      handleOpenInImageStudio,
      handleRotateImageSlot,
      handleSendToStudio,
      refreshAudit,
      refreshVariants,
      setSelectedImageIndex,
      setSelectedVariantSlotId,
      setStudioProjectId,
    ]
  );
