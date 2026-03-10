import sharp from 'sharp';

import type {
  ImageStudioDetectionDetails,
  ImageStudioObjectWhitespaceMetrics,
} from '@/features/ai/image-studio/analysis/shared';
import {
  IMAGE_STUDIO_AUTOSCALER_ERROR_CODES,
  type ImageStudioAutoScalerMode,
  type ImageStudioAutoScalerRequest,
} from '@/features/ai/image-studio/contracts/autoscaler';
import type {
  ImageStudioCenterDetectionMode,
  ImageStudioCenterObjectBounds,
  ImageStudioCenterShadowPolicy,
} from '@/features/ai/image-studio/contracts/center';
import {
  autoScaleObjectByAnalysis,
  normalizeAutoScalerLayoutConfig,
  validateAutoScalerOutputDimensions,
  validateAutoScalerSourceDimensions,
} from '@/features/ai/image-studio/server/auto-scaler-utils';
import {
  loadSourceBufferFromSlot,
  parseImageDataUrl,
} from '@/features/ai/image-studio/server/source-image-utils';
import type { UploadedImageBinaryDto as UploadedClientAutoScaleImage } from '@/shared/contracts/image-studio';

import {
  autoScaleBadRequest,
  isClientAutoScaleMode,
  isServerAutoScaleMode,
} from './image-handler-utils';

import type { StudioSlotRecord } from './upscale/types';

const SOURCE_FETCH_TIMEOUT_MS = 15_000;
const STRICT_SERVER_AUTOSCALER_ENABLED =
  process.env['IMAGE_STUDIO_AUTOSCALER_SERVER_AUTHORITATIVE'] !== 'false';

export type { UploadedClientAutoScaleImage };
export type { StudioSlotRecord };

export type AutoScaleLayoutMetadata = {
  paddingPercent: number;
  paddingXPercent: number;
  paddingYPercent: number;
  fillMissingCanvasWhite: boolean;
  targetCanvasWidth: number | null;
  targetCanvasHeight: number | null;
  whiteThreshold: number;
  chromaThreshold: number;
  shadowPolicy?: ImageStudioCenterShadowPolicy;
  layoutPolicyVersion?: string | null;
  detectionPolicyDecision?: string | null;
};

export type AutoScaleProcessingResult = {
  outputBuffer: Buffer;
  outputMime: string;
  outputWidth: number | null;
  outputHeight: number | null;
  sourceObjectBounds: ImageStudioCenterObjectBounds | null;
  targetObjectBounds: ImageStudioCenterObjectBounds | null;
  effectiveMode: ImageStudioAutoScalerMode;
  authoritativeSource: 'source_slot' | 'client_upload_fallback';
  layout: AutoScaleLayoutMetadata;
  detectionUsed: ImageStudioCenterDetectionMode | null;
  confidenceBefore: number | null;
  detectionDetails: ImageStudioDetectionDetails | null;
  scale: number | null;
  whitespaceBefore: ImageStudioObjectWhitespaceMetrics | null;
  whitespaceAfter: ImageStudioObjectWhitespaceMetrics | null;
  objectAreaPercentBefore: number | null;
  objectAreaPercentAfter: number | null;
};

export async function processAutoScalerPayload(input: {
  payload: ImageStudioAutoScalerRequest;
  sourceSlot: StudioSlotRecord;
  uploadedClientImage: UploadedClientAutoScaleImage | null;
}): Promise<AutoScaleProcessingResult> {
  const { payload, sourceSlot, uploadedClientImage } = input;
  const normalizedLayout = normalizeAutoScalerLayoutConfig(payload.layout);
  const preferAuthoritativeSource =
    STRICT_SERVER_AUTOSCALER_ENABLED || isServerAutoScaleMode(payload.mode);

  let sourceBuffer: Buffer | null = null;
  let sourceWidth = 0;
  let sourceHeight = 0;
  let sourceLoadError: unknown = null;

  if (preferAuthoritativeSource || isClientAutoScaleMode(payload.mode)) {
    try {
      const source = await loadSourceBufferFromSlot({
        slot: sourceSlot,
        sourceFetchTimeoutMs: SOURCE_FETCH_TIMEOUT_MS,
        onMissingSource: () =>
          autoScaleBadRequest(
            IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.SOURCE_IMAGE_MISSING,
            'Slot has no source image to auto scale.'
          ),
        onInvalidSource: () =>
          autoScaleBadRequest(
            IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.SOURCE_IMAGE_INVALID,
            'Slot source image path is invalid.'
          ),
        onRemoteFetchFailed: (status) =>
          autoScaleBadRequest(
            IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.SOURCE_IMAGE_INVALID,
            `Failed to fetch source image (${status}).`,
            { status }
          ),
      });
      const metadata = await sharp(source.buffer).metadata();
      sourceWidth = metadata.width ?? sourceSlot.imageFile?.width ?? 0;
      sourceHeight = metadata.height ?? sourceSlot.imageFile?.height ?? 0;
      if (!(sourceWidth > 0 && sourceHeight > 0)) {
        throw autoScaleBadRequest(
          IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.SOURCE_DIMENSIONS_INVALID,
          'Source image dimensions are invalid.'
        );
      }
      const sourceValidation = validateAutoScalerSourceDimensions(sourceWidth, sourceHeight);
      if (!sourceValidation.ok) {
        throw autoScaleBadRequest(
          IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.SOURCE_IMAGE_TOO_LARGE,
          'Source image exceeds auto scaler processing limits.',
          {
            reason: sourceValidation.reason,
            width: sourceWidth,
            height: sourceHeight,
          }
        );
      }
      sourceBuffer = source.buffer;
    } catch (error) {
      sourceLoadError = error;
    }
  }

  if (sourceBuffer && sourceWidth > 0 && sourceHeight > 0) {
    let scaled: Awaited<ReturnType<typeof autoScaleObjectByAnalysis>>;
    try {
      scaled = await autoScaleObjectByAnalysis(sourceBuffer, payload.layout, {
        preferTargetCanvas: true,
      });
    } catch (error) {
      if (error instanceof Error && /No visible object pixels were detected/i.test(error.message)) {
        throw autoScaleBadRequest(
          IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.SOURCE_OBJECT_NOT_FOUND,
          'No visible object pixels were detected to auto scale.'
        );
      }
      if (error instanceof Error && /dimensions are invalid/i.test(error.message)) {
        throw autoScaleBadRequest(
          IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.SOURCE_DIMENSIONS_INVALID,
          'Source image dimensions are invalid.'
        );
      }
      throw autoScaleBadRequest(
        IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.OUTPUT_INVALID,
        error instanceof Error ? error.message : 'Failed to process auto scale output.'
      );
    }

    if (!validateAutoScalerOutputDimensions(scaled.width, scaled.height)) {
      throw autoScaleBadRequest(
        IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.OUTPUT_INVALID,
        'Auto scale output exceeds limits.',
        { width: scaled.width, height: scaled.height }
      );
    }

    return {
      outputBuffer: scaled.outputBuffer,
      outputMime: 'image/png',
      outputWidth: scaled.width,
      outputHeight: scaled.height,
      sourceObjectBounds: scaled.sourceObjectBounds,
      targetObjectBounds: scaled.targetObjectBounds,
      effectiveMode: 'server_auto_scaler',
      authoritativeSource: 'source_slot',
      layout: {
        paddingPercent: scaled.layout.paddingPercent,
        paddingXPercent: scaled.layout.paddingXPercent,
        paddingYPercent: scaled.layout.paddingYPercent,
        fillMissingCanvasWhite: scaled.layout.fillMissingCanvasWhite,
        targetCanvasWidth: scaled.layout.targetCanvasWidth,
        targetCanvasHeight: scaled.layout.targetCanvasHeight,
        whiteThreshold: scaled.layout.whiteThreshold,
        chromaThreshold: scaled.layout.chromaThreshold,
        shadowPolicy: scaled.layout.shadowPolicy,
        layoutPolicyVersion: scaled.policyVersion,
        detectionPolicyDecision: scaled.policyReason,
      },
      detectionUsed: scaled.detectionUsed,
      confidenceBefore: scaled.confidenceBefore,
      detectionDetails: scaled.detectionDetails ?? null,
      scale: scaled.scale,
      whitespaceBefore: scaled.whitespaceBefore,
      whitespaceAfter: scaled.whitespaceAfter,
      objectAreaPercentBefore: scaled.objectAreaPercentBefore,
      objectAreaPercentAfter: scaled.objectAreaPercentAfter,
    };
  }

  if (!isClientAutoScaleMode(payload.mode)) {
    throw sourceLoadError instanceof Error
      ? sourceLoadError
      : autoScaleBadRequest(
        IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.SOURCE_IMAGE_MISSING,
        'Server auto scaler requires a resolvable source image.'
      );
  }

  if (uploadedClientImage) {
    const metadata = await sharp(uploadedClientImage.buffer)
      .metadata()
      .catch(() => null);
    const outputWidth = metadata?.width ?? null;
    const outputHeight = metadata?.height ?? null;
    if (
      outputWidth &&
      outputHeight &&
      !validateAutoScalerOutputDimensions(outputWidth, outputHeight)
    ) {
      throw autoScaleBadRequest(
        IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.OUTPUT_INVALID,
        'Uploaded auto scale output exceeds limits.',
        { width: outputWidth, height: outputHeight }
      );
    }

    return {
      outputBuffer: uploadedClientImage.buffer,
      outputMime: uploadedClientImage.mime,
      outputWidth,
      outputHeight,
      sourceObjectBounds: null,
      targetObjectBounds: null,
      effectiveMode: 'client_auto_scaler',
      authoritativeSource: 'client_upload_fallback',
      layout: {
        paddingPercent: normalizedLayout.paddingPercent,
        paddingXPercent: normalizedLayout.paddingXPercent,
        paddingYPercent: normalizedLayout.paddingYPercent,
        fillMissingCanvasWhite: normalizedLayout.fillMissingCanvasWhite,
        targetCanvasWidth: normalizedLayout.targetCanvasWidth,
        targetCanvasHeight: normalizedLayout.targetCanvasHeight,
        whiteThreshold: normalizedLayout.whiteThreshold,
        chromaThreshold: normalizedLayout.chromaThreshold,
        shadowPolicy: normalizedLayout.shadowPolicy,
        layoutPolicyVersion: null,
        detectionPolicyDecision: null,
      },
      detectionUsed: null,
      confidenceBefore: null,
      detectionDetails: null,
      scale: null,
      whitespaceBefore: null,
      whitespaceAfter: null,
      objectAreaPercentBefore: null,
      objectAreaPercentAfter: null,
    };
  }

  const parsedData = parseImageDataUrl(payload.dataUrl ?? '');
  if (!parsedData) {
    throw autoScaleBadRequest(
      IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.CLIENT_DATA_URL_INVALID,
      'Invalid auto scaler image data URL.'
    );
  }

  const metadata = await sharp(parsedData.buffer)
    .metadata()
    .catch(() => null);
  const outputWidth = metadata?.width ?? null;
  const outputHeight = metadata?.height ?? null;
  if (
    outputWidth &&
    outputHeight &&
    !validateAutoScalerOutputDimensions(outputWidth, outputHeight)
  ) {
    throw autoScaleBadRequest(
      IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.OUTPUT_INVALID,
      'Data URL auto scale output exceeds limits.',
      { width: outputWidth, height: outputHeight }
    );
  }

  return {
    outputBuffer: parsedData.buffer,
    outputMime: parsedData.mime,
    outputWidth,
    outputHeight,
    sourceObjectBounds: null,
    targetObjectBounds: null,
    effectiveMode: 'client_auto_scaler',
    authoritativeSource: 'client_upload_fallback',
    layout: {
      paddingPercent: normalizedLayout.paddingPercent,
      paddingXPercent: normalizedLayout.paddingXPercent,
      paddingYPercent: normalizedLayout.paddingYPercent,
      fillMissingCanvasWhite: normalizedLayout.fillMissingCanvasWhite,
      targetCanvasWidth: normalizedLayout.targetCanvasWidth,
      targetCanvasHeight: normalizedLayout.targetCanvasHeight,
      whiteThreshold: normalizedLayout.whiteThreshold,
      chromaThreshold: normalizedLayout.chromaThreshold,
      shadowPolicy: normalizedLayout.shadowPolicy,
      layoutPolicyVersion: null,
      detectionPolicyDecision: null,
    },
    detectionUsed: null,
    confidenceBefore: null,
    detectionDetails: null,
    scale: null,
    whitespaceBefore: null,
    whitespaceAfter: null,
    objectAreaPercentBefore: null,
    objectAreaPercentAfter: null,
  };
}
