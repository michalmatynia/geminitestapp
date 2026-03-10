'use client';

import React, { useCallback, useMemo } from 'react';

import {
  getObjectLayoutPresetValuesFromOption,
  saveObjectLayoutCustomPreset,
  deleteObjectLayoutCustomPreset,
  type ObjectLayoutPresetOptionValue,
} from '@/features/ai/image-studio/utils/object-layout-presets';
import { getImageStudioDocTooltip } from '@/features/ai/image-studio/utils/studio-docs';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';

import { useGenerationToolbarHandlers } from './GenerationToolbar.handlers';
import { useGenerationToolbarState } from './GenerationToolbar.hooks';
import { type GenerationToolbarHandlers } from './GenerationToolbar.types';
import { UPSCALE_MAX_OUTPUT_SIDE } from './GenerationToolbar.utils';
import { GenerationToolbarAutoScalerSection } from './GenerationToolbarAutoScalerSection';
import { GenerationToolbarCenterSection } from './GenerationToolbarCenterSection';
import { GenerationToolbarCropSection } from './GenerationToolbarCropSection';
import { GenerationToolbarDefaultsSection } from './GenerationToolbarDefaultsSection';
import { GenerationToolbarMaskSection } from './GenerationToolbarMaskSection';
import {
  GenerationToolbarAutoScalerSectionRuntimeProvider,
  GenerationToolbarCenterSectionRuntimeProvider,
  GenerationToolbarCropSectionRuntimeProvider,
  GenerationToolbarDefaultsSectionRuntimeProvider,
  GenerationToolbarMaskSectionRuntimeProvider,
  GenerationToolbarUpscaleSectionRuntimeProvider,
} from './GenerationToolbarSectionContexts';
import { GenerationToolbarUpscaleSection } from './GenerationToolbarUpscaleSection';
import { useGenerationToolbarEffects } from './useGenerationToolbarEffects';

export function GenerationToolbarInner(): React.JSX.Element {
  const brainGenerationModel = useBrainAssignment({
    capability: 'image_studio.general',
  });
  const state = useGenerationToolbarState();
  const {
    maskPreviewEnabled,
    centerGuidesEnabled,
    setMaskPreviewEnabled,
    setCenterGuidesEnabled,
    workingSlot,
    maskInvert,
    setMaskInvert,
    maskGenLoading,
    maskGenMode,
    setMaskGenMode,
    studioSettings,
    setStudioSettings,
    toast,
    centerLayoutCustomPresets,
    centerLayoutPresetDraftName,
    setCenterLayoutPresetDraftName,
    setCenterLayoutCustomPresets,
    upscaleBusy,
    upscaleStatus,
    centerBusy,
    centerStatus,
    autoScaleBusy,
    autoScaleStatus,
    analysisBusy,
    analysisStatus,
    cropBusy,
    cropStatus,
    exportMaskCount,
    activeProjectId,
    projectCanvasSize,
    centerIsObjectLayoutMode,
  } = state;

  const handlers: GenerationToolbarHandlers = useGenerationToolbarHandlers(state);
  const {
    handleUpscale,
    handleCrop,
    handleCancelUpscale,
    handleCancelCrop,
    handleSquareCrop,
    handlePreviewViewCrop,
    handleCreateCropBox,
    attachMaskVariantsFromSelection,
    handleCenterObject,
    handleCancelCenter,
    handleAutoScale,
    handleCancelAutoScale,
    handleAiMaskGeneration,
    handleRunAnalysisFromCenter,
    handleRunAnalysisFromAutoScaler,
  } = handlers;

  useGenerationToolbarEffects(state, {
    handleCenterObject,
    handleAutoScale,
  });

  const maskGenerationBusy = maskGenLoading;
  const maskGenerationLabel = maskGenerationBusy ? 'Generating Mask...' : 'Generate Mask';
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
  const analysisBusyLabel = useMemo(() => {
    if (!analysisBusy) return 'Run Analysis';
    switch (analysisStatus) {
      case 'resolving':
        return 'Analyze: Resolving';
      case 'processing':
        return 'Analyze: Processing';
      default:
        return 'Run Analysis';
    }
  }, [analysisBusy, analysisStatus]);

  const imageCountOptions = useMemo(
    () => ['1', '2', '4'].map((value: string) => ({ value, label: value })),
    []
  );
  const maskModeOptions = useMemo(
    () => [
      { value: 'ai-polygon', label: 'AI Polygon' },
      { value: 'ai-bbox', label: 'AI Bounding Box' },
      { value: 'threshold', label: 'Threshold' },
      { value: 'edges', label: 'Edge Detection' },
    ],
    []
  );
  const maskAttachModeOptions = useMemo(
    () => [
      { value: 'client_canvas_polygon', label: 'Option A: Canvas Polygon' },
      { value: 'server_polygon', label: 'Option C: Server Polygon' },
    ],
    []
  );
  const upscaleModeOptions = useMemo(
    () => [
      { value: 'client_canvas', label: 'Upscale A: Canvas' },
      { value: 'server_sharp', label: 'Upscale Server: Sharp' },
    ],
    []
  );
  const upscaleStrategyOptions = useMemo(
    () => [
      { value: 'scale', label: 'By Multiplier' },
      { value: 'target_resolution', label: 'By Resolution' },
    ],
    []
  );
  const cropModeOptions = useMemo(
    () => [
      { value: 'client_bbox', label: 'Crop Client: Canvas' },
      { value: 'server_bbox', label: 'Crop Server: Sharp' },
    ],
    []
  );
  const centerModeOptions = useMemo(
    () => [
      { value: 'client_alpha_bbox', label: 'Center Client: Canvas' },
      { value: 'server_alpha_bbox', label: 'Center Server: Sharp' },
      { value: 'client_white_bg_bbox', label: 'Center Client: White BG Bbox' },
      { value: 'client_object_layout', label: 'Object Layouting Client (Experimental)' },
      { value: 'server_object_layout', label: 'Object Layouting Server (Experimental)' },
    ],
    []
  );
  const autoScaleModeOptions = useMemo(
    () => [
      { value: 'client_auto_scaler', label: 'Auto Scaler Client: Canvas' },
      { value: 'server_auto_scaler', label: 'Auto Scaler Server: Sharp' },
    ],
    []
  );
  const shadowPolicyOptions = useMemo(
    () => [
      { value: 'auto', label: 'Shadow: Auto' },
      { value: 'include_shadow', label: 'Shadow: Include' },
      { value: 'exclude_shadow', label: 'Shadow: Exclude' },
    ],
    []
  );
  const detectionModeOptions = useMemo(
    () => [
      { value: 'auto', label: 'Detection: Auto' },
      { value: 'white_bg_first_colored_pixel', label: 'Detection: White FG' },
      { value: 'alpha_bbox', label: 'Detection: Alpha BBox' },
    ],
    []
  );
  const upscaleScaleOptions = useMemo(
    () => ['1.5', '2', '3', '4'].map((value: string) => ({ value, label: `${value}x` })),
    []
  );
  const upscaleSmoothingOptions = useMemo(
    () => [
      { value: 'high', label: 'Smoothing High' },
      { value: 'medium', label: 'Smoothing Medium' },
      { value: 'low', label: 'Smoothing Low' },
    ],
    []
  );

  const hasSourceImage = Boolean(workingSlot);
  const analysisPlanSlotId = state.analysisPlanSnapshot?.slotId?.trim() ?? '';
  const analysisPlanSourceMetadataMissing =
    state.analysisPlanAvailable &&
    (state.analysisPlanSnapshot?.sourceSignature?.trim() ?? '') === '';
  const analysisPlanSlotRecord =
    analysisPlanSlotId === ''
      ? null
      : (state.slots.find((slot) => (slot.id ?? '').trim() === analysisPlanSlotId) ?? null);
  const analysisPlanSlotMissing =
    state.analysisPlanAvailable && analysisPlanSlotId !== '' && !analysisPlanSlotRecord;
  const analysisPlanWillSwitchSlot =
    state.analysisPlanAvailable &&
    Boolean(analysisPlanSlotRecord) &&
    !state.analysisPlanMatchesWorkingSlot;
  const analysisPlanSwitchSlotLabel = analysisPlanSlotRecord?.name?.trim() || analysisPlanSlotId;
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
  const generationModel =
    brainGenerationModel.effectiveModelId.trim() || 'Not configured in AI Brain';
  const generationImageCount = String(studioSettings.targetAi.openai.image.n ?? 1);
  const handleImageCountChange = useCallback(
    (value: string): void => {
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
    },
    [setStudioSettings]
  );
  const handleAttachMasks = useCallback((): void => {
    void attachMaskVariantsFromSelection();
  }, [attachMaskVariantsFromSelection]);
  const handleGenerateMask = useCallback((): void => {
    void handleAiMaskGeneration(maskGenMode);
  }, [handleAiMaskGeneration, maskGenMode]);
  const handleMaskGenModeChange = useCallback(
    (value: string): void => {
      setMaskGenMode(value as 'ai-polygon' | 'ai-bbox' | 'threshold' | 'edges');
    },
    [setMaskGenMode]
  );
  const handleMaskInvertChange = useCallback(
    (checked: boolean): void => {
      setMaskInvert(Boolean(checked));
    },
    [setMaskInvert]
  );
  const handleMaskPreviewEnabledChange = useCallback(
    (checked: boolean): void => {
      setMaskPreviewEnabled(Boolean(checked));
    },
    [setMaskPreviewEnabled]
  );
  const handleCropAction = useCallback((): void => {
    void handleCrop();
  }, [handleCrop]);
  const handleSquareCropAction = useCallback((): void => {
    void handleSquareCrop();
  }, [handleSquareCrop]);
  const handlePreviewViewCropAction = useCallback((): void => {
    void handlePreviewViewCrop();
  }, [handlePreviewViewCrop]);
  const handleUpscaleAction = useCallback((): void => {
    void handleUpscale();
  }, [handleUpscale]);
  const handleCenterLayoutPresetChange = useCallback(
    (value: string): void => {
      const values = getObjectLayoutPresetValuesFromOption(
        value as ObjectLayoutPresetOptionValue,
        centerLayoutCustomPresets
      );
      if (!values) return;
      state.setCenterLayoutDetection(values.detection);
      state.setCenterLayoutShadowPolicy(values.shadowPolicy);
      state.setCenterLayoutWhiteThreshold(String(values.whiteThreshold));
      state.setCenterLayoutChromaThreshold(String(values.chromaThreshold));
    },
    [centerLayoutCustomPresets, state]
  );
  const handleCenterLayoutSavePreset = useCallback((): void => {
    void (async (): Promise<void> => {
      if (!state.centerLayoutPresetDraftName.trim().length) return;
      try {
        const saved = saveObjectLayoutCustomPreset(activeProjectId, {
          presetId: state.selectedCenterCustomPresetId ?? undefined,
          name: centerLayoutPresetDraftName.trim(),
          values: {
            detection: state.centerLayoutDetection,
            shadowPolicy: state.centerLayoutShadowPolicy,
            whiteThreshold: state.centerLayoutWhiteThresholdValue,
            chromaThreshold: state.centerLayoutChromaThresholdValue,
          },
        });
        setCenterLayoutCustomPresets(saved.presets);
        setCenterLayoutPresetDraftName(saved.savedPreset.name);
        toast(`Saved preset "${saved.savedPreset.name}".`, { variant: 'success' });
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Failed to save custom preset.', {
          variant: 'error',
        });
      }
    })();
  }, [
    activeProjectId,
    centerLayoutPresetDraftName,
    setCenterLayoutCustomPresets,
    setCenterLayoutPresetDraftName,
    state,
    toast,
  ]);
  const handleCenterLayoutDeletePreset = useCallback((): void => {
    if (!state.selectedCenterCustomPresetId) return;
    const deletedName = state.selectedCenterCustomPreset?.name?.trim() ?? '';
    const nextPresets = deleteObjectLayoutCustomPreset(
      activeProjectId,
      state.selectedCenterCustomPresetId
    );
    setCenterLayoutCustomPresets(nextPresets);
    setCenterLayoutPresetDraftName('');
    toast(deletedName ? `Deleted preset "${deletedName}".` : 'Deleted selected custom preset.', {
      variant: 'success',
    });
  }, [activeProjectId, setCenterLayoutCustomPresets, setCenterLayoutPresetDraftName, state, toast]);
  const handleRunAnalysisFromCenterAction = useCallback((): void => {
    void handleRunAnalysisFromCenter();
  }, [handleRunAnalysisFromCenter]);
  const handleCenterObjectAction = useCallback((): void => {
    void handleCenterObject();
  }, [handleCenterObject]);
  const handleToggleCenterLayoutAdvanced = useCallback((): void => {
    state.setCenterLayoutAdvancedEnabled(!state.centerLayoutAdvancedEnabled);
  }, [state]);
  const handleToggleCenterLayoutSplitAxes = useCallback((): void => {
    state.setCenterLayoutSplitAxes(!state.centerLayoutSplitAxes);
  }, [state]);
  const handleToggleCenterGuides = useCallback((): void => {
    setCenterGuidesEnabled(!centerGuidesEnabled);
  }, [centerGuidesEnabled, setCenterGuidesEnabled]);
  const handleAutoScaleAction = useCallback((): void => {
    void handleAutoScale();
  }, [handleAutoScale]);
  const handleRunAnalysisFromAutoScalerAction = useCallback((): void => {
    void handleRunAnalysisFromAutoScaler();
  }, [handleRunAnalysisFromAutoScaler]);
  const handleOpenSharedDetectionSettings = useCallback((): void => {
    state.setCenterLayoutAdvancedEnabled(true);
    const preferredCenterMode =
      state.centerMode === 'client_alpha_bbox' || state.centerMode === 'client_object_layout'
        ? 'client_object_layout'
        : 'server_object_layout';
    if (state.centerMode !== preferredCenterMode) {
      state.setCenterMode(preferredCenterMode);
    }
  }, [state]);
  const handleToggleAutoScaleLayoutSplitAxes = useCallback((): void => {
    state.setAutoScaleLayoutSplitAxes(!state.autoScaleLayoutSplitAxes);
  }, [state]);
  const defaultsSectionRuntime = useMemo(
    () => ({
      model: generationModel,
      imageCount: generationImageCount,
      imageCountOptions,
      onImageCountChange: handleImageCountChange,
    }),
    [generationImageCount, generationModel, handleImageCountChange, imageCountOptions]
  );
  const maskSectionRuntime = useMemo(
    () => ({
      exportMaskCount,
      maskAttachModeOptions,
      maskGenerationBusy,
      maskGenerationLabel,
      maskGenLoading,
      maskGenMode,
      maskInvert,
      maskModeOptions,
      maskPreviewEnabled,
      onAttachMasks: handleAttachMasks,
      onGenerateMask: handleGenerateMask,
      onMaskGenModeChange: handleMaskGenModeChange,
      onMaskInvertChange: handleMaskInvertChange,
      onMaskPreviewEnabledChange: handleMaskPreviewEnabledChange,
      workingSlotPresent: Boolean(workingSlot),
    }),
    [
      exportMaskCount,
      handleAttachMasks,
      handleGenerateMask,
      handleMaskGenModeChange,
      handleMaskInvertChange,
      handleMaskPreviewEnabledChange,
      maskAttachModeOptions,
      maskGenerationBusy,
      maskGenerationLabel,
      maskGenLoading,
      maskGenMode,
      maskInvert,
      maskModeOptions,
      maskPreviewEnabled,
      workingSlot,
    ]
  );
  const cropSectionRuntime = useMemo(
    () => ({
      cropBusyLabel,
      boundaryStatusLabel: state.hasShapeCropBoundary
        ? 'Boundary ready'
        : 'Move image outside canvas',
      cropModeOptions,
      cropTooltipContent,
      cropTooltipsEnabled,
      hasCropBoundary: state.hasShapeCropBoundary,
      hasSourceImage,
      onCancelCrop: handleCancelCrop,
      onCreateCropBox: handleCreateCropBox,
      onCrop: handleCropAction,
      onSquareCrop: handleSquareCropAction,
      onViewCrop: handlePreviewViewCropAction,
    }),
    [
      cropBusyLabel,
      cropModeOptions,
      cropTooltipContent,
      cropTooltipsEnabled,
      handleCancelCrop,
      handleCreateCropBox,
      handleCropAction,
      handlePreviewViewCropAction,
      handleSquareCropAction,
      hasSourceImage,
      state.hasShapeCropBoundary,
    ]
  );
  const upscaleSectionRuntime = useMemo(
    () => ({
      hasSourceImage,
      onCancelUpscale: handleCancelUpscale,
      onUpscale: handleUpscaleAction,
      upscaleBusyLabel,
      upscaleMaxOutputSide: UPSCALE_MAX_OUTPUT_SIDE,
      upscaleModeOptions,
      upscaleScaleOptions,
      upscaleSmoothingOptions,
      upscaleStrategyOptions,
    }),
    [
      handleCancelUpscale,
      handleUpscaleAction,
      hasSourceImage,
      upscaleBusyLabel,
      upscaleModeOptions,
      upscaleScaleOptions,
      upscaleSmoothingOptions,
      upscaleStrategyOptions,
    ]
  );
  const centerSectionRuntime = useMemo(
    () => ({
      analysisPlanAvailable: state.analysisPlanAvailable,
      analysisPlanSourceMetadataMissing,
      analysisWorkingSourceMetadataMissing: state.analysisWorkingSourceMetadataMissing,
      analysisPlanIsStale: state.analysisPlanIsStale,
      analysisPlanSlotMissing,
      analysisPlanWillSwitchSlot,
      analysisPlanSwitchSlotLabel,
      slotSelectionLocked: state.slotSelectionLocked,
      analysisSummaryData: state.analysisSummaryData,
      analysisSummaryIsStale: state.analysisPlanIsStale,
      analysisConfigMismatchMessage: state.centerAnalysisConfigMismatchMessage,
      analysisBusy,
      analysisBusyLabel,
      centerBusyLabel,
      centerGuidesEnabled,
      centerLayoutEnabled: centerIsObjectLayoutMode,
      centerLayoutPreset: state.centerLayoutPresetOptionValue,
      centerLayoutPresetOptions: state.centerLayoutPresetOptions,
      centerLayoutCanDeletePreset: Boolean(state.selectedCenterCustomPresetId),
      centerLayoutCanSavePreset: state.centerLayoutPresetDraftName.trim().length > 0,
      centerLayoutSavePresetLabel: state.selectedCenterCustomPresetId
        ? 'Update Preset'
        : 'Save Preset',
      centerLayoutDetectionOptions: detectionModeOptions,
      centerLayoutProjectCanvasSize: projectCanvasSize,
      centerLayoutShadowPolicyOptions: shadowPolicyOptions,
      centerTooltipContent,
      centerTooltipsEnabled: cropTooltipsEnabled,
      centerModeOptions,
      hasSourceImage,
      onCancelCenter: handleCancelCenter,
      onCenterLayoutPresetChange: handleCenterLayoutPresetChange,
      onCenterLayoutSavePreset: handleCenterLayoutSavePreset,
      onCenterLayoutDeletePreset: handleCenterLayoutDeletePreset,
      onRunAnalysis: handleRunAnalysisFromCenterAction,
      onCenterObject: handleCenterObjectAction,
      onToggleCenterLayoutAdvanced: handleToggleCenterLayoutAdvanced,
      onToggleCenterLayoutSplitAxes: handleToggleCenterLayoutSplitAxes,
      onToggleCenterGuides: handleToggleCenterGuides,
    }),
    [
      analysisBusy,
      analysisBusyLabel,
      analysisPlanSlotMissing,
      analysisPlanSourceMetadataMissing,
      analysisPlanSwitchSlotLabel,
      analysisPlanWillSwitchSlot,
      centerBusyLabel,
      centerGuidesEnabled,
      centerIsObjectLayoutMode,
      centerModeOptions,
      centerTooltipContent,
      cropTooltipsEnabled,
      detectionModeOptions,
      handleCancelCenter,
      handleCenterLayoutDeletePreset,
      handleCenterLayoutPresetChange,
      handleCenterLayoutSavePreset,
      handleCenterObjectAction,
      handleRunAnalysisFromCenterAction,
      handleToggleCenterGuides,
      handleToggleCenterLayoutAdvanced,
      handleToggleCenterLayoutSplitAxes,
      hasSourceImage,
      projectCanvasSize,
      shadowPolicyOptions,
      state,
    ]
  );
  const autoScalerSectionRuntime = useMemo(
    () => ({
      analysisPlanAvailable: state.analysisPlanAvailable,
      analysisPlanSourceMetadataMissing,
      analysisWorkingSourceMetadataMissing: state.analysisWorkingSourceMetadataMissing,
      analysisPlanIsStale: state.analysisPlanIsStale,
      analysisPlanSlotMissing,
      analysisPlanWillSwitchSlot,
      analysisPlanSwitchSlotLabel,
      slotSelectionLocked: state.slotSelectionLocked,
      analysisSummaryData: state.analysisSummaryData,
      analysisSummaryIsStale: state.analysisPlanIsStale,
      analysisConfigMismatchMessage: state.autoScaleAnalysisConfigMismatchMessage,
      analysisBusy,
      analysisBusyLabel,
      autoScaleBusyLabel,
      autoScaleLayoutProjectCanvasSize: projectCanvasSize,
      autoScaleShadowPolicyOptions: shadowPolicyOptions,
      autoScaleTooltipContent,
      autoScaleTooltipsEnabled: cropTooltipsEnabled,
      autoScaleModeOptions,
      hasSourceImage,
      onAutoScale: handleAutoScaleAction,
      onRunAnalysis: handleRunAnalysisFromAutoScalerAction,
      onCancelAutoScale: handleCancelAutoScale,
      onOpenSharedDetectionSettings: handleOpenSharedDetectionSettings,
      onToggleAutoScaleLayoutSplitAxes: handleToggleAutoScaleLayoutSplitAxes,
    }),
    [
      analysisBusy,
      analysisBusyLabel,
      analysisPlanSlotMissing,
      analysisPlanSourceMetadataMissing,
      analysisPlanSwitchSlotLabel,
      analysisPlanWillSwitchSlot,
      autoScaleBusyLabel,
      autoScaleModeOptions,
      autoScaleTooltipContent,
      cropTooltipsEnabled,
      handleAutoScaleAction,
      handleCancelAutoScale,
      handleOpenSharedDetectionSettings,
      handleRunAnalysisFromAutoScalerAction,
      handleToggleAutoScaleLayoutSplitAxes,
      hasSourceImage,
      projectCanvasSize,
      shadowPolicyOptions,
      state,
    ]
  );

  return (
    <div className='space-y-3'>
      <GenerationToolbarDefaultsSectionRuntimeProvider value={defaultsSectionRuntime}>
        <GenerationToolbarDefaultsSection />
      </GenerationToolbarDefaultsSectionRuntimeProvider>

      <GenerationToolbarMaskSectionRuntimeProvider value={maskSectionRuntime}>
        <GenerationToolbarMaskSection />
      </GenerationToolbarMaskSectionRuntimeProvider>

      <GenerationToolbarCropSectionRuntimeProvider value={cropSectionRuntime}>
        <GenerationToolbarCropSection />
      </GenerationToolbarCropSectionRuntimeProvider>

      <GenerationToolbarUpscaleSectionRuntimeProvider value={upscaleSectionRuntime}>
        <GenerationToolbarUpscaleSection />
      </GenerationToolbarUpscaleSectionRuntimeProvider>

      <GenerationToolbarCenterSectionRuntimeProvider value={centerSectionRuntime}>
        <GenerationToolbarCenterSection />
      </GenerationToolbarCenterSectionRuntimeProvider>

      <GenerationToolbarAutoScalerSectionRuntimeProvider value={autoScalerSectionRuntime}>
        <GenerationToolbarAutoScalerSection />
      </GenerationToolbarAutoScalerSectionRuntimeProvider>
    </div>
  );
}
