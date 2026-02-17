'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Camera, Eye, EyeOff, Loader2, Locate, Trash2 } from 'lucide-react';
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

import { SplitVariantPreview } from './center-preview/SplitVariantPreview';
import { SplitViewControls } from './center-preview/SplitViewControls';
import { ToggleButtonGroup } from './ToggleButtonGroup';
import { VersionNodeDetailsModal } from './VersionNodeDetailsModal';
import { useGenerationActions, useGenerationState } from '../context/GenerationContext';
import { useMaskingActions, useMaskingState } from '../context/MaskingContext';
import { useProjectsState } from '../context/ProjectsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { useUiActions, useUiState } from '../context/UiContext';
import { useVersionGraphState } from '../context/VersionGraphContext';
import { estimateGenerationCost } from '../utils/generation-cost';
import { getImageStudioSlotImageSrc, isLikelyImageStudioErrorText } from '../utils/image-src';
import {
  asFiniteNumber,
  asObjectRecord,
  buildTimestampSearchText,
  clampSplitZoom,
  formatBytes,
  formatTimestamp,
  formatUsd,
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
const REVEAL_IN_TREE_EVENT = 'image-studio:reveal-in-tree';
const GENERATED_SOURCE_PATH_REGEX = /^\/uploads\/studio\/(?:center|crops|upscale)\/[^/]+\/([^/]+)\//i;

const resolveSourceSlotIdFromGeneratedPath = (slot: ImageStudioSlotRecord | null): string | null => {
  if (!slot) return null;
  const sourcePath = normalizeImagePath(slot.imageFile?.filepath ?? slot.imageUrl ?? null);
  if (!sourcePath) return null;
  const match = sourcePath.match(GENERATED_SOURCE_PATH_REGEX);
  const sourceSlotId = match?.[1]?.trim() ?? '';
  return sourceSlotId || null;
};

const isTreeRevealableCardSlot = (slot: ImageStudioSlotRecord | null): boolean => {
  if (!slot?.id) return false;
  const metadata = asObjectRecord(slot.metadata);
  if (!metadata) return true;

  const role = typeof metadata['role'] === 'string' ? metadata['role'].trim().toLowerCase() : '';
  const relationType = typeof metadata['relationType'] === 'string'
    ? metadata['relationType'].trim().toLowerCase()
    : '';

  const isGenerationDerived =
    role === 'generation' ||
    relationType.startsWith('generation:') ||
    relationType.startsWith('center:') ||
    relationType.startsWith('crop:') ||
    relationType.startsWith('upscale:');

  return !isGenerationDerived;
};

export function CenterPreview(): React.JSX.Element {
  const { isFocusMode, maskPreviewEnabled, centerGuidesEnabled } = useUiState();
  const { toggleFocusMode, registerPreviewCanvasViewportCropResolver } = useUiActions();
  const { projectId, projectsQuery } = useProjectsState();
  const {
    workingSlot,
    selectedSlot,
    selectedSlotId,
    previewMode,
    captureRef,
    slots,
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
  const [variantTooltip, setVariantTooltip] = useState<{
    variant: VariantThumbnailInfo;
    x: number;
    y: number;
  } | null>(null);
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
    return workingSlotImageSrc;
  }, [isCompositeSlot, compositeResultImage, canCompareWithSource, singleVariantView, sourceSlotImageSrc, workingSlotImageSrc]);

  const activeCanvasSlotId = useMemo((): string | null => {
    if (previewMode !== 'image' || splitVariantView) return null;
    if (canCompareWithSource && singleVariantView === 'source') {
      return sourceSlot?.id ?? null;
    }
    return workingSlot?.id ?? null;
  }, [canCompareWithSource, previewMode, singleVariantView, sourceSlot?.id, splitVariantView, workingSlot?.id]);
  const canRevealLoadedCardInTree = useMemo(
    () => isTreeRevealableCardSlot(workingSlot),
    [workingSlot]
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
        'h-[clamp(280px,46vh,520px)]',
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

  const variantThumbnails = useMemo((): VariantThumbnailInfo[] => {
    const rootSourceSlotId = rootVariantSourceSlotId;
    if (!rootSourceSlotId) return [];

    const isGenerationSlotLinkedToRoot = (slot: (typeof slots)[number]): boolean => {
      const metadata = asObjectRecord(slot.metadata) as SlotGenerationMetadata | null;
      if (!metadata) return false;
      const relationType = typeof metadata.relationType === 'string' ? metadata.relationType : '';
      const source = typeof metadata.sourceSlotId === 'string' ? metadata.sourceSlotId.trim() : '';
      const sourceIds = Array.isArray(metadata.sourceSlotIds)
        ? metadata.sourceSlotIds.filter(
          (value): value is string => typeof value === 'string' && value.trim().length > 0
        )
        : [];
      const linkedToSource = source === rootSourceSlotId || sourceIds.includes(rootSourceSlotId);
      const isGeneration =
        metadata.role === 'generation' ||
        relationType.startsWith('generation:') ||
        relationType.startsWith('center:') ||
        relationType.startsWith('crop:') ||
        relationType.startsWith('upscale:');
      const imageSrc = getImageStudioSlotImageSrc(slot, productImagesExternalBaseUrl);
      return linkedToSource && isGeneration && Boolean(imageSrc || slot.imageFileId);
    };

    const buildVariantFromSlot = (
      slot: (typeof slots)[number],
      fallbackIndex: number
    ): VariantThumbnailInfo => {
      const metadata = asObjectRecord(slot.metadata) as SlotGenerationMetadata | null;
      const generationParams = asObjectRecord(metadata?.generationParams);
      const generationRequest = asObjectRecord(metadata?.generationRequest);
      const generationCosts = asObjectRecord(metadata?.generationCosts);

      const model =
        (typeof generationParams?.['model'] === 'string' ? generationParams['model'] : null) ??
        (typeof generationRequest?.['model'] === 'string' ? generationRequest['model'] : null) ??
        null;
      const timestamp =
        (typeof generationParams?.['timestamp'] === 'string' ? generationParams['timestamp'] : null) ??
        (typeof generationRequest?.['timestamp'] === 'string' ? generationRequest['timestamp'] : null) ??
        null;
      const prompt =
        (typeof generationParams?.['prompt'] === 'string' ? generationParams['prompt'] : null) ??
        (typeof generationRequest?.['prompt'] === 'string' ? generationRequest['prompt'] : null) ??
        '';
      const outputCountCandidate =
        asFiniteNumber(metadata?.generationOutputCount) ??
        asFiniteNumber(generationParams?.['outputCount']) ??
        null;
      const outputCount = outputCountCandidate ?? 1;

      let tokenCostUsd = asFiniteNumber(generationCosts?.['tokenCostUsd']);
      let actualCostUsd = asFiniteNumber(generationCosts?.['actualCostUsd']);
      let costEstimated = generationCosts?.['estimated'] !== false;

      if ((tokenCostUsd === null || actualCostUsd === null) && model) {
        const estimate = estimateGenerationCost({
          prompt,
          model,
          outputCount,
        });
        if (tokenCostUsd === null) tokenCostUsd = estimate.promptCostUsdPerOutput;
        if (actualCostUsd === null) actualCostUsd = estimate.totalCostUsdPerOutput;
        costEstimated = true;
      }

      const slotImageFile = slot.imageFile ?? null;
      const resolvedSlotImageSrc = getImageStudioSlotImageSrc(slot, productImagesExternalBaseUrl);
      const rawSlotImageUrl = typeof slot.imageUrl === 'string' ? slot.imageUrl.trim() : '';
      const safeSlotImageUrl =
        rawSlotImageUrl && !isLikelyImageStudioErrorText(rawSlotImageUrl)
          ? rawSlotImageUrl
          : '';
      const output = slotImageFile
        ? {
          id: slotImageFile.id,
          filepath: slotImageFile.filepath,
          filename: slotImageFile.filename || slot.name || `Generated ${fallbackIndex}`,
          size: slotImageFile.size,
          width: slotImageFile.width,
          height: slotImageFile.height,
        }
        : slot.imageFileId || safeSlotImageUrl
          ? {
            id: slot.imageFileId ?? `slot:${slot.id}`,
            filepath: safeSlotImageUrl,
            filename: slot.name || `Generated ${fallbackIndex}`,
            size: 0,
            width: null,
            height: null,
          }
          : null;

      const imageSrc = resolvedSlotImageSrc || output?.filepath || null;
      const rawIndex =
        asFiniteNumber(metadata?.generationOutputIndex) ??
        asFiniteNumber(generationParams?.['outputIndex']) ??
        fallbackIndex;
      const index = Math.max(1, Math.floor(rawIndex));

      return {
        id: `slot:${slot.id}`,
        index,
        status: output ? 'completed' : 'failed',
        imageSrc,
        output,
        slotId: slot.id,
        model,
        timestamp,
        timestampLabel: formatTimestamp(timestamp),
        timestampSearchText: buildTimestampSearchText(timestamp),
        tokenCostUsd,
        actualCostUsd,
        costEstimated,
      };
    };

    const historicalVariants: VariantThumbnailInfo[] = slots
      .filter((slot) => isGenerationSlotLinkedToRoot(slot))
      .map((slot, index) => buildVariantFromSlot(slot, index + 1))
      .sort((a, b) => {
        const aTs = a.timestamp ? Date.parse(a.timestamp) : Number.NaN;
        const bTs = b.timestamp ? Date.parse(b.timestamp) : Number.NaN;
        if (Number.isFinite(aTs) && Number.isFinite(bTs) && aTs !== bTs) {
          return bTs - aTs;
        }
        return b.index - a.index;
      });

    const historicalSlotIds = new Set<string>(
      historicalVariants
        .map((variant) => variant.slotId)
        .filter((slotId): slotId is string => typeof slotId === 'string' && slotId.length > 0)
    );
    const normalizedRootSourceSlotId = rootSourceSlotId.trim();
    const normalizedActiveRunSourceSlotId = activeRunSourceSlotId?.trim() ?? '';
    const canShowActiveRunLandingSlots =
      !normalizedActiveRunSourceSlotId ||
      normalizedActiveRunSourceSlotId === normalizedRootSourceSlotId;

    const transientVariants = landingSlots
      .map((landingSlot): VariantThumbnailInfo | null => {
        const output = landingSlot.output ?? null;
        const normalizedOutputPath = normalizeImagePath(output?.filepath);
        const matchingSlots = slots.filter((slot) => {
          const metadata = asObjectRecord(slot.metadata);
          const runId = typeof metadata?.['generationRunId'] === 'string' ? metadata['generationRunId'] : null;
          const outputIndex = typeof metadata?.['generationOutputIndex'] === 'number'
            ? metadata['generationOutputIndex']
            : null;

          if (activeRunId && runId === activeRunId && outputIndex === landingSlot.index) {
            return true;
          }
          if (!output) {
            return false;
          }
          if (slot.imageFileId === output.id) {
            return true;
          }
          if (normalizedOutputPath) {
            if (normalizeImagePath(slot.imageFile?.filepath) === normalizedOutputPath) {
              return true;
            }
            if (normalizeImagePath(slot.imageUrl) === normalizedOutputPath) {
              return true;
            }
          }
          return false;
        });
        const matchedSlot = matchingSlots.find((slot) => {
          const metadata = asObjectRecord(slot.metadata);
          const runId = typeof metadata?.['generationRunId'] === 'string' ? metadata['generationRunId'] : null;
          const outputIndex = typeof metadata?.['generationOutputIndex'] === 'number'
            ? metadata['generationOutputIndex']
            : null;
          return Boolean(activeRunId && runId === activeRunId && outputIndex === landingSlot.index);
        }) ?? matchingSlots[0] ?? null;
        if (!matchedSlot || !isGenerationSlotLinkedToRoot(matchedSlot)) {
          if (!canShowActiveRunLandingSlots) {
            return null;
          }

          return {
            id: `run:${activeRunId ?? 'pending'}:${landingSlot.index}`,
            index: landingSlot.index,
            status: landingSlot.status,
            imageSrc: output?.filepath ?? null,
            output: output
              ? {
                id: output.id,
                filepath: output.filepath,
                filename: output.filename || `Generated ${landingSlot.index}`,
                size: output.size,
                width: output.width,
                height: output.height,
              }
              : null,
            slotId: null,
            model: null,
            timestamp: null,
            timestampLabel: formatTimestamp(null),
            timestampSearchText: buildTimestampSearchText(null),
            tokenCostUsd: null,
            actualCostUsd: null,
            costEstimated: false,
          };
        }

        if (historicalSlotIds.has(matchedSlot.id)) {
          return null;
        }

        const imageSrc =
          getImageStudioSlotImageSrc(matchedSlot, productImagesExternalBaseUrl) ?? output?.filepath ?? null;

        const metadata = asObjectRecord(matchedSlot.metadata) as SlotGenerationMetadata | null;
        const generationParams = asObjectRecord(metadata?.generationParams);
        const generationRequest = asObjectRecord(metadata?.generationRequest);
        const generationCosts = asObjectRecord(metadata?.generationCosts);

        const model =
          (typeof generationParams?.['model'] === 'string' ? generationParams['model'] : null) ??
          (typeof generationRequest?.['model'] === 'string' ? generationRequest['model'] : null) ??
          null;
        const timestamp =
          (typeof generationParams?.['timestamp'] === 'string' ? generationParams['timestamp'] : null) ??
          (typeof generationRequest?.['timestamp'] === 'string' ? generationRequest['timestamp'] : null) ??
          null;
        const prompt =
          (typeof generationParams?.['prompt'] === 'string' ? generationParams['prompt'] : null) ??
          (typeof generationRequest?.['prompt'] === 'string' ? generationRequest['prompt'] : null) ??
          '';
        const outputCountCandidate =
          asFiniteNumber(metadata?.generationOutputCount) ??
          asFiniteNumber(generationParams?.['outputCount']) ??
          (landingSlots.length > 0 ? landingSlots.length : null);
        const outputCount = outputCountCandidate ?? 1;

        let tokenCostUsd = asFiniteNumber(generationCosts?.['tokenCostUsd']);
        let actualCostUsd = asFiniteNumber(generationCosts?.['actualCostUsd']);
        let costEstimated = generationCosts?.['estimated'] !== false;

        if ((tokenCostUsd === null || actualCostUsd === null) && model) {
          const estimate = estimateGenerationCost({
            prompt,
            model,
            outputCount,
          });
          if (tokenCostUsd === null) tokenCostUsd = estimate.promptCostUsdPerOutput;
          if (actualCostUsd === null) actualCostUsd = estimate.totalCostUsdPerOutput;
          costEstimated = true;
        }

        return {
          id: `slot:${matchedSlot.id}`,
          index: landingSlot.index,
          status: landingSlot.status,
          imageSrc,
          output: output
            ? {
              id: output.id,
              filepath: output.filepath,
              filename: output.filename || `Generated ${landingSlot.index}`,
              size: output.size,
              width: output.width,
              height: output.height,
            }
            : null,
          slotId: matchedSlot.id,
          model,
          timestamp,
          timestampLabel: formatTimestamp(timestamp),
          timestampSearchText: buildTimestampSearchText(timestamp),
          tokenCostUsd,
          actualCostUsd,
          costEstimated,
        };
      })
      .filter((variant): variant is VariantThumbnailInfo => Boolean(variant));

    const deduped = new Map<string, VariantThumbnailInfo>();
    [...transientVariants, ...historicalVariants].forEach((variant) => {
      if (!deduped.has(variant.id)) {
        deduped.set(variant.id, variant);
      }
    });

    return Array.from(deduped.values());
  }, [
    activeRunId,
    activeRunSourceSlotId,
    landingSlots,
    productImagesExternalBaseUrl,
    rootVariantSourceSlotId,
    slots,
  ]);

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

    const resolveFallbackSlotId = (
      candidateSlots: typeof slots
    ): string | null => {
      if (variant.slotId && candidateSlots.some((slot) => slot.id === variant.slotId)) {
        return variant.slotId;
      }

      const matchedByRunMetadata = candidateSlots.find((slot) => {
        const metadata = asObjectRecord(slot.metadata);
        const runId = typeof metadata?.['generationRunId'] === 'string' ? metadata['generationRunId'] : null;
        const outputIndex = typeof metadata?.['generationOutputIndex'] === 'number'
          ? metadata['generationOutputIndex']
          : null;
        return Boolean(activeRunId && runId === activeRunId && outputIndex === variant.index);
      });
      if (matchedByRunMetadata) {
        return matchedByRunMetadata.id;
      }

      const output = variant.output;
      if (!output) return null;

      const matchedByFileId = candidateSlots.find((slot) => slot.imageFileId === output.id);
      if (matchedByFileId) {
        return matchedByFileId.id;
      }

      const outputPath = normalizeImagePath(output.filepath);
      if (!outputPath) return null;

      const matchedByPath = candidateSlots.find((slot) => {
        const imageFilePath = normalizeImagePath(slot.imageFile?.filepath);
        if (imageFilePath && imageFilePath === outputPath) return true;
        const imageUrlPath = normalizeImagePath(slot.imageUrl);
        return Boolean(imageUrlPath && imageUrlPath === outputPath);
      });
      return matchedByPath?.id ?? null;
    };

    try {
      let resolvedSlotId = resolveFallbackSlotId(slots);

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
          resolvedSlotId = resolveFallbackSlotId(candidateSlots);
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
    setPreviewMode,
    setSelectedSlotId,
    setTemporaryObjectUpload,
    setWorkingSlotId,
    slots,
    toast,
    variantLoadingId,
    workingSlot?.folderPath,
    workingSlot?.id,
  ]);

  const resolveVariantSlotId = useCallback(
    (
      variant: VariantThumbnailInfo,
      candidateSlots: ImageStudioSlotRecord[] = slots,
    ): string | null => {
      const directSlotId = variant.slotId?.trim() ?? '';
      if (directSlotId && candidateSlots.some((slot) => slot.id === directSlotId)) {
        return directSlotId;
      }

      if (variant.output?.id) {
        const matchedByFileId = candidateSlots.find((slot) => slot.imageFileId === variant.output?.id);
        if (matchedByFileId) return matchedByFileId.id;
      }

      const variantOutputPath = normalizeImagePath(variant.output?.filepath ?? variant.imageSrc);
      if (variantOutputPath) {
        const matchedByPath = candidateSlots.find((slot) => {
          const imageFilePath = normalizeImagePath(slot.imageFile?.filepath);
          if (imageFilePath && imageFilePath === variantOutputPath) return true;
          const imageUrlPath = normalizeImagePath(slot.imageUrl);
          return Boolean(imageUrlPath && imageUrlPath === variantOutputPath);
        });
        if (matchedByPath) return matchedByPath.id;
      }

      const runIdFromVariantId = variant.id.startsWith('run:')
        ? variant.id.split(':')[1]?.trim() ?? ''
        : '';
      const normalizedRunId = runIdFromVariantId || activeRunId?.trim() || '';
      const normalizedRootSourceId = rootVariantSourceSlotId?.trim() ?? '';
      if (normalizedRunId) {
        const matchedByRunMetadata = candidateSlots.find((slot) => {
          const metadata = asObjectRecord(slot.metadata);
          const runId = typeof metadata?.['generationRunId'] === 'string' ? metadata['generationRunId'].trim() : '';
          if (!runId || runId !== normalizedRunId) return false;
          const outputIndex =
            typeof metadata?.['generationOutputIndex'] === 'number' && Number.isFinite(metadata['generationOutputIndex'])
              ? metadata['generationOutputIndex']
              : null;
          if (outputIndex !== variant.index) return false;
          if (!normalizedRootSourceId) return true;

          const sourceSlotId = typeof metadata?.['sourceSlotId'] === 'string' ? metadata['sourceSlotId'].trim() : '';
          if (sourceSlotId && sourceSlotId === normalizedRootSourceId) return true;
          const sourceSlotIds = Array.isArray(metadata?.['sourceSlotIds'])
            ? metadata['sourceSlotIds']
              .filter((value): value is string => typeof value === 'string')
              .map((value: string) => value.trim())
              .filter(Boolean)
            : [];
          return sourceSlotIds.includes(normalizedRootSourceId);
        });
        if (matchedByRunMetadata) return matchedByRunMetadata.id;
      }

      return null;
    },
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
    const targetSlotId = workingSlot?.id ?? null;
    if (!targetSlotId) {
      toast('No card is currently loaded in the preview.', { variant: 'info' });
      return;
    }
    setSelectedSlotId(targetSlotId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(REVEAL_IN_TREE_EVENT, { detail: { slotId: targetSlotId } }));
    }
  }, [setSelectedSlotId, toast, workingSlot?.id]);

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

  const detailsNode = useMemo<VersionNode | null>(() => {
    if (!detailsSlot) return null;
    const metadata = asObjectRecord(detailsSlot.metadata) as SlotGenerationMetadata | null;
    const sourceSlotIds = Array.isArray(metadata?.sourceSlotIds)
      ? metadata.sourceSlotIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      : [];
    const sourceSlotId =
      typeof metadata?.sourceSlotId === 'string' && metadata.sourceSlotId.trim().length > 0
        ? metadata.sourceSlotId.trim()
        : null;
    const parentIds = sourceSlotIds.length > 0
      ? sourceSlotIds
      : sourceSlotId
        ? [sourceSlotId]
        : [];
    const childIds = slots
      .filter((slot) => {
        if (slot.id === detailsSlot.id) return false;
        const slotMetadata = asObjectRecord(slot.metadata) as SlotGenerationMetadata | null;
        if (!slotMetadata) return false;
        if (slotMetadata.sourceSlotId === detailsSlot.id) return true;
        return Array.isArray(slotMetadata.sourceSlotIds) && slotMetadata.sourceSlotIds.includes(detailsSlot.id);
      })
      .map((slot) => slot.id);
    let nodeType: VersionNode['type'] = 'base';
    if (metadata?.role === 'composite') {
      nodeType = 'composite';
    } else if (metadata?.role === 'merge' || parentIds.length > 1) {
      nodeType = 'merge';
    } else if (metadata?.role === 'generation' || parentIds.length === 1) {
      nodeType = 'generation';
    }
    const label = detailsSlot.name?.trim() || detailsSlot.id;
    return {
      id: detailsSlot.id,
      label,
      type: nodeType,
      parentIds,
      childIds,
      hasMask: Boolean(asObjectRecord(metadata?.maskData)),
      slot: detailsSlot,
      depth: 0,
      x: 0,
      y: 0,
      descendantCount: childIds.length,
    };
  }, [detailsSlot, slots]);

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

  const focusToggleButton = typeof document !== 'undefined'
    ? createPortal(
      <Button size='xs'
        type='button'
        variant='outline'
        onClick={toggleFocusMode}
        title={isFocusMode ? 'Show side panels' : 'Show canvas only'}
        aria-label={isFocusMode ? 'Show side panels' : 'Show canvas only'}
        className='fixed left-1/2 top-0 z-40 h-8 w-10 -translate-x-1/2 rounded-b-lg rounded-t-none border-t-0 bg-background/90 px-0 shadow-md backdrop-blur-sm animate-in fade-in slide-in-from-top-2'
      >
        {isFocusMode ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
      </Button>,
      document.body
    )
    : null;

  const variantPointerTooltip = typeof document !== 'undefined' && variantTooltip && variantTooltipPosition
    ? createPortal(
      <div
        className='pointer-events-none fixed z-50 w-[250px] rounded border border-border/60 bg-black/85 p-2 text-[10px] text-gray-100 shadow-xl backdrop-blur-sm'
        style={{ left: variantTooltipPosition.left, top: variantTooltipPosition.top }}
      >
        <div className='truncate'><span className='text-gray-400'>Model:</span> {variantTooltip.variant.model || 'n/a'}</div>
        <div className='truncate'><span className='text-gray-400'>Timestamp:</span> {variantTooltip.variant.timestampLabel}</div>
        <div>
          <span className='text-gray-400'>Resolution:</span>{' '}
          {variantTooltip.variant.output?.width && variantTooltip.variant.output?.height
            ? `${variantTooltip.variant.output.width}x${variantTooltip.variant.output.height}`
            : 'n/a'}
        </div>
        <div><span className='text-gray-400'>File size:</span> {formatBytes(variantTooltip.variant.output?.size ?? null)}</div>
        <div><span className='text-gray-400'>Token cost:</span> {formatUsd(variantTooltip.variant.tokenCostUsd)}</div>
        <div>
          <span className='text-gray-400'>Actual cost:</span> {formatUsd(variantTooltip.variant.actualCostUsd)}
          {variantTooltip.variant.costEstimated ? ' (est.)' : ''}
        </div>
      </div>,
      document.body
    )
    : null;

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
      {focusToggleButton}
      {variantPointerTooltip}
      <div className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-3 pt-0'>
        <div
          className={cn(
            'grid min-h-0 flex-1 gap-3',
            showVariantPanel ? 'grid-rows-[minmax(0,1fr)_auto]' : 'grid-rows-[minmax(0,1fr)]',
          )}
        >
          <div className='relative min-h-0'>
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
              <div className='absolute bottom-2 right-2 z-20'>
                <Button size='xs'
                  type='button'
                  variant='outline'
                  onClick={handleRevealInTreeFromCanvas}
                  title='Reveal loaded card in tree'
                  aria-label='Reveal loaded card in tree'
                  className='h-7 bg-black/70 px-2 text-[11px] text-gray-100 backdrop-blur-sm'
                >
                  <Locate className='mr-1.5 size-3.5' />
                  Reveal in tree
                </Button>
              </div>
            ) : null}
          </div>
          {showVariantPanel ? (
            <div className='shrink-0 overflow-hidden rounded-lg border border-border/60 bg-card/40 p-2'>
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
