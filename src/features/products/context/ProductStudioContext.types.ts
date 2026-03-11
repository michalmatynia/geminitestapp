import type { ImageStudioSlotDto as ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import type {
  ProductStudioAuditEntry,
  ProductStudioRunStatus,
  ProductStudioVariantsResponse,
} from '@/shared/contracts/products';

export type ProductImageSlotPreview = {
  index: number;
  label: string;
  src: string;
};

export interface ProductStudioStateContextValue {
  studioProjectId: string | null;
  studioProjectOptions: Array<{ value: string; label: string }>;
  isStudioLoading: boolean;
  imageSlotPreviews: ProductImageSlotPreview[];
  selectedImageIndex: number | null;
  selectedSourcePreview: ProductImageSlotPreview | null;
  variants: ImageStudioSlotRecord[];
  variantsLoading: boolean;
  selectedVariantSlotId: string | null;
  selectedVariant: ImageStudioSlotRecord | null;
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
  refreshVariants: () => Promise<ProductStudioVariantsResponse | null>;
}

export type ProductStudioContextValue = ProductStudioStateContextValue &
  ProductStudioActionsContextValue;

export type { ProductStudioAuditEntry, ProductStudioRunStatus, ProductStudioVariantsResponse };
