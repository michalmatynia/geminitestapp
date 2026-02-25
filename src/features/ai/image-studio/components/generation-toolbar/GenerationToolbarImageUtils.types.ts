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

export type CenterDetectionMode = 'auto' | 'alpha_bbox' | 'white_bg_first_colored_pixel';
export type CenterShadowPolicy = 'auto' | 'include_shadow' | 'exclude_shadow';

export type CenterLayoutConfig = {
  paddingPercent?: number;
  paddingXPercent?: number;
  paddingYPercent?: number;
  fillMissingCanvasWhite?: boolean;
  targetCanvasWidth?: number | null;
  targetCanvasHeight?: number | null;
  whiteThreshold?: number;
  chromaThreshold?: number;
  shadowPolicy?: CenterShadowPolicy;
  detection?: CenterDetectionMode;
};

export type CenterDetectionDetails = {
  shadowPolicyRequested: CenterShadowPolicy;
  shadowPolicyApplied: CenterShadowPolicy;
  componentCount: number;
  coreComponentCount: number;
  selectedComponentPixels: number;
  selectedComponentCoverage: number;
  foregroundPixels: number;
  corePixels: number;
  touchesBorder: boolean;
  maskSource: 'foreground' | 'core';
  policyVersion?: string;
  policyReason?: string;
  fallbackApplied?: boolean;
  candidateDetections?: {
    alpha_bbox: { confidence: number; area: number } | null;
    white_bg_first_colored_pixel: { confidence: number; area: number } | null;
  };
};

export type CenterLayoutResult = {
  dataUrl: string;
  sourceObjectBounds: { left: number; top: number; width: number; height: number };
  targetObjectBounds: { left: number; top: number; width: number; height: number };
  detectionUsed: Exclude<CenterDetectionMode, 'auto'>;
  scale: number;
  layout: {
    paddingPercent: number;
    paddingXPercent: number;
    paddingYPercent: number;
    fillMissingCanvasWhite: boolean;
    targetCanvasWidth: number | null;
    targetCanvasHeight: number | null;
    whiteThreshold: number;
    chromaThreshold: number;
    shadowPolicy: CenterShadowPolicy;
    detection: CenterDetectionMode;
  };
};

export type ClientImageObjectAnalysisResult = {
  width: number;
  height: number;
  sourceObjectBounds: { left: number; top: number; width: number; height: number };
  detectionUsed: Exclude<CenterDetectionMode, 'auto'>;
  confidence: number;
  detectionDetails: CenterDetectionDetails | null;
  policyVersion: string;
  policyReason: string;
  fallbackApplied: boolean;
  candidateDetections: {
    alpha_bbox: { confidence: number; area: number } | null;
    white_bg_first_colored_pixel: { confidence: number; area: number } | null;
  };
  whitespace: {
    px: { left: number; top: number; right: number; bottom: number };
    percent: { left: number; top: number; right: number; bottom: number };
  };
  objectAreaPercent: number;
  layout: CenterLayoutResult['layout'];
  suggestedPlan: {
    outputWidth: number;
    outputHeight: number;
    targetObjectBounds: { left: number; top: number; width: number; height: number };
    scale: number;
    whitespace: {
      px: { left: number; top: number; right: number; bottom: number };
      percent: { left: number; top: number; right: number; bottom: number };
    };
  };
};

export type AutoScaleCanvasResult = CenterLayoutResult & {
  outputWidth: number;
  outputHeight: number;
  confidenceBefore: number;
  detectionDetails: CenterDetectionDetails | null;
  whitespaceBefore: ClientImageObjectAnalysisResult['whitespace'];
  whitespaceAfter: ClientImageObjectAnalysisResult['whitespace'];
  objectAreaPercentBefore: number;
  objectAreaPercentAfter: number;
};

export type CenterMode = 'client_alpha_bbox' | 'server_alpha_bbox' | 'client_object_layout_v1' | 'server_object_layout_v1';
export type AutoScalerMode = 'client_auto_scaler_v1' | 'server_auto_scaler_v1';
