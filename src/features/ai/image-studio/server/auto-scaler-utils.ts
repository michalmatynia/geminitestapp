import { createHash } from 'crypto';

import sharp from 'sharp';

import {
  analyzeAndPlanAutoScaleFromRgba,
  analyzeImageObjectFromRgba,
  normalizeImageStudioAnalysisLayoutConfig,
  type ImageStudioAutoScalePlan,
  type ImageStudioObjectAnalysisResult,
  type NormalizedImageStudioAnalysisLayoutConfig,
} from '@/features/ai/image-studio/analysis/shared';
import type { ImageStudioAutoScalerMode } from '@/features/ai/image-studio/contracts/autoscaler';
import {
  IMAGE_STUDIO_CENTER_MAX_OUTPUT_PIXELS,
  IMAGE_STUDIO_CENTER_MAX_SOURCE_PIXELS,
  IMAGE_STUDIO_CENTER_MAX_SOURCE_SIDE_PX,
} from '@/features/ai/image-studio/contracts/center';
import type {
  ImageStudioCenterDetectionMode,
  ImageStudioCenterLayoutConfig,
  ImageStudioCenterObjectBounds,
} from '@/features/ai/image-studio/contracts/center';

export type ImageStudioAutoScalerResult = {
  outputBuffer: Buffer;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  sourceObjectBounds: ImageStudioCenterObjectBounds;
  targetObjectBounds: ImageStudioCenterObjectBounds;
  detectionUsed: Exclude<ImageStudioCenterDetectionMode, 'auto'>;
  scale: number;
  layout: NormalizedImageStudioAnalysisLayoutConfig;
  whitespaceBefore: ImageStudioObjectAnalysisResult['whitespace'];
  whitespaceAfter: ImageStudioObjectAnalysisResult['whitespace'];
  objectAreaPercentBefore: number;
  objectAreaPercentAfter: number;
};

export type ImageStudioAnalysisSummary = {
  width: number;
  height: number;
  sourceObjectBounds: ImageStudioCenterObjectBounds;
  detectionUsed: Exclude<ImageStudioCenterDetectionMode, 'auto'>;
  whitespace: ImageStudioObjectAnalysisResult['whitespace'];
  objectAreaPercent: number;
  layout: NormalizedImageStudioAnalysisLayoutConfig;
  suggestedPlan: ImageStudioAutoScalePlan;
};

type AutoScalerSourceLimitValidation = {
  ok: boolean;
  reason?: 'non_positive_dimensions' | 'max_side_exceeded' | 'max_pixels_exceeded';
};

const ensureValidDimensions = (width: number, height: number): void => {
  if (!(width > 0 && height > 0)) {
    throw new Error('Source image dimensions are invalid.');
  }
};

const normalizeModeForFingerprint = (_mode: ImageStudioAutoScalerMode): 'auto_scaler_v1' =>
  'auto_scaler_v1';

export const normalizeAutoScalerBoundsForFingerprint = (
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

export const buildAutoScalerLayoutSignature = (
  layout: ImageStudioCenterLayoutConfig | null | undefined
): string => {
  const normalized = normalizeAutoScalerLayoutConfig(layout);
  return createHash('sha1').update(JSON.stringify(normalized)).digest('hex').slice(0, 20);
};

export const buildAutoScalerFingerprint = (input: {
  sourceSignature: string;
  mode: ImageStudioAutoScalerMode;
  layoutSignature?: string | null;
  clientPayloadSignature?: string | null;
}): string => {
  const fingerprintPayload = {
    sourceSignature: input.sourceSignature,
    mode: normalizeModeForFingerprint(input.mode),
    layoutSignature: input.layoutSignature ?? null,
    clientPayloadSignature: input.clientPayloadSignature ?? null,
  };
  return createHash('sha1').update(JSON.stringify(fingerprintPayload)).digest('hex').slice(0, 20);
};

export const buildAutoScalerFingerprintRelationType = (fingerprint: string): string =>
  `autoscale:output:${fingerprint}`;

export const buildAutoScalerRequestRelationType = (requestId: string): string =>
  `autoscale:request:${createHash('sha1').update(requestId.trim()).digest('hex').slice(0, 20)}`;

export const validateAutoScalerSourceDimensions = (
  width: number,
  height: number
): AutoScalerSourceLimitValidation => {
  if (!(width > 0 && height > 0)) {
    return { ok: false, reason: 'non_positive_dimensions' };
  }
  if (
    width > IMAGE_STUDIO_CENTER_MAX_SOURCE_SIDE_PX ||
    height > IMAGE_STUDIO_CENTER_MAX_SOURCE_SIDE_PX
  ) {
    return { ok: false, reason: 'max_side_exceeded' };
  }
  if (width * height > IMAGE_STUDIO_CENTER_MAX_SOURCE_PIXELS) {
    return { ok: false, reason: 'max_pixels_exceeded' };
  }
  return { ok: true };
};

export const validateAutoScalerOutputDimensions = (
  width: number,
  height: number
): boolean =>
  width > 0 && height > 0 && width * height <= IMAGE_STUDIO_CENTER_MAX_OUTPUT_PIXELS;

export const normalizeAutoScalerLayoutConfig = (
  layout: ImageStudioCenterLayoutConfig | null | undefined
): NormalizedImageStudioAnalysisLayoutConfig => normalizeImageStudioAnalysisLayoutConfig(layout);

export async function analyzeImageByAutoScalerLayout(
  sourceBuffer: Buffer,
  layout: ImageStudioCenterLayoutConfig | null | undefined,
  options?: { preferTargetCanvas?: boolean }
): Promise<ImageStudioAnalysisSummary> {
  const normalizedLayout = normalizeAutoScalerLayoutConfig(layout);
  const sourceWithAlpha = sharp(sourceBuffer).ensureAlpha();
  const { data, info } = await sourceWithAlpha.raw().toBuffer({ resolveWithObject: true });
  const width = info.width ?? 0;
  const height = info.height ?? 0;
  ensureValidDimensions(width, height);

  const analysis = analyzeImageObjectFromRgba({
    pixelData: data,
    width,
    height,
    layout: normalizedLayout,
  });

  if (!analysis) {
    throw new Error('No visible object pixels were detected to auto scale.');
  }

  const planned = analyzeAndPlanAutoScaleFromRgba({
    pixelData: data,
    width,
    height,
    layout: normalizedLayout,
    preferTargetCanvas: options?.preferTargetCanvas !== false,
  });

  if (!planned) {
    throw new Error('No visible object pixels were detected to auto scale.');
  }

  return {
    width,
    height,
    sourceObjectBounds: analysis.sourceObjectBounds,
    detectionUsed: analysis.detectionUsed,
    whitespace: analysis.whitespace,
    objectAreaPercent: analysis.objectAreaPercent,
    layout: analysis.layout,
    suggestedPlan: planned.plan,
  };
}

export async function autoScaleObjectByAnalysis(
  sourceBuffer: Buffer,
  layout: ImageStudioCenterLayoutConfig | null | undefined,
  options?: { preferTargetCanvas?: boolean }
): Promise<ImageStudioAutoScalerResult> {
  const normalizedLayout = normalizeAutoScalerLayoutConfig(layout);
  const sourceWithAlpha = sharp(sourceBuffer).ensureAlpha();
  const { data, info } = await sourceWithAlpha.raw().toBuffer({ resolveWithObject: true });
  const sourceWidth = info.width ?? 0;
  const sourceHeight = info.height ?? 0;
  ensureValidDimensions(sourceWidth, sourceHeight);

  const planned = analyzeAndPlanAutoScaleFromRgba({
    pixelData: data,
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

  const extracted = await sharp(sourceBuffer)
    .ensureAlpha()
    .extract({
      left: sourceObjectBounds.left,
      top: sourceObjectBounds.top,
      width: sourceObjectBounds.width,
      height: sourceObjectBounds.height,
    })
    .resize(targetObjectBounds.width, targetObjectBounds.height, {
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
    .composite([
      {
        input: extracted,
        left: targetObjectBounds.left,
        top: targetObjectBounds.top,
      },
    ])
    .png()
    .toBuffer();

  const objectAreaAfter = Math.max(1, targetObjectBounds.width * targetObjectBounds.height);
  const canvasAreaAfter = Math.max(1, outputWidth * outputHeight);

  return {
    outputBuffer,
    width: outputWidth,
    height: outputHeight,
    sourceWidth,
    sourceHeight,
    sourceObjectBounds,
    targetObjectBounds,
    detectionUsed: planned.analysis.detectionUsed,
    scale: planned.plan.scale,
    layout: normalizedLayout,
    whitespaceBefore: planned.analysis.whitespace,
    whitespaceAfter: planned.plan.whitespace,
    objectAreaPercentBefore: planned.analysis.objectAreaPercent,
    objectAreaPercentAfter: Number(((objectAreaAfter / canvasAreaAfter) * 100).toFixed(4)),
  };
}
