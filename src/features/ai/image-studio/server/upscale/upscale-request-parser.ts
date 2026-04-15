import { type NextRequest } from 'next/server';

import {
  IMAGE_STUDIO_UPSCALE_ERROR_CODES,
  IMAGE_STUDIO_UPSCALE_MAX_OUTPUT_SIDE_PX,
  IMAGE_STUDIO_UPSCALE_MAX_SCALE,
  type ImageStudioUpscaleErrorCode,
  type ImageStudioUpscaleRequest,
} from '@/features/ai/image-studio/contracts/upscale';
import { resolveUpscaleStrategyFromRequest } from '@/features/ai/image-studio/server/upscale-utils';
import { badRequestError } from '@/shared/errors/app-error';

import { type ResolvedUpscaleRequest, type UploadedClientUpscaleImage } from './types';

export const upscaleBadRequest = (
  upscaleErrorCode: ImageStudioUpscaleErrorCode,
  message: string,
  meta?: Record<string, unknown>
) => badRequestError(message, { upscaleErrorCode, ...(meta ?? {}) });

export const parseNumericFormValue = (value: FormDataEntryValue | null): number | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return Number.NaN;
  return parsed;
};

export const toInteger = (value: number | undefined): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.floor(value);
};

export const isFileLike = (value: FormDataEntryValue | null): value is File => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<File>;
  return typeof candidate.size === 'number' && typeof candidate.arrayBuffer === 'function';
};

export const resolveUpscaleRequest = (
  payload: ImageStudioUpscaleRequest
): ResolvedUpscaleRequest => {
  const strategy = resolveUpscaleStrategyFromRequest({
    strategy: payload.strategy,
    targetWidth: payload.targetWidth,
    targetHeight: payload.targetHeight,
  });

  if (strategy === 'target_resolution') {
    const targetWidth = toInteger(payload.targetWidth);
    const targetHeight = toInteger(payload.targetHeight);
    if (!(targetWidth && targetWidth > 0 && targetHeight && targetHeight > 0)) {
      throw upscaleBadRequest(
        IMAGE_STUDIO_UPSCALE_ERROR_CODES.TARGET_RESOLUTION_INVALID,
        'Target resolution requires both targetWidth and targetHeight.'
      );
    }
    if (
      targetWidth > IMAGE_STUDIO_UPSCALE_MAX_OUTPUT_SIDE_PX ||
      targetHeight > IMAGE_STUDIO_UPSCALE_MAX_OUTPUT_SIDE_PX
    ) {
      throw upscaleBadRequest(
        IMAGE_STUDIO_UPSCALE_ERROR_CODES.TARGET_RESOLUTION_INVALID,
        'Target resolution exceeds upscale side limit.',
        { targetWidth, targetHeight }
      );
    }
    return {
      strategy,
      scale: Number.NaN,
      targetWidth,
      targetHeight,
    };
  }

  const scale = typeof payload.scale === 'number' ? payload.scale : 2;
  if (!(Number.isFinite(scale) && scale > 1 && scale <= IMAGE_STUDIO_UPSCALE_MAX_SCALE)) {
    throw upscaleBadRequest(
      IMAGE_STUDIO_UPSCALE_ERROR_CODES.SCALE_INVALID,
      'Upscale scale is invalid.'
    );
  }
  return {
    strategy,
    scale,
    targetWidth: null,
    targetHeight: null,
  };
};

export async function parseUpscaleRequestPayload(
  req: NextRequest
): Promise<{ body: unknown; uploadedClientImage: UploadedClientUpscaleImage | null }> {
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
  const strategy = form.get('strategy');
  const scale = parseNumericFormValue(form.get('scale'));
  const targetWidth = parseNumericFormValue(form.get('targetWidth'));
  const targetHeight = parseNumericFormValue(form.get('targetHeight'));
  const smoothingQuality = form.get('smoothingQuality');
  const dataUrl = form.get('dataUrl');
  const name = form.get('name');
  const requestId = form.get('requestId');
  const image = form.get('image');

  let uploadedClientImage: UploadedClientUpscaleImage | null = null;
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
      ...(typeof strategy === 'string' ? { strategy } : {}),
      ...(scale !== undefined ? { scale } : {}),
      ...(targetWidth !== undefined ? { targetWidth } : {}),
      ...(targetHeight !== undefined ? { targetHeight } : {}),
      ...(typeof smoothingQuality === 'string' ? { smoothingQuality } : {}),
      ...(typeof dataUrl === 'string' ? { dataUrl } : {}),
      ...(typeof name === 'string' ? { name } : {}),
      ...(typeof requestId === 'string' ? { requestId } : {}),
    },
    uploadedClientImage,
  };
}
