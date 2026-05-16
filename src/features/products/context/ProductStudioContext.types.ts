import type { Dispatch, SetStateAction } from 'react';

import type { ImageStudioSlotDto as ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { ProductStudioAuditEntry, ProductStudioRunStatus, ProductStudioVariantsResponse } from '@/shared/contracts/products/studio';
import type { ContextRegistryPageSource } from '@/shared/lib/ai-context-registry/page-context-shared';

export type ProductImageSlotPreview = {
  index: number;
  label: string;
  sourceType: 'file' | 'link' | 'base64';
  src: string;
};

export interface ProductStudioStateContextValue {
  studioProjectId: string | null;
  studioProjectOptions: Array<LabeledOptionDto<string>>;
  isStudioLoading: boolean;
  imageSlotPreviews: ProductImageSlotPreview[];
  selectedImageIndex: number | null;
  selectedSourcePreview: ProductImageSlotPreview | null;
  variants: ImageStudioSlotRecord[];
  variantsLoading: boolean;
  selectedVariantSlotId: string | null;
  selectedVariant: ImageStudioSlotRecord | null;
  pendingExpectedOutputs: number;
  pendingVariantPlaceholderCount: number;
  sourceImageSrc: string | null;
  variantImageSrc: string | null;
  canCompareWithSource: boolean;
  variantsData: ProductStudioVariantsResponse | null;
  sequenceReadinessMessage: string | null;
  blockSendForSequenceReadiness: boolean;
  auditEntries: ProductStudioAuditEntry[];
  auditLoading: boolean;
  auditError: string | null;
  activeRunId: string | null;
  runStatus: ProductStudioRunStatus | null;
  sending: boolean;
  accepting: boolean;
  openingInImageStudio: boolean;
  rotatingDirection: 'left' | 'right' | null;
  convertingLinkImageIndex: number | null;
  deletingVariantId: string | null;
  studioActionError: string | null;
}

export interface ProductStudioActionsContextValue {
  setStudioProjectId: (id: string | null) => void;
  setSelectedImageIndex: (index: number | null) => void;
  setSelectedVariantSlotId: (id: string | null) => void;
  refreshAudit: () => Promise<void>;
  handleSendToStudio: () => Promise<void>;
  handleOpenInImageStudio: () => Promise<void>;
  handleAcceptVariant: () => Promise<void>;
  handleDeleteVariant: (slot: ImageStudioSlotRecord) => Promise<void>;
  handleRotateImageSlot: (direction: 'left' | 'right') => Promise<void>;
  handleConvertLinkImageToFile: (index: number) => Promise<void>;
  refreshVariants: () => Promise<ProductStudioVariantsResponse | null>;
}

export type ProductStudioRunState = {
  activeRunBaselineVariantIds: string[];
  activeRunId: string | null;
  pendingExpectedOutputs: number;
  runStatus: ProductStudioRunStatus | null;
  setActiveRunBaselineVariantIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  setActiveRunId: (id: string | null | ((prev: string | null) => string | null)) => void;
  setPendingExpectedOutputs: (count: number | ((prev: number) => number)) => void;
  setRunStatus: (status: ProductStudioRunStatus | null | ((prev: ProductStudioRunStatus | null) => ProductStudioRunStatus | null)) => void;
};

export type ProductStudioBaseState = {
  imageLinks: string[];
  imageSlotPreviews: ProductImageSlotPreview[];
  product: ProductWithImages | null | undefined;
  productId: string | null;
  productImagesExternalBaseUrl: string;
  refreshImagesFromProduct: (savedProduct: ProductWithImages) => void;
  selectedImageIndex: number | null;
  setSelectedImageIndex: (index: number | null | ((prev: number | null) => number | null)) => void;
  setStudioProjectId: (id: string | null) => void;
  studioConfigLoading: boolean;
  studioProjectId: string | null;
  studioProjectOptions: Array<LabeledOptionDto<string>>;
  studioProjectsLoading: boolean;
};

export type ProductStudioLoadedState = {
  auditState: {
    auditEntries: ProductStudioAuditEntry[];
    auditError: string | null;
    auditLoading: boolean;
    refreshAudit: () => Promise<void>;
  };
  derivedState: {
    variants: ImageStudioSlotRecord[];
    selectedVariant: ImageStudioSlotRecord | null;
    selectedSourcePreview: ProductImageSlotPreview | null;
    sourceImageSrc: string | null;
    variantImageSrc: string | null;
    canCompareWithSource: boolean;
    sequenceReadinessMessage: string | null;
    blockSendForSequenceReadiness: boolean;
    pendingVariantPlaceholderCount: number;
    registrySource: Omit<ContextRegistryPageSource, 'sourceId'> | null;
  };
  variantsState: {
    variantsData: ProductStudioVariantsResponse | null;
    variantsLoading: boolean;
    selectedVariantSlotId: string | null;
    studioActionError: string | null;
    refreshVariants: () => Promise<ProductStudioVariantsResponse | null>;
    setSelectedVariantSlotId: Dispatch<SetStateAction<string | null>>;
    setStudioActionError: Dispatch<SetStateAction<string | null>>;
  };
};

export type ProductStudioContextValue = ProductStudioStateContextValue &
  ProductStudioActionsContextValue;

export type { ProductStudioAuditEntry, ProductStudioRunStatus, ProductStudioVariantsResponse };
