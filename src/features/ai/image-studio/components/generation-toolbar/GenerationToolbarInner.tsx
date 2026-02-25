/* eslint-disable */
// @ts-nocheck
'use client';

import React, { useCallback, useMemo } from 'react';
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
} from './GenerationToolbar.utils';
import {
  hasCanvasOverflowFromImageFrame,
} from './GenerationToolbarImageUtils';
import { createGenerationToolbarActionHandlers } from './generation-toolbar-action-handlers';
import { GenerationToolbarAutoScalerSection } from './GenerationToolbarAutoScalerSection';
import { GenerationToolbarCenterSection } from './GenerationToolbarCenterSection';
import { GenerationToolbarCropSection } from './GenerationToolbarCropSection';
import { GenerationToolbarDefaultsSection } from './GenerationToolbarDefaultsSection';
import { GenerationToolbarMaskSection } from './GenerationToolbarMaskSection';
import { GenerationToolbarUpscaleSection } from './GenerationToolbarUpscaleSection';
import {
  buildObjectLayoutPresetOptions,
  getObjectLayoutPresetValuesFromOption,
  saveObjectLayoutCustomPreset,
  deleteObjectLayoutCustomPreset,
  resolveObjectLayoutPresetOptionValue,
  resolveCustomPresetIdFromOptionValue,
  type ObjectLayoutPresetOptionValue,
} from '../../utils/object-layout-presets';
import { getImageStudioDocTooltip } from '../../utils/studio-docs';
import { normalizeImageStudioModelPresets } from '../../utils/studio-settings';
import { useGenerationToolbarState } from './GenerationToolbar.hooks';
import { useGenerationToolbarResolution } from './useGenerationToolbarResolution';
import { useGenerationToolbarActions } from './useGenerationToolbarActions';
import { useGenerationToolbarEffects } from './useGenerationToolbarEffects';
import { useGenerationToolbarCenter } from './useGenerationToolbarCenter';
import { useGenerationToolbarAutoScale } from './useGenerationToolbarAutoScale';
import { api } from '@/shared/lib/api-client';
import type { StudioSlotsResponse } from '@/shared/contracts/image-studio';

export function GenerationToolbarInner(): React.JSX.Element {
  const state = useGenerationToolbarState();
  const resolution = useGenerationToolbarResolution(state);
  const actions = useGenerationToolbarActions(state, resolution);

  const {
    maskPreviewEnabled,
    centerGuidesEnabled,
    setMaskPreviewEnabled,
    setCenterGuidesEnabled,
    projectId,
    workingSlot,
    setSelectedSlotId,
    setWorkingSlotId,
    maskGenLoading,
    maskGenMode,
    setMaskInvert,
    setMaskGenMode,
    handleAiMaskGeneration,
    studioSettings,
    setStudioSettings,
    toast,
    queryClient,
    upscaleMode,
    upscaleStrategy,
    cropMode,
    centerMode,
    autoScaleMode,
    centerLayoutPadding,
    centerLayoutPaddingX,
    centerLayoutPaddingY,
    centerLayoutSplitAxes,
    centerLayoutAdvancedEnabled, setCenterLayoutAdvancedEnabled,
    centerLayoutDetection, setCenterLayoutDetection,
    centerLayoutWhiteThreshold, setCenterLayoutWhiteThreshold,
    centerLayoutChromaThreshold, setCenterLayoutChromaThreshold,
    centerLayoutFillMissingCanvasWhite, setCenterLayoutFillMissingCanvasWhite,
    centerLayoutShadowPolicy, setCenterLayoutShadowPolicy,
    centerLayoutCustomPresets, setCenterLayoutCustomPresets,
    centerLayoutPresetDraftName, setCenterLayoutPresetDraftName,
    analysisPlanSnapshot,
    autoScaleLayoutPadding,
    autoScaleLayoutPaddingX,
    autoScaleLayoutPaddingY,
    autoScaleLayoutSplitAxes, setAutoScaleLayoutSplitAxes,
    autoScaleLayoutFillMissingCanvasWhite,
    autoScaleLayoutShadowPolicy,
    upscaleScale,
    upscaleTargetWidth,
    upscaleTargetHeight,
    upscaleSmoothingQuality,
    upscaleBusy,
    upscaleStatus,
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
    exportMaskCount,
    hasShapeCropBoundary,
    workingSlotImageSrc,
    clientProcessingImageSrc,
    workingSourceSignature,
    activeProjectId,
    projectCanvasSize,
    maskInvert,
  } = state;

  const {
    resolveWorkingSlotImageContentFrame,
    resolveWorkingSourceDimensions,
    resolveWorkingCropCanvasContext,
    resolveCropRect,
  } = resolution;

  const {
    handleCreateCropBox,
    attachMaskVariantsFromSelection,
    handleCancelUpscale,
    handleCancelCrop,
    handleCancelCenter,
    handleCancelAutoScale,
    handleSquareCrop: handleSquareCropBase,
    handlePreviewViewCrop: handlePreviewViewCropBase,
  } = actions;

  const cropDiagnosticsRef = state.cropDiagnosticsRef;

  const hasCanvasOverflowBoundary = hasCanvasOverflowFromImageFrame(
    resolveWorkingSlotImageContentFrame()
  );
  const hasCropBoundary = hasShapeCropBoundary || hasCanvasOverflowBoundary;
  const cropBoundaryStatusLabel = hasShapeCropBoundary
    ? 'Boundary ready'
    : hasCanvasOverflowBoundary
      ? 'Canvas overflow boundary ready'
      : 'Set a boundary or move image outside canvas';

  const resolveUpscaleSourceDimensions = useCallback(async (): Promise<{ width: number; height: number }> => {
    return resolveWorkingSourceDimensions();
  }, [resolveWorkingSourceDimensions]);

  const actionHandlers = useMemo(() => createGenerationToolbarActionHandlers({
    clientProcessingImageSrc,
    cropAbortControllerRef,
    cropMode,
    cropRequestInFlightRef,
    cropRequestTimeoutMs: CROP_REQUEST_TIMEOUT_MS,
    fetchProjectSlots: async (projectIdOverride?: string) => {
      const resolvedProjectId = projectIdOverride?.trim() ?? projectId?.trim() ?? '';
      if (!resolvedProjectId) return [];
      const response = await api.get<StudioSlotsResponse>(
        `/api/image-studio/projects/\${encodeURIComponent(resolvedProjectId)}/slots`
      );
      return Array.isArray(response.slots) ? response.slots : [];
    },
    getCropDiagnostics: (): any => cropDiagnosticsRef.current,
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
  }), [clientProcessingImageSrc, cropAbortControllerRef, cropMode, cropRequestInFlightRef, projectId, queryClient, resolveCropRect, resolveWorkingCropCanvasContext, resolveUpscaleSourceDimensions, setCropBusy, setCropStatus, setSelectedSlotId, setUpscaleBusy, setUpscaleStatus, setWorkingSlotId, toast, upscaleAbortControllerRef, upscaleMode, upscaleRequestInFlightRef, upscaleScale, upscaleSmoothingQuality, upscaleStrategy, upscaleTargetHeight, upscaleTargetWidth, workingSlot, workingSlotImageSrc, cropDiagnosticsRef, hasCropBoundary]);

  const { handleUpscale, handleCrop } = actionHandlers;

  const handleSquareCrop = useCallback(async (): Promise<void> => {
    await handleSquareCropBase(handleCrop);
  }, [handleSquareCropBase, handleCrop]);

  const handlePreviewViewCrop = useCallback(async (): Promise<void> => {
    await handlePreviewViewCropBase(handleCrop);
  }, [handlePreviewViewCropBase, handleCrop]);

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

  const { handleCenterObject } = useGenerationToolbarCenter({
    workingSlot,
    workingSlotImageSrc,
    centerMode,
    clientProcessingImageSrc,
    centerRequestInFlightRef,
    setCenterBusy,
    setCenterStatus,
    centerLayoutPayload,
    centerAbortControllerRef,
    projectId,
    queryClient,
    setSelectedSlotId,
    setWorkingSlotId,
    toast,
    centerIsObjectLayoutMode,
  });

  const { handleAutoScale } = useGenerationToolbarAutoScale({
    workingSlot,
    workingSlotImageSrc,
    autoScaleMode,
    clientProcessingImageSrc,
    autoScaleRequestInFlightRef,
    setAutoScaleBusy,
    setAutoScaleStatus,
    autoScaleLayoutPayload,
    autoScaleAbortControllerRef,
    projectId,
    queryClient,
    setSelectedSlotId,
    setWorkingSlotId,
    toast,
  });

  useGenerationToolbarEffects(state, { handleCenterObject, handleAutoScale });

  const maskGenerationBusy = maskGenLoading;
  const maskGenerationLabel = maskGenerationBusy
    ? 'Generating Mask...'
    : 'Generate Mask';
  const upscaleBusyLabel = useMemo(() => {
    if (!upscaleBusy) return 'Upscale';
    switch (upscaleStatus) {
      case 'resolving': return 'Upscale: Resolving';
      case 'preparing': return 'Upscale: Preparing';
      case 'uploading': return 'Upscale: Uploading';
      case 'processing': return 'Upscale: Processing';
      case 'persisting': return 'Upscale: Persisting';
      default: return 'Upscale';
    }
  }, [upscaleBusy, upscaleStatus]);
  const cropBusyLabel = useMemo(() => {
    if (!cropBusy) return 'Crop';
    switch (cropStatus) {
      case 'resolving': return 'Crop: Resolving';
      case 'preparing': return 'Crop: Preparing';
      case 'uploading': return 'Crop: Uploading';
      case 'processing': return 'Crop: Processing';
      case 'persisting': return 'Crop: Persisting';
      default: return 'Crop';
    }
  }, [cropBusy, cropStatus]);
  const centerBusyLabel = useMemo(() => {
    if (!centerBusy) return centerIsObjectLayoutMode ? 'Object Layouting' : 'Center Object';
    switch (centerStatus) {
      case 'resolving': return centerIsObjectLayoutMode ? 'Layout: Resolving' : 'Center: Resolving';
      case 'preparing': return centerIsObjectLayoutMode ? 'Layout: Preparing' : 'Center: Preparing';
      case 'uploading': return centerIsObjectLayoutMode ? 'Layout: Uploading' : 'Center: Uploading';
      case 'processing': return centerIsObjectLayoutMode ? 'Layout: Processing' : 'Center: Processing';
      case 'persisting': return centerIsObjectLayoutMode ? 'Layout: Persisting' : 'Center: Persisting';
      default: return centerIsObjectLayoutMode ? 'Object Layouting' : 'Center Object';
    }
  }, [centerBusy, centerIsObjectLayoutMode, centerStatus]);
  const autoScaleBusyLabel = useMemo(() => {
    if (!autoScaleBusy) return 'Auto Scale';
    switch (autoScaleStatus) {
      case 'resolving': return 'Auto Scale: Resolving';
      case 'preparing': return 'Auto Scale: Preparing';
      case 'uploading': return 'Auto Scale: Uploading';
      case 'processing': return 'Auto Scale: Processing';
      case 'persisting': return 'Auto Scale: Persisting';
      default: return 'Auto Scale';
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
            toast(`Saved preset "\${saved.savedPreset.name}".`, { variant: 'success' });
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
              ? `Deleted preset "\${deletedName}".`
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
          setCenterLayoutSplitAxes(!centerLayoutSplitAxes);
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
          setAutoScaleLayoutSplitAxes(!autoScaleLayoutSplitAxes);
        }}
      />
    </div>
  );
}
