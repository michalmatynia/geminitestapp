import { createHash } from 'crypto';

import sharp from 'sharp';

import {
  IMAGE_STUDIO_CENTER_ALPHA_THRESHOLD,
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

type WhiteBackgroundModel = {
  r: number;
  g: number;
  b: number;
  chroma: number;
  whiteThreshold: number;
  chromaThreshold: number;
  chromaDeltaThreshold: number;
};

const WHITE_BACKGROUND_BORDER_TARGET_SAMPLES = 4_096;
const WHITE_BACKGROUND_BORDER_MIN_SAMPLES = 48;
const WHITE_FOREGROUND_HIT_RATIO = 0.03;
const WHITE_FOREGROUND_MIN_DIMENSION_RATIO = 0.001;
const WHITE_FOREGROUND_STRICT_RUN_LENGTH = 2;

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
    normalized < IMAGE_STUDIO_CENTER_LAYOUT_MIN_TARGET_CANVAS_SIDE_PX ||
    normalized > IMAGE_STUDIO_CENTER_LAYOUT_MAX_TARGET_CANVAS_SIDE_PX
  ) {
    return null;
  }
  return normalized;
};

export const normalizeCenterLayoutConfig = (
  layout: ImageStudioCenterLayoutConfig | null | undefined
): NormalizedCenterLayoutConfig => {
  const detectionRaw = layout?.detection;
  const detection: ImageStudioCenterDetectionMode =
    detectionRaw === 'alpha_bbox' || detectionRaw === 'white_bg_first_colored_pixel'
      ? detectionRaw
      : 'auto';
  const explicitPaddingPercent = clampNumber(
    layout?.paddingPercent,
    IMAGE_STUDIO_CENTER_LAYOUT_MIN_PADDING_PERCENT,
    IMAGE_STUDIO_CENTER_LAYOUT_MAX_PADDING_PERCENT,
    IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_PADDING_PERCENT
  );
  const paddingXPercent = clampNumber(
    layout?.paddingXPercent,
    IMAGE_STUDIO_CENTER_LAYOUT_MIN_PADDING_PERCENT,
    IMAGE_STUDIO_CENTER_LAYOUT_MAX_PADDING_PERCENT,
    explicitPaddingPercent
  );
  const paddingYPercent = clampNumber(
    layout?.paddingYPercent,
    IMAGE_STUDIO_CENTER_LAYOUT_MIN_PADDING_PERCENT,
    IMAGE_STUDIO_CENTER_LAYOUT_MAX_PADDING_PERCENT,
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
        IMAGE_STUDIO_CENTER_LAYOUT_MIN_WHITE_THRESHOLD,
        IMAGE_STUDIO_CENTER_LAYOUT_MAX_WHITE_THRESHOLD,
        IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_WHITE_THRESHOLD
      )
    ),
    chromaThreshold: Math.floor(
      clampNumber(
        layout?.chromaThreshold,
        IMAGE_STUDIO_CENTER_LAYOUT_MIN_CHROMA_THRESHOLD,
        IMAGE_STUDIO_CENTER_LAYOUT_MAX_CHROMA_THRESHOLD,
        IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_CHROMA_THRESHOLD
      )
    ),
    detection,
  };
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

const computeMedian = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    const left = sorted[midpoint - 1] ?? sorted[midpoint] ?? 0;
    const right = sorted[midpoint] ?? left;
    return (left + right) / 2;
  }
  return sorted[midpoint] ?? 0;
};

const resolveWhiteBackgroundModel = (
  pixelData: Buffer,
  width: number,
  height: number,
  whiteThreshold: number,
  chromaThreshold: number
): WhiteBackgroundModel => {
  const samplesR: number[] = [];
  const samplesG: number[] = [];
  const samplesB: number[] = [];
  const chromaSamples: number[] = [];
  const perimeter = Math.max(1, (width * 2) + (Math.max(0, height - 2) * 2));
  const step = Math.max(1, Math.floor(perimeter / WHITE_BACKGROUND_BORDER_TARGET_SAMPLES));
  let cursor = 0;

  const maybePushBorderSample = (x: number, y: number): void => {
    if (cursor % step !== 0) {
      cursor += 1;
      return;
    }
    cursor += 1;
    const offset = ((y * width) + x) * 4;
    const a = pixelData[offset + 3] ?? 0;
    if (a <= IMAGE_STUDIO_CENTER_ALPHA_THRESHOLD) return;
    const r = pixelData[offset] ?? 0;
    const g = pixelData[offset + 1] ?? 0;
    const b = pixelData[offset + 2] ?? 0;
    samplesR.push(r);
    samplesG.push(g);
    samplesB.push(b);
    chromaSamples.push(Math.max(r, g, b) - Math.min(r, g, b));
  };

  for (let x = 0; x < width; x += 1) {
    maybePushBorderSample(x, 0);
  }
  for (let y = 1; y < Math.max(1, height - 1); y += 1) {
    maybePushBorderSample(Math.max(0, width - 1), y);
  }
  if (height > 1) {
    for (let x = Math.max(0, width - 1); x >= 0; x -= 1) {
      maybePushBorderSample(x, height - 1);
    }
  }
  if (width > 1) {
    for (let y = Math.max(0, height - 2); y >= 1; y -= 1) {
      maybePushBorderSample(0, y);
    }
  }

  if (samplesR.length < WHITE_BACKGROUND_BORDER_MIN_SAMPLES) {
    return {
      r: 255,
      g: 255,
      b: 255,
      chroma: 0,
      whiteThreshold,
      chromaThreshold,
      chromaDeltaThreshold: chromaThreshold,
    };
  }

  const backgroundR = computeMedian(samplesR);
  const backgroundG = computeMedian(samplesG);
  const backgroundB = computeMedian(samplesB);
  const backgroundChroma = computeMedian(chromaSamples);
  const distanceSamples = samplesR.map((sampleR, index) => {
    const sampleG = samplesG[index] ?? backgroundG;
    const sampleB = samplesB[index] ?? backgroundB;
    return Math.max(
      Math.abs(sampleR - backgroundR),
      Math.abs(sampleG - backgroundG),
      Math.abs(sampleB - backgroundB)
    );
  });
  const chromaDeltaSamples = chromaSamples.map((sample) => Math.abs(sample - backgroundChroma));
  const distanceMedian = computeMedian(distanceSamples);
  const chromaDeltaMedian = computeMedian(chromaDeltaSamples);

  return {
    r: backgroundR,
    g: backgroundG,
    b: backgroundB,
    chroma: backgroundChroma,
    whiteThreshold: Math.min(255, Math.max(whiteThreshold, Math.ceil(distanceMedian * 3 + 2))),
    chromaThreshold: Math.min(
      255,
      Math.max(chromaThreshold, Math.ceil(backgroundChroma + chromaDeltaMedian * 3 + 2))
    ),
    chromaDeltaThreshold: Math.min(255, Math.max(chromaThreshold, Math.ceil(chromaDeltaMedian * 3 + 2))),
  };
};

const isWhiteBackgroundForegroundPixel = (
  r: number,
  g: number,
  b: number,
  a: number,
  model: WhiteBackgroundModel
): boolean => {
  if (a <= IMAGE_STUDIO_CENTER_ALPHA_THRESHOLD) return false;
  const distanceFromBackground = Math.max(
    Math.abs(r - model.r),
    Math.abs(g - model.g),
    Math.abs(b - model.b)
  );
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  const chromaDelta = Math.abs(chroma - model.chroma);
  return (
    distanceFromBackground > model.whiteThreshold ||
    chroma > model.chromaThreshold ||
    chromaDelta > model.chromaDeltaThreshold
  );
};

const findLeadingHitIndex = (
  hits: Uint32Array,
  minHits: number,
  minRunLength: number
): number => {
  let runLength = 0;
  for (let index = 0; index < hits.length; index += 1) {
    if ((hits[index] ?? 0) >= minHits) {
      runLength += 1;
      if (runLength >= minRunLength) {
        return index - runLength + 1;
      }
    } else {
      runLength = 0;
    }
  }
  return -1;
};

const findTrailingHitIndex = (
  hits: Uint32Array,
  minHits: number,
  minRunLength: number
): number => {
  let runLength = 0;
  for (let index = hits.length - 1; index >= 0; index -= 1) {
    if ((hits[index] ?? 0) >= minHits) {
      runLength += 1;
      if (runLength >= minRunLength) {
        return index + runLength - 1;
      }
    } else {
      runLength = 0;
    }
  }
  return -1;
};

const resolveLineBounds = (
  hits: Uint32Array,
  perpendicularSize: number
): { start: number; end: number } | null => {
  const maxHit = hits.reduce((max, value) => Math.max(max, value), 0);
  if (maxHit <= 0) return null;
  const strictMinHits = Math.max(
    1,
    Math.max(
      Math.ceil(maxHit * WHITE_FOREGROUND_HIT_RATIO),
      Math.ceil(perpendicularSize * WHITE_FOREGROUND_MIN_DIMENSION_RATIO)
    )
  );
  const strictMinRunLength = hits.length >= 12 ? WHITE_FOREGROUND_STRICT_RUN_LENGTH : 1;
  let start = findLeadingHitIndex(hits, strictMinHits, strictMinRunLength);
  let end = findTrailingHitIndex(hits, strictMinHits, strictMinRunLength);

  if (start < 0 || end < start) {
    start = findLeadingHitIndex(hits, 1, 1);
    end = findTrailingHitIndex(hits, 1, 1);
  }
  if (start < 0 || end < start) return null;
  return { start, end };
};

const resolveWhiteForegroundObjectBounds = (
  pixelData: Buffer,
  width: number,
  height: number,
  whiteThreshold: number,
  chromaThreshold: number
): ImageStudioCenterObjectBounds | null => {
  const backgroundModel = resolveWhiteBackgroundModel(
    pixelData,
    width,
    height,
    whiteThreshold,
    chromaThreshold
  );
  const columnHits = new Uint32Array(width);
  const rowHits = new Uint32Array(height);
  let foregroundCount = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = ((y * width) + x) * 4;
      const r = pixelData[offset] ?? 0;
      const g = pixelData[offset + 1] ?? 0;
      const b = pixelData[offset + 2] ?? 0;
      const a = pixelData[offset + 3] ?? 0;
      if (!isWhiteBackgroundForegroundPixel(r, g, b, a, backgroundModel)) continue;
      columnHits[x] += 1;
      rowHits[y] += 1;
      foregroundCount += 1;
    }
  }

  if (foregroundCount <= 0) return null;
  const horizontalBounds = resolveLineBounds(columnHits, height);
  const verticalBounds = resolveLineBounds(rowHits, width);
  if (!horizontalBounds || !verticalBounds) return null;

  const left = Math.max(0, horizontalBounds.start);
  const right = Math.min(width - 1, horizontalBounds.end);
  const top = Math.max(0, verticalBounds.start);
  const bottom = Math.min(height - 1, verticalBounds.end);
  if (right < left || bottom < top) return null;

  return {
    left,
    top,
    width: Math.max(1, right - left + 1),
    height: Math.max(1, bottom - top + 1),
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
  if (layout.detection === 'alpha_bbox') {
    const alpha = resolveAlphaObjectBounds(pixelData, width, height);
    return alpha ? { bounds: alpha, detectionUsed: 'alpha_bbox' } : null;
  }
  if (layout.detection === 'white_bg_first_colored_pixel') {
    const white = resolveWhiteForegroundObjectBounds(
      pixelData,
      width,
      height,
      layout.whiteThreshold,
      layout.chromaThreshold
    );
    return white ? { bounds: white, detectionUsed: 'white_bg_first_colored_pixel' } : null;
  }

  const white = resolveWhiteForegroundObjectBounds(
    pixelData,
    width,
    height,
    layout.whiteThreshold,
    layout.chromaThreshold
  );
  const alpha = resolveAlphaObjectBounds(pixelData, width, height);

  if (white && alpha) {
    const whiteArea = white.width * white.height;
    const alphaArea = alpha.width * alpha.height;
    if (whiteArea <= alphaArea * 0.995) {
      return { bounds: white, detectionUsed: 'white_bg_first_colored_pixel' };
    }
    return { bounds: alpha, detectionUsed: 'alpha_bbox' };
  }
  if (white) {
    return { bounds: white, detectionUsed: 'white_bg_first_colored_pixel' };
  }
  if (alpha) {
    return { bounds: alpha, detectionUsed: 'alpha_bbox' };
  }
  return null;
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
