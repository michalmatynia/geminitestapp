'use client';

import { Trash2 } from 'lucide-react';
import React from 'react';

import { runsApi } from '@/features/ai/ai-paths/lib';
import type {
  AiPathRunEventRecord,
  AiPathRunRecord,
} from '@/features/ai/ai-paths/lib';
import { fetchAiPathsSettingsCached } from '@/features/ai/ai-paths/lib/settings-store-client';
import { createDeleteMutationV2, createListQueryV2, createMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import {
  Button,
  ConfirmModal,
  Input,
  Label,
  SelectSimple,
  useToast,
  Pagination,
} from '@/shared/ui';

import { JobQueueOverview } from './job-queue-overview';
import {
  getLatestEventTimestamp,
  getPanelDescription,
  getPanelLabel,
  isRunningStatus,
  normalizeRunDetail,
  normalizeRunEvents,
  normalizeRunNodes,
  resolveRunExecutionKind,
  resolveRunOrigin,
  resolveRunSource,
  resolveRunSourceDebug,
  type QueueHistoryEntry,
  type QueueStatus,
  type RunDetail,
  type StreamConnectionStatus,
} from './job-queue-panel-utils';
import { JobQueueRunCard } from './job-queue-run-card';
import { buildHistoryNodeOptions } from './run-history-utils';

type JobQueuePanelProps = {
  activePathId?: string | null;
  sourceFilter?: string | null;
  sourceMode?: 'include' | 'exclude';
};

type StreamMessageEvent = Event & { data: string };

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
    Record<string, StreamConnectionStatus>
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

  const clearRunsMutation = createDeleteMutationV2({
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
    setStreamStatuses((prev: Record<string, StreamConnectionStatus>) => {
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

  const deleteRunMutation = createDeleteMutationV2({
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
        setStreamStatuses((prev: Record<string, StreamConnectionStatus>) => ({ ...prev, [runId]: 'stopped' }));
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
      setStreamStatuses((prev: Record<string, StreamConnectionStatus>) => ({ ...prev, [runId]: 'connecting' }));

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
        setStreamStatuses((prev: Record<string, StreamConnectionStatus>) => ({ ...prev, [runId]: 'live' }));
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
        setStreamStatuses((prev: Record<string, StreamConnectionStatus>) => ({ ...prev, [runId]: 'stopped' }));
        source.close();
        streamSourcesRef.current.delete(runId);
      });
      source.addEventListener('error', () => {
        setStreamStatuses((prev: Record<string, StreamConnectionStatus>) => ({ ...prev, [runId]: 'stopped' }));
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
        setStreamStatuses((statusPrev: Record<string, StreamConnectionStatus>) => ({ ...statusPrev, [runId]: 'connecting' }));
      } else {
        next.add(runId);
        setStreamStatuses((statusPrev: Record<string, StreamConnectionStatus>) => ({ ...statusPrev, [runId]: 'paused' }));
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
    setStreamStatuses((prev: Record<string, StreamConnectionStatus>) => {
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
    setStreamStatuses((prev: Record<string, StreamConnectionStatus>) => {
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
          <SelectSimple
            size='xs'
            value={String(autoRefreshInterval)}
            onValueChange={(value: string) => setAutoRefreshInterval(Number.parseInt(value, 10))}
            disabled={!autoRefreshEnabled}
            options={[2000, 5000, 10000, 30000].map((value: number) => ({
              value: String(value),
              label: `${value / 1000}s`,
            }))}
            triggerClassName='h-7 w-[110px] border-border bg-card/70 text-[11px] text-white'
          />
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

      <JobQueueOverview
        queueStatus={queueStatus}
        queueStatusError={queueStatusQuery.error}
        queueStatusFetching={queueStatusQuery.isFetching}
        queueHistory={queueHistory}
        lagThresholdMs={lagThresholdMs}
        autoRefreshEnabled={autoRefreshEnabled}
        autoRefreshInterval={autoRefreshInterval}
        showMetricsPanel={showMetricsPanel}
        onToggleMetricsPanel={() => setShowMetricsPanel((prev: boolean) => !prev)}
        onClearHistory={() => setQueueHistory([])}
      />

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
          <SelectSimple
            size='sm'
            value={String(pageSize)}
            onValueChange={(value: string) => setPageSize(Number.parseInt(value, 10))}
            options={PAGE_SIZES.map((size: number) => ({
              value: String(size),
              label: String(size),
            }))}
            triggerClassName='h-9 w-[110px] border-border bg-card/70 text-[11px] text-white'
          />
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
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='text-[11px] text-gray-400'>
          Showing {runs.length} of {total} runs
        </div>
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          pageSizeOptions={PAGE_SIZES}
          showPageSize
          variant='compact'
        />
      </div>            
      
      {runs.length === 0 ? (
        <div className='rounded-md border border-border bg-card/40 p-4 text-sm text-gray-400'>
                        No runs found for the current filters.
        </div>
      ) : (
        <div className='space-y-3'>
          {runs.map((run: AiPathRunRecord) => {
            const isExpanded = expandedRunIds.has(run.id);
            const detail = normalizeRunDetail(runDetails[run.id]);
            const detailLoading = runDetailLoading.has(run.id);
            const detailError = runDetailErrors[run.id];
            const detailRun = detail?.run ?? run;
            const isRunning = isRunningStatus(detailRun.status);
            const isScheduledRun = detailRun.triggerEvent === 'scheduled_run';
            const streamStatus: StreamConnectionStatus = pausedStreams.has(run.id)
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
            const history = detailRun.runtimeState?.history ?? undefined;
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
              <JobQueueRunCard
                key={run.id}
                detailRun={detailRun}
                detail={detail}
                detailLoading={detailLoading}
                detailError={detailError}
                isExpanded={isExpanded}
                isRunning={isRunning}
                isScheduledRun={isScheduledRun}
                streamStatus={streamStatus}
                paused={pausedStreams.has(run.id)}
                canCancel={canCancel}
                isCancellingThisRun={isCancellingThisRun}
                isDeletingThisRun={isDeletingThisRun}
                runOrigin={runOrigin}
                runExecution={runExecution}
                runSource={runSource}
                runSourceDebug={runSourceDebug}
                nodes={nodes}
                events={events}
                historyOptions={historyOptions}
                selectedHistoryNodeId={selectedHistoryNodeId}
                historyEntries={historyEntries}
                onToggleRun={() => toggleRun(run.id)}
                onToggleStream={() => toggleStream(run.id)}
                onRefreshDetail={() => {
                  void loadRunDetail(run.id);
                }}
                onCancelRun={() => cancelRunMutation.mutate(run.id)}
                onDeleteRun={() => setRunToDelete(detailRun)}
                onSelectHistoryNode={(value: string) => {
                  setHistorySelection((prev: Record<string, string>) => ({
                    ...prev,
                    [run.id]: value,
                  }));
                }}
              />
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={clearScope === 'terminal'}
        onClose={() => setClearScope(null)}
        onConfirm={() => clearRunsMutation.mutate('terminal')}
        title='Clear finished AI Path runs'
        message='Delete completed, failed, canceled, and dead-lettered runs from this queue list.'
        confirmText='Clear Finished'
        isDangerous={true}
        loading={clearRunsMutation.isPending}
      />

      <ConfirmModal
        isOpen={clearScope === 'all'}
        onClose={() => setClearScope(null)}
        onConfirm={() => clearRunsMutation.mutate('all')}
        title='Clear all AI Path runs'
        message='Delete all runs in this queue list, including queued, running, and paused entries.'
        confirmText='Clear All'
        isDangerous={true}
        loading={clearRunsMutation.isPending}
      />

      <ConfirmModal
        isOpen={runToDelete !== null}
        onClose={() => setRunToDelete(null)}
        onConfirm={() => {
          if (!runToDelete) return;
          deleteRunMutation.mutate(runToDelete.id);
        }}
        title='Delete AI Path run'
        message={`Delete run ${runToDelete?.id ?? ''}? This removes its run, node, and event history.`}
        confirmText='Delete Run'
        isDangerous={true}
        loading={deleteRunMutation.isPending}
      />
    </div>
  );
}
