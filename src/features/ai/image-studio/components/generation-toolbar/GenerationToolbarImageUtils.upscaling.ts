import { ApiError } from '@/shared/lib/api-client';

import { loadImageElement, sleep } from './GenerationToolbarImageUtils.helpers';
import {
  type UpscaleRequestStrategyPayload,
  type UpscaleSmoothingQuality,
} from './GenerationToolbarImageUtils.types';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export const isClientUpscaleCrossOriginError = (error: unknown): boolean =>
  error instanceof Error && /cross-origin restrictions/i.test(error.message);

export const isUpscaleAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

export const isRetryableUpscaleError = (error: unknown): boolean => {
  if (isUpscaleAbortError(error)) return false;
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

export const buildUpscaleRequestId = (): string =>
  `upscale_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const withUpscaleRetry = async <T>(
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
      if (attempt >= retries || !isRetryableUpscaleError(error) || signal.aborted) {
        throw error;
      }
      attempt += 1;
      await sleep(retryDelayMs * attempt);
    }
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
  const image = await loadImageElement(src);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!(sourceWidth > 0 && sourceHeight > 0)) {
    throw new Error('Source image dimensions are invalid.');
  }

  const outputWidth =
    request.strategy === 'scale'
      ? Math.max(1, Math.round(sourceWidth * request.scale))
      : request.targetWidth;
  const outputHeight =
    request.strategy === 'scale'
      ? Math.max(1, Math.round(sourceHeight * request.scale))
      : request.targetHeight;
  if (
    request.strategy === 'target_resolution' &&
    (outputWidth < sourceWidth ||
      outputHeight < sourceHeight ||
      (outputWidth === sourceWidth && outputHeight === sourceHeight))
  ) {
    throw new Error(
      'Target resolution must upscale at least one side and not reduce source dimensions.'
    );
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
    (
      context2d as CanvasRenderingContext2D & { imageSmoothingQuality?: UpscaleSmoothingQuality }
    ).imageSmoothingQuality = smoothingQuality;
  } catch (error) {
    logClientError(error);
  
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
      scale: Number(Math.max(outputWidth / sourceWidth, outputHeight / sourceHeight).toFixed(4)),
    };
  } catch (error) {
    logClientError(error);
    throw new Error(
      'Client upscale failed due to cross-origin restrictions. Use "Upscale Server: Sharp".'
    );
  }
};
