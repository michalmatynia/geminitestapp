import type { RuntimeState } from '@/shared/contracts/ai-paths';
import {
  normalizeRuntimeKernelValueSource,
  parseRuntimeKernelCodeObjectResolverIds,
  parseRuntimeKernelNodeTypes,
  type RuntimeKernelValueSource,
} from '@/shared/lib/ai-paths/core/runtime/runtime-kernel-config';
import { isObjectRecord } from '@/shared/utils/object-utils';

const resolveRuntimeKernelValueWithSource = (args: {
  envValue: unknown;
  pathValue: unknown;
  settingsValue: unknown;
  parseValue: (value: unknown) => string[] | undefined;
}): {
  value: string[] | undefined;
  source: RuntimeKernelValueSource;
} => {
  const envValue = args.parseValue(args.envValue);
  if (envValue) {
    return { value: envValue, source: 'env' };
  }

  const pathValue = args.parseValue(args.pathValue);
  if (pathValue) {
    return { value: pathValue, source: 'path' };
  }

  const settingsValue = args.parseValue(args.settingsValue);
  if (settingsValue) {
    return { value: settingsValue, source: 'settings' };
  }

  return { value: undefined, source: 'default' };
};

export const resolveRuntimeKernelConfigForRun = (input: {
  envNodeTypes?: unknown;
  pathNodeTypes?: unknown;
  settingNodeTypes?: unknown;
  envResolverIds: unknown;
  pathResolverIds: unknown;
  settingResolverIds: unknown;
}): {
  nodeTypes: string[] | undefined;
  nodeTypesSource: RuntimeKernelValueSource;
  resolverIds: string[] | undefined;
  resolverSource: RuntimeKernelValueSource;
} => {
  const { value: nodeTypes, source: nodeTypesSource } = resolveRuntimeKernelValueWithSource({
    envValue: input.envNodeTypes,
    pathValue: input.pathNodeTypes,
    settingsValue: input.settingNodeTypes,
    parseValue: parseRuntimeKernelNodeTypes,
  });

  const { value: resolverIds, source: resolverSource } = resolveRuntimeKernelValueWithSource({
    envValue: input.envResolverIds,
    pathValue: input.pathResolverIds,
    settingsValue: input.settingResolverIds,
    parseValue: parseRuntimeKernelCodeObjectResolverIds,
  });

  return {
    nodeTypes,
    nodeTypesSource: normalizeRuntimeKernelValueSource(nodeTypesSource) ?? 'default',
    resolverIds,
    resolverSource: normalizeRuntimeKernelValueSource(resolverSource) ?? 'default',
  };
};

export { parseRuntimeKernelCodeObjectResolverIds, parseRuntimeKernelNodeTypes };

export type RuntimeKernelExecutionTelemetry = {
  runtimeKernelNodeTypes: string[];
  runtimeKernelNodeTypesSource: RuntimeKernelValueSource;
  runtimeKernelCodeObjectResolverIds: string[];
  runtimeKernelCodeObjectResolverIdsSource: RuntimeKernelValueSource;
};

const normalizeRuntimeKernelTelemetryArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null;
  if (!value.every((entry: unknown): entry is string => typeof entry === 'string')) {
    return null;
  }
  return value.map((entry: string) => entry.trim());
};

export const toRuntimeKernelExecutionTelemetry = (input: {
  nodeTypes: string[] | undefined;
  nodeTypesSource: RuntimeKernelValueSource;
  resolverIds: string[] | undefined;
  resolverSource: RuntimeKernelValueSource;
}): RuntimeKernelExecutionTelemetry => ({
  runtimeKernelNodeTypes: input.nodeTypes ?? [],
  runtimeKernelNodeTypesSource: input.nodeTypesSource,
  runtimeKernelCodeObjectResolverIds: input.resolverIds ?? [],
  runtimeKernelCodeObjectResolverIdsSource: input.resolverSource,
});

export const parseRuntimeKernelExecutionTelemetryRecord = (
  value: unknown
): RuntimeKernelExecutionTelemetry | null => {
  if (!isObjectRecord(value)) return null;

  const runtimeKernelNodeTypes = normalizeRuntimeKernelTelemetryArray(
    value['runtimeKernelNodeTypes']
  );
  const runtimeKernelNodeTypesSource = normalizeRuntimeKernelValueSource(
    value['runtimeKernelNodeTypesSource']
  );
  const runtimeKernelCodeObjectResolverIds = normalizeRuntimeKernelTelemetryArray(
    value['runtimeKernelCodeObjectResolverIds']
  );
  const runtimeKernelCodeObjectResolverIdsSource = normalizeRuntimeKernelValueSource(
    value['runtimeKernelCodeObjectResolverIdsSource']
  );

  if (
    !runtimeKernelNodeTypes ||
    !runtimeKernelNodeTypesSource ||
    !runtimeKernelCodeObjectResolverIds ||
    !runtimeKernelCodeObjectResolverIdsSource
  ) {
    return null;
  }

  return {
    runtimeKernelNodeTypes,
    runtimeKernelNodeTypesSource,
    runtimeKernelCodeObjectResolverIds,
    runtimeKernelCodeObjectResolverIdsSource,
  };
};

export const matchesRuntimeKernelExecutionTelemetryRecord = (
  value: unknown,
  expected: RuntimeKernelExecutionTelemetry
): boolean => {
  const normalized = parseRuntimeKernelExecutionTelemetryRecord(value);
  if (!normalized) return false;

  return (
    normalized.runtimeKernelNodeTypesSource === expected.runtimeKernelNodeTypesSource &&
    normalized.runtimeKernelNodeTypes.join('|') === expected.runtimeKernelNodeTypes.join('|') &&
    normalized.runtimeKernelCodeObjectResolverIdsSource ===
      expected.runtimeKernelCodeObjectResolverIdsSource &&
    normalized.runtimeKernelCodeObjectResolverIds.join('|') ===
      expected.runtimeKernelCodeObjectResolverIds.join('|')
  );
};

export const readRuntimeKernelConfigRecordFromMeta = (
  meta: Record<string, unknown> | null
): Record<string, unknown> | null =>
  isObjectRecord(meta?.['runtimeKernelConfig']) ? meta['runtimeKernelConfig'] : null;

export const readRuntimeKernelExecutionTelemetryFromMeta = (
  meta: Record<string, unknown> | null
): RuntimeKernelExecutionTelemetry | null =>
  parseRuntimeKernelExecutionTelemetryRecord(
    isObjectRecord(meta?.['runtimeKernel']) ? meta['runtimeKernel'] : null
  );

export const matchesRuntimeKernelExecutionTelemetryFromMeta = (
  meta: Record<string, unknown> | null,
  expected: RuntimeKernelExecutionTelemetry
): boolean =>
  matchesRuntimeKernelExecutionTelemetryRecord(
    isObjectRecord(meta?.['runtimeKernel']) ? meta['runtimeKernel'] : null,
    expected
  );

const normalizeRuntimeStrategy = (value: unknown): 'code_object_v3' | 'compatibility' | null => {
  if (value === 'code_object_v3' || value === 'compatibility') {
    return value;
  }
  return null;
};

const normalizeRuntimeResolutionSource = (
  value: unknown
): 'override' | 'registry' | 'missing' | null => {
  if (value === 'override' || value === 'registry' || value === 'missing') {
    return value;
  }
  return null;
};

export const toRuntimeNodeResolutionTelemetry = (input: {
  runtimeStrategy?: unknown;
  runtimeResolutionSource?: unknown;
  runtimeCodeObjectId?: unknown;
}): {
  runtimeStrategy?: 'code_object_v3' | 'compatibility';
  runtimeResolutionSource?: 'override' | 'registry' | 'missing';
  runtimeCodeObjectId?: string | null;
} => {
  const runtimeStrategy = normalizeRuntimeStrategy(input.runtimeStrategy);
  const runtimeResolutionSource = normalizeRuntimeResolutionSource(input.runtimeResolutionSource);
  const runtimeCodeObjectId =
    input.runtimeCodeObjectId === null
      ? null
      : typeof input.runtimeCodeObjectId === 'string' && input.runtimeCodeObjectId.trim().length > 0
        ? input.runtimeCodeObjectId.trim()
        : undefined;

  return {
    ...(runtimeStrategy ? { runtimeStrategy } : {}),
    ...(runtimeResolutionSource ? { runtimeResolutionSource } : {}),
    ...(runtimeCodeObjectId !== undefined ? { runtimeCodeObjectId } : {}),
  };
};

export type RuntimeKernelParitySummary = {
  sampledHistoryEntries: number;
  strategyCounts: {
    code_object_v3: number;
    unknown: number;
  };
  resolutionSourceCounts: {
    override: number;
    registry: number;
    missing: number;
    unknown: number;
  };
  codeObjectIds: string[];
};

export const summarizeRuntimeKernelParityFromHistory = (
  history: RuntimeState['history'] | null | undefined
): RuntimeKernelParitySummary => {
  const summary: RuntimeKernelParitySummary = {
    sampledHistoryEntries: 0,
    strategyCounts: {
      code_object_v3: 0,
      unknown: 0,
    },
    resolutionSourceCounts: {
      override: 0,
      registry: 0,
      missing: 0,
      unknown: 0,
    },
    codeObjectIds: [],
  };
  if (!history || typeof history !== 'object' || Array.isArray(history)) {
    return summary;
  }

  const codeObjectIdSet = new Set<string>();
  Object.values(history).forEach((entries: unknown): void => {
    if (!Array.isArray(entries)) return;
    entries.forEach((entry: unknown): void => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
      summary.sampledHistoryEntries += 1;
      const record = entry as Record<string, unknown>;

      const strategy = normalizeRuntimeStrategy(record['runtimeStrategy']);
      if (strategy === 'code_object_v3') {
        summary.strategyCounts.code_object_v3 += 1;
      } else {
        summary.strategyCounts.unknown += 1;
      }

      const resolutionSource = normalizeRuntimeResolutionSource(record['runtimeResolutionSource']);
      if (resolutionSource) {
        summary.resolutionSourceCounts[resolutionSource] += 1;
      } else {
        summary.resolutionSourceCounts.unknown += 1;
      }

      const codeObjectId = record['runtimeCodeObjectId'];
      if (typeof codeObjectId === 'string' && codeObjectId.trim().length > 0) {
        codeObjectIdSet.add(codeObjectId.trim());
      }
    });
  });

  summary.codeObjectIds = Array.from(codeObjectIdSet).slice(0, 25);
  return summary;
};
