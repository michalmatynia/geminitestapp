'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Camera, Loader2, Locate } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { studioKeys } from '@/features/ai/image-studio/hooks/useImageStudioQueries';
import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import { VectorDrawingCanvas, VectorDrawingProvider } from '@/features/vector-drawing';
import { Viewer3D } from '@/features/viewer3d/components/Viewer3D';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { api, ApiError } from '@/shared/lib/api-client';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import type { VectorCanvasViewCropRect } from '@/shared/ui';
import { Button, Input, useToast } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { FocusModeTogglePortal } from './center-preview/FocusModeTogglePortal';
import { SplitVariantPreview } from './center-preview/SplitVariantPreview';
import { SplitViewControls } from './center-preview/SplitViewControls';
import { VariantPanel } from './center-preview/VariantPanel';
import { VariantTooltipPortal, type VariantTooltipState } from './center-preview/VariantTooltipPortal';
import { VersionNodeDetailsModal } from './VersionNodeDetailsModal';
import { useGenerationActions, useGenerationState } from '../context/GenerationContext';
import { useMaskingActions, useMaskingState } from '../context/MaskingContext';
import { useProjectsState } from '../context/ProjectsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { useUiActions, useUiState, type PreviewCanvasSize } from '../context/UiContext';
import { useVersionGraphState } from '../context/VersionGraphContext';
import { getImageStudioSlotImageSrc } from '../utils/image-src';
import {
  buildDetailsNodeForCenterPreview,
  buildVariantThumbnails,
  isTreeRevealableCardSlot,
  resolveSourceSlotIdFromGeneratedPath,
  resolveVariantSlotIdForCenterPreview,
} from './center-preview/variant-thumbnails';
import {
  asObjectRecord,
  clampSplitZoom,
  normalizeImagePath,
  type VariantThumbnailInfo,
  wait,
} from './center-preview/preview-utils';

import type { VersionNode } from '../context/VersionGraphContext';
import type { ImageStudioSlotRecord, SlotGenerationMetadata } from '../types';

const PREVIEW_MODE_OPTIONS = [
  { value: 'image', label: 'Image' },
  { value: '3d', label: '3D' },
] as const;
const PREVIEW_CANVAS_MIN_HEIGHT_BY_SIZE: Record<PreviewCanvasSize, number> = {
  regular: 280,
  large: 380,
  xlarge: 480,
};
const PREVIEW_VARIANT_PANEL_HEIGHT = '15rem';
const REVEAL_IN_TREE_EVENT = 'image-studio:reveal-in-tree';
const IMAGE_STUDIO_QUICK_ACTIONS_HOST_ID = 'image-studio-quick-actions-host';

export function CenterPreview(): React.JSX.Element {
  const {
    isFocusMode,
    maskPreviewEnabled,
    centerGuidesEnabled,
    canvasSelectionEnabled,
    previewCanvasSize,
    imageTransformMode,
    canvasImageOffset,
  } = useUiState();
  const {
    toggleFocusMode,
    registerPreviewCanvasViewportCropResolver,
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
    isRunInFlight,
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
    maskFeather,
  } = useMaskingState();

  const {
    setTool,
    setMaskShapes,
    setActiveMaskId,
    setSelectedPointIndex,
  } = useMaskingActions();

  const [screenshotBusy, setScreenshotBusy] = useState(false);
  const [variantTimestampQuery, setVariantTimestampQuery] = useState('');
  const [singleVariantView, setSingleVariantView] = useState<'variant' | 'source'>('variant');
  const [splitVariantView, setSplitVariantView] = useState(false);
  const [compareVariantIds, setCompareVariantIds] = useState<[string | null, string | null]>([null, null]);
  const [leftSplitZoom, setLeftSplitZoom] = useState(1);
  const [rightSplitZoom, setRightSplitZoom] = useState(1);
  const [dismissedVariantKeys, setDismissedVariantKeys] = useState<Set<string>>(new Set());
  const pendingDismissedVariantHydrationKeyRef = useRef<string | null>(null);
  const [variantLoadingId, setVariantLoadingId] = useState<string | null>(null);
  const previewCanvasCropRectRef = useRef<VectorCanvasViewCropRect | null>(null);
  const previewCanvasSlotIdRef = useRef<string | null>(null);
  const [variantTooltip, setVariantTooltip] = useState<VariantTooltipState | null>(null);
  const [detailsSlotId, setDetailsSlotId] = useState<string | null>(null);

  const productImagesExternalBaseUrl =
    settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;

  const dismissedVariantStorageKey = useMemo((): string | null => {
    const normalizedProjectId = projectId?.trim() ?? '';
    const normalizedRunId = activeRunId?.trim() ?? '';
    if (!normalizedProjectId || !normalizedRunId) return null;
    return `image_studio_dismissed_variants:${normalizedProjectId}:${normalizedRunId}`;
  }, [activeRunId, projectId]);

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

  // Composite preview override
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

  const hasSourceSlotReference = useMemo(
    () => {
      const normalizedSourceSlotId = sourceSlotId?.trim() ?? '';
      const normalizedWorkingSlotId = workingSlot?.id?.trim() ?? '';
      return Boolean(
        previewMode === 'image' &&
        normalizedSourceSlotId &&
        normalizedWorkingSlotId &&
        normalizedSourceSlotId !== normalizedWorkingSlotId
      );
    },
    [previewMode, sourceSlotId, workingSlot?.id]
  );

  const canNavigateToSource = hasSourceSlotReference;

  const canCompareWithSource = useMemo(
    () =>
      hasSourceSlotReference &&
      Boolean(workingSlotImageSrc && sourceSlotImageSrc),
    [hasSourceSlotReference, sourceSlotImageSrc, workingSlotImageSrc]
  );

  const activeCanvasImageSrc = useMemo(() => {
    // Composite preview: use composited result image when available
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
  const previewCanvasClassName = useMemo(
    () =>
      cn(
        'h-full',
        'bg-slate-900',
      ),
    [],
  );

  const eligibleMaskShapes = useMemo(
    () =>
      maskShapes.filter(
        (shape) =>
          shape.visible &&
          ((shape.type === 'rect' || shape.type === 'ellipse')
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
    previewCanvasCropRectRef.current = cropRect;
  }, []);

  useEffect(() => {
    previewCanvasSlotIdRef.current = activeCanvasSlotId;
  }, [activeCanvasSlotId]);

  useEffect(() => {
    resetCanvasImageOffset();
  }, [activeCanvasSlotId, temporaryObjectUpload?.id, resetCanvasImageOffset]);

  useEffect(() => {
    if (previewMode !== 'image' || splitVariantView) {
      previewCanvasCropRectRef.current = null;
    }
  }, [previewMode, splitVariantView]);

  useEffect(() => {
    registerPreviewCanvasViewportCropResolver(() => {
      const slotId = previewCanvasSlotIdRef.current?.trim() ?? '';
      const cropRect = previewCanvasCropRectRef.current;
      if (!slotId || !cropRect) return null;
      return {
        slotId,
        cropRect,
      };
    });
    return (): void => {
      registerPreviewCanvasViewportCropResolver(null);
    };
  }, [registerPreviewCanvasViewportCropResolver]);

  useEffect(() => {
    setSingleVariantView('variant');
    setSplitVariantView(false);
  }, [workingSlot?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!dismissedVariantStorageKey) {
      pendingDismissedVariantHydrationKeyRef.current = null;
      setDismissedVariantKeys(new Set());
      return;
    }
    pendingDismissedVariantHydrationKeyRef.current = dismissedVariantStorageKey;
    const raw = window.localStorage.getItem(dismissedVariantStorageKey);
    if (!raw) {
      setDismissedVariantKeys(new Set());
      return;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        setDismissedVariantKeys(new Set());
        return;
      }
      const keys = parsed
        .filter((value: unknown): value is string => typeof value === 'string')
        .map((value: string) => value.trim())
        .filter(Boolean);
      setDismissedVariantKeys(new Set(keys));
    } catch {
      setDismissedVariantKeys(new Set());
    }
  }, [dismissedVariantStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!dismissedVariantStorageKey) return;
    if (pendingDismissedVariantHydrationKeyRef.current === dismissedVariantStorageKey) {
      pendingDismissedVariantHydrationKeyRef.current = null;
      return;
    }
    const serialized = JSON.stringify(Array.from(dismissedVariantKeys));
    window.localStorage.setItem(dismissedVariantStorageKey, serialized);
  }, [dismissedVariantKeys, dismissedVariantStorageKey]);

  const buildVariantDismissKeys = useCallback(
    (variant: VariantThumbnailInfo): string[] => {
      const keys = new Set<string>();
      keys.add(`id:${variant.id}`);
      const normalizedSlotId = variant.slotId?.trim() ?? '';
      if (normalizedSlotId) {
        keys.add(`slot:${normalizedSlotId}`);
      } else {
        // For transient variants without a concrete slot, fall back to output/path keys.
        if (variant.output?.id) {
          keys.add(`output:${variant.output.id}`);
        }
        const normalizedPath = normalizeImagePath(
          variant.output?.filepath ?? variant.imageSrc
        );
        if (normalizedPath) {
          keys.add(`path:${normalizedPath}`);
        }
      }
      return Array.from(keys);
    },
    []
  );

  const variantThumbnails = useMemo(
    () => buildVariantThumbnails({
      activeRunId,
      activeRunSourceSlotId,
      landingSlots,
      productImagesExternalBaseUrl,
      rootVariantSourceSlotId,
      slots,
    }),
    [
    activeRunId,
    activeRunSourceSlotId,
    landingSlots,
    productImagesExternalBaseUrl,
    rootVariantSourceSlotId,
    slots,
    ],
  );

  const visibleVariantThumbnails = useMemo(
    () =>
      variantThumbnails.filter((variant) => {
        if (dismissedVariantKeys.has(`id:${variant.id}`)) return false;
        if (variant.slotId && dismissedVariantKeys.has(`slot:${variant.slotId}`)) {
          return false;
        }
        if (variant.output?.id && dismissedVariantKeys.has(`output:${variant.output.id}`)) {
          return false;
        }
        const normalizedPath = normalizeImagePath(
          variant.output?.filepath ?? variant.imageSrc
        );
        if (normalizedPath && dismissedVariantKeys.has(`path:${normalizedPath}`)) {
          return false;
        }
        return true;
      }),
    [dismissedVariantKeys, variantThumbnails]
  );

  const normalizedVariantTimestampQuery = variantTimestampQuery.trim().toLowerCase();
  const filteredVariantThumbnails = useMemo((): VariantThumbnailInfo[] => {
    if (!normalizedVariantTimestampQuery) return visibleVariantThumbnails;
    return visibleVariantThumbnails.filter((variant) =>
      variant.timestampSearchText.includes(normalizedVariantTimestampQuery)
    );
  }, [normalizedVariantTimestampQuery, visibleVariantThumbnails]);
  const compareVariantA = useMemo(
    () => visibleVariantThumbnails.find((variant) => variant.id === compareVariantIds[0]) ?? null,
    [compareVariantIds, visibleVariantThumbnails]
  );
  const compareVariantB = useMemo(
    () => visibleVariantThumbnails.find((variant) => variant.id === compareVariantIds[1]) ?? null,
    [compareVariantIds, visibleVariantThumbnails]
  );
  const compareVariantImageA = compareVariantA?.imageSrc ?? compareVariantA?.output?.filepath ?? null;
  const compareVariantImageB = compareVariantB?.imageSrc ?? compareVariantB?.output?.filepath ?? null;
  const canCompareSelectedVariants = Boolean(compareVariantImageA && compareVariantImageB);
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

  useEffect(() => {
    setCompareVariantIds((prev) => {
      const nextA = prev[0] && visibleVariantThumbnails.some((variant) => variant.id === prev[0]) ? prev[0] : null;
      const nextB = prev[1] && visibleVariantThumbnails.some((variant) => variant.id === prev[1]) ? prev[1] : null;
      if (nextA === prev[0] && nextB === prev[1]) return prev;
      return [nextA, nextB];
    });
  }, [visibleVariantThumbnails]);

  const activeVariantId = useMemo((): string | null => {
    if (!workingSlot) return null;

    const workingSlotId = workingSlot.id?.trim() ?? '';
    const workingOutputId = workingSlot.imageFileId?.trim() ?? '';
    const workingImagePath = normalizeImagePath(
      workingSlot.imageFile?.filepath ?? workingSlot.imageUrl ?? null
    );

    if (workingSlotId) {
      const bySlotId = visibleVariantThumbnails.find(
        (variant) => variant.slotId === workingSlotId
      );
      if (bySlotId) return bySlotId.id;
    }

    for (const variant of visibleVariantThumbnails) {
      if (workingOutputId && variant.output?.id === workingOutputId) {
        return variant.id;
      }
      const variantPath = normalizeImagePath(variant.output?.filepath ?? variant.imageSrc);
      if (workingImagePath && variantPath && workingImagePath === variantPath) {
        return variant.id;
      }
    }

    return null;
  }, [
    visibleVariantThumbnails,
    workingSlot,
    workingSlot?.imageFile?.filepath,
    workingSlot?.imageFileId,
    workingSlot?.imageUrl,
  ]);

  const variantTooltipPosition = useMemo(() => {
    if (!variantTooltip || typeof window === 'undefined') return null;
    const panelWidth = 250;
    const panelHeight = 130;
    const padding = 8;
    const left = Math.max(
      padding,
      Math.min(variantTooltip.x + 14, window.innerWidth - panelWidth - padding)
    );
    const top = Math.max(
      padding,
      Math.min(variantTooltip.y + 14, window.innerHeight - panelHeight - padding)
    );
    return { left, top };
  }, [variantTooltip]);

  const handleLoadVariantToCanvas = useCallback(async (variant: VariantThumbnailInfo): Promise<void> => {
    if (variantLoadingId === variant.id) return;
    setVariantLoadingId(variant.id);

    try {
      let resolvedSlotId = resolveVariantSlotIdForCenterPreview({
        activeRunId,
        candidateSlots: slots,
        rootVariantSourceSlotId,
        variant,
      });

      if (!resolvedSlotId) {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          await queryClient.refetchQueries({
            queryKey: studioKeys.slots(projectId),
            type: 'active',
          });

          const cached = queryClient.getQueryData<{ slots?: typeof slots }>(
            studioKeys.slots(projectId)
          );
          const candidateSlots = Array.isArray(cached?.slots) ? cached.slots : slots;
          resolvedSlotId = resolveVariantSlotIdForCenterPreview({
            activeRunId,
            candidateSlots,
            rootVariantSourceSlotId,
            variant,
          });
          if (resolvedSlotId) break;
          await wait(180);
        }
      }

      if (!resolvedSlotId) {
        if (variant.output) {
          setTemporaryObjectUpload({
            id: variant.output.id,
            filepath: variant.output.filepath,
            filename: variant.output.filename,
            width: variant.output.width,
            height: variant.output.height,
          });
          toast('Variant linked to card. Open Edit Card to apply this generated output.', {
            variant: 'info',
          });
          return;
        }
        toast('Variant is still syncing to run outputs. Try again in a second.', { variant: 'info' });
        return;
      }

      if (variant.output) {
        setTemporaryObjectUpload({
          id: variant.output.id,
          filepath: variant.output.filepath,
          filename: variant.output.filename,
          width: variant.output.width,
          height: variant.output.height,
        });
      }

      setSingleVariantView('variant');
      setSplitVariantView(false);
      setSelectedSlotId(resolvedSlotId);
      setWorkingSlotId(resolvedSlotId);
      setPreviewMode('image');
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

  const adjustSplitZoom = useCallback((pane: 'left' | 'right', delta: number): void => {
    if (pane === 'left') {
      setLeftSplitZoom((current) => clampSplitZoom(current + delta));
      return;
    }
    setRightSplitZoom((current) => clampSplitZoom(current + delta));
  }, []);

  const resetSplitZoom = useCallback((pane: 'left' | 'right'): void => {
    if (pane === 'left') {
      setLeftSplitZoom(1);
      return;
    }
    setRightSplitZoom(1);
  }, []);

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
        const dismissVariantFromUi = (): void => {
          setDismissedVariantKeys((current) => {
            const next = new Set(current);
            buildVariantDismissKeys(variant).forEach((key) => {
              next.add(key);
            });
            return next;
          });
          setVariantTooltip((current) => (current?.variant.id === variant.id ? null : current));
          clearActiveRunError();
        };

        const refreshGenerationQueries = (): void => {
          void queryClient.invalidateQueries({
            predicate: (query) =>
              Array.isArray(query.queryKey) &&
              query.queryKey[0] === studioKeys.all[0] &&
              query.queryKey[1] === 'list' &&
              query.queryKey[2] === 'runs',
          });
        };

        const deleteVariantAssetFallback = async (): Promise<void> => {
          const output = variant.output;
          if (!output) return;
          if (!projectId) return;

          try {
            await api.post(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets/delete`, {
              id: output.id,
              filepath: output.filepath,
            });
          } catch (error: unknown) {
            if (error instanceof ApiError && error.status === 404) {
              return;
            }
            throw error;
          }
        };

        const resolveTargetSlotId = async (): Promise<string | null> => {
          const direct = resolveVariantSlotId(variant);
          if (direct) return direct;
          if (!projectId) return null;

          for (let attempt = 0; attempt < 4; attempt += 1) {
            await queryClient.invalidateQueries({ queryKey: studioKeys.slots(projectId) });
            const cached = queryClient.getQueryData<{ slots?: ImageStudioSlotRecord[] }>(studioKeys.slots(projectId));
            const candidateSlots = Array.isArray(cached?.slots) ? cached.slots : slots;
            const resolved = resolveVariantSlotId(variant, candidateSlots);
            if (resolved) return resolved;
            await wait(180);
          }

          return null;
        };

        try {
          const targetSlotId = await resolveTargetSlotId();
          if (!targetSlotId) {
            await deleteVariantAssetFallback();
            dismissVariantFromUi();
            refreshGenerationQueries();
            return;
          }

          try {
            await deleteSlotMutation.mutateAsync(targetSlotId);
            dismissVariantFromUi();
            refreshGenerationQueries();
          } catch (error: unknown) {
            if (error instanceof ApiError && error.status === 404) {
              await deleteVariantAssetFallback();
              dismissVariantFromUi();
              refreshGenerationQueries();
              return;
            }
            throw error;
          }
        } catch (error: unknown) {
          toast(error instanceof Error ? error.message : 'Failed to delete variant.', { variant: 'error' });
        }
      }
    });
  }, [
    confirm,
    buildVariantDismissKeys,
    deleteSlotMutation,
    projectId,
    queryClient,
    resolveVariantSlotId,
    slots,
    toast,
    clearActiveRunError,
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

  return (
    <div className='order-2 relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/60 bg-card/40 p-0'>
      <div className='grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2'>
        <div className='flex items-center gap-2'>
          {workingSlot?.asset3dId ? (
            <ToggleButtonGroup
              value={previewMode}
              onChange={setPreviewMode}
              options={PREVIEW_MODE_OPTIONS}
              className='text-[11px] text-gray-300'
            />
          ) : null}
          {previewMode === '3d' && workingSlot ? (
            <Button size='xs'
              variant='outline'
              onClick={() => { void handleSaveScreenshot(); }}
              disabled={screenshotBusy}
              title='Capture current 3D frame and attach it to this slot'
            >
              {screenshotBusy ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Camera className='mr-2 size-4' />}
              Save Shot
            </Button>
          ) : null}
        </div>
        <div />
        <div />
      </div>
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
          <div className='sticky top-0 z-20 relative min-h-0 overflow-hidden bg-card/40'>
            <VectorDrawingProvider value={vectorContextValue}>
              {previewMode === '3d' && workingSlot?.asset3dId ? (
                <Viewer3D
                  modelUrl={`/api/assets3d/${workingSlot.asset3dId}/file`}
                  allowUserControls
                  captureRef={captureRef}
                  className='h-full w-full'
                />
              ) : splitVariantView && canCompareSelectedVariants && compareVariantImageA && compareVariantImageB ? (
                <SplitVariantPreview
                  sourceSlotImageSrc={compareVariantImageA}
                  workingSlotImageSrc={compareVariantImageB}
                  leftSplitZoom={leftSplitZoom}
                  rightSplitZoom={rightSplitZoom}
                  onAdjustSplitZoom={adjustSplitZoom}
                  onResetSplitZoom={resetSplitZoom}
                />
              ) : splitVariantView && canCompareWithSource && sourceSlotImageSrc && workingSlotImageSrc ? (
                <SplitVariantPreview
                  sourceSlotImageSrc={sourceSlotImageSrc}
                  workingSlotImageSrc={workingSlotImageSrc}
                  leftSplitZoom={leftSplitZoom}
                  rightSplitZoom={rightSplitZoom}
                  onAdjustSplitZoom={adjustSplitZoom}
                  onResetSplitZoom={resetSplitZoom}
                />
              ) : (
                <VectorDrawingCanvas
                  key={`${workingSlot?.id ?? 'canvas-empty'}:${projectCanvasSize?.width ?? 'auto'}x${projectCanvasSize?.height ?? 'auto'}`}
                  maskPreviewEnabled={maskPreviewEnabled}
                  maskPreviewShapes={liveMaskShapes}
                  maskPreviewInvert={maskInvert}
                  maskPreviewOpacity={0.5}
                  maskPreviewFeather={maskFeather}
                  showCenterGuides={centerGuidesEnabled}
                  showCanvasGrid
                  enableTwoFingerRotate
                  baseCanvasWidthPx={projectCanvasSize?.width ?? null}
                  baseCanvasHeightPx={projectCanvasSize?.height ?? null}
                  imageMoveEnabled={imageTransformMode === 'move'}
                  selectionEnabled={canvasSelectionEnabled}
                  imageOffset={canvasImageOffset}
                  onImageOffsetChange={setCanvasImageOffset}
                  onViewCropRectChange={handlePreviewCanvasCropRectChange}
                  className={previewCanvasClassName}
                />
              )}
            </VectorDrawingProvider>
            {/* Composite loading overlay */}
            {isCompositeSlot && compositeLoading ? (
              <div className='absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm'>
                <div className='flex items-center gap-2 rounded-lg bg-card/90 px-4 py-2 shadow-lg'>
                  <Loader2 className='size-4 animate-spin text-teal-400' />
                  <span className='text-xs text-teal-400'>Compositing layers...</span>
                </div>
              </div>
            ) : null}
            {canNavigateToSource ? (
              <SplitViewControls
                singleVariantView={singleVariantView}
                splitVariantView={splitVariantView}
                canCompare={canCompareWithSource}
                onGoToSourceSlot={handleGoToSourceSlot}
                onToggleSourceVariantView={handleToggleSourceVariantView}
                onToggleSplitVariantView={handleToggleSplitVariantView}
              />
            ) : null}
            {canRevealLoadedCardInTree ? (
              <div className='absolute bottom-2 left-2 z-20'>
                <Button size='xs'
                  type='button'
                  variant='outline'
                  onClick={handleRevealInTreeFromCanvas}
                  title='Reveal loaded card in tree'
                  aria-label='Reveal loaded card in tree'
                  className='h-7 w-7 bg-black/70 px-0 text-[11px] text-gray-100 backdrop-blur-sm'
                >
                  <Locate className='size-3.5' />
                </Button>
              </div>
            ) : null}
          </div>
          {showVariantPanel ? (
            <div className='h-full shrink-0 overflow-hidden rounded-lg border border-border/60 bg-card/40 p-2'>
              <div className='mb-2 flex items-center gap-2'>
                <Input size='sm'
                  value={variantTimestampQuery}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                    setVariantTimestampQuery(event.target.value);
                  }}
                  placeholder='Search variants by timestamp'
                  className='h-8 text-xs'
                  aria-label='Search generated variants by timestamp'
                />
                <span className='shrink-0 text-[11px] text-gray-400'>
                  {filteredVariantThumbnails.length}/{visibleVariantThumbnails.length}
                </span>
              </div>
              <div className='mb-2 flex items-center gap-2 text-[11px] text-gray-400'>
                <span>Compare in canvas:</span>
                <span className={cn('rounded border px-1.5 py-0.5', compareVariantA ? 'border-cyan-400/60 text-cyan-200' : 'border-border/60')}>1 {compareVariantA ? `#${compareVariantA.index}` : 'unset'}</span>
                <span className={cn('rounded border px-1.5 py-0.5', compareVariantB ? 'border-amber-400/60 text-amber-200' : 'border-border/60')}>2 {compareVariantB ? `#${compareVariantB.index}` : 'unset'}</span>
                <Button
                  size='xs'
                  type='button'
                  variant='ghost'
                  onClick={(): void => setCompareVariantIds([null, null])}
                  className='h-6 px-2 text-[10px] text-gray-300'
                >
                    Clear
                </Button>
              </div>
              <div className='overflow-x-auto overflow-y-hidden pb-1 pr-1'>
                {filteredVariantThumbnails.length > 0 ? (
                  <div className='flex w-max min-w-full gap-2'>
                    {filteredVariantThumbnails.map((variant) => {
                      const isActive = activeVariantId === variant.id;
                      const canDeleteVariant =
                          variant.status !== 'pending' &&
                          (variant.status === 'failed' || Boolean(variant.output) || Boolean(variant.slotId));
                      const statusClasses =
                          variant.status === 'completed'
                            ? 'border-border/60 bg-card/30'
                            : variant.status === 'failed'
                              ? 'border-red-400/40 bg-red-500/5'
                              : 'border-border/60 bg-card/30';
                      const activeClasses = isActive
                        ? 'border-sky-400/80 bg-sky-500/15 ring-2 ring-sky-400/70'
                        : '';
                      const isCompareA = compareVariantIds[0] === variant.id;
                      const isCompareB = compareVariantIds[1] === variant.id;
                      const compareClasses = isCompareA
                        ? 'ring-2 ring-cyan-400/70'
                        : isCompareB
                          ? 'ring-2 ring-amber-400/70'
                          : '';

                      return (
                        <div key={variant.id} className='w-28 shrink-0'>
                          <button
                            type='button'
                            onClick={(): void => {
                              void handleLoadVariantToCanvas(variant);
                            }}
                            onMouseEnter={(event): void => handleVariantTooltipMove(event, variant)}
                            onMouseMove={(event): void => handleVariantTooltipMove(event, variant)}
                            onMouseLeave={(): void => setVariantTooltip(null)}
                            onBlur={(): void => setVariantTooltip(null)}
                            disabled={!variant.output || variantLoadingId === variant.id}
                            aria-pressed={isActive}
                            className={`group relative w-full overflow-hidden rounded border p-1 text-left transition ${statusClasses} ${activeClasses} ${compareClasses}`}
                          >
                            <div className='mb-1 text-[10px] text-gray-400'>Variant {variant.index}</div>
                            {variant.output ? (
                            // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={variant.imageSrc || variant.output.filepath}
                                alt={variant.output.filename || `Generated ${variant.index}`}
                                className='h-20 w-full rounded object-cover'
                              />
                            ) : (
                              <div className='flex h-20 w-full items-center justify-center rounded border border-dashed border-border/70 text-[10px] text-gray-500'>
                                {variant.status === 'pending' ? (
                                  <span className='inline-flex items-center gap-1'>
                                    {isRunInFlight ? <Loader2 className='size-3 animate-spin' /> : null}
                                      Waiting
                                  </span>
                                ) : (
                                  <span>Failed</span>
                                )}
                              </div>
                            )}
                          </button>
                          <div className='mt-1 flex items-center justify-between gap-1'>
                            <div className='flex items-center gap-1'>
                              <Button
                                size='xs'
                                type='button'
                                variant='ghost'
                                onClick={(): void => {
                                  setCompareVariantIds((prev) => [variant.id, prev[1] === variant.id ? null : prev[1]]);
                                }}
                                title='Set as compare thumbnail 1'
                                aria-pressed={isCompareA}
                                className={cn('size-5 rounded bg-black/65 px-0 text-[10px] text-cyan-200 hover:bg-cyan-500/20 hover:text-cyan-100', isCompareA && 'bg-cyan-500/30 text-cyan-100')}
                              >
                                  1
                              </Button>
                              <Button
                                size='xs'
                                type='button'
                                variant='ghost'
                                onClick={(): void => {
                                  setCompareVariantIds((prev) => [prev[0] === variant.id ? null : prev[0], variant.id]);
                                }}
                                title='Set as compare thumbnail 2'
                                aria-pressed={isCompareB}
                                className={cn('size-5 rounded bg-black/65 px-0 text-[10px] text-amber-200 hover:bg-amber-500/20 hover:text-amber-100', isCompareB && 'bg-amber-500/30 text-amber-100')}
                              >
                                  2
                              </Button>
                            </div>
                            <div className='flex items-center gap-1'>
                              <Button
                                size='xs'
                                type='button'
                                variant='ghost'
                                onClick={(): void => handleOpenVariantDetails(variant)}
                                aria-label={`View variant ${variant.index} details`}
                                title='View variant details'
                                className='size-6 rounded bg-black/65 hover:bg-blue-500/20'
                              >
                                <Eye className='size-4 shrink-0 stroke-[2.25] text-blue-200' />
                              </Button>
                              {canDeleteVariant ? (
                                <Button
                                  size='xs'
                                  type='button'
                                  variant='ghost'
                                  onClick={(): void => handleDeleteVariant(variant)}
                                  disabled={deleteSlotMutation.isPending}
                                  aria-label={`Delete variant ${variant.index}`}
                                  title='Delete variant'
                                  className='size-6 rounded bg-black/65 hover:bg-red-500/20'
                                >
                                  <Trash2 className='size-4 shrink-0 stroke-[2.25] text-red-200' />
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : visibleVariantThumbnails.length > 0 ? (
                  <div className='px-2 py-3 text-xs text-gray-500'>
                      No variants match this timestamp search.
                  </div>
                ) : (
                  <div className='px-2 py-3 text-xs text-gray-500'>
                      Start generation to prepare output slots under the canvas.
                  </div>
                )}
                {activeRunError ? (
                  <div className='mt-2 flex items-start justify-between gap-2 rounded border border-red-500/30 bg-red-500/10 p-2'>
                    <div className='text-[11px] text-red-300'>{activeRunError}</div>
                    <Button
                      type='button'
                      size='xs'
                      variant='ghost'
                      className='h-6 shrink-0 px-2 text-[10px] text-red-200 hover:text-red-100'
                      onClick={clearActiveRunError}
                    >
                        Dismiss
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
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
