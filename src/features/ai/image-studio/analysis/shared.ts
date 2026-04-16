import { IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_CHROMA_THRESHOLD, IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_PADDING_PERCENT, IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_WHITE_THRESHOLD, IMAGE_STUDIO_CENTER_LAYOUT_MAX_CHROMA_THRESHOLD, IMAGE_STUDIO_CENTER_LAYOUT_MAX_PADDING_PERCENT, IMAGE_STUDIO_CENTER_LAYOUT_MAX_TARGET_CANVAS_SIDE_PX, IMAGE_STUDIO_CENTER_LAYOUT_MAX_WHITE_THRESHOLD, IMAGE_STUDIO_CENTER_LAYOUT_MIN_CHROMA_THRESHOLD, IMAGE_STUDIO_CENTER_LAYOUT_MIN_PADDING_PERCENT, IMAGE_STUDIO_CENTER_LAYOUT_MIN_TARGET_CANVAS_SIDE_PX, IMAGE_STUDIO_CENTER_LAYOUT_MIN_WHITE_THRESHOLD } from '@/shared/contracts/image-studio-transform-contracts';
import { type ImageStudioCenterLayoutConfig } from '@/shared/contracts/image-studio';

import {
  detectObjectBoundsForLayoutFromRgba,
  computeAutoScalePlanFromBounds,
} from './segments/autoscale-planning';
import {
  type PixelData,
  type NormalizedImageStudioAnalysisLayoutConfig,
  type ImageStudioAutoScaleAnalysis,
} from './segments/types';

export * from './segments/types';
export * from './segments/alpha-detection';
export * from './segments/white-bg-detection';
export * from './segments/autoscale-planning';

const clampNumber = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const normalizePaddingPercent = (
  config: Partial<ImageStudioCenterLayoutConfig> | null | undefined
): number =>
  clampNumber(
    config?.paddingPercent ?? IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_PADDING_PERCENT,
    IMAGE_STUDIO_CENTER_LAYOUT_MIN_PADDING_PERCENT,
    IMAGE_STUDIO_CENTER_LAYOUT_MAX_PADDING_PERCENT
  );

const normalizeTargetCanvasSide = (value: number | null | undefined): number | null =>
  value !== null && value !== undefined
    ? clampNumber(
      value,
      IMAGE_STUDIO_CENTER_LAYOUT_MIN_TARGET_CANVAS_SIDE_PX,
      IMAGE_STUDIO_CENTER_LAYOUT_MAX_TARGET_CANVAS_SIDE_PX
    )
    : null;

const normalizeWhiteThreshold = (
  config: Partial<ImageStudioCenterLayoutConfig> | null | undefined
): number =>
  clampNumber(
    config?.whiteThreshold ?? IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_WHITE_THRESHOLD,
    IMAGE_STUDIO_CENTER_LAYOUT_MIN_WHITE_THRESHOLD,
    IMAGE_STUDIO_CENTER_LAYOUT_MAX_WHITE_THRESHOLD
  );

const normalizeChromaThreshold = (
  config: Partial<ImageStudioCenterLayoutConfig> | null | undefined
): number =>
  clampNumber(
    config?.chromaThreshold ?? IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_CHROMA_THRESHOLD,
    IMAGE_STUDIO_CENTER_LAYOUT_MIN_CHROMA_THRESHOLD,
    IMAGE_STUDIO_CENTER_LAYOUT_MAX_CHROMA_THRESHOLD
  );

export const normalizeImageStudioAnalysisLayoutConfig = (
  config?: Partial<ImageStudioCenterLayoutConfig> | null
): NormalizedImageStudioAnalysisLayoutConfig => {
  const paddingPercent = normalizePaddingPercent(config);

  const result = {
    paddingPercent,
    paddingXPercent: config?.paddingXPercent ?? paddingPercent,
    paddingYPercent: config?.paddingYPercent ?? paddingPercent,
    fillMissingCanvasWhite: config?.fillMissingCanvasWhite ?? false,
    targetCanvasWidth: normalizeTargetCanvasSide(config?.targetCanvasWidth),
    targetCanvasHeight: normalizeTargetCanvasSide(config?.targetCanvasHeight),
    whiteThreshold: normalizeWhiteThreshold(config),
    chromaThreshold: normalizeChromaThreshold(config),
    shadowPolicy: config?.shadowPolicy ?? 'auto',
    detection: config?.detection ?? 'auto',
  };
  return result;
};

export const analyzeImageObjectFromRgba = (params: {
  pixelData: PixelData;
  width: number;
  height: number;
  layout?: Partial<ImageStudioCenterLayoutConfig> | null;
}): ImageStudioAutoScaleAnalysis | null => {
  const { pixelData, width, height, layout } = params;
  const normalizedLayout = normalizeImageStudioAnalysisLayoutConfig(layout);

  const analysis = detectObjectBoundsForLayoutFromRgba(pixelData, width, height, normalizedLayout);
  if (!analysis) return null;

  const plan = computeAutoScalePlanFromBounds({
    sourceWidth: width,
    sourceHeight: height,
    objectBounds: analysis.bounds,
    layout: normalizedLayout,
    sourceWhitespace: analysis.whitespace,
    sourceObjectAreaPercent: analysis.objectAreaPercent,
  });

  return { analysis, plan };
};

export const analyzeAndPlanAutoScaleFromRgba = analyzeImageObjectFromRgba;
