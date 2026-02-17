import { ApiError } from '@/shared/lib/api-client';

import type { ImageStudioSlotRecord } from '../../types';

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

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const toNormalizedUnit = (value: number, sourceSize: number): number | null => {
  if (!Number.isFinite(value)) return null;
  if (value >= 0 && value <= 1) return clamp01(value);
  if (!(sourceSize > 0)) return null;
  return clamp01(value / sourceSize);
};

const toUnitPoint = (
  point: { x: number; y: number },
  sourceWidth: number,
  sourceHeight: number
): { x: number; y: number } | null => {
  const x = toNormalizedUnit(point.x, sourceWidth);
  const y = toNormalizedUnit(point.y, sourceHeight);
  if (x === null || y === null) return null;
  return { x, y };
};

export const normalizeShapeToPolygons = (
  shape: {
    type: string;
    points: Array<{ x: number; y: number }>;
    closed: boolean;
  },
  sourceWidth: number,
  sourceHeight: number
): Array<Array<{ x: number; y: number }>> => {
  if (shape.type === 'polygon' || shape.type === 'lasso' || shape.type === 'brush') {
    if (!shape.closed || shape.points.length < 3) return [];
    const polygon = shape.points
      .map((point) => toUnitPoint(point, sourceWidth, sourceHeight))
      .filter((point): point is { x: number; y: number } => point !== null);
    if (polygon.length < 3) return [];
    return [polygon];
  }

  if (shape.type === 'rect') {
    if (shape.points.length < 2) return [];
    const xs = shape.points
      .map((point) => toNormalizedUnit(point.x, sourceWidth))
      .filter((value): value is number => value !== null);
    const ys = shape.points
      .map((point) => toNormalizedUnit(point.y, sourceHeight))
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
      .map((point) => toNormalizedUnit(point.x, sourceWidth))
      .filter((value): value is number => value !== null);
    const ys = shape.points
      .map((point) => toNormalizedUnit(point.y, sourceHeight))
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
  sourceHeight: number
): Array<Array<{ x: number; y: number }>> =>
  shapes.flatMap((shape) => normalizeShapeToPolygons(shape, sourceWidth, sourceHeight));

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

export const cropCanvasImage = async (
  src: string,
  cropRect: CropRect
): Promise<string> => {
  const image = await loadImageElement(src, { crossOrigin: 'anonymous' });
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!(sourceWidth > 0 && sourceHeight > 0)) {
    throw new Error('Source image dimensions are invalid.');
  }

  const left = Math.max(0, Math.min(Math.floor(cropRect.x), sourceWidth - 1));
  const top = Math.max(0, Math.min(Math.floor(cropRect.y), sourceHeight - 1));
  const width = Math.max(1, Math.min(Math.floor(cropRect.width), sourceWidth - left));
  const height = Math.max(1, Math.min(Math.floor(cropRect.height), sourceHeight - top));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context2d = canvas.getContext('2d');
  if (!context2d) {
    throw new Error('Canvas context is unavailable.');
  }

  context2d.drawImage(
    image,
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
    return canvas.toDataURL('image/png');
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

export const resolveCropRectFromShapes = (
  shapes: MaskShapeForExport[],
  sourceWidth: number,
  sourceHeight: number,
  activeMaskId?: string | null
): CropRect | null => {
  if (!(sourceWidth > 0 && sourceHeight > 0)) return null;
  const normalizedActiveMaskId = activeMaskId?.trim() ?? '';
  const orderedShapes = normalizedActiveMaskId
    ? [
      ...shapes.filter((shape) => shape.id === normalizedActiveMaskId),
      ...shapes.filter((shape) => shape.id !== normalizedActiveMaskId),
    ]
    : shapes;

  for (const shape of orderedShapes) {
    const polygons = normalizeShapeToPolygons(shape, sourceWidth, sourceHeight);
    if (polygons.length === 0) continue;
    const points = polygons.flatMap((polygon) => polygon);
    if (points.length === 0) continue;
    const xs = points.map((point) => clamp01(point.x));
    const ys = points.map((point) => clamp01(point.y));
    if (xs.length === 0 || ys.length === 0) continue;
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

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
  }

  return null;
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
