import { createHash } from 'crypto';
import { NextRequest } from 'next/server';
import {
  type ImageStudioCenterRequest,
  type ImageStudioCenterResponse,
  imageStudioCenterResponseSchema,
  type ImageStudioSlotRecord,
  type ImageStudioCenterObjectBounds,
  type ImageStudioCenterLayoutMetadata,
  type ImageStudioObjectDetectionUsed,
  type ImageStudioDetectionDetails,
  type ImageStudioCenterShadowPolicy,
  type ImageStudioCenterDetectionMode,
  type UploadedClientCenterImage,
  type ImageStudioCenterMetadata,
} from '@/shared/contracts/image-studio';
import {
  coerceBoolean,
  coerceFiniteNumber,
  isFileLike,
} from '@/features/ai/image-studio/server/image-handler-utils';

export async function parseCenterRequestPayload(
  req: NextRequest
): Promise<{ body: unknown; uploadedClientImage: UploadedClientCenterImage | null }> {
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

  let uploadedClientImage: UploadedClientCenterImage | null = null;
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

export function normalizeCenterRequestBody(body: unknown): Partial<ImageStudioCenterRequest> {
  if (!body || typeof body !== 'object') return {};

  const bodyObj = body as Record<string, unknown>;
  const centerVal = bodyObj['center'];
  const root = (centerVal && typeof centerVal === 'object' ? centerVal : bodyObj) as Record<
    string,
    unknown
  >;

  const layoutVal = root['layout'];
  const layout = (layoutVal && typeof layoutVal === 'object' ? layoutVal : {}) as Record<
    string,
    unknown
  >;

  return {
    mode:
      typeof root['mode'] === 'string'
        ? (root['mode'].trim() as ImageStudioCenterRequest['mode'])
        : undefined,
    dataUrl:
      typeof root['dataUrl'] === 'string'
        ? root['dataUrl'].trim()
        : (root['dataUrl'] as string | undefined),
    name:
      typeof root['name'] === 'string' ? root['name'].trim() : (root['name'] as string | undefined),
    requestId:
      typeof root['requestId'] === 'string'
        ? root['requestId'].trim()
        : (root['requestId'] as string | undefined),
    layout: {
      paddingPercent: coerceFiniteNumber(layout['paddingPercent']) ?? undefined,
      paddingXPercent: coerceFiniteNumber(layout['paddingXPercent']) ?? undefined,
      paddingYPercent: coerceFiniteNumber(layout['paddingYPercent']) ?? undefined,
      fillMissingCanvasWhite: coerceBoolean(layout['fillMissingCanvasWhite']) ?? undefined,
      targetCanvasWidth: coerceFiniteNumber(layout['targetCanvasWidth']) ?? undefined,
      targetCanvasHeight: coerceFiniteNumber(layout['targetCanvasHeight']) ?? undefined,
      whiteThreshold: coerceFiniteNumber(layout['whiteThreshold']) ?? undefined,
      chromaThreshold: coerceFiniteNumber(layout['chromaThreshold']) ?? undefined,
      shadowPolicy: (typeof layout['shadowPolicy'] === 'string'
        ? layout['shadowPolicy'].trim()
        : layout['shadowPolicy']) as ImageStudioCenterShadowPolicy,
      detection: (typeof layout['detection'] === 'string'
        ? layout['detection'].trim()
        : layout['detection']) as ImageStudioCenterDetectionMode,
    },
  };
}

export const buildClientPayloadSignature = (
  payload: ImageStudioCenterRequest,
  uploadedClientImage: UploadedClientCenterImage | null
): string | null => {
  if (uploadedClientImage?.buffer) {
    return `upload:${createHash('sha1').update(uploadedClientImage.buffer).digest('hex').slice(0, 20)}`;
  }
  if (typeof payload.dataUrl === 'string' && payload.dataUrl.trim().length > 0) {
    return `dataurl:${createHash('sha1').update(payload.dataUrl.trim()).digest('hex').slice(0, 20)}`;
  }
  return null;
};

export function readCenterMetadataFromSlot(slot: ImageStudioSlotRecord): ImageStudioCenterMetadata {
  const metadata = (slot.metadata || {}) as Record<string, unknown>;
  const center = metadata['center'];
  return (center || {}) as ImageStudioCenterMetadata;
}

export function parseCenterResponsePayload(
  data: unknown,
  context?: {
    responseStage: string;
    sourceSlotId: string;
    targetSlotId: string;
    requestId?: string | null;
  }
): ImageStudioCenterResponse {
  try {
    return imageStudioCenterResponseSchema.parse(data);
  } catch (error) {
    const err = error as { format?: () => unknown };
    const validationError = new Error('Center response validation failed') as Error & {
      code?: string;
      httpStatus?: number;
      meta?: Record<string, unknown>;
    };

    validationError.code = 'BAD_REQUEST';
    validationError.httpStatus = 400;
    validationError.meta = {
      centerErrorCode: 'IMAGE_STUDIO_CENTER_OUTPUT_INVALID',
      responseStage: context?.responseStage || 'unknown',
      errors: typeof err?.format === 'function' ? err.format() : error,
    };
    throw validationError;
  }
}
