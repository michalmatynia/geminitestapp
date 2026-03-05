import {
  type AiPathRunStatus,
  type RuntimeState,
  type RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import { runtimeStateSchema } from '@/shared/contracts/ai-paths-runtime';
import type { NodeRuntimeKernelMode } from '@/shared/lib/ai-paths/core/runtime/node-runtime-kernel';
import {
  cloneJsonSafe,
} from '@/shared/lib/ai-paths';
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

const normalizeRuntimeKernelModeValue = (value: unknown): NodeRuntimeKernelMode | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'auto' || normalized === 'legacy_only') {
    return normalized;
  }
  return null;
};

const normalizeRuntimeKernelPilotNodeTypeToken = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, '_');

const normalizeRuntimeKernelPilotNodeTypes = (values: string[]): string[] | undefined => {
  const normalized = Array.from(
    new Set(values.map(normalizeRuntimeKernelPilotNodeTypeToken).filter(Boolean))
  );
  return normalized.length > 0 ? normalized : undefined;
};

export const parseRuntimeKernelPilotNodeTypes = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    return normalizeRuntimeKernelPilotNodeTypes(value.filter((entry): entry is string => typeof entry === 'string'));
  }
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return normalizeRuntimeKernelPilotNodeTypes(
          parsed.filter((entry): entry is string => typeof entry === 'string')
        );
      }
    } catch {
      // Fall through to tokenized parsing.
    }
  }

  return normalizeRuntimeKernelPilotNodeTypes(trimmed.split(/[,\n]/g));
};

export const resolveRuntimeKernelConfigForRun = (input: {
  envMode: unknown;
  settingMode: unknown;
  envPilotNodeTypes: unknown;
  settingPilotNodeTypes: unknown;
}): {
  mode: NodeRuntimeKernelMode;
  modeSource: 'env' | 'settings' | 'default';
  pilotNodeTypes: string[] | undefined;
  pilotSource: 'env' | 'settings' | 'default';
} => {
  const envMode = normalizeRuntimeKernelModeValue(input.envMode);
  const settingMode = normalizeRuntimeKernelModeValue(input.settingMode);
  const mode: NodeRuntimeKernelMode = envMode ?? settingMode ?? 'auto';
  const modeSource: 'env' | 'settings' | 'default' = envMode
    ? 'env'
    : settingMode
      ? 'settings'
      : 'default';

  const envPilotNodeTypes = parseRuntimeKernelPilotNodeTypes(input.envPilotNodeTypes);
  const settingsPilotNodeTypes = parseRuntimeKernelPilotNodeTypes(input.settingPilotNodeTypes);
  const pilotNodeTypes = mode === 'legacy_only' ? undefined : (envPilotNodeTypes ?? settingsPilotNodeTypes);
  const pilotSource: 'env' | 'settings' | 'default' = mode === 'legacy_only'
    ? 'default'
    : envPilotNodeTypes
      ? 'env'
      : settingsPilotNodeTypes
        ? 'settings'
        : 'default';

  return {
    mode,
    modeSource,
    pilotNodeTypes,
    pilotSource,
  };
};

export type RuntimeKernelExecutionTelemetry = {
  runtimeKernelMode: NodeRuntimeKernelMode;
  runtimeKernelModeSource: 'env' | 'settings' | 'default';
  runtimeKernelPilotNodeTypes: string[];
  runtimeKernelPilotNodeTypesSource: 'env' | 'settings' | 'default';
};

export const toRuntimeKernelExecutionTelemetry = (input: {
  mode: NodeRuntimeKernelMode;
  modeSource: 'env' | 'settings' | 'default';
  pilotNodeTypes: string[] | undefined;
  pilotSource: 'env' | 'settings' | 'default';
}): RuntimeKernelExecutionTelemetry => ({
  runtimeKernelMode: input.mode,
  runtimeKernelModeSource: input.modeSource,
  runtimeKernelPilotNodeTypes: input.pilotNodeTypes ?? [],
  runtimeKernelPilotNodeTypesSource: input.pilotSource,
});

const normalizeRuntimeStrategy = (value: unknown): 'legacy_adapter' | 'code_object_v3' | null => {
  if (value === 'legacy_adapter' || value === 'code_object_v3') {
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
  runtimeStrategy?: 'legacy_adapter' | 'code_object_v3';
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
    legacy_adapter: number;
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
      legacy_adapter: 0,
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
      if (strategy) {
        summary.strategyCounts[strategy] += 1;
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
