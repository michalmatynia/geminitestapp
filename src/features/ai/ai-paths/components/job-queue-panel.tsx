'use client';

import { Trash2 } from 'lucide-react';
import React from 'react';

import { runsApi } from '@/features/ai/ai-paths/lib';
import type {
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
} from '@/features/ai/ai-paths/lib';
import {
  AI_PATHS_RUN_SOURCE_TABS,
  AI_PATHS_RUN_SOURCE_VALUES,
} from '@/features/ai/ai-paths/lib/run-sources';
import { fetchAiPathsSettingsCached } from '@/features/ai/ai-paths/lib/settings-store-client';
import { createListQueryV2, createMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import {
  Button,
  ConfirmDialog,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useToast,
  StatusBadge,
  Alert,
  type StatusVariant,
} from '@/shared/ui';

import { safeJsonStringify } from './AiPathsSettingsUtils';
import { buildHistoryNodeOptions } from './run-history-utils';
import { RunHistoryEntries } from './RunHistoryEntries';

type QueueHistoryEntry = {
  ts: number;
  queued: number;
  lagMs: number | null;
  throughput: number | null;
};

type JobQueuePanelProps = {
  activePathId?: string | null;
  sourceFilter?: string | null;
  sourceMode?: 'include' | 'exclude';
};

type RunDetail = {
  run: AiPathRunRecord;
  nodes: AiPathRunNodeRecord[];
  events: AiPathRunEventRecord[];
};

type QueueStatus = {
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

type StreamMessageEvent = Event & { data: string };
type RunOrigin = 'node' | 'external' | 'unknown';
type RunExecutionKind = 'server' | 'local' | 'other' | 'unknown';

const PAGE_SIZES = [10, 25, 50];
const SEARCH_DEBOUNCE_MS = 300;
const AUTO_REFRESH_ENABLED_KEY = 'ai-paths-job-queue-auto-refresh-enabled';
const AUTO_REFRESH_INTERVAL_KEY = 'ai-paths-job-queue-auto-refresh-interval';
const QUEUE_LAG_THRESHOLD_KEY = 'ai_paths_queue_lag_threshold_ms';
const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'queued', label: 'Queued' },
  { id: 'running', label: 'Running' },
  { id: 'paused', label: 'Paused' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' },
  { id: 'canceled', label: 'Canceled' },
  { id: 'dead_lettered', label: 'Dead-lettered' },
] as const;
const AI_PATHS_RUN_SOURCES = new Set<string>(AI_PATHS_RUN_SOURCE_VALUES);
const AI_PATHS_SOURCE_TABS = new Set<string>(AI_PATHS_RUN_SOURCE_TABS);

const formatDate = (value?: Date | string | null): string => {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const formatDurationMs = (value?: number | null): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  if (value < 1000) return `${Math.max(0, value)}ms`;
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
};

const getSloVariant = (level?: 'ok' | 'warning' | 'critical'): 'error' | 'warning' | 'success' => {
  if (level === 'critical') return 'error';
  if (level === 'warning') return 'warning';
  return 'success';
};

const safePrettyJson = (value: unknown): string => {
  const raw = safeJsonStringify(value);
  if (!raw) return '';
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
};

const getLatestEventTimestamp = (events: AiPathRunEventRecord[]): string | null => {
  let max = 0;
  events.forEach((event: AiPathRunEventRecord) => {
    const time = new Date(event.createdAt).getTime();
    if (Number.isFinite(time) && time > max) {
      max = time;
    }
  });
  return max > 0 ? new Date(max).toISOString() : null;
};

const normalizeRunNodes = (value: unknown): AiPathRunNodeRecord[] => (
  Array.isArray(value) ? value as AiPathRunNodeRecord[] : []
);

const normalizeRunEvents = (value: unknown): AiPathRunEventRecord[] => (
  Array.isArray(value) ? value as AiPathRunEventRecord[] : []
);

const normalizeRunDetail = (value: unknown, fallbackRun?: AiPathRunRecord): RunDetail | null => {
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

const readMetaRecord = (meta: AiPathRunRecord['meta']): Record<string, unknown> | null => {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  return meta;
};

const readStringValue = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const resolveRunSource = (run: AiPathRunRecord): string | null => {
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
  if (sourceInfoRaw && typeof sourceInfoRaw === 'object' && !Array.isArray(sourceInfoRaw)) {
    const sourceInfoTab = readStringValue((sourceInfoRaw as Record<string, unknown>)['tab']);
    if (sourceInfoTab) return `tab:${sourceInfoTab.toLowerCase()}`;
  }

  return null;
};

const resolveRunSourceDebug = (run: AiPathRunRecord): string => {
  const meta = readMetaRecord(run.meta);
  if (!meta) return 'src=- infoTab=-';

  const sourceRaw = meta['source'];
  const sourceValue = readStringValue(sourceRaw)?.toLowerCase() ?? (
    sourceRaw && typeof sourceRaw === 'object' && !Array.isArray(sourceRaw) ? 'object' : '-'
  );

  const sourceInfoRaw = meta['sourceInfo'];
  const sourceInfoTab =
    sourceInfoRaw && typeof sourceInfoRaw === 'object' && !Array.isArray(sourceInfoRaw)
      ? readStringValue((sourceInfoRaw as Record<string, unknown>)['tab'])?.toLowerCase() ?? '-'
      : '-';

  return `src=${sourceValue} infoTab=${sourceInfoTab}`;
};

const resolveRunOrigin = (run: AiPathRunRecord): RunOrigin => {
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

const resolveRunExecutionKind = (run: AiPathRunRecord): RunExecutionKind => {
  const meta = readMetaRecord(run.meta);
  if (!meta) return 'unknown';

  const runtimeMeta =
    meta['runtime'] && typeof meta['runtime'] === 'object' && !Array.isArray(meta['runtime'])
      ? (meta['runtime'] as Record<string, unknown>)
      : null;
  const sourceInfoMeta =
    meta['sourceInfo'] && typeof meta['sourceInfo'] === 'object' && !Array.isArray(meta['sourceInfo'])
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

const getPanelLabel = (
  sourceFilter?: string | null,
  sourceMode?: 'include' | 'exclude'
): string => {
  if (sourceFilter === 'ai_paths_ui' && sourceMode === 'exclude') return 'External Runs';
  if (sourceFilter === 'ai_paths_ui') return 'Node Runs';
  return 'Job Runs';
};

const getPanelDescription = (
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

const getOriginLabel = (origin: RunOrigin): string => {
  if (origin === 'node') return 'Node';
  if (origin === 'external') return 'External';
  return 'Unknown';
};

const getOriginVariant = (origin: RunOrigin): StatusVariant => {
  if (origin === 'node') return 'success';
  if (origin === 'external') return 'warning';
  return 'neutral';
};

const getExecutionLabel = (execution: RunExecutionKind): string => {
  if (execution === 'server') return 'Server';
  if (execution === 'local') return 'Local';
  if (execution === 'other') return 'Other';
  return 'Unknown';
};

const getExecutionVariant = (execution: RunExecutionKind): StatusVariant => {
  if (execution === 'server') return 'processing';
  if (execution === 'local') return 'info';
  if (execution === 'other') return 'neutral';
  return 'neutral';
};

const isRunningStatus = (status: unknown): boolean =>
  typeof status === 'string' && status.trim().toLowerCase() === 'running';

const RunningIndicator = ({ label = 'Running' }: { label?: string }): React.JSX.Element => (
  <StatusBadge
    status={label}
    variant='processing'
    size='sm'
    icon={(
      <span className='relative inline-flex h-2 w-2'>
        <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400/80' />
        <span className='relative inline-flex h-2 w-2 rounded-full bg-sky-300' />
      </span>
    )}
  />
);

export function JobQueuePanel({
  activePathId,
  sourceFilter,
  sourceMode,
}: JobQueuePanelProps): React.JSX.Element {
  const { toast } = useToast();
  const [pathFilter, setPathFilter] = React.useState(activePathId ?? '');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState(searchQuery);
  const [statusFilter, setStatusFilter] = React.useState<(typeof STATUS_FILTERS)[number]['id']>('all');
  const [pageSize, setPageSize] = React.useState(25);
  const [page, setPage] = React.useState(1);
  const [expandedRunIds, setExpandedRunIds] = React.useState<Set<string>>(new Set());
  const [runDetails, setRunDetails] = React.useState<Record<string, RunDetail | null>>({});
  const [runDetailLoading, setRunDetailLoading] = React.useState<Set<string>>(new Set());
  const [runDetailErrors, setRunDetailErrors] = React.useState<Record<string, string>>({});
  const [historySelection, setHistorySelection] = React.useState<Record<string, string>>({});
  const [streamStatuses, setStreamStatuses] = React.useState<
    Record<string, 'connecting' | 'live' | 'stopped' | 'paused'>
  >({});
  const streamSourcesRef = React.useRef<Map<string, EventSource>>(new Map());
  const [pausedStreams, setPausedStreams] = React.useState<Set<string>>(new Set());
  // Keep first render deterministic (SSR == client hydration). Load persisted prefs after mount.
  const [autoRefreshEnabled, setAutoRefreshEnabled] = React.useState(true);
  const [autoRefreshInterval, setAutoRefreshInterval] = React.useState(5000);
  const [clearScope, setClearScope] = React.useState<'terminal' | 'all' | null>(null);
  const [runToDelete, setRunToDelete] = React.useState<AiPathRunRecord | null>(null);
  const aiPathsSettingsQuery = createListQueryV2<
    Array<{ key: string; value: string }>,
    Array<{ key: string; value: string }>
  >({
    queryKey: QUERY_KEYS.ai.aiPaths.settings(),
    queryFn: async (): Promise<Array<{ key: string; value: string }>> =>
      await fetchAiPathsSettingsCached(),
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'ai.ai-paths.job-queue.settings',
      operation: 'list',
      resource: 'ai-paths.settings',
      domain: 'global',
      tags: ['ai-paths', 'job-queue'],
    },
  });
  const heavyMap = React.useMemo(
    () => new Map((aiPathsSettingsQuery.data ?? []).map((item) => [item.key, item.value])),
    [aiPathsSettingsQuery.data]
  );

  const normalizedPathFilter = pathFilter.trim();
  const normalizedQuery = debouncedQuery.trim();
  const normalizedSourceFilter = sourceFilter?.trim() || '';
  const offset = (page - 1) * pageSize;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, SEARCH_DEBOUNCE_MS);
    return (): void => clearTimeout(timer);
  }, [searchQuery]);

  React.useEffect(() => {
    const savedEnabled = window.localStorage.getItem(AUTO_REFRESH_ENABLED_KEY);
    const nextEnabled = savedEnabled === 'false' ? false : true;
    setAutoRefreshEnabled(nextEnabled);

    const savedInterval = window.localStorage.getItem(AUTO_REFRESH_INTERVAL_KEY);
    const parsed = savedInterval ? Number.parseInt(savedInterval, 10) : NaN;
    const nextInterval = Number.isFinite(parsed) && parsed > 0 ? parsed : 5000;
    setAutoRefreshInterval(nextInterval);
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      AUTO_REFRESH_ENABLED_KEY,
      autoRefreshEnabled ? 'true' : 'false'
    );
  }, [autoRefreshEnabled]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(AUTO_REFRESH_INTERVAL_KEY, String(autoRefreshInterval));
  }, [autoRefreshInterval]);

  React.useEffect(() => {
    setPage(1);
  }, [normalizedPathFilter, normalizedQuery, statusFilter, pageSize]);

  const runsQuery = createListQueryV2<{ runs: AiPathRunRecord[]; total: number }, { runs: AiPathRunRecord[]; total: number }>({
    queryKey: QUERY_KEYS.ai.aiPaths.jobQueue({
      pathId: normalizedPathFilter,
      source: normalizedSourceFilter,
      sourceMode: sourceMode ?? 'include',
      query: normalizedQuery,
      status: statusFilter,
      page,
      pageSize,
    }),
    queryFn: async () => {
      const response = await runsApi.list({
        ...(normalizedPathFilter ? { pathId: normalizedPathFilter } : {}),
        ...(normalizedSourceFilter ? { source: normalizedSourceFilter } : {}),
        ...(normalizedSourceFilter ? { sourceMode: sourceMode ?? 'include' } : {}),
        ...(normalizedQuery ? { query: normalizedQuery } : {}),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        limit: pageSize,
        offset,
      });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to load job queue.');
      }
      return response.data as { runs: AiPathRunRecord[]; total: number };
    },
    refetchInterval: autoRefreshEnabled ? autoRefreshInterval : false,
    meta: {
      source: 'ai.ai-paths.job-queue.runs',
      operation: 'list',
      resource: 'ai-paths.job-queue',
      domain: 'global',
      tags: ['ai-paths', 'job-queue'],
    },
  });

  const queueStatusQuery = createListQueryV2<{ status: QueueStatus }, { status: QueueStatus }>({
    queryKey: QUERY_KEYS.ai.aiPaths.queueStatus(),
    queryFn: async () => {
      const response = await runsApi.queueStatus();
      if (!response.ok) {
        throw new Error(response.error || 'Failed to load queue status.');
      }
      return response.data as { status: QueueStatus };
    },
    refetchInterval: autoRefreshEnabled ? autoRefreshInterval : false,
    meta: {
      source: 'ai.ai-paths.job-queue.status',
      operation: 'polling',
      resource: 'ai-paths.queue-status',
      domain: 'global',
      tags: ['ai-paths', 'job-queue'],
    },
  });

  const clearRunsMutation = createMutationV2({
    mutationKey: QUERY_KEYS.ai.aiPaths.mutation('job-queue.clear-runs'),
    mutationFn: async (scope: 'terminal' | 'all'): Promise<{ deleted: number; scope: 'all' | 'terminal' }> => {
      const response = await runsApi.clear({
        scope,
        ...(normalizedPathFilter ? { pathId: normalizedPathFilter } : {}),
        ...(normalizedSourceFilter ? { source: normalizedSourceFilter, sourceMode: sourceMode ?? 'include' } : {}),
      });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to clear runs.');
      }
      return response.data as { deleted: number; scope: 'all' | 'terminal' };
    },
    meta: {
      source: 'ai.ai-paths.job-queue.clear-runs',
      operation: 'delete',
      resource: 'ai-paths.runs',
      domain: 'global',
      tags: ['ai-paths', 'job-queue'],
    },
    onSuccess: (result: { deleted: number; scope: 'all' | 'terminal' }) => {
      toast(
        result.scope === 'all'
          ? `Cleared ${result.deleted} run(s).`
          : `Cleared ${result.deleted} finished run(s).`,
        { variant: 'success' }
      );
      setClearScope(null);
      void runsQuery.refetch();
      void queueStatusQuery.refetch();
    },
    onError: (error: unknown) => {
      toast(error instanceof Error ? error.message : 'Failed to clear runs.', { variant: 'error' });
    },
  });

  const cancelRunMutation = createMutationV2({
    mutationKey: QUERY_KEYS.ai.aiPaths.mutation('job-queue.cancel-run'),
    mutationFn: async (
      runId: string
    ): Promise<{ canceled?: boolean; message?: string | undefined }> => {
      const response = await runsApi.cancel(runId);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to cancel run.');
      }
      return (response.data ?? {}) as { canceled?: boolean; message?: string | undefined };
    },
    meta: {
      source: 'ai.ai-paths.job-queue.cancel-run',
      operation: 'action',
      resource: 'ai-paths.runs.cancel',
      domain: 'global',
      tags: ['ai-paths', 'job-queue'],
    },
    onSuccess: (result: { canceled?: boolean; message?: string | undefined }) => {
      const wasCanceled = result.canceled !== false;
      toast(result.message || (wasCanceled ? 'Run canceled.' : 'Run already finished or removed.'), {
        variant: wasCanceled ? 'success' : 'info',
      });
      void runsQuery.refetch();
      void queueStatusQuery.refetch();
    },
    onError: (error: unknown) => {
      toast(error instanceof Error ? error.message : 'Failed to cancel run.', { variant: 'error' });
    },
  });

  const clearRunFromLocalState = React.useCallback((runId: string): void => {
    const source = streamSourcesRef.current.get(runId);
    if (source) {
      source.close();
      streamSourcesRef.current.delete(runId);
    }
    setExpandedRunIds((prev: Set<string>) => {
      const next = new Set(prev);
      next.delete(runId);
      return next;
    });
    setRunDetails((prev: Record<string, RunDetail | null>) => {
      const next = { ...prev };
      delete next[runId];
      return next;
    });
    setRunDetailErrors((prev: Record<string, string>) => {
      const next = { ...prev };
      delete next[runId];
      return next;
    });
    setRunDetailLoading((prev: Set<string>) => {
      const next = new Set(prev);
      next.delete(runId);
      return next;
    });
    setHistorySelection((prev: Record<string, string>) => {
      const next = { ...prev };
      delete next[runId];
      return next;
    });
    setStreamStatuses((prev: Record<string, 'connecting' | 'live' | 'stopped' | 'paused'>) => {
      const next = { ...prev };
      delete next[runId];
      return next;
    });
    setPausedStreams((prev: Set<string>) => {
      const next = new Set(prev);
      next.delete(runId);
      return next;
    });
  }, []);

  const deleteRunMutation = createMutationV2({
    mutationKey: QUERY_KEYS.ai.aiPaths.mutation('job-queue.delete-run'),
    mutationFn: async (runId: string): Promise<void> => {
      const response = await runsApi.remove(runId);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to delete run.');
      }
    },
    meta: {
      source: 'ai.ai-paths.job-queue.delete-run',
      operation: 'delete',
      resource: 'ai-paths.runs',
      domain: 'global',
      tags: ['ai-paths', 'job-queue'],
    },
    onSuccess: (_data: void, runId: string) => {
      clearRunFromLocalState(runId);
      setRunToDelete(null);
      toast('Run deleted.', { variant: 'success' });
      void runsQuery.refetch();
      void queueStatusQuery.refetch();
    },
    onError: (error: unknown) => {
      toast(error instanceof Error ? error.message : 'Failed to delete run.', { variant: 'error' });
    },
  });

  const total = runsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const runs = runsQuery.data?.runs ?? [];
  const queueStatus = queueStatusQuery.data?.status;
  const [queueHistory, setQueueHistory] = React.useState<QueueHistoryEntry[]>([]);
  const [showMetricsPanel, setShowMetricsPanel] = React.useState(false);
  const lagThresholdRaw = heavyMap.get(QUEUE_LAG_THRESHOLD_KEY);
  const lagThresholdMs = React.useMemo(() => {
    const raw = lagThresholdRaw;
    const parsed = raw ? Number(raw) : Number.NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 60_000;
  }, [lagThresholdRaw]);
  const panelLabel = React.useMemo(
    (): string => getPanelLabel(sourceFilter, sourceMode),
    [sourceFilter, sourceMode]
  );
  const panelDescription = React.useMemo(
    (): string => getPanelDescription(sourceFilter, sourceMode),
    [sourceFilter, sourceMode]
  );

  React.useEffect(() => {
    if (!queueStatus) return;
    setQueueHistory((prev: QueueHistoryEntry[]) => {
      const next = [
        ...prev,
        {
          ts: Date.now(),
          queued: queueStatus.queuedCount ?? 0,
          lagMs: queueStatus.queueLagMs ?? null,
          throughput: queueStatus.throughputPerMinute ?? null,
        },
      ];
      return next.slice(-120);
    });
  }, [queueStatus]);

  React.useEffect(() => {
    const sources = streamSourcesRef.current;
    return (): void => {
      sources.forEach((source: EventSource) => source.close());
      sources.clear();
    };
  }, []);

  React.useEffect(() => {
    streamSourcesRef.current.forEach((source: EventSource, runId: string) => {
      if (!expandedRunIds.has(runId)) {
        source.close();
        streamSourcesRef.current.delete(runId);
        setStreamStatuses((prev: Record<string, 'connecting' | 'live' | 'stopped' | 'paused'>) => ({ ...prev, [runId]: 'stopped' }));
      }
    });

    expandedRunIds.forEach((runId: string) => {
      if (streamSourcesRef.current.has(runId)) return;
      if (pausedStreams.has(runId)) return;
      const existing = runDetails[runId];
      const since = existing ? getLatestEventTimestamp(existing.events) : null;
      const params = new URLSearchParams();
      if (since) params.set('since', since);
      const url = params.toString()
        ? `/api/ai-paths/runs/${encodeURIComponent(runId)}/stream?${params.toString()}`
        : `/api/ai-paths/runs/${encodeURIComponent(runId)}/stream`;
      const source = new EventSource(url);
      streamSourcesRef.current.set(runId, source);
      setStreamStatuses((prev: Record<string, 'connecting' | 'live' | 'stopped' | 'paused'>) => ({ ...prev, [runId]: 'connecting' }));

      const mergeEvents = (incoming: AiPathRunEventRecord[]): void => {
        const safeIncoming = normalizeRunEvents(incoming);
        if (safeIncoming.length === 0) {
          return;
        }
        setRunDetails((prev: Record<string, RunDetail | null>) => {
          const current = normalizeRunDetail(prev[runId]);
          if (!current) {
            return prev;
          }
          const existingIds = new Set(current.events.map((event: AiPathRunEventRecord) => event.id));
          const merged = [...current.events];
          safeIncoming.forEach((event: AiPathRunEventRecord) => {
            if (!existingIds.has(event.id)) {
              merged.push(event);
            }
          });
          merged.sort((a: AiPathRunEventRecord, b: AiPathRunEventRecord) => {
            const aTime = new Date(a.createdAt).getTime();
            const bTime = new Date(b.createdAt).getTime();
            return aTime - bTime;
          });
          return { ...prev, [runId]: { ...current, events: merged } };
        });
      };
          
      source.addEventListener('ready', () => {
        setStreamStatuses((prev: Record<string, 'connecting' | 'live' | 'stopped' | 'paused'>) => ({ ...prev, [runId]: 'live' }));
      });
      source.addEventListener('run', (event: Event) => {
        try {
          const payload = JSON.parse((event as StreamMessageEvent).data) as unknown;
          if (!payload || typeof payload !== 'object') {
            return;
          }
          setRunDetails((prev: Record<string, RunDetail | null>) => {
            const current = normalizeRunDetail(prev[runId], payload as AiPathRunRecord);
            if (!current) return prev;
            return { ...prev, [runId]: { ...current, run: payload as AiPathRunRecord } };
          });
        } catch {
          // ignore parse errors
        }
      });
      source.addEventListener('nodes', (event: Event) => {
        try {
          const payload = JSON.parse((event as StreamMessageEvent).data) as unknown;
          const nodes = normalizeRunNodes(payload);
          setRunDetails((prev: Record<string, RunDetail | null>) => {
            const current = normalizeRunDetail(prev[runId]);
            if (!current) return prev;
            return { ...prev, [runId]: { ...current, nodes } };
          });
        } catch {
          // ignore parse errors
        }
      });
      source.addEventListener('events', (event: Event) => {
        try {
          const payload = JSON.parse((event as StreamMessageEvent).data) as unknown;
          if (Array.isArray(payload)) {
            mergeEvents(normalizeRunEvents(payload));
            return;
          }
          if (payload && typeof payload === 'object') {
            const events = normalizeRunEvents((payload as { events?: unknown }).events);
            mergeEvents(events);
          }
        } catch {
          // ignore parse errors
        }
      });
      source.addEventListener('done', () => {
        setStreamStatuses((prev: Record<string, 'connecting' | 'live' | 'stopped' | 'paused'>) => ({ ...prev, [runId]: 'stopped' }));
        source.close();
        streamSourcesRef.current.delete(runId);
      });
      source.addEventListener('error', () => {
        setStreamStatuses((prev: Record<string, 'connecting' | 'live' | 'stopped' | 'paused'>) => ({ ...prev, [runId]: 'stopped' }));
        source.close();
        streamSourcesRef.current.delete(runId);
      });
    });
  }, [expandedRunIds, pausedStreams, runDetails]);
          
  const loadRunDetail = React.useCallback(async (runId: string): Promise<void> => {
    setRunDetailErrors((prev: Record<string, string>) => {
      const next = { ...prev };
      delete next[runId];
      return next;
    });
    setRunDetailLoading((prev: Set<string>) => new Set(prev).add(runId));
    try {
      const response = await runsApi.get(runId);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to load run details.');
      }
      const data = normalizeRunDetail(response.data);
      if (!data) {
        throw new Error('Failed to load run details.');
      }
      setRunDetails((prev: Record<string, RunDetail | null>) => ({ ...prev, [runId]: data }));
    } catch (error) {
      setRunDetailErrors((prev: Record<string, string>) => ({
        ...prev,
        [runId]: error instanceof Error ? error.message : 'Failed to load run details.',
      }));
    } finally {
      setRunDetailLoading((prev: Set<string>) => {
        const next = new Set(prev);
        next.delete(runId);
        return next;
      });
    }
  }, []);
          
  const toggleRun = (runId: string): void => {
    setExpandedRunIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else {
        next.add(runId);
      }
      return next;
    });    if (!runDetails[runId]) {
      void loadRunDetail(runId);
    }
  };

  const toggleStream = (runId: string): void => {
    const source = streamSourcesRef.current.get(runId);
    setPausedStreams((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
        setStreamStatuses((statusPrev: Record<string, 'connecting' | 'live' | 'stopped' | 'paused'>) => ({ ...statusPrev, [runId]: 'connecting' }));
      } else {
        next.add(runId);
        setStreamStatuses((statusPrev: Record<string, 'connecting' | 'live' | 'stopped' | 'paused'>) => ({ ...statusPrev, [runId]: 'paused' }));
      }
      return next;
    });
    if (source) {
      source.close();
      streamSourcesRef.current.delete(runId);
    }
  };

  const pauseAllStreams = (): void => {
    const expandedIds = Array.from(expandedRunIds);
    if (expandedIds.length === 0) return;
    setPausedStreams(() => new Set(expandedIds));
    streamSourcesRef.current.forEach((source: EventSource) => source.close());
    streamSourcesRef.current.clear();
    setStreamStatuses((prev: Record<string, 'connecting' | 'live' | 'stopped' | 'paused'>) => {
      const next = { ...prev };
      expandedIds.forEach((id: string) => {
        next[id] = 'paused';
      });
      return next;
    });
  };

  const resumeAllStreams = (): void => {
    if (expandedRunIds.size === 0) return;
    setPausedStreams(new Set());
    setStreamStatuses((prev: Record<string, 'connecting' | 'live' | 'stopped' | 'paused'>) => {
      const next = { ...prev };
      expandedRunIds.forEach((id: string) => {
        next[id] = 'connecting';
      });
      return next;
    });
  };

  const ensureHistorySelection = React.useCallback(
    (runId: string, options: { id: string }[]): string | null => {
      if (!options.length) return null;
      const existing = historySelection[runId];
      if (existing && options.some((option: { id: string }) => option.id === existing)) return existing;
      return options[0]?.id ?? null;
    },    [historySelection]
  );

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <div className='text-sm font-semibold text-white'>{panelLabel}</div>
          <div className='text-xs text-gray-400'>{panelDescription}</div>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
            onClick={() => { void runsQuery.refetch(); }}
            disabled={runsQuery.isFetching}
          >
            {runsQuery.isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            type='button'
            variant='destructive'
            className='rounded-md border px-2 py-1 text-[10px]'
            onClick={() => setClearScope('terminal')}
            disabled={clearRunsMutation.isPending}
          >
            <Trash2 className='mr-1 size-3' />
            Clear Finished
          </Button>
          <Button
            type='button'
            variant='destructive'
            className='rounded-md border px-2 py-1 text-[10px]'
            onClick={() => setClearScope('all')}
            disabled={clearRunsMutation.isPending}
          >
            <Trash2 className='mr-1 size-3' />
            Clear All
          </Button>
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-3 text-[11px] text-gray-400'>
        <Button
          type='button'
          className={`rounded-md border px-2 py-1 text-[10px] ${
            autoRefreshEnabled
              ? 'border-emerald-500/50 text-emerald-200'
              : 'text-gray-300 hover:bg-muted/60'
          }`}
          onClick={() => setAutoRefreshEnabled((prev: boolean) => !prev)}
        >
          {autoRefreshEnabled ? 'Auto-refresh on' : 'Auto-refresh off'}
        </Button>
        <div className='flex items-center gap-2'>
          <Label className='text-[10px] uppercase text-gray-500'>Interval</Label>
          <Select
            value={String(autoRefreshInterval)}
            onValueChange={(value: string) => setAutoRefreshInterval(Number.parseInt(value, 10))}
            disabled={!autoRefreshEnabled}
          >
            <SelectTrigger className='h-7 w-[110px] border-border bg-card/70 text-[11px] text-white'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className='border-border bg-gray-900 text-white'>
              {[2000, 5000, 10000, 30000].map((value: number) => (
                <SelectItem key={value} value={String(value)}>
                  {value / 1000}s
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>        <Button
          type='button'
          className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
          onClick={pauseAllStreams}
          disabled={expandedRunIds.size === 0}
        >
          Pause all streams
        </Button>
        <Button
          type='button'
          className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
          onClick={resumeAllStreams}
          disabled={expandedRunIds.size === 0}
        >
          Resume all streams
        </Button>
      </div>

      <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-6'>
        <div className='rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Worker</div>
          <div className='mt-1 flex items-center gap-2 text-sm text-white'>
            {queueStatus ? (queueStatus.running ? 'Running' : 'Stopped') : '-'}
            {queueStatus?.running ? <RunningIndicator label='Active' /> : null}
          </div>
          <div className='mt-1 text-[11px] text-gray-400'>
            Healthy: {queueStatus ? (queueStatus.healthy ? 'Yes' : 'No') : '-'}
          </div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Concurrency</div>
          <div className='mt-1 text-sm text-white'>
            {queueStatus?.concurrency ?? '-'}
          </div>
          <div className='mt-1 flex items-center gap-2 text-[11px] text-gray-400'>
            <span>Active runs: {queueStatus?.activeRuns ?? 0}</span>
            {(queueStatus?.activeRuns ?? 0) > 0 ? <RunningIndicator label='Busy' /> : null}
          </div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Last poll</div>
          <div className='mt-1 text-sm text-white'>
            {queueStatus?.lastPollTime
              ? new Date(queueStatus.lastPollTime).toLocaleTimeString()
              : '-'}
          </div>
          <div className='mt-1 text-[11px] text-gray-400'>
            Age:{' '}
            {formatDurationMs(queueStatus?.timeSinceLastPoll ?? null)}
          </div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Status</div>
          <div className='mt-1 text-sm text-white'>
            {queueStatusQuery.isFetching ? 'Refreshing...' : 'Live'}
          </div>
          {queueStatusQuery.error ? (
            <div className='mt-1 text-[11px] text-rose-200'>
              {queueStatusQuery.error instanceof Error
                ? queueStatusQuery.error.message
                : 'Failed to load queue status.'}
            </div>
          ) : (
            <div className='mt-1 text-[11px] text-gray-400'>
              Updated every 5s
            </div>
          )}
          {queueStatus?.slo ? (
            <StatusBadge
              status={`SLO \${queueStatus.slo.overall} · \${queueStatus.slo.breachCount} breach\${queueStatus.slo.breachCount === 1 ? '' : 'es'}`}
              variant={getSloVariant(queueStatus.slo.overall)}
              size='sm'
              className='mt-2 font-bold'
            />
          ) : null}
        </div>
        <div className='rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Queue Depth</div>
          <div className='mt-1 text-sm text-white'>
            {queueStatus?.queuedCount ?? 0} queued
          </div>
          <div className='mt-1 text-[11px] text-gray-400'>
            Lag: {formatDurationMs(queueStatus?.queueLagMs ?? null)}
          </div>
          <div className='mt-2 h-10 w-full rounded bg-foreground/5 px-1 py-1'>
            <div className='flex h-full items-end gap-[2px]'>
              {queueHistory.length === 0 ? (
                <div className='text-[10px] text-gray-500'>No samples</div>
              ) : (
                queueHistory.slice(-30).map((entry: QueueHistoryEntry, index: number) => {
                  const max = Math.max(1, ...queueHistory.slice(-30).map((item: QueueHistoryEntry) => item.queued));
                  const height = Math.max(8, Math.round((entry.queued / max) * 100));
                  return (
                    <div
                      key={`${entry.ts}-${index}`}
                      className='w-[6px] rounded bg-sky-400/60'
                      style={{ height: `${height}%` }}
                      title={`${entry.queued} queued`}
                    />
                  );
                })
              )}
            </div>
          </div>
          <div className='mt-2 flex flex-wrap gap-2 text-[10px] text-gray-400'>
            <span>Throughput: {queueStatus?.throughputPerMinute ?? 0}/min</span>
            <span>p50: {formatDurationMs(queueStatus?.p50RuntimeMs ?? null)}</span>
            <span>p95: {formatDurationMs(queueStatus?.p95RuntimeMs ?? null)}</span>
          </div>
        </div>
        <div className='rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Brain Analytics Queue</div>
          <div className='mt-1 flex items-center gap-2 text-sm text-white'>
            {queueStatus?.brainQueue?.running ? 'Running' : 'Stopped'}
            {queueStatus?.brainQueue?.running ? <RunningIndicator label='Active' /> : null}
          </div>
          <div className='mt-1 flex items-center gap-2 text-[11px] text-gray-400'>
            <span>
              Active {queueStatus?.brainQueue?.activeJobs ?? 0} · Waiting {queueStatus?.brainQueue?.waitingJobs ?? 0}
            </span>
            {(queueStatus?.brainQueue?.activeJobs ?? 0) > 0 ? (
              <RunningIndicator label='Busy' />
            ) : null}
          </div>
          <div className='mt-2 text-[10px] text-gray-400'>
            Reports 24h: {queueStatus?.brainAnalytics24h?.totalReports ?? 0}
          </div>
          <div className='mt-1 text-[10px] text-gray-400'>
            Analytics {queueStatus?.brainAnalytics24h?.analyticsReports ?? 0} · Logs {queueStatus?.brainAnalytics24h?.logReports ?? 0}
          </div>
          <div className='mt-1 text-[10px] text-amber-200/90'>
            Warnings {queueStatus?.brainAnalytics24h?.warningReports ?? 0} · Errors {queueStatus?.brainAnalytics24h?.errorReports ?? 0}
          </div>
        </div>
      </div>

      {queueStatus?.queueLagMs && queueStatus.queueLagMs > lagThresholdMs ? (
        <Alert variant='error' className='mt-4'>
          Queue lag is high: {formatDurationMs(queueStatus.queueLagMs)} (threshold {formatDurationMs(lagThresholdMs)}). Consider increasing concurrency or investigating slow nodes.
        </Alert>
      ) : null}

      {queueStatus?.slo && queueStatus.slo.overall !== 'ok' ? (
        <Alert
          variant={getSloVariant(queueStatus.slo.overall)}
          className='mt-3'
        >
          <div className='font-medium'>
            Runtime SLO is {queueStatus.slo.overall}.
          </div>
          <div className='mt-1 text-xs opacity-90'>
            {queueStatus.slo.breaches.slice(0, 3).map((breach) => breach.message).join(' ')}
          </div>
        </Alert>
      ) : null}

      <div className='mt-4 rounded-md border border-border/60 bg-card/40 p-3'>
        <div className='flex items-center justify-between'>
          <div>
            <div className='text-xs text-gray-200'>Queue Metrics (History)</div>
            <div className='text-[11px] text-gray-500'>
              Last {queueHistory.length} samples · refresh {autoRefreshEnabled ? `${Math.round(autoRefreshInterval / 1000)}s` : 'off'}
              {queueHistory.length > 0
                ? ` · last sample ${new Date(queueHistory[queueHistory.length - 1]!.ts).toLocaleTimeString()}`
                : ''}
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              type='button'
              className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
              onClick={() => setShowMetricsPanel((prev: boolean) => !prev)}
            >
              {showMetricsPanel ? 'Hide' : 'Show'}
            </Button>
            <Button
              type='button'
              className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
              onClick={() => setQueueHistory([])}
            >
              Clear
            </Button>
          </div>
        </div>
        {showMetricsPanel ? (
          <div className='mt-3 space-y-3'>
            <div className='h-24 w-full rounded bg-foreground/5 px-2 py-2'>
              <div className='flex h-full items-end gap-[2px]'>
                {queueHistory.length === 0 ? (
                  <div className='text-[10px] text-gray-500'>No samples</div>
                ) : (
                  queueHistory.map((entry: QueueHistoryEntry, index: number) => {
                    const max = Math.max(1, ...queueHistory.map((item: QueueHistoryEntry) => item.queued));
                    const height = Math.max(6, Math.round((entry.queued / max) * 100));
                    return (
                      <div
                        key={`${entry.ts}-${index}`}
                        className='w-[5px] rounded bg-emerald-400/60'
                        style={{ height: `${height}%` }}
                        title={`${entry.queued} queued @ ${new Date(entry.ts).toLocaleTimeString()}`}
                      />
                    );
                  })
                )}
              </div>
            </div>
            <div className='grid gap-2 md:grid-cols-3'>
              <div className='rounded-md border border-border/60 bg-card/60 p-2 text-[11px] text-gray-300'>
                <div className='text-[10px] uppercase text-gray-500'>Queue Depth</div>
                <div className='mt-1 text-sm text-white'>{queueStatus?.queuedCount ?? 0}</div>
                <div className='mt-1 text-[10px] text-gray-400'>
                  Lag: {formatDurationMs(queueStatus?.queueLagMs ?? null)}
                </div>
              </div>
              <div className='rounded-md border border-border/60 bg-card/60 p-2 text-[11px] text-gray-300'>
                <div className='text-[10px] uppercase text-gray-500'>Throughput</div>
                <div className='mt-1 text-sm text-white'>{queueStatus?.throughputPerMinute ?? 0}/min</div>
                <div className='mt-1 text-[10px] text-gray-400'>
                  Completed: {queueStatus?.completedLastMinute ?? 0} (last min)
                </div>
              </div>
              <div className='rounded-md border border-border/60 bg-card/60 p-2 text-[11px] text-gray-300'>
                <div className='text-[10px] uppercase text-gray-500'>Runtime</div>
                <div className='mt-1 text-sm text-white'>
                  avg {formatDurationMs(queueStatus?.avgRuntimeMs ?? null)}
                </div>
                <div className='mt-1 text-[10px] text-gray-400'>
                  p50 {formatDurationMs(queueStatus?.p50RuntimeMs ?? null)} · p95 {formatDurationMs(queueStatus?.p95RuntimeMs ?? null)}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className='grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]'>
        <div className='space-y-1'>
          <Label className='text-[10px] uppercase text-gray-500'>Path filter</Label>
          <Input
            className='h-9 rounded-md border border-border bg-card/60 px-3 text-sm text-white'
            value={pathFilter}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPathFilter(event.target.value)}
            placeholder={activePathId ? `Active path: ${activePathId}` : 'All paths'}
          />
        </div>
        <div className='space-y-1'>
          <Label className='text-[10px] uppercase text-gray-500'>Search</Label>
          <Input
            className='h-9 rounded-md border border-border bg-card/60 px-3 text-sm text-white'
            value={searchQuery}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(event.target.value)}
            placeholder='Run ID, path name, entity, error...'
          />
        </div>
        <div className='space-y-1'>
          <Label className='text-[10px] uppercase text-gray-500'>Page size</Label>
          <Select
            value={String(pageSize)}
            onValueChange={(value: string) => setPageSize(Number.parseInt(value, 10))}
          >
            <SelectTrigger className='h-9 w-[110px] border-border bg-card/70 text-[11px] text-white'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className='border-border bg-gray-900 text-white'>
              {PAGE_SIZES.map((size: number) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>                    </div>
            
      <div className='flex flex-wrap gap-2'>
        {STATUS_FILTERS.map((filter: (typeof STATUS_FILTERS)[number]) => {
          const active = statusFilter === filter.id;
          return (
            <Button
              key={filter.id}
              type='button'
              className={`rounded-md border px-2 py-1 text-[10px] ${
                active ? 'border-emerald-500/50 text-emerald-200' : 'text-gray-300 hover:bg-muted/60'
              }`}
              onClick={() => setStatusFilter(filter.id)}
            >
              {filter.label}
            </Button>
          );
        })}
      </div>            
      <div className='flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400'>
        <span>
                        Showing {runs.length} of {total} runs
        </span>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
            onClick={() => setPage((prev: number) => Math.max(1, prev - 1))}
            disabled={page <= 1}
          >
                          Prev
          </Button>
          <span>
                          Page {page} / {totalPages}
          </span>
          <Button
            type='button'
            className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
            onClick={() => setPage((prev: number) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
          >
                          Next
          </Button>
        </div>
      </div>
            
      {runs.length === 0 ? (
        <div className='rounded-md border border-border bg-card/40 p-4 text-sm text-gray-400'>
                        No runs found for the current filters.
        </div>
      ) : (
        <div className='space-y-3'>
          {runs.map((run: AiPathRunRecord) => {            const isExpanded = expandedRunIds.has(run.id);
            const detail = normalizeRunDetail(runDetails[run.id]);
            const detailLoading = runDetailLoading.has(run.id);
            const detailError = runDetailErrors[run.id];
            const detailRun = detail?.run ?? run;
            const isRunning = isRunningStatus(detailRun.status);
            const isScheduledRun = detailRun.triggerEvent === 'scheduled_run';
            const streamStatus = pausedStreams.has(run.id)
              ? 'paused'
              : streamStatuses[run.id] ?? 'stopped';
            const canCancel = ['queued', 'running', 'paused'].includes(detailRun.status);
            const isCancellingThisRun =
              cancelRunMutation.isPending && cancelRunMutation.variables === run.id;
            const isDeletingThisRun =
              deleteRunMutation.isPending && deleteRunMutation.variables === run.id;
            const runOrigin = resolveRunOrigin(detailRun);
            const runExecution = resolveRunExecutionKind(detailRun);
            const runSource = resolveRunSource(detailRun) ?? 'unknown';
            const runSourceDebug = resolveRunSourceDebug(detailRun);
            const nodes = normalizeRunNodes(detail?.nodes);
            const events = normalizeRunEvents(detail?.events);
            const history = (detailRun.runtimeState?.history ?? undefined);
            const historyOptions = buildHistoryNodeOptions(
              history,
              nodes,
              detailRun.graph?.nodes ?? null
            );
            const selectedHistoryNodeId = ensureHistorySelection(run.id, historyOptions);
            const historyEntries =
              selectedHistoryNodeId && history
                ? history[selectedHistoryNodeId] ?? []
                : [];

            return (
              <div
                key={run.id}
                className='rounded-md border border-border/60 bg-card/70 p-3 text-xs text-gray-300'
              >
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div>
                    <div className='flex flex-wrap items-center gap-2'>
                      <StatusBadge status={detailRun.status} size='sm' className='font-bold' />
                      {isRunning ? <RunningIndicator /> : null}
                    </div>
                    {isScheduledRun ? (
                      <div className='mt-1'>
                        <StatusBadge status='Scheduled' variant='warning' size='sm' className='font-bold' />
                      </div>
                    ) : null}
                    <div className='mt-1 flex flex-wrap items-center gap-1'>
                      <StatusBadge
                        status={`Origin: \${getOriginLabel(runOrigin)}`}
                        variant={getOriginVariant(runOrigin)}
                        size='sm'
                        className='font-medium'
                      />
                      <StatusBadge
                        status={`Run: \${getExecutionLabel(runExecution)}`}
                        variant={getExecutionVariant(runExecution)}
                        size='sm'
                        className='font-medium'
                      />
                      <StatusBadge
                        status={`Source: \${runSource}`}
                        variant='neutral'
                        size='sm'
                        className='font-medium'
                      />
                      <StatusBadge
                        status={`Debug: \${runSourceDebug}`}
                        variant='info'
                        size='sm'
                        title={runSourceDebug}
                        className='font-medium'
                      />
                    </div>
                    <div className='text-sm text-white'>{detailRun.pathName ?? 'AI Path'}</div>
                    <div className='text-[11px] text-gray-400'>
                      Run ID: <span className='font-mono'>{detailRun.id}</span>
                    </div>
                    <div className='text-[11px] text-gray-500'>
                      Created {formatDate(detailRun.createdAt)}
                    </div>
                    <div className='text-[11px] text-gray-500'>
                      Stream: {streamStatus}
                    </div>
                    {(detailRun.entityType || detailRun.entityId) && (
                      <div className='text-[11px] text-gray-500'>
                        Entity: {detailRun.entityType ?? '?'} {detailRun.entityId ?? ''}
                      </div>
                    )}
                    {detailRun.errorMessage && (
                      <Alert variant='error' className='mt-1 px-2 py-1 text-[11px]'>
                        Error: {detailRun.errorMessage}
                      </Alert>
                    )}
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Button
                      type='button'
                      className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
                      onClick={() => toggleRun(run.id)}
                    >
                      {isExpanded ? 'Hide details' : 'Details'}
                    </Button>
                    <Button
                      type='button'
                      className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
                      onClick={() => toggleStream(run.id)}
                      disabled={!isExpanded}
                    >
                      {pausedStreams.has(run.id) ? 'Resume stream' : 'Pause stream'}
                    </Button>
                    <Button
                      type='button'
                      className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
                      onClick={() => void loadRunDetail(run.id)}
                      disabled={detailLoading}
                    >
                      {detailLoading ? 'Loading...' : 'Refresh detail'}
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      className='rounded-md border px-2 py-1 text-[10px] text-amber-200 hover:bg-amber-500/10'
                      onClick={() => cancelRunMutation.mutate(run.id)}
                      disabled={!canCancel || isCancellingThisRun}
                    >
                      {isCancellingThisRun ? 'Canceling...' : 'Cancel'}
                    </Button>
                    <Button
                      type='button'
                      variant='destructive'
                      className='rounded-md border px-2 py-1 text-[10px]'
                      onClick={() => setRunToDelete(detailRun)}
                      disabled={isDeletingThisRun}
                    >
                      {isDeletingThisRun ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className='mt-4 space-y-3'>
                    {detailError ? (
                      <div className='rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-[11px] text-rose-200'>
                        {detailError}
                      </div>
                    ) : null}

                    {!detail && !detailLoading ? (
                      <div className='text-[11px] text-gray-500'>
                        Loading run details...
                      </div>
                    ) : null}

                    {detail ? (
                      <>
                        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-[11px] text-gray-400'>
                          <div>
                            <span className='uppercase text-gray-500'>Path ID</span>
                            <div className='text-white'>{detailRun.pathId ?? '-'}</div>
                          </div>
                          <div>
                            <span className='uppercase text-gray-500'>Status</span>
                            <div className='text-white'>{detailRun.status}</div>
                          </div>
                          <div>
                            <span className='uppercase text-gray-500'>Trigger</span>
                            <div className='text-white'>{detailRun.triggerEvent ?? '-'}</div>
                          </div>
                          <div>
                            <span className='uppercase text-gray-500'>Origin</span>
                            <div className='text-white'>{getOriginLabel(runOrigin)}</div>
                          </div>
                          <div>
                            <span className='uppercase text-gray-500'>Run type</span>
                            <div className='text-white'>{getExecutionLabel(runExecution)}</div>
                          </div>
                          <div>
                            <span className='uppercase text-gray-500'>Source</span>
                            <div className='text-white'>{runSource}</div>
                          </div>
                          <div className='sm:col-span-2 lg:col-span-3'>
                            <span className='uppercase text-gray-500'>Source debug</span>
                            <div className='font-mono text-sky-200'>{runSourceDebug}</div>
                          </div>
                          <div>
                            <span className='uppercase text-gray-500'>Started</span>
                            <div className='text-white'>{formatDate(detailRun.startedAt)}</div>
                          </div>
                          <div>
                            <span className='uppercase text-gray-500'>Finished</span>
                            <div className='text-white'>{formatDate(detailRun.finishedAt)}</div>
                          </div>
                          <div>
                            <span className='uppercase text-gray-500'>Dead-lettered</span>
                            <div className='text-white'>{formatDate(detailRun.deadLetteredAt)}</div>
                          </div>
                          <div>
                            <span className='uppercase text-gray-500'>Retry</span>
                            <div className='text-white'>
                              {detailRun.retryCount ?? 0}/{detailRun.maxAttempts ?? '-'}
                            </div>
                          </div>
                          <div>
                            <span className='uppercase text-gray-500'>Next retry</span>
                            <div className='text-white'>{formatDate(detailRun.nextRetryAt)}</div>
                          </div>
                          <div>
                            <span className='uppercase text-gray-500'>Trigger node</span>
                            <div className='text-white'>{detailRun.triggerNodeId ?? '-'}</div>
                          </div>
                        </div>

                        <details className='rounded-md border border-border/70 bg-black/20 p-3'>
                          <summary className='cursor-pointer text-[11px] uppercase text-gray-400'>
                            Run history
                          </summary>
                          {historyOptions.length > 1 ? (
                            <div className='mt-3 flex flex-wrap items-center gap-2'>
                              <Label className='text-[10px] uppercase text-gray-500'>
                                Node
                              </Label>
                              <Select
                                {...(selectedHistoryNodeId != null ? { value: selectedHistoryNodeId } : {})}
                                onValueChange={(value: string) =>
                                  setHistorySelection((prev: Record<string, string>) => ({ ...prev, [run.id]: value }))
                                }
                              >
                                <SelectTrigger className='h-7 w-[220px] border-border bg-card/70 text-[11px] text-white'>
                                  <SelectValue placeholder='Select node' />
                                </SelectTrigger>
                                <SelectContent className='border-border bg-gray-900 text-white'>
                                  {historyOptions.map((option: { id: string; label: string }) => (
                                    <SelectItem key={option.id} value={option.id}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>                            </div>
                          ) : (
                            <div className='mt-2 text-[11px] text-gray-500'>
                              {historyOptions[0]?.label ?? 'No history nodes'}
                            </div>
                          )}
                          <div className='mt-3'>
                            <RunHistoryEntries
                              entries={historyEntries}
                              emptyMessage='No history recorded for this run.'
                              showNodeLabel
                            />
                          </div>
                        </details>

                        <details className='rounded-md border border-border/70 bg-black/20 p-3'>
                          <summary className='cursor-pointer text-[11px] uppercase text-gray-400'>
                            Nodes ({nodes.length})
                          </summary>
                          {nodes.length === 0 ? (
                            <div className='mt-2 text-[11px] text-gray-500'>
                              No nodes recorded for this run.
                            </div>
                          ) : (
                            <div className='mt-3 space-y-2'>
                              {nodes.map((node: AiPathRunNodeRecord) => (
                                <details
                                  key={node.id}
                                  className='rounded-md border border-border/60 bg-black/30 p-3'
                                >                                  <summary className='cursor-pointer text-[11px] text-gray-300'>
                                    {node.nodeTitle ?? node.nodeId}{' '}
                                    {node.nodeType ? `(${node.nodeType})` : ''}
                                    <span className='ml-2 text-gray-500'>
                                      {node.status}
                                    </span>
                                  </summary>
                                  <div className='mt-2 grid gap-2 text-[11px] text-gray-400 sm:grid-cols-2 lg:grid-cols-3'>
                                    <div>
                                      <span className='uppercase text-gray-500'>Started</span>
                                      <div className='text-white'>{formatDate(node.startedAt)}</div>
                                    </div>
                                    <div>
                                      <span className='uppercase text-gray-500'>Finished</span>
                                      <div className='text-white'>{formatDate(node.finishedAt)}</div>
                                    </div>
                                    <div>
                                      <span className='uppercase text-gray-500'>Attempt</span>
                                      <div className='text-white'>{node.attempt}</div>
                                    </div>
                                  </div>
                                  {node.errorMessage ? (
                                    <div className='mt-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-[11px] text-rose-200'>
                                      Error: {node.errorMessage}
                                    </div>
                                  ) : null}
                                  <div className='mt-3 grid gap-3 lg:grid-cols-2'>
                                    <div>
                                      <Label className='text-[10px] uppercase text-gray-500'>
                                        Inputs
                                      </Label>
                                      <Textarea
                                        className='mt-2 min-h-[120px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                                        readOnly
                                        value={safePrettyJson(node.inputs)}
                                      />
                                    </div>
                                    <div>
                                      <Label className='text-[10px] uppercase text-gray-500'>
                                        Outputs
                                      </Label>
                                      <Textarea
                                        className='mt-2 min-h-[120px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                                        readOnly
                                        value={safePrettyJson(node.outputs)}
                                      />
                                    </div>
                                  </div>
                                </details>
                              ))}
                            </div>
                          )}
                        </details>

                        <details className='rounded-md border border-border/70 bg-black/20 p-3'>
                          <summary className='cursor-pointer text-[11px] uppercase text-gray-400'>
                            Events ({events.length})
                          </summary>
                          {events.length === 0 ? (
                            <div className='mt-2 text-[11px] text-gray-500'>No events.</div>
                          ) : (
                            <div className='mt-3 divide-y divide-border/70'>
                              {events.map((event: AiPathRunEventRecord) => (
                                <div key={event.id} className='py-2'>                                  <div className='flex flex-wrap items-center gap-2 text-[11px] text-gray-400'>
                                  <span>{formatDate(event.createdAt)}</span>
                                  <span className='rounded-full border px-2 py-0.5 text-[10px] text-gray-300'>
                                    {event.level}
                                  </span>
                                </div>
                                <div className='mt-1 text-sm text-white'>{event.message}</div>
                                {event.metadata ? (
                                  <pre className='mt-2 max-h-40 overflow-auto rounded-md border border-border bg-black/30 p-2 text-[11px] text-gray-200'>
                                    {safePrettyJson(event.metadata)}
                                  </pre>
                                ) : null}
                                </div>
                              ))}
                            </div>
                          )}
                        </details>

                        <details className='rounded-md border border-border/70 bg-black/20 p-3'>
                          <summary className='cursor-pointer text-[11px] uppercase text-gray-400'>
                            Runtime state
                          </summary>
                          <div className='mt-3 grid gap-3 lg:grid-cols-2'>
                            <div>
                              <Label className='text-[10px] uppercase text-gray-500'>Inputs</Label>
                              <Textarea
                                className='mt-2 min-h-[120px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                                readOnly
                                value={safePrettyJson(detailRun.runtimeState?.inputs)}
                              />
                            </div>
                            <div>
                              <Label className='text-[10px] uppercase text-gray-500'>Outputs</Label>
                              <Textarea
                                className='mt-2 min-h-[120px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                                readOnly
                                value={safePrettyJson(detailRun.runtimeState?.outputs)}
                              />
                            </div>
                          </div>
                          <div className='mt-3'>
                            <Label className='text-[10px] uppercase text-gray-500'>Hashes</Label>
                            <Textarea
                              className='mt-2 min-h-[80px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                              readOnly
                              value={safePrettyJson(detailRun.runtimeState?.hashes)}
                            />
                          </div>
                        </details>

                        <details className='rounded-md border border-border/70 bg-black/20 p-3'>
                          <summary className='cursor-pointer text-[11px] uppercase text-gray-400'>
                            Graph snapshot
                          </summary>
                          <Textarea
                            className='mt-2 min-h-[160px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                            readOnly
                            value={safePrettyJson(detailRun.graph)}
                          />
                        </details>

                        <details className='rounded-md border border-border/70 bg-black/20 p-3'>
                          <summary className='cursor-pointer text-[11px] uppercase text-gray-400'>
                            Raw payloads
                          </summary>
                          <div className='mt-3 space-y-3'>
                            <div>
                              <Label className='text-[10px] uppercase text-gray-500'>Run</Label>
                              <Textarea
                                className='mt-2 min-h-[140px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                                readOnly
                                value={safePrettyJson(detailRun)}
                              />
                            </div>
                            <div>
                              <Label className='text-[10px] uppercase text-gray-500'>Nodes</Label>
                              <Textarea
                                className='mt-2 min-h-[140px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                                readOnly
                                value={safePrettyJson(nodes)}
                              />
                            </div>
                            <div>
                              <Label className='text-[10px] uppercase text-gray-500'>Events</Label>
                              <Textarea
                                className='mt-2 min-h-[120px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                                readOnly
                                value={safePrettyJson(events)}
                              />
                            </div>
                          </div>
                        </details>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={clearScope === 'terminal'}
        onOpenChange={(open: boolean): void => setClearScope(open ? 'terminal' : null)}
        onConfirm={() => clearRunsMutation.mutate('terminal')}
        title='Clear finished AI Path runs'
        description='Delete completed, failed, canceled, and dead-lettered runs from this queue list.'
        confirmText='Clear Finished'
        variant='destructive'
        loading={clearRunsMutation.isPending}
      />

      <ConfirmDialog
        open={clearScope === 'all'}
        onOpenChange={(open: boolean): void => setClearScope(open ? 'all' : null)}
        onConfirm={() => clearRunsMutation.mutate('all')}
        title='Clear all AI Path runs'
        description='Delete all runs in this queue list, including queued, running, and paused entries.'
        confirmText='Clear All'
        variant='destructive'
        loading={clearRunsMutation.isPending}
      />

      <ConfirmDialog
        open={runToDelete !== null}
        onOpenChange={(open: boolean): void => setRunToDelete(open ? runToDelete : null)}
        onConfirm={() => {
          if (!runToDelete) return;
          deleteRunMutation.mutate(runToDelete.id);
        }}
        title='Delete AI Path run'
        description={`Delete run ${runToDelete?.id ?? ''}? This removes its run, node, and event history.`}
        confirmText='Delete Run'
        variant='destructive'
        loading={deleteRunMutation.isPending}
      />
    </div>
  );
}
