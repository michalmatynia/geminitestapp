import { createHash } from 'crypto';
import { NextRequest } from 'next/server';
import {
  type ImageStudioAutoScalerRequest,
  type ImageStudioAutoScalerResponse,
  imageStudioAutoScalerResponseSchema,
  type ImageStudioSlotRecord,
  type ImageStudioCenterObjectBounds,
  type ImageStudioNormalizedCenterLayout,
  type ImageStudioDetectionDetails,
  type ImageStudioWhitespaceMetrics,
  type ImageStudioAutoScalerMode,
  type ImageStudioCenterShadowPolicy,
  type ImageStudioCenterDetectionMode,
  type UploadedClientAutoScaleImage,
  type ImageStudioAutoScaleMetadata,
} from '@/shared/contracts/image-studio';
import {
  coerceBoolean,
  coerceFiniteNumber,
  isFileLike,
} from '@/features/ai/image-studio/server/image-handler-utils';

export async function parseAutoScalerRequestPayload(
  req: NextRequest
): Promise<{ body: unknown; uploadedClientImage: UploadedClientAutoScaleImage | null }> {
  const contentType = req.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('multipart/form-data')) {
    const jsonBody = (await req.json().catch(() => null)) as unknown;
    return { body: jsonBody, uploadedClientImage: null };
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return { body: null, uploadedClientImage: null };
  }

  const mode = form.get('mode');
  const dataUrl = form.get('dataUrl');
  const name = form.get('name');
  const requestId = form.get('requestId');
  const image = form.get('image');

  // Layout fields
  const paddingPercent = form.get('layout[paddingPercent]') ?? form.get('paddingPercent');
  const paddingXPercent = form.get('layout[paddingXPercent]') ?? form.get('paddingXPercent');
  const paddingYPercent = form.get('layout[paddingYPercent]') ?? form.get('paddingYPercent');
  const fillMissingCanvasWhite =
    form.get('layout[fillMissingCanvasWhite]') ?? form.get('fillMissingCanvasWhite');
  const targetCanvasWidth = form.get('layout[targetCanvasWidth]') ?? form.get('targetCanvasWidth');
  const targetCanvasHeight =
    form.get('layout[targetCanvasHeight]') ?? form.get('targetCanvasHeight');
  const whiteThreshold = form.get('layout[whiteThreshold]') ?? form.get('whiteThreshold');
  const chromaThreshold = form.get('layout[chromaThreshold]') ?? form.get('chromaThreshold');
  const shadowPolicy = form.get('layout[shadowPolicy]') ?? form.get('shadowPolicy');
  const detection = form.get('layout[detection]') ?? form.get('detection');

  let uploadedClientImage: UploadedClientAutoScaleImage | null = null;
  if (isFileLike(image) && image.size > 0) {
    const arrayBuffer = await image.arrayBuffer();
    uploadedClientImage = {
      buffer: Buffer.from(arrayBuffer),
      mime: (typeof image.type === 'string' ? image.type.trim().toLowerCase() : '') || 'image/png',
    };
  }

  return {
    body: {
      ...(typeof mode === 'string' ? { mode } : {}),
      ...(typeof dataUrl === 'string' ? { dataUrl } : {}),
      ...(typeof name === 'string' ? { name } : {}),
      ...(typeof requestId === 'string' ? { requestId } : {}),
      layout: {
        ...(paddingPercent !== null ? { paddingPercent } : {}),
        ...(paddingXPercent !== null ? { paddingXPercent } : {}),
        ...(paddingYPercent !== null ? { paddingYPercent } : {}),
        ...(fillMissingCanvasWhite !== null ? { fillMissingCanvasWhite } : {}),
        ...(targetCanvasWidth !== null ? { targetCanvasWidth } : {}),
        ...(targetCanvasHeight !== null ? { targetCanvasHeight } : {}),
        ...(whiteThreshold !== null ? { whiteThreshold } : {}),
        ...(chromaThreshold !== null ? { chromaThreshold } : {}),
        ...(typeof shadowPolicy === 'string' ? { shadowPolicy } : {}),
        ...(typeof detection === 'string' ? { detection } : {}),
      },
    },
    uploadedClientImage,
  };
}

export function normalizeAutoScaleRequestBody(
  body: unknown
): Partial<ImageStudioAutoScalerRequest> {
  if (!body || typeof body !== 'object') return {};

  const b = body as Record<string, unknown>;
  const autoscale = b['autoscale'];
  // Handle nested autoscale property if present (common in some client wrappers)
  const root = (autoscale && typeof autoscale === 'object' ? autoscale : b) as Record<
    string,
    unknown
  >;

  const layout = (root['layout'] || {}) as Record<string, unknown>;

  const modeRaw = root['mode'];
  const dataUrlRaw = root['dataUrl'];
  const nameRaw = root['name'];
  const requestIdRaw = root['requestId'];
  const shadowPolicyRaw = layout['shadowPolicy'];
  const detectionRaw = layout['detection'];

  return {
    mode: (typeof modeRaw === 'string' ? modeRaw.trim() : modeRaw) as ImageStudioAutoScalerMode,
    dataUrl:
      typeof dataUrlRaw === 'string' ? dataUrlRaw.trim() : (dataUrlRaw as string | undefined),
    name: typeof nameRaw === 'string' ? nameRaw.trim() : (nameRaw as string | undefined),
    requestId:
      typeof requestIdRaw === 'string' ? requestIdRaw.trim() : (requestIdRaw as string | undefined),
    layout: {
      paddingPercent: coerceFiniteNumber(layout['paddingPercent']) ?? undefined,
      paddingXPercent: coerceFiniteNumber(layout['paddingXPercent']) ?? undefined,
      paddingYPercent: coerceFiniteNumber(layout['paddingYPercent']) ?? undefined,
      fillMissingCanvasWhite: coerceBoolean(layout['fillMissingCanvasWhite']) ?? undefined,
      targetCanvasWidth: coerceFiniteNumber(layout['targetCanvasWidth']) ?? undefined,
      targetCanvasHeight: coerceFiniteNumber(layout['targetCanvasHeight']) ?? undefined,
      whiteThreshold: coerceFiniteNumber(layout['whiteThreshold']) ?? undefined,
      chromaThreshold: coerceFiniteNumber(layout['chromaThreshold']) ?? undefined,
      shadowPolicy: (typeof shadowPolicyRaw === 'string'
        ? shadowPolicyRaw.trim()
        : shadowPolicyRaw) as ImageStudioCenterShadowPolicy,
      detection: (typeof detectionRaw === 'string'
        ? detectionRaw.trim()
        : detectionRaw) as ImageStudioCenterDetectionMode,
    },
  };
}

export const buildClientPayloadSignature = (
  payload: ImageStudioAutoScalerRequest,
  uploadedClientImage: UploadedClientAutoScaleImage | null
): string | null => {
  if (uploadedClientImage?.buffer) {
    return `upload:${createHash('sha1').update(uploadedClientImage.buffer).digest('hex').slice(0, 20)}`;
  }
  if (typeof payload.dataUrl === 'string' && payload.dataUrl.trim().length > 0) {
    return `dataurl:${createHash('sha1').update(payload.dataUrl.trim()).digest('hex').slice(0, 20)}`;
  }
  return null;
};

export function readAutoScaleMetadataFromSlot(
  slot: ImageStudioSlotRecord
): ImageStudioAutoScaleMetadata {
  const metadata = (slot.metadata || {}) as Record<string, unknown>;
  const autoscale = metadata['autoscale'];
  return (autoscale || {}) as ImageStudioAutoScaleMetadata;
}

export function parseAutoScaleResponsePayload(
  data: unknown,
  context?: {
    responseStage: string;
    sourceSlotId: string;
    targetSlotId: string;
    requestId?: string;
  }
): ImageStudioAutoScalerResponse {
  try {
    return imageStudioAutoScalerResponseSchema.parse(data);
  } catch (error) {
    // If validation fails, we still want to return a response but maybe with some context
    // This matches the error handling observed in tests
    const validationError = new Error('Auto scaler response validation failed') as Error & {
      code?: string;
      httpStatus?: number;
      meta?: Record<string, unknown>;
    };
    const err = error as { format?: () => unknown };

    validationError.code = 'BAD_REQUEST';
    validationError.httpStatus = 400;
    validationError.meta = {
      autoScaleErrorCode: 'IMAGE_STUDIO_AUTOSCALER_OUTPUT_INVALID',
      responseStage: context?.responseStage || 'unknown',
      errors: typeof err?.format === 'function' ? err.format() : error,
    };
    throw validationError;
  }
}
