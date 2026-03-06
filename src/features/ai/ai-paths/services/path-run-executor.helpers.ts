import {
  type AiPathRunStatus,
  type RuntimeState,
  type RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import { runtimeStateSchema } from '@/shared/contracts/ai-paths-runtime';
import {
  parseRuntimeKernelCodeObjectResolverIds,
  parseRuntimeKernelNodeTypes,
} from '@/shared/lib/ai-paths/core/runtime/runtime-kernel-config';
import { cloneJsonSafe } from '@/shared/lib/ai-paths';
import { isAppError, validationError } from '@/shared/errors/app-error';
import { isObjectRecord } from '@/shared/utils/object-utils';

export const TERMINAL_RUN_STATUSES = new Set(['completed', 'failed', 'canceled', 'dead_lettered']);
export const UPDATE_ELIGIBLE_RUN_STATUSES: AiPathRunStatus[] = [
  'queued',
  'running',
  'paused',
  'completed',
  'failed',
  'canceled',
  'dead_lettered',
];
export const LOG_NODE_START_EVENTS = process.env['AI_PATHS_LOG_NODE_START_EVENTS'] === 'true';
export const INTERMEDIATE_SAVE_INTERVAL_MS = Math.max(
  500,
  Number.parseInt(process.env['AI_PATHS_RUNTIME_STATE_FLUSH_INTERVAL_MS'] ?? '', 10) || 2000
);
export const RUNTIME_PROFILE_SAMPLE_LIMIT = Math.max(
  5,
  Number.parseInt(process.env['AI_PATHS_RUNTIME_PROFILE_SAMPLE_LIMIT'] ?? '', 10) || 30
);
export const RUNTIME_PROFILE_HIGHLIGHT_LIMIT = Math.max(
  5,
  Number.parseInt(process.env['AI_PATHS_RUNTIME_PROFILE_HIGHLIGHT_LIMIT'] ?? '', 10) || 10
);
export const RUNTIME_TRACE_SPAN_LIMIT = Math.max(
  20,
  Number.parseInt(process.env['AI_PATHS_RUNTIME_TRACE_SPAN_LIMIT'] ?? '', 10) || 200
);
export const RUNTIME_PROFILE_SLOW_NODE_MS = Math.max(
  10,
  Number.parseInt(process.env['AI_PATHS_RUNTIME_PROFILE_SLOW_NODE_MS'] ?? '', 10) || 600
);

export const normalizeRuntimeKernelCodeObjectResolverIds = (
  values: string[] | undefined
): string[] | undefined => {
  if (!Array.isArray(values)) return undefined;
  const normalized = Array.from(
    new Set(values.map((value: string): string => value.trim()).filter(Boolean))
  );
  return normalized.length > 0 ? normalized : undefined;
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
  nodeTypesSource: 'env' | 'path' | 'settings' | 'default';
  resolverIds: string[] | undefined;
  resolverSource: 'env' | 'path' | 'settings' | 'default';
} => {
  const envNodeTypes = parseRuntimeKernelNodeTypes(input.envNodeTypes);
  const pathNodeTypes = parseRuntimeKernelNodeTypes(input.pathNodeTypes);
  const settingsNodeTypes = parseRuntimeKernelNodeTypes(input.settingNodeTypes);
  const nodeTypes = envNodeTypes ?? pathNodeTypes ?? settingsNodeTypes;
  const nodeTypesSource: 'env' | 'path' | 'settings' | 'default' = envNodeTypes
    ? 'env'
    : pathNodeTypes
      ? 'path'
      : settingsNodeTypes
        ? 'settings'
        : 'default';
  const envResolverIds = parseRuntimeKernelCodeObjectResolverIds(input.envResolverIds);
  const pathResolverIds = parseRuntimeKernelCodeObjectResolverIds(input.pathResolverIds);
  const settingsResolverIds = parseRuntimeKernelCodeObjectResolverIds(input.settingResolverIds);
  const resolverIds = envResolverIds ?? pathResolverIds ?? settingsResolverIds;
  const resolverSource: 'env' | 'path' | 'settings' | 'default' = envResolverIds
    ? 'env'
    : pathResolverIds
      ? 'path'
      : settingsResolverIds
        ? 'settings'
        : 'default';

  return {
    nodeTypes,
    nodeTypesSource,
    resolverIds,
    resolverSource,
  };
};

export { parseRuntimeKernelCodeObjectResolverIds, parseRuntimeKernelNodeTypes };

export type RuntimeKernelExecutionTelemetry = {
  runtimeKernelNodeTypes: string[];
  runtimeKernelNodeTypesSource: 'env' | 'path' | 'settings' | 'default';
  runtimeKernelCodeObjectResolverIds: string[];
  runtimeKernelCodeObjectResolverIdsSource: 'env' | 'path' | 'settings' | 'default';
};

export const toRuntimeKernelExecutionTelemetry = (input: {
  nodeTypes: string[] | undefined;
  nodeTypesSource: 'env' | 'path' | 'settings' | 'default';
  resolverIds: string[] | undefined;
  resolverSource: 'env' | 'path' | 'settings' | 'default';
}): RuntimeKernelExecutionTelemetry => ({
  runtimeKernelNodeTypes: input.nodeTypes ?? [],
  runtimeKernelNodeTypesSource: input.nodeTypesSource,
  runtimeKernelCodeObjectResolverIds: input.resolverIds ?? [],
  runtimeKernelCodeObjectResolverIdsSource: input.resolverSource,
});

const normalizeRuntimeStrategy = (
  value: unknown
): 'compatibility' | 'code_object_v3' | null => {
  if (value === 'compatibility' || value === 'code_object_v3') {
    return value;
  }
  return null;
};

const toPublicRuntimeStrategy = (
  value: unknown
): 'compatibility' | 'code_object_v3' | null => {
  const runtimeStrategy = normalizeRuntimeStrategy(value);
  return runtimeStrategy;
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
  runtimeStrategy?: 'compatibility' | 'code_object_v3';
  runtimeResolutionSource?: 'override' | 'registry' | 'missing';
  runtimeCodeObjectId?: string | null;
} => {
  const runtimeStrategy = toPublicRuntimeStrategy(input.runtimeStrategy);
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
    compatibility: number;
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
      compatibility: 0,
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
      } else if (strategy === 'compatibility') {
        summary.strategyCounts.compatibility += 1;
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

export const resolveCancellationPollIntervalMs = (): number => {
  const parsed = Number.parseInt(process.env['AI_PATHS_CANCEL_POLL_INTERVAL_MS'] ?? '', 10);
  if (!Number.isFinite(parsed)) return 750;
  return Math.max(100, Math.min(5000, Math.trunc(parsed)));
};

export const isMissingRunUpdateError = (error: unknown): boolean => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2025'
  ) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();
  return (
    normalized.includes('no record was found for an update') ||
    normalized.includes('record to update not found') ||
    normalized.includes('run not found')
  );
};

export const EMPTY_RUNTIME_STATE: RuntimeState = {
  status: 'idle',
  nodeStatuses: {},
  nodeOutputs: {},
  variables: {},
  events: [],
  currentRun: null,
  inputs: {},
  outputs: {},
};

export const parseRuntimeState = (value: unknown): RuntimeState => {
  if (!value) return EMPTY_RUNTIME_STATE;
  const assertNoUnsupportedRunIdentity = (
    record: Record<string, unknown>,
    location: string
  ): void => {
    const unsupportedKeys = ['runId', 'runStartedAt'].filter(
      (key: string): boolean => key in record
    );
    if (unsupportedKeys.length === 0) return;
    throw validationError('AI Paths runtime state payload includes unsupported identity fields.', {
      reason: 'unsupported_runtime_identity_fields',
      keys: unsupportedKeys,
      location,
    });
  };
  const assertNoUnsupportedRuntimeIdentityFields = (parsed: Record<string, unknown>): void => {
    assertNoUnsupportedRunIdentity(parsed, 'runtime_state');

    const events = parsed['events'];
    if (Array.isArray(events)) {
      events.forEach((entry: unknown, index: number): void => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
        assertNoUnsupportedRunIdentity(entry as Record<string, unknown>, `events[${index}]`);
      });
    }

    const history = parsed['history'];
    if (!history || typeof history !== 'object' || Array.isArray(history)) return;
    Object.entries(history as Record<string, unknown>).forEach(
      ([nodeId, entries]: [string, unknown]): void => {
        if (!Array.isArray(entries)) return;
        entries.forEach((entry: unknown, index: number): void => {
          if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
          assertNoUnsupportedRunIdentity(
            entry as Record<string, unknown>,
            `history.${nodeId}[${index}]`
          );
        });
      }
    );
  };
  const normalizeParsedRuntimeState = (parsed: Record<string, unknown>): RuntimeState => {
    assertNoUnsupportedRuntimeIdentityFields(parsed);
    const merged = {
      ...EMPTY_RUNTIME_STATE,
      ...parsed,
    };
    const validated = runtimeStateSchema.safeParse(merged);
    if (!validated.success) {
      throw validationError('Invalid AI Paths runtime state payload.', {
        reason: 'schema_validation_failed',
        issues: validated.error.flatten(),
      });
    }
    return validated.data as RuntimeState;
  };
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return normalizeParsedRuntimeState(parsed as Record<string, unknown>);
      }
      throw validationError('Invalid AI Paths runtime state payload.', {
        reason: 'invalid_shape',
      });
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }
      throw validationError('Invalid AI Paths runtime state payload.', {
        reason: 'json_parse_failed',
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return normalizeParsedRuntimeState(value as Record<string, unknown>);
  }
  throw validationError('Invalid AI Paths runtime state payload.', {
    reason: 'invalid_shape',
  });
};

export const extractNodeErrorOutputs = (error: unknown): RuntimePortValues | null => {
  if (!isObjectRecord(error)) return null;
  const maybeNodeOutput = error['nodeOutput'];
  if (!isObjectRecord(maybeNodeOutput)) return null;
  return cloneJsonSafe(maybeNodeOutput) as RuntimePortValues;
};

export const isSerializablePortValue = (value: unknown): boolean =>
  value !== undefined && typeof value !== 'function' && typeof value !== 'symbol';

export type RuntimePortDropSample = {
  bucket: 'inputs' | 'outputs' | 'nodeOutputs';
  nodeId: string;
  ports: string[];
};

export type RuntimePortDropSummary = {
  inputs: number;
  outputs: number;
  nodeOutputs: number;
  total: number;
  samples: RuntimePortDropSample[];
};

export const collectDroppedRuntimePorts = (
  original: RuntimeState,
  sanitized: RuntimeState
): RuntimePortDropSummary => {
  const summary: RuntimePortDropSummary = {
    inputs: 0,
    outputs: 0,
    nodeOutputs: 0,
    total: 0,
    samples: [],
  };
  const buckets: Array<'inputs' | 'outputs' | 'nodeOutputs'> = ['inputs', 'outputs', 'nodeOutputs'];

  buckets.forEach((bucket) => {
    const originalBucket = original[bucket] || {};
    const sanitizedBucket = sanitized[bucket] || {};

    Object.keys(originalBucket).forEach((nodeId) => {
      const originalPorts = originalBucket[nodeId] || {};
      const sanitizedPorts = sanitizedBucket[nodeId] || {};
      const droppedPorts: string[] = [];

      Object.keys(originalPorts).forEach((portId) => {
        if (!(portId in sanitizedPorts) && originalPorts[portId] !== undefined) {
          droppedPorts.push(portId);
        }
      });

      if (droppedPorts.length > 0) {
        summary[bucket] += droppedPorts.length;
        summary.total += droppedPorts.length;
        if (summary.samples.length < 10) {
          summary.samples.push({ bucket, nodeId, ports: droppedPorts });
        }
      }
    });
  });

  return summary;
};
