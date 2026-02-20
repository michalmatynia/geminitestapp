import { createHash } from 'crypto';

import sharp from 'sharp';

import {
  detectObjectBoundsForLayoutFromRgba,
  normalizeImageStudioAnalysisLayoutConfig,
} from '@/features/ai/image-studio/analysis/shared';
import {
  IMAGE_STUDIO_CENTER_ALPHA_THRESHOLD,
  IMAGE_STUDIO_CENTER_MAX_OUTPUT_PIXELS,
  IMAGE_STUDIO_CENTER_MAX_SOURCE_PIXELS,
  IMAGE_STUDIO_CENTER_MAX_SOURCE_SIDE_PX,
  type ImageStudioCenterDetectionMode,
  type ImageStudioCenterLayoutConfig,
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

type NormalizedCenterModeForFingerprint = 'alpha_bbox' | 'object_layout_v1';
type NormalizedCenterLayoutConfig = {
  paddingPercent: number;
  paddingXPercent: number;
  paddingYPercent: number;
  fillMissingCanvasWhite: boolean;
  targetCanvasWidth: number | null;
  targetCanvasHeight: number | null;
  whiteThreshold: number;
  chromaThreshold: number;
  detection: ImageStudioCenterDetectionMode;
};

export const normalizeCenterLayoutConfig = (
  layout: ImageStudioCenterLayoutConfig | null | undefined
): NormalizedCenterLayoutConfig => {
  return normalizeImageStudioAnalysisLayoutConfig(layout);
};

export const buildCenterLayoutSignature = (
  layout: ImageStudioCenterLayoutConfig | null | undefined
): string => {
  const normalized = normalizeCenterLayoutConfig(layout);
  return createHash('sha1').update(JSON.stringify(normalized)).digest('hex').slice(0, 20);
};

const normalizeModeForFingerprint = (mode: ImageStudioCenterMode): NormalizedCenterModeForFingerprint =>
  mode === 'client_object_layout_v1' || mode === 'server_object_layout_v1'
    ? 'object_layout_v1'
    : 'alpha_bbox';

export const buildCenterFingerprint = (input: {
  sourceSignature: string;
  mode: ImageStudioCenterMode;
  clientPayloadSignature?: string | null;
  layoutSignature?: string | null;
}): string => {
  const fingerprintPayload = {
    sourceSignature: input.sourceSignature,
    mode: normalizeModeForFingerprint(input.mode),
    clientPayloadSignature: input.clientPayloadSignature ?? null,
    layoutSignature: input.layoutSignature ?? null,
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

const resolveObjectBoundsForLayout = (
  pixelData: Buffer,
  width: number,
  height: number,
  layout: NormalizedCenterLayoutConfig
): {
  bounds: ImageStudioCenterObjectBounds;
  detectionUsed: ImageStudioCenterDetectionMode;
} | null => {
  const detected = detectObjectBoundsForLayoutFromRgba(pixelData, width, height, layout);
  if (!detected) return null;
  return {
    bounds: detected.bounds,
    detectionUsed: detected.detectionUsed,
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

export async function centerAndScaleObjectByLayout(
  sourceBuffer: Buffer,
  layout: ImageStudioCenterLayoutConfig | null | undefined
): Promise<{
  outputBuffer: Buffer;
  width: number;
  height: number;
  sourceObjectBounds: ImageStudioCenterObjectBounds;
  targetObjectBounds: ImageStudioCenterObjectBounds;
  scale: number;
  detectionUsed: ImageStudioCenterDetectionMode;
}> {
  const normalizedLayout = normalizeCenterLayoutConfig(layout);
  const sourceWithAlpha = sharp(sourceBuffer).ensureAlpha();
  const { data, info } = await sourceWithAlpha.raw().toBuffer({ resolveWithObject: true });
  const width = info.width ?? 0;
  const height = info.height ?? 0;
  if (!(width > 0 && height > 0)) {
    throw new Error('Source image dimensions are invalid.');
  }

  const objectBoundsResult = resolveObjectBoundsForLayout(data, width, height, normalizedLayout);
  if (!objectBoundsResult) {
    throw new Error('No visible object pixels were detected to center.');
  }
  const sourceObjectBounds = objectBoundsResult.bounds;
  const outputWidth = normalizedLayout.fillMissingCanvasWhite
    ? Math.max(width, normalizedLayout.targetCanvasWidth ?? width)
    : width;
  const outputHeight = normalizedLayout.fillMissingCanvasWhite
    ? Math.max(height, normalizedLayout.targetCanvasHeight ?? height)
    : height;
  const paddingXRatio = Math.max(
    0,
    Math.min(0.49, normalizedLayout.paddingXPercent / 100)
  );
  const paddingYRatio = Math.max(
    0,
    Math.min(0.49, normalizedLayout.paddingYPercent / 100)
  );
  const maxObjectWidth = Math.max(1, Math.round(outputWidth * (1 - paddingXRatio * 2)));
  const maxObjectHeight = Math.max(1, Math.round(outputHeight * (1 - paddingYRatio * 2)));
  const scale = Math.max(
    0.0001,
    Math.min(maxObjectWidth / sourceObjectBounds.width, maxObjectHeight / sourceObjectBounds.height)
  );
  const targetWidth = Math.max(1, Math.min(outputWidth, Math.round(sourceObjectBounds.width * scale)));
  const targetHeight = Math.max(1, Math.min(outputHeight, Math.round(sourceObjectBounds.height * scale)));
  const targetLeft = Math.max(0, Math.round((outputWidth - targetWidth) / 2));
  const targetTop = Math.max(0, Math.round((outputHeight - targetHeight) / 2));
  const targetObjectBounds: ImageStudioCenterObjectBounds = {
    left: targetLeft,
    top: targetTop,
    width: targetWidth,
    height: targetHeight,
  };

  const extracted = await sharp(sourceBuffer)
    .ensureAlpha()
    .extract({
      left: sourceObjectBounds.left,
      top: sourceObjectBounds.top,
      width: sourceObjectBounds.width,
      height: sourceObjectBounds.height,
    })
    .resize(targetWidth, targetHeight, {
      fit: 'fill',
      kernel: 'lanczos3',
    })
    .png()
    .toBuffer();

  const outputBuffer = await sharp({
    create: {
      width: outputWidth,
      height: outputHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: extracted, left: targetObjectBounds.left, top: targetObjectBounds.top }])
    .png()
    .toBuffer();

  return {
    outputBuffer,
    width: outputWidth,
    height: outputHeight,
    sourceObjectBounds,
    targetObjectBounds,
    scale: Number(scale.toFixed(6)),
    detectionUsed: objectBoundsResult.detectionUsed,
  };
}
