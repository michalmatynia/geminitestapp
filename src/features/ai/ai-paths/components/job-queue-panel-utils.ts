import type {
  AiPathRunEventRecord,
  AiPathRunErrorSummary,
  AiPathRunNodeRecord,
  AiPathRunRecord,
} from '@/shared/lib/ai-paths';
import { buildAiPathRunErrorSummary } from '@/shared/lib/ai-paths/error-reporting';
import { AI_PATHS_RUN_SOURCE_VALUES } from '@/shared/lib/ai-paths/run-sources';
import type { StatusVariant } from '@/shared/ui';

import { safeJsonStringify } from './AiPathsSettingsUtils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export type QueueHistoryEntry = {
  ts: number;
  queued: number;
  lagMs: number | null;
  throughput: number | null;
};

export type QueueStatus = {
  running: boolean;
  healthy: boolean;
  processing: boolean;
  activeRuns: number;
  concurrency: number;
  waitingCount: number;
  failedCount: number;
  completedCount: number;
  delayedCount?: number;
  pausedCount?: number;
  lastPollTime: number;
  timeSinceLastPoll: number;
  queuedCount: number;
  oldestQueuedAt: number | null;
  queueLagMs: number | null;
  completedLastMinute: number;
  throughputPerMinute: number;
  avgRuntimeMs: number | null;
  p50RuntimeMs: number | null;
  p95RuntimeMs: number | null;
  runtimeAnalytics: {
    enabled: boolean;
    storage: 'redis' | 'disabled';
  };
  brainQueue: {
    running: boolean;
    healthy: boolean;
    processing: boolean;
    activeJobs: number;
    waitingJobs: number;
    failedJobs: number;
    completedJobs: number;
  };
  brainAnalytics24h: {
    analyticsReports: number;
    logReports: number;
    totalReports: number;
    warningReports: number;
    errorReports: number;
  };
  slo?: {
    overall: 'ok' | 'warning' | 'critical';
    evaluatedAt: string;
    breachCount: number;
    breaches: Array<{
      indicator: string;
      level: 'warning' | 'critical';
      message: string;
    }>;
    indicators: {
      workerHealth: {
        level: 'ok' | 'warning' | 'critical';
        running: boolean;
        healthy: boolean;
        message: string;
      };
      queueLag: {
        level: 'ok' | 'warning' | 'critical';
        valueMs: number | null;
        message: string;
      };
      successRate24h: {
        level: 'ok' | 'warning' | 'critical';
        valuePct: number;
        sampleSize: number;
        message: string;
      };
      deadLetterRate24h: {
        level: 'ok' | 'warning' | 'critical';
        valuePct: number;
        sampleSize: number;
        message: string;
      };
      brainErrorRate24h: {
        level: 'ok' | 'warning' | 'critical';
        valuePct: number;
        sampleSize: number;
        message: string;
      };
    };
  };
};

export type RunDetail = {
  run: AiPathRunRecord;
  nodes: AiPathRunNodeRecord[];
  events: AiPathRunEventRecord[];
  errorSummary: AiPathRunErrorSummary | null;
};

export type RunOrigin = 'node' | 'external' | 'unknown';
export type RunExecutionKind = 'server' | 'local' | 'other' | 'unknown';
export type StreamConnectionStatus = 'connecting' | 'live' | 'stopped' | 'paused';

const AI_PATHS_RUN_SOURCES = new Set<string>(AI_PATHS_RUN_SOURCE_VALUES);

export const formatDate = (value?: Date | string | null): string => {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

export const formatUtcClockTime = (
  value?: Date | string | number | null
): string => {
  if (value === null || value === undefined || value === '') return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.toISOString().slice(11, 19)} UTC`;
};

export const formatUtcDateTime = (
  value?: Date | string | number | null
): string => {
  if (value === null || value === undefined || value === '') return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.toISOString().slice(0, 19).replace('T', ' ')} UTC`;
};

export const formatDurationMs = (value?: number | null): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  if (value < 1000) return `${Math.max(0, value)}ms`;
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
};

export const getSloVariant = (
  level?: 'ok' | 'warning' | 'critical'
): 'error' | 'warning' | 'success' => {
  if (level === 'critical') return 'error';
  if (level === 'warning') return 'warning';
  return 'success';
};

export const safePrettyJson = (value: unknown): string => {
  const raw = safeJsonStringify(value);
  if (!raw) return '';
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch (error) {
    logClientError(error);
    return raw;
  }
};

export const getLatestEventTimestamp = (events: AiPathRunEventRecord[]): string | null => {
  let max = 0;
  events.forEach((event: AiPathRunEventRecord) => {
    const time = new Date(event.createdAt || Date.now()).getTime();
    if (Number.isFinite(time) && time > max) {
      max = time;
    }
  });
  return max > 0 ? new Date(max).toISOString() : null;
};

const toTimestamp = (value: unknown): number | null => {
  if (typeof value !== 'string') return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const normalizeRunNodes = (value: unknown): AiPathRunNodeRecord[] => {
  if (!Array.isArray(value)) return [];
  return (value as AiPathRunNodeRecord[])
    .map((node: AiPathRunNodeRecord, index: number) => ({ node, index }))
    .sort((left, right) => {
      const leftFinished = toTimestamp(left.node.finishedAt) ?? toTimestamp(left.node.completedAt);
      const rightFinished =
        toTimestamp(right.node.finishedAt) ?? toTimestamp(right.node.completedAt);
      if (leftFinished !== null && rightFinished !== null && leftFinished !== rightFinished) {
        return leftFinished - rightFinished;
      }
      if (leftFinished !== null && rightFinished === null) return -1;
      if (leftFinished === null && rightFinished !== null) return 1;

      const leftStarted = toTimestamp(left.node.startedAt);
      const rightStarted = toTimestamp(right.node.startedAt);
      if (leftStarted !== null && rightStarted !== null && leftStarted !== rightStarted) {
        return leftStarted - rightStarted;
      }
      if (leftStarted !== null && rightStarted === null) return -1;
      if (leftStarted === null && rightStarted !== null) return 1;

      const leftUpdated = toTimestamp(left.node.updatedAt);
      const rightUpdated = toTimestamp(right.node.updatedAt);
      if (leftUpdated !== null && rightUpdated !== null && leftUpdated !== rightUpdated) {
        return leftUpdated - rightUpdated;
      }
      if (leftUpdated !== null && rightUpdated === null) return -1;
      if (leftUpdated === null && rightUpdated !== null) return 1;

      const leftCreated = toTimestamp(left.node.createdAt);
      const rightCreated = toTimestamp(right.node.createdAt);
      if (leftCreated !== null && rightCreated !== null && leftCreated !== rightCreated) {
        return leftCreated - rightCreated;
      }
      if (leftCreated !== null && rightCreated === null) return -1;
      if (leftCreated === null && rightCreated !== null) return 1;

      const leftNodeId = left.node.nodeId ?? '';
      const rightNodeId = right.node.nodeId ?? '';
      if (leftNodeId !== rightNodeId) return leftNodeId.localeCompare(rightNodeId);
      return left.index - right.index;
    })
    .map((entry) => entry.node);
};

export const normalizeRunEvents = (value: unknown): AiPathRunEventRecord[] =>
  Array.isArray(value) ? (value as AiPathRunEventRecord[]) : [];

export const refreshRunDetailErrorSummary = (detail: {
  run: AiPathRunRecord;
  nodes: AiPathRunNodeRecord[];
  events: AiPathRunEventRecord[];
  errorSummary?: AiPathRunErrorSummary | null;
}): RunDetail => ({
  run: detail.run,
  nodes: detail.nodes,
  events: detail.events,
  errorSummary: buildAiPathRunErrorSummary({
    run: detail.run,
    nodes: detail.nodes,
    events: detail.events,
  }),
});

export const normalizeRunDetail = (
  value: unknown,
  fallbackRun?: AiPathRunRecord
): RunDetail | null => {
  if (!value || typeof value !== 'object') {
    return fallbackRun
      ? {
        run: fallbackRun,
        nodes: [],
        events: [],
        errorSummary: buildAiPathRunErrorSummary({
          run: fallbackRun,
          nodes: [],
          events: [],
        }),
      }
      : null;
  }
  const detail = value as {
    run?: unknown;
    nodes?: unknown;
    events?: unknown;
    errorSummary?: unknown;
  };
  const runCandidate = detail.run ?? fallbackRun;
  if (!runCandidate || typeof runCandidate !== 'object') {
    return null;
  }
  const run = runCandidate as AiPathRunRecord;
  const nodes = normalizeRunNodes(detail.nodes);
  const events = normalizeRunEvents(detail.events);
  return refreshRunDetailErrorSummary({
    run,
    nodes,
    events,
  });
};

const readMetaRecord = (meta: AiPathRunRecord['meta']): Record<string, unknown> | null => {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  return meta;
};

const readStringValue = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const resolveRunSource = (run: AiPathRunRecord): string | null => {
  const meta = readMetaRecord(run.meta);
  if (!meta) return null;

  const directSource = readStringValue(meta['source']);
  if (directSource) return directSource.toLowerCase();

  return null;
};

export const resolveRunSourceDebug = (run: AiPathRunRecord): string => {
  const meta = readMetaRecord(run.meta);
  if (!meta) return 'src=-';
  return `src=${readStringValue(meta['source'])?.toLowerCase() ?? '-'}`;
};

export const resolveRunOrigin = (run: AiPathRunRecord): RunOrigin => {
  const source = resolveRunSource(run);
  if (!source) return 'unknown';
  return AI_PATHS_RUN_SOURCES.has(source) ? 'node' : 'external';
};

const resolveExecutionCandidate = (raw: unknown): RunExecutionKind | null => {
  const value = readStringValue(raw)?.toLowerCase();
  if (!value) return null;
  if (
    value === 'server' ||
    value.includes('server') ||
    value === 'queue' ||
    value === 'worker' ||
    value === 'remote'
  ) {
    return 'server';
  }
  if (value === 'local' || value.includes('local') || value === 'client' || value === 'browser') {
    return 'local';
  }
  if (value === 'unknown') return 'unknown';
  return 'other';
};

export const resolveRunExecutionKind = (run: AiPathRunRecord): RunExecutionKind => {
  const meta = readMetaRecord(run.meta);
  if (!meta) return 'unknown';

  const runtimeMeta =
    meta['runtime'] && typeof meta['runtime'] === 'object' && !Array.isArray(meta['runtime'])
      ? (meta['runtime'] as Record<string, unknown>)
      : null;

  const candidates: unknown[] = [meta['executionMode'], runtimeMeta?.['executionMode']];
  for (const candidate of candidates) {
    const resolved = resolveExecutionCandidate(candidate);
    if (resolved) return resolved;
  }

  return 'unknown';
};

export const getPanelLabel = (
  sourceFilter?: string | null,
  sourceMode?: 'include' | 'exclude'
): string => {
  if (sourceFilter === 'ai_paths_ui' && sourceMode === 'exclude') return 'External Runs';
  if (sourceFilter === 'ai_paths_ui') return 'Node Runs';
  return 'Job Runs';
};

export const getPanelDescription = (
  sourceFilter?: string | null,
  sourceMode?: 'include' | 'exclude'
): string => {
  if (sourceFilter === 'ai_paths_ui' && sourceMode === 'exclude') {
    return 'Runs that do not originate from the AI Paths node system.';
  }
  if (sourceFilter === 'ai_paths_ui') {
    return 'Runs that originate from the AI Paths node system.';
  }
  return 'Full run payloads and queue snapshots.';
};

export const getOriginLabel = (origin: RunOrigin): string => {
  if (origin === 'node') return 'Node';
  if (origin === 'external') return 'External';
  return 'Unknown';
};

export const getOriginVariant = (origin: RunOrigin): StatusVariant => {
  if (origin === 'node') return 'success';
  if (origin === 'external') return 'warning';
  return 'neutral';
};

export const getExecutionLabel = (execution: RunExecutionKind): string => {
  if (execution === 'server') return 'Server';
  if (execution === 'local') return 'Local';
  if (execution === 'other') return 'Other';
  return 'Unknown';
};

export const getExecutionVariant = (execution: RunExecutionKind): StatusVariant => {
  if (execution === 'server') return 'processing';
  if (execution === 'local') return 'info';
  if (execution === 'other') return 'neutral';
  return 'neutral';
};

export const isRunningStatus = (status: unknown): boolean =>
  typeof status === 'string' && status.trim().toLowerCase() === 'running';
