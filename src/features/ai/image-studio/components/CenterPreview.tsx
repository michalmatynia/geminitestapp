'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Camera, Eye, EyeOff, Loader2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { studioKeys } from '@/features/ai/image-studio/hooks/useImageStudioQueries';
import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import { VectorDrawingCanvas, VectorDrawingProvider } from '@/features/vector-drawing';
import { Viewer3D } from '@/features/viewer3d/components/Viewer3D';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { UnifiedButton, UnifiedInput, useToast } from '@/shared/ui';

import { ToggleButtonGroup } from './ToggleButtonGroup';
import { useGenerationState } from '../context/GenerationContext';
import { useMaskingActions, useMaskingState } from '../context/MaskingContext';
import { useProjectsState } from '../context/ProjectsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { useUiActions, useUiState } from '../context/UiContext';
import { useVersionGraphState } from '../context/VersionGraphContext';
import { estimateGenerationCost } from '../utils/generation-cost';
import { getImageStudioSlotImageSrc } from '../utils/image-src';

import type { SlotGenerationMetadata } from '../types';

const PREVIEW_MODE_OPTIONS = [
  { value: 'image', label: 'Image' },
  { value: '3d', label: '3D' },
] as const;

type VariantThumbnailInfo = {
  id: string;
  index: number;
  status: 'pending' | 'completed' | 'failed';
  imageSrc: string | null;
  output: {
    id: string;
    filepath: string;
    filename: string;
    size: number;
    width: number | null;
    height: number | null;
  } | null;
  slotId: string | null;
  model: string | null;
  timestamp: string | null;
  timestampLabel: string;
  timestampSearchText: string;
  tokenCostUsd: number | null;
  actualCostUsd: number | null;
  costEstimated: boolean;
};

const asObjectRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
};

const formatBytes = (value: number | null): string => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 'n/a';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const precision = unitIndex === 0 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
};

const formatUsd = (value: number | null): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'n/a';
  return `$${value.toFixed(4)}`;
};

const formatTimestamp = (value: string | null): string => {
  if (!value) return 'n/a';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const buildTimestampSearchText = (value: string | null): string => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.toLowerCase();
  return `${value} ${parsed.toISOString()} ${parsed.toLocaleDateString()} ${parsed.toLocaleTimeString()} ${parsed.toLocaleString()}`.toLowerCase();
};

export function CenterPreview(): React.JSX.Element {
  const { isFocusMode, maskPreviewEnabled } = useUiState();
  const { toggleFocusMode } = useUiActions();
  const { projectId } = useProjectsState();
  const { workingSlot, previewMode, captureRef, slots } = useSlotsState();
  const { setPreviewMode, setSelectedSlotId, setWorkingSlotId } = useSlotsActions();
  const settingsStore = useSettingsStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { landingSlots, isRunInFlight, activeRunError, activeRunId } = useGenerationState();

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
  const [variantTooltip, setVariantTooltip] = useState<{
    variant: VariantThumbnailInfo;
    x: number;
    y: number;
  } | null>(null);

  const productImagesExternalBaseUrl =
    settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;

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

  const variantThumbnails = useMemo((): VariantThumbnailInfo[] => {
    return landingSlots.map((landingSlot): VariantThumbnailInfo => {
      const output = landingSlot.output ?? null;
      if (!output) {
        return {
          id: landingSlot.id,
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

      const matchingSlots = slots.filter((slot) => slot.imageFileId === output.id);
      const matchedSlot = matchingSlots.find((slot) => {
        const metadata = asObjectRecord(slot.metadata);
        const runId = typeof metadata?.['generationRunId'] === 'string' ? metadata['generationRunId'] : null;
        return Boolean(activeRunId && runId === activeRunId);
      }) ?? matchingSlots[0] ?? null;
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
        id: landingSlot.id,
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
    });
  }, [activeRunId, landingSlots, productImagesExternalBaseUrl, slots]);

  const normalizedVariantTimestampQuery = variantTimestampQuery.trim().toLowerCase();
  const filteredVariantThumbnails = useMemo((): VariantThumbnailInfo[] => {
    if (!normalizedVariantTimestampQuery) return variantThumbnails;
    return variantThumbnails.filter((variant) =>
      variant.timestampSearchText.includes(normalizedVariantTimestampQuery)
    );
  }, [normalizedVariantTimestampQuery, variantThumbnails]);

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

  const handleLoadVariantToCanvas = useCallback((slotId: string | null): void => {
    if (!slotId) {
      toast('Variant is still syncing to card slots. Try again in a second.', { variant: 'info' });
      return;
    }
    setSingleVariantView('variant');
    setSplitVariantView(false);
    setSelectedSlotId(slotId);
    setWorkingSlotId(slotId);
    setPreviewMode('image');
  }, [setPreviewMode, setSelectedSlotId, setWorkingSlotId, toast]);

  const handleToggleSourceVariantView = useCallback((): void => {
    setSplitVariantView(false);
    setSingleVariantView((current) => (current === 'variant' ? 'source' : 'variant'));
  }, []);

  const handleToggleSplitVariantView = useCallback((): void => {
    setSplitVariantView((current) => !current);
    setSingleVariantView('variant');
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
      void queryClient.invalidateQueries({ queryKey: studioKeys.slots(projectId) });
      toast('Screenshot saved and attached to slot.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save screenshot.', { variant: 'error' });
    } finally {
      setScreenshotBusy(false);
    }
  }, [captureRef, projectId, queryClient, toast, workingSlot]);

  const focusToggleButton = typeof document !== 'undefined'
    ? createPortal(
      <UnifiedButton
        type='button'
        variant='outline'
        size='sm'
        onClick={toggleFocusMode}
        title={isFocusMode ? 'Show side panels' : 'Show canvas only'}
        aria-label={isFocusMode ? 'Show side panels' : 'Show canvas only'}
        className='fixed left-1/2 top-0 z-40 h-8 w-10 -translate-x-1/2 rounded-b-lg rounded-t-none border-t-0 bg-background/90 px-0 shadow-md backdrop-blur-sm animate-in fade-in slide-in-from-top-2'
      >
        {isFocusMode ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
      </UnifiedButton>,
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
            <UnifiedButton
              variant='outline'
              size='sm'
              onClick={() => { void handleSaveScreenshot(); }}
              disabled={screenshotBusy}
              title='Capture current 3D frame and attach it to this slot'
            >
              {screenshotBusy ? <Loader2 className='mr-2 size-4 animate-spin' /> : <Camera className='mr-2 size-4' />}
              Save Shot
            </UnifiedButton>
          ) : null}
        </div>
        <div />
        <div />
      </div>
      {focusToggleButton}
      {variantPointerTooltip}
      <div className='flex min-h-0 flex-1 flex-col gap-3 px-4 pb-3 pt-0'>
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
                <div className='grid h-full grid-cols-2 gap-2 rounded border border-border/60 bg-background/20 p-2'>
                  <div className='relative min-h-0 overflow-hidden rounded border border-border/60 bg-card/30'>
                    <div className='absolute left-1 top-1 z-10 rounded bg-black/65 px-1.5 py-0.5 text-[10px] text-gray-100'>
                      Source
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sourceSlotImageSrc}
                      alt='Source image'
                      className='h-full w-full object-contain'
                    />
                  </div>
                  <div className='relative min-h-0 overflow-hidden rounded border border-border/60 bg-card/30'>
                    <div className='absolute left-1 top-1 z-10 rounded bg-black/65 px-1.5 py-0.5 text-[10px] text-gray-100'>
                      Variant
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={workingSlotImageSrc}
                      alt='Generated variant'
                      className='h-full w-full object-contain'
                    />
                  </div>
                </div>
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
              <div className='absolute bottom-2 left-2 z-20 flex items-center gap-2'>
                <UnifiedButton
                  type='button'
                  size='sm'
                  variant='outline'
                  onClick={handleToggleSourceVariantView}
                  disabled={splitVariantView}
                  className='h-7 bg-background/90 px-2 text-[11px] backdrop-blur'
                  title='Switch between source image and generated variant'
                >
                  {singleVariantView === 'variant' ? 'Show Source' : 'Show Variant'}
                </UnifiedButton>
                <UnifiedButton
                  type='button'
                  size='sm'
                  variant='outline'
                  onClick={handleToggleSplitVariantView}
                  className='h-7 bg-background/90 px-2 text-[11px] backdrop-blur'
                  title='Split canvas: source on left, variant on right'
                >
                  {splitVariantView ? 'Single View' : 'Split View'}
                </UnifiedButton>
              </div>
            ) : null}
          </div>
          <div className='shrink-0 overflow-hidden rounded-lg border border-border/60 bg-card/40 p-2'>
            <div className='mb-2 flex items-center gap-2'>
              <UnifiedInput
                value={variantTimestampQuery}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  setVariantTimestampQuery(event.target.value);
                }}
                placeholder='Search variants by timestamp'
                className='h-8 text-xs'
                aria-label='Search generated variants by timestamp'
              />
              <span className='shrink-0 text-[11px] text-gray-400'>
                {filteredVariantThumbnails.length}/{variantThumbnails.length}
              </span>
            </div>
            <div className='overflow-x-auto overflow-y-hidden pb-1 pr-1'>
              {filteredVariantThumbnails.length > 0 ? (
                <div className='flex w-max min-w-full gap-2'>
                  {filteredVariantThumbnails.map((variant) => (
                    <button
                      key={variant.id}
                      type='button'
                      onClick={(): void => handleLoadVariantToCanvas(variant.slotId)}
                      onMouseEnter={(event): void => handleVariantTooltipMove(event, variant)}
                      onMouseMove={(event): void => handleVariantTooltipMove(event, variant)}
                      onMouseLeave={(): void => setVariantTooltip(null)}
                      onBlur={(): void => setVariantTooltip(null)}
                      disabled={!variant.output}
                      className={`group relative w-28 shrink-0 overflow-hidden rounded border p-1 text-left transition ${
                        variant.status === 'completed'
                          ? 'border-emerald-400/40 bg-emerald-500/5'
                          : variant.status === 'failed'
                            ? 'border-red-400/40 bg-red-500/5'
                            : 'border-border/60 bg-card/30'
                      }`}
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
                  ))}
                </div>
              ) : variantThumbnails.length > 0 ? (
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
