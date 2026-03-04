import {
  type AiPathRunStatus,
  type RuntimeState,
  type RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import { runtimeStateSchema } from '@/shared/contracts/ai-paths-runtime';
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
  const assertNoLegacyRunIdentity = (record: Record<string, unknown>, location: string): void => {
    const deprecatedKeys = ['runId', 'runStartedAt'].filter(
      (key: string): boolean => key in record
    );
    if (deprecatedKeys.length === 0) return;
    throw validationError('Legacy AI Paths runtime identity fields are no longer supported.', {
      reason: 'deprecated_runtime_identity_fields',
      keys: deprecatedKeys,
      location,
    });
  };
  const assertNoLegacyRuntimeIdentityFields = (parsed: Record<string, unknown>): void => {
    assertNoLegacyRunIdentity(parsed, 'runtime_state');

    const events = parsed['events'];
    if (Array.isArray(events)) {
      events.forEach((entry: unknown, index: number): void => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
        assertNoLegacyRunIdentity(entry as Record<string, unknown>, `events[${index}]`);
      });
    }

    const history = parsed['history'];
    if (!history || typeof history !== 'object' || Array.isArray(history)) return;
    Object.entries(history as Record<string, unknown>).forEach(
      ([nodeId, entries]: [string, unknown]): void => {
        if (!Array.isArray(entries)) return;
        entries.forEach((entry: unknown, index: number): void => {
          if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
          assertNoLegacyRunIdentity(
            entry as Record<string, unknown>,
            `history.${nodeId}[${index}]`
          );
        });
      }
    );
  };
  const normalizeParsedRuntimeState = (parsed: Record<string, unknown>): RuntimeState => {
    assertNoLegacyRuntimeIdentityFields(parsed);
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
