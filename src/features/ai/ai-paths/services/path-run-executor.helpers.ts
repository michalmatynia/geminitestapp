import {
  type AiPathRunStatus,
  type RuntimeState,
  type RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import { cloneJsonSafe } from '@/shared/lib/ai-paths';

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
  inputs: {},
  outputs: {},
};

export const parseRuntimeState = (value: unknown): RuntimeState => {
  if (!value) return EMPTY_RUNTIME_STATE;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as RuntimeState;
      return parsed && typeof parsed === 'object'
        ? {
          ...EMPTY_RUNTIME_STATE,
          ...parsed,
          inputs: parsed.inputs ?? {},
          outputs: parsed.outputs ?? {},
          nodeOutputs: parsed.nodeOutputs ?? {},
          nodeStatuses: parsed.nodeStatuses ?? {},
          variables: parsed.variables ?? {},
          events: parsed.events ?? [],
        }
        : EMPTY_RUNTIME_STATE;
    } catch {
      return EMPTY_RUNTIME_STATE;
    }
  }
  if (typeof value === 'object') {
    const parsed = value as RuntimeState;
    return {
      ...EMPTY_RUNTIME_STATE,
      ...parsed,
      inputs: parsed.inputs ?? {},
      outputs: parsed.outputs ?? {},
      nodeOutputs: parsed.nodeOutputs ?? {},
      nodeStatuses: parsed.nodeStatuses ?? {},
      variables: parsed.variables ?? {},
      events: parsed.events ?? [],
    };
  }
  return EMPTY_RUNTIME_STATE;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const extractNodeErrorOutputs = (error: unknown): RuntimePortValues | null => {
  if (!isRecord(error)) return null;
  const maybeNodeOutput = error['nodeOutput'];
  if (!isRecord(maybeNodeOutput)) return null;
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
