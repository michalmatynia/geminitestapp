import { isObjectRecord } from '@/shared/utils/object-utils';
import {
  DEPRECATED_RUNTIME_KERNEL_CONFIG_MODE_FIELD,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_NODE_TYPES_FIELD,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_RESOLVER_IDS_FIELD,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_ALIAS_FIELD,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_NATIVE_FIELD,
} from './runtime-kernel-legacy-aliases';

export type RuntimeKernelConfigNormalizedField =
  | 'mode'
  | 'nodeTypes'
  | 'codeObjectResolverIds'
  | 'strictNativeRegistry';

export type RuntimeKernelValueSource = 'env' | 'path' | 'settings' | 'default';

export type NormalizeRuntimeKernelConfigRecordOptions = {
  translateLegacyAliases?: boolean;
};

export type NormalizeRuntimeKernelConfigRecordResult = {
  changed: boolean;
  value: Record<string, unknown>;
  changedFields: RuntimeKernelConfigNormalizedField[];
};

export const normalizeRuntimeKernelNodeTypeToken = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, '_');

export const normalizeRuntimeKernelResolverIdToken = (value: string): string => value.trim();

export const parseRuntimeKernelListValue = ({
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
    (entry: unknown, index: number): boolean =>
      typeof entry === 'string' && entry === expected[index]
  );

const appendChangedField = (
  changedFields: RuntimeKernelConfigNormalizedField[],
  field: RuntimeKernelConfigNormalizedField
): void => {
  if (!changedFields.includes(field)) {
    changedFields.push(field);
  }
};

export const normalizeRuntimeKernelValueSource = (
  value: unknown
): RuntimeKernelValueSource | null =>
  value === 'env' || value === 'path' || value === 'settings' || value === 'default' ? value : null;

export const parseRuntimeKernelNodeTypes = (value: unknown): string[] | undefined =>
  parseRuntimeKernelListValue({
    value,
    normalizeToken: normalizeRuntimeKernelNodeTypeToken,
  });

export const parseRuntimeKernelCodeObjectResolverIds = (value: unknown): string[] | undefined =>
  parseRuntimeKernelListValue({
    value,
    normalizeToken: normalizeRuntimeKernelResolverIdToken,
  });

export const normalizeRuntimeKernelConfigRecordDetailed = (
  value: unknown,
  options?: NormalizeRuntimeKernelConfigRecordOptions
): NormalizeRuntimeKernelConfigRecordResult | null => {
  if (!isObjectRecord(value)) return null;

  const translateLegacyAliases = options?.translateLegacyAliases ?? false;
  const normalized: Record<string, unknown> = { ...value };
  const changedFields: RuntimeKernelConfigNormalizedField[] = [];

  if (DEPRECATED_RUNTIME_KERNEL_CONFIG_MODE_FIELD in normalized) {
    delete normalized[DEPRECATED_RUNTIME_KERNEL_CONFIG_MODE_FIELD];
    appendChangedField(changedFields, 'mode');
  }

  const nodeTypes = parseRuntimeKernelNodeTypes(
    translateLegacyAliases
      ? (value['nodeTypes'] ?? value[DEPRECATED_RUNTIME_KERNEL_CONFIG_NODE_TYPES_FIELD])
      : value['nodeTypes']
  );
  if (nodeTypes) {
    if (!matchesStringArray(value['nodeTypes'], nodeTypes)) {
      normalized['nodeTypes'] = nodeTypes;
      appendChangedField(changedFields, 'nodeTypes');
    }
  } else if ('nodeTypes' in normalized) {
    delete normalized['nodeTypes'];
    appendChangedField(changedFields, 'nodeTypes');
  }
  if (DEPRECATED_RUNTIME_KERNEL_CONFIG_NODE_TYPES_FIELD in normalized) {
    delete normalized[DEPRECATED_RUNTIME_KERNEL_CONFIG_NODE_TYPES_FIELD];
    appendChangedField(changedFields, 'nodeTypes');
  }

  const resolverIds = parseRuntimeKernelCodeObjectResolverIds(
    translateLegacyAliases
      ? (value['codeObjectResolverIds'] ??
          value[DEPRECATED_RUNTIME_KERNEL_CONFIG_RESOLVER_IDS_FIELD])
      : value['codeObjectResolverIds']
  );
  if (resolverIds) {
    if (!matchesStringArray(value['codeObjectResolverIds'], resolverIds)) {
      normalized['codeObjectResolverIds'] = resolverIds;
      appendChangedField(changedFields, 'codeObjectResolverIds');
    }
  } else if ('codeObjectResolverIds' in normalized) {
    delete normalized['codeObjectResolverIds'];
    appendChangedField(changedFields, 'codeObjectResolverIds');
  }
  if (DEPRECATED_RUNTIME_KERNEL_CONFIG_RESOLVER_IDS_FIELD in normalized) {
    delete normalized[DEPRECATED_RUNTIME_KERNEL_CONFIG_RESOLVER_IDS_FIELD];
    appendChangedField(changedFields, 'codeObjectResolverIds');
  }

  if (DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_NATIVE_FIELD in normalized) {
    delete normalized[DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_NATIVE_FIELD];
    appendChangedField(changedFields, 'strictNativeRegistry');
  }
  if (DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_ALIAS_FIELD in normalized) {
    delete normalized[DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_ALIAS_FIELD];
    appendChangedField(changedFields, 'strictNativeRegistry');
  }

  return {
    changed: changedFields.length > 0,
    value: changedFields.length > 0 ? normalized : value,
    changedFields,
  };
};

export const normalizeRuntimeKernelConfigRecord = (
  value: unknown,
  options?: NormalizeRuntimeKernelConfigRecordOptions
): Record<string, unknown> | null => {
  const normalized = normalizeRuntimeKernelConfigRecordDetailed(value, options);
  return normalized?.value ?? null;
};
