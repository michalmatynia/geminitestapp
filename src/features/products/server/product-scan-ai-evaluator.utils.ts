import 'server-only';

export const readOptionalString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

export const normalizeTextList = (values: Array<string | null | undefined>): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    const next = readOptionalString(value);
    if (next === null || seen.has(next) === true) continue;
    seen.add(next);
    normalized.push(next);
  }
  return normalized;
};

export const parseStructuredJsonResponse = (content: string): unknown => {
  const trimmed = content.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const normalized = (fencedMatch?.[1] ?? trimmed).trim();

  try {
    return JSON.parse(normalized) as unknown;
  } catch (error) {
    const objectStart = normalized.indexOf('{');
    const objectEnd = normalized.lastIndexOf('}');
    if (objectStart !== -1 && objectEnd > objectStart) {
      return JSON.parse(normalized.slice(objectStart, objectEnd + 1)) as unknown;
    }

    const arrayStart = normalized.indexOf('[');
    const arrayEnd = normalized.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd > arrayStart) {
      return JSON.parse(normalized.slice(arrayStart, arrayEnd + 1)) as unknown;
    }

    throw error;
  }
};

export const normalizeIdentifier = (value: unknown): string | null => {
  const raw = readOptionalString(value);
  return raw !== null ? raw.replace(/\s+/g, '').toUpperCase() : null;
};

export const extractAmazonAsinFromUrl = (value: string | null | undefined): string | null => {
  const normalized = readOptionalString(value);
  if (normalized === null) return null;
  const match = normalized
    .toUpperCase()
    .match(/(?:\/DP\/|\/GP\/PRODUCT\/|\/GP\/AW\/D\/|\/PRODUCT\/|ASIN=)([A-Z0-9]{10})(?:[/?#&]|$)/i);
  return match?.[1] ?? null;
};
