'use client';

import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { runsApi } from '@/features/ai/ai-paths/lib';
import type {
  AiPathRunRecord,
} from '@/features/ai/ai-paths/lib';
import { fetchAiPathsSettingsCached } from '@/features/ai/ai-paths/lib/settings-store-client';
import { createDeleteMutationV2, createListQueryV2, createMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { useToast } from '@/shared/ui';
import { 
  getLatestEventTimestamp, 
  getPanelDescription, 
  getPanelLabel, 
  normalizeRunDetail, 
  normalizeRunEvents, 
  normalizeRunNodes, 
  type QueueHistoryEntry,
  type QueueStatus,
  type RunDetail,
  type StreamConnectionStatus
} from './job-queue-panel-utils';
import { internalError } from '@/shared/errors/app-error';

// ─── types ───────────────────────────────────────────────────────────────────

export type JobQueueContextValue = {
  // State
  pathFilter: string;
  setPathFilter: (q: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  page: number;
  setPage: (p: number) => void;
  expandedRunIds: Set<string>;
  toggleRun: (runId: string) => void;
  runDetails: Record<string, RunDetail | null>;
  runDetailLoading: Set<string>;
  runDetailErrors: Record<string, string>;
  historySelection: Record<string, string>;
  setHistorySelection: (runId: string, nodeId: string) => void;
  streamStatuses: Record<string, StreamConnectionStatus>;
  pausedStreams: Set<string>;
  toggleStream: (runId: string) => void;
  pauseAllStreams: () => void;
  resumeAllStreams: () => void;
  autoRefreshEnabled: boolean;
  setAutoRefreshEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  autoRefreshInterval: number;
  setAutoRefreshInterval: (i: number) => void;
  showMetricsPanel: boolean;
  setShowMetricsPanel: React.Dispatch<React.SetStateAction<boolean>>;
  queueHistory: QueueHistoryEntry[];
  setQueueHistory: React.Dispatch<React.SetStateAction<QueueHistoryEntry[]>>;
  clearScope: 'terminal' | 'all' | null;
  setClearScope: (s: 'terminal' | 'all' | null) => void;
  runToDelete: AiPathRunRecord | null;
  setRunToDelete: (r: AiPathRunRecord | null) => void;

  // Derived
  panelLabel: string;
  panelDescription: string;
  lagThresholdMs: number;
  runs: AiPathRunRecord[];
  total: number;
  totalPages: number;
  queueStatus: QueueStatus | undefined;
  isLoadingRuns: boolean;
  isLoadingQueueStatus: boolean;
  runsQueryError: unknown;
  isClearingRuns: boolean;
  isCancelingRun: (runId: string) => boolean;
  isDeletingRun: (runId: string) => boolean;

  // Actions
  refetchQueueData: () => void;
  handleClearRuns: (scope: 'terminal' | 'all') => Promise<void>;
  handleCancelRun: (runId: string) => Promise<void>;
  handleDeleteRun: (runId: string) => Promise<void>;
  loadRunDetail: (runId: string) => Promise<void>;
};

// ─── constants ────────────────────────────────────────────────────────────────

const AUTO_REFRESH_ENABLED_KEY = 'ai-paths-job-queue-auto-refresh-enabled';
const AUTO_REFRESH_INTERVAL_KEY = 'ai-paths-job-queue-auto-refresh-interval';
const DEFAULT_AUTO_REFRESH_INTERVAL = 10000;
const ACTIVE_RUN_REFRESH_MIN_MS = 5000;
const IDLE_RUN_REFRESH_MIN_MS = 30000;
const ACTIVE_RUN_STATUSES = new Set(['queued', 'running', 'paused']);
const POLLING_JITTER_MS = 500;
const QUEUE_LAG_THRESHOLD_KEY = 'ai_paths_queue_lag_threshold_ms';

const JobQueueContext = createContext<JobQueueContextValue | null>(null);

export function JobQueueProvider({
  children,
  activePathId,
  sourceFilter,
  sourceMode = 'include',
  isActive = true,
}: {
  children: React.ReactNode;
  activePathId?: string | null;
  sourceFilter?: string | null;
  sourceMode?: 'include' | 'exclude';
  isActive?: boolean;
}): React.JSX.Element {
  const pathname = usePathname();
  const { toast } = useToast();

  const [pathFilter, setPathFilter] = useState(activePathId ?? '');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [expandedRunIds, setExpandedRunIds] = useState<Set<string>>(new Set());
  const [runDetails, setRunDetails] = useState<Record<string, RunDetail | null>>({});
  const [runDetailLoading, setRunDetailLoading] = useState<Set<string>>(new Set());
  const [runDetailErrors, setRunDetailErrors] = useState<Record<string, string>>({});
  const [historySelection, setHistorySelection] = useState<Record<string, string>>({});
  const [streamStatuses, setStreamStatuses] = useState<Record<string, StreamConnectionStatus>>({});
  const streamSourcesRef = useRef<Map<string, EventSource>>(new Map());
  const [pausedStreams, setPausedStreams] = useState<Set<string>>(new Set());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(DEFAULT_AUTO_REFRESH_INTERVAL);
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [clearScope, setClearScope] = useState<'terminal' | 'all' | null>(null);
  const [runToDelete, setRunToDelete] = useState<AiPathRunRecord | null>(null);
  const [queueHistory, setQueueHistory] = useState<QueueHistoryEntry[]>([]);
  const [showMetricsPanel, setShowMetricsPanel] = useState(false);

  // Settings
  const aiPathsSettingsQuery = createListQueryV2<
    Array<{ key: string; value: string }>,
    Array<{ key: string; value: string }>
  >({
    queryKey: QUERY_KEYS.ai.aiPaths.settings(),
    queryFn: async () => await fetchAiPathsSettingsCached(),
    staleTime: 60_000,
    meta: {
      source: 'ai-paths.job-queue',
      operation: 'list',
      resource: 'ai-paths-settings',
      queryKey: QUERY_KEYS.ai.aiPaths.settings(),
      domain: 'global',
      criticality: 'normal',
    },
  });
  const heavyMap = useMemo(
    () => new Map((aiPathsSettingsQuery.data ?? []).map((item) => [item.key, item.value])),
    [aiPathsSettingsQuery.data]
  );

  const normalizedPathFilter = pathFilter.trim();
  const normalizedQuery = debouncedQuery.trim();
  const normalizedSourceFilter = sourceFilter?.trim() || '';
  const offset = (page - 1) * pageSize;

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Preferences hydration
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedEnabled = window.localStorage.getItem(AUTO_REFRESH_ENABLED_KEY);
    setAutoRefreshEnabled(savedEnabled === 'true');
    const savedInterval = window.localStorage.getItem(AUTO_REFRESH_INTERVAL_KEY);
    if (savedInterval) setAutoRefreshInterval(Number.parseInt(savedInterval, 10));
    setPreferencesHydrated(true);
  }, []);

  // Save preferences
  useEffect(() => {
    if (!preferencesHydrated) return;
    window.localStorage.setItem(AUTO_REFRESH_ENABLED_KEY, String(autoRefreshEnabled));
    window.localStorage.setItem(AUTO_REFRESH_INTERVAL_KEY, String(autoRefreshInterval));
  }, [autoRefreshEnabled, autoRefreshInterval, preferencesHydrated]);

  // Visibility and focus
  useEffect(() => {
    const handleVisibility = () => setIsDocumentVisible(document.visibilityState === 'visible');
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const isQueueRoute = pathname?.startsWith('/admin/ai-paths/queue') ?? false;
  const isPanelActive = isQueueRoute && isActive;
  const effectiveAutoRefreshEnabled = preferencesHydrated && autoRefreshEnabled && isDocumentVisible && isWindowFocused && isPanelActive;

  const resolveRunsRefetchInterval = useCallback((query: { state: { data?: { runs?: AiPathRunRecord[] } } }): number | false => {
    if (!effectiveAutoRefreshEnabled) return false;
    const runs = query.state.data?.runs ?? [];
    const hasActiveRuns = runs.some((run) => ACTIVE_RUN_STATUSES.has(String(run.status ?? '').trim().toLowerCase()));
    return (hasActiveRuns ? Math.max(ACTIVE_RUN_REFRESH_MIN_MS, autoRefreshInterval) : Math.max(IDLE_RUN_REFRESH_MIN_MS, autoRefreshInterval)) + Math.floor(Math.random() * POLLING_JITTER_MS);
  }, [autoRefreshInterval, effectiveAutoRefreshEnabled]);

  const runsQuery = createListQueryV2<{ runs: AiPathRunRecord[]; total: number }, { runs: AiPathRunRecord[]; total: number }>({
    queryKey: QUERY_KEYS.ai.aiPaths.jobQueue({
      pathId: normalizedPathFilter,
      source: normalizedSourceFilter,
      sourceMode,
      query: normalizedQuery,
      status: statusFilter,
      page,
      pageSize,
    }),
    queryFn: async () => {
      const options = {
        pathId: normalizedPathFilter || undefined,
        source: normalizedSourceFilter || undefined,
        sourceMode,
        query: normalizedQuery || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: pageSize,
        offset,
      };
      const response = await runsApi.list(options);
      if (!response.ok) throw new Error(response.error);
      return response.data as { runs: AiPathRunRecord[]; total: number };
    },
    enabled: isPanelActive,
    refetchInterval: resolveRunsRefetchInterval,
    meta: {
      source: 'ai-paths.job-queue',
      operation: 'list',
      resource: 'ai-path-runs',
      queryKey: QUERY_KEYS.ai.aiPaths.jobQueue({
        pathId: normalizedPathFilter,
        source: normalizedSourceFilter,
        sourceMode,
        query: normalizedQuery,
        status: statusFilter,
        page,
        pageSize,
      }),
      domain: 'global',
      criticality: 'high',
    },
  });

  const queueStatusQuery = createListQueryV2<{ status: QueueStatus }, { status: QueueStatus }>({
    queryKey: QUERY_KEYS.ai.aiPaths.queueStatus(),
    queryFn: async () => {
      const response = await runsApi.queueStatus();
      if (!response.ok) throw new Error(response.error);
      return response.data as { status: QueueStatus };
    },
    enabled: isPanelActive,
    meta: {
      source: 'ai-paths.job-queue',
      operation: 'polling',
      resource: 'ai-path-runs-queue-status',
      queryKey: QUERY_KEYS.ai.aiPaths.queueStatus(),
      domain: 'global',
      criticality: 'normal',
    },
  });

  const clearRunsMutation = createDeleteMutationV2({
    mutationKey: QUERY_KEYS.ai.aiPaths.mutation('job-queue.clear-runs'),
    mutationFn: async (scope: 'terminal' | 'all') => {
      const res = await runsApi.clear({ scope, pathId: normalizedPathFilter || undefined, source: normalizedSourceFilter || undefined, sourceMode });
      if (!res.ok) throw new Error(res.error);
      return res.data as { deleted: number; scope: 'all' | 'terminal' };
    },
    onSuccess: (res) => {
      toast(`Cleared ${res.deleted} runs.`, { variant: 'success' });
      setClearScope(null);
      void runsQuery.refetch();
    },
    meta: {
      source: 'ai-paths.job-queue',
      operation: 'delete',
      resource: 'ai-path-runs',
      mutationKey: QUERY_KEYS.ai.aiPaths.mutation('job-queue.clear-runs'),
      domain: 'global',
      criticality: 'high',
    },
  });

  const cancelRunMutation = createMutationV2({
    mutationKey: QUERY_KEYS.ai.aiPaths.mutation('job-queue.cancel-run'),
    mutationFn: async (id: string) => {
      const res = await runsApi.cancel(id);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast('Run canceled.', { variant: 'success' });
      void runsQuery.refetch();
    },
    meta: {
      source: 'ai-paths.job-queue',
      operation: 'action',
      resource: 'ai-path-run-cancel',
      mutationKey: QUERY_KEYS.ai.aiPaths.mutation('job-queue.cancel-run'),
      domain: 'global',
      criticality: 'high',
    },
  });

  const deleteRunMutation = createDeleteMutationV2({
    mutationKey: QUERY_KEYS.ai.aiPaths.mutation('job-queue.delete-run'),
    mutationFn: async (id: string) => {
      const res = await runsApi.remove(id);
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: (_, _runId) => {
      setRunToDelete(null);
      toast('Run deleted.', { variant: 'success' });
      void runsQuery.refetch();
    },
    meta: {
      source: 'ai-paths.job-queue',
      operation: 'delete',
      resource: 'ai-path-run',
      mutationKey: QUERY_KEYS.ai.aiPaths.mutation('job-queue.delete-run'),
      domain: 'global',
      criticality: 'high',
    },
  });

  const loadRunDetail = useCallback(async (runId: string): Promise<void> => {
    setRunDetailErrors((prev) => {
      const next = { ...prev };
      delete next[runId];
      return next;
    });
    setRunDetailLoading((prev) => new Set(prev).add(runId));
    try {
      const response = await runsApi.get(runId);
      if (!response.ok) throw new Error(response.error || 'Failed to load run details.');
      const data = normalizeRunDetail(response.data);
      if (!data) throw new Error('Failed to load run details.');
      setRunDetails((prev) => ({ ...prev, [runId]: data }));
    } catch (error) {
      setRunDetailErrors((prev) => ({
        ...prev,
        [runId]: error instanceof Error ? error.message : 'Failed to load run details.',
      }));
    } finally {
      setRunDetailLoading((prev) => {
        const next = new Set(prev);
        next.delete(runId);
        return next;
      });
    }
  }, []);

  const handleToggleRun = useCallback(async (runId: string) => {
    setExpandedRunIds(prev => {
      const next = new Set(prev);
      if (next.has(runId)) next.delete(runId);
      else next.add(runId);
      return next;
    });
    if (!runDetails[runId]) {
      await loadRunDetail(runId);
    }
  }, [loadRunDetail, runDetails]);

  const handleToggleStream = useCallback((runId: string): void => {
    const source = streamSourcesRef.current.get(runId);
    if (source) {
      source.close();
      streamSourcesRef.current.delete(runId);
      setPausedStreams((prev) => new Set(prev).add(runId));
      setStreamStatuses((prev) => ({ ...prev, [runId]: 'paused' }));
    } else {
      setPausedStreams((prev) => {
        const next = new Set(prev);
        next.delete(runId);
        return next;
      });
      setStreamStatuses((prev) => ({ ...prev, [runId]: 'connecting' }));
    }
  }, []);

  const pauseAllStreams = useCallback((): void => {
    const expandedIds = Array.from(expandedRunIds);
    if (expandedIds.length === 0) return;
    setPausedStreams(new Set(expandedIds));
    streamSourcesRef.current.forEach((source) => source.close());
    streamSourcesRef.current.clear();
    setStreamStatuses((prev) => {
      const next = { ...prev };
      expandedIds.forEach((id) => {
        next[id] = 'paused';
      });
      return next;
    });
  }, [expandedRunIds]);

  const resumeAllStreams = useCallback((): void => {
    if (expandedRunIds.size === 0) return;
    setPausedStreams(new Set());
    setStreamStatuses((prev) => {
      const next = { ...prev };
      expandedRunIds.forEach((id) => {
        next[id] = 'connecting';
      });
      return next;
    });
  }, [expandedRunIds]);

  useEffect(() => {
    const sources = streamSourcesRef.current;
    return (): void => {
      sources.forEach((source) => source.close());
      sources.clear();
    };
  }, []);

  useEffect(() => {
    if (!queueStatusQuery.data?.status) return;
    const status = queueStatusQuery.data.status;
    setQueueHistory((prev) => {
      const next = [
        ...prev,
        {
          ts: Date.now(),
          queued: status.queuedCount ?? 0,
          lagMs: status.queueLagMs ?? null,
          throughput: status.throughputPerMinute ?? null,
        },
      ];
      return next.slice(-120);
    });
  }, [queueStatusQuery.data?.status]);

  useEffect(() => {
    streamSourcesRef.current.forEach((source, runId) => {
      if (!expandedRunIds.has(runId)) {
        source.close();
        streamSourcesRef.current.delete(runId);
        setStreamStatuses((prev) => ({ ...prev, [runId]: 'stopped' }));
      }
    });

    expandedRunIds.forEach((runId) => {
      if (streamSourcesRef.current.has(runId)) return;
      if (pausedStreams.has(runId)) return;
      
      const existing = runDetails[runId];
      const since = existing ? getLatestEventTimestamp(existing.events) : null;
      const params = new URLSearchParams();
      if (since) params.set('since', since);
      const url = `/api/ai-paths/runs/${encodeURIComponent(runId)}/stream${params.toString() ? `?${params.toString()}` : ''}`;
      
      const source = new EventSource(url);
      streamSourcesRef.current.set(runId, source);
      setStreamStatuses((prev) => ({ ...prev, [runId]: 'connecting' }));

      source.addEventListener('ready', () => {
        setStreamStatuses((prev) => ({ ...prev, [runId]: 'live' }));
      });

      source.addEventListener('run', (event: Event) => {
        try {
          const messageEvent = event as MessageEvent;
          const payload = JSON.parse(messageEvent.data as string) as AiPathRunRecord;
          setRunDetails((prev) => {
            const current = prev[runId];
            if (!current) return prev;
            return { ...prev, [runId]: { ...current, run: payload } };
          });
        } catch (error) {
          console.error('[JobQueueContext] Failed to parse run stream payload:', error);
        }
      });

      source.addEventListener('nodes', (event: Event) => {
        try {
          const messageEvent = event as MessageEvent;
          const payload = JSON.parse(messageEvent.data as string) as unknown;
          setRunDetails((prev) => {
            const current = prev[runId];
            if (!current) return prev;
            return { ...prev, [runId]: { ...current, nodes: normalizeRunNodes(payload) } };
          });
        } catch (error) {
          console.error('[JobQueueContext] Failed to parse nodes stream payload:', error);
        }
      });

      source.addEventListener('events', (event: Event) => {
        try {
          const messageEvent = event as MessageEvent;
          const payload = JSON.parse(messageEvent.data as string) as unknown;
          const incoming = Array.isArray(payload) ? payload : ((payload as Record<string, unknown>).events || []);
          const safeIncoming = normalizeRunEvents(incoming);
          if (safeIncoming.length === 0) return;

          setRunDetails((prev) => {
            const current = prev[runId];
            if (!current) return prev;
            const existingIds = new Set(current.events.map((e) => e.id));
            const merged = [...current.events];
            safeIncoming.forEach((e) => {
              if (!existingIds.has(e.id)) merged.push(e);
            });
            merged.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
            return { ...prev, [runId]: { ...current, events: merged } };
          });
        } catch (error) {
          console.error('[JobQueueContext] Failed to parse events stream payload:', error);
        }
      });

      const cleanup = () => {
        setStreamStatuses((prev) => ({ ...prev, [runId]: 'stopped' }));
        source.close();
        streamSourcesRef.current.delete(runId);
      };

      source.addEventListener('done', cleanup);
      source.addEventListener('error', cleanup);
    });
  }, [expandedRunIds, pausedStreams, runDetails]);

  const value: JobQueueContextValue = useMemo((): JobQueueContextValue => ({
    pathFilter, setPathFilter,
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    pageSize, setPageSize,
    page, setPage,
    expandedRunIds, toggleRun: (runId: string) => { void handleToggleRun(runId); },
    runDetails, runDetailLoading, runDetailErrors,
    historySelection, setHistorySelection: (runId: string, nodeId: string) => setHistorySelection(prev => ({ ...prev, [runId]: nodeId })),
    streamStatuses, pausedStreams,
    toggleStream: handleToggleStream,
    pauseAllStreams,
    resumeAllStreams,
    autoRefreshEnabled, setAutoRefreshEnabled,
    autoRefreshInterval, setAutoRefreshInterval,
    showMetricsPanel, setShowMetricsPanel,
    queueHistory, setQueueHistory,
    clearScope, setClearScope,
    runToDelete, setRunToDelete,
    panelLabel: getPanelLabel(sourceFilter, sourceMode),
    panelDescription: getPanelDescription(sourceFilter, sourceMode),
    lagThresholdMs: Number(heavyMap.get(QUEUE_LAG_THRESHOLD_KEY)) || 60000,
    runs: runsQuery.data?.runs ?? [],
    total: runsQuery.data?.total ?? 0,
    totalPages: Math.max(1, Math.ceil((runsQuery.data?.total ?? 0) / pageSize)),
    queueStatus: queueStatusQuery.data?.status,
    isLoadingRuns: runsQuery.isLoading,
    isLoadingQueueStatus: queueStatusQuery.isLoading,
    runsQueryError: runsQuery.error,
    isClearingRuns: clearRunsMutation.isPending,
    isCancelingRun: (id: string) => cancelRunMutation.isPending && cancelRunMutation.variables === id,
    isDeletingRun: (id: string) => deleteRunMutation.isPending && deleteRunMutation.variables === id,
    refetchQueueData: () => { void runsQuery.refetch(); void queueStatusQuery.refetch(); },
    handleClearRuns: async (scope: 'terminal' | 'all') => { await clearRunsMutation.mutateAsync(scope); },
    handleCancelRun: async (id: string) => { await cancelRunMutation.mutateAsync(id); },
    handleDeleteRun: async (id: string) => { await deleteRunMutation.mutateAsync(id); },
    loadRunDetail,
  }), [
    pathFilter, searchQuery, statusFilter, pageSize, page, expandedRunIds, runDetails,
    runDetailLoading, runDetailErrors, historySelection, streamStatuses, pausedStreams,
    autoRefreshEnabled, autoRefreshInterval, showMetricsPanel, queueHistory, clearScope,
    runToDelete, sourceFilter, sourceMode, heavyMap, runsQuery.data, runsQuery.isLoading,
    runsQuery.error, queueStatusQuery.data, queueStatusQuery.isLoading,
    clearRunsMutation.isPending, cancelRunMutation.isPending, cancelRunMutation.variables,
    deleteRunMutation.isPending, deleteRunMutation.variables, runsQuery.refetch,
    queueStatusQuery.refetch, clearRunsMutation.mutateAsync, cancelRunMutation.mutateAsync,
    deleteRunMutation.mutateAsync, loadRunDetail,
  ]);

  return <JobQueueContext.Provider value={value}>{children}</JobQueueContext.Provider>;
}

export function useJobQueueContext() {
  const ctx = useContext(JobQueueContext);
  if (!ctx) throw internalError('useJobQueueContext must be used within JobQueueProvider');
  return ctx;
}
