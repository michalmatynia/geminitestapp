'use client';

import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import { api } from '@/shared/lib/api-client';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';

import { useMaskingState, useMaskingActions, type MaskingState } from '../context/MaskingContext';
import { useProjectsState } from '../context/ProjectsContext';
import { useSettingsState, useSettingsActions } from '../context/SettingsContext';
import { useSlotsState, useSlotsActions } from '../context/SlotsContext';
import { useUiActions, useUiState } from '../context/UiContext';
import { imageStudioAutoScalerResponseSchema } from '../contracts/autoscaler';
import { imageStudioCenterResponseSchema } from '../contracts/center';
import { createGenerationToolbarActionHandlers } from './generation-toolbar/generation-toolbar-action-handlers';
import { GenerationToolbarAutoScalerSection } from './generation-toolbar/GenerationToolbarAutoScalerSection';
import { GenerationToolbarCenterSection } from './generation-toolbar/GenerationToolbarCenterSection';
import { GenerationToolbarCropSection } from './generation-toolbar/GenerationToolbarCropSection';
import { GenerationToolbarDefaultsSection } from './generation-toolbar/GenerationToolbarDefaultsSection';
import {
  autoScaleCanvasImageObject,
  buildAutoScalerRequestId,
  buildCenterRequestId,
  centerCanvasImageObject,
  dataUrlToUploadBlob,
  isAutoScalerAbortError,
  isClientAutoScalerCrossOriginError,
  isCenterAbortError,
  isClientCenterCrossOriginError,
  layoutCanvasImageObject,
  loadImageElement,
  hasCanvasOverflowFromImageFrame,
  mapImageCropRectToCanvasRect,
  polygonsFromShapes,
  renderMaskDataUrlFromPolygons,
  resolveCanvasOverflowCropRect,
  resolveCropRectFromShapesWithDiagnostics,
  resolveClientProcessingImageSrc,
  shapeHasUsableCropGeometry,
  withAutoScalerRetry,
  withCenterRetry,
  type CropCanvasContext,
  type CropRectResolutionDiagnostics,
  type CropRect,
  type ImageContentFrame,
  type MaskShapeForExport,
  type UpscaleSmoothingQuality,
} from './generation-toolbar/GenerationToolbarImageUtils';
import { GenerationToolbarMaskSection } from './generation-toolbar/GenerationToolbarMaskSection';
import { GenerationToolbarUpscaleSection } from './generation-toolbar/GenerationToolbarUpscaleSection';
import { studioKeys } from '../hooks/useImageStudioQueries';
import {
  buildImageStudioAnalysisSourceSignature,
  clearImageStudioAnalysisApplyIntent,
  IMAGE_STUDIO_ANALYSIS_PLAN_CHANGED_EVENT,
  loadImageStudioAnalysisApplyIntent,
  loadImageStudioAnalysisPlanSnapshot,
  type ImageStudioAnalysisApplyTarget,
  type ImageStudioAnalysisPlanSnapshot,
  type ImageStudioAnalysisSharedLayout,
} from '../utils/analysis-bridge';
import { getImageStudioSlotImageSrc } from '../utils/image-src';
import {
  buildObjectLayoutPresetOptions,
  deleteObjectLayoutCustomPreset,
  getObjectLayoutPresetValuesFromOption,
  IMAGE_STUDIO_OBJECT_LAYOUT_PRESETS_CHANGED_EVENT,
  loadObjectLayoutAdvancedDefaults,
  loadObjectLayoutCustomPresets,
  resolveCustomPresetIdFromOptionValue,
  resolveObjectLayoutPresetOptionValue,
  saveObjectLayoutCustomPreset,
  saveObjectLayoutAdvancedDefaults,
  type ObjectLayoutCustomPreset,
  type ObjectLayoutPresetOptionValue,
} from '../utils/object-layout-presets';
import { getImageStudioDocTooltip } from '../utils/studio-docs';
import { normalizeImageStudioModelPresets } from '../utils/studio-settings';

import type { ImageStudioAutoScalerResponse } from '../contracts/autoscaler';
import type {
  ImageStudioCenterDetectionMode,
  ImageStudioCenterResponse,
  ImageStudioCenterShadowPolicy,
} from '../contracts/center';
import type { ImageStudioSlotRecord, StudioSlotsResponse } from '../types';

type MaskAttachMode = 'client_canvas_polygon' | 'server_polygon';
type UpscaleMode = 'client_canvas' | 'server_sharp';
type UpscaleStrategy = 'scale' | 'target_resolution';
type CropMode = 'client_bbox' | 'server_bbox';
type CenterMode =
  | 'client_alpha_bbox'
  | 'server_alpha_bbox'
  | 'client_object_layout_v1'
  | 'server_object_layout_v1';
type AutoScalerMode =
  | 'client_auto_scaler_v1'
  | 'server_auto_scaler_v1';
type CenterDetectionMode = ImageStudioCenterDetectionMode;
type CenterShadowPolicy = ImageStudioCenterShadowPolicy;
type CenterActionResponse = ImageStudioCenterResponse;
type AutoScaleActionResponse = ImageStudioAutoScalerResponse;

type CropStatus =
  | 'idle'
  | 'resolving'
  | 'preparing'
  | 'uploading'
  | 'processing'
  | 'persisting';

type CenterStatus =
  | 'idle'
  | 'resolving'
  | 'preparing'
  | 'uploading'
  | 'processing'
  | 'persisting';

type UpscaleStatus =
  | 'idle'
  | 'resolving'
  | 'preparing'
  | 'uploading'
  | 'processing'
  | 'persisting';
type AutoScaleStatus =
  | 'idle'
  | 'resolving'
  | 'preparing'
  | 'uploading'
  | 'processing'
  | 'persisting';

const UPSCALE_REQUEST_TIMEOUT_MS = 60_000;
const UPSCALE_MAX_OUTPUT_SIDE = 32_768;
const CROP_REQUEST_TIMEOUT_MS = 60_000;
const CENTER_REQUEST_TIMEOUT_MS = 60_000;
const AUTOSCALER_REQUEST_TIMEOUT_MS = 60_000;
const CENTER_LAYOUT_MIN_PADDING_PERCENT = 0;
const CENTER_LAYOUT_MAX_PADDING_PERCENT = 40;
const CENTER_LAYOUT_DEFAULT_PADDING_PERCENT = 8;
const CENTER_LAYOUT_DEFAULT_WHITE_THRESHOLD = 16;
const CENTER_LAYOUT_MIN_WHITE_THRESHOLD = 1;
const CENTER_LAYOUT_MAX_WHITE_THRESHOLD = 80;
const CENTER_LAYOUT_DEFAULT_CHROMA_THRESHOLD = 10;
const CENTER_LAYOUT_MIN_CHROMA_THRESHOLD = 0;
const CENTER_LAYOUT_MAX_CHROMA_THRESHOLD = 80;
const sanitizeCenterPaddingInput = (value: string): string =>
  value.replace(/[^0-9.]/g, '');
const sanitizeCenterThresholdInput = (value: string): string =>
  value.replace(/[^0-9]/g, '');
const normalizeCenterPaddingPercent = (value: string): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return CENTER_LAYOUT_DEFAULT_PADDING_PERCENT;
  return Math.max(
    CENTER_LAYOUT_MIN_PADDING_PERCENT,
    Math.min(CENTER_LAYOUT_MAX_PADDING_PERCENT, Number(parsed.toFixed(2)))
  );
};
const normalizeCenterThreshold = (
  value: string,
  min: number,
  max: number,
  fallback: number
): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
};
const formatLayoutPercent = (value: number): string =>
  String(Number(value.toFixed(2)));

const normalizeMaskShapeForExport = (shape: unknown): MaskShapeForExport | null => {
  if (!shape || typeof shape !== 'object') return null;
  const candidate = shape as Record<string, unknown>;
  const id = typeof candidate['id'] === 'string' ? candidate['id'].trim() : '';
  if (!id) return null;

  const rawType = candidate['type'];
  if (typeof rawType !== 'string') return null;
  const type = rawType === 'circle' ? 'ellipse' : rawType;
  if (!type) return null;

  const points = Array.isArray(candidate['points'])
    ? candidate['points']
      .map((point) => {
        if (!point || typeof point !== 'object') return null;
        const pointRecord = point as Record<string, unknown>;
        const x = pointRecord['x'];
        const y = pointRecord['y'];
        if (typeof x !== 'number' || !Number.isFinite(x)) return null;
        if (typeof y !== 'number' || !Number.isFinite(y)) return null;
        return { x, y };
      })
      .filter((point): point is { x: number; y: number } => Boolean(point))
    : [];
  if (points.length === 0) return null;

  const closed = typeof candidate['closed'] === 'boolean' ? candidate['closed'] : true;
  const visible = typeof candidate['visible'] === 'boolean' ? candidate['visible'] : true;

  return {
    id,
    type,
    points,
    closed,
    visible,
  };
};

export function GenerationToolbar(): React.JSX.Element {
  const { maskPreviewEnabled, centerGuidesEnabled } = useUiState();
  const {
    setMaskPreviewEnabled,
    setCenterGuidesEnabled,
    setCanvasSelectionEnabled,
    getPreviewCanvasViewportCrop,
    getPreviewCanvasImageFrame,
  } = useUiActions();
  const { projectId, projectsQuery } = useProjectsState();
  const { workingSlot } = useSlotsState();
  const { setSelectedSlotId, setWorkingSlotId } = useSlotsActions();
  const settingsStore = useSettingsStore();
  const {
    maskShapes,
    activeMaskId,
    maskInvert,
    maskGenLoading,
    maskGenMode,
  }: Pick<MaskingState, 'maskShapes' | 'activeMaskId' | 'maskInvert' | 'maskGenLoading' | 'maskGenMode'> = useMaskingState();
  const {
    setTool,
    setMaskShapes,
    setActiveMaskId,
    setMaskInvert,
    setMaskGenMode,
    handleAiMaskGeneration,
  } = useMaskingActions();
  const { studioSettings } = useSettingsState();
  const { setStudioSettings } = useSettingsActions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [maskAttachMode, setMaskAttachMode] = useState<MaskAttachMode>('client_canvas_polygon');
  const [upscaleMode, setUpscaleMode] = useState<UpscaleMode>('client_canvas');
  const [upscaleStrategy, setUpscaleStrategy] = useState<UpscaleStrategy>('scale');
  const [cropMode, setCropMode] = useState<CropMode>('client_bbox');
  const [centerMode, setCenterMode] = useState<CenterMode>('client_alpha_bbox');
  const [autoScaleMode, setAutoScaleMode] = useState<AutoScalerMode>('client_auto_scaler_v1');
  const [centerLayoutPadding, setCenterLayoutPadding] = useState<string>(
    String(CENTER_LAYOUT_DEFAULT_PADDING_PERCENT)
  );
  const [centerLayoutPaddingX, setCenterLayoutPaddingX] = useState<string>(
    String(CENTER_LAYOUT_DEFAULT_PADDING_PERCENT)
  );
  const [centerLayoutPaddingY, setCenterLayoutPaddingY] = useState<string>(
    String(CENTER_LAYOUT_DEFAULT_PADDING_PERCENT)
  );
  const [centerLayoutSplitAxes, setCenterLayoutSplitAxes] = useState(false);
  const [centerLayoutAdvancedEnabled, setCenterLayoutAdvancedEnabled] = useState(false);
  const [centerLayoutDetection, setCenterLayoutDetection] = useState<CenterDetectionMode>('auto');
  const [centerLayoutWhiteThreshold, setCenterLayoutWhiteThreshold] = useState<string>(
    String(CENTER_LAYOUT_DEFAULT_WHITE_THRESHOLD)
  );
  const [centerLayoutChromaThreshold, setCenterLayoutChromaThreshold] = useState<string>(
    String(CENTER_LAYOUT_DEFAULT_CHROMA_THRESHOLD)
  );
  const [centerLayoutFillMissingCanvasWhite, setCenterLayoutFillMissingCanvasWhite] = useState(false);
  const [centerLayoutShadowPolicy, setCenterLayoutShadowPolicy] = useState<CenterShadowPolicy>('auto');
  const [centerLayoutCustomPresets, setCenterLayoutCustomPresets] = useState<ObjectLayoutCustomPreset[]>([]);
  const [centerLayoutPresetDraftName, setCenterLayoutPresetDraftName] = useState('');
  const [analysisPlanSnapshot, setAnalysisPlanSnapshot] = useState<ImageStudioAnalysisPlanSnapshot | null>(null);
  const [queuedAnalysisRunTarget, setQueuedAnalysisRunTarget] = useState<ImageStudioAnalysisApplyTarget | null>(null);
  const [autoScaleLayoutPadding, setAutoScaleLayoutPadding] = useState<string>(
    String(CENTER_LAYOUT_DEFAULT_PADDING_PERCENT)
  );
  const [autoScaleLayoutPaddingX, setAutoScaleLayoutPaddingX] = useState<string>(
    String(CENTER_LAYOUT_DEFAULT_PADDING_PERCENT)
  );
  const [autoScaleLayoutPaddingY, setAutoScaleLayoutPaddingY] = useState<string>(
    String(CENTER_LAYOUT_DEFAULT_PADDING_PERCENT)
  );
  const [autoScaleLayoutSplitAxes, setAutoScaleLayoutSplitAxes] = useState(false);
  const [autoScaleLayoutFillMissingCanvasWhite, setAutoScaleLayoutFillMissingCanvasWhite] = useState(false);
  const [autoScaleLayoutShadowPolicy, setAutoScaleLayoutShadowPolicy] = useState<CenterShadowPolicy>('auto');
  const [upscaleScale, setUpscaleScale] = useState('2');
  const [upscaleTargetWidth, setUpscaleTargetWidth] = useState('');
  const [upscaleTargetHeight, setUpscaleTargetHeight] = useState('');
  const [upscaleSmoothingQuality, setUpscaleSmoothingQuality] = useState<UpscaleSmoothingQuality>('high');
  const [upscaleBusy, setUpscaleBusy] = useState(false);
  const [upscaleStatus, setUpscaleStatus] = useState<UpscaleStatus>('idle');
  const [cropBusy, setCropBusy] = useState(false);
  const [cropStatus, setCropStatus] = useState<CropStatus>('idle');
  const [centerBusy, setCenterBusy] = useState(false);
  const [centerStatus, setCenterStatus] = useState<CenterStatus>('idle');
  const [autoScaleBusy, setAutoScaleBusy] = useState(false);
  const [autoScaleStatus, setAutoScaleStatus] = useState<AutoScaleStatus>('idle');
  const upscaleRequestInFlightRef = useRef(false);
  const upscaleAbortControllerRef = useRef<AbortController | null>(null);
  const cropRequestInFlightRef = useRef(false);
  const cropAbortControllerRef = useRef<AbortController | null>(null);
  const centerRequestInFlightRef = useRef(false);
  const centerAbortControllerRef = useRef<AbortController | null>(null);
  const autoScaleRequestInFlightRef = useRef(false);
  const autoScaleAbortControllerRef = useRef<AbortController | null>(null);
  const skipCenterAdvancedDefaultsSaveRef = useRef(true);
  const selectedCenterCustomPresetIdRef = useRef<string | null>(null);
  const lastConsumedAnalysisIntentRef = useRef<string | null>(null);

  const maskShapesForExport = useMemo<MaskShapeForExport[]>(
    () =>
      maskShapes
        .map((shape) => normalizeMaskShapeForExport(shape))
        .filter((shape): shape is MaskShapeForExport => Boolean(shape)),
    [maskShapes]
  );
  const eligibleMaskShapes = useMemo<MaskShapeForExport[]>(
    () =>
      maskShapesForExport.filter(
        (shape) =>
          shape.visible &&
          ((shape.type === 'rect' || shape.type === 'ellipse')
            ? shape.points.length >= 2
            : shape.closed && shape.points.length >= 3)
      ),
    [maskShapesForExport]
  );

  const selectedEligibleMaskShapes = useMemo<MaskShapeForExport[]>(
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

  const exportMaskCount = exportMaskShapes.length;
  const hasShapeCropBoundary = useMemo(
    () => exportMaskShapes.some(shapeHasUsableCropGeometry),
    [exportMaskShapes]
  );
  const productImagesExternalBaseUrl =
    settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;

  const workingSlotImageSrc = useMemo(() => {
    return getImageStudioSlotImageSrc(workingSlot, productImagesExternalBaseUrl);
  }, [workingSlot, productImagesExternalBaseUrl]);
  const clientProcessingImageSrc = useMemo(
    () => resolveClientProcessingImageSrc(workingSlot, workingSlotImageSrc),
    [workingSlot, workingSlotImageSrc]
  );
  const workingSourceSignature = useMemo(() => {
    const slotId = workingSlot?.id?.trim() ?? '';
    if (!slotId) return '';
    return buildImageStudioAnalysisSourceSignature({
      slotId,
      imageFileId: workingSlot?.imageFileId ?? null,
      imageFile: workingSlot?.imageFile ?? null,
      imageUrl: workingSlot?.imageUrl ?? null,
      imageBase64: workingSlot?.imageBase64 ?? null,
      resolvedImageSrc: workingSlotImageSrc,
      clientProcessingImageSrc,
    });
  }, [clientProcessingImageSrc, workingSlot, workingSlotImageSrc]);
  const activeProject = useMemo(
    () =>
      (projectsQuery.data ?? []).find((project) => project.id === projectId) ??
      null,
    [projectId, projectsQuery.data]
  );
  const activeProjectId = projectId?.trim() ?? '';
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

  useEffect(() => {
    skipCenterAdvancedDefaultsSaveRef.current = true;
    selectedCenterCustomPresetIdRef.current = null;
    setCenterLayoutPresetDraftName('');
    setCenterLayoutCustomPresets(loadObjectLayoutCustomPresets(activeProjectId));
    const persistedDefaults = loadObjectLayoutAdvancedDefaults(activeProjectId);
    if (!persistedDefaults) return;
    setCenterLayoutDetection(persistedDefaults.detection);
    setCenterLayoutShadowPolicy(persistedDefaults.shadowPolicy);
    setCenterLayoutWhiteThreshold(String(persistedDefaults.whiteThreshold));
    setCenterLayoutChromaThreshold(String(persistedDefaults.chromaThreshold));
  }, [activeProjectId]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncCustomPresets = (): void => {
      setCenterLayoutCustomPresets(loadObjectLayoutCustomPresets(activeProjectId));
    };
    const handleStorage = (event: StorageEvent): void => {
      if (event.key && !event.key.includes('image_studio_object_layout_custom_presets_')) return;
      syncCustomPresets();
    };
    syncCustomPresets();
    window.addEventListener(IMAGE_STUDIO_OBJECT_LAYOUT_PRESETS_CHANGED_EVENT, syncCustomPresets);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(IMAGE_STUDIO_OBJECT_LAYOUT_PRESETS_CHANGED_EVENT, syncCustomPresets);
      window.removeEventListener('storage', handleStorage);
    };
  }, [activeProjectId]);

  const applyAnalysisLayoutToCenter = useCallback((
    layout: ImageStudioAnalysisSharedLayout,
    source: 'manual' | 'queued'
  ): void => {
    const splitAxes =
      layout.splitAxes ||
      Math.abs(layout.paddingXPercent - layout.paddingYPercent) >= 0.01;
    const linkedPadding = formatLayoutPercent(
      splitAxes
        ? (layout.paddingXPercent + layout.paddingYPercent) / 2
        : layout.paddingPercent
    );
    const paddingX = formatLayoutPercent(layout.paddingXPercent);
    const paddingY = formatLayoutPercent(layout.paddingYPercent);

    setCenterMode((previous) => (
      previous === 'client_object_layout_v1' || previous === 'server_object_layout_v1'
        ? previous
        : 'server_object_layout_v1'
    ));
    setCenterLayoutAdvancedEnabled(true);
    setCenterLayoutDetection(layout.detection);
    setCenterLayoutWhiteThreshold(String(layout.whiteThreshold));
    setCenterLayoutChromaThreshold(String(layout.chromaThreshold));
    setCenterLayoutShadowPolicy(layout.shadowPolicy);
    setCenterLayoutSplitAxes(splitAxes);
    setCenterLayoutPadding(linkedPadding);
    setCenterLayoutPaddingX(splitAxes ? paddingX : linkedPadding);
    setCenterLayoutPaddingY(splitAxes ? paddingY : linkedPadding);

    const fillMissingCanvasWhite = layout.fillMissingCanvasWhite && Boolean(projectCanvasSize);
    setCenterLayoutFillMissingCanvasWhite(fillMissingCanvasWhite);
    if (layout.fillMissingCanvasWhite && !projectCanvasSize) {
      toast('Analysis plan requested canvas fill, but current project canvas size is unavailable.', {
        variant: 'info',
      });
    }
    if (source === 'manual') {
      toast('Applied analysis plan to Object Layout controls.', { variant: 'success' });
    } else {
      toast('Applied queued analysis plan to Object Layout controls.', { variant: 'success' });
    }
  }, [projectCanvasSize, toast]);

  const applyAnalysisLayoutToAutoScaler = useCallback((
    layout: ImageStudioAnalysisSharedLayout,
    source: 'manual' | 'queued'
  ): void => {
    const splitAxes =
      layout.splitAxes ||
      Math.abs(layout.paddingXPercent - layout.paddingYPercent) >= 0.01;
    const linkedPadding = formatLayoutPercent(
      splitAxes
        ? (layout.paddingXPercent + layout.paddingYPercent) / 2
        : layout.paddingPercent
    );
    const paddingX = formatLayoutPercent(layout.paddingXPercent);
    const paddingY = formatLayoutPercent(layout.paddingYPercent);

    // Auto scaler shares detection policy with object layout controls.
    setCenterLayoutAdvancedEnabled(true);
    setCenterLayoutDetection(layout.detection);
    setCenterLayoutWhiteThreshold(String(layout.whiteThreshold));
    setCenterLayoutChromaThreshold(String(layout.chromaThreshold));
    setCenterLayoutShadowPolicy(layout.shadowPolicy);

    setAutoScaleLayoutShadowPolicy(layout.shadowPolicy);
    setAutoScaleLayoutSplitAxes(splitAxes);
    setAutoScaleLayoutPadding(linkedPadding);
    setAutoScaleLayoutPaddingX(splitAxes ? paddingX : linkedPadding);
    setAutoScaleLayoutPaddingY(splitAxes ? paddingY : linkedPadding);

    const fillMissingCanvasWhite = layout.fillMissingCanvasWhite && Boolean(projectCanvasSize);
    setAutoScaleLayoutFillMissingCanvasWhite(fillMissingCanvasWhite);
    if (layout.fillMissingCanvasWhite && !projectCanvasSize) {
      toast('Analysis plan requested canvas fill, but current project canvas size is unavailable.', {
        variant: 'info',
      });
    }
    if (source === 'manual') {
      toast('Applied analysis plan to Auto Scaler controls.', { variant: 'success' });
    } else {
      toast('Applied queued analysis plan to Auto Scaler controls.', { variant: 'success' });
    }
  }, [projectCanvasSize, toast]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncSnapshot = (): void => {
      setAnalysisPlanSnapshot(loadImageStudioAnalysisPlanSnapshot(activeProjectId));
    };
    const handleStorage = (event: StorageEvent): void => {
      if (
        event.key &&
        !event.key.includes('image_studio_analysis_plan_snapshot_') &&
        !event.key.includes('image_studio_analysis_apply_intent_')
      ) {
        return;
      }
      syncSnapshot();
    };
    syncSnapshot();
    window.addEventListener(IMAGE_STUDIO_ANALYSIS_PLAN_CHANGED_EVENT, syncSnapshot);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(IMAGE_STUDIO_ANALYSIS_PLAN_CHANGED_EVENT, syncSnapshot);
      window.removeEventListener('storage', handleStorage);
    };
  }, [activeProjectId]);

  useEffect(() => {
    const intent = loadImageStudioAnalysisApplyIntent(activeProjectId);
    if (!intent) return;
    const intentSignature = `${intent.createdAt}:${intent.slotId}:${intent.target}`;
    if (lastConsumedAnalysisIntentRef.current === intentSignature) return;

    const normalizedWorkingSlotId = workingSlot?.id?.trim() ?? '';
    if (!normalizedWorkingSlotId || intent.slotId !== normalizedWorkingSlotId) return;
    const intentSourceSignature = intent.sourceSignature.trim();
    if (!intentSourceSignature) {
      clearImageStudioAnalysisApplyIntent(activeProjectId);
      lastConsumedAnalysisIntentRef.current = intentSignature;
      toast('Queued analysis plan is missing source metadata. Run analysis again before applying.', {
        variant: 'info',
      });
      return;
    }
    if (!workingSourceSignature || intentSourceSignature !== workingSourceSignature) {
      clearImageStudioAnalysisApplyIntent(activeProjectId);
      lastConsumedAnalysisIntentRef.current = intentSignature;
      toast('Queued analysis plan is stale for the current image revision. Rerun analysis first.', {
        variant: 'info',
      });
      return;
    }

    if (intent.target === 'object_layout') {
      applyAnalysisLayoutToCenter(intent.layout, 'queued');
    } else {
      applyAnalysisLayoutToAutoScaler(intent.layout, 'queued');
    }
    if (intent.runAfterApply) {
      setQueuedAnalysisRunTarget(intent.target);
      toast(
        intent.target === 'object_layout'
          ? 'Running queued Object Layout action from analysis plan.'
          : 'Running queued Auto Scaler action from analysis plan.',
        { variant: 'info' }
      );
    }
    clearImageStudioAnalysisApplyIntent(activeProjectId);
    lastConsumedAnalysisIntentRef.current = intentSignature;
  }, [
    activeProjectId,
    applyAnalysisLayoutToAutoScaler,
    applyAnalysisLayoutToCenter,
    toast,
    workingSourceSignature,
    workingSlot?.id,
  ]);

  const cropDiagnosticsRef = useRef<CropRectResolutionDiagnostics | null>(null);

  const resolveWorkingSlotImageContentFrame = (): ImageContentFrame | null => {
    const normalizedWorkingSlotId = workingSlot?.id?.trim() ?? '';
    if (!normalizedWorkingSlotId) return null;
    const frameBinding = getPreviewCanvasImageFrame();
    if (!frameBinding) return null;
    if (frameBinding.slotId !== normalizedWorkingSlotId) return null;
    return frameBinding.frame;
  };
  const hasCanvasOverflowBoundary = hasCanvasOverflowFromImageFrame(
    resolveWorkingSlotImageContentFrame()
  );
  const hasCropBoundary = hasShapeCropBoundary || hasCanvasOverflowBoundary;
  const cropBoundaryStatusLabel = hasShapeCropBoundary
    ? 'Boundary ready'
    : hasCanvasOverflowBoundary
      ? 'Canvas overflow boundary ready'
      : 'Set a boundary or move image outside canvas';

  const resolveWorkingSourceDimensions = async (): Promise<{ width: number; height: number }> => {
    let sourceWidth = workingSlot?.imageFile?.width ?? 0;
    let sourceHeight = workingSlot?.imageFile?.height ?? 0;
    if (!(sourceWidth > 0 && sourceHeight > 0)) {
      const sourceForDimensions = clientProcessingImageSrc || workingSlotImageSrc || '';
      const image = await loadImageElement(sourceForDimensions);
      sourceWidth = image.naturalWidth || image.width;
      sourceHeight = image.naturalHeight || image.height;
    }
    if (!(sourceWidth > 0 && sourceHeight > 0)) {
      throw new Error('Source image dimensions are invalid.');
    }
    return {
      width: sourceWidth,
      height: sourceHeight,
    };
  };

  const resolveWorkingCropCanvasContext = async (): Promise<CropCanvasContext | null> => {
    const imageContentFrame = resolveWorkingSlotImageContentFrame();
    if (!imageContentFrame) return null;

    const sourceDimensions = await resolveWorkingSourceDimensions();
    const canvasWidth = projectCanvasSize?.width ?? sourceDimensions.width;
    const canvasHeight = projectCanvasSize?.height ?? sourceDimensions.height;
    if (!(canvasWidth > 0 && canvasHeight > 0)) return null;

    return {
      canvasWidth,
      canvasHeight,
      imageFrame: imageContentFrame,
    };
  };

  const resolveCropRect = async (): Promise<{
    cropRect: CropRect;
    diagnostics: CropRectResolutionDiagnostics | null;
  }> => {
    const sourceDimensions = await resolveWorkingSourceDimensions();
    const canvasWidth = projectCanvasSize?.width ?? sourceDimensions.width;
    const canvasHeight = projectCanvasSize?.height ?? sourceDimensions.height;
    const imageContentFrame = resolveWorkingSlotImageContentFrame();
    const resolved = resolveCropRectFromShapesWithDiagnostics(
      exportMaskShapes,
      canvasWidth,
      canvasHeight,
      sourceDimensions.width,
      sourceDimensions.height,
      activeMaskId,
      imageContentFrame
    );
    cropDiagnosticsRef.current = resolved.diagnostics;
    if (resolved.cropRect) {
      return {
        cropRect: resolved.cropRect,
        diagnostics: resolved.diagnostics,
      };
    }
    const overflowCropRect = resolveCanvasOverflowCropRect({
      canvasWidth,
      canvasHeight,
      imageContentFrame,
    });
    if (overflowCropRect) {
      return {
        cropRect: overflowCropRect,
        diagnostics: resolved.diagnostics,
      };
    }

    throw new Error('Set a valid crop boundary or move image outside canvas first.');
  };

  const resolveCenteredSquareCropRect = async (): Promise<CropRect> => {
    const { width: sourceWidth, height: sourceHeight } = await resolveWorkingSourceDimensions();

    const side = Math.max(1, Math.min(sourceWidth, sourceHeight));
    const x = Math.max(0, Math.floor((sourceWidth - side) / 2));
    const y = Math.max(0, Math.floor((sourceHeight - side) / 2));

    return {
      x,
      y,
      width: side,
      height: side,
    };
  };

  const handleCreateCropBox = (): void => {
    const shapeId = `crop_${Date.now().toString(36)}`;
    setMaskShapes((previous) => [
      ...previous,
      {
        id: shapeId,
        name: `Crop Box ${previous.length + 1}`,
        type: 'rect',
        points: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.9 }],
        closed: true,
        visible: true,
      } as unknown as (typeof previous)[number],
    ]);
    setActiveMaskId(shapeId);
    setTool('select');
    setCanvasSelectionEnabled(true);
    toast('Crop box created. Adjust the rectangle, then click Crop.', { variant: 'success' });
  };

  const fetchProjectSlots = async (projectIdOverride?: string): Promise<ImageStudioSlotRecord[]> => {
    const resolvedProjectId = projectIdOverride?.trim() ?? projectId?.trim() ?? '';
    if (!resolvedProjectId) return [];
    const response = await api.get<StudioSlotsResponse>(
      `/api/image-studio/projects/${encodeURIComponent(resolvedProjectId)}/slots`
    );
    return Array.isArray(response.slots) ? response.slots : [];
  };

  const attachMaskVariantsFromSelection = async (): Promise<void> => {
    if (!workingSlotImageSrc) {
      toast('Select a slot image before attaching masks.', { variant: 'info' });
      return;
    }

    const shapes = exportMaskShapes;
    if (shapes.length === 0) {
      toast('Draw at least one visible shape first.', {
        variant: 'info',
      });
      return;
    }

    try {
      let width = workingSlot?.imageFile?.width ?? 0;
      let height = workingSlot?.imageFile?.height ?? 0;
      if (!(width > 0 && height > 0)) {
        const image = await loadImageElement(workingSlotImageSrc);
        width = image.naturalWidth || image.width;
        height = image.naturalHeight || image.height;
      }
      if (!(width > 0 && height > 0)) {
        width = 1024;
        height = 1024;
      }

      const polygons = polygonsFromShapes(shapes, width, height, {
        imageContentFrame: resolveWorkingSlotImageContentFrame(),
      });
      if (polygons.length === 0) {
        toast('No closed polygon-compatible shapes are available for mask export.', { variant: 'info' });
        return;
      }

      if (!workingSlot?.id) {
        toast('No active source slot selected.', { variant: 'info' });
        return;
      }

      const variants: Array<{ variant: 'white' | 'black'; inverted: boolean }> = [
        { variant: 'white', inverted: false },
        { variant: 'black', inverted: false },
        { variant: 'white', inverted: true },
        { variant: 'black', inverted: true },
      ];

      const payloadMasks = variants.map(({ variant, inverted }) =>
        maskAttachMode === 'client_canvas_polygon'
          ? {
            variant,
            inverted,
            dataUrl: renderMaskDataUrlFromPolygons(polygons, width, height, variant, inverted),
          }
          : {
            variant,
            inverted,
            polygons,
          }
      );

      const response = await api.post<{
        masks?: Array<{
          slot?: { id: string; name: string | null };
          relationType?: string;
        }>;
      }>(`/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/masks`, {
        mode: maskAttachMode === 'client_canvas_polygon' ? 'client_data_url' : 'server_polygon',
        masks: payloadMasks,
      });

      void invalidateImageStudioSlots(queryClient, projectId);

      const createdCount = Array.isArray(response.masks) ? response.masks.length : 0;
      if (createdCount === 0) {
        toast('Mask slot creation returned no records.', { variant: 'error' });
        return;
      }

      toast(`Attached ${createdCount} linked mask slot${createdCount === 1 ? '' : 's'}.`, { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to attach mask variants.',
        { variant: 'error' }
      );
    }
  };

  const resolveUpscaleSourceDimensions = async (): Promise<{ width: number; height: number }> => {
    return resolveWorkingSourceDimensions();
  };

  const { handleUpscale, handleCrop } = createGenerationToolbarActionHandlers({
    clientProcessingImageSrc,
    cropAbortControllerRef,
    cropMode,
    cropRequestInFlightRef,
    cropRequestTimeoutMs: CROP_REQUEST_TIMEOUT_MS,
    fetchProjectSlots,
    getCropDiagnostics: (): CropRectResolutionDiagnostics | null => cropDiagnosticsRef.current,
    hasCropBoundary,
    projectId,
    queryClient,
    resolveCropRect,
    resolveCropCanvasContext: resolveWorkingCropCanvasContext,
    resolveUpscaleSourceDimensions,
    setCropBusy,
    setCropStatus,
    setSelectedSlotId,
    setUpscaleBusy,
    setUpscaleStatus,
    setWorkingSlotId,
    toast,
    upscaleAbortControllerRef,
    upscaleMaxOutputSide: UPSCALE_MAX_OUTPUT_SIDE,
    upscaleMode,
    upscaleRequestInFlightRef,
    upscaleRequestTimeoutMs: UPSCALE_REQUEST_TIMEOUT_MS,
    upscaleScale,
    upscaleSmoothingQuality,
    upscaleStrategy,
    upscaleTargetHeight,
    upscaleTargetWidth,
    workingSlot,
    workingSlotImageSrc,
  });

  const handleCancelUpscale = (): void => {
    const controller = upscaleAbortControllerRef.current;
    if (!controller) return;
    controller.abort();
  };

  const handleCancelCrop = (): void => {
    const controller = cropAbortControllerRef.current;
    if (!controller) return;
    controller.abort();
  };

  const handleSquareCrop = async (): Promise<void> => {
    if (!workingSlot?.id) {
      toast('No active source slot selected.', { variant: 'info' });
      return;
    }
    if (!workingSlotImageSrc) {
      toast('Select a slot image before cropping.', { variant: 'info' });
      return;
    }
    try {
      const squareCropRect = await resolveCenteredSquareCropRect();
      cropDiagnosticsRef.current = null;
      await handleCrop(squareCropRect, { includeCanvasContext: false });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to prepare square crop.', { variant: 'error' });
    }
  };

  const handlePreviewViewCrop = async (): Promise<void> => {
    const activeSlotId = workingSlot?.id?.trim() ?? '';
    if (!activeSlotId) {
      toast('No active source slot selected.', { variant: 'info' });
      return;
    }
    if (!workingSlotImageSrc) {
      toast('Select a slot image before cropping.', { variant: 'info' });
      return;
    }

    const previewCrop = getPreviewCanvasViewportCrop();
    if (!previewCrop) {
      toast('Preview Canvas crop view is unavailable. Load a slot image in Preview Canvas first.', {
        variant: 'info',
      });
      return;
    }
    if (previewCrop.slotId !== activeSlotId) {
      toast('Preview Canvas is showing a different slot. Switch back to the working slot and try again.', {
        variant: 'info',
      });
      return;
    }

    try {
      cropDiagnosticsRef.current = null;
      const cropCanvasContext = await resolveWorkingCropCanvasContext();
      if (cropCanvasContext) {
        const sourceDimensions = await resolveWorkingSourceDimensions();
        const canvasCropRect = mapImageCropRectToCanvasRect(
          previewCrop.cropRect,
          sourceDimensions.width,
          sourceDimensions.height,
          cropCanvasContext
        );
        if (canvasCropRect) {
          await handleCrop(canvasCropRect, { includeCanvasContext: true });
          return;
        }
      }

      await handleCrop(previewCrop.cropRect, { includeCanvasContext: false });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to prepare crop from preview view.', { variant: 'error' });
    }
  };

  const centerIsObjectLayoutMode =
    centerMode === 'client_object_layout_v1' || centerMode === 'server_object_layout_v1';
  const centerLayoutPaddingPercent = useMemo(() => {
    return normalizeCenterPaddingPercent(centerLayoutPadding);
  }, [centerLayoutPadding]);
  const centerLayoutPaddingXPercent = useMemo(() => {
    return normalizeCenterPaddingPercent(centerLayoutPaddingX);
  }, [centerLayoutPaddingX]);
  const centerLayoutPaddingYPercent = useMemo(() => {
    return normalizeCenterPaddingPercent(centerLayoutPaddingY);
  }, [centerLayoutPaddingY]);
  const centerLayoutWhiteThresholdValue = useMemo(() => {
    return normalizeCenterThreshold(
      centerLayoutWhiteThreshold,
      CENTER_LAYOUT_MIN_WHITE_THRESHOLD,
      CENTER_LAYOUT_MAX_WHITE_THRESHOLD,
      CENTER_LAYOUT_DEFAULT_WHITE_THRESHOLD
    );
  }, [centerLayoutWhiteThreshold]);
  const centerLayoutChromaThresholdValue = useMemo(() => {
    return normalizeCenterThreshold(
      centerLayoutChromaThreshold,
      CENTER_LAYOUT_MIN_CHROMA_THRESHOLD,
      CENTER_LAYOUT_MAX_CHROMA_THRESHOLD,
      CENTER_LAYOUT_DEFAULT_CHROMA_THRESHOLD
    );
  }, [centerLayoutChromaThreshold]);
  const centerLayoutPresetOptions = useMemo(
    () => buildObjectLayoutPresetOptions(centerLayoutCustomPresets),
    [centerLayoutCustomPresets]
  );
  const centerLayoutPresetOptionValue = useMemo(
    () =>
      resolveObjectLayoutPresetOptionValue(
        {
          detection: centerLayoutDetection,
          shadowPolicy: centerLayoutShadowPolicy,
          whiteThreshold: centerLayoutWhiteThresholdValue,
          chromaThreshold: centerLayoutChromaThresholdValue,
        },
        centerLayoutCustomPresets
      ),
    [
      centerLayoutChromaThresholdValue,
      centerLayoutCustomPresets,
      centerLayoutDetection,
      centerLayoutShadowPolicy,
      centerLayoutWhiteThresholdValue,
    ]
  );
  const selectedCenterCustomPresetId = useMemo(
    () => resolveCustomPresetIdFromOptionValue(centerLayoutPresetOptionValue),
    [centerLayoutPresetOptionValue]
  );
  const selectedCenterCustomPreset = useMemo(
    () =>
      centerLayoutCustomPresets.find((preset) => preset.id === selectedCenterCustomPresetId) ??
      null,
    [centerLayoutCustomPresets, selectedCenterCustomPresetId]
  );
  const centerLayoutCanDeletePreset = Boolean(selectedCenterCustomPresetId);
  const centerLayoutCanSavePreset = centerLayoutPresetDraftName.trim().length > 0;
  const centerLayoutSavePresetLabel = selectedCenterCustomPresetId ? 'Update Preset' : 'Save Preset';
  useEffect(() => {
    const nextSelectedId = selectedCenterCustomPreset?.id ?? null;
    if (selectedCenterCustomPresetIdRef.current === nextSelectedId) return;
    selectedCenterCustomPresetIdRef.current = nextSelectedId;
    if (selectedCenterCustomPreset?.name) {
      setCenterLayoutPresetDraftName(selectedCenterCustomPreset.name);
    }
  }, [selectedCenterCustomPreset?.id, selectedCenterCustomPreset?.name]);
  useEffect(() => {
    if (skipCenterAdvancedDefaultsSaveRef.current) {
      skipCenterAdvancedDefaultsSaveRef.current = false;
      return;
    }
    saveObjectLayoutAdvancedDefaults(activeProjectId, {
      detection: centerLayoutDetection,
      shadowPolicy: centerLayoutShadowPolicy,
      whiteThreshold: centerLayoutWhiteThresholdValue,
      chromaThreshold: centerLayoutChromaThresholdValue,
    });
  }, [
    activeProjectId,
    centerLayoutChromaThresholdValue,
    centerLayoutDetection,
    centerLayoutShadowPolicy,
    centerLayoutWhiteThresholdValue,
  ]);
  const centerLayoutResolvedFillMissingCanvasWhite = centerLayoutFillMissingCanvasWhite && Boolean(projectCanvasSize);
  const centerLayoutPayload = centerIsObjectLayoutMode
    ? {
      paddingPercent: centerLayoutSplitAxes
        ? Number(((centerLayoutPaddingXPercent + centerLayoutPaddingYPercent) / 2).toFixed(2))
        : centerLayoutPaddingPercent,
      ...(centerLayoutSplitAxes
        ? {
          paddingXPercent: centerLayoutPaddingXPercent,
          paddingYPercent: centerLayoutPaddingYPercent,
        }
        : {}),
      fillMissingCanvasWhite: centerLayoutResolvedFillMissingCanvasWhite,
      ...(centerLayoutResolvedFillMissingCanvasWhite && projectCanvasSize
        ? {
          targetCanvasWidth: projectCanvasSize.width,
          targetCanvasHeight: projectCanvasSize.height,
        }
        : {}),
      whiteThreshold: centerLayoutWhiteThresholdValue,
      chromaThreshold: centerLayoutChromaThresholdValue,
      shadowPolicy: centerLayoutShadowPolicy,
      detection: centerLayoutDetection,
    }
    : undefined;
  const autoScaleLayoutPaddingPercent = useMemo(() => {
    return normalizeCenterPaddingPercent(autoScaleLayoutPadding);
  }, [autoScaleLayoutPadding]);
  const autoScaleLayoutPaddingXPercent = useMemo(() => {
    return normalizeCenterPaddingPercent(autoScaleLayoutPaddingX);
  }, [autoScaleLayoutPaddingX]);
  const autoScaleLayoutPaddingYPercent = useMemo(() => {
    return normalizeCenterPaddingPercent(autoScaleLayoutPaddingY);
  }, [autoScaleLayoutPaddingY]);
  const autoScaleLayoutResolvedFillMissingCanvasWhite = autoScaleLayoutFillMissingCanvasWhite && Boolean(projectCanvasSize);
  const autoScaleLayoutPayload = {
    paddingPercent: autoScaleLayoutSplitAxes
      ? Number(((autoScaleLayoutPaddingXPercent + autoScaleLayoutPaddingYPercent) / 2).toFixed(2))
      : autoScaleLayoutPaddingPercent,
    ...(autoScaleLayoutSplitAxes
      ? {
        paddingXPercent: autoScaleLayoutPaddingXPercent,
        paddingYPercent: autoScaleLayoutPaddingYPercent,
      }
      : {}),
    fillMissingCanvasWhite: autoScaleLayoutResolvedFillMissingCanvasWhite,
    ...(autoScaleLayoutResolvedFillMissingCanvasWhite && projectCanvasSize
      ? {
        targetCanvasWidth: projectCanvasSize.width,
        targetCanvasHeight: projectCanvasSize.height,
      }
      : {}),
    whiteThreshold: centerLayoutWhiteThresholdValue,
    chromaThreshold: centerLayoutChromaThresholdValue,
    shadowPolicy: autoScaleLayoutShadowPolicy,
    detection: centerLayoutDetection,
  };

  const handleCenterObject = async (): Promise<void> => {
    if (!workingSlot?.id) {
      toast('No active source slot selected.', { variant: 'info' });
      return;
    }
    if (!workingSlotImageSrc) {
      toast('Select a slot image before centering.', { variant: 'info' });
      return;
    }
    const isClientCenterMode =
      centerMode === 'client_alpha_bbox' || centerMode === 'client_object_layout_v1';
    if (isClientCenterMode && !clientProcessingImageSrc) {
      toast('No client image source is available for centering/layouting.', { variant: 'info' });
      return;
    }
    if (centerRequestInFlightRef.current) {
      return;
    }

    centerRequestInFlightRef.current = true;
    setCenterBusy(true);
    setCenterStatus('resolving');
    const centerRequestId = buildCenterRequestId();
    const abortController = new AbortController();
    centerAbortControllerRef.current = abortController;
    try {
      let response: CenterActionResponse;
      let resolvedMode: CenterMode = centerMode;
      if (isClientCenterMode) {
        const sourceForClientCenter = clientProcessingImageSrc || workingSlotImageSrc;
        if (!sourceForClientCenter) {
          throw new Error('No client image source is available for centering/layouting.');
        }
        try {
          setCenterStatus('preparing');
          const centeredDataUrl =
            centerMode === 'client_object_layout_v1'
              ? (await layoutCanvasImageObject(sourceForClientCenter, centerLayoutPayload)).dataUrl
              : await centerCanvasImageObject(sourceForClientCenter);
          let uploadBlob: Blob;
          try {
            uploadBlob = await dataUrlToUploadBlob(centeredDataUrl);
          } catch {
            throw new Error(
              centerMode === 'client_object_layout_v1'
                ? 'Failed to prepare client layout output for upload.'
                : 'Failed to prepare client centered image for upload.'
            );
          }

          setCenterStatus('uploading');
          response = await withCenterRetry(
            () => {
              const formData = new FormData();
              formData.append('mode', centerMode);
              formData.append('requestId', centerRequestId);
              if (centerLayoutPayload) {
                formData.append(
                  'center',
                  JSON.stringify({
                    layout: centerLayoutPayload,
                  })
                );
              }
              formData.append('image', uploadBlob, `center-client-${Date.now()}.png`);
              return api
                .post<unknown>(
                  `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/center`,
                  formData,
                  {
                    signal: abortController.signal,
                    timeout: CENTER_REQUEST_TIMEOUT_MS,
                    headers: {
                      'x-idempotency-key': centerRequestId,
                    },
                  }
                )
                .then((raw) => imageStudioCenterResponseSchema.parse(raw));
            },
            abortController.signal
          );
        } catch (error) {
          if (!isClientCenterCrossOriginError(error)) {
            throw error;
          }
          setCenterStatus('processing');
          const fallbackMode: CenterMode =
            centerMode === 'client_object_layout_v1'
              ? 'server_object_layout_v1'
              : 'server_alpha_bbox';
          response = await withCenterRetry(
            () =>
              api
                .post<unknown>(
                  `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/center`,
                  {
                    mode: fallbackMode,
                    requestId: centerRequestId,
                    ...(centerLayoutPayload ? { layout: centerLayoutPayload } : {}),
                  },
                  {
                    signal: abortController.signal,
                    timeout: CENTER_REQUEST_TIMEOUT_MS,
                    headers: {
                      'x-idempotency-key': centerRequestId,
                    },
                  }
                )
                .then((raw) => imageStudioCenterResponseSchema.parse(raw)),
            abortController.signal
          );
          resolvedMode = fallbackMode;
          toast(
            centerMode === 'client_object_layout_v1'
              ? 'Client object layouting was blocked by cross-origin restrictions; used server layouting instead.'
              : 'Client centering was blocked by cross-origin restrictions; used server centering instead.',
            { variant: 'info' }
          );
        }
      } else {
        setCenterStatus('processing');
        response = await withCenterRetry(
          () =>
            api
              .post<unknown>(
                `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/center`,
                {
                  mode: centerMode,
                  requestId: centerRequestId,
                  ...(centerLayoutPayload ? { layout: centerLayoutPayload } : {}),
                },
                {
                  signal: abortController.signal,
                  timeout: CENTER_REQUEST_TIMEOUT_MS,
                  headers: {
                    'x-idempotency-key': centerRequestId,
                  },
                }
              )
              .then((raw) => imageStudioCenterResponseSchema.parse(raw)),
          abortController.signal
        );
      }

      const normalizedProjectId = projectId?.trim() ?? '';
      if (normalizedProjectId) {
        setCenterStatus('persisting');
        await invalidateImageStudioSlots(queryClient, normalizedProjectId);
        const slotsSnapshot = await fetchProjectSlots(normalizedProjectId);
        const createdSlotId = response.slot?.id ?? '';
        const mergedSlots =
          createdSlotId
            ? [response.slot, ...slotsSnapshot.filter((slot) => slot.id !== createdSlotId)]
            : slotsSnapshot;
        queryClient.setQueryData<StudioSlotsResponse>(
          studioKeys.slots(normalizedProjectId),
          { slots: mergedSlots }
        );
      }

      if (response.slot?.id) {
        setSelectedSlotId(response.slot.id);
        setWorkingSlotId(response.slot.id);
      }

      const createdLabel = response.slot?.name?.trim() || (
        centerIsObjectLayoutMode ? 'Object layout variant' : 'Centered variant'
      );
      const effectiveMode = response.effectiveMode ?? resolvedMode;
      const modeLabel =
        effectiveMode === 'client_alpha_bbox'
          ? 'Client center'
          : effectiveMode === 'server_alpha_bbox'
            ? 'Server center'
            : effectiveMode === 'client_object_layout_v1'
              ? 'Client layout'
              : 'Server layout';
      const sourceBounds = response.sourceObjectBounds ?? null;
      const targetBounds = response.targetObjectBounds ?? null;
      const centerShiftedObject = Boolean(
        sourceBounds &&
        targetBounds &&
        (
          sourceBounds.left !== targetBounds.left ||
          sourceBounds.top !== targetBounds.top ||
          sourceBounds.width !== targetBounds.width ||
          sourceBounds.height !== targetBounds.height
        )
      );
      if (centerShiftedObject) {
        toast(`Created ${createdLabel} (${modeLabel}).`, { variant: 'success' });
      } else {
        toast(
          centerIsObjectLayoutMode
            ? `${createdLabel} created, but the object was already well-positioned with current padding.`
            : `${createdLabel} created, but the object was already centered in-frame.`,
          { variant: 'info' }
        );
      }
      if (centerIsObjectLayoutMode && response.detectionDetails?.fallbackApplied) {
        const reason = response.detectionDetails.policyReason ?? response.layout?.detectionPolicyDecision;
        toast(
          reason
            ? `Object layout policy fallback applied (${reason}).`
            : 'Object layout policy fallback applied.',
          { variant: 'info' }
        );
      } else if (
        centerIsObjectLayoutMode &&
        typeof response.confidenceBefore === 'number' &&
        response.confidenceBefore < 0.35
      ) {
        toast(
          'Object layout confidence is low. Try detection override or threshold adjustments in Analysis tab.',
          { variant: 'info' }
        );
      }
    } catch (error) {
      if (isCenterAbortError(error)) {
        toast(centerIsObjectLayoutMode ? 'Object layouting canceled.' : 'Centering canceled.', { variant: 'info' });
        return;
      }
      toast(
        error instanceof Error
          ? error.message
          : centerIsObjectLayoutMode
            ? 'Failed to layout image object.'
            : 'Failed to center image object.',
        { variant: 'error' }
      );
    } finally {
      centerRequestInFlightRef.current = false;
      centerAbortControllerRef.current = null;
      setCenterBusy(false);
      setCenterStatus('idle');
    }
  };

  const handleCancelCenter = (): void => {
    const controller = centerAbortControllerRef.current;
    if (!controller) return;
    controller.abort();
  };

  const handleAutoScale = async (): Promise<void> => {
    if (!workingSlot?.id) {
      toast('No active source slot selected.', { variant: 'info' });
      return;
    }
    if (!workingSlotImageSrc) {
      toast('Select a slot image before auto scaling.', { variant: 'info' });
      return;
    }
    const isClientAutoMode = autoScaleMode === 'client_auto_scaler_v1';
    if (isClientAutoMode && !clientProcessingImageSrc) {
      toast('No client image source is available for auto scaling.', { variant: 'info' });
      return;
    }
    if (autoScaleRequestInFlightRef.current) {
      return;
    }

    autoScaleRequestInFlightRef.current = true;
    setAutoScaleBusy(true);
    setAutoScaleStatus('resolving');
    const autoScaleRequestId = buildAutoScalerRequestId();
    const abortController = new AbortController();
    autoScaleAbortControllerRef.current = abortController;
    try {
      let response: AutoScaleActionResponse;
      let resolvedMode: AutoScalerMode = autoScaleMode;
      if (isClientAutoMode) {
        const sourceForClientAutoScale = clientProcessingImageSrc || workingSlotImageSrc;
        if (!sourceForClientAutoScale) {
          throw new Error('No client image source is available for auto scaling.');
        }
        try {
          setAutoScaleStatus('preparing');
          const autoScaledDataUrl = (
            await autoScaleCanvasImageObject(
              sourceForClientAutoScale,
              autoScaleLayoutPayload,
              { preferTargetCanvas: true }
            )
          ).dataUrl;
          let uploadBlob: Blob;
          try {
            uploadBlob = await dataUrlToUploadBlob(autoScaledDataUrl);
          } catch {
            throw new Error('Failed to prepare client auto scaler output for upload.');
          }

          setAutoScaleStatus('uploading');
          response = await withAutoScalerRetry(
            () => {
              const formData = new FormData();
              formData.append('mode', autoScaleMode);
              formData.append('requestId', autoScaleRequestId);
              formData.append('layout', JSON.stringify(autoScaleLayoutPayload));
              formData.append('image', uploadBlob, `autoscale-client-${Date.now()}.png`);
              return api
                .post<unknown>(
                  `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/autoscale`,
                  formData,
                  {
                    signal: abortController.signal,
                    timeout: AUTOSCALER_REQUEST_TIMEOUT_MS,
                    headers: {
                      'x-idempotency-key': autoScaleRequestId,
                    },
                  }
                )
                .then((raw) => imageStudioAutoScalerResponseSchema.parse(raw));
            },
            abortController.signal
          );
        } catch (error) {
          if (!isClientAutoScalerCrossOriginError(error)) {
            throw error;
          }
          setAutoScaleStatus('processing');
          const fallbackMode: AutoScalerMode = 'server_auto_scaler_v1';
          response = await withAutoScalerRetry(
            () =>
              api
                .post<unknown>(
                  `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/autoscale`,
                  {
                    mode: fallbackMode,
                    requestId: autoScaleRequestId,
                    layout: autoScaleLayoutPayload,
                  },
                  {
                    signal: abortController.signal,
                    timeout: AUTOSCALER_REQUEST_TIMEOUT_MS,
                    headers: {
                      'x-idempotency-key': autoScaleRequestId,
                    },
                  }
                )
                .then((raw) => imageStudioAutoScalerResponseSchema.parse(raw)),
            abortController.signal
          );
          resolvedMode = fallbackMode;
          toast(
            'Client auto scaler was blocked by cross-origin restrictions; used server auto scaler instead.',
            { variant: 'info' }
          );
        }
      } else {
        setAutoScaleStatus('processing');
        response = await withAutoScalerRetry(
          () =>
            api
              .post<unknown>(
                `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/autoscale`,
                {
                  mode: autoScaleMode,
                  requestId: autoScaleRequestId,
                  layout: autoScaleLayoutPayload,
                },
                {
                  signal: abortController.signal,
                  timeout: AUTOSCALER_REQUEST_TIMEOUT_MS,
                  headers: {
                    'x-idempotency-key': autoScaleRequestId,
                  },
                }
              )
              .then((raw) => imageStudioAutoScalerResponseSchema.parse(raw)),
          abortController.signal
        );
      }

      const normalizedProjectId = projectId?.trim() ?? '';
      if (normalizedProjectId) {
        setAutoScaleStatus('persisting');
        await invalidateImageStudioSlots(queryClient, normalizedProjectId);
        const slotsSnapshot = await fetchProjectSlots(normalizedProjectId);
        const createdSlotId = response.slot?.id ?? '';
        const mergedSlots =
          createdSlotId
            ? [response.slot, ...slotsSnapshot.filter((slot) => slot.id !== createdSlotId)]
            : slotsSnapshot;
        queryClient.setQueryData<StudioSlotsResponse>(
          studioKeys.slots(normalizedProjectId),
          { slots: mergedSlots }
        );
      }

      if (response.slot?.id) {
        setSelectedSlotId(response.slot.id);
        setWorkingSlotId(response.slot.id);
      }

      const createdLabel = response.slot?.name?.trim() || 'Auto-scaled variant';
      const effectiveMode = response.effectiveMode ?? resolvedMode;
      const modeLabel =
        effectiveMode === 'client_auto_scaler_v1'
          ? 'Client auto scaler'
          : 'Server auto scaler';
      const sourceBounds = response.sourceObjectBounds ?? null;
      const targetBounds = response.targetObjectBounds ?? null;
      const autoScaleShiftedObject = Boolean(
        sourceBounds &&
        targetBounds &&
        (
          sourceBounds.left !== targetBounds.left ||
          sourceBounds.top !== targetBounds.top ||
          sourceBounds.width !== targetBounds.width ||
          sourceBounds.height !== targetBounds.height
        )
      );
      if (autoScaleShiftedObject) {
        toast(`Created ${createdLabel} (${modeLabel}).`, { variant: 'success' });
      } else {
        toast(`${createdLabel} created, but the object already matched current canvas/padding.`, {
          variant: 'info',
        });
      }
      if (response.detectionDetails?.fallbackApplied) {
        const reason = response.detectionDetails.policyReason ?? response.layout?.detectionPolicyDecision;
        toast(
          reason
            ? `Auto scaler policy fallback applied (${reason}).`
            : 'Auto scaler policy fallback applied.',
          { variant: 'info' }
        );
      } else if (
        typeof response.confidenceBefore === 'number' &&
        response.confidenceBefore < 0.35
      ) {
        toast(
          'Auto scaler confidence is low. Run Analysis tab and tune detection mode or thresholds.',
          { variant: 'info' }
        );
      }
    } catch (error) {
      if (isAutoScalerAbortError(error)) {
        toast('Auto scaler canceled.', { variant: 'info' });
        return;
      }
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to auto scale image object.',
        { variant: 'error' }
      );
    } finally {
      autoScaleRequestInFlightRef.current = false;
      autoScaleAbortControllerRef.current = null;
      setAutoScaleBusy(false);
      setAutoScaleStatus('idle');
    }
  };

  const handleCancelAutoScale = (): void => {
    const controller = autoScaleAbortControllerRef.current;
    if (!controller) return;
    controller.abort();
  };

  useEffect(() => {
    if (!queuedAnalysisRunTarget) return;
    if (queuedAnalysisRunTarget === 'object_layout') {
      if (centerBusy || centerRequestInFlightRef.current) return;
      setQueuedAnalysisRunTarget(null);
      void handleCenterObject();
      return;
    }
    if (autoScaleBusy || autoScaleRequestInFlightRef.current) return;
    setQueuedAnalysisRunTarget(null);
    void handleAutoScale();
  }, [
    autoScaleBusy,
    centerBusy,
    handleAutoScale,
    handleCenterObject,
    queuedAnalysisRunTarget,
  ]);

  const maskGenerationBusy = maskGenLoading;
  const maskGenerationLabel = maskGenerationBusy
    ? 'Generating Mask...'
    : 'Generate Mask';
  const upscaleBusyLabel = useMemo(() => {
    if (!upscaleBusy) return 'Upscale';
    switch (upscaleStatus) {
      case 'resolving':
        return 'Upscale: Resolving';
      case 'preparing':
        return 'Upscale: Preparing';
      case 'uploading':
        return 'Upscale: Uploading';
      case 'processing':
        return 'Upscale: Processing';
      case 'persisting':
        return 'Upscale: Persisting';
      default:
        return 'Upscale';
    }
  }, [upscaleBusy, upscaleStatus]);
  const cropBusyLabel = useMemo(() => {
    if (!cropBusy) return 'Crop';
    switch (cropStatus) {
      case 'resolving':
        return 'Crop: Resolving';
      case 'preparing':
        return 'Crop: Preparing';
      case 'uploading':
        return 'Crop: Uploading';
      case 'processing':
        return 'Crop: Processing';
      case 'persisting':
        return 'Crop: Persisting';
      default:
        return 'Crop';
    }
  }, [cropBusy, cropStatus]);
  const centerBusyLabel = useMemo(() => {
    if (!centerBusy) return centerIsObjectLayoutMode ? 'Object Layouting' : 'Center Object';
    switch (centerStatus) {
      case 'resolving':
        return centerIsObjectLayoutMode ? 'Layout: Resolving' : 'Center: Resolving';
      case 'preparing':
        return centerIsObjectLayoutMode ? 'Layout: Preparing' : 'Center: Preparing';
      case 'uploading':
        return centerIsObjectLayoutMode ? 'Layout: Uploading' : 'Center: Uploading';
      case 'processing':
        return centerIsObjectLayoutMode ? 'Layout: Processing' : 'Center: Processing';
      case 'persisting':
        return centerIsObjectLayoutMode ? 'Layout: Persisting' : 'Center: Persisting';
      default:
        return centerIsObjectLayoutMode ? 'Object Layouting' : 'Center Object';
    }
  }, [centerBusy, centerIsObjectLayoutMode, centerStatus]);
  const autoScaleBusyLabel = useMemo(() => {
    if (!autoScaleBusy) return 'Auto Scale';
    switch (autoScaleStatus) {
      case 'resolving':
        return 'Auto Scale: Resolving';
      case 'preparing':
        return 'Auto Scale: Preparing';
      case 'uploading':
        return 'Auto Scale: Uploading';
      case 'processing':
        return 'Auto Scale: Processing';
      case 'persisting':
        return 'Auto Scale: Persisting';
      default:
        return 'Auto Scale';
    }
  }, [autoScaleBusy, autoScaleStatus]);

  const quickSwitchModels = useMemo(
    () =>
      normalizeImageStudioModelPresets(
        studioSettings.targetAi.openai.modelPresets,
        studioSettings.targetAi.openai.model,
      ),
    [studioSettings.targetAi.openai.modelPresets, studioSettings.targetAi.openai.model]
  );
  const modelOptions = useMemo(
    () => quickSwitchModels.map((modelId) => ({ value: modelId, label: modelId })),
    [quickSwitchModels]
  );
  const imageCountOptions = useMemo(
    () => ['1', '2', '4'].map((value: string) => ({ value, label: value })),
    []
  );
  const maskModeOptions = useMemo(
    () => ([
      { value: 'ai-polygon', label: 'AI Polygon' },
      { value: 'ai-bbox', label: 'AI Bounding Box' },
      { value: 'threshold', label: 'Threshold' },
      { value: 'edges', label: 'Edge Detection' },
    ]),
    []
  );
  const maskAttachModeOptions = useMemo(
    () => ([
      { value: 'client_canvas_polygon', label: 'Option A: Canvas Polygon' },
      { value: 'server_polygon', label: 'Option C: Server Polygon' },
    ]),
    []
  );
  const upscaleModeOptions = useMemo(
    () => ([
      { value: 'client_canvas', label: 'Upscale A: Canvas' },
      { value: 'server_sharp', label: 'Upscale Server: Sharp' },
    ]),
    []
  );
  const upscaleStrategyOptions = useMemo(
    () => ([
      { value: 'scale', label: 'By Multiplier' },
      { value: 'target_resolution', label: 'By Resolution' },
    ]),
    []
  );
  const cropModeOptions = useMemo(
    () => ([
      { value: 'client_bbox', label: 'Crop Client: Canvas' },
      { value: 'server_bbox', label: 'Crop Server: Sharp' },
    ]),
    []
  );
  const centerModeOptions = useMemo(
    () => ([
      { value: 'client_alpha_bbox', label: 'Center Client: Canvas' },
      { value: 'server_alpha_bbox', label: 'Center Server: Sharp' },
      { value: 'client_object_layout_v1', label: 'Object Layouting Client (Experimental)' },
      { value: 'server_object_layout_v1', label: 'Object Layouting Server (Experimental)' },
    ]),
    []
  );
  const autoScaleModeOptions = useMemo(
    () => ([
      { value: 'client_auto_scaler_v1', label: 'Auto Scaler Client: Canvas' },
      { value: 'server_auto_scaler_v1', label: 'Auto Scaler Server: Sharp' },
    ]),
    []
  );
  const shadowPolicyOptions = useMemo(
    () => ([
      { value: 'auto', label: 'Shadow: Auto' },
      { value: 'include_shadow', label: 'Shadow: Include' },
      { value: 'exclude_shadow', label: 'Shadow: Exclude' },
    ]),
    []
  );
  const detectionModeOptions = useMemo(
    () => ([
      { value: 'auto', label: 'Detection: Auto' },
      { value: 'white_bg_first_colored_pixel', label: 'Detection: White FG' },
      { value: 'alpha_bbox', label: 'Detection: Alpha BBox' },
    ]),
    []
  );
  const upscaleScaleOptions = useMemo(
    () => ['1.5', '2', '3', '4'].map((value: string) => ({ value, label: `${value}x` })),
    []
  );
  const upscaleSmoothingOptions = useMemo(
    () => ([
      { value: 'high', label: 'Smoothing High' },
      { value: 'medium', label: 'Smoothing Medium' },
      { value: 'low', label: 'Smoothing Low' },
    ]),
    []
  );

  const hasSourceImage = Boolean(workingSlot && workingSlotImageSrc);
  const cropTooltipsEnabled = studioSettings.helpTooltips.cropButtonsEnabled;
  const cropTooltipContent = useMemo(
    () => ({
      cropBoxTool: getImageStudioDocTooltip('crop_box_tool'),
      crop: getImageStudioDocTooltip('crop'),
      squareCrop: getImageStudioDocTooltip('square_crop'),
      viewCrop: getImageStudioDocTooltip('view_crop'),
      cancelCrop: getImageStudioDocTooltip('cancel_crop'),
    }),
    []
  );
  const centerTooltipContent = useMemo(
    () => ({
      mode: getImageStudioDocTooltip('object_layout_mode'),
      detection: getImageStudioDocTooltip('object_layout_mode'),
      padding: getImageStudioDocTooltip('object_layout_padding'),
      thresholds: getImageStudioDocTooltip('object_layout_mode'),
      paddingAxes: getImageStudioDocTooltip('object_layout_padding_axes'),
      fillMissingCanvasWhite: getImageStudioDocTooltip('object_layout_fill_missing_canvas_white'),
      shadowPolicy: getImageStudioDocTooltip('object_layout_mode'),
      apply: getImageStudioDocTooltip('object_layout_apply'),
    }),
    []
  );
  const autoScaleTooltipContent = useMemo(
    () => ({
      mode: getImageStudioDocTooltip('object_layout_mode'),
      padding: getImageStudioDocTooltip('object_layout_padding'),
      paddingAxes: getImageStudioDocTooltip('object_layout_padding_axes'),
      fillMissingCanvasWhite: getImageStudioDocTooltip('object_layout_fill_missing_canvas_white'),
      shadowPolicy: getImageStudioDocTooltip('object_layout_mode'),
      apply: getImageStudioDocTooltip('object_layout_apply'),
    }),
    []
  );
  const generationModel = studioSettings.targetAi.openai.model;
  const generationImageCount = String(studioSettings.targetAi.openai.image.n ?? 1);
  const normalizedWorkingSlotId = workingSlot?.id?.trim() ?? '';
  const analysisPlanSlotId = analysisPlanSnapshot?.slotId?.trim() ?? '';
  const analysisPlanSourceSignature = analysisPlanSnapshot?.sourceSignature?.trim() ?? '';
  const analysisPlanHasSourceSignature = analysisPlanSourceSignature.length > 0;
  const analysisPlanAvailable = Boolean(analysisPlanSnapshot);
  const analysisPlanMatchesWorkingSlot = Boolean(
    analysisPlanSnapshot &&
    normalizedWorkingSlotId &&
    analysisPlanSlotId === normalizedWorkingSlotId &&
    analysisPlanHasSourceSignature &&
    workingSourceSignature &&
    analysisPlanSourceSignature === workingSourceSignature
  );

  const handleApplyAnalysisPlanToCenter = (): void => {
    if (!analysisPlanSnapshot) {
      toast('No analysis plan is available yet. Run analysis first.', { variant: 'info' });
      return;
    }
    if (!normalizedWorkingSlotId || analysisPlanSlotId !== normalizedWorkingSlotId) {
      toast('Latest analysis plan belongs to a different slot. Select that slot first.', { variant: 'info' });
      return;
    }
    if (!analysisPlanHasSourceSignature) {
      toast('Analysis plan is missing source metadata. Rerun analysis first.', { variant: 'info' });
      return;
    }
    if (!workingSourceSignature || analysisPlanSourceSignature !== workingSourceSignature) {
      toast('Latest analysis plan is stale for the current slot image. Rerun analysis first.', { variant: 'info' });
      return;
    }
    applyAnalysisLayoutToCenter(analysisPlanSnapshot.layout, 'manual');
  };

  const handleApplyAnalysisPlanToAutoScaler = (): void => {
    if (!analysisPlanSnapshot) {
      toast('No analysis plan is available yet. Run analysis first.', { variant: 'info' });
      return;
    }
    if (!normalizedWorkingSlotId || analysisPlanSlotId !== normalizedWorkingSlotId) {
      toast('Latest analysis plan belongs to a different slot. Select that slot first.', { variant: 'info' });
      return;
    }
    if (!analysisPlanHasSourceSignature) {
      toast('Analysis plan is missing source metadata. Rerun analysis first.', { variant: 'info' });
      return;
    }
    if (!workingSourceSignature || analysisPlanSourceSignature !== workingSourceSignature) {
      toast('Latest analysis plan is stale for the current slot image. Rerun analysis first.', { variant: 'info' });
      return;
    }
    applyAnalysisLayoutToAutoScaler(analysisPlanSnapshot.layout, 'manual');
  };

  return (
    <div className='space-y-3'>
      <GenerationToolbarDefaultsSection
        model={generationModel}
        modelOptions={modelOptions}
        onModelChange={(value: string) => {
          setStudioSettings((prev) => ({
            ...prev,
            targetAi: {
              ...prev.targetAi,
              openai: {
                ...prev.targetAi.openai,
                api: 'images',
                model: value,
              },
            },
          }));
        }}
        imageCount={generationImageCount}
        imageCountOptions={imageCountOptions}
        onImageCountChange={(value: string) => {
          setStudioSettings((prev) => ({
            ...prev,
            targetAi: {
              ...prev.targetAi,
              openai: {
                ...prev.targetAi.openai,
                image: { ...prev.targetAi.openai.image, n: Number(value) },
              },
            },
          }));
        }}
      />

      <GenerationToolbarMaskSection
        exportMaskCount={exportMaskCount}
        maskAttachMode={maskAttachMode}
        maskAttachModeOptions={maskAttachModeOptions}
        maskGenerationBusy={maskGenerationBusy}
        maskGenerationLabel={maskGenerationLabel}
        maskGenLoading={maskGenLoading}
        maskGenMode={maskGenMode}
        maskInvert={maskInvert}
        maskModeOptions={maskModeOptions}
        maskPreviewEnabled={maskPreviewEnabled}
        onAttachMasks={() => {
          void attachMaskVariantsFromSelection();
        }}
        onGenerateMask={() => {
          handleAiMaskGeneration(maskGenMode);
        }}
        onMaskAttachModeChange={(value: string) => {
          setMaskAttachMode(value as MaskAttachMode);
        }}
        onMaskGenModeChange={(value: string) => {
          const mode = value as 'ai-polygon' | 'ai-bbox' | 'threshold' | 'edges';
          setMaskGenMode(mode);
        }}
        onMaskInvertChange={(checked: boolean) => {
          setMaskInvert(Boolean(checked));
        }}
        onMaskPreviewEnabledChange={(checked: boolean) => {
          setMaskPreviewEnabled(Boolean(checked));
        }}
        workingSlotPresent={Boolean(workingSlot)}
      />

      <GenerationToolbarCropSection
        cropBusy={cropBusy}
        cropBusyLabel={cropBusyLabel}
        boundaryStatusLabel={cropBoundaryStatusLabel}
        cropMode={cropMode}
        cropModeOptions={cropModeOptions}
        cropTooltipContent={cropTooltipContent}
        cropTooltipsEnabled={cropTooltipsEnabled}
        hasCropBoundary={hasCropBoundary}
        hasSourceImage={hasSourceImage}
        onCancelCrop={handleCancelCrop}
        onCreateCropBox={handleCreateCropBox}
        onCrop={() => {
          void handleCrop();
        }}
        onCropModeChange={(value: string) => {
          setCropMode(value as CropMode);
        }}
        onSquareCrop={() => {
          void handleSquareCrop();
        }}
        onViewCrop={() => {
          void handlePreviewViewCrop();
        }}
      />

      <GenerationToolbarUpscaleSection
        hasSourceImage={hasSourceImage}
        onCancelUpscale={handleCancelUpscale}
        onUpscale={() => {
          void handleUpscale();
        }}
        onUpscaleModeChange={(value: string) => {
          setUpscaleMode(value as UpscaleMode);
        }}
        onUpscaleScaleChange={(value: string) => {
          setUpscaleScale(value);
        }}
        onUpscaleSmoothingQualityChange={(value: string) => {
          setUpscaleSmoothingQuality(value as UpscaleSmoothingQuality);
        }}
        onUpscaleStrategyChange={(value: string) => {
          setUpscaleStrategy(value as UpscaleStrategy);
        }}
        onUpscaleTargetHeightChange={(value: string) => {
          setUpscaleTargetHeight(value.replace(/[^0-9]/g, ''));
        }}
        onUpscaleTargetWidthChange={(value: string) => {
          setUpscaleTargetWidth(value.replace(/[^0-9]/g, ''));
        }}
        upscaleBusy={upscaleBusy}
        upscaleBusyLabel={upscaleBusyLabel}
        upscaleMaxOutputSide={UPSCALE_MAX_OUTPUT_SIDE}
        upscaleMode={upscaleMode}
        upscaleModeOptions={upscaleModeOptions}
        upscaleScale={upscaleScale}
        upscaleScaleOptions={upscaleScaleOptions}
        upscaleSmoothingOptions={upscaleSmoothingOptions}
        upscaleSmoothingQuality={upscaleSmoothingQuality}
        upscaleStrategy={upscaleStrategy}
        upscaleStrategyOptions={upscaleStrategyOptions}
        upscaleTargetHeight={upscaleTargetHeight}
        upscaleTargetWidth={upscaleTargetWidth}
      />

      <GenerationToolbarCenterSection
        analysisPlanAvailable={analysisPlanAvailable}
        analysisPlanMatchesWorkingSlot={analysisPlanMatchesWorkingSlot}
        centerBusy={centerBusy}
        centerBusyLabel={centerBusyLabel}
        centerGuidesEnabled={centerGuidesEnabled}
        centerLayoutEnabled={centerIsObjectLayoutMode}
        centerLayoutPadding={centerLayoutPadding}
        centerLayoutPaddingX={centerLayoutPaddingX}
        centerLayoutPaddingY={centerLayoutPaddingY}
        centerLayoutSplitAxes={centerLayoutSplitAxes}
        centerLayoutAdvancedEnabled={centerLayoutAdvancedEnabled}
        centerLayoutPreset={centerLayoutPresetOptionValue}
        centerLayoutPresetOptions={centerLayoutPresetOptions}
        centerLayoutPresetDraftName={centerLayoutPresetDraftName}
        centerLayoutCanDeletePreset={centerLayoutCanDeletePreset}
        centerLayoutCanSavePreset={centerLayoutCanSavePreset}
        centerLayoutSavePresetLabel={centerLayoutSavePresetLabel}
        centerLayoutDetection={centerLayoutDetection}
        centerLayoutDetectionOptions={detectionModeOptions}
        centerLayoutWhiteThreshold={centerLayoutWhiteThreshold}
        centerLayoutChromaThreshold={centerLayoutChromaThreshold}
        centerLayoutFillMissingCanvasWhite={centerLayoutFillMissingCanvasWhite}
        centerLayoutProjectCanvasSize={projectCanvasSize}
        centerLayoutShadowPolicy={centerLayoutShadowPolicy}
        centerLayoutShadowPolicyOptions={shadowPolicyOptions}
        centerTooltipContent={centerTooltipContent}
        centerTooltipsEnabled={cropTooltipsEnabled}
        centerMode={centerMode}
        centerModeOptions={centerModeOptions}
        hasSourceImage={hasSourceImage}
        onCancelCenter={handleCancelCenter}
        onCenterLayoutPaddingChange={(value: string) => {
          const normalized = sanitizeCenterPaddingInput(value);
          setCenterLayoutPadding(normalized);
          if (!centerLayoutSplitAxes) {
            setCenterLayoutPaddingX(normalized);
            setCenterLayoutPaddingY(normalized);
          }
        }}
        onCenterLayoutPaddingXChange={(value: string) => {
          const normalized = sanitizeCenterPaddingInput(value);
          setCenterLayoutPaddingX(normalized);
        }}
        onCenterLayoutPaddingYChange={(value: string) => {
          const normalized = sanitizeCenterPaddingInput(value);
          setCenterLayoutPaddingY(normalized);
        }}
        onCenterLayoutDetectionChange={(value: string) => {
          setCenterLayoutDetection(value as CenterDetectionMode);
        }}
        onCenterLayoutPresetChange={(value: string) => {
          const presetValues = getObjectLayoutPresetValuesFromOption(
            value as ObjectLayoutPresetOptionValue,
            centerLayoutCustomPresets
          );
          if (!presetValues) return;
          setCenterLayoutDetection(presetValues.detection);
          setCenterLayoutShadowPolicy(presetValues.shadowPolicy);
          setCenterLayoutWhiteThreshold(String(presetValues.whiteThreshold));
          setCenterLayoutChromaThreshold(String(presetValues.chromaThreshold));
        }}
        onCenterLayoutPresetDraftNameChange={(value: string) => {
          setCenterLayoutPresetDraftName(value);
        }}
        onCenterLayoutSavePreset={() => {
          try {
            const saved = saveObjectLayoutCustomPreset(activeProjectId, {
              presetId: selectedCenterCustomPresetId,
              name: centerLayoutPresetDraftName,
              values: {
                detection: centerLayoutDetection,
                shadowPolicy: centerLayoutShadowPolicy,
                whiteThreshold: centerLayoutWhiteThresholdValue,
                chromaThreshold: centerLayoutChromaThresholdValue,
              },
            });
            setCenterLayoutCustomPresets(saved.presets);
            setCenterLayoutPresetDraftName(saved.savedPreset.name);
            toast(`Saved preset "${saved.savedPreset.name}".`, { variant: 'success' });
          } catch (error) {
            toast(error instanceof Error ? error.message : 'Failed to save custom preset.', { variant: 'error' });
          }
        }}
        onCenterLayoutDeletePreset={() => {
          if (!selectedCenterCustomPresetId) return;
          const deletedName = selectedCenterCustomPreset?.name?.trim() ?? '';
          const nextPresets = deleteObjectLayoutCustomPreset(activeProjectId, selectedCenterCustomPresetId);
          setCenterLayoutCustomPresets(nextPresets);
          setCenterLayoutPresetDraftName('');
          toast(
            deletedName
              ? `Deleted preset "${deletedName}".`
              : 'Deleted selected custom preset.',
            { variant: 'success' }
          );
        }}
        onCenterLayoutWhiteThresholdChange={(value: string) => {
          setCenterLayoutWhiteThreshold(sanitizeCenterThresholdInput(value));
        }}
        onCenterLayoutChromaThresholdChange={(value: string) => {
          setCenterLayoutChromaThreshold(sanitizeCenterThresholdInput(value));
        }}
        onCenterLayoutFillMissingCanvasWhiteChange={(checked: boolean) => {
          setCenterLayoutFillMissingCanvasWhite(checked);
        }}
        onCenterLayoutShadowPolicyChange={(value: string) => {
          setCenterLayoutShadowPolicy(value as CenterShadowPolicy);
        }}
        onApplyAnalysisPlan={handleApplyAnalysisPlanToCenter}
        onCenterModeChange={(value: string) => {
          setCenterMode(value as CenterMode);
        }}
        onCenterObject={() => {
          void handleCenterObject();
        }}
        onToggleCenterLayoutSplitAxes={() => {
          setCenterLayoutSplitAxes((previous) => {
            const next = !previous;
            if (next) {
              const normalized = sanitizeCenterPaddingInput(centerLayoutPadding);
              setCenterLayoutPaddingX(normalized);
              setCenterLayoutPaddingY(normalized);
            } else {
              const mergedPadding = String(
                Number(((centerLayoutPaddingXPercent + centerLayoutPaddingYPercent) / 2).toFixed(2))
              );
              setCenterLayoutPadding(mergedPadding);
              setCenterLayoutPaddingX(mergedPadding);
              setCenterLayoutPaddingY(mergedPadding);
            }
            return next;
          });
        }}
        onToggleCenterLayoutAdvanced={() => {
          setCenterLayoutAdvancedEnabled((previous) => !previous);
        }}
        onToggleCenterGuides={() => {
          setCenterGuidesEnabled(!centerGuidesEnabled);
        }}
      />

      <GenerationToolbarAutoScalerSection
        analysisPlanAvailable={analysisPlanAvailable}
        analysisPlanMatchesWorkingSlot={analysisPlanMatchesWorkingSlot}
        autoScaleBusy={autoScaleBusy}
        autoScaleBusyLabel={autoScaleBusyLabel}
        autoScaleLayoutPadding={autoScaleLayoutPadding}
        autoScaleLayoutPaddingX={autoScaleLayoutPaddingX}
        autoScaleLayoutPaddingY={autoScaleLayoutPaddingY}
        autoScaleLayoutSplitAxes={autoScaleLayoutSplitAxes}
        autoScaleLayoutFillMissingCanvasWhite={autoScaleLayoutFillMissingCanvasWhite}
        autoScaleLayoutProjectCanvasSize={projectCanvasSize}
        autoScaleShadowPolicy={autoScaleLayoutShadowPolicy}
        autoScaleShadowPolicyOptions={shadowPolicyOptions}
        autoScaleTooltipContent={autoScaleTooltipContent}
        autoScaleTooltipsEnabled={cropTooltipsEnabled}
        autoScaleMode={autoScaleMode}
        autoScaleModeOptions={autoScaleModeOptions}
        hasSourceImage={hasSourceImage}
        onAutoScale={() => {
          void handleAutoScale();
        }}
        onCancelAutoScale={handleCancelAutoScale}
        onAutoScaleLayoutPaddingChange={(value: string) => {
          const normalized = sanitizeCenterPaddingInput(value);
          setAutoScaleLayoutPadding(normalized);
          if (!autoScaleLayoutSplitAxes) {
            setAutoScaleLayoutPaddingX(normalized);
            setAutoScaleLayoutPaddingY(normalized);
          }
        }}
        onAutoScaleLayoutPaddingXChange={(value: string) => {
          const normalized = sanitizeCenterPaddingInput(value);
          setAutoScaleLayoutPaddingX(normalized);
        }}
        onAutoScaleLayoutPaddingYChange={(value: string) => {
          const normalized = sanitizeCenterPaddingInput(value);
          setAutoScaleLayoutPaddingY(normalized);
        }}
        onAutoScaleLayoutFillMissingCanvasWhiteChange={(checked: boolean) => {
          setAutoScaleLayoutFillMissingCanvasWhite(checked);
        }}
        onAutoScaleShadowPolicyChange={(value: string) => {
          setAutoScaleLayoutShadowPolicy(value as CenterShadowPolicy);
        }}
        onApplyAnalysisPlan={handleApplyAnalysisPlanToAutoScaler}
        onAutoScaleModeChange={(value: string) => {
          setAutoScaleMode(value as AutoScalerMode);
        }}
        onToggleAutoScaleLayoutSplitAxes={() => {
          setAutoScaleLayoutSplitAxes((previous) => {
            const next = !previous;
            if (next) {
              const normalized = sanitizeCenterPaddingInput(autoScaleLayoutPadding);
              setAutoScaleLayoutPaddingX(normalized);
              setAutoScaleLayoutPaddingY(normalized);
            } else {
              const mergedPadding = String(
                Number(((autoScaleLayoutPaddingXPercent + autoScaleLayoutPaddingYPercent) / 2).toFixed(2))
              );
              setAutoScaleLayoutPadding(mergedPadding);
              setAutoScaleLayoutPaddingX(mergedPadding);
              setAutoScaleLayoutPaddingY(mergedPadding);
            }
            return next;
          });
        }}
      />
    </div>
  );
}
