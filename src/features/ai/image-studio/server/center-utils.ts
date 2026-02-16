import { createHash } from 'crypto';

import sharp from 'sharp';

import {
  IMAGE_STUDIO_CENTER_ALPHA_THRESHOLD,
  IMAGE_STUDIO_CENTER_MAX_OUTPUT_PIXELS,
  IMAGE_STUDIO_CENTER_MAX_SOURCE_PIXELS,
  IMAGE_STUDIO_CENTER_MAX_SOURCE_SIDE_PX,
  type ImageStudioCenterMode,
  type ImageStudioCenterObjectBounds,
} from '@/features/ai/image-studio/contracts/center';

type CenterSourceLimitValidation = {
  ok: boolean;
  reason?: 'non_positive_dimensions' | 'max_side_exceeded' | 'max_pixels_exceeded';
};

export const normalizeCenterBoundsForFingerprint = (
  bounds: ImageStudioCenterObjectBounds | null | undefined
): ImageStudioCenterObjectBounds | null => {
  if (!bounds) return null;
  return {
    left: Math.max(0, Math.floor(bounds.left)),
    top: Math.max(0, Math.floor(bounds.top)),
    width: Math.max(1, Math.floor(bounds.width)),
    height: Math.max(1, Math.floor(bounds.height)),
  };
};

const normalizeModeForFingerprint = (_mode: ImageStudioCenterMode): 'alpha_bbox' =>
  'alpha_bbox';

export const buildCenterFingerprint = (input: {
  sourceSignature: string;
  mode: ImageStudioCenterMode;
  clientPayloadSignature?: string | null;
}): string => {
  const fingerprintPayload = {
    sourceSignature: input.sourceSignature,
    mode: normalizeModeForFingerprint(input.mode),
    clientPayloadSignature: input.clientPayloadSignature ?? null,
  };
  return createHash('sha1').update(JSON.stringify(fingerprintPayload)).digest('hex').slice(0, 20);
};

export const buildCenterFingerprintRelationType = (fingerprint: string): string =>
  `center:output:${fingerprint}`;

export const buildCenterRequestRelationType = (requestId: string): string =>
  `center:request:${createHash('sha1').update(requestId.trim()).digest('hex').slice(0, 20)}`;

export const validateCenterSourceDimensions = (
  width: number,
  height: number
): CenterSourceLimitValidation => {
  if (!(width > 0 && height > 0)) {
    return { ok: false, reason: 'non_positive_dimensions' };
  }
  if (width > IMAGE_STUDIO_CENTER_MAX_SOURCE_SIDE_PX || height > IMAGE_STUDIO_CENTER_MAX_SOURCE_SIDE_PX) {
    return { ok: false, reason: 'max_side_exceeded' };
  }
  if (width * height > IMAGE_STUDIO_CENTER_MAX_SOURCE_PIXELS) {
    return { ok: false, reason: 'max_pixels_exceeded' };
  }
  return { ok: true };
};

export const validateCenterOutputDimensions = (width: number, height: number): boolean =>
  width > 0 && height > 0 && width * height <= IMAGE_STUDIO_CENTER_MAX_OUTPUT_PIXELS;

export const resolveAlphaObjectBounds = (
  pixelData: Buffer,
  width: number,
  height: number,
  alphaThreshold = IMAGE_STUDIO_CENTER_ALPHA_THRESHOLD
): ImageStudioCenterObjectBounds | null => {
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixelData[((y * width) + x) * 4 + 3];
      if (typeof alpha !== 'number' || alpha <= alphaThreshold) continue;
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

export async function centerObjectByAlpha(sourceBuffer: Buffer): Promise<{
  outputBuffer: Buffer;
  width: number;
  height: number;
  sourceObjectBounds: ImageStudioCenterObjectBounds;
  targetObjectBounds: ImageStudioCenterObjectBounds;
}> {
  const sourceWithAlpha = sharp(sourceBuffer).ensureAlpha();
  const { data, info } = await sourceWithAlpha.raw().toBuffer({ resolveWithObject: true });
  const width = info.width ?? 0;
  const height = info.height ?? 0;
  if (!(width > 0 && height > 0)) {
    throw new Error('Source image dimensions are invalid.');
  }

  const sourceObjectBounds = resolveAlphaObjectBounds(data, width, height);
  if (!sourceObjectBounds) {
    throw new Error('No visible object pixels were detected to center.');
  }

  const targetLeft = Math.max(0, Math.round((width - sourceObjectBounds.width) / 2));
  const targetTop = Math.max(0, Math.round((height - sourceObjectBounds.height) / 2));
  const targetObjectBounds: ImageStudioCenterObjectBounds = {
    left: targetLeft,
    top: targetTop,
    width: sourceObjectBounds.width,
    height: sourceObjectBounds.height,
  };

  const extracted = await sharp(sourceBuffer)
    .ensureAlpha()
    .extract({
      left: sourceObjectBounds.left,
      top: sourceObjectBounds.top,
      width: sourceObjectBounds.width,
      height: sourceObjectBounds.height,
    })
    .png()
    .toBuffer();

  const outputBuffer = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: extracted, left: targetObjectBounds.left, top: targetObjectBounds.top }])
    .png()
    .toBuffer();

  return {
    outputBuffer,
    width,
    height,
    sourceObjectBounds,
    targetObjectBounds,
  };
}
