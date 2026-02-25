'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import { api } from '@/shared/lib/api-client';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';
import { type StudioSlotsResponse, type ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import { useGenerationToolbarState } from './GenerationToolbar.hooks';
import {
  CROP_REQUEST_TIMEOUT_MS,
  UPSCALE_MAX_OUTPUT_SIDE,
  UPSCALE_REQUEST_TIMEOUT_MS,
  normalizeCenterPaddingPercent,
  normalizeCenterThreshold,
  CENTER_LAYOUT_MIN_WHITE_THRESHOLD,
  CENTER_LAYOUT_MAX_WHITE_THRESHOLD,
  CENTER_LAYOUT_DEFAULT_WHITE_THRESHOLD,
  CENTER_LAYOUT_MIN_CHROMA_THRESHOLD,
  CENTER_LAYOUT_MAX_CHROMA_THRESHOLD,
  CENTER_LAYOUT_DEFAULT_CHROMA_THRESHOLD,
  formatLayoutPercent,
  shouldFallbackToServerAutoScaler,
  describeSchemaValidationIssue,
} from './GenerationToolbar.utils';
import {
  polygonsFromShapes,
  renderMaskDataUrlFromPolygons,
  loadImageElement,
  mapImageCropRectToCanvasRect,
  resolveCropRectFromShapesWithDiagnostics,
  resolveCanvasOverflowCropRect,
  buildCenterRequestId,
  buildAutoScalerRequestId,
  layoutCanvasImageObject,
  centerCanvasImageObject,
  dataUrlToUploadBlob,
  withCenterRetry,
  withAutoScalerRetry,
  isClientCenterCrossOriginError,
  isClientAutoScalerCrossOriginError,
  isCenterAbortError,
  isAutoScalerAbortError,
  autoScaleCanvasImageObject,
} from './GenerationToolbarImageUtils';
import {
  imageStudioCenterRequestSchema,
  imageStudioCenterResponseSchema,
} from '../../contracts/center';
import {
  imageStudioAutoScalerRequestSchema,
  imageStudioAutoScalerResponseSchema,
} from '../../contracts/autoscaler';
import { createGenerationToolbarActionHandlers } from './generation-toolbar-action-handlers';
import { GenerationToolbarAutoScalerSection } from './GenerationToolbarAutoScalerSection';
import { GenerationToolbarCenterSection } from './GenerationToolbarCenterSection';
import { GenerationToolbarCropSection } from './GenerationToolbarCropSection';
import { GenerationToolbarDefaultsSection } from './GenerationToolbarDefaultsSection';
import { GenerationToolbarMaskSection } from './GenerationToolbarMaskSection';
import { GenerationToolbarUpscaleSection } from './GenerationToolbarUpscaleSection';
import { studioKeys } from '../../hooks/useImageStudioQueries';
import {
  IMAGE_STUDIO_ANALYSIS_PLAN_CHANGED_EVENT,
  loadImageStudioAnalysisPlanSnapshot,
  loadImageStudioAnalysisApplyIntent,
  clearImageStudioAnalysisApplyIntent,
  type ImageStudioAnalysisSharedLayout,
} from '../../utils/analysis-bridge';
import {
  buildObjectLayoutPresetOptions,
  getObjectLayoutPresetValuesFromOption,
  IMAGE_STUDIO_OBJECT_LAYOUT_PRESETS_CHANGED_EVENT,
  loadObjectLayoutCustomPresets,
  loadObjectLayoutAdvancedDefaults,
  resolveObjectLayoutPresetOptionValue,
  resolveCustomPresetIdFromOptionValue,
  saveObjectLayoutCustomPreset,
  saveObjectLayoutAdvancedDefaults,
  deleteObjectLayoutCustomPreset,
  type ObjectLayoutPresetOptionValue,
} from '../../utils/object-layout-presets';
import { getImageStudioDocTooltip } from '../../utils/studio-docs';
import { normalizeImageStudioModelPresets } from '../../utils/studio-settings';
import { type CenterMode, type AutoScalerMode } from './GenerationToolbarContext';
import { type ImageStudioCenterResponse } from '../../contracts/center';
import { type ImageStudioAutoScalerResponse } from '../../contracts/autoscaler';
import { type CropRect, type CropRectResolutionDiagnostics, type ImageContentFrame, type CropCanvasContext } from './GenerationToolbarImageUtils';

type CenterActionResponse = ImageStudioCenterResponse;
type AutoScaleActionResponse = ImageStudioAutoScalerResponse;

export function GenerationToolbarInner(): React.JSX.Element {
  const state = useGenerationToolbarState();
  const {
    maskPreviewEnabled,
    centerGuidesEnabled,
    setMaskPreviewEnabled,
    setCenterGuidesEnabled,
    setCanvasSelectionEnabled,
    getPreviewCanvasViewportCrop,
    getPreviewCanvasImageFrame,
    projectId,
    workingSlot,
    setSelectedSlotId,
    setWorkingSlotId,
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
    maskAttachMode,
    upscaleMode, setUpscaleMode,
    upscaleStrategy, setUpscaleStrategy,
    cropMode, setCropMode,
    centerMode, setCenterMode,
    autoScaleMode, setAutoScaleMode,
    centerLayoutPadding, setCenterLayoutPadding,
    centerLayoutPaddingX, setCenterLayoutPaddingX,
    centerLayoutPaddingY, setCenterLayoutPaddingY,
    centerLayoutSplitAxes, setCenterLayoutSplitAxes,
    centerLayoutAdvancedEnabled, setCenterLayoutAdvancedEnabled,
    centerLayoutDetection, setCenterLayoutDetection,
    centerLayoutWhiteThreshold, setCenterLayoutWhiteThreshold,
    centerLayoutChromaThreshold, setCenterLayoutChromaThreshold,
    centerLayoutFillMissingCanvasWhite, setCenterLayoutFillMissingCanvasWhite,
    centerLayoutShadowPolicy, setCenterLayoutShadowPolicy,
    centerLayoutCustomPresets, setCenterLayoutCustomPresets,
    centerLayoutPresetDraftName, setCenterLayoutPresetDraftName,
    analysisPlanSnapshot, setAnalysisPlanSnapshot,
    queuedAnalysisRunTarget, setQueuedAnalysisRunTarget,
    autoScaleLayoutPadding, setAutoScaleLayoutPadding,
    autoScaleLayoutPaddingX, setAutoScaleLayoutPaddingX,
    autoScaleLayoutPaddingY, setAutoScaleLayoutPaddingY,
    autoScaleLayoutSplitAxes, setAutoScaleLayoutSplitAxes,
    autoScaleLayoutFillMissingCanvasWhite, setAutoScaleLayoutFillMissingCanvasWhite,
    autoScaleLayoutShadowPolicy, setAutoScaleLayoutShadowPolicy,
    upscaleScale, setUpscaleScale,
    upscaleTargetWidth, setUpscaleTargetWidth,
    upscaleTargetHeight, setUpscaleTargetHeight,
    upscaleSmoothingQuality, setUpscaleSmoothingQuality,
    upscaleBusy, setUpscaleBusy,
    upscaleStatus, setUpscaleStatus,
    cropBusy, setCropBusy,
    cropStatus, setCropStatus,
    centerBusy, setCenterBusy,
    centerStatus, setCenterStatus,
    autoScaleBusy, setAutoScaleBusy,
    autoScaleStatus, setAutoScaleStatus,
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
  } = state;

  const cropDiagnosticsRef = state.cropDiagnosticsRef || { current: null };

  const resolveWorkingSlotImageContentFrame = useCallback((): ImageContentFrame | null => {
    const normalizedWorkingSlotId = workingSlot?.id?.trim() ?? '';
    if (!normalizedWorkingSlotId) return null;
    const frameBinding = getPreviewCanvasImageFrame();
    if (!frameBinding) return null;
    if (frameBinding.slotId !== normalizedWorkingSlotId) return null;
    return frameBinding.frame as ImageContentFrame;
  }, [getPreviewCanvasImageFrame, workingSlot?.id]);

  const hasCanvasOverflowBoundary = hasCanvasOverflowFromImageFrame(
    resolveWorkingSlotImageContentFrame()
  );
  const hasCropBoundary = hasShapeCropBoundary || hasCanvasOverflowBoundary;
  const cropBoundaryStatusLabel = hasShapeCropBoundary
    ? 'Boundary ready'
    : hasCanvasOverflowBoundary
      ? 'Canvas overflow boundary ready'
      : 'Set a boundary or move image outside canvas';

  const resolveWorkingSourceDimensions = useCallback(async (): Promise<{ width: number; height: number }> => {
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
  }, [clientProcessingImageSrc, workingSlot?.imageFile?.height, workingSlot?.imageFile?.width, workingSlotImageSrc]);

  const resolveWorkingCropCanvasContext = useCallback(async (): Promise<CropCanvasContext | null> => {
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
  }, [projectCanvasSize?.height, projectCanvasSize?.width, resolveWorkingSlotImageContentFrame, resolveWorkingSourceDimensions]);

  const resolveCropRect = useCallback(async (): Promise<{
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
      imageFrame: imageContentFrame,
    });
    if (overflowCropRect) {
      return {
        cropRect: overflowCropRect,
        diagnostics: resolved.diagnostics,
      };
    }

    throw new Error('Set a valid crop boundary or move image outside canvas first.');
  }, [activeMaskId, exportMaskShapes, projectCanvasSize?.height, projectCanvasSize?.width, resolveWorkingSlotImageContentFrame, resolveWorkingSourceDimensions]);

  const resolveCenteredSquareCropRect = useCallback(async (): Promise<CropRect> => {
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
  }, [resolveWorkingSourceDimensions]);

  const handleCreateCropBox = useCallback((): void => {
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
  }, [setActiveMaskId, setCanvasSelectionEnabled, setMaskShapes, setTool, toast]);

  const fetchProjectSlots = useCallback(async (projectIdOverride?: string): Promise<ImageStudioSlotRecord[]> => {
    const resolvedProjectId = projectIdOverride?.trim() ?? projectId?.trim() ?? '';
    if (!resolvedProjectId) return [];
    const response = await api.get<StudioSlotsResponse>(
      `/api/image-studio/projects/${encodeURIComponent(resolvedProjectId)}/slots`
    );
    return Array.isArray(response.slots) ? response.slots : [];
  }, [projectId]);

  const attachMaskVariantsFromSelection = useCallback(async (): Promise<void> => {
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
        imageFrame: resolveWorkingSlotImageContentFrame(),
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
  }, [exportMaskShapes, maskAttachMode, projectId, queryClient, resolveWorkingSlotImageContentFrame, toast, workingSlot?.id, workingSlot?.imageFile?.height, workingSlot?.imageFile?.width, workingSlotImageSrc]);

  const resolveUpscaleSourceDimensions = useCallback(async (): Promise<{ width: number; height: number }> => {
    return resolveWorkingSourceDimensions();
  }, [resolveWorkingSourceDimensions]);

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

  const handleCancelUpscale = useCallback((): void => {
    const controller = upscaleAbortControllerRef.current;
    if (!controller) return;
    controller.abort();
  }, [upscaleAbortControllerRef]);

  const handleCancelCrop = useCallback((): void => {
    const controller = cropAbortControllerRef.current;
    if (!controller) return;
    controller.abort();
  }, [cropAbortControllerRef]);

  const handleSquareCrop = useCallback(async (): Promise<void> => {
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
  }, [handleCrop, resolveCenteredSquareCropRect, toast, workingSlot?.id, workingSlotImageSrc]);

  const handlePreviewViewCrop = useCallback(async (): Promise<void> => {
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
  }, [getPreviewCanvasViewportCrop, handleCrop, resolveWorkingCropCanvasContext, resolveWorkingSourceDimensions, toast, workingSlot?.id, workingSlotImageSrc]);

  const centerIsObjectLayoutMode =
    centerMode === 'client_alpha_bbox' || centerMode === 'server_alpha_bbox'
      ? false
      : centerMode === 'client_object_layout_v1' || centerMode === 'server_object_layout_v1';

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
  }, [selectedCenterCustomPreset?.id, selectedCenterCustomPreset?.name, setCenterLayoutPresetDraftName, selectedCenterCustomPresetIdRef]);

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
    skipCenterAdvancedDefaultsSaveRef,
  ]);

  const centerLayoutResolvedFillMissingCanvasWhite = centerLayoutFillMissingCanvasWhite && Boolean(projectCanvasSize);
  const centerLayoutPayload = useMemo(() => centerIsObjectLayoutMode
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
    : undefined, [centerIsObjectLayoutMode, centerLayoutChromaThresholdValue, centerLayoutDetection, centerLayoutPaddingPercent, centerLayoutPaddingXPercent, centerLayoutPaddingYPercent, centerLayoutResolvedFillMissingCanvasWhite, centerLayoutShadowPolicy, centerLayoutSplitAxes, centerLayoutWhiteThresholdValue, projectCanvasSize]);

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
  const autoScaleLayoutPayload = useMemo(() => ({
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
  }), [autoScaleLayoutPaddingPercent, autoScaleLayoutPaddingXPercent, autoScaleLayoutPaddingYPercent, autoScaleLayoutResolvedFillMissingCanvasWhite, autoScaleLayoutShadowPolicy, autoScaleLayoutSplitAxes, centerLayoutChromaThresholdValue, centerLayoutDetection, centerLayoutWhiteThresholdValue, projectCanvasSize]);

  const handleCenterObject = useCallback(async (): Promise<void> => {
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
    const buildValidatedCenterRequestPayload = (mode: CenterMode): {
      mode: CenterMode;
      requestId: string;
      layout?: Record<string, unknown>;
    } => {
      const validation = imageStudioCenterRequestSchema.safeParse({
        mode,
        requestId: centerRequestId,
        ...(centerLayoutPayload ? { layout: centerLayoutPayload } : {}),
      });
      if (!validation.success) {
        throw new Error(
          `Center request payload is invalid (${describeSchemaValidationIssue(validation.error.issues)}).`
        );
      }
      return validation.data as {
        mode: CenterMode;
        requestId: string;
        layout?: Record<string, unknown>;
      };
    };
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
          const centerRequestPayload = buildValidatedCenterRequestPayload(centerMode);
          response = await withCenterRetry(
            () => {
              const formData = new FormData();
              formData.append('mode', centerRequestPayload.mode);
              formData.append('requestId', centerRequestPayload.requestId);
              if (centerRequestPayload.layout) {
                formData.append(
                  'center',
                  JSON.stringify({
                    layout: centerRequestPayload.layout,
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
                    timeout: state.CENTER_REQUEST_TIMEOUT_MS || 60000,
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
          const fallbackRequestPayload = buildValidatedCenterRequestPayload(fallbackMode);
          response = await withCenterRetry(
            () =>
              api
                .post<unknown>(
                  `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/center`,
                  fallbackRequestPayload,
                  {
                    signal: abortController.signal,
                    timeout: state.CENTER_REQUEST_TIMEOUT_MS || 60000,
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
        const centerRequestPayload = buildValidatedCenterRequestPayload(centerMode);
        response = await withCenterRetry(
          () =>
            api
              .post<unknown>(
                `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/center`,
                centerRequestPayload,
                {
                  signal: abortController.signal,
                  timeout: state.CENTER_REQUEST_TIMEOUT_MS || 60000,
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
  }, [centerLayoutPayload, centerMode, clientProcessingImageSrc, fetchProjectSlots, projectId, queryClient, centerIsObjectLayoutMode, setCenterBusy, setCenterStatus, setSelectedSlotId, setWorkingSlotId, state.CENTER_REQUEST_TIMEOUT_MS, toast, workingSlot?.id, workingSlotImageSrc, centerAbortControllerRef, centerRequestInFlightRef]);

  const handleCancelCenter = useCallback((): void => {
    const controller = centerAbortControllerRef.current;
    if (!controller) return;
    controller.abort();
  }, [centerAbortControllerRef]);

  const handleAutoScale = useCallback(async (): Promise<void> => {
    if (!workingSlot?.id) {
      toast('No active source slot selected.', { variant: 'info' });
      return;
    }
    if (!workingSlotImageSrc) {
      toast('Select a slot image before auto scaling.', { variant: 'info' });
      return;
    }
    const requestedMode = autoScaleMode;
    const isClientAutoMode = requestedMode === 'client_auto_scaler_v1';
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
    const buildValidatedAutoScaleRequestPayload = (mode: AutoScalerMode): {
      mode: AutoScalerMode;
      requestId: string;
      layout?: Record<string, unknown>;
    } => {
      const validation = imageStudioAutoScalerRequestSchema.safeParse({
        mode,
        requestId: autoScaleRequestId,
        layout: autoScaleLayoutPayload,
      });
      if (!validation.success) {
        throw new Error(
          `Auto scaler request payload is invalid (${describeSchemaValidationIssue(validation.error.issues)}).`
        );
      }
      return validation.data as {
        mode: AutoScalerMode;
        requestId: string;
        layout?: Record<string, unknown>;
      };
    };
    const abortController = new AbortController();
    autoScaleAbortControllerRef.current = abortController;
    try {
      let response: AutoScaleActionResponse;
      let resolvedMode: AutoScalerMode = requestedMode;
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
          const autoScaleRequestPayload = buildValidatedAutoScaleRequestPayload(requestedMode);
          response = await withAutoScalerRetry(
            () => {
              const formData = new FormData();
              formData.append('mode', autoScaleRequestPayload.mode);
              formData.append('requestId', autoScaleRequestPayload.requestId);
              if (autoScaleRequestPayload.layout) {
                formData.append('layout', JSON.stringify(autoScaleRequestPayload.layout));
              }
              formData.append('image', uploadBlob, `autoscale-client-${Date.now()}.png`);
              return api
                .post<unknown>(
                  `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/autoscale`,
                  formData,
                  {
                    signal: abortController.signal,
                    timeout: state.AUTOSCALER_REQUEST_TIMEOUT_MS || 60000,
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
          const fallbackDueToCrossOrigin = isClientAutoScalerCrossOriginError(error);
          const fallbackDueToInvalidPayload = shouldFallbackToServerAutoScaler(error);
          if (!fallbackDueToCrossOrigin && !fallbackDueToInvalidPayload) {
            throw error;
          }
          setAutoScaleStatus('processing');
          const fallbackMode: AutoScalerMode = 'server_auto_scaler_v1';
          const fallbackRequestPayload = buildValidatedAutoScaleRequestPayload(fallbackMode);
          response = await withAutoScalerRetry(
            () =>
              api
                .post<unknown>(
                  `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/autoscale`,
                  fallbackRequestPayload,
                  {
                    signal: abortController.signal,
                    timeout: state.AUTOSCALER_REQUEST_TIMEOUT_MS || 60000,
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
            fallbackDueToCrossOrigin
              ? 'Client auto scaler was blocked by cross-origin restrictions; used server auto scaler instead.'
              : 'Client auto scaler payload was rejected; used server auto scaler instead.',
            { variant: 'info' }
          );
        }
      } else {
        setAutoScaleStatus('processing');
        const autoScaleRequestPayload = buildValidatedAutoScaleRequestPayload(requestedMode);
        response = await withAutoScalerRetry(
          () =>
            api
              .post<unknown>(
                `/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/autoscale`,
                autoScaleRequestPayload,
                {
                  signal: abortController.signal,
                  timeout: state.AUTOSCALER_REQUEST_TIMEOUT_MS || 60000,
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
  }, [autoScaleLayoutPayload, autoScaleMode, clientProcessingImageSrc, fetchProjectSlots, projectId, queryClient, setAutoScaleBusy, setAutoScaleStatus, setSelectedSlotId, setWorkingSlotId, state.AUTOSCALER_REQUEST_TIMEOUT_MS, toast, workingSlot?.id, workingSlotImageSrc, autoScaleAbortControllerRef, autoScaleRequestInFlightRef]);

  const handleCancelAutoScale = useCallback((): void => {
    const controller = autoScaleAbortControllerRef.current;
    if (!controller) return;
    controller.abort();
  }, [autoScaleAbortControllerRef]);

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
    setQueuedAnalysisRunTarget,
    autoScaleRequestInFlightRef,
    centerRequestInFlightRef,
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
  const analysisSummaryData = state.analysisSummaryData;
  const analysisPlanIsStale = state.analysisPlanIsStale;
  const analysisPlanMatchesWorkingSlot = state.analysisPlanMatchesWorkingSlot;
  const centerAnalysisConfigMismatchMessage = state.centerAnalysisConfigMismatchMessage;
  const autoScaleAnalysisConfigMismatchMessage = state.autoScaleAnalysisConfigMismatchMessage;

  const handleApplyAnalysisPlanToCenter = useCallback((): void => {
    if (!analysisPlanSnapshot) {
      toast('No analysis plan is available yet. Run analysis first.', { variant: 'info' });
      return;
    }
    const normalizedWorkingSlotId = workingSlot?.id?.trim() ?? '';
    const analysisPlanSlotId = analysisPlanSnapshot?.slotId?.trim() ?? '';
    if (!normalizedWorkingSlotId || analysisPlanSlotId !== normalizedWorkingSlotId) {
      toast('Latest analysis plan belongs to a different slot. Select that slot first.', { variant: 'info' });
      return;
    }
    const analysisPlanSourceSignature = analysisPlanSnapshot?.sourceSignature?.trim() ?? '';
    if (!analysisPlanSourceSignature) {
      toast('Analysis plan is missing source metadata. Rerun analysis first.', { variant: 'info' });
      return;
    }
    if (!workingSourceSignature || analysisPlanSourceSignature !== workingSourceSignature) {
      toast('Latest analysis plan is stale for the current slot image. Rerun analysis first.', { variant: 'info' });
      return;
    }
    state.applyAnalysisLayoutToCenter(analysisPlanSnapshot.layout, 'manual');
  }, [analysisPlanSnapshot, state, toast, workingSlot?.id, workingSourceSignature]);

  const handleApplyAnalysisPlanToAutoScaler = useCallback((): void => {
    if (!analysisPlanSnapshot) {
      toast('No analysis plan is available yet. Run analysis first.', { variant: 'info' });
      return;
    }
    const normalizedWorkingSlotId = workingSlot?.id?.trim() ?? '';
    const analysisPlanSlotId = analysisPlanSnapshot?.slotId?.trim() ?? '';
    if (!normalizedWorkingSlotId || analysisPlanSlotId !== normalizedWorkingSlotId) {
      toast('Latest analysis plan belongs to a different slot. Select that slot first.', { variant: 'info' });
      return;
    }
    const analysisPlanSourceSignature = analysisPlanSnapshot?.sourceSignature?.trim() ?? '';
    if (!analysisPlanSourceSignature) {
      toast('Analysis plan is missing source metadata. Rerun analysis first.', { variant: 'info' });
      return;
    }
    if (!workingSourceSignature || analysisPlanSourceSignature !== workingSourceSignature) {
      toast('Latest analysis plan is stale for the current slot image. Rerun analysis first.', { variant: 'info' });
      return;
    }
    state.applyAnalysisLayoutToAutoScaler(analysisPlanSnapshot.layout, 'manual');
  }, [analysisPlanSnapshot, state, toast, workingSlot?.id, workingSourceSignature]);

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
          void handleAiMaskGeneration(maskGenMode);
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
        cropBusyLabel={cropBusyLabel}
        boundaryStatusLabel={cropBoundaryStatusLabel}
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
        upscaleBusyLabel={upscaleBusyLabel}
        upscaleMaxOutputSide={UPSCALE_MAX_OUTPUT_SIDE}
        upscaleModeOptions={upscaleModeOptions}
        upscaleScaleOptions={upscaleScaleOptions}
        upscaleSmoothingOptions={upscaleSmoothingOptions}
        upscaleStrategyOptions={upscaleStrategyOptions}
      />

      <GenerationToolbarCenterSection
        analysisPlanAvailable={state.analysisPlanAvailable}
        analysisPlanMatchesWorkingSlot={analysisPlanMatchesWorkingSlot}
        analysisSummaryData={analysisSummaryData}
        analysisSummaryIsStale={analysisPlanIsStale}
        analysisConfigMismatchMessage={centerAnalysisConfigMismatchMessage}
        centerBusyLabel={centerBusyLabel}
        centerGuidesEnabled={centerGuidesEnabled}
        centerLayoutEnabled={centerIsObjectLayoutMode}
        centerLayoutPreset={centerLayoutPresetOptionValue}
        centerLayoutPresetOptions={centerLayoutPresetOptions}
        centerLayoutCanDeletePreset={centerLayoutCanDeletePreset}
        centerLayoutCanSavePreset={centerLayoutCanSavePreset}
        centerLayoutSavePresetLabel={centerLayoutSavePresetLabel}
        centerLayoutDetectionOptions={detectionModeOptions}
        centerLayoutProjectCanvasSize={projectCanvasSize}
        centerLayoutShadowPolicyOptions={shadowPolicyOptions}
        centerTooltipContent={centerTooltipContent}
        centerTooltipsEnabled={cropTooltipsEnabled}
        centerModeOptions={centerModeOptions}
        hasSourceImage={hasSourceImage}
        onCancelCenter={handleCancelCenter}
        onCenterLayoutPresetChange={(value: string) => {
          const values = getObjectLayoutPresetValuesFromOption(value as ObjectLayoutPresetOptionValue, centerLayoutCustomPresets);
          if (!values) return;
          setCenterLayoutDetection(values.detection);
          setCenterLayoutShadowPolicy(values.shadowPolicy);
          setCenterLayoutWhiteThreshold(String(values.whiteThreshold));
          setCenterLayoutChromaThreshold(String(values.chromaThreshold));
        }}
        onCenterLayoutSavePreset={async () => {
          if (!centerLayoutCanSavePreset) return;
          try {
            const saved = saveObjectLayoutCustomPreset(activeProjectId, {
              presetId: selectedCenterCustomPresetId ?? undefined,
              name: centerLayoutPresetDraftName.trim(),
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
        onApplyAnalysisPlan={handleApplyAnalysisPlanToCenter}
        onCenterObject={() => {
          void handleCenterObject();
        }}
        onToggleCenterLayoutAdvanced={() => {
          setCenterLayoutAdvancedEnabled(!centerLayoutAdvancedEnabled);
        }}
        onToggleCenterLayoutSplitAxes={() => {
          setCenterLayoutSplitAxes((previous) => {
            const next = !previous;
            if (next) {
              setCenterLayoutPaddingX(centerLayoutPadding);
              setCenterLayoutPaddingY(centerLayoutPadding);
            }
            return next;
          });
        }}
        onToggleCenterGuides={() => {
          setCenterGuidesEnabled(!centerGuidesEnabled);
        }}
      />

      <GenerationToolbarAutoScalerSection
        analysisPlanAvailable={state.analysisPlanAvailable}
        analysisPlanMatchesWorkingSlot={analysisPlanMatchesWorkingSlot}
        analysisSummaryData={analysisSummaryData}
        analysisSummaryIsStale={analysisPlanIsStale}
        analysisConfigMismatchMessage={autoScaleAnalysisConfigMismatchMessage}
        autoScaleBusyLabel={autoScaleBusyLabel}
        autoScaleLayoutProjectCanvasSize={projectCanvasSize}
        autoScaleShadowPolicyOptions={shadowPolicyOptions}
        autoScaleTooltipContent={autoScaleTooltipContent}
        autoScaleTooltipsEnabled={cropTooltipsEnabled}
        autoScaleModeOptions={autoScaleModeOptions}
        hasSourceImage={hasSourceImage}
        onAutoScale={() => {
          void handleAutoScale();
        }}
        onApplyAnalysisPlan={handleApplyAnalysisPlanToAutoScaler}
        onCancelAutoScale={handleCancelAutoScale}
        onToggleAutoScaleLayoutSplitAxes={() => {
          setAutoScaleLayoutSplitAxes((previous) => {
            const next = !previous;
            if (next) {
              setAutoScaleLayoutPaddingX(autoScaleLayoutPadding);
              setAutoScaleLayoutPaddingY(autoScaleLayoutPadding);
            }
            return next;
          });
        }}
      />
    </div>
  );
}
