import {
  type ImageStudioDetectionCandidateSummary,
  type ImageStudioDetectionPolicyDecision,
} from '@/features/ai/image-studio/analysis/policy';
import {
  type ImageStudioCenterDetectionMode,
  type ImageStudioCenterLayoutConfig,
  type ImageStudioCenterObjectBounds,
  type ImageStudioCenterShadowPolicy,
} from '@/shared/contracts/image-studio';

export type {
  ImageStudioDetectionCandidateSummary,
  ImageStudioDetectionPolicyDecision,
  ImageStudioCenterDetectionMode,
  ImageStudioCenterLayoutConfig,
  ImageStudioCenterObjectBounds,
  ImageStudioCenterShadowPolicy,
};

export type PixelData = ArrayLike<number>;

export type WhiteBackgroundModel = {
  r: number;
  g: number;
  b: number;
  chroma: number;
  whiteThreshold: number;
  chromaThreshold: number;
  chromaDeltaThreshold: number;
};

export type WhiteForegroundMaskSource = 'foreground' | 'core';

export type ConnectedComponent = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  pixelCount: number;
  touchesBorder: boolean;
  centroidX: number;
  centroidY: number;
};

export type NormalizedImageStudioAnalysisLayoutConfig = {
  paddingPercent: number;
  paddingXPercent: number;
  paddingYPercent: number;
  fillMissingCanvasWhite: boolean;
  targetCanvasWidth: number | null;
  targetCanvasHeight: number | null;
  whiteThreshold: number;
  chromaThreshold: number;
  shadowPolicy: ImageStudioCenterShadowPolicy;
  detection: ImageStudioCenterDetectionMode;
};

export type ImageStudioDetectionDetails = {
  shadowPolicyRequested: ImageStudioCenterShadowPolicy;
  shadowPolicyApplied: ImageStudioCenterShadowPolicy;
  componentCount: number;
  coreComponentCount: number;
  selectedComponentPixels: number;
  selectedComponentCoverage: number;
  foregroundPixels: number;
  corePixels: number;
  touchesBorder: boolean;
  maskSource: WhiteForegroundMaskSource;
  policyVersion?: string;
  policyReason?: string;
  fallbackApplied?: boolean;
  candidateDetections?: ImageStudioDetectionCandidateSummary;
};

export type ImageStudioObjectWhitespaceMetrics = {
  px: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  percent: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
};

export type ImageStudioAnalysisResult = {
  sourceObjectBounds: ImageStudioCenterObjectBounds;
  bounds: ImageStudioCenterObjectBounds;
  detectionUsed: Exclude<ImageStudioCenterDetectionMode, 'auto'>;
  confidence: number;
  detectionDetails: ImageStudioDetectionDetails | null;
  details: ImageStudioDetectionDetails | null;
  policyVersion: string;
  policyReason: string;
  fallbackApplied: boolean;
  candidateDetections: ImageStudioDetectionCandidateSummary;
  whitespace: ImageStudioObjectWhitespaceMetrics;
  objectAreaPercent: number;
  layout: NormalizedImageStudioAnalysisLayoutConfig;
};

export type ImageStudioAutoScalePlan = {
  targetWidth: number;
  targetHeight: number;
  outputWidth: number;
  outputHeight: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  paddingX: number;
  paddingY: number;
  sourceObjectBounds: ImageStudioCenterObjectBounds;
  targetObjectBounds: ImageStudioCenterObjectBounds;
  whitespaceBefore: ImageStudioObjectWhitespaceMetrics;
  whitespaceAfter: ImageStudioObjectWhitespaceMetrics;
  whitespace: ImageStudioObjectWhitespaceMetrics;
  objectAreaPercentBefore: number;
  objectAreaPercentAfter: number;
};

export type ImageStudioAutoScaleAnalysis = {
  analysis: ImageStudioAnalysisResult;
  plan: ImageStudioAutoScalePlan;
};
