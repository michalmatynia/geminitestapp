export type MarketplaceCopyDebrandGeneratedCopy = {
  title: string | null;
  description: string | null;
};

const normalizeOptionalText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeComparableText = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

export const isMarketplaceCopyDebrandNonProductDescription = (value: unknown): boolean => {
  const text = normalizeOptionalText(value);
  if (text === null) return false;

  const normalized = normalizeComparableText(text);
  if (!normalized.includes('shipping')) return false;

  return (
    normalized.includes('auto assigned') ||
    normalized.includes('shipping group') ||
    normalized.includes('shipping rule') ||
    normalized.includes('shipping profile') ||
    normalized.includes('tradera listing')
  );
};

export const normalizeMarketplaceCopyDebrandSourceText = (value: unknown): string | null =>
  normalizeOptionalText(value);

export const normalizeMarketplaceCopyDebrandSourceDescription = (
  value: unknown
): string | null => {
  const text = normalizeOptionalText(value);
  if (text === null) return null;
  return isMarketplaceCopyDebrandNonProductDescription(text) ? null : text;
};

export const sanitizeMarketplaceCopyDebrandGeneratedCopy = (
  copy: MarketplaceCopyDebrandGeneratedCopy
): MarketplaceCopyDebrandGeneratedCopy => ({
  title: normalizeMarketplaceCopyDebrandSourceText(copy.title),
  description: normalizeMarketplaceCopyDebrandSourceDescription(copy.description),
});
