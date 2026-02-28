'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';

import type { ObjectLayoutCustomPreset } from '@/features/ai/image-studio/utils/object-layout-presets';
import type {
  ImageStudioAnalysisPlanSnapshot,
  ImageStudioAnalysisApplyTarget,
} from '@/features/ai/image-studio/utils/analysis-bridge';
import type { UpscaleSmoothingQuality } from './GenerationToolbarImageUtils';
import type {
  ImageStudioCenterDetectionMode,
  ImageStudioCenterShadowPolicy,
} from '../../contracts/center';

export type MaskAttachMode = 'client_canvas_polygon' | 'server_polygon';
export type UpscaleMode = 'client_canvas' | 'server_sharp';
export type UpscaleStrategy = 'scale' | 'target_resolution';
export type CropMode = 'client_bbox' | 'server_bbox';
export type CenterMode =
  | 'client_alpha_bbox'
  | 'server_alpha_bbox'
  | 'client_object_layout_v1'
  | 'server_object_layout_v1'
  | 'client_white_bg_bbox';
export type AutoScalerMode = 'client_auto_scaler_v1' | 'server_auto_scaler_v1';

export type CropStatus =
  | 'idle'
  | 'resolving'
  | 'preparing'
  | 'uploading'
  | 'processing'
  | 'persisting';
export type CenterStatus =
  | 'idle'
  | 'resolving'
  | 'preparing'
  | 'uploading'
  | 'processing'
  | 'persisting';
export type UpscaleStatus =
  | 'idle'
  | 'resolving'
  | 'preparing'
  | 'uploading'
  | 'processing'
  | 'persisting';
export type AutoScaleStatus =
  | 'idle'
  | 'resolving'
  | 'preparing'
  | 'uploading'
  | 'processing'
  | 'persisting';
export type AnalysisStatus = 'idle' | 'resolving' | 'processing';

export interface GenerationToolbarContextValue {
  // Mode State
  maskAttachMode: MaskAttachMode;
  setMaskAttachMode: (mode: MaskAttachMode) => void;
  upscaleMode: UpscaleMode;
  setUpscaleMode: (mode: UpscaleMode) => void;
  upscaleStrategy: UpscaleStrategy;
  setUpscaleStrategy: (strategy: UpscaleStrategy) => void;
  cropMode: CropMode;
  setCropMode: (mode: CropMode) => void;
  centerMode: CenterMode;
  setCenterMode: (mode: CenterMode) => void;
  autoScaleMode: AutoScalerMode;
  setAutoScaleMode: (mode: AutoScalerMode) => void;

  // Center Layout State
  centerLayoutPadding: string;
  setCenterLayoutPadding: (val: string) => void;
  centerLayoutPaddingX: string;
  setCenterLayoutPaddingX: (val: string) => void;
  centerLayoutPaddingY: string;
  setCenterLayoutPaddingY: (val: string) => void;
  centerLayoutSplitAxes: boolean;
  setCenterLayoutSplitAxes: (val: boolean) => void;
  centerLayoutAdvancedEnabled: boolean;
  setCenterLayoutAdvancedEnabled: (val: boolean) => void;
  centerLayoutDetection: ImageStudioCenterDetectionMode;
  setCenterLayoutDetection: (val: ImageStudioCenterDetectionMode) => void;
  centerLayoutWhiteThreshold: string;
  setCenterLayoutWhiteThreshold: (val: string) => void;
  centerLayoutChromaThreshold: string;
  setCenterLayoutChromaThreshold: (val: string) => void;
  centerLayoutFillMissingCanvasWhite: boolean;
  setCenterLayoutFillMissingCanvasWhite: (val: boolean) => void;
  centerLayoutShadowPolicy: ImageStudioCenterShadowPolicy;
  setCenterLayoutShadowPolicy: (val: ImageStudioCenterShadowPolicy) => void;
  centerLayoutCustomPresets: ObjectLayoutCustomPreset[];
  setCenterLayoutCustomPresets: (val: ObjectLayoutCustomPreset[]) => void;
  centerLayoutPresetDraftName: string;
  setCenterLayoutPresetDraftName: (val: string) => void;

  // Analysis State
  analysisPlanSnapshot: ImageStudioAnalysisPlanSnapshot | null;
  setAnalysisPlanSnapshot: (val: ImageStudioAnalysisPlanSnapshot | null) => void;
  queuedAnalysisRunTarget: ImageStudioAnalysisApplyTarget | null;
  setQueuedAnalysisRunTarget: (val: ImageStudioAnalysisApplyTarget | null) => void;

  // Auto Scaler Layout State
  autoScaleLayoutPadding: string;
  setAutoScaleLayoutPadding: (val: string) => void;
  autoScaleLayoutPaddingX: string;
  setAutoScaleLayoutPaddingX: (val: string) => void;
  autoScaleLayoutPaddingY: string;
  setAutoScaleLayoutPaddingY: (val: string) => void;
  autoScaleLayoutSplitAxes: boolean;
  setAutoScaleLayoutSplitAxes: (val: boolean) => void;
  autoScaleLayoutFillMissingCanvasWhite: boolean;
  setAutoScaleLayoutFillMissingCanvasWhite: (val: boolean) => void;
  autoScaleLayoutShadowPolicy: ImageStudioCenterShadowPolicy;
  setAutoScaleLayoutShadowPolicy: (val: ImageStudioCenterShadowPolicy) => void;

  // Upscale State
  upscaleScale: string;
  setUpscaleScale: (val: string) => void;
  upscaleTargetWidth: string;
  setUpscaleTargetWidth: (val: string) => void;
  upscaleTargetHeight: string;
  setUpscaleTargetHeight: (val: string) => void;
  upscaleSmoothingQuality: UpscaleSmoothingQuality;
  setUpscaleSmoothingQuality: (val: UpscaleSmoothingQuality) => void;

  // Busy/Status State
  upscaleBusy: boolean;
  setUpscaleBusy: (val: boolean) => void;
  upscaleStatus: UpscaleStatus;
  setUpscaleStatus: (val: UpscaleStatus) => void;
  cropBusy: boolean;
  setCropBusy: (val: boolean) => void;
  cropStatus: CropStatus;
  setCropStatus: (val: CropStatus) => void;
  centerBusy: boolean;
  setCenterBusy: (val: boolean) => void;
  centerStatus: CenterStatus;
  setCenterStatus: (val: CenterStatus) => void;
  autoScaleBusy: boolean;
  setAutoScaleBusy: (val: boolean) => void;
  autoScaleStatus: AutoScaleStatus;
  setAutoScaleStatus: (val: AutoScaleStatus) => void;
  analysisBusy: boolean;
  setAnalysisBusy: (val: boolean) => void;
  analysisStatus: AnalysisStatus;
  setAnalysisStatus: (val: AnalysisStatus) => void;
}

const GenerationToolbarContext = createContext<GenerationToolbarContextValue | null>(null);

export function GenerationToolbarProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [maskAttachMode, setMaskAttachMode] = useState<MaskAttachMode>('client_canvas_polygon');
  const [upscaleMode, setUpscaleMode] = useState<UpscaleMode>('client_canvas');
  const [upscaleStrategy, setUpscaleStrategy] = useState<UpscaleStrategy>('scale');
  const [cropMode, setCropMode] = useState<CropMode>('client_bbox');
  const [centerMode, setCenterMode] = useState<CenterMode>('client_alpha_bbox');
  const [autoScaleMode, setAutoScaleMode] = useState<AutoScalerMode>('client_auto_scaler_v1');

  const [centerLayoutPadding, setCenterLayoutPadding] = useState('8');
  const [centerLayoutPaddingX, setCenterLayoutPaddingX] = useState('8');
  const [centerLayoutPaddingY, setCenterLayoutPaddingY] = useState('8');
  const [centerLayoutSplitAxes, setCenterLayoutSplitAxes] = useState(false);
  const [centerLayoutAdvancedEnabled, setCenterLayoutAdvancedEnabled] = useState(false);
  const [centerLayoutDetection, setCenterLayoutDetection] =
    useState<ImageStudioCenterDetectionMode>('auto');
  const [centerLayoutWhiteThreshold, setCenterLayoutWhiteThreshold] = useState('16');
  const [centerLayoutChromaThreshold, setCenterLayoutChromaThreshold] = useState('10');
  const [centerLayoutFillMissingCanvasWhite, setCenterLayoutFillMissingCanvasWhite] =
    useState(false);
  const [centerLayoutShadowPolicy, setCenterLayoutShadowPolicy] =
    useState<ImageStudioCenterShadowPolicy>('auto');
  const [centerLayoutCustomPresets, setCenterLayoutCustomPresets] = useState<
    ObjectLayoutCustomPreset[]
  >([]);
  const [centerLayoutPresetDraftName, setCenterLayoutPresetDraftName] = useState('');

  const [analysisPlanSnapshot, setAnalysisPlanSnapshot] =
    useState<ImageStudioAnalysisPlanSnapshot | null>(null);
  const [queuedAnalysisRunTarget, setQueuedAnalysisRunTarget] =
    useState<ImageStudioAnalysisApplyTarget | null>(null);

  const [autoScaleLayoutPadding, setAutoScaleLayoutPadding] = useState('8');
  const [autoScaleLayoutPaddingX, setAutoScaleLayoutPaddingX] = useState('8');
  const [autoScaleLayoutPaddingY, setAutoScaleLayoutPaddingY] = useState('8');
  const [autoScaleLayoutSplitAxes, setAutoScaleLayoutSplitAxes] = useState(false);
  const [autoScaleLayoutFillMissingCanvasWhite, setAutoScaleLayoutFillMissingCanvasWhite] =
    useState(false);
  const [autoScaleLayoutShadowPolicy, setAutoScaleLayoutShadowPolicy] =
    useState<ImageStudioCenterShadowPolicy>('auto');

  const [upscaleScale, setUpscaleScale] = useState('2');
  const [upscaleTargetWidth, setUpscaleTargetWidth] = useState('');
  const [upscaleTargetHeight, setUpscaleTargetHeight] = useState('');
  const [upscaleSmoothingQuality, setUpscaleSmoothingQuality] =
    useState<UpscaleSmoothingQuality>('high');

  const [upscaleBusy, setUpscaleBusy] = useState(false);
  const [upscaleStatus, setUpscaleStatus] = useState<UpscaleStatus>('idle');
  const [cropBusy, setCropBusy] = useState(false);
  const [cropStatus, setCropStatus] = useState<CropStatus>('idle');
  const [centerBusy, setCenterBusy] = useState(false);
  const [centerStatus, setCenterStatus] = useState<CenterStatus>('idle');
  const [autoScaleBusy, setAutoScaleBusy] = useState(false);
  const [autoScaleStatus, setAutoScaleStatus] = useState<AutoScaleStatus>('idle');
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');

  const value = useMemo(
    (): GenerationToolbarContextValue => ({
      maskAttachMode,
      setMaskAttachMode,
      upscaleMode,
      setUpscaleMode,
      upscaleStrategy,
      setUpscaleStrategy,
      cropMode,
      setCropMode,
      centerMode,
      setCenterMode,
      autoScaleMode,
      setAutoScaleMode,
      centerLayoutPadding,
      setCenterLayoutPadding,
      centerLayoutPaddingX,
      setCenterLayoutPaddingX,
      centerLayoutPaddingY,
      setCenterLayoutPaddingY,
      centerLayoutSplitAxes,
      setCenterLayoutSplitAxes,
      centerLayoutAdvancedEnabled,
      setCenterLayoutAdvancedEnabled,
      centerLayoutDetection,
      setCenterLayoutDetection,
      centerLayoutWhiteThreshold,
      setCenterLayoutWhiteThreshold,
      centerLayoutChromaThreshold,
      setCenterLayoutChromaThreshold,
      centerLayoutFillMissingCanvasWhite,
      setCenterLayoutFillMissingCanvasWhite,
      centerLayoutShadowPolicy,
      setCenterLayoutShadowPolicy,
      centerLayoutCustomPresets,
      setCenterLayoutCustomPresets,
      centerLayoutPresetDraftName,
      setCenterLayoutPresetDraftName,
      analysisPlanSnapshot,
      setAnalysisPlanSnapshot,
      queuedAnalysisRunTarget,
      setQueuedAnalysisRunTarget,
      autoScaleLayoutPadding,
      setAutoScaleLayoutPadding,
      autoScaleLayoutPaddingX,
      setAutoScaleLayoutPaddingX,
      autoScaleLayoutPaddingY,
      setAutoScaleLayoutPaddingY,
      autoScaleLayoutSplitAxes,
      setAutoScaleLayoutSplitAxes,
      autoScaleLayoutFillMissingCanvasWhite,
      setAutoScaleLayoutFillMissingCanvasWhite,
      autoScaleLayoutShadowPolicy,
      setAutoScaleLayoutShadowPolicy,
      upscaleScale,
      setUpscaleScale,
      upscaleTargetWidth,
      setUpscaleTargetWidth,
      upscaleTargetHeight,
      setUpscaleTargetHeight,
      upscaleSmoothingQuality,
      setUpscaleSmoothingQuality,
      upscaleBusy,
      setUpscaleBusy,
      upscaleStatus,
      setUpscaleStatus,
      cropBusy,
      setCropBusy,
      cropStatus,
      setCropStatus,
      centerBusy,
      setCenterBusy,
      centerStatus,
      setCenterStatus,
      autoScaleBusy,
      setAutoScaleBusy,
      autoScaleStatus,
      setAutoScaleStatus,
      analysisBusy,
      setAnalysisBusy,
      analysisStatus,
      setAnalysisStatus,
    }),
    [
      maskAttachMode,
      upscaleMode,
      upscaleStrategy,
      cropMode,
      centerMode,
      autoScaleMode,
      centerLayoutPadding,
      centerLayoutPaddingX,
      centerLayoutPaddingY,
      centerLayoutSplitAxes,
      centerLayoutAdvancedEnabled,
      centerLayoutDetection,
      centerLayoutWhiteThreshold,
      centerLayoutChromaThreshold,
      centerLayoutFillMissingCanvasWhite,
      centerLayoutShadowPolicy,
      centerLayoutCustomPresets,
      centerLayoutPresetDraftName,
      analysisPlanSnapshot,
      queuedAnalysisRunTarget,
      autoScaleLayoutPadding,
      autoScaleLayoutPaddingX,
      autoScaleLayoutPaddingY,
      autoScaleLayoutSplitAxes,
      autoScaleLayoutFillMissingCanvasWhite,
      autoScaleLayoutShadowPolicy,
      upscaleScale,
      upscaleTargetWidth,
      upscaleTargetHeight,
      upscaleSmoothingQuality,
      upscaleBusy,
      upscaleStatus,
      cropBusy,
      cropStatus,
      centerBusy,
      centerStatus,
      autoScaleBusy,
      autoScaleStatus,
      analysisBusy,
      analysisStatus,
    ]
  );

  return (
    <GenerationToolbarContext.Provider value={value}>{children}</GenerationToolbarContext.Provider>
  );
}

export function useGenerationToolbarContext(): GenerationToolbarContextValue {
  const context = useContext(GenerationToolbarContext);
  if (!context) {
    throw new Error('useGenerationToolbarContext must be used within a GenerationToolbarProvider');
  }
  return context;
}
