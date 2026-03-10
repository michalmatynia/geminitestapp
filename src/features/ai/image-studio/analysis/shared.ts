import {
  IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_CHROMA_THRESHOLD,
  IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_PADDING_PERCENT,
  IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_WHITE_THRESHOLD,
  IMAGE_STUDIO_CENTER_LAYOUT_MAX_CHROMA_THRESHOLD,
  IMAGE_STUDIO_CENTER_LAYOUT_MAX_PADDING_PERCENT,
  IMAGE_STUDIO_CENTER_LAYOUT_MAX_TARGET_CANVAS_SIDE_PX,
  IMAGE_STUDIO_CENTER_LAYOUT_MAX_WHITE_THRESHOLD,
  IMAGE_STUDIO_CENTER_LAYOUT_MIN_CHROMA_THRESHOLD,
  IMAGE_STUDIO_CENTER_LAYOUT_MIN_PADDING_PERCENT,
  IMAGE_STUDIO_CENTER_LAYOUT_MIN_TARGET_CANVAS_SIDE_PX,
  IMAGE_STUDIO_CENTER_LAYOUT_MIN_WHITE_THRESHOLD,
  type ImageStudioCenterLayoutConfig,
} from '@/shared/contracts/image-studio';

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

export const normalizeImageStudioAnalysisLayoutConfig = (
  config?: Partial<ImageStudioCenterLayoutConfig> | null
): NormalizedImageStudioAnalysisLayoutConfig => {
  const paddingPercent = Math.max(
    IMAGE_STUDIO_CENTER_LAYOUT_MIN_PADDING_PERCENT,
    Math.min(
      IMAGE_STUDIO_CENTER_LAYOUT_MAX_PADDING_PERCENT,
      config?.paddingPercent ?? IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_PADDING_PERCENT
    )
  );

  const result = {
    paddingPercent,
    paddingXPercent: config?.paddingXPercent ?? paddingPercent,
    paddingYPercent: config?.paddingYPercent ?? paddingPercent,
    fillMissingCanvasWhite: config?.fillMissingCanvasWhite ?? false,
    targetCanvasWidth:
      config?.targetCanvasWidth != null
        ? Math.max(
          IMAGE_STUDIO_CENTER_LAYOUT_MIN_TARGET_CANVAS_SIDE_PX,
          Math.min(IMAGE_STUDIO_CENTER_LAYOUT_MAX_TARGET_CANVAS_SIDE_PX, config.targetCanvasWidth)
        )
        : null,
    targetCanvasHeight:
      config?.targetCanvasHeight != null
        ? Math.max(
          IMAGE_STUDIO_CENTER_LAYOUT_MIN_TARGET_CANVAS_SIDE_PX,
          Math.min(
            IMAGE_STUDIO_CENTER_LAYOUT_MAX_TARGET_CANVAS_SIDE_PX,
            config.targetCanvasHeight
          )
        )
        : null,
    whiteThreshold: Math.max(
      IMAGE_STUDIO_CENTER_LAYOUT_MIN_WHITE_THRESHOLD,
      Math.min(
        IMAGE_STUDIO_CENTER_LAYOUT_MAX_WHITE_THRESHOLD,
        config?.whiteThreshold ?? IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_WHITE_THRESHOLD
      )
    ),
    chromaThreshold: Math.max(
      IMAGE_STUDIO_CENTER_LAYOUT_MIN_CHROMA_THRESHOLD,
      Math.min(
        IMAGE_STUDIO_CENTER_LAYOUT_MAX_CHROMA_THRESHOLD,
        config?.chromaThreshold ?? IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_CHROMA_THRESHOLD
      )
    ),
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
