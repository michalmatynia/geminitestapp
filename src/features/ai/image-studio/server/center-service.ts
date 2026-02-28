import sharp from 'sharp';
import type { ImageStudioDetectionDetails } from '@/features/ai/image-studio/analysis/shared';
import {
  IMAGE_STUDIO_CENTER_ERROR_CODES,
  type ImageStudioCenterDetectionMode,
  type ImageStudioCenterMode,
  type ImageStudioCenterObjectBounds,
  type ImageStudioCenterRequest,
  type ImageStudioCenterShadowPolicy,
} from '@/features/ai/image-studio/contracts/center';
import {
  centerAndScaleObjectByLayout,
  centerObjectByAlpha,
  normalizeCenterLayoutConfig,
  validateCenterOutputDimensions,
  validateCenterSourceDimensions,
} from '@/features/ai/image-studio/server/center-utils';
import {
  getImageStudioSlotById,
} from '@/features/ai/image-studio/server/slot-repository';
import {
  loadSourceBufferFromSlot,
  parseImageDataUrl,
} from '@/features/ai/image-studio/server/source-image-utils';
import { 
  autoScaleBadRequest as centerBadRequest, 
  isClientAutoScaleMode as isClientCenterMode, 
  isServerAutoScaleMode as isServerCenterMode 
} from './image-handler-utils';

const SOURCE_FETCH_TIMEOUT_MS = 15_000;
const STRICT_SERVER_CENTER_ENABLED =
  process.env['IMAGE_STUDIO_CENTER_SERVER_AUTHORITATIVE'] !== 'false';

type StudioSlotRecord = NonNullable<Awaited<ReturnType<typeof getImageStudioSlotById>>>;
type UploadedClientCenterImage = {
  buffer: Buffer;
  mime: string;
};

export type CenterProcessingResult = {
  outputBuffer: Buffer;
  outputMime: string;
  outputWidth: number | null;
  outputHeight: number | null;
  sourceObjectBounds: ImageStudioCenterObjectBounds | null;
  targetObjectBounds: ImageStudioCenterObjectBounds | null;
  effectiveMode: ImageStudioCenterMode;
  authoritativeSource: 'source_slot' | 'client_upload_fallback';
  detectionUsed: ImageStudioCenterDetectionMode | null;
  confidenceBefore: number | null;
  detectionDetails: ImageStudioDetectionDetails | null;
  scale: number | null;
  layout: {
    paddingPercent: number;
    paddingXPercent: number;
    paddingYPercent: number;
    fillMissingCanvasWhite: boolean;
    targetCanvasWidth: number | null;
    targetCanvasHeight: number | null;
    whiteThreshold: number;
    chromaThreshold: number;
    shadowPolicy: ImageStudioCenterShadowPolicy;
    layoutPolicyVersion: string | null;
    detectionPolicyDecision: string | null;
    detectionUsed: ImageStudioCenterDetectionMode | null;
    scale: number | null;
  } | null;
};

export async function processCenterPayload(input: {
  payload: ImageStudioCenterRequest;
  sourceSlot: StudioSlotRecord;
  uploadedClientImage: UploadedClientCenterImage | null;
}): Promise<CenterProcessingResult> {
  const { payload, sourceSlot, uploadedClientImage } = input;
  const normalizedLayout = normalizeCenterLayoutConfig(payload.layout);
  const preferAuthoritativeSource =
    STRICT_SERVER_CENTER_ENABLED || isServerCenterMode(payload.mode as any);

  let sourceBuffer: Buffer | null = null;
  let sourceWidth = 0;
  let sourceHeight = 0;
  let sourceLoadError: unknown = null;

  if (preferAuthoritativeSource || isClientCenterMode(payload.mode as any)) {
    try {
      const source = await loadSourceBufferFromSlot({
        slot: sourceSlot,
        sourceFetchTimeoutMs: SOURCE_FETCH_TIMEOUT_MS,
        onMissingSource: () =>
          centerBadRequest(
            IMAGE_STUDIO_CENTER_ERROR_CODES.SOURCE_IMAGE_MISSING as any,
            'Slot has no source image to center.'
          ),
        onInvalidSource: () =>
          centerBadRequest(
            IMAGE_STUDIO_CENTER_ERROR_CODES.SOURCE_IMAGE_INVALID as any,
            'Slot source image path is invalid.'
          ),
        onRemoteFetchFailed: (status) =>
          centerBadRequest(
            IMAGE_STUDIO_CENTER_ERROR_CODES.SOURCE_IMAGE_INVALID as any,
            `Failed to fetch source image (${status}).`,
            { status }
          ),
      });
      const metadata = await sharp(source.buffer).metadata();
      sourceWidth = metadata.width ?? sourceSlot.imageFile?.width ?? 0;
      sourceHeight = metadata.height ?? sourceSlot.imageFile?.height ?? 0;
      if (!(sourceWidth > 0 && sourceHeight > 0)) {
        throw centerBadRequest(
          IMAGE_STUDIO_CENTER_ERROR_CODES.SOURCE_DIMENSIONS_INVALID as any,
          'Source image dimensions are invalid.'
        );
      }
      const sourceValidation = validateCenterSourceDimensions(sourceWidth, sourceHeight);
      if (!sourceValidation.ok) {
        throw centerBadRequest(
          IMAGE_STUDIO_CENTER_ERROR_CODES.SOURCE_IMAGE_TOO_LARGE as any,
          'Source image exceeds centering processing limits.',
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
    if (payload.mode === 'server_alpha_center_v1') {
      const centered = await centerObjectByAlpha(sourceBuffer);
      return {
        outputBuffer: centered.outputBuffer,
        outputMime: 'image/png',
        outputWidth: centered.width,
        outputHeight: centered.height,
        sourceObjectBounds: centered.sourceObjectBounds,
        targetObjectBounds: centered.targetObjectBounds,
        effectiveMode: 'server_alpha_center_v1',
        authoritativeSource: 'source_slot',
        detectionUsed: 'alpha_bbox',
        confidenceBefore: null,
        detectionDetails: null,
        scale: null,
        layout: null,
      };
    }

    let centered: Awaited<ReturnType<typeof centerAndScaleObjectByLayout>>;
    try {
      centered = await centerAndScaleObjectByLayout(sourceBuffer, payload.layout, {
        preferTargetCanvas: true,
      });
    } catch (error) {
      if (error instanceof Error && /No visible object pixels were detected/i.test(error.message)) {
        throw centerBadRequest(
          IMAGE_STUDIO_CENTER_ERROR_CODES.SOURCE_OBJECT_NOT_FOUND as any,
          'No visible object pixels were detected to center.'
        );
      }
      if (error instanceof Error && /dimensions are invalid/i.test(error.message)) {
        throw centerBadRequest(
          IMAGE_STUDIO_CENTER_ERROR_CODES.SOURCE_DIMENSIONS_INVALID as any,
          'Source image dimensions are invalid.'
        );
      }
      throw centerBadRequest(
        IMAGE_STUDIO_CENTER_ERROR_CODES.OUTPUT_INVALID as any,
        error instanceof Error ? error.message : 'Failed to process centered output.'
      );
    }

    if (!validateCenterOutputDimensions(centered.width, centered.height)) {
      throw centerBadRequest(
        IMAGE_STUDIO_CENTER_ERROR_CODES.OUTPUT_INVALID as any,
        'Centering output exceeds limits.',
        { width: centered.width, height: centered.height }
      );
    }

    return {
      outputBuffer: centered.outputBuffer,
      outputMime: 'image/png',
      outputWidth: centered.width,
      outputHeight: centered.height,
      sourceObjectBounds: centered.sourceObjectBounds,
      targetObjectBounds: centered.targetObjectBounds,
      effectiveMode: 'server_center_scaler_v2',
      authoritativeSource: 'source_slot',
      detectionUsed: centered.detectionUsed,
      confidenceBefore: centered.confidenceBefore,
      detectionDetails: centered.detectionDetails,
      scale: centered.scale,
      layout: {
        paddingPercent: centered.layout.paddingPercent,
        paddingXPercent: centered.layout.paddingXPercent,
        paddingYPercent: centered.layout.paddingYPercent,
        fillMissingCanvasWhite: centered.layout.fillMissingCanvasWhite,
        targetCanvasWidth: centered.layout.targetCanvasWidth,
        targetCanvasHeight: centered.layout.targetCanvasHeight,
        whiteThreshold: centered.layout.whiteThreshold,
        chromaThreshold: centered.layout.chromaThreshold,
        shadowPolicy: centered.layout.shadowPolicy,
        layoutPolicyVersion: centered.policyVersion,
        detectionPolicyDecision: centered.policyReason,
        detectionUsed: centered.detectionUsed,
        scale: centered.scale,
      },
    };
  }

  if (!isClientCenterMode(payload.mode as any)) {
    throw sourceLoadError instanceof Error
      ? sourceLoadError
      : centerBadRequest(
        IMAGE_STUDIO_CENTER_ERROR_CODES.SOURCE_IMAGE_MISSING as any,
        'Server centering requires a resolvable source image.'
      );
  }

  if (uploadedClientImage) {
    const metadata = await sharp(uploadedClientImage.buffer)
      .metadata()
      .catch(() => null);
    const outputWidth = metadata?.width ?? null;
    const outputHeight = metadata?.height ?? null;
    if (outputWidth && outputHeight && !validateCenterOutputDimensions(outputWidth, outputHeight)) {
      throw centerBadRequest(
        IMAGE_STUDIO_CENTER_ERROR_CODES.OUTPUT_INVALID as any,
        'Uploaded centered output exceeds limits.',
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
      effectiveMode: 'client_center_scaler_v2',
      authoritativeSource: 'client_upload_fallback',
      detectionUsed: null,
      confidenceBefore: null,
      detectionDetails: null,
      scale: null,
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
        detectionUsed: null,
        scale: null,
      },
    };
  }

  const parsedData = parseImageDataUrl(payload.dataUrl ?? '');
  if (!parsedData) {
    throw centerBadRequest(
      IMAGE_STUDIO_CENTER_ERROR_CODES.CLIENT_DATA_URL_INVALID as any,
      'Invalid centering image data URL.'
    );
  }

  const metadata = await sharp(parsedData.buffer)
    .metadata()
    .catch(() => null);
  const outputWidth = metadata?.width ?? null;
  const outputHeight = metadata?.height ?? null;
  if (outputWidth && outputHeight && !validateCenterOutputDimensions(outputWidth, outputHeight)) {
    throw centerBadRequest(
      IMAGE_STUDIO_CENTER_ERROR_CODES.OUTPUT_INVALID as any,
      'Data URL centered output exceeds limits.',
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
    effectiveMode: 'client_center_scaler_v2',
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
      detectionUsed: null,
      scale: null,
    },
    detectionUsed: null,
    confidenceBefore: null,
    detectionDetails: null,
    scale: null,
  };
}
