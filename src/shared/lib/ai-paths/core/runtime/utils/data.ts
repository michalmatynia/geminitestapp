import { logClientError } from '@/shared/utils/observability/client-error-logger';

export const looksLikeObjectId = (value: unknown): boolean =>
  typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);

const IMAGE_URL_PATTERN = /(\.png|\.jpe?g|\.webp|\.gif|\.svg|\/uploads\/|^https?:\/\/)/i;
const IMAGE_HINT_KEYS = new Set([
  'file',
  'filepath',
  'image',
  'imagefile',
  'imagefileid',
  'imagefiles',
  'imagelink',
  'imagelinks',
  'imageurl',
  'imageurls',
  'images',
  'path',
  'preview',
  'previewurl',
  'src',
  'thumbnail',
  'thumbnailurl',
  'url',
]);

const dedupeUrls = (urls: string[]): string[] => Array.from(new Set(urls));

const isImageHintKey = (key: string): boolean => {
  const normalized = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return IMAGE_HINT_KEYS.has(normalized) || normalized.includes('image');
};

const extractFromString = (value: string, seen: Set<object>): string[] => {
  const trimmed = value.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return extractImageUrls(parsed, seen);
    } catch (error) {
      logClientError(error);
      return IMAGE_URL_PATTERN.test(value) ? [value] : [];
    }
  }
  return IMAGE_URL_PATTERN.test(value) ? [value] : [];
};

const extractFromRecord = (
  value: Record<string, unknown>,
  seen: Set<object>
): string[] => {
  const entries = Object.entries(value);
  const imageHintEntries = entries.filter(([key]) => isImageHintKey(key));
  const sourceEntries = imageHintEntries.length > 0 ? imageHintEntries : entries;
  return dedupeUrls(sourceEntries.flatMap(([, val]) => extractImageUrls(val, seen)));
};

export function extractImageUrls(value: unknown, seen: Set<object> = new Set<object>()): string[] {
  if (value === null || value === undefined) return [];
  if (typeof value === 'string') {
    return extractFromString(value, seen);
  }
  if (Array.isArray(value)) {
    return dedupeUrls(value.flatMap((item) => extractImageUrls(item, seen)));
  }
  if (typeof value !== 'object') return [];
  if (seen.has(value)) return [];
  seen.add(value);
  return extractFromRecord(value as Record<string, unknown>, seen);
}
