'use client';

import React, { createContext, useContext } from 'react';

import { type ImageStudioAnalysisSummaryChipData } from '@/features/ai/image-studio/components/ImageStudioAnalysisSummaryChip';
import type { LabelValueOptionDto as SelectOption } from '@/shared/contracts/ui';
import { internalError } from '@/shared/errors/app-error';

export type { SelectOption };

export type CropTooltipContent = {
  cancelCrop: string;
  crop: string;
  cropBoxTool: string;
  squareCrop: string;
  viewCrop: string;
};

export type CenterTooltipContent = {
  apply: string;
  detection: string;
  fillMissingCanvasWhite: string;
  mode: string;
  padding: string;
  paddingAxes: string;
  shadowPolicy: string;
  thresholds: string;
};

export type AutoScaleTooltipContent = {
  apply: string;
  fillMissingCanvasWhite: string;
  mode: string;
  padding: string;
  paddingAxes: string;
  shadowPolicy: string;
};

export type GenerationToolbarDefaultsSectionRuntimeValue = {
  imageCount: string;
  imageCountOptions: SelectOption[];
  model: string;
  onImageCountChange: (value: string) => void;
};

export type GenerationToolbarMaskSectionRuntimeValue = {
  exportMaskCount: number;
  maskAttachModeOptions: SelectOption[];
  maskGenerationBusy: boolean;
  maskGenerationLabel: string;
  maskGenLoading: boolean;
  maskGenMode: string;
  maskInvert: boolean;
  maskModeOptions: SelectOption[];
  maskPreviewEnabled: boolean;
  onAttachMasks: () => void;
  onGenerateMask: () => void;
  onMaskGenModeChange: (value: string) => void;
  onMaskInvertChange: (checked: boolean) => void;
  onMaskPreviewEnabledChange: (checked: boolean) => void;
  workingSlotPresent: boolean;
};

export type GenerationToolbarCropSectionRuntimeValue = {
  boundaryStatusLabel: string;
  cropBusyLabel: string;
  cropModeOptions: SelectOption[];
  cropTooltipContent: CropTooltipContent;
  cropTooltipsEnabled: boolean;
  hasCropBoundary: boolean;
  hasSourceImage: boolean;
  onCancelCrop: () => void;
  onCreateCropBox: () => void;
  onCrop: () => void;
  onSquareCrop: () => void;
  onViewCrop: () => void;
};

export type GenerationToolbarUpscaleSectionRuntimeValue = {
  hasSourceImage: boolean;
  onCancelUpscale: () => void;
  onUpscale: () => void;
  upscaleBusyLabel: string;
  upscaleMaxOutputSide: number;
  upscaleModeOptions: SelectOption[];
  upscaleScaleOptions: SelectOption[];
  upscaleSmoothingOptions: SelectOption[];
  upscaleStrategyOptions: SelectOption[];
};

export type GenerationToolbarCenterSectionRuntimeValue = {
  analysisPlanAvailable: boolean;
  analysisPlanSourceMetadataMissing: boolean;
  analysisWorkingSourceMetadataMissing: boolean;
  analysisPlanIsStale: boolean;
  analysisPlanSlotMissing: boolean;
  analysisPlanWillSwitchSlot: boolean;
  analysisPlanSwitchSlotLabel: string;
  slotSelectionLocked: boolean;
  analysisSummaryData: ImageStudioAnalysisSummaryChipData | null;
  analysisSummaryIsStale: boolean;
  analysisConfigMismatchMessage: string | null;
  analysisBusy: boolean;
  analysisBusyLabel: string;
  centerBusyLabel: string;
  centerGuidesEnabled: boolean;
  centerLayoutEnabled: boolean;
  centerLayoutPreset: string;
  centerLayoutPresetOptions: SelectOption[];
  centerLayoutCanDeletePreset: boolean;
  centerLayoutCanSavePreset: boolean;
  centerLayoutSavePresetLabel: string;
  centerLayoutDetectionOptions: SelectOption[];
  centerLayoutProjectCanvasSize: { width: number; height: number } | null;
  centerLayoutShadowPolicyOptions: SelectOption[];
  centerTooltipContent: CenterTooltipContent;
  centerTooltipsEnabled: boolean;
  centerModeOptions: SelectOption[];
  hasSourceImage: boolean;
  onCancelCenter: () => void;
  onCenterLayoutPresetChange: (value: string) => void;
  onCenterLayoutSavePreset: () => void;
  onCenterLayoutDeletePreset: () => void;
  onRunAnalysis: () => void;
  onCenterObject: () => void;
  onToggleCenterLayoutAdvanced: () => void;
  onToggleCenterLayoutSplitAxes: () => void;
  onToggleCenterGuides: () => void;
};

export type GenerationToolbarAutoScalerSectionRuntimeValue = {
  analysisPlanAvailable: boolean;
  analysisPlanSourceMetadataMissing: boolean;
  analysisWorkingSourceMetadataMissing: boolean;
  analysisPlanIsStale: boolean;
  analysisPlanSlotMissing: boolean;
  analysisPlanWillSwitchSlot: boolean;
  analysisPlanSwitchSlotLabel: string;
  slotSelectionLocked: boolean;
  analysisSummaryData: ImageStudioAnalysisSummaryChipData | null;
  analysisSummaryIsStale: boolean;
  analysisConfigMismatchMessage: string | null;
  analysisBusy: boolean;
  analysisBusyLabel: string;
  autoScaleBusyLabel: string;
  autoScaleLayoutProjectCanvasSize: { width: number; height: number } | null;
  autoScaleShadowPolicyOptions: SelectOption[];
  autoScaleTooltipContent: AutoScaleTooltipContent;
  autoScaleTooltipsEnabled: boolean;
  autoScaleModeOptions: SelectOption[];
  hasSourceImage: boolean;
  onAutoScale: () => void;
  onRunAnalysis: () => void;
  onCancelAutoScale: () => void;
  onOpenSharedDetectionSettings: () => void;
  onToggleAutoScaleLayoutSplitAxes: () => void;
};

function createSectionRuntimeContext<T>(name: string) {
  const Context = createContext<T | null>(null);

  const Provider = ({
    value,
    children,
  }: {
    value: T;
    children: React.ReactNode;
  }): React.JSX.Element => <Context.Provider value={value}>{children}</Context.Provider>;

  const useRuntime = (): T => {
    const context = useContext(Context);
    if (!context) {
      throw internalError(`${name} must be used within its provider`);
    }
    return context;
  };

  return [Provider, useRuntime] as const;
}

export const [
  GenerationToolbarDefaultsSectionRuntimeProvider,
  useGenerationToolbarDefaultsSectionRuntime,
] = createSectionRuntimeContext<GenerationToolbarDefaultsSectionRuntimeValue>(
  'useGenerationToolbarDefaultsSectionRuntime'
);

export const [GenerationToolbarMaskSectionRuntimeProvider, useGenerationToolbarMaskSectionRuntime] =
  createSectionRuntimeContext<GenerationToolbarMaskSectionRuntimeValue>(
    'useGenerationToolbarMaskSectionRuntime'
  );

export const [GenerationToolbarCropSectionRuntimeProvider, useGenerationToolbarCropSectionRuntime] =
  createSectionRuntimeContext<GenerationToolbarCropSectionRuntimeValue>(
    'useGenerationToolbarCropSectionRuntime'
  );

export const [
  GenerationToolbarUpscaleSectionRuntimeProvider,
  useGenerationToolbarUpscaleSectionRuntime,
] = createSectionRuntimeContext<GenerationToolbarUpscaleSectionRuntimeValue>(
  'useGenerationToolbarUpscaleSectionRuntime'
);

export const [
  GenerationToolbarCenterSectionRuntimeProvider,
  useGenerationToolbarCenterSectionRuntime,
] = createSectionRuntimeContext<GenerationToolbarCenterSectionRuntimeValue>(
  'useGenerationToolbarCenterSectionRuntime'
);

export const [
  GenerationToolbarAutoScalerSectionRuntimeProvider,
  useGenerationToolbarAutoScalerSectionRuntime,
] = createSectionRuntimeContext<GenerationToolbarAutoScalerSectionRuntimeValue>(
  'useGenerationToolbarAutoScalerSectionRuntime'
);
