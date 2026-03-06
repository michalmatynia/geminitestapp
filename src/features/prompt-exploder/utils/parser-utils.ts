type IdFactory = {
  next: () => string;
  reset: () => void;
};

export const createIdFactory = (prefix: string): IdFactory => {
  let count = 0;
  return {
    next: (): string => {
      count += 1;
      return `${prefix}_${count.toString(36)}`;
    },
    reset: (): void => {
      count = 0;
    },
  };
};

export const trimTrailingBlankLines = (value: string): string =>
  value.replace(/\n{3,}$/g, '\n\n').trimEnd();

export const normalizeMultiline = (value: string): string => value.replace(/\r\n/g, '\n');

export const containsLikelyHtmlMarkup = (value: string): boolean => /<\/?[a-z][^>]*>/i.test(value);

export const decodeHtmlEntities = (value: string): string => {
  const named: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (full, entity): string => {
    const normalized = String(entity ?? '')
      .trim()
      .toLowerCase();
    if (!normalized) return full;
    if (normalized.startsWith('#x')) {
      const code = Number.parseInt(normalized.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : full;
    }
    if (normalized.startsWith('#')) {
      const code = Number.parseInt(normalized.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : full;
    }
    return named[normalized] ?? full;
  });
};

export const normalizePromptSource = (value: string): string => {
  const normalized = normalizeMultiline(value ?? '');
  if (!containsLikelyHtmlMarkup(normalized)) {
    return normalized;
  }

  const plain = normalized
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|ul|ol|blockquote|section|article|tr|table)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '* ')
    .replace(/<[^>]+>/g, '');

  const decoded = decodeHtmlEntities(plain)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  return decoded.trim();
};
