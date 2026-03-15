import { logClientError } from '@/shared/utils/observability/client-error-logger';
export const toNumber = (value: string, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function safeStringify(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (error) {
      logClientError(error);
      return '[Complex Object]';
    }
  }
  if (typeof value === 'symbol' || typeof value === 'function') {
    return value.toString();
  }
  return String(value as string);
}

const normalizeForJsonClone = (value: unknown): unknown => {
  const ancestors: object[] = [];
  const replacer = function (this: unknown, _key: string, val: unknown): unknown {
    if (typeof val === 'bigint') return val.toString();
    if (val instanceof Date) return val.toISOString();
    if (val instanceof Set) return Array.from(val.values()) as unknown[];
    if (val instanceof Map) return Object.fromEntries(val.entries()) as Record<string, unknown>;
    if (typeof val === 'function' || typeof val === 'symbol') return undefined;
    if (!val || typeof val !== 'object') return val;

    while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) {
      ancestors.pop();
    }
    if (ancestors.includes(val)) return undefined;
    ancestors.push(val);
    return val;
  };

  return JSON.parse(JSON.stringify(value, replacer)) as unknown;
};

export const cloneJsonSafe = <T>(value: T): T | null => {
  try {
    return normalizeForJsonClone(value) as T;
  } catch (error) {
    logClientError(error);
    return null;
  }
};

export const safeJsonStringify = (value: unknown): string => {
  try {
    return JSON.stringify(normalizeForJsonClone(value)) ?? '';
  } catch (error) {
    logClientError(error);
    return '';
  }
};

const normalizeForHash = (value: unknown, seen: WeakSet<object>): unknown => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : String(value);
  }
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'symbol' || typeof value === 'function') {
    return `[${typeof value}]`;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.map((item: unknown) => {
      const normalized = normalizeForHash(item, seen);
      return normalized === undefined ? null : normalized;
    });
  }
  if (value instanceof Map) {
    const entries = Array.from(value.entries()).map(([key, val]: [unknown, unknown]) => {
      const normalizedKey = normalizeForHash(key, new WeakSet<object>());
      const keyString =
        typeof key === 'string' ? key : (JSON.stringify(normalizedKey) ?? String(key));
      return [keyString, normalizeForHash(val, seen)] as [string, unknown];
    });
    entries.sort((a: [string, unknown], b: [string, unknown]) => a[0].localeCompare(b[0]));
    return entries;
  }
  if (value instanceof Set) {
    const entries = Array.from(value.values()).map((item: unknown) => normalizeForHash(item, seen));
    const keyed = entries.map((entry: unknown) => ({
      key: JSON.stringify(entry ?? null),
      value: entry ?? null,
    }));
    keyed.sort((a: { key: string }, b: { key: string }) => a.key.localeCompare(b.key));
    return keyed.map((item: { value: unknown }) => item.value);
  }
  if (typeof value === 'object') {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const normalized: Record<string, unknown> = {};
    keys.forEach((key: string): void => {
      const next = normalizeForHash(record[key], seen);
      if (next !== undefined) normalized[key] = next;
    });
    return normalized;
  }
  return String(value as string | number | boolean | symbol | bigint);
};

export const stableStringify = (value: unknown): string => {
  try {
    const normalized = normalizeForHash(value, new WeakSet<object>());
    if (normalized === undefined) return '';
    return JSON.stringify(normalized) ?? '';
  } catch (error) {
    logClientError(error);
    return '';
  }
};

export const hashString = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

export const hashRuntimeValue = (value: unknown): string => hashString(stableStringify(value));

export const formatRuntimeValue = (value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value.trim() || '—';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    const json = JSON.stringify(value, null, 2);
    if (json.length > 400) return `${json.slice(0, 400)}…`;
    return json;
  } catch (error) {
    logClientError(error);
    return '[Complex Object]';
  }
};

export const parsePathList = (value: string): string[] =>
  value
    .split('\n')
    .map((line: string) => line.trim())
    .filter(Boolean);

export const safeParseJson = <T = unknown>(value: string): { value: T; error: string } => {
  if (!value.trim()) return { value: null as T, error: '' };
  try {
    return { value: JSON.parse(value) as T, error: '' };
  } catch (error) {
    logClientError(error);
    return { value: null as T, error: 'Invalid JSON' };
  }
};

export const cloneValue = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch (error) {
    logClientError(error);
    return value;
  }
};

export const parseJsonSafe = (value: string): unknown => {
  if (!value.trim()) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch (error) {
    logClientError(error);
    return undefined;
  }
};

export const coerceInput = <T>(value: T | T[] | undefined): T | undefined =>
  Array.isArray(value) ? value[0] : value;

export const coerceInputArray = <T>(value: T | T[] | undefined): T[] =>
  Array.isArray(value) ? value : value === undefined ? [] : [value];

export const appendInputValue = (current: unknown, value: unknown): unknown => {
  if (current === undefined) return value;
  if (Array.isArray(current)) return [...(current as unknown[]), value];
  return [current, value];
};
