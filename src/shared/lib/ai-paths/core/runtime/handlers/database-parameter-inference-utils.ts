import { getValueAtMappingPath, parseJsonSafe } from '../../utils';

export type ParameterDefinitionRecord = {
  id: string;
  selectorType: string;
  optionLabels: string[];
};

export const SELECTOR_TYPES_REQUIRING_OPTIONS = new Set<string>([
  'radio',
  'select',
  'dropdown',
  'checklist',
]);

export const MULTI_VALUE_DELIMITER = '|';

export const normalizeNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizeValueTokenCase = (value: string): string => {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (!compact) return '';

  const hasLowerCaseLetters = compact !== compact.toLocaleUpperCase();
  const hasUpperCaseLetters = compact !== compact.toLocaleLowerCase();
  if (hasLowerCaseLetters && hasUpperCaseLetters) {
    return compact;
  }

  return compact.replace(/\p{L}[\p{L}\p{M}]*/gu, (token: string): string => {
    if (token.length <= 3 && token === token.toLocaleUpperCase()) {
      return token;
    }
    const letters = Array.from(token);
    const first = letters[0] ?? '';
    const rest = letters.slice(1).join('');
    return `${first.toLocaleUpperCase()}${rest.toLocaleLowerCase()}`;
  });
};

export const normalizeMultiValueDelimiter = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const tokens = trimmed
    .split(/\s*\|\s*|\s*;\s*|\s*\r?\n+\s*|\s*,\s*/)
    .map((entry: string) => normalizeValueTokenCase(entry))
    .filter(Boolean);
  if (tokens.length <= 1) {
    return tokens[0] ?? normalizeValueTokenCase(trimmed);
  }
  const seen = new Set<string>();
  const canonicalTokens: string[] = [];
  tokens.forEach((entry: string) => {
    const key = entry.toLocaleLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    canonicalTokens.push(entry);
  });
  return canonicalTokens.join(MULTI_VALUE_DELIMITER);
};

export const parseChecklistValues = (value: string): string[] => {
  const seen = new Set<string>();
  return value
    .split(/[|,;\n]/)
    .map((entry: string) => entry.trim())
    .filter((entry: string) => {
      if (!entry) return false;
      const key = entry.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export const coerceArrayLike = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const nested = record['items'] ?? record['rows'] ?? record['results'] ?? record['data'];
    if (Array.isArray(nested)) return nested;
  }
  if (typeof value === 'string') {
    const parsed = parseJsonSafe(value);
    if (Array.isArray(parsed)) return parsed;
    return [];
  }
  return [];
};

export const resolveParameterValue = (value: unknown): string | null => {
  if (typeof value === 'string') return normalizeNonEmptyString(value);
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const resolved = resolveParameterValue(item);
      if (resolved) return resolved;
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const direct =
    resolveParameterValue(record['value']) ??
    resolveParameterValue(record['value_en']) ??
    resolveParameterValue(record['en']) ??
    resolveParameterValue(record['english']) ??
    resolveParameterValue(record['label']);
  if (direct) return direct;
  const valuesByLanguage = record['valuesByLanguage'];
  if (valuesByLanguage && typeof valuesByLanguage === 'object') {
    const localized = valuesByLanguage as Record<string, unknown>;
    return (
      resolveParameterValue(localized['en']) ??
      resolveParameterValue(localized['en-US']) ??
      resolveParameterValue(localized['english']) ??
      null
    );
  }
  return null;
};

export const resolveChecklistValue = (raw: unknown): string | null => {
  const arrayLike = coerceArrayLike(raw)
    .map((entry: unknown): string | null => normalizeNonEmptyString(entry))
    .filter((entry: string | null): entry is string => Boolean(entry));
  if (arrayLike.length > 0) {
    return normalizeMultiValueDelimiter(arrayLike.join(MULTI_VALUE_DELIMITER));
  }
  const resolved = resolveParameterValue(raw);
  return resolved ? normalizeMultiValueDelimiter(resolved) : null;
};

export const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

export const resolveObjectPathValue = (
  source: Record<string, unknown> | null,
  path: string
): unknown => {
  if (!source) return undefined;
  if (!path) return undefined;
  if (Object.prototype.hasOwnProperty.call(source, path)) {
    return source[path];
  }
  return getValueAtMappingPath(source, path);
};

export const coerceParameterInferenceCandidates = (
  value: unknown
): { candidates: unknown[]; repaired: boolean } => {
  if (Array.isArray(value)) {
    return { candidates: value, repaired: false };
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const nested = coerceArrayLike(value);
    if (nested.length > 0) {
      return { candidates: nested, repaired: false };
    }
  }
  if (typeof value !== 'string') {
    return { candidates: [], repaired: false };
  }
  const direct = parseJsonSafe(value);
  if (Array.isArray(direct)) {
    return { candidates: direct, repaired: false };
  }
  const openIndex = value.indexOf('[');
  const closeIndex = value.lastIndexOf(']');
  if (openIndex < 0 || closeIndex <= openIndex) {
    return { candidates: [], repaired: false };
  }
  const repairedCandidate = value.slice(openIndex, closeIndex + 1);
  const repaired = parseJsonSafe(repairedCandidate);
  if (Array.isArray(repaired)) {
    return { candidates: repaired, repaired: true };
  }
  return { candidates: [], repaired: false };
};

export const resolveParameterDefinitionRows = (
  definitionsValue: unknown,
  definitionsPath: string
): unknown[] => {
  let source: unknown = definitionsValue;
  if (definitionsPath && source && typeof source === 'object' && !Array.isArray(source)) {
    const resolved = getValueAtMappingPath(source, definitionsPath);
    source = resolved ?? source;
  }
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    const nested =
      (source as Record<string, unknown>)['items'] ??
      (source as Record<string, unknown>)['rows'] ??
      (source as Record<string, unknown>)['results'] ??
      (source as Record<string, unknown>)['data'];
    if (Array.isArray(nested)) return nested;
  }
  return coerceArrayLike(source);
};

export const normalizeParameterDefinitions = (
  definitionsValue: unknown,
  definitionsPath: string
): Map<string, ParameterDefinitionRecord> => {
  const map = new Map<string, ParameterDefinitionRecord>();
  const rows = resolveParameterDefinitionRows(definitionsValue, definitionsPath);
  rows.forEach((row: unknown) => {
    if (!row || typeof row !== 'object') return;
    const record = row as Record<string, unknown>;
    const id =
      normalizeNonEmptyString(record['id']) ??
      normalizeNonEmptyString(record['_id']) ??
      normalizeNonEmptyString(record['parameterId']);
    if (!id) return;
    const selectorType = normalizeNonEmptyString(record['selectorType'])?.toLowerCase() ?? 'text';
    const optionLabels = coerceArrayLike(record['optionLabels'])
      .map((option: unknown): string | null => normalizeNonEmptyString(option))
      .filter((option: string | null): option is string => Boolean(option));
    map.set(id, {
      id,
      selectorType,
      optionLabels,
    });
  });
  return map;
};
