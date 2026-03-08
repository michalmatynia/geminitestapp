import type { ImageStudioSlotDto as ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import type {
  ProductStudioExecutionRoute,
  ProductStudioSequenceGenerationMode,
  ProductStudioSequenceReadiness,
  ProductStudioSequenceStepPlanEntry,
} from '@/shared/contracts/products';

export type ProductStudioVariantsResponse = {
  sequencing: {
    persistedEnabled: boolean;
    enabled: boolean;
    runViaSequence: boolean;
    sequenceStepCount: number;
    snapshotSavedAt: string | null;
    snapshotMatchesCurrent: boolean;
    needsSaveDefaults: boolean;
    needsSaveDefaultsReason: string | null;
  };
  sequencingDiagnostics: {
    projectId: string | null;
    projectSettingsKey: string | null;
    selectedSettingsKey: string | null;
    selectedScope: 'project' | 'global' | 'default';
    hasProjectSettings: boolean;
    hasGlobalSettings: boolean;
    projectSequencingEnabled: boolean;
    globalSequencingEnabled: boolean;
    selectedSequencingEnabled: boolean;
    selectedSnapshotHash: string | null;
    selectedSnapshotSavedAt: string | null;
    selectedSnapshotStepCount: number;
    selectedSnapshotModelId: string | null;
  };
  sequenceReadiness: ProductStudioSequenceReadiness;
  sequenceStepPlan: ProductStudioSequenceStepPlanEntry[];
  sequenceGenerationMode: ProductStudioSequenceGenerationMode;
  projectId: string | null;
  sourceSlotId: string | null;
  sourceSlot: ImageStudioSlotRecord | null;
  variants: ImageStudioSlotRecord[];
};

export type ProductStudioAuditEntry = {
  id: string;
  createdAt: string;
  status: 'completed' | 'failed';
  imageSlotIndex: number;
  executionRoute: ProductStudioExecutionRoute;
  requestedSequenceMode: ProductStudioSequenceGenerationMode;
  resolvedSequenceMode: ProductStudioSequenceGenerationMode;
  runKind: 'generation' | 'sequence';
  runId: string | null;
  sequenceRunId: string | null;
  dispatchMode: 'queued' | 'inline' | null;
  fallbackReason: string | null;
  warnings: string[];
  settingsScope: 'project' | 'global' | 'default';
  settingsKey: string | null;
  projectSettingsKey: string | null;
  settingsScopeValid: boolean;
  sequenceSnapshotHash: string | null;
  stepOrderUsed: string[];
  resolvedCropRect: { x: number; y: number; width: number; height: number } | null;
  sourceImageSize: { width: number; height: number } | null;
  timings: {
    importMs: number | null;
    sourceSlotUpsertMs: number | null;
    routeDecisionMs: number | null;
    dispatchMs: number | null;
    totalMs: number;
  };
  errorMessage: string | null;
};

export type ProductStudioRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export type ProductImageSlotPreview = {
  index: number;
  label: string;
  src: string;
};

export interface ProductStudioContextValue {
  studioProjectId: string | null;
  setStudioProjectId: (id: string | null) => void;
  studioProjectOptions: Array<{ value: string; label: string }>;
  isStudioLoading: boolean;
  imageSlotPreviews: ProductImageSlotPreview[];
  selectedImageIndex: number | null;
  setSelectedImageIndex: (index: number | null) => void;
  selectedSourcePreview: ProductImageSlotPreview | null;
  variants: ImageStudioSlotRecord[];
  variantsLoading: boolean;
  selectedVariantSlotId: string | null;
  setSelectedVariantSlotId: (id: string | null) => void;
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
  refreshAudit: () => Promise<void>;
  activeRunId: string | null;
  runStatus: ProductStudioRunStatus | null;
  handleSendToStudio: () => Promise<void>;
  handleOpenInImageStudio: () => Promise<void>;
  handleAcceptVariant: () => Promise<void>;
  handleDeleteVariant: (slot: ImageStudioSlotRecord) => Promise<void>;
  handleRotateImageSlot: (direction: 'left' | 'right') => Promise<void>;
  refreshVariants: () => Promise<ProductStudioVariantsResponse | null>;
  sending: boolean;
  accepting: boolean;
  openingInImageStudio: boolean;
  rotatingDirection: 'left' | 'right' | null;
  deletingVariantId: string | null;
  studioActionError: string | null;
}
