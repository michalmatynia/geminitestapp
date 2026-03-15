import { ApiError } from '@/shared/lib/api-client';

import { mapCanvasRectToImageRect } from './GenerationToolbarImageUtils.geometry';
import { loadImageElement, sleep } from './GenerationToolbarImageUtils.helpers';
import { type CropCanvasContext, type CropRect } from './GenerationToolbarImageUtils.types';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export const isClientCropCrossOriginError = (error: unknown): boolean =>
  error instanceof Error && /cross-origin restrictions/i.test(error.message);

export const isCropAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

export const isRetryableCropError = (error: unknown): boolean => {
  if (isCropAbortError(error)) return false;
  if (error instanceof ApiError) {
    return (
      error.status === 408 || error.status === 425 || error.status === 429 || error.status >= 500
    );
  }
  return (
    error instanceof Error &&
    /timeout|network|failed to fetch|temporarily unavailable|retry/i.test(
      error.message.toLowerCase()
    )
  );
};

export const buildCropRequestId = (): string =>
  `crop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const withCropRetry = async <T>(
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
      logClientError(error);
      if (attempt >= retries || !isRetryableCropError(error) || signal.aborted) {
        throw error;
      }
      attempt += 1;
      await sleep(retryDelayMs * attempt);
    }
  }
};

const clampCropRectToImage = (
  cropRect: CropRect,
  sourceWidth: number,
  sourceHeight: number
): CropRect | null => {
  if (
    !Number.isFinite(cropRect.x) ||
    !Number.isFinite(cropRect.y) ||
    !Number.isFinite(cropRect.width) ||
    !Number.isFinite(cropRect.height)
  ) {
    return null;
  }

  const left = Math.floor(cropRect.x);
  const top = Math.floor(cropRect.y);
  const right = Math.ceil(cropRect.x + cropRect.width);
  const bottom = Math.ceil(cropRect.y + cropRect.height);
  if (!(right > left && bottom > top)) return null;

  const clampedLeft = Math.max(0, left);
  const clampedTop = Math.max(0, top);
  const clampedRight = Math.min(sourceWidth, right);
  const clampedBottom = Math.min(sourceHeight, bottom);
  if (!(clampedRight > clampedLeft && clampedBottom > clampedTop)) return null;

  return {
    x: clampedLeft,
    y: clampedTop,
    width: clampedRight - clampedLeft,
    height: clampedBottom - clampedTop,
  };
};

export const cropCanvasImage = async (
  src: string,
  cropRect: CropRect,
  cropCanvasContext?: CropCanvasContext | null
): Promise<string> => {
  const image = await loadImageElement(src);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!(sourceWidth > 0 && sourceHeight > 0)) {
    throw new Error('Source image dimensions are invalid.');
  }

  const resolvedCropRect = cropCanvasContext
    ? mapCanvasRectToImageRect(cropRect, sourceWidth, sourceHeight, cropCanvasContext)
    : cropRect;
  if (!resolvedCropRect) {
    throw new Error('Crop rectangle cannot be mapped to source image coordinates.');
  }
  const normalizedCropRect = clampCropRectToImage(resolvedCropRect, sourceWidth, sourceHeight);
  if (!normalizedCropRect) {
    throw new Error('Crop rectangle is outside source image bounds.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = normalizedCropRect.width;
  canvas.height = normalizedCropRect.height;
  const context2d = canvas.getContext('2d');
  if (!context2d) {
    throw new Error('Canvas context is unavailable.');
  }

  context2d.drawImage(
    image,
    normalizedCropRect.x,
    normalizedCropRect.y,
    normalizedCropRect.width,
    normalizedCropRect.height,
    0,
    0,
    normalizedCropRect.width,
    normalizedCropRect.height
  );

  try {
    return canvas.toDataURL('image/png');
  } catch (error) {
    logClientError(error);
    throw new Error(
      'Client crop failed due to cross-origin restrictions. Use "Crop Server: Sharp".'
    );
  }
};
