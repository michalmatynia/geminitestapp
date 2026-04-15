import {
  normalizeRuntimeKernelValueSource,
  normalizeRuntimeKernelConfigRecordDetailed,
  parseRuntimeKernelCodeObjectResolverIds,
  parseRuntimeKernelNodeTypes,
  type RuntimeKernelConfigNormalizedField,
  type RuntimeKernelValueSource,
} from '@/shared/lib/ai-paths/core/runtime/runtime-kernel-config';
import {
  DEPRECATED_RUNTIME_KERNEL_TELEMETRY_MODE_FIELD,
  DEPRECATED_RUNTIME_KERNEL_TELEMETRY_MODE_SOURCE_FIELD,
  DEPRECATED_RUNTIME_KERNEL_TELEMETRY_NODE_TYPES_FIELD,
  DEPRECATED_RUNTIME_KERNEL_TELEMETRY_NODE_TYPES_SOURCE_FIELD,
  DEPRECATED_RUNTIME_KERNEL_TELEMETRY_STRICT_NATIVE_FIELD,
  DEPRECATED_RUNTIME_KERNEL_TELEMETRY_STRICT_NATIVE_SOURCE_FIELD,
} from '@/shared/lib/ai-paths/core/runtime/runtime-kernel-legacy-aliases';
import { isObjectRecord } from '@/shared/utils/object-utils';

export const AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS = {
  runtimeKernelConfigMode: 'runtimeKernelConfig.mode',
  runtimeKernelConfigNodeTypes: 'runtimeKernelConfig.nodeTypes',
  runtimeKernelConfigCodeObjectResolverIds: 'runtimeKernelConfig.codeObjectResolverIds',
  runtimeKernelConfigStrictNativeRegistry: 'runtimeKernelConfig.strictNativeRegistry',
  runtimeKernelMode: 'runtimeKernel.mode',
  runtimeKernelModeSource: 'runtimeKernel.modeSource',
  runtimeKernelNodeTypes: 'runtimeKernel.nodeTypes',
  runtimeKernelNodeTypesSource: 'runtimeKernel.nodeTypesSource',
  runtimeKernelCodeObjectResolverIds: 'runtimeKernel.codeObjectResolverIds',
  runtimeKernelStrictNativeRegistry: 'runtimeKernel.strictNativeRegistry',
  runtimeKernelStrictNativeRegistrySource: 'runtimeKernel.strictNativeRegistrySource',
} as const;

export type AiPathRunRuntimeKernelMetadataChangedField =
  (typeof AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS)[keyof typeof AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS];

export type NormalizeAiPathRunRuntimeKernelMetadataResult = {
  changed: boolean;
  meta: Record<string, unknown> | null;
  changedFields: AiPathRunRuntimeKernelMetadataChangedField[];
};

const normalizeRuntimeKernelNodeTypesSource = (
  value: unknown
): RuntimeKernelValueSource | undefined =>
  normalizeRuntimeKernelValueSource(
    typeof value === 'string' ? value.trim().toLowerCase() : value
  ) ?? undefined;

const matchesStringArray = (value: unknown, expected: string[]): boolean =>
  Array.isArray(value) &&
  value.length === expected.length &&
  value.every(
    (entry: unknown, index: number): boolean =>
      typeof entry === 'string' && entry === expected[index]
  );

const appendChangedField = (
  changedFields: AiPathRunRuntimeKernelMetadataChangedField[],
  field: AiPathRunRuntimeKernelMetadataChangedField
): void => {
  if (!changedFields.includes(field)) {
    changedFields.push(field);
  }
};

const RUNTIME_KERNEL_CONFIG_CHANGED_FIELD_MAP = {
  mode: AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelConfigMode,
  nodeTypes: AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelConfigNodeTypes,
  codeObjectResolverIds:
    AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelConfigCodeObjectResolverIds,
  strictNativeRegistry:
    AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelConfigStrictNativeRegistry,
} satisfies Record<RuntimeKernelConfigNormalizedField, AiPathRunRuntimeKernelMetadataChangedField>;

const normalizeRuntimeKernelConfigRecord = (
  value: Record<string, unknown>
): {
  changed: boolean;
  value: Record<string, unknown>;
  changedFields: AiPathRunRuntimeKernelMetadataChangedField[];
} => {
  const normalized = normalizeRuntimeKernelConfigRecordDetailed(value);
  const changedFields =
    normalized?.changedFields.map((field) => RUNTIME_KERNEL_CONFIG_CHANGED_FIELD_MAP[field]) ?? [];

  return {
    changed: normalized?.changed ?? false,
    value: normalized?.value ?? value,
    changedFields,
  };
};

const normalizeRuntimeKernelTelemetryRecord = (
  value: Record<string, unknown>
): {
  changed: boolean;
  value: Record<string, unknown>;
  changedFields: AiPathRunRuntimeKernelMetadataChangedField[];
} => {
  const nextValue: Record<string, unknown> = { ...value };
  const changedFields: AiPathRunRuntimeKernelMetadataChangedField[] = [];

  if (DEPRECATED_RUNTIME_KERNEL_TELEMETRY_MODE_FIELD in nextValue) {
    delete nextValue[DEPRECATED_RUNTIME_KERNEL_TELEMETRY_MODE_FIELD];
    appendChangedField(
      changedFields,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelMode
    );
  }
  if (DEPRECATED_RUNTIME_KERNEL_TELEMETRY_MODE_SOURCE_FIELD in nextValue) {
    delete nextValue[DEPRECATED_RUNTIME_KERNEL_TELEMETRY_MODE_SOURCE_FIELD];
    appendChangedField(
      changedFields,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelModeSource
    );
  }

  const nodeTypes = parseRuntimeKernelNodeTypes(value['runtimeKernelNodeTypes']);
  if (nodeTypes) {
    if (!matchesStringArray(value['runtimeKernelNodeTypes'], nodeTypes)) {
      nextValue['runtimeKernelNodeTypes'] = nodeTypes;
      appendChangedField(
        changedFields,
        AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelNodeTypes
      );
    }
  } else if ('runtimeKernelNodeTypes' in nextValue) {
    delete nextValue['runtimeKernelNodeTypes'];
    appendChangedField(
      changedFields,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelNodeTypes
    );
  }
  if (DEPRECATED_RUNTIME_KERNEL_TELEMETRY_NODE_TYPES_FIELD in nextValue) {
    delete nextValue[DEPRECATED_RUNTIME_KERNEL_TELEMETRY_NODE_TYPES_FIELD];
    appendChangedField(
      changedFields,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelNodeTypes
    );
  }

  const nodeTypesSource = normalizeRuntimeKernelNodeTypesSource(
    value['runtimeKernelNodeTypesSource']
  );
  if (nodeTypesSource !== undefined) {
    if (value['runtimeKernelNodeTypesSource'] !== nodeTypesSource) {
      nextValue['runtimeKernelNodeTypesSource'] = nodeTypesSource;
      appendChangedField(
        changedFields,
        AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelNodeTypesSource
      );
    }
  } else if ('runtimeKernelNodeTypesSource' in nextValue) {
    delete nextValue['runtimeKernelNodeTypesSource'];
    appendChangedField(
      changedFields,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelNodeTypesSource
    );
  }
  if (DEPRECATED_RUNTIME_KERNEL_TELEMETRY_NODE_TYPES_SOURCE_FIELD in nextValue) {
    delete nextValue[DEPRECATED_RUNTIME_KERNEL_TELEMETRY_NODE_TYPES_SOURCE_FIELD];
    appendChangedField(
      changedFields,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelNodeTypesSource
    );
  }

  const resolverIds = parseRuntimeKernelCodeObjectResolverIds(
    value['runtimeKernelCodeObjectResolverIds']
  );
  if (resolverIds) {
    if (!matchesStringArray(value['runtimeKernelCodeObjectResolverIds'], resolverIds)) {
      nextValue['runtimeKernelCodeObjectResolverIds'] = resolverIds;
      appendChangedField(
        changedFields,
        AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelCodeObjectResolverIds
      );
    }
  } else if ('runtimeKernelCodeObjectResolverIds' in nextValue) {
    delete nextValue['runtimeKernelCodeObjectResolverIds'];
    appendChangedField(
      changedFields,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelCodeObjectResolverIds
    );
  }

  if (DEPRECATED_RUNTIME_KERNEL_TELEMETRY_STRICT_NATIVE_FIELD in nextValue) {
    delete nextValue[DEPRECATED_RUNTIME_KERNEL_TELEMETRY_STRICT_NATIVE_FIELD];
    appendChangedField(
      changedFields,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelStrictNativeRegistry
    );
  }
  if (DEPRECATED_RUNTIME_KERNEL_TELEMETRY_STRICT_NATIVE_SOURCE_FIELD in nextValue) {
    delete nextValue[DEPRECATED_RUNTIME_KERNEL_TELEMETRY_STRICT_NATIVE_SOURCE_FIELD];
    appendChangedField(
      changedFields,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelStrictNativeRegistrySource
    );
  }

  return {
    changed: changedFields.length > 0,
    value: nextValue,
    changedFields,
  };
};

export const normalizeAiPathRunRuntimeKernelMetadataForCleanup = (
  meta: unknown
): NormalizeAiPathRunRuntimeKernelMetadataResult => {
  return normalizeAiPathRunRuntimeKernelMetadataInternal(meta, {
    dropEmptyObjects: true,
  });
};

export const normalizeAiPathRunRuntimeKernelMetadataForRuntimeRead = (
  meta: unknown
): NormalizeAiPathRunRuntimeKernelMetadataResult => {
  return normalizeAiPathRunRuntimeKernelMetadataInternal(meta, {
    dropEmptyObjects: true,
  });
};

const normalizeAiPathRunRuntimeKernelMetadataInternal = (
  meta: unknown,
  options: {
    dropEmptyObjects: boolean;
  }
): NormalizeAiPathRunRuntimeKernelMetadataResult => {
  if (!isObjectRecord(meta)) {
    return {
      changed: false,
      meta: null,
      changedFields: [],
    };
  }

  const nextMeta: Record<string, unknown> = { ...meta };
  const changedFields: AiPathRunRuntimeKernelMetadataChangedField[] = [];

  const runtimeKernelConfig = isObjectRecord(meta['runtimeKernelConfig'])
    ? meta['runtimeKernelConfig']
    : null;
  if (runtimeKernelConfig) {
    const normalized = normalizeRuntimeKernelConfigRecord(runtimeKernelConfig);
    if (normalized.changed) {
      if (options.dropEmptyObjects && Object.keys(normalized.value).length === 0) {
        delete nextMeta['runtimeKernelConfig'];
      } else {
        nextMeta['runtimeKernelConfig'] = normalized.value;
      }
      normalized.changedFields.forEach((field) => appendChangedField(changedFields, field));
    }
  }

  const runtimeKernel = isObjectRecord(meta['runtimeKernel']) ? meta['runtimeKernel'] : null;
  if (runtimeKernel) {
    const normalized = normalizeRuntimeKernelTelemetryRecord(runtimeKernel);
    if (normalized.changed) {
      if (options.dropEmptyObjects && Object.keys(normalized.value).length === 0) {
        delete nextMeta['runtimeKernel'];
      } else {
        nextMeta['runtimeKernel'] = normalized.value;
      }
      normalized.changedFields.forEach((field) => appendChangedField(changedFields, field));
    }
  }
  return {
    changed: changedFields.length > 0,
    meta: changedFields.length > 0 ? nextMeta : meta,
    changedFields,
  };
};
