import { createHash } from 'crypto';
import { NextRequest } from 'next/server';
import { 
  type ImageStudioAutoScalerRequest,
  type ImageStudioAutoScalerResponse,
  imageStudioAutoScalerResponseSchema,
  type ImageStudioSlotRecord
} from '@/shared/contracts/image-studio';
import { 
  coerceBoolean,
  coerceFiniteNumber,
  isFileLike
} from '@/features/ai/image-studio/server/image-handler-utils';

export type UploadedClientAutoScaleImage = {
  buffer: Buffer;
  mime: string;
};

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
  const fillMissingCanvasWhite = form.get('layout[fillMissingCanvasWhite]') ?? form.get('fillMissingCanvasWhite');
  const targetCanvasWidth = form.get('layout[targetCanvasWidth]') ?? form.get('targetCanvasWidth');
  const targetCanvasHeight = form.get('layout[targetCanvasHeight]') ?? form.get('targetCanvasHeight');
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
      }
    },
    uploadedClientImage,
  };
}

export function normalizeAutoScaleRequestBody(body: any): any {
  if (!body || typeof body !== 'object') return {};
  
  // Handle nested autoscale property if present (common in some client wrappers)
  const root = body.autoscale && typeof body.autoscale === 'object' ? body.autoscale : body;
  
  const layout = root.layout || {};
  
  return {
    mode: typeof root.mode === 'string' ? root.mode.trim() : root.mode,
    dataUrl: typeof root.dataUrl === 'string' ? root.dataUrl.trim() : root.dataUrl,
    name: typeof root.name === 'string' ? root.name.trim() : root.name,
    requestId: typeof root.requestId === 'string' ? root.requestId.trim() : root.requestId,
    layout: {
      paddingPercent: coerceFiniteNumber(layout.paddingPercent),
      paddingXPercent: coerceFiniteNumber(layout.paddingXPercent),
      paddingYPercent: coerceFiniteNumber(layout.paddingYPercent),
      fillMissingCanvasWhite: coerceBoolean(layout.fillMissingCanvasWhite),
      targetCanvasWidth: coerceFiniteNumber(layout.targetCanvasWidth),
      targetCanvasHeight: coerceFiniteNumber(layout.targetCanvasHeight),
      whiteThreshold: coerceFiniteNumber(layout.whiteThreshold),
      chromaThreshold: coerceFiniteNumber(layout.chromaThreshold),
      shadowPolicy: typeof layout.shadowPolicy === 'string' ? layout.shadowPolicy.trim() : layout.shadowPolicy,
      detection: typeof layout.detection === 'string' ? layout.detection.trim() : layout.detection,
    }
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

export function readAutoScaleMetadataFromSlot(slot: ImageStudioSlotRecord): any {
  const metadata = slot.metadata || {};
  return metadata.autoscale || {};
}

export function parseAutoScaleResponsePayload(
  data: any,
  context?: { responseStage: string; sourceSlotId: string; targetSlotId: string; requestId?: string }
): ImageStudioAutoScalerResponse {
  try {
    return imageStudioAutoScalerResponseSchema.parse(data);
  } catch (error) {
    // If validation fails, we still want to return a response but maybe with some context
    // This matches the error handling observed in tests
    const err = error as any;
    const validationError = new Error('Auto scaler response validation failed');
    (validationError as any).code = 'BAD_REQUEST';
    (validationError as any).httpStatus = 400;
    (validationError as any).meta = {
      autoScaleErrorCode: 'IMAGE_STUDIO_AUTOSCALER_OUTPUT_INVALID',
      responseStage: context?.responseStage || 'unknown',
      errors: err.format ? err.format() : err,
    };
    throw validationError;
  }
}
