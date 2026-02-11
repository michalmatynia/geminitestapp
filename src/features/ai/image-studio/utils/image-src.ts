import { resolveProductImageUrl } from '@/features/products/utils/image-routing';

import type { ImageStudioSlotRecord } from '../types';

function normalizeImageSrc(rawValue: string | null | undefined): string | null {
  const value = rawValue?.trim() ?? '';
  if (!value) return null;

  if (value.startsWith('data:') || value.startsWith('blob:')) {
    return value;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return value;
  }

  const normalizedPath = value.replace(/\\/g, '/').replace(/^\/+/, '');
  return normalizedPath ? `/${normalizedPath}` : null;
}

function resolveWithExternalBase(
  rawValue: string | null | undefined,
  externalBaseUrl?: string | null | undefined
): string | null {
  const normalized = normalizeImageSrc(rawValue);
  if (!normalized) return null;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return resolveProductImageUrl(normalized, externalBaseUrl ?? undefined) ?? normalized;
}

export function getImageStudioSlotImageSrc(
  slot: ImageStudioSlotRecord | null | undefined,
  externalBaseUrl?: string | null | undefined
): string | null {
  if (!slot) return null;

  const inlineBase64 = resolveWithExternalBase(slot.imageBase64, externalBaseUrl);
  if (inlineBase64) return inlineBase64;

  const filePath = resolveWithExternalBase(slot.imageFile?.filepath ?? null, externalBaseUrl);
  if (filePath) return filePath;

  return resolveWithExternalBase(slot.imageUrl, externalBaseUrl);
}
