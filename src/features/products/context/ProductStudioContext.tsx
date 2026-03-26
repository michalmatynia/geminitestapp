'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';

import { useProductSettings } from '@/features/products/hooks/useProductSettings';
import type { ImageStudioSlotDto as ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import {
  productStudioAuditResponseSchema,
  productStudioLinkResponseSchema,
  productStudioVariantsResponseSchema,
} from '@/shared/contracts/products';
import { internalError } from '@/shared/errors/app-error';
import {
  useOptionalContextRegistryPageEnvelope,
  useRegisterContextRegistryPageSource,
} from '@/shared/lib/ai-context-registry/page-context';
import { api } from '@/shared/lib/api-client';
import { useStudioProjects } from '@/features/ai/image-studio/public';
import { useToast } from '@/shared/ui';
import { resolveProductImageUrl } from '@/shared/utils/image-routing';

import { useProductFormCore } from './ProductFormCoreContext';
import { useProductFormImages } from './ProductFormImageContext';
import { useProductFormStudio } from './ProductFormStudioContext';
import { useProductStudioDerivedState } from './ProductStudioContext.derived';
import {
  useSendToStudioMutation,
  useAcceptVariantMutation,
  useRotateImageSlotMutation,
} from '../hooks/useProductStudioMutations';

import type {
  ProductImageSlotPreview,
  ProductStudioAuditEntry,
  ProductStudioActionsContextValue,
  ProductStudioContextValue,
  ProductStudioRunStatus,
  ProductStudioStateContextValue,
  ProductStudioVariantsResponse,
} from './ProductStudioContext.types';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export type {
  ProductImageSlotPreview,
  ProductStudioAuditEntry,
  ProductStudioActionsContextValue,
  ProductStudioContextValue,
  ProductStudioRunStatus,
  ProductStudioStateContextValue,
  ProductStudioVariantsResponse,
} from './ProductStudioContext.types';

const ProductStudioStateContext = createContext<ProductStudioStateContextValue | null>(null);
const ProductStudioActionsContext = createContext<ProductStudioActionsContextValue | null>(null);

const STUDIO_PROJECT_NOT_CONNECTED = '__product_studio_not_connected__';
const PRODUCT_STUDIO_RUN_STATUSES: ProductStudioRunStatus[] = [
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
];

const isProductStudioRunStatus = (value: unknown): value is ProductStudioRunStatus =>
  typeof value === 'string' &&
  PRODUCT_STUDIO_RUN_STATUSES.includes(value as ProductStudioRunStatus);

export function ProductStudioProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { studioProjectId, setStudioProjectId, studioConfigLoading, studioConfigSaving } =
    useProductFormStudio();

  const core = useProductFormCore();
  const product = core.product;

  const images = useProductFormImages();
  const imageSlots = images.imageSlots;
  const refreshImagesFromProduct = images.refreshImagesFromProduct;

  const studioProjectsQuery = useStudioProjects();
  const studioProjectIds = useMemo(
    () => (studioProjectsQuery.data ?? []).map((p) => p.id.trim()).filter((id) => id.length > 0),
    [studioProjectsQuery.data]
  );

  const studioProjectOptions = useMemo(
    () => [
      { value: STUDIO_PROJECT_NOT_CONNECTED, label: 'Not Connected' },
      ...studioProjectIds.map((id) => ({ value: id, label: id })),
    ],
    [studioProjectIds]
  );

  const { toast } = useToast();
  const { defaultProjectId, getImageExternalBaseUrl } = useProductSettings();
  const contextRegistry = useOptionalContextRegistryPageEnvelope();
  const productImagesExternalBaseUrl = getImageExternalBaseUrl();

  const sendToStudioMutation = useSendToStudioMutation();
  const acceptVariantMutation = useAcceptVariantMutation();
  const rotateImageSlotMutation = useRotateImageSlotMutation();

  const configuredDefaultStudioProjectId = defaultProjectId;

  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [variantsData, setVariantsData] = useState<ProductStudioVariantsResponse | null>(null);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [studioActionError, setStudioActionError] = useState<string | null>(null);
  const [selectedVariantSlotId, setSelectedVariantSlotId] = useState<string | null>(null);
  const [openingInImageStudio, setOpeningInImageStudio] = useState(false);
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(null);
  const [auditEntries, setAuditEntries] = useState<ProductStudioAuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<ProductStudioRunStatus | null>(null);
  const [activeRunBaselineVariantIds, setActiveRunBaselineVariantIds] = useState<string[]>([]);
  const [pendingExpectedOutputs, setPendingExpectedOutputs] = useState<number>(0);

  const imageSlotPreviews = useMemo((): ProductImageSlotPreview[] => {
    return (imageSlots || [])
      .map((slot, index): ProductImageSlotPreview | null => {
        if (!slot) return null;
        const src =
          slot.type === 'file'
            ? slot.previewUrl
            : (resolveProductImageUrl(slot.data.filepath, productImagesExternalBaseUrl) ??
              slot.previewUrl);
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
    if (
      selectedImageIndex !== null &&
      imageSlotPreviews.some((p) => p.index === selectedImageIndex)
    ) {
      return;
    }
    setSelectedImageIndex(imageSlotPreviews[0]?.index ?? null);
  }, [imageSlotPreviews, selectedImageIndex]);

  // Handle defaults and hydration
  useEffect(() => {
    if (studioProjectsQuery.isLoading || studioConfigLoading || studioConfigSaving) return;
    const current = studioProjectId?.trim() ?? '';
    if (current.length > 0 && studioProjectIds.includes(current)) return;
    const fallback =
      configuredDefaultStudioProjectId.length > 0 &&
      studioProjectIds.includes(configuredDefaultStudioProjectId)
        ? configuredDefaultStudioProjectId
        : null;
    if (fallback === current) return;
    setStudioProjectId(fallback);
  }, [
    configuredDefaultStudioProjectId,
    studioConfigLoading,
    studioConfigSaving,
    studioProjectId,
    studioProjectIds,
    studioProjectsQuery.isLoading,
    setStudioProjectId,
  ]);

  const refreshVariants = useCallback(async (): Promise<ProductStudioVariantsResponse | null> => {
    if (!product?.id || !studioProjectId || selectedImageIndex === null) {
      setVariantsData(null);
      setSelectedVariantSlotId(null);
      return null;
    }
    setVariantsLoading(true);
    setStudioActionError(null);
    try {
      const response = productStudioVariantsResponseSchema.parse(
        await api.get<unknown>(
          `/api/v2/products/${encodeURIComponent(product.id)}/studio/variants`,
          {
            params: { imageSlotIndex: selectedImageIndex, projectId: studioProjectId },
            cache: 'no-store',
          }
        )
      );
      setVariantsData(response);
      setSelectedVariantSlotId((current) => {
        if (current && response.variants.some((s) => s.id === current)) return current;
        return response.variants[0]?.id ?? null;
      });
      return response;
    } catch (error) {
      logClientError(error);
      setStudioActionError(
        error instanceof Error ? error.message : 'Failed to load Studio variants.'
      );
      return null;
    } finally {
      setVariantsLoading(false);
    }
  }, [product?.id, selectedImageIndex, studioProjectId]);

  useEffect(() => {
    void refreshVariants();
  }, [refreshVariants]);

  const refreshAudit = useCallback(async (): Promise<void> => {
    if (!product?.id || !studioProjectId || selectedImageIndex === null) {
      setAuditEntries([]);
      setAuditError(null);
      return;
    }
    setAuditLoading(true);
    setAuditError(null);
    try {
      const response = productStudioAuditResponseSchema.parse(
        await api.get<unknown>(`/api/v2/products/${encodeURIComponent(product.id)}/studio/audit`, {
          params: { imageSlotIndex: selectedImageIndex, limit: 40 },
          cache: 'no-store',
          logError: false,
        })
      );
      setAuditEntries(Array.isArray(response.entries) ? response.entries : []);
    } catch (error) {
      logClientError(error);
      setAuditError(error instanceof Error ? error.message : 'Failed to load history.');
    } finally {
      setAuditLoading(false);
    }
  }, [product?.id, selectedImageIndex, studioProjectId]);

  useEffect(() => {
    void refreshAudit();
  }, [refreshAudit]);

  const handleSendToStudio = async () => {
    if (!product?.id || !studioProjectId || selectedImageIndex === null) return;
    setStudioActionError(null);
    const baselineIds = (variantsData?.variants ?? [])
      .map((s) => s.id)
      .filter((id): id is string => !!id);
    try {
      const result = await sendToStudioMutation.mutateAsync({
        productId: product.id,
        imageSlotIndex: selectedImageIndex,
        projectId: studioProjectId,
        ...(contextRegistry ? { contextRegistry } : {}),
      });
      setActiveRunId(result.runId);
      setActiveRunBaselineVariantIds(baselineIds);
      setRunStatus(isProductStudioRunStatus(result.runStatus) ? result.runStatus : null);
      setPendingExpectedOutputs(Math.max(0, Math.floor(result.expectedOutputs ?? 0)));
      toast('Image sent to Studio.', { variant: 'success' });
      await refreshVariants();
      await refreshAudit();
    } catch (error) {
      logClientError(error);
      setStudioActionError(error instanceof Error ? error.message : 'Failed to send.');
    }
  };

  const handleOpenInImageStudio = async () => {
    if (!product?.id || !studioProjectId || selectedImageIndex === null) return;
    setOpeningInImageStudio(true);
    try {
      const response = productStudioLinkResponseSchema.parse(
        await api.post<unknown>(`/api/v2/products/${encodeURIComponent(product.id)}/studio/link`, {
          imageSlotIndex: selectedImageIndex,
          projectId: studioProjectId,
        })
      );
      const sourceSlotId = response.sourceSlot?.id;
      if (!sourceSlotId) throw internalError('Source slot not found.');
      window.location.href = `/admin/image-studio?projectId=${response.projectId}&slotId=${sourceSlotId}`;
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to open.', { variant: 'error' });
    } finally {
      setOpeningInImageStudio(false);
    }
  };

  const handleAcceptVariant = async () => {
    if (!product?.id || !studioProjectId || !selectedVariantSlotId) return;
    try {
      const response = await acceptVariantMutation.mutateAsync({
        productId: product.id,
        imageSlotIndex: selectedImageIndex!,
        generationSlotId: selectedVariantSlotId,
        projectId: studioProjectId,
      });
      refreshImagesFromProduct(response.product);
      toast('Variant accepted.', { variant: 'success' });
      await refreshVariants();
      await refreshAudit();
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to accept.', { variant: 'error' });
    }
  };

  const handleDeleteVariant = async (slot: ImageStudioSlotRecord) => {
    if (!studioProjectId || !slot.id) return;
    setDeletingVariantId(slot.id);
    try {
      await api.post(
        `/api/image-studio/projects/${encodeURIComponent(studioProjectId)}/variants/delete`,
        {
          slotId: slot.id,
          sourceSlotId: variantsData?.sourceSlotId,
        }
      );
      toast('Variant deleted.', { variant: 'success' });
      await refreshVariants();
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to delete.', { variant: 'error' });
    } finally {
      setDeletingVariantId(null);
    }
  };

  const handleRotateImageSlot = async (direction: 'left' | 'right') => {
    if (!product?.id || selectedImageIndex === null) return;
    try {
      const response = await rotateImageSlotMutation.mutateAsync({
        productId: product.id,
        imageSlotIndex: selectedImageIndex,
        direction,
      });
      refreshImagesFromProduct(response.product);
      await refreshVariants();
      toast('Image rotated.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to rotate.', { variant: 'error' });
    }
  };

  const {
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
  } = useProductStudioDerivedState({
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

  useRegisterContextRegistryPageSource('product-studio-workspace-state', registrySource);

  const stateValue = useMemo(
    (): ProductStudioStateContextValue => ({
      studioProjectId,
      studioProjectOptions,
      isStudioLoading: studioProjectsQuery.isLoading || studioConfigLoading,
      imageSlotPreviews,
      selectedImageIndex,
      selectedSourcePreview,
      variants,
      variantsLoading,
      selectedVariantSlotId,
      selectedVariant,
      pendingVariantPlaceholderCount,
      sourceImageSrc,
      variantImageSrc,
      canCompareWithSource,
      variantsData,
      sequenceReadinessMessage,
      blockSendForSequenceReadiness,
      auditEntries,
      auditLoading,
      auditError,
      activeRunId,
      runStatus,
      sending: sendToStudioMutation.isPending,
      accepting: acceptVariantMutation.isPending,
      openingInImageStudio,
      rotatingDirection: rotateImageSlotMutation.isPending
        ? (rotateImageSlotMutation.variables?.direction ?? null)
        : null,
      deletingVariantId,
      studioActionError,
    }),
    [
      acceptVariantMutation.isPending,
      activeRunId,
      auditEntries,
      auditError,
      auditLoading,
      blockSendForSequenceReadiness,
      canCompareWithSource,
      deletingVariantId,
      imageSlotPreviews,
      openingInImageStudio,
      pendingVariantPlaceholderCount,
      rotateImageSlotMutation.isPending,
      rotateImageSlotMutation.variables?.direction,
      runStatus,
      selectedImageIndex,
      selectedSourcePreview,
      selectedVariant,
      selectedVariantSlotId,
      sendToStudioMutation.isPending,
      sequenceReadinessMessage,
      sourceImageSrc,
      studioActionError,
      studioConfigLoading,
      studioProjectId,
      studioProjectOptions,
      studioProjectsQuery.isLoading,
      variantImageSrc,
      variants,
      variantsData,
      variantsLoading,
    ]
  );
  const actionsValue = useMemo(
    (): ProductStudioActionsContextValue => ({
      setStudioProjectId,
      setSelectedImageIndex,
      setSelectedVariantSlotId,
      refreshAudit,
      handleSendToStudio,
      handleOpenInImageStudio,
      handleAcceptVariant,
      handleDeleteVariant,
      handleRotateImageSlot,
      refreshVariants,
    }),
    [
      handleAcceptVariant,
      handleDeleteVariant,
      handleOpenInImageStudio,
      handleRotateImageSlot,
      handleSendToStudio,
      refreshAudit,
      refreshVariants,
      setStudioProjectId,
    ]
  );

  return (
    <ProductStudioActionsContext.Provider value={actionsValue}>
      <ProductStudioStateContext.Provider value={stateValue}>
        {children}
      </ProductStudioStateContext.Provider>
    </ProductStudioActionsContext.Provider>
  );
}

export function useProductStudioState(): ProductStudioStateContextValue {
  const context = useContext(ProductStudioStateContext);
  if (!context) {
    throw internalError('useProductStudioState must be used within ProductStudioProvider');
  }
  return context;
}

export function useProductStudioActions(): ProductStudioActionsContextValue {
  const context = useContext(ProductStudioActionsContext);
  if (!context) {
    throw internalError('useProductStudioActions must be used within ProductStudioProvider');
  }
  return context;
}

export function useProductStudioContext(): ProductStudioContextValue {
  const state = useProductStudioState();
  const actions = useProductStudioActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
