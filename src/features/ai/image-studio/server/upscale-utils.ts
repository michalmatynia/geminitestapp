import { createHash } from 'crypto';

import sharp from 'sharp';

import {
  IMAGE_STUDIO_UPSCALE_MAX_OUTPUT_PIXELS,
  IMAGE_STUDIO_UPSCALE_MAX_OUTPUT_SIDE_PX,
  IMAGE_STUDIO_UPSCALE_MAX_SCALE,
  IMAGE_STUDIO_UPSCALE_MAX_SOURCE_PIXELS,
  IMAGE_STUDIO_UPSCALE_MAX_SOURCE_SIDE_PX,
  IMAGE_STUDIO_UPSCALE_MIN_SCALE,
  type ImageStudioUpscaleMode,
  type ImageStudioUpscaleStrategy,
  type ImageStudioUpscaleSmoothingQuality,
} from '@/shared/contracts/image-studio';

type UpscaleSourceLimitValidation = {
  ok: boolean;
  reason?: 'non_positive_dimensions' | 'max_side_exceeded' | 'max_pixels_exceeded';
};

export const normalizeUpscaleScale = (scale: number): number => {
  if (!Number.isFinite(scale)) return Number.NaN;
  return Number(scale.toFixed(4));
};

const normalizeModeForFingerprint = (_mode: ImageStudioUpscaleMode): 'upscale' =>
  'upscale';

export const resolveUpscaleStrategyFromRequest = (input: {
  strategy?: ImageStudioUpscaleStrategy | null | undefined;
  targetWidth?: number | null | undefined;
  targetHeight?: number | null | undefined;
}): ImageStudioUpscaleStrategy =>
  input.strategy === 'target_resolution' ||
  typeof input.targetWidth === 'number' ||
  typeof input.targetHeight === 'number'
    ? 'target_resolution'
    : 'scale';

export const buildUpscaleFingerprint = (input: {
  sourceSignature: string;
  mode: ImageStudioUpscaleMode;
  strategy: ImageStudioUpscaleStrategy;
  scale?: number | null;
  targetWidth?: number | null;
  targetHeight?: number | null;
  smoothingQuality?: ImageStudioUpscaleSmoothingQuality | null | undefined;
  clientPayloadSignature?: string | null;
}): string => {
  const normalizedTargetWidth =
    typeof input.targetWidth === 'number' && Number.isFinite(input.targetWidth)
      ? Math.max(1, Math.floor(input.targetWidth))
      : null;
  const normalizedTargetHeight =
    typeof input.targetHeight === 'number' && Number.isFinite(input.targetHeight)
      ? Math.max(1, Math.floor(input.targetHeight))
      : null;
  const fingerprintPayload = {
    sourceSignature: input.sourceSignature,
    mode: normalizeModeForFingerprint(input.mode),
    strategy: input.strategy,
    scale: input.strategy === 'scale'
      ? normalizeUpscaleScale(typeof input.scale === 'number' ? input.scale : Number.NaN)
      : null,
    targetWidth: input.strategy === 'target_resolution' ? normalizedTargetWidth : null,
    targetHeight: input.strategy === 'target_resolution' ? normalizedTargetHeight : null,
    clientPayloadSignature: input.clientPayloadSignature ?? null,
  };
  return createHash('sha1').update(JSON.stringify(fingerprintPayload)).digest('hex').slice(0, 20);
};

export const buildUpscaleFingerprintRelationType = (fingerprint: string): string =>
  `upscale:output:${fingerprint}`;

export const buildUpscaleRequestRelationType = (requestId: string): string =>
  `upscale:request:${createHash('sha1').update(requestId.trim()).digest('hex').slice(0, 20)}`;

export const validateUpscaleSourceDimensions = (
  width: number,
  height: number
): UpscaleSourceLimitValidation => {
  if (!(width > 0 && height > 0)) {
    return { ok: false, reason: 'non_positive_dimensions' };
  }
  if (width > IMAGE_STUDIO_UPSCALE_MAX_SOURCE_SIDE_PX || height > IMAGE_STUDIO_UPSCALE_MAX_SOURCE_SIDE_PX) {
    return { ok: false, reason: 'max_side_exceeded' };
  }
  if (width * height > IMAGE_STUDIO_UPSCALE_MAX_SOURCE_PIXELS) {
    return { ok: false, reason: 'max_pixels_exceeded' };
  }
  return { ok: true };
};

export const validateUpscaleOutputDimensions = (width: number, height: number): boolean =>
  width > 0 &&
  height > 0 &&
  width <= IMAGE_STUDIO_UPSCALE_MAX_OUTPUT_SIDE_PX &&
  height <= IMAGE_STUDIO_UPSCALE_MAX_OUTPUT_SIDE_PX &&
  width * height <= IMAGE_STUDIO_UPSCALE_MAX_OUTPUT_PIXELS;

export const resolveUpscaleOutputDimensions = (
  sourceWidth: number,
  sourceHeight: number,
  scale: number
): { width: number; height: number } => {
  if (!(sourceWidth > 0 && sourceHeight > 0)) {
    throw new Error('Source image dimensions are invalid.');
  }
  if (!(scale > IMAGE_STUDIO_UPSCALE_MIN_SCALE && scale <= IMAGE_STUDIO_UPSCALE_MAX_SCALE)) {
    throw new Error('Upscale scale is invalid.');
  }
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  if (!validateUpscaleOutputDimensions(width, height)) {
    throw new Error('Upscaled output exceeds upscale processing limits.');
  }
  return { width, height };
};

export const resolveUpscaleOutputDimensionsByResolution = (
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): { width: number; height: number; scale: number } => {
  if (!(sourceWidth > 0 && sourceHeight > 0)) {
    throw new Error('Source image dimensions are invalid.');
  }

  if (!(targetWidth > 0 && targetHeight > 0)) {
    throw new Error('Target resolution is invalid.');
  }

  const width = Math.max(1, Math.floor(targetWidth));
  const height = Math.max(1, Math.floor(targetHeight));
  if (!validateUpscaleOutputDimensions(width, height)) {
    throw new Error('Upscaled output exceeds upscale processing limits.');
  }

  if (width < sourceWidth || height < sourceHeight || (width === sourceWidth && height === sourceHeight)) {
    throw new Error('Target resolution must upscale at least one dimension and not reduce source dimensions.');
  }

  const scale = normalizeUpscaleScale(Math.max(width / sourceWidth, height / sourceHeight));
  return { width, height, scale };
};

export const deriveUpscaleScaleFromOutputDimensions = (input: {
  sourceWidth: number;
  sourceHeight: number;
  outputWidth: number;
  outputHeight: number;
}): number | null => {
  if (
    !(input.sourceWidth > 0 && input.sourceHeight > 0 && input.outputWidth > 0 && input.outputHeight > 0)
  ) {
    return null;
  }
  return normalizeUpscaleScale(
    Math.max(input.outputWidth / input.sourceWidth, input.outputHeight / input.sourceHeight)
  );
};

export async function upscaleImageWithSharp(input: {
  sourceBuffer: Buffer;
  sourceWidth: number;
  sourceHeight: number;
  strategy: ImageStudioUpscaleStrategy;
  scale?: number;
  targetWidth?: number;
  targetHeight?: number;
}): Promise<{
  outputBuffer: Buffer;
  outputWidth: number;
  outputHeight: number;
  outputMime: 'image/png';
  kernel: 'lanczos3';
  scale: number;
  strategy: ImageStudioUpscaleStrategy;
}> {
  const resolved =
    input.strategy === 'target_resolution'
      ? resolveUpscaleOutputDimensionsByResolution(
        input.sourceWidth,
        input.sourceHeight,
        input.targetWidth ?? Number.NaN,
        input.targetHeight ?? Number.NaN
      )
      : {
        ...resolveUpscaleOutputDimensions(
          input.sourceWidth,
          input.sourceHeight,
          input.scale ?? Number.NaN
        ),
        scale: normalizeUpscaleScale(input.scale ?? Number.NaN),
      };
  const { width, height } = resolved;
  const outputBuffer = await sharp(input.sourceBuffer)
    .resize({
      width,
      height,
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();
  return {
    outputBuffer,
    outputWidth: width,
    outputHeight: height,
    outputMime: 'image/png',
    kernel: 'lanczos3',
    scale: resolved.scale,
    strategy: input.strategy,
  };
}
