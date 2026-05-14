import type { ImageFileSelection } from '@/shared/contracts/files';

const FASTCOMET_UPLOAD_HOSTS = new Set(['sparksofsindri.com', 'www.sparksofsindri.com']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const readTrimmedText = (value: unknown): string | null => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed.length > 0 ? trimmed : null;
};

const parseUrl = (value: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const hasFastCometUploadPath = (pathname: string): boolean =>
  pathname.startsWith('/uploads/') || pathname.startsWith('/public/uploads/');

export const isFastCometUploadUrl = (value: unknown): boolean => {
  const candidate = readTrimmedText(value);
  if (candidate === null) return false;

  const parsed = parseUrl(candidate);
  if (parsed === null) return false;
  if (!FASTCOMET_UPLOAD_HOSTS.has(parsed.hostname.toLowerCase())) return false;
  return hasFastCometUploadPath(parsed.pathname);
};

const hasFastCometMetadata = (imageFile: ImageFileSelection): boolean => {
  const metadata = imageFile.metadata;
  return isRecord(metadata) && metadata['storageSource'] === 'fastcomet';
};

const hasFastCometUrlField = (imageFile: ImageFileSelection): boolean =>
  [
    imageFile.filepath,
    imageFile.publicUrl,
    imageFile.url,
    imageFile.thumbnailUrl,
  ].some(isFastCometUploadUrl);

export const isFastCometImageFile = (
  imageFile: ImageFileSelection | null | undefined
): boolean => {
  if (imageFile === null || imageFile === undefined) return false;
  if (imageFile.storageProvider === 'fastcomet') return true;
  if (hasFastCometMetadata(imageFile)) return true;
  return hasFastCometUrlField(imageFile);
};
