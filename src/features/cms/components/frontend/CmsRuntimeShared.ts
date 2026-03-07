import { isObjectRecord } from '@/shared/utils/object-utils';

export type CmsRuntimeSources = Record<string, unknown>;
export type CmsRuntimeAction = (...args: unknown[]) => void;

export type CmsRuntimeContextValue = {
  sources: CmsRuntimeSources;
};

type CmsConnectionSettings = {
  enabled?: boolean;
  fallback?: string;
  path?: string;
  source?: string;
  targetKey?: string;
};

const CONNECTION_TARGET_BY_TYPE: Record<string, string> = {
  Button: 'buttonLabel',
  ButtonElement: 'buttonLabel',
  Heading: 'headingText',
  Image: 'src',
  ImageElement: 'src',
  Input: 'inputValue',
  Progress: 'progressValue',
  Text: 'textContent',
  TextAtom: 'text',
  TextAtomLetter: 'textContent',
  TextElement: 'textContent',
};

const normalizeSource = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizePath = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const hasRuntimeValue = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return true;
};

const toComparableString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return '';
};

const toConnectedString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return null;
};

const toConnectedNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const toConnectedValue = (type: string, value: unknown): string | number | null => {
  if (type === 'Progress') {
    return toConnectedNumber(value);
  }

  return toConnectedString(value);
};

const resolvePathValue = (input: unknown, path: string): unknown => {
  const normalizedPath = path.trim();
  if (!normalizedPath) {
    return input;
  }

  return normalizedPath.split('.').reduce<unknown>((current: unknown, rawSegment: string) => {
    const segment = rawSegment.trim();
    if (!segment) {
      return current;
    }

    if (Array.isArray(current)) {
      const index = Number.parseInt(segment, 10);
      if (Number.isNaN(index) || index < 0 || index >= current.length) {
        return undefined;
      }
      return current[index];
    }

    if (!isObjectRecord(current)) {
      return undefined;
    }

    return current[segment];
  }, input);
};

export function resolveCmsRuntimeValue(
  runtime: CmsRuntimeContextValue | null,
  source: unknown,
  path: unknown
): unknown {
  if (!runtime) {
    return undefined;
  }

  const normalizedSource = normalizeSource(source);
  const normalizedPath = normalizePath(path);
  const baseValue =
    normalizedSource.length > 0 ? runtime.sources[normalizedSource] : runtime.sources;

  return resolvePathValue(baseValue, normalizedPath);
}

export function resolveCmsRuntimeAction(
  runtime: CmsRuntimeContextValue | null,
  source: unknown,
  path: unknown
): CmsRuntimeAction | null {
  const action = resolveCmsRuntimeValue(runtime, source, path);
  return typeof action === 'function' ? (action as CmsRuntimeAction) : null;
}

export function resolveCmsRuntimeCollection(
  runtime: CmsRuntimeContextValue | null,
  source: unknown,
  path: unknown
): unknown[] {
  const value = resolveCmsRuntimeValue(runtime, source, path);
  return Array.isArray(value) ? value : [];
}

export function isCmsNodeVisible(
  settings: Record<string, unknown>,
  runtime: CmsRuntimeContextValue | null
): boolean {
  const mode =
    typeof settings['runtimeVisibilityMode'] === 'string'
      ? settings['runtimeVisibilityMode']
      : 'always';

  if (mode === 'always') {
    return true;
  }

  if (!runtime) {
    return true;
  }

  const source = settings['runtimeVisibilitySource'];
  const path = settings['runtimeVisibilityPath'];
  const resolvedValue = resolveCmsRuntimeValue(runtime, source, path);

  switch (mode) {
    case 'truthy':
      return Boolean(resolvedValue);
    case 'falsy':
      return !resolvedValue;
    case 'equals': {
      const expected = toComparableString(settings['runtimeVisibilityValue']);
      if (!expected) {
        return true;
      }
      return toComparableString(resolvedValue) === expected;
    }
    case 'not-equals': {
      const expected = toComparableString(settings['runtimeVisibilityValue']);
      if (!expected) {
        return true;
      }
      return toComparableString(resolvedValue) !== expected;
    }
    default:
      return true;
  }
}

export function resolveCmsConnectedSettings(
  type: string,
  settings: Record<string, unknown>,
  runtime: CmsRuntimeContextValue | null
): Record<string, unknown> {
  const rawConnection = settings['connection'];
  if (!isObjectRecord(rawConnection) || rawConnection['enabled'] !== true || !runtime) {
    return settings;
  }

  const connection = rawConnection as CmsConnectionSettings;
  const targetKey =
    typeof connection.targetKey === 'string' && connection.targetKey.trim().length > 0
      ? connection.targetKey.trim()
      : CONNECTION_TARGET_BY_TYPE[type];

  if (!targetKey) {
    return settings;
  }

  const resolvedValue = resolveCmsRuntimeValue(runtime, connection.source, connection.path);
  const nextValue = hasRuntimeValue(resolvedValue)
    ? toConnectedValue(type, resolvedValue)
    : typeof connection.fallback === 'string'
      ? toConnectedValue(type, connection.fallback)
      : null;

  if (nextValue === null) {
    return settings;
  }

  return {
    ...settings,
    [targetKey]: nextValue,
  };
}
