import { logClientError } from '@/shared/utils/observability/client-error-logger';

export const looksLikeObjectId = (value: unknown): boolean =>
  typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);

export function extractImageUrls(value: unknown, seen: Set<object> = new Set<object>()): string[] {
  if (!value) return [];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        return extractImageUrls(parsed, seen);
      } catch (error) {
        logClientError(error);
        return /(\.png|\.jpe?g|\.webp|\.gif|\.svg|\/uploads\/|^https?:\/\/)/i.test(value)
          ? [value]
          : [];
      }
    }
    return /(\.png|\.jpe?g|\.webp|\.gif|\.svg|\/uploads\/|^https?:\/\/)/i.test(value)
      ? [value]
      : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => extractImageUrls(item, seen));
  }
  if (typeof value === 'object' && value !== null) {
    if (seen.has(value)) return [];
    seen.add(value);
    return Object.values(value).flatMap((val) => extractImageUrls(val, seen));
  }
  return [];
}
