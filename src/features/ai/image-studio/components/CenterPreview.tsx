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
import { api, ApiError } from '@/shared/lib/api-client';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Button, Input, useToast } from '@/shared/ui';

import { SplitVariantPreview } from './center-preview/SplitVariantPreview';
import { SplitViewControls } from './center-preview/SplitViewControls';
import { ToggleButtonGroup } from './ToggleButtonGroup';
import { useGenerationActions, useGenerationState } from '../context/GenerationContext';
import { useMaskingActions, useMaskingState } from '../context/MaskingContext';
import { useProjectsState } from '../context/ProjectsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { useUiActions, useUiState } from '../context/UiContext';
import { useVersionGraphState } from '../context/VersionGraphContext';
import { estimateGenerationCost } from '../utils/generation-cost';
import { getImageStudioSlotImageSrc } from '../utils/image-src';
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

import type { SlotGenerationMetadata } from '../types';

const PREVIEW_MODE_OPTIONS = [
  { value: 'image', label: 'Image' },
  { value: '3d', label: '3D' },
] as const;
const REVEAL_IN_TREE_EVENT = 'image-studio:reveal-in-tree';

export function CenterPreview(): React.JSX.Element {
  const { isFocusMode, maskPreviewEnabled } = useUiState();
  const { toggleFocusMode } = useUiActions();
  const { projectId } = useProjectsState();
  const { workingSlot, previewMode, captureRef, slots } = useSlotsState();
  const {
    setPreviewMode,
    setSelectedSlotId,
    setWorkingSlotId,
    setTemporaryObjectUpload,
    deleteSlotMutation,
  } = useSlotsActions();
  const settingsStore = useSettingsStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { landingSlots, isRunInFlight, activeRunError, activeRunId } = useGenerationState();
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
  const [leftSplitZoom, setLeftSplitZoom] = useState(1);
  const [rightSplitZoom, setRightSplitZoom] = useState(1);
  const [dismissedVariantKeys, setDismissedVariantKeys] = useState<Set<string>>(new Set());
  const pendingDismissedVariantHydrationKeyRef = useRef<string | null>(null);
  const [variantLoadingId, setVariantLoadingId] = useState<string | null>(null);
  const [variantTooltip, setVariantTooltip] = useState<{
    variant: VariantThumbnailInfo;
    x: number;
    y: number;
  } | null>(null);

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
    return fallbackSourceSlotId ?? null;
  }, [workingSlotMetadata]);

  const sourceSlot = useMemo(
    () => (sourceSlotId ? slots.find((slot) => slot.id === sourceSlotId) ?? null : null),
    [sourceSlotId, slots]
  );

  const sourceSlotImageSrc = useMemo(
    () => getImageStudioSlotImageSrc(sourceSlot, productImagesExternalBaseUrl),
    [productImagesExternalBaseUrl, sourceSlot]
  );

  const canCompareWithSource = useMemo(
    () =>
      previewMode === 'image' &&
      Boolean(
        workingSlot?.id &&
        workingSlotImageSrc &&
        sourceSlotImageSrc &&
        sourceSlot?.id &&
        sourceSlot.id !== workingSlot.id
      ),
    [previewMode, sourceSlot?.id, sourceSlotImageSrc, workingSlot?.id, workingSlotImageSrc]
  );

  const activeCanvasImageSrc = useMemo(() => {
    // Composite preview: use composited result image when available
    if (isCompositeSlot && compositeResultImage) return compositeResultImage;
    if (canCompareWithSource && singleVariantView === 'source') return sourceSlotImageSrc;
    return workingSlotImageSrc;
  }, [isCompositeSlot, compositeResultImage, canCompareWithSource, singleVariantView, sourceSlotImageSrc, workingSlotImageSrc]);

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

  useEffect(() => {
    setSingleVariantView('variant');
    setSplitVariantView(false);
  }, [workingSlot?.id]);

  useEffect(() => {
    if (canCompareWithSource) return;
    setSingleVariantView('variant');
    setSplitVariantView(false);
  }, [canCompareWithSource]);

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
    const rootSourceSlotId = sourceSlotId ?? workingSlot?.id ?? null;

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
      const output = slotImageFile
        ? {
          id: slotImageFile.id,
          filepath: slotImageFile.filepath,
          filename: slotImageFile.filename || slot.name || `Generated ${fallbackIndex}`,
          size: slotImageFile.size,
          width: slotImageFile.width,
          height: slotImageFile.height,
        }
        : slot.imageFileId || slot.imageUrl
          ? {
            id: slot.imageFileId ?? `slot:${slot.id}`,
            filepath: slot.imageUrl ?? '',
            filename: slot.name || `Generated ${fallbackIndex}`,
            size: 0,
            width: null,
            height: null,
          }
          : null;

      const imageSrc = getImageStudioSlotImageSrc(slot, productImagesExternalBaseUrl) || output?.filepath || null;
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

    const historicalVariants: VariantThumbnailInfo[] = rootSourceSlotId
      ? slots
        .filter((slot) => {
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
          const isGeneration = metadata.role === 'generation' || relationType === 'generation:output';
          const imageSrc = getImageStudioSlotImageSrc(slot, productImagesExternalBaseUrl);
          return linkedToSource && isGeneration && Boolean(imageSrc || slot.imageFileId || slot.imageUrl);
        })
        .map((slot, index) => buildVariantFromSlot(slot, index + 1))
        .sort((a, b) => {
          const aTs = a.timestamp ? Date.parse(a.timestamp) : Number.NaN;
          const bTs = b.timestamp ? Date.parse(b.timestamp) : Number.NaN;
          if (Number.isFinite(aTs) && Number.isFinite(bTs) && aTs !== bTs) {
            return bTs - aTs;
          }
          return b.index - a.index;
        })
      : [];

    const historicalSlotIds = new Set<string>(
      historicalVariants
        .map((variant) => variant.slotId)
        .filter((slotId): slotId is string => typeof slotId === 'string' && slotId.length > 0)
    );

    const transientVariants = landingSlots
      .map((landingSlot): VariantThumbnailInfo | null => {
        const output = landingSlot.output ?? null;
        if (!output) {
          return {
            id: `landing:${landingSlot.id}`,
            index: landingSlot.index,
            status: landingSlot.status,
            imageSrc: null,
            output: null,
            slotId: null,
            model: null,
            timestamp: null,
            timestampLabel: 'n/a',
            timestampSearchText: '',
            tokenCostUsd: null,
            actualCostUsd: null,
            costEstimated: true,
          };
        }

        const normalizedOutputPath = normalizeImagePath(output.filepath);
        const matchingSlots = slots.filter((slot) => {
          const metadata = asObjectRecord(slot.metadata);
          const runId = typeof metadata?.['generationRunId'] === 'string' ? metadata['generationRunId'] : null;
          const outputIndex = typeof metadata?.['generationOutputIndex'] === 'number'
            ? metadata['generationOutputIndex']
            : null;

          if (activeRunId && runId === activeRunId && outputIndex === landingSlot.index) {
            return true;
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

        if (matchedSlot?.id && historicalSlotIds.has(matchedSlot.id)) {
          return null;
        }

        const imageSrc =
          getImageStudioSlotImageSrc(matchedSlot, productImagesExternalBaseUrl) ||
          output.filepath;

        const metadata = asObjectRecord(matchedSlot?.metadata) as SlotGenerationMetadata | null;
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
          id: matchedSlot ? `slot:${matchedSlot.id}` : `landing:${landingSlot.id}`,
          index: landingSlot.index,
          status: landingSlot.status,
          imageSrc,
          output: {
            id: output.id,
            filepath: output.filepath,
            filename: output.filename || `Generated ${landingSlot.index}`,
            size: output.size,
            width: output.width,
            height: output.height,
          },
          slotId: matchedSlot?.id ?? null,
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
    landingSlots,
    productImagesExternalBaseUrl,
    slots,
    sourceSlotId,
    workingSlot?.id,
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

  const handleToggleSourceVariantView = useCallback((): void => {
    setSplitVariantView(false);
    setSingleVariantView((current) => (current === 'variant' ? 'source' : 'variant'));
  }, []);

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
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`Delete variant "${variantLabel}"?`);
      if (!confirmed) return;
    }

    const dismissVariantFromUi = (): void => {
      setDismissedVariantKeys((current) => {
        const next = new Set(current);
        buildVariantDismissKeys(variant).forEach((key) => {
          next.add(key);
        });
        return next;
      });
      setVariantTooltip((current) => (current?.variant.id === variant.id ? null : current));
      if (variant.status === 'failed') {
        clearActiveRunError();
      }
    };

    const resolveVariantSlotId = (): string | null => {
      if (variant.slotId && slots.some((slot) => slot.id === variant.slotId)) {
        return variant.slotId;
      }

      if (variant.output?.id) {
        const matchedByFileId = slots.find((slot) => slot.imageFileId === variant.output?.id);
        if (matchedByFileId) return matchedByFileId.id;
      }

      const variantOutputPath = normalizeImagePath(variant.output?.filepath ?? variant.imageSrc);
      if (variantOutputPath) {
        const matchedByPath = slots.find((slot) => {
          const imageFilePath = normalizeImagePath(slot.imageFile?.filepath);
          if (imageFilePath && imageFilePath === variantOutputPath) return true;
          const imageUrlPath = normalizeImagePath(slot.imageUrl);
          return Boolean(imageUrlPath && imageUrlPath === variantOutputPath);
        });
        if (matchedByPath) return matchedByPath.id;
      }

      return null;
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

    const targetSlotId = resolveVariantSlotId();
    if (!targetSlotId) {
      void deleteVariantAssetFallback()
        .then(() => {
          dismissVariantFromUi();
        })
        .catch((error: unknown) => {
          toast(error instanceof Error ? error.message : 'Failed to delete variant.', { variant: 'error' });
        });
      return;
    }

    void deleteSlotMutation
      .mutateAsync(targetSlotId)
      .then(() => {
        if (workingSlot?.id === targetSlotId) {
          setWorkingSlotId(null);
        }
        dismissVariantFromUi();
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) {
          void deleteVariantAssetFallback()
            .then(() => {
              if (workingSlot?.id === targetSlotId) {
                setWorkingSlotId(null);
              }
              dismissVariantFromUi();
            })
            .catch((fallbackError: unknown) => {
              toast(
                fallbackError instanceof Error ? fallbackError.message : 'Failed to delete variant.',
                { variant: 'error' }
              );
            });
          return;
        }
        toast(error instanceof Error ? error.message : 'Failed to delete variant.', { variant: 'error' });
      });
  }, [
    buildVariantDismissKeys,
    deleteSlotMutation,
    projectId,
    setWorkingSlotId,
    slots,
    toast,
    workingSlot?.id,
    clearActiveRunError,
  ]);

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
        <div className='grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-3'>
          <div className='relative min-h-0'>
            <VectorDrawingProvider value={vectorContextValue}>
              {previewMode === '3d' && workingSlot?.asset3dId ? (
                <Viewer3D
                  modelUrl={`/api/assets3d/${workingSlot.asset3dId}/file`}
                  allowUserControls
                  captureRef={captureRef}
                  className='h-full w-full'
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
                  key={workingSlot?.id ?? 'canvas-empty'}
                  maskPreviewEnabled={maskPreviewEnabled}
                  maskPreviewShapes={liveMaskShapes}
                  maskPreviewInvert={maskInvert}
                  maskPreviewOpacity={0.5}
                  maskPreviewFeather={maskFeather}
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
            {canCompareWithSource ? (
              <SplitViewControls
                singleVariantView={singleVariantView}
                splitVariantView={splitVariantView}
                onToggleSourceVariantView={handleToggleSourceVariantView}
                onToggleSplitVariantView={handleToggleSplitVariantView}
              />
            ) : null}
            <div className='absolute bottom-2 left-2 z-20'>
              <Button size='xs'
                type='button'
                variant='outline'
                onClick={handleRevealInTreeFromCanvas}
                disabled={!workingSlot?.id}
                title='Reveal loaded card in tree'
                aria-label='Reveal loaded card in tree'
                className='h-7 bg-black/70 px-2 text-[11px] text-gray-100 backdrop-blur-sm disabled:opacity-60'
              >
                <Locate className='mr-1.5 size-3.5' />
                Reveal in tree
              </Button>
            </div>
          </div>
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
                        ? 'border-emerald-400/40 bg-emerald-500/5'
                        : variant.status === 'failed'
                          ? 'border-red-400/40 bg-red-500/5'
                          : 'border-border/60 bg-card/30';
                    const activeClasses = isActive
                      ? 'border-sky-400/80 bg-sky-500/15 ring-2 ring-sky-400/70'
                      : '';

                    return (
                      <div key={variant.id} className='relative w-28 shrink-0'>
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
                          className={`group relative w-full overflow-hidden rounded border p-1 text-left transition ${statusClasses} ${activeClasses}`}
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
                        {canDeleteVariant ? (
                          <Button size='xs'
                            type='button'
                            variant='ghost'
                            onClick={(): void => handleDeleteVariant(variant)}
                            disabled={deleteSlotMutation.isPending}
                            aria-label={`Delete variant ${variant.index}`}
                            title='Delete variant'
                            className='absolute right-1 top-1 z-10 size-5 rounded bg-black/65 text-red-200 hover:bg-red-500/20 hover:text-red-100'
                          >
                            <Trash2 className='size-3.5' />
                          </Button>
                        ) : null}
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
                <div className='mt-2 text-[11px] text-red-300'>{activeRunError}</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
