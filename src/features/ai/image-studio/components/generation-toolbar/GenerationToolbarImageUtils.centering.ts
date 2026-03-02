import {
  type AutoScaleCanvasResult,
  type CenterLayoutResult,
  type ClientImageObjectAnalysisResult,
} from './GenerationToolbarImageUtils.types';
import { type ImageStudioCenterLayoutConfig as CenterLayoutConfig } from '@/features/ai/image-studio/analysis/shared';
import {
  CENTER_LAYOUT_DEFAULT_CHROMA_THRESHOLD,
  CENTER_LAYOUT_DEFAULT_PADDING_PERCENT,
  CENTER_LAYOUT_DEFAULT_WHITE_THRESHOLD,
  CENTER_LAYOUT_MAX_CHROMA_THRESHOLD,
  CENTER_LAYOUT_MAX_PADDING_PERCENT,
  CENTER_LAYOUT_MAX_TARGET_CANVAS_SIDE,
  CENTER_LAYOUT_MAX_WHITE_THRESHOLD,
  CENTER_LAYOUT_MIN_CHROMA_THRESHOLD,
  CENTER_LAYOUT_MIN_PADDING_PERCENT,
  CENTER_LAYOUT_MIN_TARGET_CANVAS_SIDE,
  CENTER_LAYOUT_MIN_WHITE_THRESHOLD,
  loadImageElement,
  sleep,
} from './GenerationToolbarImageUtils.helpers';
import { ApiError } from '@/shared/lib/api-client';
import {
  analyzeAndPlanAutoScaleFromRgba,
  detectObjectBoundsForLayoutFromRgba,
  resolveWhiteBgSimpleBboxFromRgba,
  type NormalizedImageStudioAnalysisLayoutConfig,
} from '@/features/ai/image-studio/analysis/shared';

export const isClientCenterCrossOriginError = (error: unknown): boolean =>
  error instanceof Error && /cross-origin restrictions/i.test(error.message);

export const isCenterAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

export const isRetryableCenterError = (error: unknown): boolean => {
  if (isCenterAbortError(error)) return false;
  if (error instanceof ApiError) {
    return (
      error.status === 408 || error.status === 425 || error.status === 429 || error.status >= 500
    );
  }
  if (error instanceof Error) {
    return /timeout|network|failed to fetch|temporarily unavailable|retry/i.test(
      error.message.toLowerCase()
    );
  }
  return false;
};

export const buildCenterRequestId = (): string =>
  `center_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const withCenterRetry = async <T>(
  run: () => Promise<T>,
  signal: AbortSignal,
  retries = 1,
  retryDelayMs = 350
): Promise<T> => {
  let attempt = 0;
  while (true) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= retries || !isRetryableCenterError(error) || signal.aborted) {
        throw error;
      }
      attempt += 1;
      await sleep(retryDelayMs * attempt);
    }
  }
};

export const isClientAutoScalerCrossOriginError = (error: unknown): boolean =>
  error instanceof Error && /cross-origin restrictions/i.test(error.message);

export const isAutoScalerAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

export const shouldFallbackToServerAutoScaler = (error: unknown): boolean => {
  return isClientAutoScalerCrossOriginError(error);
};

export const isRetryableAutoScalerError = (error: unknown): boolean => {
  if (isAutoScalerAbortError(error)) return false;
  if (error instanceof ApiError) {
    return (
      error.status === 408 || error.status === 425 || error.status === 429 || error.status >= 500
    );
  }
  if (error instanceof Error) {
    return /timeout|network|failed to fetch|temporarily unavailable|retry/i.test(
      error.message.toLowerCase()
    );
  }
  return false;
};

export const buildAutoScalerRequestId = (): string =>
  `autoscale_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const withAutoScalerRetry = async <T>(
  run: () => Promise<T>,
  signal: AbortSignal,
  retries = 1,
  retryDelayMs = 350
): Promise<T> => {
  let attempt = 0;
  while (true) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= retries || !isRetryableAutoScalerError(error) || signal.aborted) {
        throw error;
      }
      attempt += 1;
      await sleep(retryDelayMs * attempt);
    }
  }
};

const resolveAlphaObjectBounds = (
  data: Uint8ClampedArray,
  width: number,
  height: number
): { left: number; top: number; width: number; height: number } | null => {
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (typeof alpha !== 'number' || alpha <= 8) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  return {
    left: minX,
    top: minY,
    width: Math.max(1, maxX - minX + 1),
    height: Math.max(1, maxY - minY + 1),
  };
};

export const centerCanvasImageObject = async (src: string): Promise<string> => {
  const image = await loadImageElement(src);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!(sourceWidth > 0 && sourceHeight > 0)) {
    throw new Error('Source image dimensions are invalid.');
  }

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = sourceWidth;
  sourceCanvas.height = sourceHeight;
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) {
    throw new Error('Canvas context is unavailable.');
  }
  sourceContext.drawImage(image, 0, 0, sourceWidth, sourceHeight);

  let imageData: ImageData;
  try {
    imageData = sourceContext.getImageData(0, 0, sourceWidth, sourceHeight);
  } catch {
    throw new Error(
      'Client centering failed due to cross-origin restrictions. Use "Center Server: Sharp".'
    );
  }
  const bounds = resolveAlphaObjectBounds(imageData.data, sourceWidth, sourceHeight);
  if (!bounds) {
    throw new Error('No visible object pixels were detected to center.');
  }

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = sourceWidth;
  outputCanvas.height = sourceHeight;
  const outputContext = outputCanvas.getContext('2d');
  if (!outputContext) {
    throw new Error('Canvas context is unavailable.');
  }

  const targetLeft = Math.round((sourceWidth - bounds.width) / 2);
  const targetTop = Math.round((sourceHeight - bounds.height) / 2);
  outputContext.clearRect(0, 0, sourceWidth, sourceHeight);
  outputContext.drawImage(
    sourceCanvas,
    bounds.left,
    bounds.top,
    bounds.width,
    bounds.height,
    targetLeft,
    targetTop,
    bounds.width,
    bounds.height
  );

  return outputCanvas.toDataURL('image/png');
};

/**
 * White-background simple bounding-box centering (client-side).
 * Scans all pixels once for non-white content, computes the bounding rectangle,
 * and repositions it to the centre of the original canvas dimensions.
 * No scaling — canvas size stays the same. White pixels fill the cleared area.
 */
export const centerCanvasImageObjectWhiteBg = async (
  src: string,
  whiteThreshold = CENTER_LAYOUT_DEFAULT_WHITE_THRESHOLD
): Promise<string> => {
  const image = await loadImageElement(src);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!(sourceWidth > 0 && sourceHeight > 0)) {
    throw new Error('Source image dimensions are invalid.');
  }

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = sourceWidth;
  sourceCanvas.height = sourceHeight;
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) {
    throw new Error('Canvas context is unavailable.');
  }
  sourceContext.drawImage(image, 0, 0, sourceWidth, sourceHeight);

  let imageData: ImageData;
  try {
    imageData = sourceContext.getImageData(0, 0, sourceWidth, sourceHeight);
  } catch {
    throw new Error(
      'Client centering failed due to cross-origin restrictions. Use "Center Server: Sharp".'
    );
  }

  const bounds = resolveWhiteBgSimpleBboxFromRgba(
    imageData.data,
    sourceWidth,
    sourceHeight,
    whiteThreshold
  );
  if (!bounds) {
    throw new Error('No visible object pixels were detected on the white background.');
  }

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = sourceWidth;
  outputCanvas.height = sourceHeight;
  const outputContext = outputCanvas.getContext('2d');
  if (!outputContext) {
    throw new Error('Canvas context is unavailable.');
  }

  const targetLeft = Math.round((sourceWidth - bounds.width) / 2);
  const targetTop = Math.round((sourceHeight - bounds.height) / 2);
  outputContext.fillStyle = '#ffffff';
  outputContext.fillRect(0, 0, sourceWidth, sourceHeight);
  outputContext.drawImage(
    sourceCanvas,
    bounds.left,
    bounds.top,
    bounds.width,
    bounds.height,
    targetLeft,
    targetTop,
    bounds.width,
    bounds.height
  );

  return outputCanvas.toDataURL('image/png');
};

const loadSourceCanvasWithImageData = async (
  src: string,
  crossOriginErrorMessage: string
): Promise<{
  sourceCanvas: HTMLCanvasElement;
  sourceWidth: number;
  sourceHeight: number;
  imageData: ImageData;
}> => {
  const image = await loadImageElement(src);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!(sourceWidth > 0 && sourceHeight > 0)) {
    throw new Error('Source image dimensions are invalid.');
  }

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = sourceWidth;
  sourceCanvas.height = sourceHeight;
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) {
    throw new Error('Canvas context is unavailable.');
  }
  sourceContext.drawImage(image, 0, 0, sourceWidth, sourceHeight);

  try {
    const imageData = sourceContext.getImageData(0, 0, sourceWidth, sourceHeight);
    return {
      sourceCanvas,
      sourceWidth,
      sourceHeight,
      imageData,
    };
  } catch {
    throw new Error(crossOriginErrorMessage);
  }
};

const clampNumber = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const normalizeTargetCanvasSide = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  const normalized = Math.trunc(value);
  if (!Number.isFinite(normalized)) return null;
  return clampNumber(
    normalized,
    CENTER_LAYOUT_MIN_TARGET_CANVAS_SIDE,
    CENTER_LAYOUT_MAX_TARGET_CANVAS_SIDE
  );
};

const normalizeShadowPolicy = (
  value: CenterLayoutConfig['shadowPolicy']
): 'auto' | 'include_shadow' | 'exclude_shadow' => {
  if (value === 'include_shadow' || value === 'exclude_shadow') return value;
  return 'auto';
};

const normalizeDetectionMode = (
  value: CenterLayoutConfig['detection']
): 'auto' | 'alpha_bbox' | 'white_bg_first_colored_pixel' => {
  if (value === 'alpha_bbox' || value === 'white_bg_first_colored_pixel') return value;
  return 'auto';
};

export const normalizeCenterLayoutConfig = (
  config?: CenterLayoutConfig | null
): CenterLayoutResult['layout'] => {
  const raw = config ?? {};
  return {
    paddingPercent: clampNumber(
      raw.paddingPercent ?? CENTER_LAYOUT_DEFAULT_PADDING_PERCENT,
      CENTER_LAYOUT_MIN_PADDING_PERCENT,
      CENTER_LAYOUT_MAX_PADDING_PERCENT
    ),
    paddingXPercent: clampNumber(
      raw.paddingXPercent ?? CENTER_LAYOUT_DEFAULT_PADDING_PERCENT,
      CENTER_LAYOUT_MIN_PADDING_PERCENT,
      CENTER_LAYOUT_MAX_PADDING_PERCENT
    ),
    paddingYPercent: clampNumber(
      raw.paddingYPercent ?? CENTER_LAYOUT_DEFAULT_PADDING_PERCENT,
      CENTER_LAYOUT_MIN_PADDING_PERCENT,
      CENTER_LAYOUT_MAX_PADDING_PERCENT
    ),
    fillMissingCanvasWhite: raw.fillMissingCanvasWhite ?? false,
    targetCanvasWidth: normalizeTargetCanvasSide(raw.targetCanvasWidth),
    targetCanvasHeight: normalizeTargetCanvasSide(raw.targetCanvasHeight),
    whiteThreshold: clampNumber(
      raw.whiteThreshold ?? CENTER_LAYOUT_DEFAULT_WHITE_THRESHOLD,
      CENTER_LAYOUT_MIN_WHITE_THRESHOLD,
      CENTER_LAYOUT_MAX_WHITE_THRESHOLD
    ),
    chromaThreshold: clampNumber(
      raw.chromaThreshold ?? CENTER_LAYOUT_DEFAULT_CHROMA_THRESHOLD,
      CENTER_LAYOUT_MIN_CHROMA_THRESHOLD,
      CENTER_LAYOUT_MAX_CHROMA_THRESHOLD
    ),
    shadowPolicy: normalizeShadowPolicy(raw.shadowPolicy),
    detection: normalizeDetectionMode(raw.detection),
  };
};

const normalizeLayoutForEngine = (
  config?: CenterLayoutConfig | null
): NormalizedImageStudioAnalysisLayoutConfig => {
  return normalizeCenterLayoutConfig(config);
};

export const layoutCanvasImageObject = async (
  src: string,
  layoutConfig?: CenterLayoutConfig | null
): Promise<CenterLayoutResult> => {
  const { sourceCanvas, sourceWidth, sourceHeight, imageData } =
    await loadSourceCanvasWithImageData(
      src,
      'Client layouting failed due to cross-origin restrictions. Use "Object Layout Server".'
    );

  const normalizedLayout = normalizeLayoutForEngine(layoutConfig);
  const objectBoundsResult = detectObjectBoundsForLayoutFromRgba(
    imageData.data,
    sourceWidth,
    sourceHeight,
    normalizedLayout
  );
  if (!objectBoundsResult) {
    throw new Error('No visible object pixels were detected to layout.');
  }

  const bounds = objectBoundsResult.bounds;
  const finalLayout = {
    ...normalizedLayout,
    targetCanvasWidth: normalizedLayout.targetCanvasWidth ?? undefined,
    targetCanvasHeight: normalizedLayout.targetCanvasHeight ?? undefined,
  };
  const planned = analyzeAndPlanAutoScaleFromRgba({
    pixelData: imageData.data,
    width: sourceWidth,
    height: sourceHeight,
    layout: finalLayout,
  });
  if (!planned) {
    throw new Error('No visible object pixels were detected to layout.');
  }
  const outputWidth = planned.plan.outputWidth;
  const outputHeight = planned.plan.outputHeight;
  const targetWidth = planned.plan.targetObjectBounds.width;
  const targetHeight = planned.plan.targetObjectBounds.height;
  const targetLeft = planned.plan.targetObjectBounds.left;
  const targetTop = planned.plan.targetObjectBounds.top;

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = outputWidth;
  outputCanvas.height = outputHeight;
  const outputContext = outputCanvas.getContext('2d');
  if (!outputContext) {
    throw new Error('Canvas context is unavailable.');
  }

  outputContext.fillStyle = '#ffffff';
  outputContext.fillRect(0, 0, outputWidth, outputHeight);
  outputContext.drawImage(
    sourceCanvas,
    bounds.left,
    bounds.top,
    bounds.width,
    bounds.height,
    targetLeft,
    targetTop,
    targetWidth,
    targetHeight
  );

  return {
    dataUrl: outputCanvas.toDataURL('image/png'),
    sourceObjectBounds: bounds,
    targetObjectBounds: {
      left: targetLeft,
      top: targetTop,
      width: targetWidth,
      height: targetHeight,
    },
    detectionUsed: objectBoundsResult.detectionUsed,
    scale: planned.plan.scale,
    layout: planned.analysis.layout,
  };
};

export const analyzeCanvasImageObject = async (
  src: string,
  layoutConfig?: CenterLayoutConfig | null
): Promise<ClientImageObjectAnalysisResult> => {
  const { sourceWidth, sourceHeight, imageData } = await loadSourceCanvasWithImageData(
    src,
    'Client analysis failed due to cross-origin restrictions. Use "Analysis Server".'
  );
  const normalizedLayout = normalizeLayoutForEngine(layoutConfig);
  const finalLayout = {
    ...normalizedLayout,
    targetCanvasWidth: normalizedLayout.targetCanvasWidth ?? undefined,
    targetCanvasHeight: normalizedLayout.targetCanvasHeight ?? undefined,
  };
  const planned = analyzeAndPlanAutoScaleFromRgba({
    pixelData: imageData.data,
    width: sourceWidth,
    height: sourceHeight,
    layout: finalLayout,
  });
  if (!planned) {
    throw new Error('No visible object pixels were detected to analyze.');
  }
  return {
    width: sourceWidth,
    height: sourceHeight,
    sourceObjectBounds: planned.analysis.sourceObjectBounds,
    detectionUsed: planned.analysis.detectionUsed,
    confidence: planned.analysis.confidence,
    detectionDetails: planned.analysis.detectionDetails ?? null,
    policyVersion: planned.analysis.policyVersion,
    policyReason: planned.analysis.policyReason,
    fallbackApplied: planned.analysis.fallbackApplied,
    candidateDetections: planned.analysis.candidateDetections,
    whitespace: planned.analysis.whitespace,
    objectAreaPercent: planned.analysis.objectAreaPercent,
    layout: planned.analysis.layout,
    suggestedPlan: planned.plan,
  };
};

export const autoScaleCanvasImageObject = async (
  src: string,
  layoutConfig?: CenterLayoutConfig | null
): Promise<AutoScaleCanvasResult> => {
  const { sourceCanvas, sourceWidth, sourceHeight, imageData } =
    await loadSourceCanvasWithImageData(
      src,
      'Client auto scaling failed due to cross-origin restrictions. Use "Auto Scaler Server".'
    );
  const normalizedLayout = normalizeLayoutForEngine(layoutConfig);
  const finalLayout = {
    ...normalizedLayout,
    targetCanvasWidth: normalizedLayout.targetCanvasWidth ?? undefined,
    targetCanvasHeight: normalizedLayout.targetCanvasHeight ?? undefined,
  };
  const planned = analyzeAndPlanAutoScaleFromRgba({
    pixelData: imageData.data,
    width: sourceWidth,
    height: sourceHeight,
    layout: finalLayout,
  });
  if (!planned) {
    throw new Error('No visible object pixels were detected to auto scale.');
  }

  const sourceObjectBounds = planned.analysis.sourceObjectBounds;
  const targetObjectBounds = planned.plan.targetObjectBounds;
  const outputWidth = planned.plan.outputWidth;
  const outputHeight = planned.plan.outputHeight;

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = outputWidth;
  outputCanvas.height = outputHeight;
  const outputContext = outputCanvas.getContext('2d');
  if (!outputContext) {
    throw new Error('Canvas context is unavailable.');
  }

  outputContext.fillStyle = '#ffffff';
  outputContext.fillRect(0, 0, outputWidth, outputHeight);
  outputContext.drawImage(
    sourceCanvas,
    sourceObjectBounds.left,
    sourceObjectBounds.top,
    sourceObjectBounds.width,
    sourceObjectBounds.height,
    targetObjectBounds.left,
    targetObjectBounds.top,
    targetObjectBounds.width,
    targetObjectBounds.height
  );

  const objectAreaAfter = Math.max(1, targetObjectBounds.width * targetObjectBounds.height);
  const canvasAreaAfter = Math.max(1, outputWidth * outputHeight);

  return {
    dataUrl: outputCanvas.toDataURL('image/png'),
    sourceObjectBounds,
    targetObjectBounds,
    detectionUsed: planned.analysis.detectionUsed,
    confidenceBefore: planned.analysis.confidence,
    detectionDetails: planned.analysis.detectionDetails ?? null,
    scale: planned.plan.scale,
    layout: planned.analysis.layout,
    outputWidth,
    outputHeight,
    whitespaceBefore: planned.analysis.whitespace,
    whitespaceAfter: planned.plan.whitespace,
    objectAreaPercentBefore: planned.analysis.objectAreaPercent,
    objectAreaPercentAfter: Number(((objectAreaAfter / canvasAreaAfter) * 100).toFixed(4)),
  };
};
