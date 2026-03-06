import { parseRuntimeKernelCodeObjectResolverIds, parseRuntimeKernelNodeTypes } from './path-run-executor.helpers';
import { isObjectRecord } from '@/shared/utils/object-utils';

type RuntimeKernelNodeTypesSource = 'env' | 'path' | 'settings' | 'default';

export type AiPathRunRuntimeKernelMetadataChangedField =
  | 'runtimeKernelConfig.mode'
  | 'runtimeKernelConfig.nodeTypes'
  | 'runtimeKernelConfig.codeObjectResolverIds'
  | 'runtimeKernelConfig.strictNativeRegistry'
  | 'runtimeKernel.mode'
  | 'runtimeKernel.nodeTypes'
  | 'runtimeKernel.nodeTypesSource'
  | 'runtimeKernel.codeObjectResolverIds'
  | 'runtimeKernel.strictNativeRegistry';

export type NormalizeAiPathRunRuntimeKernelMetadataResult = {
  changed: boolean;
  meta: Record<string, unknown> | null;
  changedFields: AiPathRunRuntimeKernelMetadataChangedField[];
};

const normalizeRuntimeKernelMode = (value: unknown): 'auto' | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  return normalized === 'auto' || normalized === 'legacy_only' ? 'auto' : undefined;
};

const normalizeRuntimeKernelStrictNativeRegistry = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on')
    return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off')
    return false;
  return undefined;
};

const normalizeRuntimeKernelNodeTypesSource = (
  value: unknown
): RuntimeKernelNodeTypesSource | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  return normalized === 'env' ||
    normalized === 'path' ||
    normalized === 'settings' ||
    normalized === 'default'
    ? normalized
    : undefined;
};

const matchesStringArray = (value: unknown, expected: string[]): boolean =>
  Array.isArray(value) &&
  value.length === expected.length &&
  value.every(
    (entry: unknown, index: number): boolean => typeof entry === 'string' && entry === expected[index]
  );

const appendChangedField = (
  changedFields: AiPathRunRuntimeKernelMetadataChangedField[],
  field: AiPathRunRuntimeKernelMetadataChangedField
): void => {
  if (!changedFields.includes(field)) {
    changedFields.push(field);
  }
};

const normalizeRuntimeKernelConfigRecord = (
  value: Record<string, unknown>
): {
  changed: boolean;
  value: Record<string, unknown>;
  changedFields: AiPathRunRuntimeKernelMetadataChangedField[];
} => {
  const nextValue: Record<string, unknown> = { ...value };
  const changedFields: AiPathRunRuntimeKernelMetadataChangedField[] = [];

  const mode = normalizeRuntimeKernelMode(value['mode']);
  if (mode !== undefined) {
    if (value['mode'] !== mode) {
      nextValue['mode'] = mode;
      appendChangedField(changedFields, 'runtimeKernelConfig.mode');
    }
  }

  const nodeTypes = parseRuntimeKernelNodeTypes(value['nodeTypes'] ?? value['pilotNodeTypes']);
  if (nodeTypes) {
    if (!matchesStringArray(value['nodeTypes'], nodeTypes)) {
      nextValue['nodeTypes'] = nodeTypes;
      appendChangedField(changedFields, 'runtimeKernelConfig.nodeTypes');
    }
  } else if ('nodeTypes' in nextValue) {
    delete nextValue['nodeTypes'];
    appendChangedField(changedFields, 'runtimeKernelConfig.nodeTypes');
  }
  if ('pilotNodeTypes' in nextValue) {
    delete nextValue['pilotNodeTypes'];
    appendChangedField(changedFields, 'runtimeKernelConfig.nodeTypes');
  }

  const resolverIds = parseRuntimeKernelCodeObjectResolverIds(
    value['codeObjectResolverIds'] ?? value['resolverIds']
  );
  if (resolverIds) {
    if (!matchesStringArray(value['codeObjectResolverIds'], resolverIds)) {
      nextValue['codeObjectResolverIds'] = resolverIds;
      appendChangedField(changedFields, 'runtimeKernelConfig.codeObjectResolverIds');
    }
  } else if ('codeObjectResolverIds' in nextValue) {
    delete nextValue['codeObjectResolverIds'];
    appendChangedField(changedFields, 'runtimeKernelConfig.codeObjectResolverIds');
  }
  if ('resolverIds' in nextValue) {
    delete nextValue['resolverIds'];
    appendChangedField(changedFields, 'runtimeKernelConfig.codeObjectResolverIds');
  }

  const strictNativeRegistry = normalizeRuntimeKernelStrictNativeRegistry(
    value['strictNativeRegistry'] ?? value['strictCodeObjectRegistry']
  );
  if (strictNativeRegistry !== undefined) {
    if (value['strictNativeRegistry'] !== strictNativeRegistry) {
      nextValue['strictNativeRegistry'] = strictNativeRegistry;
      appendChangedField(changedFields, 'runtimeKernelConfig.strictNativeRegistry');
    }
  } else if ('strictNativeRegistry' in nextValue) {
    delete nextValue['strictNativeRegistry'];
    appendChangedField(changedFields, 'runtimeKernelConfig.strictNativeRegistry');
  }
  if ('strictCodeObjectRegistry' in nextValue) {
    delete nextValue['strictCodeObjectRegistry'];
    appendChangedField(changedFields, 'runtimeKernelConfig.strictNativeRegistry');
  }

  return {
    changed: changedFields.length > 0,
    value: nextValue,
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

  const mode = normalizeRuntimeKernelMode(value['runtimeKernelMode']);
  if (mode !== undefined && value['runtimeKernelMode'] !== mode) {
    nextValue['runtimeKernelMode'] = mode;
    appendChangedField(changedFields, 'runtimeKernel.mode');
  }

  const nodeTypes = parseRuntimeKernelNodeTypes(
    value['runtimeKernelNodeTypes'] ?? value['runtimeKernelPilotNodeTypes']
  );
  if (nodeTypes) {
    if (!matchesStringArray(value['runtimeKernelNodeTypes'], nodeTypes)) {
      nextValue['runtimeKernelNodeTypes'] = nodeTypes;
      appendChangedField(changedFields, 'runtimeKernel.nodeTypes');
    }
  } else if ('runtimeKernelNodeTypes' in nextValue) {
    delete nextValue['runtimeKernelNodeTypes'];
    appendChangedField(changedFields, 'runtimeKernel.nodeTypes');
  }
  if ('runtimeKernelPilotNodeTypes' in nextValue) {
    delete nextValue['runtimeKernelPilotNodeTypes'];
    appendChangedField(changedFields, 'runtimeKernel.nodeTypes');
  }

  const nodeTypesSource = normalizeRuntimeKernelNodeTypesSource(
    value['runtimeKernelNodeTypesSource'] ?? value['runtimeKernelPilotNodeTypesSource']
  );
  if (nodeTypesSource !== undefined) {
    if (value['runtimeKernelNodeTypesSource'] !== nodeTypesSource) {
      nextValue['runtimeKernelNodeTypesSource'] = nodeTypesSource;
      appendChangedField(changedFields, 'runtimeKernel.nodeTypesSource');
    }
  } else if ('runtimeKernelNodeTypesSource' in nextValue) {
    delete nextValue['runtimeKernelNodeTypesSource'];
    appendChangedField(changedFields, 'runtimeKernel.nodeTypesSource');
  }
  if ('runtimeKernelPilotNodeTypesSource' in nextValue) {
    delete nextValue['runtimeKernelPilotNodeTypesSource'];
    appendChangedField(changedFields, 'runtimeKernel.nodeTypesSource');
  }

  const resolverIds = parseRuntimeKernelCodeObjectResolverIds(
    value['runtimeKernelCodeObjectResolverIds']
  );
  if (resolverIds) {
    if (!matchesStringArray(value['runtimeKernelCodeObjectResolverIds'], resolverIds)) {
      nextValue['runtimeKernelCodeObjectResolverIds'] = resolverIds;
      appendChangedField(changedFields, 'runtimeKernel.codeObjectResolverIds');
    }
  } else if ('runtimeKernelCodeObjectResolverIds' in nextValue) {
    delete nextValue['runtimeKernelCodeObjectResolverIds'];
    appendChangedField(changedFields, 'runtimeKernel.codeObjectResolverIds');
  }

  const strictNativeRegistry = normalizeRuntimeKernelStrictNativeRegistry(
    value['runtimeKernelStrictNativeRegistry']
  );
  if (strictNativeRegistry !== undefined) {
    if (value['runtimeKernelStrictNativeRegistry'] !== strictNativeRegistry) {
      nextValue['runtimeKernelStrictNativeRegistry'] = strictNativeRegistry;
      appendChangedField(changedFields, 'runtimeKernel.strictNativeRegistry');
    }
  } else if ('runtimeKernelStrictNativeRegistry' in nextValue) {
    delete nextValue['runtimeKernelStrictNativeRegistry'];
    appendChangedField(changedFields, 'runtimeKernel.strictNativeRegistry');
  }

  return {
    changed: changedFields.length > 0,
    value: nextValue,
    changedFields,
  };
};

export const normalizeAiPathRunRuntimeKernelMetadata = (
  meta: unknown
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
      nextMeta['runtimeKernelConfig'] = normalized.value;
      normalized.changedFields.forEach((field) => appendChangedField(changedFields, field));
    }
  }

  const runtimeKernel = isObjectRecord(meta['runtimeKernel']) ? meta['runtimeKernel'] : null;
  if (runtimeKernel) {
    const normalized = normalizeRuntimeKernelTelemetryRecord(runtimeKernel);
    if (normalized.changed) {
      nextMeta['runtimeKernel'] = normalized.value;
      normalized.changedFields.forEach((field) => appendChangedField(changedFields, field));
    }
  }

  return {
    changed: changedFields.length > 0,
    meta: changedFields.length > 0 ? nextMeta : meta,
    changedFields,
  };
};
