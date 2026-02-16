import { createHash } from 'crypto';

import {
  IMAGE_STUDIO_CROP_MAX_OUTPUT_PIXELS,
  IMAGE_STUDIO_CROP_MAX_SOURCE_PIXELS,
  IMAGE_STUDIO_CROP_MAX_SOURCE_SIDE_PX,
  type ImageStudioCropMode,
  type ImageStudioCropPoint,
  type ImageStudioCropRect,
} from '@/features/ai/image-studio/contracts/crop';

import type { Region } from 'sharp';

type CropSourceLimitValidation = {
  ok: boolean;
  reason?: 'non_positive_dimensions' | 'max_side_exceeded' | 'max_pixels_exceeded';
};

const clampUnit = (value: number): number => Math.max(0, Math.min(1, value));

const normalizePolygonForFingerprint = (
  polygon: ImageStudioCropPoint[] | undefined
): ImageStudioCropPoint[] | null => {
  if (!polygon || polygon.length === 0) return null;
  return polygon.map((point) => ({
    x: Number(clampUnit(point.x).toFixed(5)),
    y: Number(clampUnit(point.y).toFixed(5)),
  }));
};

export const normalizeCropRectForFingerprint = (
  rect: ImageStudioCropRect | undefined
): ImageStudioCropRect | null => {
  if (!rect) return null;
  return {
    x: Math.max(0, Math.floor(rect.x)),
    y: Math.max(0, Math.floor(rect.y)),
    width: Math.max(1, Math.floor(rect.width)),
    height: Math.max(1, Math.floor(rect.height)),
  };
};

const normalizeModeForFingerprint = (mode: ImageStudioCropMode): 'bbox' | 'polygon' =>
  mode === 'server_polygon' ? 'polygon' : 'bbox';

export const buildCropFingerprint = (input: {
  sourceSignature: string;
  mode: ImageStudioCropMode;
  cropRect?: ImageStudioCropRect | undefined;
  polygon?: ImageStudioCropPoint[] | undefined;
}): string => {
  const fingerprintPayload = {
    sourceSignature: input.sourceSignature,
    mode: normalizeModeForFingerprint(input.mode),
    cropRect: normalizeCropRectForFingerprint(input.cropRect),
    polygon: normalizePolygonForFingerprint(input.polygon),
  };
  return createHash('sha1').update(JSON.stringify(fingerprintPayload)).digest('hex').slice(0, 20);
};

export const buildCropFingerprintRelationType = (fingerprint: string): string =>
  `crop:output:${fingerprint}`;

export const buildCropRequestRelationType = (requestId: string): string =>
  `crop:request:${createHash('sha1').update(requestId.trim()).digest('hex').slice(0, 20)}`;

export const validateCropSourceDimensions = (
  width: number,
  height: number
): CropSourceLimitValidation => {
  if (!(width > 0 && height > 0)) {
    return { ok: false, reason: 'non_positive_dimensions' };
  }

  if (width > IMAGE_STUDIO_CROP_MAX_SOURCE_SIDE_PX || height > IMAGE_STUDIO_CROP_MAX_SOURCE_SIDE_PX) {
    return { ok: false, reason: 'max_side_exceeded' };
  }

  if (width * height > IMAGE_STUDIO_CROP_MAX_SOURCE_PIXELS) {
    return { ok: false, reason: 'max_pixels_exceeded' };
  }

  return { ok: true };
};

export const clampCropRect = (
  rect: ImageStudioCropRect,
  width: number,
  height: number
): Region => {
  const left = Math.floor(rect.x);
  const top = Math.floor(rect.y);
  const requestedWidth = Math.floor(rect.width);
  const requestedHeight = Math.floor(rect.height);

  const safeLeft = Math.max(0, Math.min(left, width - 1));
  const safeTop = Math.max(0, Math.min(top, height - 1));
  const safeWidth = Math.max(1, Math.min(requestedWidth, width - safeLeft));
  const safeHeight = Math.max(1, Math.min(requestedHeight, height - safeTop));

  return {
    left: safeLeft,
    top: safeTop,
    width: safeWidth,
    height: safeHeight,
  };
};

export const validateCropOutputDimensions = (width: number, height: number): boolean =>
  width > 0 && height > 0 && width * height <= IMAGE_STUDIO_CROP_MAX_OUTPUT_PIXELS;
