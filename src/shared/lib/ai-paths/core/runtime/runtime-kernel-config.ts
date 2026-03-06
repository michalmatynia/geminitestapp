import { isObjectRecord } from '@/shared/utils/object-utils';

const normalizeRuntimeKernelNodeTypeToken = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, '_');

const normalizeRuntimeKernelResolverIdToken = (value: string): string => value.trim();

const parseRuntimeKernelListValue = ({
  value,
  normalizeToken,
}: {
  value: unknown;
  normalizeToken: (token: string) => string;
}): string[] | undefined => {
  if (Array.isArray(value)) {
    const normalized = Array.from(
      new Set(
        value
          .filter((entry): entry is string => typeof entry === 'string')
          .map((entry: string): string => normalizeToken(entry))
          .filter(Boolean)
      )
    );
    return normalized.length > 0 ? normalized : undefined;
  }
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        const normalized = Array.from(
          new Set(
            parsed
              .filter((entry): entry is string => typeof entry === 'string')
              .map((entry: string): string => normalizeToken(entry))
              .filter(Boolean)
          )
        );
        return normalized.length > 0 ? normalized : undefined;
      }
    } catch {
      // Fall through to tokenized parsing.
    }
  }

  const normalized = Array.from(
    new Set(
      trimmed
        .split(/[,\n]/g)
        .map((entry: string): string => normalizeToken(entry))
        .filter(Boolean)
    )
  );
  return normalized.length > 0 ? normalized : undefined;
};

const matchesStringArray = (value: unknown, expected: string[]): boolean =>
  Array.isArray(value) &&
  value.length === expected.length &&
  value.every(
    (entry: unknown, index: number): boolean => typeof entry === 'string' && entry === expected[index]
  );

export const parseRuntimeKernelNodeTypes = (value: unknown): string[] | undefined =>
  parseRuntimeKernelListValue({
    value,
    normalizeToken: normalizeRuntimeKernelNodeTypeToken,
  });

export const parseRuntimeKernelCodeObjectResolverIds = (
  value: unknown
): string[] | undefined =>
  parseRuntimeKernelListValue({
    value,
    normalizeToken: normalizeRuntimeKernelResolverIdToken,
  });

export const parseRuntimeKernelStrictNativeRegistry = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on')
    return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off')
    return false;
  return undefined;
};

export const normalizeRuntimeKernelConfigRecord = (
  value: unknown
): Record<string, unknown> | null => {
  if (!isObjectRecord(value)) return null;

  let changed = false;
  const normalized: Record<string, unknown> = { ...value };

  const nodeTypes = parseRuntimeKernelNodeTypes(value['nodeTypes'] ?? value['pilotNodeTypes']);
  if (nodeTypes) {
    if (!matchesStringArray(value['nodeTypes'], nodeTypes)) {
      normalized['nodeTypes'] = nodeTypes;
      changed = true;
    }
  } else if ('nodeTypes' in normalized) {
    delete normalized['nodeTypes'];
    changed = true;
  }
  if ('pilotNodeTypes' in normalized) {
    delete normalized['pilotNodeTypes'];
    changed = true;
  }

  const resolverIds = parseRuntimeKernelCodeObjectResolverIds(
    value['codeObjectResolverIds'] ?? value['resolverIds']
  );
  if (resolverIds) {
    if (!matchesStringArray(value['codeObjectResolverIds'], resolverIds)) {
      normalized['codeObjectResolverIds'] = resolverIds;
      changed = true;
    }
  } else if ('codeObjectResolverIds' in normalized) {
    delete normalized['codeObjectResolverIds'];
    changed = true;
  }
  if ('resolverIds' in normalized) {
    delete normalized['resolverIds'];
    changed = true;
  }

  const strictNativeRegistry = parseRuntimeKernelStrictNativeRegistry(
    value['strictNativeRegistry'] ?? value['strictCodeObjectRegistry']
  );
  if (strictNativeRegistry !== undefined) {
    if (value['strictNativeRegistry'] !== strictNativeRegistry) {
      normalized['strictNativeRegistry'] = strictNativeRegistry;
      changed = true;
    }
  } else if ('strictNativeRegistry' in normalized) {
    delete normalized['strictNativeRegistry'];
    changed = true;
  }
  if ('strictCodeObjectRegistry' in normalized) {
    delete normalized['strictCodeObjectRegistry'];
    changed = true;
  }

  return changed ? normalized : value;
};
