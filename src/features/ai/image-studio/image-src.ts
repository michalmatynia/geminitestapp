import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import { resolveProductImageUrl } from '@/shared/utils/image-routing';

export function isLikelyImageStudioErrorText(rawValue: string | null | undefined): boolean {
  const value = rawValue?.trim() ?? '';
  if (!value) return false;

  const normalized = value.toLowerCase();
  if (normalized.includes('your request was rejected by the safety system')) return true;
  if (normalized.includes('help.openai.com') && normalized.includes('request id')) return true;
  if (/^\d{3}\s+your request was rejected by the safety system/.test(normalized)) return true;
  return false;
}

function normalizeImageSrc(rawValue: string | null | undefined): string | null {
  const value = rawValue?.trim() ?? '';
  if (!value) return null;
  if (isLikelyImageStudioErrorText(value)) return null;

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

  const filePath = resolveWithExternalBase(slot.imageFile?.url ?? null, externalBaseUrl);
  if (filePath) return filePath;

  return resolveWithExternalBase(slot.imageUrl, externalBaseUrl);
}
