import { isObjectRecord } from '@/shared/utils/object-utils';

import {
  DEPRECATED_RUNTIME_KERNEL_CONFIG_MODE_FIELD,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_NODE_TYPES_FIELD,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_RESOLVER_IDS_FIELD,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_ALIAS_FIELD,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_NATIVE_FIELD,
} from './runtime-kernel-legacy-aliases';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export type RuntimeKernelConfigNormalizedField =
  | 'mode'
  | 'nodeTypes'
  | 'codeObjectResolverIds'
  | 'strictNativeRegistry';

export type RuntimeKernelValueSource = 'env' | 'path' | 'settings' | 'default';

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
    } catch (error) {
      logClientError(error);

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

const removeDeprecatedRuntimeKernelField = (
  normalized: Record<string, unknown>,
  field: string,
  changedFields: RuntimeKernelConfigNormalizedField[],
  changedField: RuntimeKernelConfigNormalizedField
): void => {
  if (!(field in normalized)) return;
  delete normalized[field];
  appendChangedField(changedFields, changedField);
};

const normalizeRuntimeKernelListField = (args: {
  sourceValue: Record<string, unknown>;
  normalized: Record<string, unknown>;
  changedFields: RuntimeKernelConfigNormalizedField[];
  canonicalField: 'nodeTypes' | 'codeObjectResolverIds';
  legacyField: string;
  changedField: Extract<
    RuntimeKernelConfigNormalizedField,
    'nodeTypes' | 'codeObjectResolverIds'
  >;
  parseValue: (value: unknown) => string[] | undefined;
}): void => {
  const nextValue = args.parseValue(args.sourceValue[args.canonicalField]);

  if (nextValue) {
    if (!matchesStringArray(args.sourceValue[args.canonicalField], nextValue)) {
      args.normalized[args.canonicalField] = nextValue;
      appendChangedField(args.changedFields, args.changedField);
    }
  } else if (args.canonicalField in args.normalized) {
    delete args.normalized[args.canonicalField];
    appendChangedField(args.changedFields, args.changedField);
  }

  removeDeprecatedRuntimeKernelField(
    args.normalized,
    args.legacyField,
    args.changedFields,
    args.changedField
  );
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
  value: unknown
): NormalizeRuntimeKernelConfigRecordResult | null => {
  if (!isObjectRecord(value)) return null;

  const normalized: Record<string, unknown> = { ...value };
  const changedFields: RuntimeKernelConfigNormalizedField[] = [];

  removeDeprecatedRuntimeKernelField(
    normalized,
    DEPRECATED_RUNTIME_KERNEL_CONFIG_MODE_FIELD,
    changedFields,
    'mode'
  );

  normalizeRuntimeKernelListField({
    sourceValue: value,
    normalized,
    canonicalField: 'nodeTypes',
    legacyField: DEPRECATED_RUNTIME_KERNEL_CONFIG_NODE_TYPES_FIELD,
    changedField: 'nodeTypes',
    parseValue: parseRuntimeKernelNodeTypes,
    changedFields,
  });

  normalizeRuntimeKernelListField({
    sourceValue: value,
    normalized,
    canonicalField: 'codeObjectResolverIds',
    legacyField: DEPRECATED_RUNTIME_KERNEL_CONFIG_RESOLVER_IDS_FIELD,
    changedField: 'codeObjectResolverIds',
    parseValue: parseRuntimeKernelCodeObjectResolverIds,
    changedFields,
  });

  removeDeprecatedRuntimeKernelField(
    normalized,
    DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_NATIVE_FIELD,
    changedFields,
    'strictNativeRegistry'
  );
  removeDeprecatedRuntimeKernelField(
    normalized,
    DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_ALIAS_FIELD,
    changedFields,
    'strictNativeRegistry'
  );

  return {
    changed: changedFields.length > 0,
    value: changedFields.length > 0 ? normalized : value,
    changedFields,
  };
};

export const normalizeRuntimeKernelConfigRecord = (
  value: unknown
): Record<string, unknown> | null => {
  const normalized = normalizeRuntimeKernelConfigRecordDetailed(value);
  return normalized?.value ?? null;
};
