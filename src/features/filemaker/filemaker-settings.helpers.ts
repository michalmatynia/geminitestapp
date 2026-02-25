export const normalizeString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value.trim() : fallback;

export const toIdToken = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/g, '')
    .replace(/-+$/g, '');

export const ensureUniqueId = (
  candidate: string,
  usedIds: Set<string>,
  fallbackPrefix: string
): string => {
  const normalizedCandidate = normalizeString(candidate);
  const base = normalizedCandidate || fallbackPrefix;
  if (!usedIds.has(base)) return base;
  let index = 2;
  while (usedIds.has(`${base}-${index}`)) {
    index += 1;
  }
  return `${base}-${index}`;
};

export const normalizePhoneNumbers = (value: unknown): string[] => {
  const unique = new Set<string>();

  if (Array.isArray(value)) {
    value.forEach((entry: unknown) => {
      const normalized = normalizeString(entry);
      if (!normalized) return;
      unique.add(normalized);
    });
    return Array.from(unique);
  }

  if (typeof value === 'string') {
    value
      .split(',')
      .map((entry: string) => entry.trim())
      .forEach((entry: string): void => {
        if (!entry) return;
        unique.add(entry);
      });
    return Array.from(unique);
  }

  return [];
};

export const sanitizePhoneCandidate = (value: string): string => {
  let current = value.trim().replace(/^tel:\s*/i, '');
  if (!current) return '';

  current = current.replace(/(?:ext\.?|extension|x)\s*[:.]?\s*\d+$/i, '').trim();
  if (!current) return '';

  const hasInternationalPrefix = current.startsWith('+') || current.startsWith('00');
  const digits = current.replace(/\D+/g, '');
  if (!digits) return '';

  if (hasInternationalPrefix) {
    const withoutPrefix = current.startsWith('00')
      ? digits.replace(/^00/, '')
      : digits;
    return withoutPrefix ? `+${withoutPrefix}` : '';
  }
  return digits;
};
