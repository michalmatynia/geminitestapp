import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';
import { useMaskingState, useMaskingActions } from '../../context/MaskingContext';
import { useProjectsState } from '../../context/ProjectsContext';
import { useSettingsState, useSettingsActions } from '../../context/SettingsContext';
import { useSlotsState, useSlotsActions } from '../../context/SlotsContext';
import { useUiActions, useUiState } from '../../context/UiContext';
import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import {
  buildImageStudioAnalysisSourceSignature,
  clearImageStudioAnalysisApplyIntent,
  IMAGE_STUDIO_ANALYSIS_PLAN_CHANGED_EVENT,
  loadImageStudioAnalysisApplyIntent,
  loadImageStudioAnalysisPlanSnapshot,
  type ImageStudioAnalysisSharedLayout,
} from '../../utils/analysis-bridge';
import { getImageStudioSlotImageSrc } from '../../utils/image-src';
import {
  IMAGE_STUDIO_OBJECT_LAYOUT_PRESETS_CHANGED_EVENT,
  loadObjectLayoutAdvancedDefaults,
  loadObjectLayoutCustomPresets,
} from '../../utils/object-layout-presets';
import {
  hasCanvasOverflowFromImageFrame,
  loadImageElement,
  resolveClientProcessingImageSrc,
  shapeHasUsableCropGeometry,
  type CropCanvasContext,
  type CropRectResolutionDiagnostics,
  type CropRect,
  type ImageContentFrame,
  type MaskShapeForExport,
} from './GenerationToolbarImageUtils';
import { useGenerationToolbarContext } from './GenerationToolbarContext';
import { normalizeMaskShapeForExport, formatLayoutPercent } from './GenerationToolbar.utils';
import { PRODUCT_STUDIO_SEQUENCE_GENERATION_MODE_SETTING_KEY } from '@/features/products/constants';
import { getSettingValue } from '@/features/products/services/aiDescriptionService';
import { normalizeProductStudioSequenceGenerationMode } from '@/shared/contracts/products';

export function useGenerationToolbarState() {
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
  } = useMaskingState();
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
    maskPreviewEnabled,
    centerGuidesEnabled,
    setMaskPreviewEnabled,
    setCenterGuidesEnabled,
    setCanvasSelectionEnabled,
    getPreviewCanvasViewportCrop,
    getPreviewCanvasImageFrame,
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
    maskGenMode,
    setTool,
    setMaskShapes,
    setActiveMaskId,
    setMaskInvert,
    setMaskGenMode,
    handleAiMaskGeneration,
    studioSettings,
    setStudioSettings,
    toast,
    queryClient,
    ...toolbarContext,
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
