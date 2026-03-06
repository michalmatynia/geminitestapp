import {
  parseRuntimeKernelCodeObjectResolverIds,
  parseRuntimeKernelNodeTypes,
} from '@/shared/lib/ai-paths/core/runtime/runtime-kernel-config';
import { isObjectRecord } from '@/shared/utils/object-utils';

type RuntimeKernelNodeTypesSource = 'env' | 'path' | 'settings' | 'default';

export type AiPathRunRuntimeKernelMetadataChangedField =
  | 'runtimeKernelConfig.mode'
  | 'runtimeKernelConfig.nodeTypes'
  | 'runtimeKernelConfig.codeObjectResolverIds'
  | 'runtimeKernelConfig.strictNativeRegistry'
  | 'runtimeKernel.mode'
  | 'runtimeKernel.modeSource'
  | 'runtimeKernel.nodeTypes'
  | 'runtimeKernel.nodeTypesSource'
  | 'runtimeKernel.codeObjectResolverIds'
  | 'runtimeKernel.strictNativeRegistry'
  | 'runtimeKernel.strictNativeRegistrySource'
  | 'runtimeTrace.kernelParity.strategyCounts';

export type NormalizeAiPathRunRuntimeKernelMetadataResult = {
  changed: boolean;
  meta: Record<string, unknown> | null;
  changedFields: AiPathRunRuntimeKernelMetadataChangedField[];
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

const normalizeNonNegativeInteger = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value) : null;

const normalizeRuntimeKernelConfigRecord = (
  value: Record<string, unknown>,
  options: {
    translateLegacyAliases: boolean;
  }
): {
  changed: boolean;
  value: Record<string, unknown>;
  changedFields: AiPathRunRuntimeKernelMetadataChangedField[];
} => {
  const nextValue: Record<string, unknown> = { ...value };
  const changedFields: AiPathRunRuntimeKernelMetadataChangedField[] = [];

  if ('mode' in nextValue) {
    delete nextValue['mode'];
    appendChangedField(changedFields, 'runtimeKernelConfig.mode');
  }

  const nodeTypes = parseRuntimeKernelNodeTypes(
    options.translateLegacyAliases ? value['nodeTypes'] ?? value['pilotNodeTypes'] : value['nodeTypes']
  );
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
    options.translateLegacyAliases
      ? value['codeObjectResolverIds'] ?? value['resolverIds']
      : value['codeObjectResolverIds']
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

  if ('strictNativeRegistry' in nextValue) {
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
  value: Record<string, unknown>,
  options: {
    translateLegacyAliases: boolean;
  }
): {
  changed: boolean;
  value: Record<string, unknown>;
  changedFields: AiPathRunRuntimeKernelMetadataChangedField[];
} => {
  const nextValue: Record<string, unknown> = { ...value };
  const changedFields: AiPathRunRuntimeKernelMetadataChangedField[] = [];

  if ('runtimeKernelMode' in nextValue) {
    delete nextValue['runtimeKernelMode'];
    appendChangedField(changedFields, 'runtimeKernel.mode');
  }
  if ('runtimeKernelModeSource' in nextValue) {
    delete nextValue['runtimeKernelModeSource'];
    appendChangedField(changedFields, 'runtimeKernel.modeSource');
  }

  const nodeTypes = parseRuntimeKernelNodeTypes(
    options.translateLegacyAliases
      ? value['runtimeKernelNodeTypes'] ?? value['runtimeKernelPilotNodeTypes']
      : value['runtimeKernelNodeTypes']
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
    options.translateLegacyAliases
      ? value['runtimeKernelNodeTypesSource'] ?? value['runtimeKernelPilotNodeTypesSource']
      : value['runtimeKernelNodeTypesSource']
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

  if ('runtimeKernelStrictNativeRegistry' in nextValue) {
    delete nextValue['runtimeKernelStrictNativeRegistry'];
    appendChangedField(changedFields, 'runtimeKernel.strictNativeRegistry');
  }
  if ('runtimeKernelStrictNativeRegistrySource' in nextValue) {
    delete nextValue['runtimeKernelStrictNativeRegistrySource'];
    appendChangedField(changedFields, 'runtimeKernel.strictNativeRegistrySource');
  }

  return {
    changed: changedFields.length > 0,
    value: nextValue,
    changedFields,
  };
};

const normalizeRuntimeTraceRecord = (
  value: Record<string, unknown>
): {
  changed: boolean;
  value: Record<string, unknown>;
  changedFields: AiPathRunRuntimeKernelMetadataChangedField[];
} => {
  const nextValue: Record<string, unknown> = { ...value };
  const changedFields: AiPathRunRuntimeKernelMetadataChangedField[] = [];
  const kernelParity = isObjectRecord(value['kernelParity']) ? value['kernelParity'] : null;
  if (!kernelParity) {
    return {
      changed: false,
      value,
      changedFields,
    };
  }

  const strategyCounts = isObjectRecord(kernelParity['strategyCounts'])
    ? kernelParity['strategyCounts']
    : null;
  if (!strategyCounts || !('legacy_adapter' in strategyCounts)) {
    return {
      changed: false,
      value,
      changedFields,
    };
  }

  const compatibilityCount =
    normalizeNonNegativeInteger(strategyCounts['compatibility']) ??
    normalizeNonNegativeInteger(strategyCounts['legacy_adapter']);
  const nextStrategyCounts: Record<string, unknown> = { ...strategyCounts };
  delete nextStrategyCounts['legacy_adapter'];
  if (compatibilityCount !== null) {
    nextStrategyCounts['compatibility'] = compatibilityCount;
  } else if ('compatibility' in nextStrategyCounts) {
    delete nextStrategyCounts['compatibility'];
  }

  nextValue['kernelParity'] = {
    ...kernelParity,
    strategyCounts: nextStrategyCounts,
  };
  appendChangedField(changedFields, 'runtimeTrace.kernelParity.strategyCounts');

  return {
    changed: true,
    value: nextValue,
    changedFields,
  };
};

export const normalizeAiPathRunRuntimeKernelMetadata = (
  meta: unknown
): NormalizeAiPathRunRuntimeKernelMetadataResult => {
  return normalizeAiPathRunRuntimeKernelMetadataInternal(meta, {
    translateLegacyAliases: true,
    dropEmptyObjects: false,
  });
};

export const normalizeAiPathRunRuntimeKernelMetadataForRuntimeRead = (
  meta: unknown
): NormalizeAiPathRunRuntimeKernelMetadataResult => {
  return normalizeAiPathRunRuntimeKernelMetadataInternal(meta, {
    translateLegacyAliases: false,
    dropEmptyObjects: true,
  });
};

const normalizeAiPathRunRuntimeKernelMetadataInternal = (
  meta: unknown,
  options: {
    translateLegacyAliases: boolean;
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
    const normalized = normalizeRuntimeKernelConfigRecord(runtimeKernelConfig, {
      translateLegacyAliases: options.translateLegacyAliases,
    });
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
    const normalized = normalizeRuntimeKernelTelemetryRecord(runtimeKernel, {
      translateLegacyAliases: options.translateLegacyAliases,
    });
    if (normalized.changed) {
      if (options.dropEmptyObjects && Object.keys(normalized.value).length === 0) {
        delete nextMeta['runtimeKernel'];
      } else {
        nextMeta['runtimeKernel'] = normalized.value;
      }
      normalized.changedFields.forEach((field) => appendChangedField(changedFields, field));
    }
  }

  const runtimeTrace = isObjectRecord(meta['runtimeTrace']) ? meta['runtimeTrace'] : null;
  if (runtimeTrace) {
    const normalized = normalizeRuntimeTraceRecord(runtimeTrace);
    if (normalized.changed) {
      nextMeta['runtimeTrace'] = normalized.value;
      normalized.changedFields.forEach((field) => appendChangedField(changedFields, field));
    }
  }

  return {
    changed: changedFields.length > 0,
    meta: changedFields.length > 0 ? nextMeta : meta,
    changedFields,
  };
};
