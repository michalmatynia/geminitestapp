import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { 
  IMAGE_STUDIO_AUTOSCALER_ERROR_CODES, 
  type ImageStudioAutoScalerErrorCode,
  type ImageStudioAutoScalerMode 
} from '@/features/ai/image-studio/contracts/autoscaler';
import { badRequestError } from '@/shared/errors/app-error';

export const isFileLike = (value: FormDataEntryValue | null): value is File => {
  if (!value || typeof value === 'string') return false;
  const candidate = value as Partial<File>;
  return typeof candidate.name === 'string' && typeof candidate.size === 'number';
};

export const autoScaleBadRequest = (
  code: ImageStudioAutoScalerErrorCode,
  message: string,
  meta?: Record<string, unknown>
): Error => {
  return badRequestError(message, { autoScaleErrorCode: code, ...meta });
};

export const sanitizeSegment = (value: string): string => value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

export const sanitizeFilename = (value: string): string => value.replace(/[^a-zA-Z0-9._-]/g, '_');

export const isClientAutoScaleMode = (mode: ImageStudioAutoScalerMode): boolean =>
  mode === 'client_canvas' || mode === 'client_layout';

export const isServerAutoScaleMode = (mode: ImageStudioAutoScalerMode): boolean =>
  mode === 'server_authoritative' || mode === 'server_assisted';

export const readIdempotencyKey = (req: NextRequest): string | null => {
  const headerValue =
    req.headers.get('x-idempotency-key') || req.headers.get('x-request-id') || null;
  const normalized = headerValue?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
};

export const parseJsonFormValue = <T>(value: FormDataEntryValue | null): T | undefined => {
  if (!value || typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  try {
    return JSON.parse(normalized) as T;
  } catch {
    return undefined;
  }
};

export const coerceFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export const coerceBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return null;
};

export const guessExtension = (mime: string): string => {
  const normalized = mime.toLowerCase();
  if (normalized === 'image/png') return '.png';
  if (normalized === 'image/webp') return '.webp';
  return '.jpg';
};
