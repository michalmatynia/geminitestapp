import type {
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
} from '@/features/ai/ai-paths/lib';
import {
  AI_PATHS_RUN_SOURCE_TABS,
  AI_PATHS_RUN_SOURCE_VALUES,
} from '@/features/ai/ai-paths/lib/run-sources';
import type { StatusVariant } from '@/shared/ui';

import { safeJsonStringify } from './AiPathsSettingsUtils';

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
};

export type RunOrigin = 'node' | 'external' | 'unknown';
export type RunExecutionKind = 'server' | 'local' | 'other' | 'unknown';
export type StreamConnectionStatus = 'connecting' | 'live' | 'stopped' | 'paused';

const AI_PATHS_RUN_SOURCES = new Set<string>(AI_PATHS_RUN_SOURCE_VALUES);
const AI_PATHS_SOURCE_TABS = new Set<string>(AI_PATHS_RUN_SOURCE_TABS);

export const formatDate = (value?: Date | string | null): string => {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
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
  } catch {
    return raw;
  }
};

export const getLatestEventTimestamp = (
  events: AiPathRunEventRecord[]
): string | null => {
  let max = 0;
  events.forEach((event: AiPathRunEventRecord) => {
    const time = new Date(event.createdAt || Date.now()).getTime();
    if (Number.isFinite(time) && time > max) {
      max = time;
    }
  });
  return max > 0 ? new Date(max).toISOString() : null;
};

export const normalizeRunNodes = (value: unknown): AiPathRunNodeRecord[] => (
  Array.isArray(value) ? (value as AiPathRunNodeRecord[]) : []
);

export const normalizeRunEvents = (value: unknown): AiPathRunEventRecord[] => (
  Array.isArray(value) ? (value as AiPathRunEventRecord[]) : []
);

export const normalizeRunDetail = (
  value: unknown,
  fallbackRun?: AiPathRunRecord
): RunDetail | null => {
  if (!value || typeof value !== 'object') {
    return fallbackRun ? { run: fallbackRun, nodes: [], events: [] } : null;
  }
  const detail = value as { run?: unknown; nodes?: unknown; events?: unknown };
  const runCandidate = detail.run ?? fallbackRun;
  if (!runCandidate || typeof runCandidate !== 'object') {
    return null;
  }
  return {
    run: runCandidate as AiPathRunRecord,
    nodes: normalizeRunNodes(detail.nodes),
    events: normalizeRunEvents(detail.events),
  };
};

const readMetaRecord = (
  meta: AiPathRunRecord['meta']
): Record<string, unknown> | null => {
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

  const sourceRaw = meta['source'];
  const directSource = readStringValue(sourceRaw);
  if (directSource) return directSource.toLowerCase();

  if (sourceRaw && typeof sourceRaw === 'object' && !Array.isArray(sourceRaw)) {
    const sourceTab = readStringValue((sourceRaw as Record<string, unknown>)['tab']);
    if (sourceTab) return `tab:${sourceTab.toLowerCase()}`;
  }

  const sourceInfoRaw = meta['sourceInfo'];
  if (
    sourceInfoRaw &&
    typeof sourceInfoRaw === 'object' &&
    !Array.isArray(sourceInfoRaw)
  ) {
    const sourceInfoTab = readStringValue(
      (sourceInfoRaw as Record<string, unknown>)['tab']
    );
    if (sourceInfoTab) return `tab:${sourceInfoTab.toLowerCase()}`;
  }

  return null;
};

export const resolveRunSourceDebug = (run: AiPathRunRecord): string => {
  const meta = readMetaRecord(run.meta);
  if (!meta) return 'src=- infoTab=-';

  const sourceRaw = meta['source'];
  const sourceValue = readStringValue(sourceRaw)?.toLowerCase() ??
    (sourceRaw && typeof sourceRaw === 'object' && !Array.isArray(sourceRaw)
      ? 'object'
      : '-');

  const sourceInfoRaw = meta['sourceInfo'];
  const sourceInfoTab =
    sourceInfoRaw && typeof sourceInfoRaw === 'object' && !Array.isArray(sourceInfoRaw)
      ? readStringValue((sourceInfoRaw as Record<string, unknown>)['tab'])?.toLowerCase() ?? '-'
      : '-';

  return `src=${sourceValue} infoTab=${sourceInfoTab}`;
};

export const resolveRunOrigin = (run: AiPathRunRecord): RunOrigin => {
  const source = resolveRunSource(run);
  if (!source) return 'unknown';
  if (source.startsWith('tab:')) {
    const tab = source.slice(4);
    return AI_PATHS_SOURCE_TABS.has(tab) ? 'node' : 'external';
  }
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
  if (
    value === 'local' ||
    value.includes('local') ||
    value === 'client' ||
    value === 'browser'
  ) {
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
  const sourceInfoMeta =
    meta['sourceInfo'] &&
    typeof meta['sourceInfo'] === 'object' &&
    !Array.isArray(meta['sourceInfo'])
      ? (meta['sourceInfo'] as Record<string, unknown>)
      : null;

  const candidates: unknown[] = [
    meta['executionMode'],
    meta['execution_mode'],
    meta['runMode'],
    meta['run_mode'],
    meta['mode'],
    runtimeMeta?.['executionMode'],
    runtimeMeta?.['mode'],
    sourceInfoMeta?.['executionMode'],
    sourceInfoMeta?.['mode'],
  ];
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
