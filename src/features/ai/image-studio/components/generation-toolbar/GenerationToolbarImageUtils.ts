import {
  analyzeAndPlanAutoScaleFromRgba,
  detectObjectBoundsForLayoutFromRgba,
} from '@/features/ai/image-studio/analysis/shared';
import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import { ApiError } from '@/shared/lib/api-client';


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
  targetCanvasWidth?: number;
  targetCanvasHeight?: number;
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

const CENTER_LAYOUT_DEFAULT_PADDING_PERCENT = 8;
const CENTER_LAYOUT_MIN_PADDING_PERCENT = 0;
const CENTER_LAYOUT_MAX_PADDING_PERCENT = 40;
const CENTER_LAYOUT_DEFAULT_WHITE_THRESHOLD = 16;
const CENTER_LAYOUT_MIN_WHITE_THRESHOLD = 1;
const CENTER_LAYOUT_MAX_WHITE_THRESHOLD = 80;
const CENTER_LAYOUT_DEFAULT_CHROMA_THRESHOLD = 10;
const CENTER_LAYOUT_MIN_CHROMA_THRESHOLD = 0;
const CENTER_LAYOUT_MAX_CHROMA_THRESHOLD = 80;
const CENTER_LAYOUT_MIN_TARGET_CANVAS_SIDE = 1;
const CENTER_LAYOUT_MAX_TARGET_CANVAS_SIDE = 32_768;

type ShapeBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const shapePointsAreUnitNormalized = (shape: {
  points: Array<{ x: number; y: number }>;
}): boolean =>
  shape.points.every((point) => (
    isFiniteNumber(point.x) &&
    isFiniteNumber(point.y) &&
    point.x >= 0 &&
    point.x <= 1 &&
    point.y >= 0 &&
    point.y <= 1
  ));

const normalizeImageContentFrame = (
  frame: ImageContentFrame | null | undefined
): ImageContentFrame | null => {
  if (!frame) return null;
  if (
    !isFiniteNumber(frame.x) ||
    !isFiniteNumber(frame.y) ||
    !isFiniteNumber(frame.width) ||
    !isFiniteNumber(frame.height)
  ) {
    return null;
  }
  if (!(frame.width > 0 && frame.height > 0)) return null;
  return {
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height,
  };
};

const mapCanvasUnitToImageUnit = (
  value: number,
  frameStart: number,
  frameSize: number
): number | null => {
  if (!isFiniteNumber(value) || !isFiniteNumber(frameStart) || !isFiniteNumber(frameSize)) return null;
  if (!(frameSize > 0)) return null;
  return clamp01((value - frameStart) / frameSize);
};

const toNormalizedUnit = (value: number, sourceSize: number): number | null => {
  if (!Number.isFinite(value)) return null;
  if (value >= 0 && value <= 1) return clamp01(value);
  if (!(sourceSize > 0)) return null;
  return clamp01(value / sourceSize);
};

const clampNumber = (
  value: number | null | undefined,
  min: number,
  max: number,
  fallback: number
): number => {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.max(min, Math.min(max, numeric));
};

const normalizeTargetCanvasSide = (value: number | null | undefined): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const normalized = Math.floor(value);
  if (
    normalized < CENTER_LAYOUT_MIN_TARGET_CANVAS_SIDE ||
    normalized > CENTER_LAYOUT_MAX_TARGET_CANVAS_SIDE
  ) {
    return null;
  }
  return normalized;
};

export const normalizeCenterLayoutConfig = (
  layout: CenterLayoutConfig | null | undefined
): Omit<Required<CenterLayoutConfig>, 'targetCanvasWidth' | 'targetCanvasHeight'> & {
  targetCanvasWidth: number | null;
  targetCanvasHeight: number | null;
} => {
  const detectionRaw = layout?.detection;
  const detection: CenterDetectionMode =
    detectionRaw === 'alpha_bbox' || detectionRaw === 'white_bg_first_colored_pixel'
      ? detectionRaw
      : 'auto';
  const shadowPolicyRaw = layout?.shadowPolicy;
  const shadowPolicy: CenterShadowPolicy =
    shadowPolicyRaw === 'include_shadow' || shadowPolicyRaw === 'exclude_shadow'
      ? shadowPolicyRaw
      : 'auto';
  const explicitPaddingPercent = clampNumber(
    layout?.paddingPercent,
    CENTER_LAYOUT_MIN_PADDING_PERCENT,
    CENTER_LAYOUT_MAX_PADDING_PERCENT,
    CENTER_LAYOUT_DEFAULT_PADDING_PERCENT
  );
  const paddingXPercent = clampNumber(
    layout?.paddingXPercent,
    CENTER_LAYOUT_MIN_PADDING_PERCENT,
    CENTER_LAYOUT_MAX_PADDING_PERCENT,
    explicitPaddingPercent
  );
  const paddingYPercent = clampNumber(
    layout?.paddingYPercent,
    CENTER_LAYOUT_MIN_PADDING_PERCENT,
    CENTER_LAYOUT_MAX_PADDING_PERCENT,
    explicitPaddingPercent
  );
  const resolvedPaddingPercent =
    typeof layout?.paddingPercent === 'number' && Number.isFinite(layout.paddingPercent)
      ? explicitPaddingPercent
      : (paddingXPercent + paddingYPercent) / 2;
  const fillMissingCanvasWhite = layout?.fillMissingCanvasWhite === true;
  const targetCanvasWidth = normalizeTargetCanvasSide(layout?.targetCanvasWidth);
  const targetCanvasHeight = normalizeTargetCanvasSide(layout?.targetCanvasHeight);

  return {
    paddingPercent: Number(resolvedPaddingPercent.toFixed(2)),
    paddingXPercent: Number(paddingXPercent.toFixed(2)),
    paddingYPercent: Number(paddingYPercent.toFixed(2)),
    fillMissingCanvasWhite,
    targetCanvasWidth,
    targetCanvasHeight,
    whiteThreshold: Math.floor(
      clampNumber(
        layout?.whiteThreshold,
        CENTER_LAYOUT_MIN_WHITE_THRESHOLD,
        CENTER_LAYOUT_MAX_WHITE_THRESHOLD,
        CENTER_LAYOUT_DEFAULT_WHITE_THRESHOLD
      )
    ),
    chromaThreshold: Math.floor(
      clampNumber(
        layout?.chromaThreshold,
        CENTER_LAYOUT_MIN_CHROMA_THRESHOLD,
        CENTER_LAYOUT_MAX_CHROMA_THRESHOLD,
        CENTER_LAYOUT_DEFAULT_CHROMA_THRESHOLD
      )
    ),
    shadowPolicy,
    detection,
  };
};

type NormalizedCenterLayoutConfig = ReturnType<typeof normalizeCenterLayoutConfig>;

export const normalizeShapeToPolygons = (
  shape: {
    type: string;
    points: Array<{ x: number; y: number }>;
    closed: boolean;
  },
  sourceWidth: number,
  sourceHeight: number,
  options?: {
    imageContentFrame?: ImageContentFrame | null;
  }
): Array<Array<{ x: number; y: number }>> => {
  const normalizedFrame = normalizeImageContentFrame(options?.imageContentFrame);
  const shouldMapCanvasToImage = Boolean(normalizedFrame && shapePointsAreUnitNormalized(shape));
  const mapX = (value: number): number | null => {
    const unitValue = toNormalizedUnit(value, sourceWidth);
    if (unitValue === null) return null;
    if (!shouldMapCanvasToImage || !normalizedFrame) return unitValue;
    return mapCanvasUnitToImageUnit(unitValue, normalizedFrame.x, normalizedFrame.width);
  };
  const mapY = (value: number): number | null => {
    const unitValue = toNormalizedUnit(value, sourceHeight);
    if (unitValue === null) return null;
    if (!shouldMapCanvasToImage || !normalizedFrame) return unitValue;
    return mapCanvasUnitToImageUnit(unitValue, normalizedFrame.y, normalizedFrame.height);
  };

  if (shape.type === 'polygon' || shape.type === 'lasso' || shape.type === 'brush') {
    if (!shape.closed || shape.points.length < 3) return [];
    const polygon = shape.points
      .map((point) => {
        const x = mapX(point.x);
        const y = mapY(point.y);
        if (x === null || y === null) return null;
        return { x, y };
      })
      .filter((point): point is { x: number; y: number } => point !== null);
    if (polygon.length < 3) return [];
    const minX = Math.min(...polygon.map((point) => point.x));
    const maxX = Math.max(...polygon.map((point) => point.x));
    const minY = Math.min(...polygon.map((point) => point.y));
    const maxY = Math.max(...polygon.map((point) => point.y));
    if (maxX <= minX || maxY <= minY) return [];
    return [polygon];
  }

  if (shape.type === 'rect') {
    if (shape.points.length < 2) return [];
    const xs = shape.points
      .map((point) => mapX(point.x))
      .filter((value): value is number => value !== null);
    const ys = shape.points
      .map((point) => mapY(point.y))
      .filter((value): value is number => value !== null);
    if (xs.length < 2 || ys.length < 2) return [];
    const minX = clamp01(Math.min(...xs));
    const maxX = clamp01(Math.max(...xs));
    const minY = clamp01(Math.min(...ys));
    const maxY = clamp01(Math.max(...ys));
    if (maxX <= minX || maxY <= minY) return [];
    return [[
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ]];
  }

  if (shape.type === 'ellipse') {
    if (shape.points.length < 2) return [];
    const xs = shape.points
      .map((point) => mapX(point.x))
      .filter((value): value is number => value !== null);
    const ys = shape.points
      .map((point) => mapY(point.y))
      .filter((value): value is number => value !== null);
    if (xs.length < 2 || ys.length < 2) return [];
    const minX = clamp01(Math.min(...xs));
    const maxX = clamp01(Math.max(...xs));
    const minY = clamp01(Math.min(...ys));
    const maxY = clamp01(Math.max(...ys));
    if (maxX <= minX || maxY <= minY) return [];

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rx = (maxX - minX) / 2;
    const ry = (maxY - minY) / 2;
    const steps = 24;
    const polygon = Array.from({ length: steps }, (_, index) => {
      const theta = (index / steps) * Math.PI * 2;
      return {
        x: clamp01(cx + rx * Math.cos(theta)),
        y: clamp01(cy + ry * Math.sin(theta)),
      };
    });
    return [polygon];
  }

  return [];
};

export const polygonsFromShapes = (
  shapes: MaskShapeForExport[],
  sourceWidth: number,
  sourceHeight: number,
  options?: {
    imageContentFrame?: ImageContentFrame | null;
  }
): Array<Array<{ x: number; y: number }>> =>
  shapes.flatMap((shape) => normalizeShapeToPolygons(shape, sourceWidth, sourceHeight, options));

export const shapeHasUsableCropGeometry = (shape: MaskShapeForExport): boolean => {
  if (!shape.visible) return false;
  if (shape.type === 'rect' || shape.type === 'ellipse') {
    if (shape.points.length < 2) return false;
    return shape.points
      .slice(0, 2)
      .every((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  }
  if (shape.type === 'polygon' || shape.type === 'lasso' || shape.type === 'brush') {
    if (!shape.closed || shape.points.length < 3) return false;
    return shape.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  }
  return false;
};

export const hasCanvasOverflowFromImageFrame = (
  frame: ImageContentFrame | null | undefined
): boolean => {
  const normalizedFrame = normalizeImageContentFrame(frame);
  if (!normalizedFrame) return false;
  const left = normalizedFrame.x;
  const top = normalizedFrame.y;
  const right = normalizedFrame.x + normalizedFrame.width;
  const bottom = normalizedFrame.y + normalizedFrame.height;
  return left < 0 || top < 0 || right > 1 || bottom > 1;
};

export const resolveCanvasOverflowCropRect = (params: {
  canvasWidth: number;
  canvasHeight: number;
  imageContentFrame: ImageContentFrame | null | undefined;
}): CropRect | null => {
  if (!hasCanvasOverflowFromImageFrame(params.imageContentFrame)) {
    return null;
  }
  if (
    !Number.isFinite(params.canvasWidth) ||
    !Number.isFinite(params.canvasHeight)
  ) {
    return null;
  }
  const canvasWidth = Math.floor(params.canvasWidth);
  const canvasHeight = Math.floor(params.canvasHeight);
  if (!(canvasWidth > 0 && canvasHeight > 0)) {
    return null;
  }
  return {
    x: 0,
    y: 0,
    width: canvasWidth,
    height: canvasHeight,
  };
};

const normalizeLocalImageSource = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? '';
  if (!normalized) return null;
  if (normalized.startsWith('data:') || normalized.startsWith('blob:')) {
    return normalized;
  }
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }
  const normalizedPath = normalized.replace(/\\/g, '/').replace(/^\/+/, '');
  return normalizedPath ? `/${normalizedPath}` : null;
};

export const resolveClientProcessingImageSrc = (
  slot: ImageStudioSlotRecord | null | undefined,
  fallbackSrc: string | null
): string | null => {
  const inlineBase64 = normalizeLocalImageSource(slot?.imageBase64 ?? null);
  if (inlineBase64) return inlineBase64;

  const localFilepath = normalizeLocalImageSource(slot?.imageFile?.filepath ?? null);
  if (localFilepath) return localFilepath;

  const legacyImageFile = slot?.imageFile as { url?: string } | undefined;
  const legacyLocalFilepath = normalizeLocalImageSource(legacyImageFile?.url ?? null);
  if (legacyLocalFilepath) return legacyLocalFilepath;

  const localUrl = normalizeLocalImageSource(slot?.imageUrl ?? null);
  if (localUrl) return localUrl;

  return fallbackSrc;
};

const resolveMaskColors = (
  variant: 'white' | 'black',
  inverted: boolean
): { background: '#000000' | '#ffffff'; fill: '#000000' | '#ffffff' } => {
  const preferWhite = variant === 'white';
  const background =
    (preferWhite && !inverted) || (!preferWhite && inverted)
      ? '#000000'
      : '#ffffff';
  const fill = background === '#000000' ? '#ffffff' : '#000000';
  return { background, fill };
};

export const loadImageElement = (
  src: string,
  options?: { crossOrigin?: 'anonymous' | 'use-credentials' }
): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    if (options?.crossOrigin) {
      img.crossOrigin = options.crossOrigin;
    }
    img.onload = (): void => resolve(img);
    img.onerror = (): void => reject(new Error('Failed to load working image for mask export.'));
    img.src = src;
  });

export const dataUrlToUploadBlob = async (dataUrl: string): Promise<Blob> => {
  const normalized = dataUrl.trim();
  if (!normalized.startsWith('data:')) {
    throw new Error('Invalid image data URL.');
  }

  const commaIndex = normalized.indexOf(',');
  if (commaIndex <= 5 || commaIndex === normalized.length - 1) {
    throw new Error('Invalid image data URL.');
  }

  const meta = normalized.slice(5, commaIndex);
  const payload = normalized.slice(commaIndex + 1);
  const mime = (meta.split(';')[0] ?? '').trim() || 'application/octet-stream';
  const isBase64 = /;base64/i.test(meta);

  try {
    if (isBase64) {
      const binary = atob(payload);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return new Blob([bytes], { type: mime });
    }

    return new Blob([decodeURIComponent(payload)], { type: mime });
  } catch {
    const blobResponse = await fetch(normalized);
    return blobResponse.blob();
  }
};

export const upscaleCanvasImage = async (
  src: string,
  request: UpscaleRequestStrategyPayload,
  smoothingQuality: UpscaleSmoothingQuality
): Promise<{
  dataUrl: string;
  outputWidth: number;
  outputHeight: number;
  sourceWidth: number;
  sourceHeight: number;
  scale: number;
}> => {
  const image = await loadImageElement(src, { crossOrigin: 'anonymous' });
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!(sourceWidth > 0 && sourceHeight > 0)) {
    throw new Error('Source image dimensions are invalid.');
  }

  const outputWidth = request.strategy === 'scale'
    ? Math.max(1, Math.round(sourceWidth * request.scale))
    : request.targetWidth;
  const outputHeight = request.strategy === 'scale'
    ? Math.max(1, Math.round(sourceHeight * request.scale))
    : request.targetHeight;
  if (
    request.strategy === 'target_resolution' &&
    (
      outputWidth < sourceWidth ||
      outputHeight < sourceHeight ||
      (outputWidth === sourceWidth && outputHeight === sourceHeight)
    )
  ) {
    throw new Error('Target resolution must upscale at least one side and not reduce source dimensions.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context2d = canvas.getContext('2d');
  if (!context2d) {
    throw new Error('Canvas context is unavailable.');
  }

  context2d.imageSmoothingEnabled = true;
  try {
    (context2d as CanvasRenderingContext2D & { imageSmoothingQuality?: UpscaleSmoothingQuality }).imageSmoothingQuality = smoothingQuality;
  } catch {
    // ignore browser incompatibility and continue with default smoothing
  }
  context2d.drawImage(image, 0, 0, canvas.width, canvas.height);

  try {
    return {
      dataUrl: canvas.toDataURL('image/png'),
      outputWidth,
      outputHeight,
      sourceWidth,
      sourceHeight,
      scale: Number(
        Math.max(outputWidth / sourceWidth, outputHeight / sourceHeight).toFixed(4)
      ),
    };
  } catch {
    throw new Error('Client upscale failed due to cross-origin restrictions. Use "Upscale Server: Sharp".');
  }
};

export const isClientUpscaleCrossOriginError = (error: unknown): boolean =>
  error instanceof Error && /cross-origin restrictions/i.test(error.message);

export const isUpscaleAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

export const isRetryableUpscaleError = (error: unknown): boolean => {
  if (isUpscaleAbortError(error)) return false;
  if (error instanceof ApiError) {
    return error.status === 408 || error.status === 425 || error.status === 429 || error.status >= 500;
  }
  return (
    error instanceof Error &&
    /timeout|network|failed to fetch|temporarily unavailable|retry/i.test(error.message.toLowerCase())
  );
};

export const buildUpscaleRequestId = (): string =>
  `upscale_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const withUpscaleRetry = async <T,>(
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
      if (attempt >= retries || !isRetryableUpscaleError(error) || signal.aborted) {
        throw error;
      }
      attempt += 1;
      await sleep(retryDelayMs * attempt);
    }
  }
};

export const mapImageCropRectToCanvasRect = (
  cropRect: CropRect,
  sourceWidth: number,
  sourceHeight: number,
  canvasContext: CropCanvasContext
): CropRect | null => {
  if (
    !Number.isFinite(cropRect.x) ||
    !Number.isFinite(cropRect.y) ||
    !Number.isFinite(cropRect.width) ||
    !Number.isFinite(cropRect.height) ||
    !(cropRect.width > 0 && cropRect.height > 0)
  ) {
    return null;
  }
  if (!(Number.isFinite(sourceWidth) && Number.isFinite(sourceHeight) && sourceWidth > 0 && sourceHeight > 0)) {
    return null;
  }

  const canvasWidth = Math.floor(canvasContext.canvasWidth);
  const canvasHeight = Math.floor(canvasContext.canvasHeight);
  if (!(canvasWidth > 0 && canvasHeight > 0)) return null;

  const frame = canvasContext.imageFrame;
  if (
    !Number.isFinite(frame.x) ||
    !Number.isFinite(frame.y) ||
    !Number.isFinite(frame.width) ||
    !Number.isFinite(frame.height) ||
    !(frame.width > 0 && frame.height > 0)
  ) {
    return null;
  }

  const frameLeft = Math.round(frame.x * canvasWidth);
  const frameTop = Math.round(frame.y * canvasHeight);
  const frameWidth = Math.max(1, Math.round(frame.width * canvasWidth));
  const frameHeight = Math.max(1, Math.round(frame.height * canvasHeight));

  const normalizedLeft = clamp01(cropRect.x / sourceWidth);
  const normalizedTop = clamp01(cropRect.y / sourceHeight);
  const normalizedRight = clamp01((cropRect.x + cropRect.width) / sourceWidth);
  const normalizedBottom = clamp01((cropRect.y + cropRect.height) / sourceHeight);
  if (!(normalizedRight > normalizedLeft && normalizedBottom > normalizedTop)) {
    return null;
  }

  const mappedLeft = frameLeft + Math.floor(normalizedLeft * frameWidth);
  const mappedTop = frameTop + Math.floor(normalizedTop * frameHeight);
  const mappedRight = frameLeft + Math.ceil(normalizedRight * frameWidth);
  const mappedBottom = frameTop + Math.ceil(normalizedBottom * frameHeight);

  const clampedLeft = Math.max(0, Math.min(mappedLeft, canvasWidth - 1));
  const clampedTop = Math.max(0, Math.min(mappedTop, canvasHeight - 1));
  const clampedRight = Math.max(clampedLeft + 1, Math.min(mappedRight, canvasWidth));
  const clampedBottom = Math.max(clampedTop + 1, Math.min(mappedBottom, canvasHeight));

  return {
    x: clampedLeft,
    y: clampedTop,
    width: Math.max(1, clampedRight - clampedLeft),
    height: Math.max(1, clampedBottom - clampedTop),
  };
};

export const cropCanvasImage = async (
  src: string,
  cropRect: CropRect,
  canvasContext?: CropCanvasContext | null
): Promise<string> => {
  const image = await loadImageElement(src, { crossOrigin: 'anonymous' });
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!(sourceWidth > 0 && sourceHeight > 0)) {
    throw new Error('Source image dimensions are invalid.');
  }

  const hasCanvasContext = Boolean(
    canvasContext &&
    Number.isFinite(canvasContext.canvasWidth) &&
    Number.isFinite(canvasContext.canvasHeight) &&
    canvasContext.canvasWidth > 0 &&
    canvasContext.canvasHeight > 0 &&
    Number.isFinite(canvasContext.imageFrame.x) &&
    Number.isFinite(canvasContext.imageFrame.y) &&
    Number.isFinite(canvasContext.imageFrame.width) &&
    Number.isFinite(canvasContext.imageFrame.height) &&
    canvasContext.imageFrame.width > 0 &&
    canvasContext.imageFrame.height > 0
  );
  const workingCanvasWidth = hasCanvasContext ? Math.floor(canvasContext!.canvasWidth) : sourceWidth;
  const workingCanvasHeight = hasCanvasContext ? Math.floor(canvasContext!.canvasHeight) : sourceHeight;

  const left = Math.max(0, Math.min(Math.floor(cropRect.x), workingCanvasWidth - 1));
  const top = Math.max(0, Math.min(Math.floor(cropRect.y), workingCanvasHeight - 1));
  const width = Math.max(1, Math.min(Math.floor(cropRect.width), workingCanvasWidth - left));
  const height = Math.max(1, Math.min(Math.floor(cropRect.height), workingCanvasHeight - top));

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = workingCanvasWidth;
  sourceCanvas.height = workingCanvasHeight;
  const sourceContext2d = sourceCanvas.getContext('2d');
  if (!sourceContext2d) {
    throw new Error('Canvas context is unavailable.');
  }
  sourceContext2d.clearRect(0, 0, workingCanvasWidth, workingCanvasHeight);
  if (hasCanvasContext) {
    const imageFrame = canvasContext!.imageFrame;
    const frameLeft = Math.round(imageFrame.x * workingCanvasWidth);
    const frameTop = Math.round(imageFrame.y * workingCanvasHeight);
    const frameWidth = Math.max(1, Math.round(imageFrame.width * workingCanvasWidth));
    const frameHeight = Math.max(1, Math.round(imageFrame.height * workingCanvasHeight));
    sourceContext2d.drawImage(image, frameLeft, frameTop, frameWidth, frameHeight);
  } else {
    sourceContext2d.drawImage(image, 0, 0, sourceWidth, sourceHeight);
  }

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;
  const context2d = outputCanvas.getContext('2d');
  if (!context2d) {
    throw new Error('Canvas context is unavailable.');
  }

  context2d.drawImage(
    sourceCanvas,
    left,
    top,
    width,
    height,
    0,
    0,
    width,
    height
  );

  try {
    return outputCanvas.toDataURL('image/png');
  } catch {
    throw new Error('Client crop failed due to cross-origin restrictions. Use "Crop Server: Sharp".');
  }
};

export const isClientCropCrossOriginError = (error: unknown): boolean =>
  error instanceof Error && /cross-origin restrictions/i.test(error.message);

export const isCropAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

export const isRetryableCropError = (error: unknown): boolean => {
  if (isCropAbortError(error)) return false;
  if (error instanceof ApiError) {
    return error.status === 408 || error.status === 425 || error.status === 429 || error.status >= 500;
  }
  return (
    error instanceof Error &&
    /timeout|network|failed to fetch|temporarily unavailable|retry/i.test(error.message.toLowerCase())
  );
};

export const buildCropRequestId = (): string =>
  `crop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const withCropRetry = async <T,>(
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
      if (attempt >= retries || !isRetryableCropError(error) || signal.aborted) {
        throw error;
      }
      attempt += 1;
      await sleep(retryDelayMs * attempt);
    }
  }
};

export const isClientCenterCrossOriginError = (error: unknown): boolean =>
  error instanceof Error && /cross-origin restrictions/i.test(error.message);

export const isCenterAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

export const isRetryableCenterError = (error: unknown): boolean => {
  if (isCenterAbortError(error)) return false;
  if (error instanceof ApiError) {
    return error.status === 408 || error.status === 425 || error.status === 429 || error.status >= 500;
  }
  return (
    error instanceof Error &&
    /timeout|network|failed to fetch|temporarily unavailable|retry/i.test(error.message.toLowerCase())
  );
};

export const buildCenterRequestId = (): string =>
  `center_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const withCenterRetry = async <T,>(
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
    return error.status === 408 || error.status === 425 || error.status === 429 || error.status >= 500;
  }
  return (
    error instanceof Error &&
    /timeout|network|failed to fetch|temporarily unavailable|retry/i.test(error.message.toLowerCase())
  );
};

export const buildAutoScalerRequestId = (): string =>
  `autoscale_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const withAutoScalerRetry = async <T,>(
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
      const alpha = data[((y * width) + x) * 4 + 3];
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

const resolveObjectBoundsForLayout = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  layout: NormalizedCenterLayoutConfig
): { bounds: { left: number; top: number; width: number; height: number }; detectionUsed: Exclude<CenterDetectionMode, 'auto'> } | null => {
  const detected = detectObjectBoundsForLayoutFromRgba(data, width, height, layout);
  if (!detected) return null;
  return {
    bounds: detected.bounds,
    detectionUsed: detected.detectionUsed,
  };
};

export const centerCanvasImageObject = async (src: string): Promise<string> => {
  const image = await loadImageElement(src, { crossOrigin: 'anonymous' });
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
    throw new Error('Client centering failed due to cross-origin restrictions. Use "Center Server: Sharp".');
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

  try {
    return outputCanvas.toDataURL('image/png');
  } catch {
    throw new Error('Client centering failed while exporting image. Use "Center Server: Sharp".');
  }
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
  const image = await loadImageElement(src, { crossOrigin: 'anonymous' });
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

export const layoutCanvasImageObject = async (
  src: string,
  layoutConfig?: CenterLayoutConfig | null
): Promise<CenterLayoutResult> => {
  const { sourceCanvas, sourceWidth, sourceHeight, imageData } = await loadSourceCanvasWithImageData(
    src,
    'Client layouting failed due to cross-origin restrictions. Use "Object Layout Server".'
  );

  const normalizedLayout = normalizeCenterLayoutConfig(layoutConfig);
  const objectBoundsResult = resolveObjectBoundsForLayout(
    imageData.data,
    sourceWidth,
    sourceHeight,
    normalizedLayout
  );
  if (!objectBoundsResult) {
    throw new Error('No visible object pixels were detected to layout.');
  }

  const bounds = objectBoundsResult.bounds;
  const planned = analyzeAndPlanAutoScaleFromRgba({
    pixelData: imageData.data,
    width: sourceWidth,
    height: sourceHeight,
    layout: normalizedLayout,
    preferTargetCanvas: false,
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

  let dataUrl: string;
  try {
    dataUrl = outputCanvas.toDataURL('image/png');
  } catch {
    throw new Error('Client layouting failed while exporting image. Use "Object Layout Server".');
  }

  return {
    dataUrl,
    sourceObjectBounds: bounds,
    targetObjectBounds: {
      left: targetLeft,
      top: targetTop,
      width: targetWidth,
      height: targetHeight,
    },
    detectionUsed: objectBoundsResult.detectionUsed,
    scale: planned.plan.scale,
    layout: normalizedLayout,
  };
};

export const analyzeCanvasImageObject = async (
  src: string,
  layoutConfig?: CenterLayoutConfig | null,
  options?: { preferTargetCanvas?: boolean }
): Promise<ClientImageObjectAnalysisResult> => {
  const { sourceWidth, sourceHeight, imageData } = await loadSourceCanvasWithImageData(
    src,
    'Client analysis failed due to cross-origin restrictions. Use "Analysis Server".'
  );
  const normalizedLayout = normalizeCenterLayoutConfig(layoutConfig);
  const planned = analyzeAndPlanAutoScaleFromRgba({
    pixelData: imageData.data,
    width: sourceWidth,
    height: sourceHeight,
    layout: normalizedLayout,
    preferTargetCanvas: options?.preferTargetCanvas !== false,
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
    detectionDetails: planned.analysis.detectionDetails,
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
  layoutConfig?: CenterLayoutConfig | null,
  options?: { preferTargetCanvas?: boolean }
): Promise<AutoScaleCanvasResult> => {
  const { sourceCanvas, sourceWidth, sourceHeight, imageData } = await loadSourceCanvasWithImageData(
    src,
    'Client auto scaling failed due to cross-origin restrictions. Use "Auto Scaler Server".'
  );
  const normalizedLayout = normalizeCenterLayoutConfig(layoutConfig);
  const planned = analyzeAndPlanAutoScaleFromRgba({
    pixelData: imageData.data,
    width: sourceWidth,
    height: sourceHeight,
    layout: normalizedLayout,
    preferTargetCanvas: options?.preferTargetCanvas !== false,
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

  let dataUrl: string;
  try {
    dataUrl = outputCanvas.toDataURL('image/png');
  } catch {
    throw new Error('Client auto scaling failed while exporting image. Use "Auto Scaler Server".');
  }

  const objectAreaAfter = Math.max(1, targetObjectBounds.width * targetObjectBounds.height);
  const canvasAreaAfter = Math.max(1, outputWidth * outputHeight);

  return {
    dataUrl,
    sourceObjectBounds,
    targetObjectBounds,
    detectionUsed: planned.analysis.detectionUsed,
    confidenceBefore: planned.analysis.confidence,
    detectionDetails: planned.analysis.detectionDetails,
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

const resolveBounds = (
  points: Array<{ x: number; y: number }>
): ShapeBounds | null => {
  if (points.length === 0) return null;
  const xs = points.map((point) => point.x).filter((value) => Number.isFinite(value));
  const ys = points.map((point) => point.y).filter((value) => Number.isFinite(value));
  if (xs.length === 0 || ys.length === 0) return null;
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
};

const boundsToCropRect = (
  bounds: ShapeBounds | null,
  sourceWidth: number,
  sourceHeight: number
): CropRect | null => {
  if (!bounds) return null;
  const minX = clamp01(bounds.minX);
  const maxX = clamp01(bounds.maxX);
  const minY = clamp01(bounds.minY);
  const maxY = clamp01(bounds.maxY);
  if (!(maxX > minX && maxY > minY)) return null;

  const left = Math.max(0, Math.min(Math.floor(minX * sourceWidth), sourceWidth - 1));
  const top = Math.max(0, Math.min(Math.floor(minY * sourceHeight), sourceHeight - 1));
  const width = Math.max(1, Math.min(Math.ceil((maxX - minX) * sourceWidth), sourceWidth - left));
  const height = Math.max(1, Math.min(Math.ceil((maxY - minY) * sourceHeight), sourceHeight - top));
  return {
    x: left,
    y: top,
    width,
    height,
  };
};

export const resolveCropRectFromShapesWithDiagnostics = (
  shapes: MaskShapeForExport[],
  canvasWidth: number,
  canvasHeight: number,
  sourceWidth: number,
  sourceHeight: number,
  activeMaskId?: string | null,
  imageContentFrame?: ImageContentFrame | null
): { cropRect: CropRect | null; diagnostics: CropRectResolutionDiagnostics | null } => {
  if (!(canvasWidth > 0 && canvasHeight > 0 && sourceWidth > 0 && sourceHeight > 0)) {
    return { cropRect: null, diagnostics: null };
  }
  const normalizedActiveMaskId = activeMaskId?.trim() ?? '';
  const orderedShapes = normalizedActiveMaskId
    ? [
      ...shapes.filter((shape) => shape.id === normalizedActiveMaskId),
      ...shapes.filter((shape) => shape.id !== normalizedActiveMaskId),
    ]
    : shapes;
  const normalizedFrame = normalizeImageContentFrame(imageContentFrame);

  let lastDiagnostics: CropRectResolutionDiagnostics | null = null;
  for (const shape of orderedShapes) {
    const rawPolygons = normalizeShapeToPolygons(shape, canvasWidth, canvasHeight);
    const mappedPolygons = normalizeShapeToPolygons(shape, sourceWidth, sourceHeight, {
      imageContentFrame: normalizedFrame,
    });

    const rawBounds = resolveBounds(rawPolygons.flatMap((polygon) => polygon));
    const mappedBounds = resolveBounds(mappedPolygons.flatMap((polygon) => polygon));
    const usedImageContentFrameMapping = Boolean(normalizedFrame && shapePointsAreUnitNormalized(shape));
    const diagnostics: CropRectResolutionDiagnostics = {
      rawCanvasBounds: boundsToCropRect(rawBounds, canvasWidth, canvasHeight),
      mappedImageBounds: boundsToCropRect(mappedBounds, sourceWidth, sourceHeight),
      imageContentFrame: normalizedFrame,
      usedImageContentFrameMapping,
    };

    lastDiagnostics = diagnostics;
    const cropRect = diagnostics.rawCanvasBounds;
    if (!cropRect) continue;
    return {
      cropRect,
      diagnostics,
    };
  }

  return {
    cropRect: null,
    diagnostics: lastDiagnostics,
  };
};

export const resolveCropRectFromShapes = (
  shapes: MaskShapeForExport[],
  canvasWidth: number,
  canvasHeight: number,
  sourceWidth: number,
  sourceHeight: number,
  activeMaskId?: string | null,
  imageContentFrame?: ImageContentFrame | null
): CropRect | null => {
  return resolveCropRectFromShapesWithDiagnostics(
    shapes,
    canvasWidth,
    canvasHeight,
    sourceWidth,
    sourceHeight,
    activeMaskId,
    imageContentFrame
  ).cropRect;
};

export const renderMaskDataUrlFromPolygons = (
  polygons: Array<Array<{ x: number; y: number }>>,
  width: number,
  height: number,
  variant: 'white' | 'black',
  inverted: boolean
): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context2d = canvas.getContext('2d');
  if (!context2d) {
    throw new Error('Canvas context is unavailable.');
  }
  const { background, fill } = resolveMaskColors(variant, inverted);
  context2d.clearRect(0, 0, width, height);
  context2d.fillStyle = background;
  context2d.fillRect(0, 0, width, height);
  context2d.fillStyle = fill;
  polygons.forEach((polygon) => {
    if (polygon.length < 3) return;
    context2d.beginPath();
    context2d.moveTo(polygon[0]!.x * width, polygon[0]!.y * height);
    for (let index = 1; index < polygon.length; index += 1) {
      const point = polygon[index]!;
      context2d.lineTo(point.x * width, point.y * height);
    }
    context2d.closePath();
    context2d.fill();
  });
  return canvas.toDataURL('image/png');
};
