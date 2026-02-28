'use client';

import React, { useMemo } from 'react';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import { useGenerationToolbarState } from './GenerationToolbar.hooks';
import { UPSCALE_MAX_OUTPUT_SIDE } from './GenerationToolbar.utils';
import {
  getObjectLayoutPresetValuesFromOption,
  saveObjectLayoutCustomPreset,
  deleteObjectLayoutCustomPreset,
  type ObjectLayoutPresetOptionValue,
} from '@/shared/lib/ai/image-studio/utils/object-layout-presets';
import { getImageStudioDocTooltip } from '@/shared/lib/ai/image-studio/utils/studio-docs';
import { useGenerationToolbarHandlers } from './GenerationToolbar.handlers';
import { type GenerationToolbarHandlers } from './GenerationToolbar.types';
import { useGenerationToolbarEffects } from './useGenerationToolbarEffects';
import { GenerationToolbarAutoScalerSection } from './GenerationToolbarAutoScalerSection';
import { GenerationToolbarCenterSection } from './GenerationToolbarCenterSection';
import { GenerationToolbarCropSection } from './GenerationToolbarCropSection';
import { GenerationToolbarDefaultsSection } from './GenerationToolbarDefaultsSection';
import { GenerationToolbarMaskSection } from './GenerationToolbarMaskSection';
import { GenerationToolbarUpscaleSection } from './GenerationToolbarUpscaleSection';

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
      { value: 'client_object_layout_v1', label: 'Object Layouting Client (Experimental)' },
      { value: 'server_object_layout_v1', label: 'Object Layouting Server (Experimental)' },
    ],
    []
  );
  const autoScaleModeOptions = useMemo(
    () => [
      { value: 'client_auto_scaler_v1', label: 'Auto Scaler Client: Canvas' },
      { value: 'server_auto_scaler_v1', label: 'Auto Scaler Server: Sharp' },
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
    brainGenerationModel.effectiveModelId.trim() ||
    studioSettings.targetAi.openai.model.trim() ||
    'Not configured in AI Brain';
  const generationImageCount = String(studioSettings.targetAi.openai.image.n ?? 1);

  return (
    <div className='space-y-3'>
      <GenerationToolbarDefaultsSection
        model={generationModel}
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
          const action = async () => {
            await attachMaskVariantsFromSelection();
          };
          void action();
        }}
        onGenerateMask={() => {
          const action = async () => {
            await handleAiMaskGeneration(maskGenMode);
          };
          void action();
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
        boundaryStatusLabel={
          state.hasShapeCropBoundary ? 'Boundary ready' : 'Move image outside canvas'
        }
        cropModeOptions={cropModeOptions}
        cropTooltipContent={cropTooltipContent}
        cropTooltipsEnabled={cropTooltipsEnabled}
        hasCropBoundary={state.hasShapeCropBoundary}
        hasSourceImage={hasSourceImage}
        onCancelCrop={handleCancelCrop}
        onCreateCropBox={handleCreateCropBox}
        onCrop={() => {
          const action = async () => {
            await handleCrop();
          };
          void action();
        }}
        onSquareCrop={() => {
          const action = async () => {
            await handleSquareCrop();
          };
          void action();
        }}
        onViewCrop={() => {
          const action = async () => {
            await handlePreviewViewCrop();
          };
          void action();
        }}
      />

      <GenerationToolbarUpscaleSection
        hasSourceImage={hasSourceImage}
        onCancelUpscale={handleCancelUpscale}
        onUpscale={() => {
          const action = async () => {
            await handleUpscale();
          };
          void action();
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
        analysisPlanSourceMetadataMissing={analysisPlanSourceMetadataMissing}
        analysisWorkingSourceMetadataMissing={state.analysisWorkingSourceMetadataMissing}
        analysisPlanIsStale={state.analysisPlanIsStale}
        analysisPlanSlotMissing={analysisPlanSlotMissing}
        analysisPlanWillSwitchSlot={analysisPlanWillSwitchSlot}
        analysisPlanSwitchSlotLabel={analysisPlanSwitchSlotLabel}
        slotSelectionLocked={state.slotSelectionLocked}
        analysisSummaryData={state.analysisSummaryData}
        analysisSummaryIsStale={state.analysisPlanIsStale}
        analysisConfigMismatchMessage={state.centerAnalysisConfigMismatchMessage}
        analysisBusy={analysisBusy}
        analysisBusyLabel={analysisBusyLabel}
        centerBusyLabel={centerBusyLabel}
        centerGuidesEnabled={centerGuidesEnabled}
        centerLayoutEnabled={centerIsObjectLayoutMode}
        centerLayoutPreset={state.centerLayoutPresetOptionValue}
        centerLayoutPresetOptions={state.centerLayoutPresetOptions}
        centerLayoutCanDeletePreset={Boolean(state.selectedCenterCustomPresetId)}
        centerLayoutCanSavePreset={state.centerLayoutPresetDraftName.trim().length > 0}
        centerLayoutSavePresetLabel={
          state.selectedCenterCustomPresetId ? 'Update Preset' : 'Save Preset'
        }
        centerLayoutDetectionOptions={detectionModeOptions}
        centerLayoutProjectCanvasSize={projectCanvasSize}
        centerLayoutShadowPolicyOptions={shadowPolicyOptions}
        centerTooltipContent={centerTooltipContent}
        centerTooltipsEnabled={cropTooltipsEnabled}
        centerModeOptions={centerModeOptions}
        hasSourceImage={hasSourceImage}
        onCancelCenter={handleCancelCenter}
        onCenterLayoutPresetChange={(value: string) => {
          const values = getObjectLayoutPresetValuesFromOption(
            value as ObjectLayoutPresetOptionValue,
            centerLayoutCustomPresets
          );
          if (!values) return;
          state.setCenterLayoutDetection(values.detection);
          state.setCenterLayoutShadowPolicy(values.shadowPolicy);
          state.setCenterLayoutWhiteThreshold(String(values.whiteThreshold));
          state.setCenterLayoutChromaThreshold(String(values.chromaThreshold));
        }}
        onCenterLayoutSavePreset={(): void => {
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
        }}
        onCenterLayoutDeletePreset={() => {
          if (!state.selectedCenterCustomPresetId) return;
          const deletedName = state.selectedCenterCustomPreset?.name?.trim() ?? '';
          const nextPresets = deleteObjectLayoutCustomPreset(
            activeProjectId,
            state.selectedCenterCustomPresetId
          );
          setCenterLayoutCustomPresets(nextPresets);
          setCenterLayoutPresetDraftName('');
          toast(
            deletedName ? `Deleted preset "${deletedName}".` : 'Deleted selected custom preset.',
            { variant: 'success' }
          );
        }}
        onRunAnalysis={() => {
          const action = async () => {
            await handleRunAnalysisFromCenter();
          };
          void action();
        }}
        onCenterObject={() => {
          const action = async () => {
            await handleCenterObject();
          };
          void action();
        }}
        onToggleCenterLayoutAdvanced={() => {
          state.setCenterLayoutAdvancedEnabled(!state.centerLayoutAdvancedEnabled);
        }}
        onToggleCenterLayoutSplitAxes={() => {
          state.setCenterLayoutSplitAxes(!state.centerLayoutSplitAxes);
        }}
        onToggleCenterGuides={() => {
          setCenterGuidesEnabled(!centerGuidesEnabled);
        }}
      />

      <GenerationToolbarAutoScalerSection
        analysisPlanAvailable={state.analysisPlanAvailable}
        analysisPlanSourceMetadataMissing={analysisPlanSourceMetadataMissing}
        analysisWorkingSourceMetadataMissing={state.analysisWorkingSourceMetadataMissing}
        analysisPlanIsStale={state.analysisPlanIsStale}
        analysisPlanSlotMissing={analysisPlanSlotMissing}
        analysisPlanWillSwitchSlot={analysisPlanWillSwitchSlot}
        analysisPlanSwitchSlotLabel={analysisPlanSwitchSlotLabel}
        slotSelectionLocked={state.slotSelectionLocked}
        analysisSummaryData={state.analysisSummaryData}
        analysisSummaryIsStale={state.analysisPlanIsStale}
        analysisConfigMismatchMessage={state.autoScaleAnalysisConfigMismatchMessage}
        analysisBusy={analysisBusy}
        analysisBusyLabel={analysisBusyLabel}
        autoScaleBusyLabel={autoScaleBusyLabel}
        autoScaleLayoutProjectCanvasSize={projectCanvasSize}
        autoScaleShadowPolicyOptions={shadowPolicyOptions}
        autoScaleTooltipContent={autoScaleTooltipContent}
        autoScaleTooltipsEnabled={cropTooltipsEnabled}
        autoScaleModeOptions={autoScaleModeOptions}
        hasSourceImage={hasSourceImage}
        onAutoScale={() => {
          const action = async () => {
            await handleAutoScale();
          };
          void action();
        }}
        onRunAnalysis={() => {
          const action = async () => {
            await handleRunAnalysisFromAutoScaler();
          };
          void action();
        }}
        onCancelAutoScale={handleCancelAutoScale}
        onOpenSharedDetectionSettings={() => {
          state.setCenterLayoutAdvancedEnabled(true);
          const preferredCenterMode =
            state.centerMode === 'client_alpha_bbox' ||
            state.centerMode === 'client_object_layout_v1'
              ? 'client_object_layout_v1'
              : 'server_object_layout_v1';
          if (state.centerMode !== preferredCenterMode) {
            state.setCenterMode(preferredCenterMode);
          }
        }}
        onToggleAutoScaleLayoutSplitAxes={() => {
          state.setAutoScaleLayoutSplitAxes(!state.autoScaleLayoutSplitAxes);
        }}
      />
    </div>
  );
}
