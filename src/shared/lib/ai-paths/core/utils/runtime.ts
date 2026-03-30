import { reportObservabilityInternalError } from '@/shared/utils/observability/internal-observability-fallback';

const reportRuntimeUtilsError = (
  error: unknown,
  action: string,
  context?: Record<string, unknown>
): void => {
  reportObservabilityInternalError(error, {
    source: 'ai-paths.core.runtime-utils',
    action,
    ...(context ?? {}),
  });
};

export const toNumber = (value: string, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const stringifyComplexObject = (value: object): string => {
  try {
    return JSON.stringify(value);
  } catch (error) {
    reportRuntimeUtilsError(error, 'safeStringify', {
      valueType: typeof value,
    });
    return '[Complex Object]';
  }
};

const stringifyNonObjectRuntimeValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'symbol' || typeof value === 'function') {
    return value.toString();
  }
  return String(value as string);
};

export function safeStringify(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return stringifyComplexObject(value);
  return stringifyNonObjectRuntimeValue(value);
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
    reportRuntimeUtilsError(error, 'cloneJsonSafe');
    return null;
  }
};

export const safeJsonStringify = (value: unknown): string => {
  try {
    return JSON.stringify(normalizeForJsonClone(value)) ?? '';
  } catch (error) {
    reportRuntimeUtilsError(error, 'safeJsonStringify');
    return '';
  }
};

const NON_PRIMITIVE_HASH_VALUE = Symbol('non-primitive-hash-value');

const normalizePrimitiveForHash = (value: unknown): unknown | typeof NON_PRIMITIVE_HASH_VALUE => {
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
  return NON_PRIMITIVE_HASH_VALUE;
};

const normalizeHashArrayEntry = (value: unknown, seen: WeakSet<object>): unknown => {
  const normalized = normalizeForHash(value, seen);
  return normalized === undefined ? null : normalized;
};

const normalizeArrayForHash = (value: readonly unknown[], seen: WeakSet<object>): unknown[] =>
  value.map((item: unknown) => normalizeHashArrayEntry(item, seen));

const normalizeMapKeyForHash = (key: unknown): string => {
  const normalizedKey = normalizeForHash(key, new WeakSet<object>());
  return typeof key === 'string' ? key : (JSON.stringify(normalizedKey) ?? String(key));
};

const normalizeMapForHash = (
  value: Map<unknown, unknown>,
  seen: WeakSet<object>
): [string, unknown][] => {
  const entries = Array.from(value.entries()).map(
    ([key, val]: [unknown, unknown]): [string, unknown] => [
      normalizeMapKeyForHash(key),
      normalizeForHash(val, seen),
    ]
  );
  entries.sort((a: [string, unknown], b: [string, unknown]) => a[0].localeCompare(b[0]));
  return entries;
};

const normalizeSetForHash = (value: Set<unknown>, seen: WeakSet<object>): unknown[] => {
  const keyedEntries = Array.from(value.values()).map((item: unknown) => {
    const normalized = normalizeForHash(item, seen) ?? null;
    return {
      key: JSON.stringify(normalized),
      value: normalized,
    };
  });
  keyedEntries.sort((a: { key: string }, b: { key: string }) => a.key.localeCompare(b.key));
  return keyedEntries.map((item: { value: unknown }) => item.value);
};

const normalizeObjectForHash = (
  value: Record<string, unknown>,
  seen: WeakSet<object>
): Record<string, unknown> | '[Circular]' => {
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  const normalized: Record<string, unknown> = {};
  Object.keys(value)
    .sort()
    .forEach((key: string): void => {
      const next = normalizeForHash(value[key], seen);
      if (next !== undefined) normalized[key] = next;
    });
  return normalized;
};

const normalizeForHash = (value: unknown, seen: WeakSet<object>): unknown => {
  const primitive = normalizePrimitiveForHash(value);
  if (primitive !== NON_PRIMITIVE_HASH_VALUE) return primitive;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return normalizeArrayForHash(value, seen);
  if (value instanceof Map) return normalizeMapForHash(value, seen);
  if (value instanceof Set) return normalizeSetForHash(value, seen);
  if (value && typeof value === 'object') {
    return normalizeObjectForHash(value as Record<string, unknown>, seen);
  }
  return primitive;
};

export const stableStringify = (value: unknown): string => {
  try {
    const normalized = normalizeForHash(value, new WeakSet<object>());
    if (normalized === undefined) return '';
    return JSON.stringify(normalized) ?? '';
  } catch (error) {
    reportRuntimeUtilsError(error, 'stableStringify');
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
    reportRuntimeUtilsError(error, 'formatRuntimeValue');
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
    reportRuntimeUtilsError(error, 'safeParseJson', {
      valueLength: value.length,
    });
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
    reportRuntimeUtilsError(error, 'cloneValue');
    return value;
  }
};

export const parseJsonSafe = (value: string): unknown => {
  if (!value.trim()) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch (error) {
    reportRuntimeUtilsError(error, 'parseJsonSafe', {
      valueLength: value.length,
    });
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
