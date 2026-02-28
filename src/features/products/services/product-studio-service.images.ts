import { asRecord, trimString } from './product-studio-service.helpers';

export type ProductImageFileSource = {
  id: string;
  filepath: string;
  filename: string | null;
  mimetype: string | null;
};

export const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
};

export const DATA_URL_REGEX = /^data:([^;]+);base64,(.+)$/i;

export const toProductImageFileSource = (value: unknown): ProductImageFileSource | null => {
  const record = asRecord(value);
  if (!record) return null;

  const id = trimString(record['id']);
  const filepath = trimString(record['filepath']);
  if (!id || !filepath) return null;

  return {
    id,
    filepath,
    filename: trimString(record['filename']),
    mimetype: trimString(record['mimetype']),
  };
};
