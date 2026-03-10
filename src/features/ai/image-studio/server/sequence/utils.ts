import path from 'path';

import type { ImageStudioSlotRecord } from '@/features/ai/image-studio/server';

export const STUDIO_UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads', 'studio');

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const sanitizeSegment = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

export const sanitizeFilename = (value: string): string => value.replace(/[^a-zA-Z0-9._-]/g, '_');

export const normalizePublicPath = (filepath: string): string => {
  let normalized = filepath.trim().replace(/\\/g, '/');
  if (!normalized) return '';
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (normalized.startsWith('public/')) {
    normalized = normalized.slice('public'.length);
  }
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  return normalized;
};

export const guessExtensionFromMime = (mime: string): string => {
  const normalized = mime.toLowerCase();
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return '.jpg';
  if (normalized.includes('webp')) return '.webp';
  if (normalized.includes('avif')) return '.avif';
  return '.png';
};

export const resolveSlotImagePath = (slot: ImageStudioSlotRecord): string | null =>
  asTrimmedString(slot.imageFile?.filepath) ?? asTrimmedString(slot.imageUrl) ?? null;

export const ensureRenderableSlot = (
  slot: ImageStudioSlotRecord | null | undefined,
  contextLabel: string
): ImageStudioSlotRecord => {
  if (!slot) {
    throw new Error(`${contextLabel}: Slot record not found.`);
  }
  return slot;
};
