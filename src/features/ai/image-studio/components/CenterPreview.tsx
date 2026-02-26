/* eslint-disable */
// @ts-nocheck
'use client';

import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import type { ImageStudioSlotRecord, SlotGenerationMetadata } from '@/shared/contracts/image-studio';
import type { VectorShape } from '@/shared/contracts/vector';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { api } from '@/shared/lib/api-client';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import type { VectorCanvasImageContentFrame, VectorCanvasViewCropRect } from '@/shared/ui';
import { useToast } from '@/shared/ui';

import { FocusModeTogglePortal } from './center-preview/FocusModeTogglePortal';
import { CenterPreviewProvider, useCenterPreviewContext } from './center-preview/CenterPreviewContext';
import { useCenterPreviewVariants } from './center-preview/useCenterPreviewVariants';
import {
  deleteVariantFromCenterPreview,
  loadVariantIntoCanvas,
} from './center-preview/variant-actions';
import { VariantPanel } from './center-preview/VariantPanel';
import { VariantPanelProvider, type VariantPanelContextValue } from './center-preview/VariantPanelContext';
import { VariantTooltipPortal } from './center-preview/VariantTooltipPortal';
import { VersionNodeDetailsModal } from './VersionNodeDetailsModal';
import { useGenerationActions, useGenerationState } from '../context/GenerationContext';
import { useMaskingActions, useMaskingState } from '../context/MaskingContext';
import { useProjectsState } from '../context/ProjectsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { useUiActions, useUiState, type PreviewCanvasSize } from '../context/UiContext';
import { useVersionGraphState } from '../context/VersionGraphContext';
import { getImageStudioSlotImageSrc } from '../utils/image-src';
import {
  asObjectRecord,
  type VariantThumbnailInfo,
} from './center-preview/preview-utils';
import {
  buildDetailsNodeForCenterPreview,
  isTreeRevealableCardSlot,
  resolveSourceSlotIdFromGeneratedPath,
  resolveVariantSlotIdForCenterPreview,
} from './center-preview/variant-thumbnails';

import type { VersionNode } from '../context/VersionGraphContext';
import { CenterPreviewHeader } from './center-preview/sections/CenterPreviewHeader';
import { CenterPreviewCanvas } from './center-preview/sections/CenterPreviewCanvas';

const PREVIEW_CANVAS_MIN_HEIGHT_BY_SIZE: Record<PreviewCanvasSize, number> = {
  regular: 280,
  large: 380,
  xlarge: 480,
};
const PREVIEW_VARIANT_PANEL_HEIGHT = '15rem';
const REVEAL_IN_TREE_EVENT = 'image-studio:reveal-in-tree';
const IMAGE_STUDIO_QUICK_ACTIONS_HOST_ID = 'image-studio-quick-actions-host';

export function CenterPreviewInner(): React.JSX.Element {
  const {
    isFocusMode,
    maskPreviewEnabled,
    previewCanvasSize,
    imageTransformMode,
    canvasImageOffset,
    canvasBackgroundLayerEnabled,
    canvasBackgroundColor,
    pendingSequenceThumbnail,
    centerGuidesEnabled,
    canvasSelectionEnabled,
    maskFeather,
  } = useUiState();
  const {
    toggleFocusMode,
    registerPreviewCanvasViewportCropResolver,
    registerPreviewCanvasImageFrameResolver,
    setCanvasImageOffset,
    resetCanvasImageOffset,
  } = useUiActions();
  const { projectId, projectsQuery } = useProjectsState();
  const {
    workingSlot,
    selectedSlot,
    selectedSlotId,
    previewMode,
    captureRef,
    slots,
    temporaryObjectUpload,
  } = useSlotsState();
  const {
    setPreviewMode,
    setSelectedSlotId,
    setWorkingSlotId,
    setTemporaryObjectUpload,
    deleteSlotMutation,
  } = useSlotsActions();
  const settingsStore = useSettingsStore();
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const queryClient = useQueryClient();
  const {
    landingSlots,
    activeRunError,
    activeRunId,
    activeRunSourceSlotId,
  } = useGenerationState();
  const { clearActiveRunError } = useGenerationActions();

  const {
    tool,
    maskShapes,
    activeMaskId,
    selectedPointIndex,
    brushRadius,
    maskInvert,
  } = useMaskingState();

  const {
    setTool,
    setMaskShapes,
    setActiveMaskId,
    setSelectedPointIndex,
  } = useMaskingActions();

  const {
    screenshotBusy, setScreenshotBusy,
    singleVariantView, setSingleVariantView,
    splitVariantView, setSplitVariantView,
    setLeftSplitZoom,
    setRightSplitZoom,
    variantLoadingId, setVariantLoadingId,
    variantTooltip, setVariantTooltip,
    detailsSlotId, setDetailsSlotId,
  } = useCenterPreviewContext();

  const previewCanvasCropBindingRef = useRef<{
    slotId: string;
    cropRect: VectorCanvasViewCropRect;
  } | null>(null);
  const previewCanvasImageFrameBindingRef = useRef<{
    slotId: string;
    frame: VectorCanvasImageContentFrame;
  } | null>(null);

  const productImagesExternalBaseUrl =
    settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;

  const workingSlotImageSrc = useMemo(() => {
    return getImageStudioSlotImageSrc(workingSlot, productImagesExternalBaseUrl);
  }, [workingSlot, productImagesExternalBaseUrl]);
  const temporaryObjectImageSrc = useMemo(() => {
    const raw = temporaryObjectUpload?.filepath?.trim() ?? '';
    if (!raw) return null;
    return raw;
  }, [temporaryObjectUpload?.filepath]);

  const workingSlotMetadata = useMemo(
    () => asObjectRecord(workingSlot?.metadata) as SlotGenerationMetadata | null,
    [workingSlot?.metadata]
  );
  const selectedSlotMetadata = useMemo(
    () => asObjectRecord(selectedSlot?.metadata) as SlotGenerationMetadata | null,
    [selectedSlot?.metadata]
  );

  const { compositeResultCache, compositeLoading } = useVersionGraphState();
  const isCompositeSlot = workingSlotMetadata?.role === 'composite';
  const compositeResultImage = workingSlot?.id ? compositeResultCache.get(workingSlot.id) ?? null : null;

  const sourceSlotId = useMemo(() => {
    const primarySourceSlotId =
      typeof workingSlotMetadata?.sourceSlotId === 'string'
        ? workingSlotMetadata.sourceSlotId.trim()
        : '';
    if (primarySourceSlotId) return primarySourceSlotId;
    if (!Array.isArray(workingSlotMetadata?.sourceSlotIds)) return null;
    const fallbackSourceSlotId = workingSlotMetadata.sourceSlotIds.find((id): id is string =>
      typeof id === 'string' && id.trim().length > 0
    );
    if (fallbackSourceSlotId) return fallbackSourceSlotId;
    return resolveSourceSlotIdFromGeneratedPath(workingSlot);
  }, [workingSlot, workingSlotMetadata]);
  const selectedSourceSlotId = useMemo(() => {
    const primarySourceSlotId =
      typeof selectedSlotMetadata?.sourceSlotId === 'string'
        ? selectedSlotMetadata.sourceSlotId.trim()
        : '';
    if (primarySourceSlotId) return primarySourceSlotId;
    if (!Array.isArray(selectedSlotMetadata?.sourceSlotIds)) return null;
    const fallbackSourceSlotId = selectedSlotMetadata.sourceSlotIds.find((id): id is string =>
      typeof id === 'string' && id.trim().length > 0
    );
    if (fallbackSourceSlotId) return fallbackSourceSlotId;
    return resolveSourceSlotIdFromGeneratedPath(selectedSlot);
  }, [selectedSlot, selectedSlotMetadata]);
  const rootVariantSourceSlotId = useMemo(() => {
    const normalizedWorkingSlotId = workingSlot?.id?.trim() ?? '';
    const normalizedWorkingSourceSlotId = sourceSlotId?.trim() ?? '';
    if (normalizedWorkingSourceSlotId) return normalizedWorkingSourceSlotId;
    if (normalizedWorkingSlotId) return normalizedWorkingSlotId;

    const normalizedSelectedSlotId = selectedSlotId?.trim() ?? '';
    if (!normalizedSelectedSlotId) return null;
    return selectedSourceSlotId ?? normalizedSelectedSlotId;
  }, [selectedSlotId, selectedSourceSlotId, sourceSlotId, workingSlot?.id]);
  const showVariantPanel = previewMode === 'image';

  const sourceSlot = useMemo(
    () => (sourceSlotId ? slots.find((slot) => slot.id === sourceSlotId) ?? null : null),
    [sourceSlotId, slots]
  );

  const sourceSlotImageSrc = useMemo(
    () => getImageStudioSlotImageSrc(sourceSlot, productImagesExternalBaseUrl),
    [productImagesExternalBaseUrl, sourceSlot]
  );

  const hasSourceSlotReference = useMemo(() => {
    const normalizedSourceSlotId = sourceSlotId?.trim() ?? '';
    const normalizedWorkingSlotId = workingSlot?.id?.trim() ?? '';
    return Boolean(
      previewMode === 'image' &&
      normalizedSourceSlotId &&
      normalizedWorkingSlotId &&
      normalizedSourceSlotId !== normalizedWorkingSlotId
    );
  }, [previewMode, sourceSlotId, workingSlot?.id]);

  const canNavigateToSource = hasSourceSlotReference;

  const canCompareWithSource = useMemo(
    () =>
      hasSourceSlotReference &&
      Boolean(workingSlotImageSrc && sourceSlotImageSrc),
    [hasSourceSlotReference, sourceSlotImageSrc, workingSlotImageSrc]
  );
  const {
    activeVariantId,
    buildVariantDismissKeys,
    canCompareSelectedVariants,
    compareVariantA,
    compareVariantB,
    compareVariantIds,
    compareVariantImageA,
    compareVariantImageB,
    filteredVariantThumbnails,
    setCompareVariantIds,
    setCompareVariantLookup,
    setDismissedVariantKeys,
    setVariantTimestampQuery,
    variantTimestampQuery,
    visibleVariantThumbnails,
  } = useCenterPreviewVariants({
    activeRunId,
    activeRunSourceSlotId,
    landingSlots,
    pendingSequenceThumbnail,
    productImagesExternalBaseUrl,
    projectId,
    rootVariantSourceSlotId,
    slots,
    workingSlot,
  });

  const activeCanvasImageSrc = useMemo(() => {
    if (isCompositeSlot && compositeResultImage) return compositeResultImage;
    if (canCompareWithSource && singleVariantView === 'source') return sourceSlotImageSrc;
    return workingSlotImageSrc ?? temporaryObjectImageSrc;
  }, [
    isCompositeSlot,
    compositeResultImage,
    canCompareWithSource,
    temporaryObjectImageSrc,
    singleVariantView,
    sourceSlotImageSrc,
    workingSlotImageSrc,
  ]);

  const activeCanvasSlotId = useMemo((): string | null => {
    if (previewMode !== 'image' || splitVariantView) return null;
    if (canCompareWithSource && singleVariantView === 'source') {
      return sourceSlot?.id ?? null;
    }
    return workingSlot?.id ?? null;
  }, [
    canCompareWithSource,
    previewMode,
    singleVariantView,
    sourceSlot?.id,
    splitVariantView,
    workingSlot?.id,
  ]);
  const revealableCanvasSlot = workingSlot ?? null;
  const canRevealLoadedCardInTree = useMemo(
    () => isTreeRevealableCardSlot(revealableCanvasSlot),
    [revealableCanvasSlot]
  );
  const activeProject = useMemo(
    () =>
      (projectsQuery.data ?? []).find((project) => project.id === projectId) ??
      null,
    [projectId, projectsQuery.data]
  );
  const projectCanvasSize = useMemo((): { width: number; height: number } | null => {
    const width =
      typeof activeProject?.canvasWidthPx === 'number' &&
      Number.isFinite(activeProject.canvasWidthPx)
        ? Math.floor(activeProject.canvasWidthPx)
        : null;
    const height =
      typeof activeProject?.canvasHeightPx === 'number' &&
      Number.isFinite(activeProject.canvasHeightPx)
        ? Math.floor(activeProject.canvasHeightPx)
        : null;
    if (width === null || height === null) return null;
    if (width < 64 || width > 32_768 || height < 64 || height > 32_768) return null;
    return { width, height };
  }, [activeProject?.canvasHeightPx, activeProject?.canvasWidthPx]);

  const eligibleMaskShapes = useMemo(
    () =>
      maskShapes.filter(
        (shape: VectorShape) =>
          shape.visible &&
          (shape.type === 'rect' || shape.type === 'ellipse'
            ? shape.points.length >= 2
            : shape.closed && shape.points.length >= 3)
      ),
    [maskShapes]
  );

  const selectedEligibleMaskShapes = useMemo(
    () =>
      eligibleMaskShapes.filter(
        (shape) => activeMaskId && shape.id === activeMaskId
      ),
    [eligibleMaskShapes, activeMaskId]
  );

  const exportMaskShapes = useMemo(
    () => (selectedEligibleMaskShapes.length > 0 ? selectedEligibleMaskShapes : eligibleMaskShapes),
    [selectedEligibleMaskShapes, eligibleMaskShapes]
  );

  const liveMaskShapes = useMemo(() => {
    if (!maskPreviewEnabled) return [];
    return exportMaskShapes;
  }, [maskPreviewEnabled, exportMaskShapes]);

  const vectorContextValue = useMemo(() => ({
    shapes: maskShapes,
    tool,
    activeShapeId: activeMaskId,
    selectedPointIndex,
    brushRadius,
    imageSrc: activeCanvasImageSrc,
    allowWithoutImage: true,
    showEmptyState: false,
    emptyStateLabel: '',
    setShapes: setMaskShapes,
    setTool,
    setActiveShapeId: setActiveMaskId,
    setSelectedPointIndex,
    onClear: (): void => {
      setMaskShapes([]);
      setActiveMaskId(null);
    },
    disableClear: maskShapes.length === 0,
  }), [
    maskShapes,
    tool,
    activeMaskId,
    selectedPointIndex,
    brushRadius,
    activeCanvasImageSrc,
    setMaskShapes,
    setTool,
    setActiveMaskId,
    setSelectedPointIndex,
    maskShapes.length,
  ]);

  const handlePreviewCanvasCropRectChange = useCallback((cropRect: VectorCanvasViewCropRect | null): void => {
    const slotId = activeCanvasSlotId?.trim() ?? '';
    if (!slotId || !cropRect) {
      previewCanvasCropBindingRef.current = null;
      return;
    }
    previewCanvasCropBindingRef.current = {
      slotId,
      cropRect,
    };
  }, [activeCanvasSlotId]);

  const handlePreviewCanvasImageFrameChange = useCallback((frame: VectorCanvasImageContentFrame | null): void => {
    const slotId = activeCanvasSlotId?.trim() ?? '';
    if (!slotId || !frame) {
      previewCanvasImageFrameBindingRef.current = null;
      return;
    }
    previewCanvasImageFrameBindingRef.current = {
      slotId,
      frame,
    };
  }, [activeCanvasSlotId]);

  useEffect(() => {
    previewCanvasCropBindingRef.current = null;
    previewCanvasImageFrameBindingRef.current = null;
  }, [activeCanvasSlotId]);

  useEffect(() => {
    resetCanvasImageOffset();
  }, [activeCanvasSlotId, temporaryObjectUpload?.id, resetCanvasImageOffset]);

  useEffect(() => {
    if (previewMode !== 'image' || splitVariantView) {
      previewCanvasCropBindingRef.current = null;
      previewCanvasImageFrameBindingRef.current = null;
    }
  }, [previewMode, splitVariantView]);

  useEffect(() => {
    registerPreviewCanvasViewportCropResolver(() => {
      return previewCanvasCropBindingRef.current;
    });
    return (): void => {
      registerPreviewCanvasViewportCropResolver(null);
    };
  }, [registerPreviewCanvasViewportCropResolver]);

  useEffect(() => {
    registerPreviewCanvasImageFrameResolver(() => {
      return previewCanvasImageFrameBindingRef.current;
    });
    return (): void => {
      registerPreviewCanvasImageFrameResolver(null);
    };
  }, [registerPreviewCanvasImageFrameResolver]);

  useEffect(() => {
    setSingleVariantView('variant');
    setSplitVariantView(false);
  }, [workingSlot?.id]);
  const previewGridStyle = useMemo((): React.CSSProperties => {
    const canvasMinHeightPx = PREVIEW_CANVAS_MIN_HEIGHT_BY_SIZE[previewCanvasSize];
    if (!showVariantPanel) {
      return { gridTemplateRows: `${canvasMinHeightPx}px` };
    }
    return {
      gridTemplateRows: `${canvasMinHeightPx}px ${PREVIEW_VARIANT_PANEL_HEIGHT}`,
    };
  }, [previewCanvasSize, showVariantPanel]);

  useEffect(() => {
    if (canCompareWithSource) return;
    if (canCompareSelectedVariants) return;
    setSingleVariantView('variant');
    setSplitVariantView(false);
  }, [canCompareSelectedVariants, canCompareWithSource]);

  useEffect(() => {
    if (previewMode !== 'image') return;
    if (!canCompareSelectedVariants) return;
    setSplitVariantView(true);
  }, [canCompareSelectedVariants, previewMode]);

  const variantTooltipPosition = useMemo(() => {
    if (!variantTooltip || typeof window === 'undefined') return null;
    const left = Math.max(8, Math.min(variantTooltip.x + 14, window.innerWidth - 258));
    const top = Math.max(8, Math.min(variantTooltip.y + 14, window.innerHeight - 138));
    return { left, top };
  }, [variantTooltip]);

  const handleLoadVariantToCanvas = useCallback(async (variant: VariantThumbnailInfo): Promise<void> => {
    if (variantLoadingId === variant.id) return;
    setVariantLoadingId(variant.id);

    try {
      await loadVariantIntoCanvas({
        activeRunId,
        projectId,
        queryClient,
        rootVariantSourceSlotId,
        setPreviewMode,
        setSelectedSlotId,
        setSingleVariantView,
        setSplitVariantView,
        setTemporaryObjectUpload,
        setWorkingSlotId,
        slots,
        toast,
        variant,
      });
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Failed to load variant into canvas.', {
        variant: 'error',
      });
    } finally {
      setVariantLoadingId((current) => (current === variant.id ? null : current));
    }
  }, [
    activeRunId,
    projectId,
    queryClient,
    rootVariantSourceSlotId,
    setPreviewMode,
    setSelectedSlotId,
    setSingleVariantView,
    setSplitVariantView,
    setTemporaryObjectUpload,
    setWorkingSlotId,
    slots,
    toast,
    variantLoadingId,
  ]);

  const resolveVariantSlotId = useCallback(
    (
      variant: VariantThumbnailInfo,
      candidateSlots: ImageStudioSlotRecord[] = slots,
    ): string | null => resolveVariantSlotIdForCenterPreview({
      activeRunId,
      candidateSlots,
      rootVariantSourceSlotId,
      variant,
    }),
    [activeRunId, rootVariantSourceSlotId, slots],
  );

  const handleToggleSourceVariantView = useCallback((): void => {
    setSplitVariantView(false);
    setSingleVariantView((current) => (current === 'variant' ? 'source' : 'variant'));
  }, []);

  const handleGoToSourceSlot = useCallback((): void => {
    if (!sourceSlot?.id) {
      toast('Source slot is unavailable for this variant.', { variant: 'info' });
      return;
    }
    setSplitVariantView(false);
    setSingleVariantView('variant');
    setSelectedSlotId(sourceSlot.id);
    setWorkingSlotId(sourceSlot.id);
    setPreviewMode('image');
  }, [setPreviewMode, setSelectedSlotId, setWorkingSlotId, sourceSlot?.id, toast]);

  const handleToggleSplitVariantView = useCallback((): void => {
    setSplitVariantView((current) => {
      const next = !current;
      if (next) {
        setLeftSplitZoom(1);
        setRightSplitZoom(1);
      }
      return next;
    });
    setSingleVariantView('variant');
  }, []);

  const handleRevealInTreeFromCanvas = useCallback((): void => {
    const targetSlotId = activeCanvasSlotId ?? null;
    if (!targetSlotId) {
      toast('No card is currently loaded in the preview.', { variant: 'info' });
      return;
    }
    setSelectedSlotId(targetSlotId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(REVEAL_IN_TREE_EVENT, { detail: { slotId: targetSlotId } }));
    }
  }, [activeCanvasSlotId, setSelectedSlotId, toast]);

  const handleVariantTooltipMove = useCallback((
    event: React.MouseEvent<HTMLButtonElement>,
    variant: VariantThumbnailInfo
  ): void => {
    if (!variant.output) {
      setVariantTooltip(null);
      return;
    }
    setVariantTooltip({
      variant,
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  const handleDeleteVariant = useCallback((variant: VariantThumbnailInfo): void => {
    const variantLabel = variant.output?.filename?.trim() || `Variant ${variant.index}`;
    confirm({
      title: 'Delete Variant?',
      message: `Delete variant "${variantLabel}"? This action cannot be undone.`,
      confirmText: 'Delete',
      isDangerous: true,
      onConfirm: async () => {
        await deleteVariantFromCenterPreview({
          activeRunId,
          buildVariantDismissKeys,
          clearActiveRunError,
          projectId,
          queryClient,
          rootVariantSourceSlotId,
          setSelectedSlotId,
          setWorkingSlotId,
          setDismissedVariantKeys,
          setVariantTooltip,
          slots,
          toast,
          variant,
        });
        setCompareVariantIds((prev) => [
          prev[0] === variant.id ? null : prev[0],
          prev[1] === variant.id ? null : prev[1],
        ]);
        setCompareVariantLookup((prev) => {
          if (!prev[variant.id]) return prev;
          const next = { ...prev };
          delete next[variant.id];
          return next;
        });
      }
    });
  }, [
    activeRunId,
    confirm,
    buildVariantDismissKeys,
    clearActiveRunError,
    projectId,
    queryClient,
    rootVariantSourceSlotId,
    setCompareVariantIds,
    setCompareVariantLookup,
    setDismissedVariantKeys,
    setVariantTooltip,
    slots,
    toast,
  ]);

  const handleOpenVariantDetails = useCallback((variant: VariantThumbnailInfo): void => {
    const slotId = resolveVariantSlotId(variant);
    if (!slotId) {
      toast('Variant details are unavailable until slot metadata finishes syncing.', { variant: 'info' });
      return;
    }
    setDetailsSlotId(slotId);
  }, [resolveVariantSlotId, toast]);

  const handleCloseVariantDetails = useCallback((): void => {
    setDetailsSlotId(null);
  }, []);

  const detailsSlot = useMemo(
    () => (detailsSlotId ? slots.find((slot) => slot.id === detailsSlotId) ?? null : null),
    [detailsSlotId, slots]
  );

  const detailsNode = useMemo<VersionNode | null>(
    () => buildDetailsNodeForCenterPreview(detailsSlot, slots),
    [detailsSlot, slots]
  );

  const getSlotImageSrc = useCallback(
    (slot: ImageStudioSlotRecord): string | null =>
      getImageStudioSlotImageSrc(slot, productImagesExternalBaseUrl),
    [productImagesExternalBaseUrl]
  );

  const handleSaveScreenshot = useCallback(async (): Promise<void> => {
    if (!workingSlot?.id) {
      toast('Select a slot before saving screenshot.', { variant: 'info' });
      return;
    }
    if (!captureRef.current) {
      toast('Screenshot capture is not available in current preview mode.', { variant: 'info' });
      return;
    }

    const dataUrl = captureRef.current();
    if (!dataUrl) {
      toast('Could not capture screenshot from preview.', { variant: 'error' });
      return;
    }

    setScreenshotBusy(true);
    try {
      const baseName = (workingSlot.name || workingSlot.id || 'slot').replace(/[^a-zA-Z0-9_-]/g, '_');
      await api.post(`/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/screenshot`, {
        dataUrl,
        filename: `${baseName}-${Date.now()}.png`,
      });
      void invalidateImageStudioSlots(queryClient, projectId);
      toast('Screenshot saved and attached to slot.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save screenshot.', { variant: 'error' });
    } finally {
      setScreenshotBusy(false);
    }
  }, [captureRef, projectId, queryClient, toast, workingSlot]);

  const variantPanelContextValue = useMemo<VariantPanelContextValue>(
    () => ({
      activeRunError,
      activeVariantId,
      compareVariantA,
      compareVariantB,
      compareVariantIds,
      deletePending: deleteSlotMutation.isPending,
      filteredVariantThumbnails,
      variantLoadingId,
      variantTimestampQuery,
      visibleVariantThumbnails,
      onClearCompare: (): void => setCompareVariantIds([null, null]),
      onDeleteVariant: handleDeleteVariant,
      onDismissRunError: clearActiveRunError,
      onLoadVariantToCanvas: handleLoadVariantToCanvas,
      onOpenVariantDetails: handleOpenVariantDetails,
      onSetCompareVariantA: (variantId: string): void => {
        setCompareVariantIds((prev) => [variantId, prev[1] === variantId ? null : prev[1]]);
      },
      onSetCompareVariantB: (variantId: string): void => {
        setCompareVariantIds((prev) => [prev[0] === variantId ? null : prev[0], variantId]);
      },
      onVariantTimestampQueryChange: setVariantTimestampQuery,
      onVariantTooltipLeave: (): void => setVariantTooltip(null),
      onVariantTooltipMove: handleVariantTooltipMove,
    }),
    [
      activeRunError,
      activeVariantId,
      compareVariantA,
      compareVariantB,
      compareVariantIds,
      deleteSlotMutation.isPending,
      filteredVariantThumbnails,
      variantLoadingId,
      variantTimestampQuery,
      visibleVariantThumbnails,
      handleDeleteVariant,
      clearActiveRunError,
      handleLoadVariantToCanvas,
      handleOpenVariantDetails,
      setCompareVariantIds,
      setVariantTimestampQuery,
      handleVariantTooltipMove,
    ]
  );

  return (
    <div className='order-2 relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/60 bg-card/40 p-0'>
      <CenterPreviewHeader onSaveScreenshot={() => { void handleSaveScreenshot(); }} />
      <FocusModeTogglePortal
        isFocusMode={isFocusMode}
        onToggleFocusMode={toggleFocusMode}
      />
      <VariantTooltipPortal
        tooltip={variantTooltip}
        position={variantTooltipPosition}
      />
      <div className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-3 pt-0'>
        <div
          className='grid content-start gap-3'
          style={previewGridStyle}
        >
          <CenterPreviewCanvas
            vectorContextValue={vectorContextValue}
            projectCanvasSize={projectCanvasSize}
            activeCanvasImageSrc={activeCanvasImageSrc}
            liveMaskShapes={liveMaskShapes}
            splitVariantView={splitVariantView}
            canCompareSelectedVariants={canCompareSelectedVariants}
            compareVariantImageA={compareVariantImageA}
            compareVariantImageB={compareVariantImageB}
            canCompareWithSource={canCompareWithSource}
            sourceSlotImageSrc={sourceSlotImageSrc}
            workingSlotImageSrc={workingSlotImageSrc}
            isCompositeSlot={isCompositeSlot}
            canNavigateToSource={canNavigateToSource}
            canRevealLoadedCardInTree={canRevealLoadedCardInTree}
            handlePreviewCanvasCropRectChange={handlePreviewCanvasCropRectChange}
            handlePreviewCanvasImageFrameChange={handlePreviewCanvasImageFrameChange}
            handleGoToSourceSlot={handleGoToSourceSlot}
            handleToggleSourceVariantView={handleToggleSourceVariantView}
            handleToggleSplitVariantView={handleToggleSplitVariantView}
            handleRevealInTreeFromCanvas={handleRevealInTreeFromCanvas}
          />
          {showVariantPanel ? (
            <VariantPanelProvider value={variantPanelContextValue}>
              <VariantPanel />
            </VariantPanelProvider>
          ) : null}
        </div>
        {showVariantPanel ? <div id={IMAGE_STUDIO_QUICK_ACTIONS_HOST_ID} className='shrink-0' /> : null}
      </div>
      <VersionNodeDetailsModal
        isOpen={Boolean(detailsNode)}
        item={detailsNode}
        onClose={handleCloseVariantDetails}
        getSlotImageSrc={getSlotImageSrc}
      />
      <ConfirmationModal />
    </div>
  );
}

export function CenterPreview(): React.JSX.Element {
  return (
    <CenterPreviewProvider>
      <CenterPreviewInner />
    </CenterPreviewProvider>
  );
}
