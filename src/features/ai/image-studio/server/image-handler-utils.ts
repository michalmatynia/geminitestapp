import 'server-only';

import { createReadStream } from 'fs';
import path from 'path';

import { type NextRequest } from 'next/server';
import { toFile } from 'openai';
import sharp from 'sharp';

import {
  type ImageStudioAutoScalerErrorCode,
  type ImageStudioAutoScalerMode,
} from '@/features/ai/image-studio/contracts/autoscaler';
import {
  type ImageStudioCenterErrorCode,
  type ImageStudioCenterMode,
} from '@/features/ai/image-studio/contracts/center';
import { type AppError, badRequestError } from '@/shared/errors/app-error';

import { IMAGE_MIME_BY_EXTENSION } from './run-executor-utils';

export const autoScaleBadRequest = (
  autoScaleErrorCode: ImageStudioAutoScalerErrorCode,
  message: string,
  meta?: Record<string, unknown>
): AppError => badRequestError(message, { autoScaleErrorCode, ...(meta ?? {}) });

export const centerBadRequest = (
  centerErrorCode: ImageStudioCenterErrorCode,
  message: string,
  meta?: Record<string, unknown>
): AppError => badRequestError(message, { centerErrorCode, ...(meta ?? {}) });

export const isClientAutoScaleMode = (mode: ImageStudioAutoScalerMode): boolean =>
  mode === 'client_auto_scaler';

export const isServerAutoScaleMode = (mode: ImageStudioAutoScalerMode): boolean =>
  mode === 'server_auto_scaler';

export const isClientCenterMode = (mode: ImageStudioCenterMode): boolean =>
  mode.startsWith('client_');

export const isServerCenterMode = (mode: ImageStudioCenterMode): boolean =>
  mode.startsWith('server_');

export const readIdempotencyKey = (req: NextRequest): string | null => {
  const headerValue =
    req.headers.get('x-idempotency-key') ??
    req.headers.get('x-image-studio-request-id') ??
    req.headers.get('x-upscale-request-id');
  const normalized = headerValue?.trim() ?? '';
  return normalized.length >= 8 ? normalized : null;
};

export function guessExtension(mime: string): string {
  const clean = mime.toLowerCase();
  if (clean.includes('jpeg')) return '.jpg';
  if (clean.includes('webp')) return '.webp';
  if (clean.includes('avif')) return '.avif';
  return '.png';
}

export const sanitizeSegment = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

export const sanitizeFilename = (value: string): string => value.replace(/[^a-zA-Z0-9._-]/g, '_');

export const isFileLike = (value: FormDataEntryValue | null): value is File => {
  if (value === null || typeof value !== 'object') return false;
  const candidate = value as Partial<File>;
  return typeof candidate.size === 'number' && typeof candidate.arrayBuffer === 'function';
};

export const coerceFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (normalized.length === 0) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const coerceBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return undefined;
};

export async function toUploadableImageFile(params: {
  diskPath: string;
  fileNameBase: string;
}): Promise<Awaited<ReturnType<typeof toFile>>> {
  const ext = path.extname(params.diskPath).toLowerCase();
  const mimeType = IMAGE_MIME_BY_EXTENSION[ext];
  if (typeof mimeType === 'string' && mimeType.length > 0) {
    const stream = createReadStream(params.diskPath);
    return toFile(stream, `${params.fileNameBase}${ext}`, { type: mimeType });
  }

  const pngBuffer = await sharp(params.diskPath).png().toBuffer();
  return toFile(pngBuffer, `${params.fileNameBase}.png`, { type: 'image/png' });
}
