import {
  type ImageStudioDetectionCandidateSummary,
  type ImageStudioDetectionPolicyDecision,
} from '@/features/ai/image-studio/analysis/policy';
import {
  type ImageStudioCenterDetectionMode,
  type ImageStudioCenterLayoutConfig,
  type ImageStudioCenterObjectBounds,
  type ImageStudioCenterShadowPolicy,
  type PixelData,
  type WhiteBackgroundModel,
  type WhiteForegroundMaskSource,
  type ConnectedComponent,
  type ImageStudioWhitespaceMetrics as ImageStudioObjectWhitespaceMetrics,
  type ImageStudioAnalysisResult,
  type ImageStudioAutoScalePlan,
  type ImageStudioAutoScaleAnalysis,
  type ImageStudioDetectionDetails,
} from '@/shared/contracts/image-studio';

export type {
  ImageStudioDetectionCandidateSummary,
  ImageStudioDetectionPolicyDecision,
  ImageStudioCenterDetectionMode,
  ImageStudioCenterLayoutConfig,
  ImageStudioCenterObjectBounds,
  ImageStudioCenterShadowPolicy,
  PixelData,
  WhiteBackgroundModel,
  WhiteForegroundMaskSource,
  ConnectedComponent,
  ImageStudioObjectWhitespaceMetrics,
  ImageStudioAnalysisResult,
  ImageStudioAutoScalePlan,
  ImageStudioAutoScaleAnalysis,
  ImageStudioDetectionDetails,
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
