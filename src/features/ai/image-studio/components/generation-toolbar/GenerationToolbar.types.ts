import { type QueryClient, type UseQueryResult } from '@tanstack/react-query';
import React from 'react';
import { type ImageStudioProjectRecord, type ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import { type VectorShape, type VectorToolMode } from '@/shared/contracts/vector';
import { type SettingsStoreValue } from '@/shared/providers/SettingsStoreProvider';
import { type ImageStudioSettings } from '../../utils/studio-settings';
import { type GenerationToolbarContextValue } from './GenerationToolbarContext';
import {
  type MaskShapeForExport,
  type CropRectResolutionDiagnostics,
  type CropRect,
} from './GenerationToolbarImageUtils';
import { type ImageStudioAnalysisSharedLayout } from '../../utils/analysis-bridge';
import { type PreviewCanvasImageFrameBinding } from '../../context/UiContext';

export interface GenerationToolbarState extends GenerationToolbarContextValue {
  maskPreviewEnabled: boolean;
  centerGuidesEnabled: boolean;
  setMaskPreviewEnabled: (enabled: boolean) => void;
  setCenterGuidesEnabled: (enabled: boolean) => void;
  setCanvasSelectionEnabled: (enabled: boolean) => void;
  getPreviewCanvasViewportCrop: () => { slotId: string; cropRect: CropRect } | null;
  getPreviewCanvasImageFrame: () => PreviewCanvasImageFrameBinding | null;
  projectId: string | null;
  projectsQuery: UseQueryResult<ImageStudioProjectRecord[]>;
  workingSlot: ImageStudioSlotRecord | null;
  setSelectedSlotId: (id: string | null) => void;
  setWorkingSlotId: (id: string | null) => void;
  settingsStore: SettingsStoreValue;
  maskShapes: VectorShape[];
  activeMaskId: string | null;
  maskInvert: boolean;
  maskGenLoading: boolean;
  maskGenMode: 'ai-polygon' | 'ai-bbox' | 'threshold' | 'edges';
  setTool: (tool: VectorToolMode) => void;
  setMaskShapes: React.Dispatch<React.SetStateAction<VectorShape[]>>;
  setActiveMaskId: (id: string | null) => void;
  setMaskInvert: (inverted: boolean) => void;
  setMaskGenMode: (mode: 'ai-polygon' | 'ai-bbox' | 'threshold' | 'edges') => void;
  handleAiMaskGeneration: (mode: 'ai-polygon' | 'ai-bbox' | 'threshold' | 'edges') => Promise<void>;
  studioSettings: ImageStudioSettings;
  setStudioSettings: React.Dispatch<React.SetStateAction<ImageStudioSettings>>;
  toast: (message: string, options?: { variant?: 'default' | 'success' | 'error' | 'info' | 'warning' }) => void;
  queryClient: QueryClient;
  upscaleRequestInFlightRef: React.MutableRefObject<boolean>;
  upscaleAbortControllerRef: React.MutableRefObject<AbortController | null>;
  cropRequestInFlightRef: React.MutableRefObject<boolean>;
  cropAbortControllerRef: React.MutableRefObject<AbortController | null>;
  centerRequestInFlightRef: React.MutableRefObject<boolean>;
  centerAbortControllerRef: React.MutableRefObject<AbortController | null>;
  autoScaleRequestInFlightRef: React.MutableRefObject<boolean>;
  autoScaleAbortControllerRef: React.MutableRefObject<AbortController | null>;
  skipCenterAdvancedDefaultsSaveRef: React.MutableRefObject<boolean>;
  selectedCenterCustomPresetIdRef: React.MutableRefObject<string | null>;
  lastConsumedAnalysisIntentRef: React.MutableRefObject<string | null>;
  cropDiagnosticsRef: React.MutableRefObject<CropRectResolutionDiagnostics | null>;
  maskShapesForExport: MaskShapeForExport[];
  eligibleMaskShapes: MaskShapeForExport[];
  exportMaskShapes: MaskShapeForExport[];
  exportMaskCount: number;
  hasShapeCropBoundary: boolean;
  workingSlotImageSrc: string | null;
  clientProcessingImageSrc: string | null;
  workingSourceSignature: string;
  activeProjectId: string;
  projectCanvasSize: { width: number; height: number } | null;
  applyAnalysisLayoutToCenter: (layout: ImageStudioAnalysisSharedLayout, mode: 'auto' | 'manual') => void;
  applyAnalysisLayoutToAutoScaler: (layout: ImageStudioAnalysisSharedLayout, mode: 'auto' | 'manual') => void;
}
