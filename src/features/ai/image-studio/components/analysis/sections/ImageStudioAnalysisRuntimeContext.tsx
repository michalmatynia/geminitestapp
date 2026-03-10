'use client';

import React from 'react';

import type { AiPathMeta } from '@/features/ai/image-studio/utils/ai-paths-object-analysis';
import type { ImageStudioAnalysisPlanSnapshot } from '@/features/ai/image-studio/utils/analysis-bridge';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import type {
  AnalysisMode,
  AnalysisResult,
  DetectionMode,
  ShadowPolicy,
} from '../analysis-types';

export interface AnalysisSettingsSectionConfig {
  mode: AnalysisMode;
  setMode: (mode: AnalysisMode) => void;
  layoutPadding: string;
  setLayoutPadding: (v: string) => void;
  layoutPaddingX: string;
  setLayoutPaddingX: (v: string) => void;
  layoutPaddingY: string;
  setLayoutPaddingY: (v: string) => void;
  layoutSplitAxes: boolean;
  setLayoutSplitAxes: (v: boolean | ((p: boolean) => boolean)) => void;
  layoutAdvancedEnabled: boolean;
  setLayoutAdvancedEnabled: (v: boolean | ((p: boolean) => boolean)) => void;
  layoutDetection: DetectionMode;
  setLayoutDetection: (mode: DetectionMode) => void;
  layoutWhiteThreshold: string;
  setLayoutWhiteThreshold: (v: string) => void;
  layoutChromaThreshold: string;
  setLayoutChromaThreshold: (v: string) => void;
  layoutFillMissingCanvasWhite: boolean;
  setLayoutFillMissingCanvasWhite: (v: boolean) => void;
  layoutShadowPolicy: ShadowPolicy;
  setLayoutShadowPolicy: (mode: ShadowPolicy) => void;
  layoutPresetOptionValue: string;
  layoutPresetOptions: Array<{ value: string; label: string }>;
  layoutPresetDraftName: string;
  setLayoutPresetDraftName: (v: string) => void;
  onCenterLayoutPresetChange: (value: string) => void;
  onCenterLayoutSavePreset: () => void;
  onCenterLayoutDeletePreset: () => void;
  layoutCanSavePreset: boolean;
  layoutCanDeletePreset: boolean;
  layoutSavePresetLabel: string;
  projectCanvasSize: { width: number; height: number } | null;
  busy: boolean;
  busyLabel: string;
  handleAnalyze: () => void;
  handleCancel: () => void;
  workingSlotId: string | null;
  workingSlotImageSrc: string | null;
  sanitizePaddingInput: (v: string) => string;
  sanitizeThresholdInput: (v: string) => string;
}

export interface AnalysisResultSectionRuntime {
  result: AnalysisResult | null;
  resultSourceSlotId: string;
  persistedPlanSnapshot: ImageStudioAnalysisPlanSnapshot | null;
  currentWorkingSlotId: string;
  availableSlots: Array<{ id: string; label?: string }>;
  slotSelectionLocked: boolean;
  analysisSourceSignatureMissing: boolean;
  analysisCurrentSourceMetadataMissing: boolean;
  analysisPlanIsStale: boolean;
  queueAnalysisApplyIntent: (
    target: 'object_layout' | 'auto_scaler',
    options?: { runAfterApply?: boolean }
  ) => void;
}

export interface CustomTriggerButtonsSectionRuntime {
  projectId: string;
  pathMetas: AiPathMeta[];
  triggerAnalysisForPath: (pathId: string) => Promise<void>;
  isRunning: boolean;
}

export interface ImageStudioAnalysisRuntimeValue {
  settingsConfig: AnalysisSettingsSectionConfig;
  resultRuntime: AnalysisResultSectionRuntime;
  customTriggerButtonsRuntime: CustomTriggerButtonsSectionRuntime;
}

const {
  Context: ImageStudioAnalysisRuntimeContext,
  useStrictContext: useImageStudioAnalysisRuntime,
  useOptionalContext: useOptionalImageStudioAnalysisRuntime,
} = createStrictContext<ImageStudioAnalysisRuntimeValue>({
  hookName: 'useImageStudioAnalysisRuntime',
  providerName: 'ImageStudioAnalysisRuntimeProvider',
  displayName: 'ImageStudioAnalysisRuntimeContext',
});

export {
  ImageStudioAnalysisRuntimeContext,
  useImageStudioAnalysisRuntime,
  useOptionalImageStudioAnalysisRuntime,
};

export const useImageStudioAnalysisRuntimeState = (): ImageStudioAnalysisRuntimeValue =>
  useImageStudioAnalysisRuntime();

export const useImageStudioAnalysisRuntimeActions = (): ImageStudioAnalysisRuntimeValue =>
  useImageStudioAnalysisRuntime();

export function ImageStudioAnalysisRuntimeProvider({
  value,
  children,
}: {
  value: ImageStudioAnalysisRuntimeValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <ImageStudioAnalysisRuntimeContext.Provider value={value}>
      {children}
    </ImageStudioAnalysisRuntimeContext.Provider>
  );
}
