export const compactString = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const coerceText = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  return compactString(String(value));
};

export const coerceRequiredText = (value: unknown, label: string): string => {
  const text = coerceText(value);
  if (text === null) {
    throw new Error(`${label} requires a text value.`);
  }
  return text;
};

export const coerceNumber = (value: unknown, label: string): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.trim().replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  throw new Error(`${label} requires a numeric value.`);
};

export const coerceBoolean = (value: unknown, label: string): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  throw new Error(`${label} requires a boolean value.`);
};

const parseJsonValue = (value: unknown, label: string): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error(`${label} requires valid JSON.`);
  }
};

const splitStringArrayText = (value: string): string[] =>
  value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

export const coerceStringArray = (value: unknown, label: string): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => coerceText(entry))
      .filter((entry): entry is string => entry !== null);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) return [];
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) return coerceStringArray(parsed, label);
    } catch {
      return splitStringArrayText(trimmed);
    }
    return splitStringArrayText(trimmed);
  }
  throw new Error(`${label} requires a list of text values.`);
};

export const coerceJsonArray = (value: unknown, label: string): unknown[] => {
  const parsed = parseJsonValue(value, label);
  if (!Array.isArray(parsed)) {
    throw new Error(`${label} requires a JSON array.`);
  }
  return parsed;
};

export const coerceJsonObject = (
  value: unknown,
  label: string
): Record<string, unknown> | null => {
  const parsed = parseJsonValue(value, label);
  if (parsed === null) return null;
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} requires a JSON object.`);
  }
  return parsed as Record<string, unknown>;
};

export const normalizeEnumValue = (value: unknown, label: string): string | null => {
  const text = coerceText(value);
  if (text === null) return null;
  if (text !== 'base') {
    throw new Error(`${label} only supports "base".`);
  }
  return text;
};

export const areValuesEqual = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

export const uniqueValues = <T>(values: T[]): T[] => {
  const seen = new Set<string>();
  const result: T[] = [];
  values.forEach((value) => {
    const key = JSON.stringify(value);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(value);
  });
  return result;
};

export const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
