import sharp from 'sharp';

import {
  IMAGE_STUDIO_UPSCALE_ERROR_CODES,
  type ImageStudioUpscaleRequest,
} from '@/features/ai/image-studio/contracts/upscale';
import {
  deriveUpscaleScaleFromOutputDimensions,
  upscaleImageWithSharp,
  validateUpscaleOutputDimensions,
  validateUpscaleSourceDimensions,
} from '@/features/ai/image-studio/server/upscale-utils';

import {
  ResolvedUpscaleRequest,
  StudioSlotRecord,
  UploadedClientUpscaleImage,
  UpscaleProcessingResult,
} from './types';
import { loadSourceBuffer, parseDataUrl } from './upscale-buffer-loader';
import { upscaleBadRequest } from './upscale-request-parser';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const STRICT_SERVER_UPSCALE_ENABLED =
  process.env['IMAGE_STUDIO_UPSCALE_SERVER_AUTHORITATIVE'] !== 'false';

export async function processUpscalePayload(input: {
  payload: ImageStudioUpscaleRequest;
  resolvedRequest: ResolvedUpscaleRequest;
  sourceSlot: StudioSlotRecord;
  uploadedClientImage: UploadedClientUpscaleImage | null;
}): Promise<UpscaleProcessingResult> {
  const { payload, resolvedRequest, sourceSlot, uploadedClientImage } = input;
  const preferAuthoritativeSource =
    STRICT_SERVER_UPSCALE_ENABLED || payload.mode === 'server_sharp';

  let sourceBuffer: Buffer | null = null;
  let sourceWidth = 0;
  let sourceHeight = 0;
  let sourceLoadError: unknown = null;

  if (preferAuthoritativeSource || payload.mode === 'client_data_url') {
    try {
      const source = await loadSourceBuffer(sourceSlot);
      const metadata = await sharp(source.buffer).metadata();
      sourceWidth = metadata.width ?? sourceSlot.imageFile?.width ?? 0;
      sourceHeight = metadata.height ?? sourceSlot.imageFile?.height ?? 0;
      if (!(sourceWidth > 0 && sourceHeight > 0)) {
        throw upscaleBadRequest(
          IMAGE_STUDIO_UPSCALE_ERROR_CODES.SOURCE_DIMENSIONS_INVALID,
          'Source image dimensions are invalid.'
        );
      }
      const sourceValidation = validateUpscaleSourceDimensions(sourceWidth, sourceHeight);
      if (!sourceValidation.ok) {
        throw upscaleBadRequest(
          IMAGE_STUDIO_UPSCALE_ERROR_CODES.SOURCE_IMAGE_TOO_LARGE,
          'Source image exceeds upscale processing limits.',
          {
            reason: sourceValidation.reason,
            width: sourceWidth,
            height: sourceHeight,
          }
        );
      }
      sourceBuffer = source.buffer;
    } catch (error) {
      void ErrorSystem.captureException(error);
      sourceLoadError = error;
    }
  }

  if (sourceBuffer && sourceWidth > 0 && sourceHeight > 0) {
    let serverUpscale: Awaited<ReturnType<typeof upscaleImageWithSharp>>;
    try {
      const sharedInput = {
        sourceBuffer,
        sourceWidth,
        sourceHeight,
        strategy: resolvedRequest.strategy,
      };
      if (resolvedRequest.strategy === 'scale') {
        serverUpscale = await upscaleImageWithSharp({
          ...sharedInput,
          scale: resolvedRequest.scale,
        });
      } else {
        const targetWidth = resolvedRequest.targetWidth;
        const targetHeight = resolvedRequest.targetHeight;
        if (!(targetWidth && targetHeight)) {
          throw upscaleBadRequest(
            IMAGE_STUDIO_UPSCALE_ERROR_CODES.TARGET_RESOLUTION_INVALID,
            'Target resolution requires both targetWidth and targetHeight.'
          );
        }
        serverUpscale = await upscaleImageWithSharp({
          ...sharedInput,
          targetWidth,
          targetHeight,
        });
      }
    } catch (error) {
      void ErrorSystem.captureException(error);
      if (error instanceof Error && /scale is invalid/i.test(error.message)) {
        throw upscaleBadRequest(
          IMAGE_STUDIO_UPSCALE_ERROR_CODES.SCALE_INVALID,
          'Upscale scale is invalid.'
        );
      }
      if (error instanceof Error && /Target resolution/i.test(error.message)) {
        throw upscaleBadRequest(
          IMAGE_STUDIO_UPSCALE_ERROR_CODES.TARGET_RESOLUTION_INVALID,
          error.message
        );
      }
      if (error instanceof Error && /exceeds upscale processing limits/i.test(error.message)) {
        throw upscaleBadRequest(
          IMAGE_STUDIO_UPSCALE_ERROR_CODES.OUTPUT_INVALID,
          'Upscaled output exceeds upscale limits.'
        );
      }
      throw upscaleBadRequest(
        IMAGE_STUDIO_UPSCALE_ERROR_CODES.OUTPUT_INVALID,
        error instanceof Error ? error.message : 'Failed to process upscaled output.'
      );
    }

    return {
      outputBuffer: serverUpscale.outputBuffer,
      outputMime: serverUpscale.outputMime,
      outputWidth: serverUpscale.outputWidth,
      outputHeight: serverUpscale.outputHeight,
      scale: serverUpscale.scale,
      strategy: serverUpscale.strategy,
      targetWidth:
        serverUpscale.strategy === 'target_resolution' ? serverUpscale.outputWidth : null,
      targetHeight:
        serverUpscale.strategy === 'target_resolution' ? serverUpscale.outputHeight : null,
      effectiveMode: 'server_sharp',
      authoritativeSource: 'source_slot',
      kernel: serverUpscale.kernel,
      smoothingQuality: null,
    };
  }

  if (payload.mode !== 'client_data_url') {
    throw sourceLoadError instanceof Error
      ? sourceLoadError
      : upscaleBadRequest(
        IMAGE_STUDIO_UPSCALE_ERROR_CODES.SOURCE_IMAGE_MISSING,
        'Server upscale requires a resolvable source image.'
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
      !validateUpscaleOutputDimensions(outputWidth, outputHeight)
    ) {
      throw upscaleBadRequest(
        IMAGE_STUDIO_UPSCALE_ERROR_CODES.OUTPUT_INVALID,
        'Uploaded upscale output exceeds upscale limits.',
        { width: outputWidth, height: outputHeight }
      );
    }
    if (
      resolvedRequest.strategy === 'target_resolution' &&
      outputWidth &&
      outputHeight &&
      (outputWidth !== resolvedRequest.targetWidth || outputHeight !== resolvedRequest.targetHeight)
    ) {
      throw upscaleBadRequest(
        IMAGE_STUDIO_UPSCALE_ERROR_CODES.TARGET_RESOLUTION_INVALID,
        'Client upscale output dimensions do not match requested target resolution.',
        {
          outputWidth,
          outputHeight,
          targetWidth: resolvedRequest.targetWidth,
          targetHeight: resolvedRequest.targetHeight,
        }
      );
    }

    return {
      outputBuffer: uploadedClientImage.buffer,
      outputMime: uploadedClientImage.mime,
      outputWidth,
      outputHeight,
      scale:
        outputWidth && outputHeight && sourceWidth > 0 && sourceHeight > 0
          ? deriveUpscaleScaleFromOutputDimensions({
            sourceWidth,
            sourceHeight,
            outputWidth,
            outputHeight,
          })
          : resolvedRequest.strategy === 'scale'
            ? resolvedRequest.scale
            : null,
      strategy: resolvedRequest.strategy,
      targetWidth:
        resolvedRequest.strategy === 'target_resolution'
          ? (resolvedRequest.targetWidth ?? outputWidth)
          : null,
      targetHeight:
        resolvedRequest.strategy === 'target_resolution'
          ? (resolvedRequest.targetHeight ?? outputHeight)
          : null,
      effectiveMode: 'client_data_url',
      authoritativeSource: 'client_upload_fallback',
      kernel: null,
      smoothingQuality: payload.smoothingQuality ?? 'high',
    };
  }

  const parsedData = parseDataUrl(payload.dataUrl ?? '');
  if (!parsedData) {
    throw upscaleBadRequest(
      IMAGE_STUDIO_UPSCALE_ERROR_CODES.CLIENT_DATA_URL_INVALID,
      'Invalid upscale image data URL.'
    );
  }

  const metadata = await sharp(parsedData.buffer)
    .metadata()
    .catch(() => null);
  const outputWidth = metadata?.width ?? null;
  const outputHeight = metadata?.height ?? null;
  if (outputWidth && outputHeight && !validateUpscaleOutputDimensions(outputWidth, outputHeight)) {
    throw upscaleBadRequest(
      IMAGE_STUDIO_UPSCALE_ERROR_CODES.OUTPUT_INVALID,
      'Data URL upscale output exceeds upscale limits.',
      { width: outputWidth, height: outputHeight }
    );
  }
  if (
    resolvedRequest.strategy === 'target_resolution' &&
    outputWidth &&
    outputHeight &&
    (outputWidth !== resolvedRequest.targetWidth || outputHeight !== resolvedRequest.targetHeight)
  ) {
    throw upscaleBadRequest(
      IMAGE_STUDIO_UPSCALE_ERROR_CODES.TARGET_RESOLUTION_INVALID,
      'Data URL upscale output dimensions do not match requested target resolution.',
      {
        outputWidth,
        outputHeight,
        targetWidth: resolvedRequest.targetWidth,
        targetHeight: resolvedRequest.targetHeight,
      }
    );
  }

  return {
    outputBuffer: parsedData.buffer,
    outputMime: parsedData.mime,
    outputWidth,
    outputHeight,
    scale:
      outputWidth && outputHeight && sourceWidth > 0 && sourceHeight > 0
        ? deriveUpscaleScaleFromOutputDimensions({
          sourceWidth,
          sourceHeight,
          outputWidth,
          outputHeight,
        })
        : resolvedRequest.strategy === 'scale'
          ? resolvedRequest.scale
          : null,
    strategy: resolvedRequest.strategy,
    targetWidth:
      resolvedRequest.strategy === 'target_resolution'
        ? (resolvedRequest.targetWidth ?? outputWidth)
        : null,
    targetHeight:
      resolvedRequest.strategy === 'target_resolution'
        ? (resolvedRequest.targetHeight ?? outputHeight)
        : null,
    effectiveMode: 'client_data_url',
    authoritativeSource: 'client_upload_fallback',
    kernel: null,
    smoothingQuality: payload.smoothingQuality ?? 'high',
  };
}
