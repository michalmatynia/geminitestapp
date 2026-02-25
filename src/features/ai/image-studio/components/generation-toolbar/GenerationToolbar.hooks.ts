import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';
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
} from '../../utils/analysis-bridge';
import { getImageStudioSlotImageSrc } from '../../utils/image-src';
import {
  loadObjectLayoutAdvancedDefaults,
  loadObjectLayoutCustomPresets,
} from '../../utils/object-layout-presets';
import {
  resolveClientProcessingImageSrc,
  shapeHasUsableCropGeometry,
  type MaskShapeForExport,
  type CropRectResolutionDiagnostics,
} from './GenerationToolbarImageUtils';
import { useGenerationToolbarContext } from './GenerationToolbarContext';
import { normalizeMaskShapeForExport } from './GenerationToolbar.utils';
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
    toolbarContext.setCenterLayoutPresetDraftName('');
    toolbarContext.setCenterLayoutCustomPresets(loadObjectLayoutCustomPresets(activeProjectId));
    const persistedDefaults = loadObjectLayoutAdvancedDefaults(activeProjectId);
    if (!persistedDefaults) return;
    toolbarContext.setCenterLayoutDetection(persistedDefaults.detection);
    toolbarContext.setCenterLayoutShadowPolicy(persistedDefaults.shadowPolicy);
    toolbarContext.setCenterLayoutWhiteThreshold(String(persistedDefaults.whiteThreshold));
    toolbarContext.setCenterLayoutChromaThreshold(String(persistedDefaults.chromaThreshold));
  }, [activeProjectId, toolbarContext]);

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
    handleAiMaskGeneration: (mode: 'ai-polygon' | 'ai-bbox' | 'threshold' | 'edges') => handleAiMaskGeneration(mode),
    studioSettings,
    setStudioSettings,
    toast: (message: string, options?: any) => { toast(message, options); },
    queryClient,
    upscaleRequestInFlightRef,
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
  };
}
