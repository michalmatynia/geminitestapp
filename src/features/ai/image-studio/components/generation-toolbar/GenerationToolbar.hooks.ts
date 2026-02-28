import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast, type ToastOptions } from '@/shared/ui';
import { useMaskingState, useMaskingActions } from '../../context/MaskingContext';
import { useProjectsState } from '../../context/ProjectsContext';
import { useSettingsState, useSettingsActions } from '../../context/SettingsContext';
import { useSlotsState, useSlotsActions } from '../../context/SlotsContext';
import {
  useUiActions,
  useUiState,
  type PreviewCanvasViewportCrop,
  type PreviewCanvasImageFrameBinding,
} from '../../context/UiContext';
import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import {
  buildImageStudioAnalysisSourceSignature,
  type ImageStudioAnalysisSharedLayout,
} from '@/shared/lib/ai/image-studio/utils/analysis-bridge';
import { getImageStudioSlotImageSrc } from '@/shared/lib/ai/image-studio/utils/image-src';
import {
  loadObjectLayoutAdvancedDefaults,
  loadObjectLayoutCustomPresets,
  resolveObjectLayoutPresetOptionValue,
} from '@/shared/lib/ai/image-studio/utils/object-layout-presets';
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
  normalizeCenterPaddingPercent,
  normalizeCenterThreshold,
  normalizeMaskShapeForExport,
} from './GenerationToolbar.utils';
import { type ImageStudioAnalysisSummaryChipData } from '../ImageStudioAnalysisSummaryChip';
import { useGenerationToolbarContext } from './GenerationToolbarContext';
import { type GenerationToolbarState } from './GenerationToolbar.types';

export function useGenerationToolbarState(): GenerationToolbarState {
  const { maskPreviewEnabled, centerGuidesEnabled } = useUiState();
  const uiActions = useUiActions();
  const { setMaskPreviewEnabled, setCenterGuidesEnabled, setCanvasSelectionEnabled } = uiActions;
  const { projectId, projectsQuery } = useProjectsState();
  const { slots, slotSelectionLocked, workingSlot } = useSlotsState();
  const { setSelectedSlotId, setWorkingSlotId } = useSlotsActions();
  const settingsStore = useSettingsStore();
  const maskingState = useMaskingState();
  const { maskShapes, activeMaskId, maskInvert, maskGenLoading, maskGenMode } = maskingState;
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
  const activeProjectId = projectId?.trim() ?? '';

  const toolbarContext = useGenerationToolbarContext();
  const {
    setCenterLayoutPresetDraftName,
    setCenterLayoutCustomPresets,
    setCenterLayoutDetection,
    setCenterLayoutShadowPolicy,
    setCenterLayoutWhiteThreshold,
    setCenterLayoutChromaThreshold,
    centerLayoutPadding,
    centerLayoutPaddingX,
    centerLayoutPaddingY,
    centerLayoutSplitAxes,
    centerLayoutFillMissingCanvasWhite,
    centerLayoutWhiteThreshold,
    centerLayoutChromaThreshold,
    centerLayoutDetection,
    centerLayoutShadowPolicy,
    centerLayoutCustomPresets,
    autoScaleLayoutPadding,
    autoScaleLayoutPaddingX,
    autoScaleLayoutPaddingY,
    autoScaleLayoutSplitAxes,
    autoScaleLayoutFillMissingCanvasWhite,
    autoScaleLayoutShadowPolicy,
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
    () =>
      normalizeCenterThreshold(
        centerLayoutWhiteThreshold,
        CENTER_LAYOUT_MIN_WHITE_THRESHOLD,
        CENTER_LAYOUT_MAX_WHITE_THRESHOLD,
        CENTER_LAYOUT_DEFAULT_WHITE_THRESHOLD
      ),
    [centerLayoutWhiteThreshold]
  );

  const centerLayoutChromaThresholdValue = useMemo(
    () =>
      normalizeCenterThreshold(
        centerLayoutChromaThreshold,
        CENTER_LAYOUT_MIN_CHROMA_THRESHOLD,
        CENTER_LAYOUT_MAX_CHROMA_THRESHOLD,
        CENTER_LAYOUT_DEFAULT_CHROMA_THRESHOLD
      ),
    [centerLayoutChromaThreshold]
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
      centerLayoutDetection,
      centerLayoutShadowPolicy,
      centerLayoutWhiteThresholdValue,
      centerLayoutChromaThresholdValue,
      centerLayoutCustomPresets,
    ]
  );

  const selectedCenterCustomPresetId = useMemo(() => {
    if (!centerLayoutPresetOptionValue.startsWith('user:')) return null;
    return centerLayoutPresetOptionValue.slice(5);
  }, [centerLayoutPresetOptionValue]);

  const selectedCenterCustomPreset = useMemo(() => {
    if (!selectedCenterCustomPresetId) return null;
    return centerLayoutCustomPresets.find((p) => p.id === selectedCenterCustomPresetId) ?? null;
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

  const analysisPlanSourceSignature =
    toolbarContext.analysisPlanSnapshot?.sourceSignature?.trim() ?? '';

  const analysisSummaryData = useMemo((): ImageStudioAnalysisSummaryChipData | null => {
    if (!toolbarContext.analysisPlanSnapshot) return null;
    const snap = toolbarContext.analysisPlanSnapshot;
    return {
      detectionUsed: snap.detectionUsed,
      confidence: snap.confidence,
      fallbackApplied: snap.fallbackApplied,
      policyReason: snap.policyReason,
      policyVersion: snap.policyVersion,
    };
  }, [toolbarContext.analysisPlanSnapshot]);

  const centerLayoutPresetOptions = useMemo(
    () =>
      loadObjectLayoutCustomPresets(activeProjectId).map((p) => ({
        value: `user:${p.id}`,
        label: `Preset: ${p.name}`,
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
          (shape.type === 'rect' || shape.type === 'ellipse'
            ? shape.points.length >= 2
            : shape.closed && shape.points.length >= 3)
      ),
    [maskShapesForExport]
  );

  const selectedEligibleMaskShapes = useMemo<MaskShapeForExport[]>(
    () => eligibleMaskShapes.filter((shape) => activeMaskId && shape.id === activeMaskId),
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
  const analysisWorkingSourceMetadataMissing =
    analysisPlanAvailable && analysisPlanMatchesWorkingSlot && !workingSourceSignature;
  const analysisPlanIsStale =
    analysisPlanAvailable &&
    analysisPlanMatchesWorkingSlot &&
    Boolean(workingSourceSignature) &&
    analysisPlanSourceSignature !== workingSourceSignature;

  const activeProject = useMemo(
    () => (projectsQuery.data ?? []).find((project) => project.id === projectId) ?? null,
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

  const normalizePaddingInput = (value: string, fallback: number): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return normalizeCenterPaddingPercent(String(parsed));
  };

  const centerLayoutPayload = useMemo(() => {
    const splitAxes = Boolean(centerLayoutSplitAxes);
    const uniformPadding = normalizePaddingInput(centerLayoutPadding, 8);
    const paddingX = splitAxes
      ? normalizePaddingInput(centerLayoutPaddingX, uniformPadding)
      : uniformPadding;
    const paddingY = splitAxes
      ? normalizePaddingInput(centerLayoutPaddingY, uniformPadding)
      : uniformPadding;
    const paddingPercent = splitAxes
      ? Number(((paddingX + paddingY) / 2).toFixed(2))
      : uniformPadding;
    const fillMissingCanvasWhite =
      Boolean(centerLayoutFillMissingCanvasWhite) && Boolean(projectCanvasSize);

    return {
      paddingPercent,
      paddingXPercent: paddingX,
      paddingYPercent: paddingY,
      fillMissingCanvasWhite,
      ...(fillMissingCanvasWhite && projectCanvasSize
        ? {
            targetCanvasWidth: projectCanvasSize.width,
            targetCanvasHeight: projectCanvasSize.height,
          }
        : {}),
      whiteThreshold: centerLayoutWhiteThresholdValue,
      chromaThreshold: centerLayoutChromaThresholdValue,
      shadowPolicy: centerLayoutShadowPolicy,
      detection: centerLayoutDetection,
    };
  }, [
    centerLayoutChromaThresholdValue,
    centerLayoutDetection,
    centerLayoutFillMissingCanvasWhite,
    centerLayoutPadding,
    centerLayoutPaddingX,
    centerLayoutPaddingY,
    centerLayoutShadowPolicy,
    centerLayoutSplitAxes,
    centerLayoutWhiteThresholdValue,
    projectCanvasSize,
  ]);

  const autoScaleLayoutPayload = useMemo(() => {
    const splitAxes = Boolean(autoScaleLayoutSplitAxes);
    const uniformPadding = normalizePaddingInput(autoScaleLayoutPadding, 8);
    const paddingX = splitAxes
      ? normalizePaddingInput(autoScaleLayoutPaddingX, uniformPadding)
      : uniformPadding;
    const paddingY = splitAxes
      ? normalizePaddingInput(autoScaleLayoutPaddingY, uniformPadding)
      : uniformPadding;
    const paddingPercent = splitAxes
      ? Number(((paddingX + paddingY) / 2).toFixed(2))
      : uniformPadding;
    const fillMissingCanvasWhite =
      Boolean(autoScaleLayoutFillMissingCanvasWhite) && Boolean(projectCanvasSize);

    return {
      paddingPercent,
      paddingXPercent: paddingX,
      paddingYPercent: paddingY,
      fillMissingCanvasWhite,
      ...(fillMissingCanvasWhite && projectCanvasSize
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
  }, [
    autoScaleLayoutFillMissingCanvasWhite,
    autoScaleLayoutPadding,
    autoScaleLayoutPaddingX,
    autoScaleLayoutPaddingY,
    autoScaleLayoutShadowPolicy,
    autoScaleLayoutSplitAxes,
    centerLayoutChromaThresholdValue,
    centerLayoutDetection,
    centerLayoutWhiteThresholdValue,
    projectCanvasSize,
  ]);

  const getNormalizedTargetCanvasSide = (value: number | null | undefined): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : null;

  const numericEquals = (left: number, right: number): boolean => Math.abs(left - right) < 0.01;

  const buildConfigMismatchMessage = (fields: string[]): string | null => {
    if (fields.length === 0) return null;
    return `Current controls differ from analysis plan: ${fields.join(', ')}.`;
  };

  const centerAnalysisConfigMismatchMessage = useMemo(() => {
    if (!analysisPlanAvailable || !analysisPlanMatchesWorkingSlot || analysisPlanIsStale)
      return null;
    const planLayout = toolbarContext.analysisPlanSnapshot?.layout;
    if (!planLayout) return null;

    const mismatches: string[] = [];
    if (Boolean(centerLayoutSplitAxes) !== Boolean(planLayout.splitAxes))
      mismatches.push('split axes');
    if (!numericEquals(centerLayoutPayload.paddingPercent, planLayout.paddingPercent))
      mismatches.push('padding');
    if (!numericEquals(centerLayoutPayload.paddingXPercent, planLayout.paddingXPercent))
      mismatches.push('padding X');
    if (!numericEquals(centerLayoutPayload.paddingYPercent, planLayout.paddingYPercent))
      mismatches.push('padding Y');
    if (centerLayoutPayload.fillMissingCanvasWhite !== Boolean(planLayout.fillMissingCanvasWhite)) {
      mismatches.push('fill missing canvas');
    }
    if (
      getNormalizedTargetCanvasSide(centerLayoutPayload.targetCanvasWidth) !==
      getNormalizedTargetCanvasSide(planLayout.targetCanvasWidth)
    ) {
      mismatches.push('target canvas width');
    }
    if (
      getNormalizedTargetCanvasSide(centerLayoutPayload.targetCanvasHeight) !==
      getNormalizedTargetCanvasSide(planLayout.targetCanvasHeight)
    ) {
      mismatches.push('target canvas height');
    }
    if (centerLayoutPayload.shadowPolicy !== planLayout.shadowPolicy)
      mismatches.push('shadow policy');
    if (centerLayoutPayload.detection !== planLayout.detection) mismatches.push('detection');
    if (centerLayoutPayload.whiteThreshold !== planLayout.whiteThreshold)
      mismatches.push('white threshold');
    if (centerLayoutPayload.chromaThreshold !== planLayout.chromaThreshold)
      mismatches.push('chroma threshold');

    return buildConfigMismatchMessage(mismatches);
  }, [
    analysisPlanAvailable,
    analysisPlanIsStale,
    analysisPlanMatchesWorkingSlot,
    centerLayoutPayload,
    centerLayoutSplitAxes,
    toolbarContext.analysisPlanSnapshot?.layout,
  ]);

  const autoScaleAnalysisConfigMismatchMessage = useMemo(() => {
    if (!analysisPlanAvailable || !analysisPlanMatchesWorkingSlot || analysisPlanIsStale)
      return null;
    const planLayout = toolbarContext.analysisPlanSnapshot?.layout;
    if (!planLayout) return null;

    const mismatches: string[] = [];
    if (Boolean(autoScaleLayoutSplitAxes) !== Boolean(planLayout.splitAxes))
      mismatches.push('split axes');
    if (!numericEquals(autoScaleLayoutPayload.paddingPercent, planLayout.paddingPercent))
      mismatches.push('padding');
    if (!numericEquals(autoScaleLayoutPayload.paddingXPercent, planLayout.paddingXPercent))
      mismatches.push('padding X');
    if (!numericEquals(autoScaleLayoutPayload.paddingYPercent, planLayout.paddingYPercent))
      mismatches.push('padding Y');
    if (
      autoScaleLayoutPayload.fillMissingCanvasWhite !== Boolean(planLayout.fillMissingCanvasWhite)
    ) {
      mismatches.push('fill missing canvas');
    }
    if (
      getNormalizedTargetCanvasSide(autoScaleLayoutPayload.targetCanvasWidth) !==
      getNormalizedTargetCanvasSide(planLayout.targetCanvasWidth)
    ) {
      mismatches.push('target canvas width');
    }
    if (
      getNormalizedTargetCanvasSide(autoScaleLayoutPayload.targetCanvasHeight) !==
      getNormalizedTargetCanvasSide(planLayout.targetCanvasHeight)
    ) {
      mismatches.push('target canvas height');
    }
    if (autoScaleLayoutPayload.shadowPolicy !== planLayout.shadowPolicy)
      mismatches.push('shadow policy');
    if (autoScaleLayoutPayload.detection !== planLayout.detection) mismatches.push('detection');
    if (autoScaleLayoutPayload.whiteThreshold !== planLayout.whiteThreshold)
      mismatches.push('white threshold');
    if (autoScaleLayoutPayload.chromaThreshold !== planLayout.chromaThreshold)
      mismatches.push('chroma threshold');

    return buildConfigMismatchMessage(mismatches);
  }, [
    analysisPlanAvailable,
    analysisPlanIsStale,
    analysisPlanMatchesWorkingSlot,
    autoScaleLayoutPayload,
    autoScaleLayoutSplitAxes,
    toolbarContext.analysisPlanSnapshot?.layout,
  ]);

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
    toolbarContext.setCenterLayoutPadding(normalizeAnalysisPercentString(layout.paddingPercent, 8));
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
    toolbarContext.setCenterLayoutDetection(layout.detection);
    toolbarContext.setCenterLayoutWhiteThreshold(
      String(Math.round(Number.isFinite(layout.whiteThreshold) ? layout.whiteThreshold : 16))
    );
    toolbarContext.setCenterLayoutChromaThreshold(
      String(Math.round(Number.isFinite(layout.chromaThreshold) ? layout.chromaThreshold : 10))
    );
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
    getPreviewCanvasViewportCrop: (): PreviewCanvasViewportCrop | null =>
      uiActions.getPreviewCanvasViewportCrop(),
    getPreviewCanvasImageFrame: (): PreviewCanvasImageFrameBinding | null =>
      uiActions.getPreviewCanvasImageFrame(),
    projectId,
    projectsQuery,
    slots,
    slotSelectionLocked,
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
    setMaskGenMode: (mode: 'ai-polygon' | 'ai-bbox' | 'threshold' | 'edges') =>
      setMaskGenMode(mode),
    handleAiMaskGeneration: async (
      mode: 'ai-polygon' | 'ai-bbox' | 'threshold' | 'edges'
    ): Promise<void> => {
      handleAiMaskGeneration(mode);
    },
    studioSettings,
    setStudioSettings,
    toast: (message: string, options?: ToastOptions) => {
      toast(message, options);
    },
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
    centerLayoutPayload,
    autoScaleLayoutPayload,
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
    analysisWorkingSourceMetadataMissing,
    analysisPlanIsStale,
    centerAnalysisConfigMismatchMessage,
    autoScaleAnalysisConfigMismatchMessage,
    centerLayoutPresetOptions,
    applyAnalysisLayoutToCenter,
    applyAnalysisLayoutToAutoScaler,
  };
}
