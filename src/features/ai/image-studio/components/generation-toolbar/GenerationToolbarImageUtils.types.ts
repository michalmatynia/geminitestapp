import type { 
  ImageStudioCenterLayoutConfig, 
  ImageStudioCenterShadowPolicy, 
  ImageStudioCenterDetectionMode,
  NormalizedImageStudioAnalysisLayoutConfig,
  ImageStudioDetectionDetails,
  ImageStudioDetectionCandidateSummary,
  ImageStudioObjectWhitespaceMetrics,
  ImageStudioCenterObjectBounds,
  ImageStudioAutoScalePlan
} from '@/features/ai/image-studio/analysis/shared';

export type UpscaleSmoothingQuality = 'low' | 'medium' | 'high';

export type UpscaleRequestStrategyPayload =
  | {
    strategy: 'scale';
    scale: number;
  }
  | {
    strategy: 'target_resolution';
    targetWidth: number;
    targetHeight: number;
  };

export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MaskShapeForExport = {
  id: string;
  type: string;
  points: Array<{ x: number; y: number }>;
  closed: boolean;
  visible: boolean;
};

export type ImageContentFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CropCanvasContext = {
  canvasWidth: number;
  canvasHeight: number;
  imageFrame: ImageContentFrame;
  imageContentFrame?: ImageContentFrame;
};

export type CropRectResolutionDiagnostics = {
  rawCanvasBounds: CropRect | null;
  mappedImageBounds: CropRect | null;
  imageContentFrame: ImageContentFrame | null;
  usedImageContentFrameMapping: boolean;
};

export type CenterDetectionMode = ImageStudioCenterDetectionMode;
export type CenterShadowPolicy = ImageStudioCenterShadowPolicy;

export type CenterLayoutConfig = ImageStudioCenterLayoutConfig;

export type CenterDetectionDetails = ImageStudioDetectionDetails;

export type CenterLayoutResult = {
  dataUrl: string;
  sourceObjectBounds: ImageStudioCenterObjectBounds;
  targetObjectBounds: ImageStudioCenterObjectBounds;
  detectionUsed: Exclude<CenterDetectionMode, 'auto'>;
  scale: number;
  layout: NormalizedImageStudioAnalysisLayoutConfig;
};

export type ClientImageObjectAnalysisResult = {
  width: number;
  height: number;
  sourceObjectBounds: ImageStudioCenterObjectBounds;
  detectionUsed: Exclude<CenterDetectionMode, 'auto'>;
  confidence: number;
  detectionDetails: CenterDetectionDetails | null;
  policyVersion: string;
  policyReason: string;
  fallbackApplied: boolean;
  candidateDetections: ImageStudioDetectionCandidateSummary;
  whitespace: ImageStudioObjectWhitespaceMetrics;
  objectAreaPercent: number;
  layout: NormalizedImageStudioAnalysisLayoutConfig;
  suggestedPlan: ImageStudioAutoScalePlan;
};

export type AutoScaleCanvasResult = CenterLayoutResult & {
  outputWidth: number;
  outputHeight: number;
  confidenceBefore: number;
  detectionDetails: CenterDetectionDetails | null;
  whitespaceBefore: ImageStudioObjectWhitespaceMetrics;
  whitespaceAfter: ImageStudioObjectWhitespaceMetrics;
  objectAreaPercentBefore: number;
  objectAreaPercentAfter: number;
};

export type CenterMode = 'client_alpha_bbox' | 'server_alpha_bbox' | 'client_object_layout_v1' | 'server_object_layout_v1';
export type AutoScalerMode = 'client_auto_scaler_v1' | 'server_auto_scaler_v1';
