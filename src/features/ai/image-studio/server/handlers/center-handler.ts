import 'server-only';

import fs from 'fs/promises';

import sharp from 'sharp';

import {
  centerAndScaleObjectByLayout,
  centerObjectByAlpha,
  normalizeCenterLayoutConfig,
  validateCenterOutputDimensions,
  validateCenterSourceDimensions,
} from '@/features/ai/image-studio/server/center-utils';
import { type ImageStudioCenterExecutionMeta, type ImageStudioCenterObjectBounds, type ImageStudioRunExecutionResult, type ImageStudioRunRequest } from '@/shared/contracts/image-studio';
import { IMAGE_STUDIO_CENTER_MAX_OUTPUT_PIXELS, IMAGE_STUDIO_CENTER_MAX_SOURCE_PIXELS, IMAGE_STUDIO_CENTER_MAX_SOURCE_SIDE_PX } from '@/shared/contracts/image-studio-transform-contracts';
import { badRequestError } from '@/shared/errors/app-error';

import { createImageRecord, parseDataUrl, resolveCenterOutputFormat } from '../run-executor-utils';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


export async function executeCenterOperation(params: {
  request: ImageStudioRunRequest;
  projectId: string;
  diskPath: string;
}): Promise<ImageStudioRunExecutionResult> {
  const centerMode = params.request.center?.mode ?? 'server_alpha_bbox';
  const normalizedLayout = normalizeCenterLayoutConfig(params.request.center?.layout);

  let outputBuffer: Buffer;
  let outputMime: string;
  let sourceObjectBounds: ImageStudioCenterObjectBounds | null = null;
  let targetObjectBounds: ImageStudioCenterObjectBounds | null = null;
  let layoutMeta: ImageStudioCenterExecutionMeta['layout'] = {
    paddingPercent: normalizedLayout.paddingPercent,
    paddingXPercent: normalizedLayout.paddingXPercent,
    paddingYPercent: normalizedLayout.paddingYPercent,
    fillMissingCanvasWhite: normalizedLayout.fillMissingCanvasWhite,
    targetCanvasWidth: normalizedLayout.targetCanvasWidth,
    targetCanvasHeight: normalizedLayout.targetCanvasHeight,
    whiteThreshold: normalizedLayout.whiteThreshold,
    chromaThreshold: normalizedLayout.chromaThreshold,
    shadowPolicy: normalizedLayout.shadowPolicy,
    detectionUsed: null,
    scale: null,
  };

  if (centerMode === 'client_alpha_bbox' || centerMode === 'client_object_layout') {
    const parsedDataUrl = parseDataUrl(params.request.center?.dataUrl ?? '');
    if (!parsedDataUrl) {
      throw badRequestError(
        'Client centering/layouting requires a valid dataUrl payload, but the provided value could not be parsed as a data URL. Ensure the center.dataUrl field contains a valid base64-encoded data URL (e.g. "data:image/png;base64,...").'
      );
    }
    outputBuffer = parsedDataUrl.buffer;
    outputMime = parsedDataUrl.mime;
    const metadata = await sharp(outputBuffer)
      .metadata()
      .catch(() => null);
    const width = metadata?.width ?? 0;
    const height = metadata?.height ?? 0;
    if (!(width > 0 && height > 0)) {
      throw badRequestError(
        `Centered output dimensions are invalid (width=${width}, height=${height}). The dataUrl image could not be decoded to a valid size.`
      );
    }
    if (!validateCenterOutputDimensions(width, height)) {
      throw badRequestError(
        `Centered output exceeds center processing limits (${width}×${height} px). The maximum allowed output is ${IMAGE_STUDIO_CENTER_MAX_OUTPUT_PIXELS.toLocaleString()} total pixels. Reduce the image size and try again.`
      );
    }

    if (centerMode === 'client_object_layout') {
      layoutMeta = {
        paddingPercent: normalizedLayout.paddingPercent,
        paddingXPercent: normalizedLayout.paddingXPercent,
        paddingYPercent: normalizedLayout.paddingYPercent,
        fillMissingCanvasWhite: normalizedLayout.fillMissingCanvasWhite,
        targetCanvasWidth: normalizedLayout.targetCanvasWidth,
        targetCanvasHeight: normalizedLayout.targetCanvasHeight,
        whiteThreshold: normalizedLayout.whiteThreshold,
        chromaThreshold: normalizedLayout.chromaThreshold,
        shadowPolicy: normalizedLayout.shadowPolicy,
        detectionUsed: null,
        scale: null,
      };
    }
  } else {
    const sourceBuffer = await fs.readFile(params.diskPath).catch(() => {
      throw badRequestError(
        `Asset file not found on disk: "${params.diskPath}". The source image may have been deleted or the path is incorrect.`
      );
    });
    const sourceMetadata = await sharp(sourceBuffer)
      .metadata()
      .catch(() => null);
    const sourceWidth = sourceMetadata?.width ?? 0;
    const sourceHeight = sourceMetadata?.height ?? 0;
    if (!(sourceWidth > 0 && sourceHeight > 0)) {
      throw badRequestError(
        `Source image dimensions are invalid (width=${sourceWidth}, height=${sourceHeight}). The file may be corrupt or not a supported image format.`
      );
    }
    const sourceValidation = validateCenterSourceDimensions(sourceWidth, sourceHeight);
    if (!sourceValidation.ok) {
      throw badRequestError(`Source image exceeds center processing limits (${sourceWidth}×${sourceHeight} px). Maximum allowed: ${IMAGE_STUDIO_CENTER_MAX_SOURCE_SIDE_PX.toLocaleString()} px per side and ${IMAGE_STUDIO_CENTER_MAX_SOURCE_PIXELS.toLocaleString()} total pixels.`, {
        reason: sourceValidation.reason,
        width: sourceWidth,
        height: sourceHeight,
      });
    }
    if (centerMode === 'server_object_layout') {
      let centered: Awaited<ReturnType<typeof centerAndScaleObjectByLayout>>;
      try {
        centered = await centerAndScaleObjectByLayout(sourceBuffer, params.request.center?.layout);
      } catch (error) {
        void ErrorSystem.captureException(error);
        if (
          error instanceof Error &&
          /No visible object pixels were detected to center/i.test(error.message)
        ) {
          throw badRequestError(
            'No visible object pixels were detected to center. The source image may be fully transparent or contain only background. Ensure the subject has visible, non-transparent pixels.'
          );
        }
        if (error instanceof Error && /dimensions are invalid/i.test(error.message)) {
          throw badRequestError(
            'Source image dimensions are invalid after layout centering. The image may be corrupt or produce a zero-size output.'
          );
        }
        throw error;
      }
      if (!validateCenterOutputDimensions(centered.width, centered.height)) {
        throw badRequestError(
          `Centered output exceeds center processing limits (${centered.width}×${centered.height} px). Maximum allowed output is ${IMAGE_STUDIO_CENTER_MAX_OUTPUT_PIXELS.toLocaleString()} total pixels.`,
          {
            width: centered.width,
            height: centered.height,
          }
        );
      }
      outputBuffer = centered.outputBuffer;
      outputMime = 'image/png';
      sourceObjectBounds = centered.sourceObjectBounds;
      targetObjectBounds = centered.targetObjectBounds;
      layoutMeta = {
        paddingPercent: normalizedLayout.paddingPercent,
        paddingXPercent: normalizedLayout.paddingXPercent,
        paddingYPercent: normalizedLayout.paddingYPercent,
        fillMissingCanvasWhite: normalizedLayout.fillMissingCanvasWhite,
        targetCanvasWidth: normalizedLayout.targetCanvasWidth,
        targetCanvasHeight: normalizedLayout.targetCanvasHeight,
        whiteThreshold: normalizedLayout.whiteThreshold,
        chromaThreshold: normalizedLayout.chromaThreshold,
        shadowPolicy: normalizedLayout.shadowPolicy,
        detectionUsed: centered.detectionUsed,
        scale: centered.scale,
      };
    } else {
      let centered: Awaited<ReturnType<typeof centerObjectByAlpha>>;
      try {
        centered = await centerObjectByAlpha(sourceBuffer);
      } catch (error) {
        void ErrorSystem.captureException(error);
        if (
          error instanceof Error &&
          /No visible object pixels were detected to center/i.test(error.message)
        ) {
          throw badRequestError(
            'No visible object pixels were detected to center. The source image may be fully transparent or contain only background. Ensure the subject has visible, non-transparent pixels.'
          );
        }
        if (error instanceof Error && /dimensions are invalid/i.test(error.message)) {
          throw badRequestError(
            'Source image dimensions are invalid after alpha centering. The image may be corrupt or produce a zero-size output.'
          );
        }
        throw error;
      }
      if (!validateCenterOutputDimensions(centered.width, centered.height)) {
        throw badRequestError(
          `Centered output exceeds center processing limits (${centered.width}×${centered.height} px). Maximum allowed output is ${IMAGE_STUDIO_CENTER_MAX_OUTPUT_PIXELS.toLocaleString()} total pixels.`,
          {
            width: centered.width,
            height: centered.height,
          }
        );
      }
      outputBuffer = centered.outputBuffer;
      outputMime = 'image/png';
      sourceObjectBounds = centered.sourceObjectBounds;
      targetObjectBounds = centered.targetObjectBounds;
    }
  }

  if (!outputBuffer || !outputMime) {
    throw badRequestError(
      'Centering operation failed to produce output. None of the centering paths returned a valid image buffer. This is an internal error — check server logs for details.'
    );
  }

  const normalizedOutput = await resolveCenterOutputFormat(outputBuffer, outputMime);
  const createdOutput = await createImageRecord({
    projectId: params.projectId,
    buffer: normalizedOutput.buffer,
    extension: normalizedOutput.format,
  });

  const executionMeta: ImageStudioCenterExecutionMeta = {
    operation: 'center_object',
    mode: centerMode,
    outputFormat: normalizedOutput.format,
    requestedOutputCount: 1,
    responseImageCount: 1,
    inputImageCount: 1,
    sourceObjectBounds,
    targetObjectBounds,
    layout: layoutMeta,
  };

  return {
    projectId: params.projectId,
    outputs: [createdOutput],
    executionMeta,
  };
}
