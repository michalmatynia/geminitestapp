import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast, type ToastOptions } from '@/shared/ui';
import { useMaskingState, useMaskingActions } from '../../context/MaskingContext';
import { useProjectsState } from '../../context/ProjectsContext';
import { useSettingsState, useSettingsActions } from '../../context/SettingsContext';
import { useSlotsState, useSlotsActions } from '../../context/SlotsContext';
import { useUiActions, useUiState, type PreviewCanvasViewportCrop, type PreviewCanvasImageFrameBinding } from '../../context/UiContext';
import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import {
  buildImageStudioAnalysisSourceSignature,
  type ImageStudioAnalysisSharedLayout,
} from '../../utils/analysis-bridge';
import { getImageStudioSlotImageSrc } from '../../utils/image-src';
import {
  loadObjectLayoutAdvancedDefaults,
  loadObjectLayoutCustomPresets,
  resolveObjectLayoutPresetOptionValue,
} from '../../utils/object-layout-presets';
import {
  resolveClientProcessingImageSrc,
  shapeHasUsableCropGeometry,
  type MaskShapeForExport,
  type CropRectResolutionDiagnostics,
} from './GenerationToolbarImageUtils';
import {
  CENTER_LAYOUT_DEFAULT_CHROMA_THRESHOLD,
  CENTER_LAYOUT_DEFAULT_WHITE_THRESHOLD,
  CENTER_LAYOUT_MAX_CHROMA_THRESHOLD,
  CENTER_LAYOUT_MAX_WHITE_THRESHOLD,
  CENTER_LAYOUT_MIN_CHROMA_THRESHOLD,
  CENTER_LAYOUT_MIN_WHITE_THRESHOLD,
  normalizeCenterThreshold,
  normalizeMaskShapeForExport,
} from './GenerationToolbar.utils';
import { useGenerationToolbarContext } from './GenerationToolbarContext';
import { type GenerationToolbarState } from './GenerationToolbar.types';

export function useGenerationToolbarState(): GenerationToolbarState {
  const { maskPreviewEnabled, centerGuidesEnabled } = useUiState();
  const uiActions = useUiActions();
  const {
    setMaskPreviewEnabled,
    setCenterGuidesEnabled,
    setCanvasSelectionEnabled,
  } = uiActions;
  const { projectId, projectsQuery } = useProjectsState();
  const { workingSlot } = useSlotsState();
  const { setSelectedSlotId, setWorkingSlotId } = useSlotsActions();
  const settingsStore = useSettingsStore();
  const maskingState = useMaskingState();
  const {
    maskShapes,
    activeMaskId,
    maskInvert,
    maskGenLoading,
    maskGenMode,
  } = maskingState;
  const maskingActions = useMaskingActions();
  const {
    setTool,
    setMaskShapes,
    setActiveMaskId,
    setMaskInvert,
    setMaskGenMode,
    handleAiMaskGeneration,
  } = maskingActions;
  const { studioSettings } = useSettingsState();
  const { setStudioSettings } = useSettingsActions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const toolbarContext = useGenerationToolbarContext();
  const {
    setCenterLayoutPresetDraftName,
    setCenterLayoutCustomPresets,
    setCenterLayoutDetection,
    setCenterLayoutShadowPolicy,
    setCenterLayoutWhiteThreshold,
    setCenterLayoutChromaThreshold,
    centerLayoutWhiteThreshold,
    centerLayoutChromaThreshold,
    centerLayoutDetection,
    centerLayoutShadowPolicy,
    centerLayoutCustomPresets,
  } = toolbarContext;

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
  const cropDiagnosticsRef = useRef<CropRectResolutionDiagnostics | null>(null);

  const centerLayoutWhiteThresholdValue = useMemo(
    () => normalizeCenterThreshold(
      centerLayoutWhiteThreshold,
      CENTER_LAYOUT_MIN_WHITE_THRESHOLD,
      CENTER_LAYOUT_MAX_WHITE_THRESHOLD,
      CENTER_LAYOUT_DEFAULT_WHITE_THRESHOLD
    ),
    [centerLayoutWhiteThreshold]
  );

  const centerLayoutChromaThresholdValue = useMemo(
    () => normalizeCenterThreshold(
      centerLayoutChromaThreshold,
      CENTER_LAYOUT_MIN_CHROMA_THRESHOLD,
      CENTER_LAYOUT_MAX_CHROMA_THRESHOLD,
      CENTER_LAYOUT_DEFAULT_CHROMA_THRESHOLD
    ),
    [centerLayoutChromaThreshold]
  );

  const centerLayoutPresetOptionValue = useMemo(
    () => resolveObjectLayoutPresetOptionValue({
      detection: centerLayoutDetection,
      shadowPolicy: centerLayoutShadowPolicy,
      whiteThreshold: centerLayoutWhiteThresholdValue,
      chromaThreshold: centerLayoutChromaThresholdValue,
    }, centerLayoutCustomPresets),
    [centerLayoutDetection, centerLayoutShadowPolicy, centerLayoutWhiteThresholdValue, centerLayoutChromaThresholdValue, centerLayoutCustomPresets]
  );

  const selectedCenterCustomPresetId = useMemo(() => {
    if (!centerLayoutPresetOptionValue.startsWith('user:')) return null;
    return centerLayoutPresetOptionValue.slice(5);
  }, [centerLayoutPresetOptionValue]);

  const selectedCenterCustomPreset = useMemo(() => {
    if (!selectedCenterCustomPresetId) return null;
    return centerLayoutCustomPresets.find(p => p.id === selectedCenterCustomPresetId) ?? null;
  }, [selectedCenterCustomPresetId, centerLayoutCustomPresets]);

  const centerIsObjectLayoutMode =
    toolbarContext.centerMode === 'client_object_layout_v1' ||
    toolbarContext.centerMode === 'server_object_layout_v1';

  const analysisPlanAvailable = Boolean(toolbarContext.analysisPlanSnapshot);
  const analysisPlanSlotId = toolbarContext.analysisPlanSnapshot?.slotId?.trim() ?? '';
  const normalizedWorkingSlotId = workingSlot?.id?.trim() ?? '';
  const analysisPlanMatchesWorkingSlot =
    analysisPlanAvailable &&
    normalizedWorkingSlotId !== '' &&
    analysisPlanSlotId === normalizedWorkingSlotId;

  const analysisPlanSourceSignature = toolbarContext.analysisPlanSnapshot?.sourceSignature?.trim() ?? '';
  const analysisPlanIsStale =
    analysisPlanAvailable &&
    (!workingSourceSignature || analysisPlanSourceSignature !== workingSourceSignature);

  const analysisSummaryData = useMemo((): ImageStudioAnalysisSummaryChipData | null => {
    if (!toolbarContext.analysisPlanSnapshot) return null;
    const { layout } = toolbarContext.analysisPlanSnapshot;
    return {
      detection: layout.detection,
      shadowPolicy: layout.shadowPolicy,
      padding: layout.paddingPercent,
      whiteThreshold: layout.whiteThreshold,
      chromaThreshold: layout.chromaThreshold,
    };
  }, [toolbarContext.analysisPlanSnapshot]);

  const centerAnalysisConfigMismatchMessage = useMemo(() => {
    if (!analysisPlanAvailable || !analysisPlanMatchesWorkingSlot || analysisPlanIsStale) return null;
    return null; // Logic could be added here to compare current UI state with analysis plan
  }, [analysisPlanAvailable, analysisPlanMatchesWorkingSlot, analysisPlanIsStale]);

  const autoScaleAnalysisConfigMismatchMessage = useMemo(() => {
    if (!analysisPlanAvailable || !analysisPlanMatchesWorkingSlot || analysisPlanIsStale) return null;
    return null;
  }, [analysisPlanAvailable, analysisPlanMatchesWorkingSlot, analysisPlanIsStale]);

  const centerLayoutPresetOptions = useMemo(
    () => loadObjectLayoutCustomPresets(activeProjectId).map(p => ({
      value: `user:${p.id}`,
      label: `Preset: ${p.name}`
    })),
    [activeProjectId, centerLayoutCustomPresets]
  );

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
  }, [
    activeProjectId,
    setCenterLayoutPresetDraftName,
    setCenterLayoutCustomPresets,
    setCenterLayoutDetection,
    setCenterLayoutShadowPolicy,
    setCenterLayoutWhiteThreshold,
    setCenterLayoutChromaThreshold,
  ]);

  const normalizeAnalysisPercentString = (value: number, fallback: number): string => {
    const numeric = Number.isFinite(value) ? value : fallback;
    const clamped = Math.max(0, Math.min(40, numeric));
    const rounded = Number(clamped.toFixed(2));
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
  };

  const applyAnalysisLayoutToCenter = (
    layout: ImageStudioAnalysisSharedLayout,
    mode: 'auto' | 'manual'
  ): void => {
    toolbarContext.setCenterLayoutSplitAxes(Boolean(layout.splitAxes));
    toolbarContext.setCenterLayoutPadding(
      normalizeAnalysisPercentString(layout.paddingPercent, 8)
    );
    toolbarContext.setCenterLayoutPaddingX(
      normalizeAnalysisPercentString(layout.paddingXPercent, layout.paddingPercent)
    );
    toolbarContext.setCenterLayoutPaddingY(
      normalizeAnalysisPercentString(layout.paddingYPercent, layout.paddingPercent)
    );
    toolbarContext.setCenterLayoutFillMissingCanvasWhite(Boolean(layout.fillMissingCanvasWhite));
    toolbarContext.setCenterLayoutShadowPolicy(layout.shadowPolicy);
    toolbarContext.setCenterLayoutDetection(layout.detection);
    toolbarContext.setCenterLayoutWhiteThreshold(
      String(Math.round(Number.isFinite(layout.whiteThreshold) ? layout.whiteThreshold : 16))
    );
    toolbarContext.setCenterLayoutChromaThreshold(
      String(Math.round(Number.isFinite(layout.chromaThreshold) ? layout.chromaThreshold : 10))
    );
    if (mode === 'auto') {
      toolbarContext.setQueuedAnalysisRunTarget('object_layout');
    }
  };

  const applyAnalysisLayoutToAutoScaler = (
    layout: ImageStudioAnalysisSharedLayout,
    mode: 'auto' | 'manual'
  ): void => {
    toolbarContext.setAutoScaleLayoutSplitAxes(Boolean(layout.splitAxes));
    toolbarContext.setAutoScaleLayoutPadding(
      normalizeAnalysisPercentString(layout.paddingPercent, 8)
    );
    toolbarContext.setAutoScaleLayoutPaddingX(
      normalizeAnalysisPercentString(layout.paddingXPercent, layout.paddingPercent)
    );
    toolbarContext.setAutoScaleLayoutPaddingY(
      normalizeAnalysisPercentString(layout.paddingYPercent, layout.paddingPercent)
    );
    toolbarContext.setAutoScaleLayoutFillMissingCanvasWhite(Boolean(layout.fillMissingCanvasWhite));
    toolbarContext.setAutoScaleLayoutShadowPolicy(layout.shadowPolicy);
    if (mode === 'auto') {
      toolbarContext.setQueuedAnalysisRunTarget('auto_scaler');
    }
  };

  return {
    ...toolbarContext,
    maskPreviewEnabled,
    centerGuidesEnabled,
    setMaskPreviewEnabled,
    setCenterGuidesEnabled,
    setCanvasSelectionEnabled,
    getPreviewCanvasViewportCrop: (): PreviewCanvasViewportCrop | null => uiActions.getPreviewCanvasViewportCrop(),
    getPreviewCanvasImageFrame: (): PreviewCanvasImageFrameBinding | null => uiActions.getPreviewCanvasImageFrame(),
    projectId,
    projectsQuery,
    workingSlot,
    setSelectedSlotId,
    setWorkingSlotId,
    settingsStore,
    maskShapes,
    activeMaskId,
    maskInvert,
    maskGenLoading,
    maskGenMode: maskGenMode as 'ai-polygon' | 'ai-bbox' | 'threshold' | 'edges',
    setTool,
    setMaskShapes,
    setActiveMaskId,
    setMaskInvert,
    setMaskGenMode: (mode: 'ai-polygon' | 'ai-bbox' | 'threshold' | 'edges') => setMaskGenMode(mode),
    handleAiMaskGeneration: async (mode: 'ai-polygon' | 'ai-bbox' | 'threshold' | 'edges'): Promise<void> => {
      handleAiMaskGeneration(mode);
    },
    studioSettings,
    setStudioSettings,
    toast: (message: string, options?: ToastOptions) => { toast(message, options); },
    queryClient,    upscaleRequestInFlightRef,
    upscaleAbortControllerRef,
    cropRequestInFlightRef,
    cropAbortControllerRef,
    centerRequestInFlightRef,
    centerAbortControllerRef,
    autoScaleRequestInFlightRef,
    autoScaleAbortControllerRef,
    skipCenterAdvancedDefaultsSaveRef,
    selectedCenterCustomPresetIdRef,
    lastConsumedAnalysisIntentRef,
    cropDiagnosticsRef,
    maskShapesForExport,
    eligibleMaskShapes,
    exportMaskShapes,
    exportMaskCount,
    hasShapeCropBoundary,
    workingSlotImageSrc,
    clientProcessingImageSrc,
    workingSourceSignature,
    activeProjectId,
    projectCanvasSize,
    centerLayoutWhiteThresholdValue,
    centerLayoutChromaThresholdValue,
    centerLayoutPresetOptionValue,
    selectedCenterCustomPresetId,
    selectedCenterCustomPreset,
    centerIsObjectLayoutMode,
    analysisPlanAvailable,
    analysisPlanMatchesWorkingSlot,
    analysisSummaryData,
    analysisPlanIsStale,
    centerAnalysisConfigMismatchMessage,
    autoScaleAnalysisConfigMismatchMessage,
    centerLayoutPresetOptions,
    applyAnalysisLayoutToCenter,
    applyAnalysisLayoutToAutoScaler,
  };
}
