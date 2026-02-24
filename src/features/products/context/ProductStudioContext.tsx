'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';
import { api } from '@/shared/lib/api-client';

import { 
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL, 
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
  PRODUCT_STUDIO_DEFAULT_PROJECT_SETTING_KEY
} from '../../constants';
import { useProductFormCore } from '../ProductFormCoreContext';
import { useProductFormImages } from '../ProductFormImageContext';
import { useProductFormStudio } from '../ProductFormStudioContext';
import { resolveProductImageUrl } from '../../utils/image-routing';
import { studioKeys, useStudioProjects } from '@/features/ai/image-studio/hooks/useImageStudioQueries';
import { getImageStudioSlotImageSrc } from '@/features/ai/image-studio/utils/image-src';
import { invalidateProductsAndCounts } from '@/features/products/hooks/productCache';

import type { ImageStudioSlotDto as ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import type { 
  ProductStudioExecutionRoute, 
  ProductStudioSequenceGenerationMode, 
  ProductStudioSequenceReadiness,
  ProductWithImagesDto as ProductWithImages
} from '@/shared/contracts/products';

// --- Types ---

export type ProductStudioSequenceStepPlanEntry = {
  index: number;
  stepId: string;
  stepType: 'crop_center' | 'mask' | 'generate' | 'regenerate' | 'upscale';
  inputSource: 'previous' | 'source';
  resolvedInput: 'previous' | 'source';
  producesOutput: boolean;
};

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

export type ProductImageSlotPreview = {
  index: number;
  label: string;
  src: string;
};

interface ProductStudioContextValue {
  // Global / Setting Data
  studioProjectId: string | null;
  setStudioProjectId: (id: string | null) => void;
  studioProjectOptions: Array<{ value: string; label: string }>;
  isStudioLoading: boolean;
  
  // Image Selection
  imageSlotPreviews: ProductImageSlotPreview[];
  selectedImageIndex: number | null;
  setSelectedImageIndex: (index: number | null) => void;
  selectedSourcePreview: ProductImageSlotPreview | null;
  
  // Variants Data
  variants: ImageStudioSlotRecord[];
  variantsLoading: boolean;
  selectedVariantSlotId: string | null;
  setSelectedVariantSlotId: (id: string | null) => void;
  selectedVariant: ImageStudioSlotRecord | null;
  pendingVariantPlaceholderCount: number;
  
  // Preview State
  sourceImageSrc: string | null;
  variantImageSrc: string | null;
  canCompareWithSource: boolean;
  singleVariantView: 'variant' | 'source';
  setSingleVariantView: (view: 'variant' | 'source') => void;
  splitVariantView: boolean;
  setSplitVariantView: (view: boolean) => void;
  leftSplitZoom: number;
  setLeftSplitZoom: (zoom: number | ((prev: number) => number)) => void;
  rightSplitZoom: number;
  setRightSplitZoom: (zoom: number | ((prev: number) => number)) => void;
  
  // Sequencing & Diagnostics
  variantsData: ProductStudioVariantsResponse | null;
  sequenceReadinessMessage: string | null;
  blockSendForSequenceReadiness: boolean;
  
  // Audit
  auditEntries: ProductStudioAuditEntry[];
  auditLoading: boolean;
  auditError: string | null;
  refreshAudit: () => Promise<void>;
  
  // Run Status
  activeRunId: string | null;
  runStatus: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | null;
  
  // Actions
  handleSendToStudio: () => Promise<void>;
  handleOpenInImageStudio: () => Promise<void>;
  handleAcceptVariant: () => Promise<void>;
  handleDeleteVariant: (slot: ImageStudioSlotRecord) => Promise<void>;
  handleRotateImageSlot: (direction: 'left' | 'right') => Promise<void>;
  refreshVariants: () => Promise<ProductStudioVariantsResponse | null>;
  
  // Flags
  sending: boolean;
  accepting: boolean;
  openingInImageStudio: boolean;
  rotatingDirection: 'left' | 'right' | null;
  deletingVariantId: string | null;
  studioActionError: string | null;
}

const ProductStudioContext = createContext<ProductStudioContextValue | null>(null);

const SPLIT_ZOOM_RESET = 1;
const STUDIO_PROJECT_NOT_CONNECTED = '__product_studio_not_connected__';

export function ProductStudioProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const {
    studioProjectId,
    setStudioProjectId,
    studioConfigLoading,
    studioConfigSaving,
  } = useProductFormStudio();

  const { product } = useProductFormCore();
  const { imageSlots, refreshImagesFromProduct } = useProductFormImages();
  
  const studioProjectsQuery = useStudioProjects();
  const studioProjectIds = useMemo(
    () => (studioProjectsQuery.data ?? []).map(p => p.id.trim()).filter(id => id.length > 0),
    [studioProjectsQuery.data]
  );
  
  const studioProjectOptions = useMemo(
    () => [
      { value: STUDIO_PROJECT_NOT_CONNECTED, label: 'Not Connected' },
      ...studioProjectIds.map(id => ({ value: id, label: id })),
    ],
    [studioProjectIds]
  );

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const settingsStore = useSettingsStore();
  
  const configuredDefaultStudioProjectId = settingsStore.get(PRODUCT_STUDIO_DEFAULT_PROJECT_SETTING_KEY)?.trim() ?? '';
  const productImagesExternalBaseUrl = settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ?? DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;

  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [variantsData, setVariantsData] = useState<ProductStudioVariantsResponse | null>(null);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [studioActionError, setStudioActionError] = useState<string | null>(null);
  const [selectedVariantSlotId, setSelectedVariantSlotId] = useState<string | null>(null);
  const [openingInImageStudio, setOpeningInImageStudio] = useState(false);
  const [sending, setSending] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [rotatingDirection, setRotatingDirection] = useState<'left' | 'right' | null>(null);
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(null);
  const [auditEntries, setAuditEntries] = useState<ProductStudioAuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeRunKind, setActiveRunKind] = useState<'generation' | 'sequence' | null>(null);
  const [activeRunBaselineVariantIds, setActiveRunBaselineVariantIds] = useState<string[]>([]);
  const [pendingExpectedOutputs, setPendingExpectedOutputs] = useState<number>(0);
  const [runStatus, setRunStatus] = useState<'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | null>(null);
  const [singleVariantView, setSingleVariantView] = useState<'variant' | 'source'>('variant');
  const [splitVariantView, setSplitVariantView] = useState(false);
  const [leftSplitZoom, setLeftSplitZoom] = useState(SPLIT_ZOOM_RESET);
  const [rightSplitZoom, setRightSplitZoom] = useState(SPLIT_ZOOM_RESET);

  const imageSlotPreviews = useMemo((): ProductImageSlotPreview[] => {
    return imageSlots
      .map((slot, index): ProductImageSlotPreview | null => {
        if (!slot) return null;
        const src =
          slot.type === 'file'
            ? slot.previewUrl
            : resolveProductImageUrl(slot.data.filepath, productImagesExternalBaseUrl) ??
              slot.previewUrl;
        if (!src) return null;
        return { index, label: `Slot ${index + 1}`, src };
      })
      .filter((entry): entry is ProductImageSlotPreview => Boolean(entry));
  }, [imageSlots, productImagesExternalBaseUrl]);

  // Initial selection
  useEffect(() => {
    if (imageSlotPreviews.length === 0) {
      setSelectedImageIndex(null);
      return;
    }
    if (selectedImageIndex !== null && imageSlotPreviews.some(p => p.index === selectedImageIndex)) {
      return;
    }
    setSelectedImageIndex(imageSlotPreviews[0]?.index ?? null);
  }, [imageSlotPreviews, selectedImageIndex]);

  // Handle defaults and hydration
  useEffect(() => {
    if (studioProjectsQuery.isLoading || studioConfigLoading || studioConfigSaving) return;
    const current = studioProjectId?.trim() ?? '';
    if (current.length > 0 && studioProjectIds.includes(current)) return;
    const fallback = configuredDefaultStudioProjectId.length > 0 && studioProjectIds.includes(configuredDefaultStudioProjectId)
      ? configuredDefaultStudioProjectId : null;
    if (fallback === current) return;
    setStudioProjectId(fallback);
  }, [configuredDefaultStudioProjectId, studioConfigLoading, studioConfigSaving, studioProjectId, studioProjectIds, studioProjectsQuery.isLoading, setStudioProjectId]);

  const refreshVariants = useCallback(async (): Promise<ProductStudioVariantsResponse | null> => {
    if (!product?.id || !studioProjectId || selectedImageIndex === null) {
      setVariantsData(null);
      setSelectedVariantSlotId(null);
      return null;
    }
    setVariantsLoading(true);
    setStudioActionError(null);
    try {
      const response = await api.get<ProductStudioVariantsResponse>(
        `/api/products/${encodeURIComponent(product.id)}/studio/variants`,
        { params: { imageSlotIndex: selectedImageIndex, projectId: studioProjectId }, cache: 'no-store' }
      );
      setVariantsData(response);
      setSelectedVariantSlotId(current => {
        if (current && response.variants.some(s => s.id === current)) return current;
        return response.variants[0]?.id ?? null;
      });
      return response;
    } catch (error) {
      setStudioActionError(error instanceof Error ? error.message : 'Failed to load Studio variants.');
      return null;
    } finally {
      setVariantsLoading(false);
    }
  }, [product?.id, selectedImageIndex, studioProjectId]);

  useEffect(() => { void refreshVariants(); }, [refreshVariants]);

  const refreshAudit = useCallback(async (): Promise<void> => {
    if (!product?.id || !studioProjectId || selectedImageIndex === null) {
      setAuditEntries([]);
      setAuditError(null);
      return;
    }
    setAuditLoading(true);
    setAuditError(null);
    try {
      const response = await api.get<{ entries: ProductStudioAuditEntry[] }>(
        `/api/products/${encodeURIComponent(product.id)}/studio/audit`,
        { params: { imageSlotIndex: selectedImageIndex, limit: 40 }, cache: 'no-store', logError: false }
      );
      setAuditEntries(Array.isArray(response.entries) ? response.entries : []);
    } catch (error) {
      setAuditError(error instanceof Error ? error.message : 'Failed to load history.');
    } finally {
      setAuditLoading(false);
    }
  }, [product?.id, selectedImageIndex, studioProjectId]);

  useEffect(() => { void refreshAudit(); }, [refreshAudit]);

  const handleSendToStudio = async () => {
    if (!product?.id || !studioProjectId || selectedImageIndex === null) return;
    setSending(true);
    setStudioActionError(null);
    const baselineIds = (variantsData?.variants ?? []).map(s => s.id).filter(id => !!id);
    try {
      const result = await api.post<any>(`/api/products/${encodeURIComponent(product.id)}/studio/send`, {
        imageSlotIndex: selectedImageIndex,
        projectId: studioProjectId,
      });
      setActiveRunId(result.runId);
      setActiveRunKind(result.runKind);
      setActiveRunBaselineVariantIds(baselineIds);
      setRunStatus(result.runStatus);
      setPendingExpectedOutputs(Math.max(0, Math.floor(result.expectedOutputs ?? 0)));
      toast('Image sent to Studio.', { variant: 'success' });
      await queryClient.invalidateQueries({ queryKey: studioKeys.slots(studioProjectId) });
      await refreshVariants();
      await refreshAudit();
    } catch (error) {
      setStudioActionError(error instanceof Error ? error.message : 'Failed to send.');
    } finally {
      setSending(false);
    }
  };

  const handleOpenInImageStudio = async () => {
    if (!product?.id || !studioProjectId || selectedImageIndex === null) return;
    setOpeningInImageStudio(true);
    try {
      const response = await api.post<any>(`/api/products/${encodeURIComponent(product.id)}/studio/link`, {
        imageSlotIndex: selectedImageIndex,
        projectId: studioProjectId,
      });
      const sourceSlotId = response.sourceSlot?.id;
      if (!sourceSlotId) throw new Error('Source slot not found.');
      window.location.href = `/admin/image-studio?projectId=${response.projectId}&slotId=${sourceSlotId}`;
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to open.', { variant: 'error' });
    } finally {
      setOpeningInImageStudio(false);
    }
  };

  const handleAcceptVariant = async () => {
    if (!product?.id || !studioProjectId || !selectedVariantSlotId) return;
    setAccepting(true);
    try {
      const response = await api.post<any>(`/api/products/${encodeURIComponent(product.id)}/studio/accept`, {
        imageSlotIndex: selectedImageIndex,
        generationSlotId: selectedVariantSlotId,
        projectId: studioProjectId,
      });
      refreshImagesFromProduct(response.product);
      await invalidateProductsAndCounts(queryClient);
      toast('Variant accepted.', { variant: 'success' });
      await refreshVariants();
      await refreshAudit();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to accept.', { variant: 'error' });
    } finally {
      setAccepting(false);
    }
  };

  const handleDeleteVariant = async (slot: ImageStudioSlotRecord) => {
    if (!studioProjectId || !slot.id) return;
    setDeletingVariantId(slot.id);
    try {
      await api.post(`/api/image-studio/projects/${encodeURIComponent(studioProjectId)}/variants/delete`, {
        slotId: slot.id,
        sourceSlotId: variantsData?.sourceSlotId,
      });
      toast('Variant deleted.', { variant: 'success' });
      await refreshVariants();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to delete.', { variant: 'error' });
    } finally {
      setDeletingVariantId(null);
    }
  };

  const handleRotateImageSlot = async (direction: 'left' | 'right') => {
    if (!product?.id || selectedImageIndex === null) return;
    setRotatingDirection(direction);
    try {
      const response = await api.post<any>(`/api/products/${encodeURIComponent(product.id)}/studio/rotate`, {
        imageSlotIndex: selectedImageIndex,
        direction,
      });
      refreshImagesFromProduct(response.product);
      await invalidateProductsAndCounts(queryClient);
      await refreshVariants();
      toast('Image rotated.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to rotate.', { variant: 'error' });
    } finally {
      setRotatingDirection(null);
    }
  };

  const variants = variantsData?.variants ?? [];
  const selectedVariant = variants.find(s => s.id === selectedVariantSlotId) ?? variants[0] ?? null;
  const selectedSourcePreview = useMemo(() => imageSlotPreviews.find(p => p.index === selectedImageIndex) ?? null, [imageSlotPreviews, selectedImageIndex]);
  const sourceImageSrc = getImageStudioSlotImageSrc(variantsData?.sourceSlot, productImagesExternalBaseUrl) ?? selectedSourcePreview?.src ?? null;
  const variantImageSrc = getImageStudioSlotImageSrc(selectedVariant, productImagesExternalBaseUrl);
  const canCompareWithSource = Boolean(sourceImageSrc && variantImageSrc);
  
  const sequenceReadiness = variantsData?.sequenceReadiness ?? null;
  const sequenceReadinessMessage = sequenceReadiness && !sequenceReadiness.ready ? sequenceReadiness.message ?? 'Not ready.' : null;
  const blockSendForSequenceReadiness = Boolean(sequenceReadinessMessage);

  const activeRunBaselineVariantIdSet = useMemo(() => new Set(activeRunBaselineVariantIds), [activeRunBaselineVariantIds]);
  const variantsProducedForActiveRun = useMemo(() => variants.filter(s => !activeRunBaselineVariantIdSet.has(s.id)).length, [activeRunBaselineVariantIdSet, variants]);
  const pendingVariantPlaceholderCount = activeRunId && (runStatus === 'queued' || runStatus === 'running')
    ? Math.max(0, pendingExpectedOutputs - variantsProducedForActiveRun) : 0;

  const contextValue: ProductStudioContextValue = {
    studioProjectId,
    setStudioProjectId,
    studioProjectOptions,
    isStudioLoading: studioProjectsQuery.isLoading || studioConfigLoading,
    imageSlotPreviews,
    selectedImageIndex,
    setSelectedImageIndex,
    selectedSourcePreview,
    variants,
    variantsLoading,
    selectedVariantSlotId,
    setSelectedVariantSlotId,
    selectedVariant,
    pendingVariantPlaceholderCount,
    sourceImageSrc,
    variantImageSrc,
    canCompareWithSource,
    singleVariantView,
    setSingleVariantView,
    splitVariantView,
    setSplitVariantView,
    leftSplitZoom,
    setLeftSplitZoom,
    rightSplitZoom,
    setRightSplitZoom,
    variantsData,
    sequenceReadinessMessage,
    blockSendForSequenceReadiness,
    auditEntries,
    auditLoading,
    auditError,
    refreshAudit,
    activeRunId,
    runStatus,
    handleSendToStudio,
    handleOpenInImageStudio,
    handleAcceptVariant,
    handleDeleteVariant,
    handleRotateImageSlot,
    refreshVariants,
    sending,
    accepting,
    openingInImageStudio,
    rotatingDirection,
    deletingVariantId,
    studioActionError,
  };

  return (
    <ProductStudioContext.Provider value={contextValue}>
      {children}
    </ProductStudioContext.Provider>
  );
}

export function useProductStudioContext(): ProductStudioContextValue {
  const context = useContext(ProductStudioContext);
  if (!context) {
    throw new Error('useProductStudioContext must be used within ProductStudioProvider');
  }
  return context;
}
