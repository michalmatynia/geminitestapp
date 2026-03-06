import { type ImageStudioCenterObjectBounds } from '@/shared/contracts/image-studio';
import {
  type PixelData,
  type NormalizedImageStudioAnalysisLayoutConfig,
  type ImageStudioObjectWhitespaceMetrics,
  type ImageStudioAnalysisResult,
  type ImageStudioAutoScalePlan,
} from './types';
import { resolveAlphaObjectBoundsFromRgba } from './alpha-detection';
import {
  resolveWhiteForegroundObjectDetectionFromRgba,
  resolveWhiteBgSimpleBboxFromRgba,
} from './white-bg-detection';
import { decideObjectDetectionCandidate } from '@/features/ai/image-studio/analysis/policy';

export const computeObjectWhitespaceMetrics = (
  bounds: ImageStudioCenterObjectBounds,
  canvasWidth: number,
  canvasHeight: number
): ImageStudioObjectWhitespaceMetrics => {
  const leftPx = bounds.left;
  const topPx = bounds.top;
  const rightPx = Math.max(0, canvasWidth - (bounds.left + bounds.width));
  const bottomPx = Math.max(0, canvasHeight - (bounds.top + bounds.height));

  return {
    px: { left: leftPx, top: topPx, right: rightPx, bottom: bottomPx },
    percent: {
      left: leftPx / canvasWidth,
      top: topPx / canvasHeight,
      right: rightPx / canvasWidth,
      bottom: bottomPx / canvasHeight,
    },
  };
};

export const detectObjectBoundsForLayoutFromRgba = (
  pixelData: PixelData,
  width: number,
  height: number,
  layout: NormalizedImageStudioAnalysisLayoutConfig
): ImageStudioAnalysisResult | null => {
  const alphaBounds = resolveAlphaObjectBoundsFromRgba(pixelData, width, height);
  const whiteSimpleBounds = resolveWhiteBgSimpleBboxFromRgba(
    pixelData,
    width,
    height,
    layout.whiteThreshold
  );
  const whiteForeground = resolveWhiteForegroundObjectDetectionFromRgba(
    pixelData,
    width,
    height,
    layout.whiteThreshold,
    layout.chromaThreshold,
    layout.shadowPolicy
  );

  const decision = decideObjectDetectionCandidate({
    alphaCandidate: alphaBounds
      ? {
          bounds: alphaBounds,
          confidence: 1,
          detectionUsed: 'alpha_bbox',
          detectionDetails: { touchesBorder: false },
          details: { touchesBorder: false },
        }
      : null,
    whiteCandidate: whiteForeground
      ? {
          bounds: whiteForeground.bounds,
          confidence: whiteForeground.confidence,
          detectionUsed: 'white_bg_first_colored_pixel',
          detectionDetails: { touchesBorder: whiteForeground.details.touchesBorder },
          details: { touchesBorder: whiteForeground.details.touchesBorder },
        }
      : whiteSimpleBounds
        ? {
            bounds: whiteSimpleBounds,
            confidence: 0.8,
            detectionUsed: 'white_bg_first_colored_pixel',
            detectionDetails: { touchesBorder: false },
            details: { touchesBorder: false },
          }
        : null,
    requestedDetection: layout.detection,
  });

  const selected = decision.selected;
  if (!selected) return null;

  const details = {
    ...(whiteForeground?.details ?? {
      shadowPolicyRequested: layout.shadowPolicy,
      shadowPolicyApplied: layout.shadowPolicy,
      componentCount: 0,
      coreComponentCount: 0,
      selectedComponentPixels: 0,
      selectedComponentCoverage: 0,
      foregroundPixels: 0,
      corePixels: 0,
      touchesBorder: false,
      maskSource: 'foreground',
    }),
    policyVersion: decision.policyVersion,
    policyReason: decision.reason,
    fallbackApplied: decision.fallbackApplied,
    candidateDetections: decision.candidateDetections,
  };

  return {
    sourceObjectBounds: selected.bounds,
    bounds: selected.bounds,
    confidence: selected.confidence,
    detectionDetails: details,
    details,
    policyVersion: decision.policyVersion,
    policyReason: decision.reason,
    fallbackApplied: decision.fallbackApplied,
    candidateDetections: decision.candidateDetections,
    detectionUsed: decision.selected?.detectionUsed ?? 'white_bg_first_colored_pixel',
    whitespace: computeObjectWhitespaceMetrics(selected.bounds, width, height),
    objectAreaPercent: (selected.bounds.width * selected.bounds.height) / (width * height),
    layout,
  };
};

export const computeAutoScalePlanFromBounds = (params: {
  sourceWidth: number;
  sourceHeight: number;
  objectBounds: ImageStudioCenterObjectBounds;
  layout: NormalizedImageStudioAnalysisLayoutConfig;
  sourceWhitespace: ImageStudioObjectWhitespaceMetrics;
  sourceObjectAreaPercent: number;
}): ImageStudioAutoScalePlan => {
  const {
    sourceWidth,
    sourceHeight,
    objectBounds,
    layout,
    sourceWhitespace,
    sourceObjectAreaPercent,
  } = params;

  const targetWidth = layout.targetCanvasWidth ?? sourceWidth;
  const targetHeight = layout.targetCanvasHeight ?? sourceHeight;

  const paddingX = (layout.paddingXPercent / 100) * targetWidth;
  const paddingY = (layout.paddingYPercent / 100) * targetHeight;

  const availableWidth = Math.max(1, targetWidth - paddingX * 2);
  const availableHeight = Math.max(1, targetHeight - paddingY * 2);

  const scaleX = availableWidth / objectBounds.width;
  const scaleY = availableHeight / objectBounds.height;
  const scale = Math.min(scaleX, scaleY);

  const targetObjWidth = objectBounds.width * scale;
  const targetObjHeight = objectBounds.height * scale;

  const targetObjLeft = (targetWidth - targetObjWidth) / 2;
  const targetObjTop = (targetHeight - targetObjHeight) / 2;

  const targetObjectBounds: ImageStudioCenterObjectBounds = {
    left: targetObjLeft,
    top: targetObjTop,
    width: targetObjWidth,
    height: targetObjHeight,
  };

  const whitespaceAfter = computeObjectWhitespaceMetrics(
    targetObjectBounds,
    targetWidth,
    targetHeight
  );

  return {
    targetWidth,
    targetHeight,
    outputWidth: targetWidth,
    outputHeight: targetHeight,
    scale,
    offsetX: targetObjLeft - objectBounds.left * scale,
    offsetY: targetObjTop - objectBounds.top * scale,
    paddingX,
    paddingY,
    sourceObjectBounds: objectBounds,
    targetObjectBounds,
    whitespaceBefore: sourceWhitespace,
    whitespaceAfter,
    whitespace: whitespaceAfter,
    objectAreaPercentBefore: sourceObjectAreaPercent,
    objectAreaPercentAfter: (targetObjWidth * targetObjHeight) / (targetWidth * targetHeight),
  };
};
