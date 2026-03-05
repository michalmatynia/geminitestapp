'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import {
  cancelAiPathRun,
  clearAiPathRuns,
  getAiPathQueueStatus,
  getAiPathRun,
  listAiPathRuns,
  removeAiPathRun,
} from '@/shared/lib/ai-paths';
import type { AiPathRunRecord, AiPathRunVisibility } from '@/shared/lib/ai-paths';
import {
  AI_PATH_RUN_ENQUEUED_EVENT_NAME,
  AI_PATH_RUN_QUEUE_CHANNEL,
  parseAiPathRunEnqueuedEventPayload,
} from '@/shared/contracts/ai-paths';
import { fetchAiPathsSettingsCached } from '@/shared/lib/ai-paths/settings-store-client';
import {
  createDeleteMutationV2,
  createListQueryV2,
  createMutationV2,
} from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { useToast } from '@/shared/ui';
import {
  getLatestEventTimestamp,
  getPanelDescription,
  getPanelLabel,
  normalizeRunDetail,
  normalizeRunEvents,
  normalizeRunNodes,
  refreshRunDetailErrorSummary,
  type QueueHistoryEntry,
  type QueueStatus,
  type RunDetail,
  type StreamConnectionStatus,
} from './job-queue-panel-utils';
import {
  DEFAULT_JOB_QUEUE_AUTO_REFRESH_INTERVAL,
  normalizeJobQueueAutoRefreshInterval,
} from './job-queue-auto-refresh';
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

type JobQueueActionKey =
  | 'setPathFilter'
  | 'setSearchQuery'
  | 'setStatusFilter'
  | 'setPageSize'
  | 'setPage'
  | 'toggleRun'
  | 'setHistorySelection'
  | 'toggleStream'
  | 'pauseAllStreams'
  | 'resumeAllStreams'
  | 'setAutoRefreshEnabled'
  | 'setAutoRefreshInterval'
  | 'setShowMetricsPanel'
  | 'setQueueHistory'
  | 'setClearScope'
  | 'setRunToDelete'
  | 'refetchQueueData'
  | 'handleClearRuns'
  | 'handleCancelRun'
  | 'handleDeleteRun'
  | 'loadRunDetail';

export type JobQueueActionsValue = Pick<JobQueueContextValue, JobQueueActionKey>;
export type JobQueueStateValue = Omit<JobQueueContextValue, JobQueueActionKey>;

// ─── constants ────────────────────────────────────────────────────────────────

const AUTO_REFRESH_ENABLED_KEY = 'ai-paths-job-queue-auto-refresh-enabled';
const AUTO_REFRESH_INTERVAL_KEY = 'ai-paths-job-queue-auto-refresh-interval';
const ACTIVE_RUN_REFRESH_INTERVAL_MS = 1000;
const IDLE_RUN_REFRESH_MIN_MS = 30000;
const ACTIVE_RUN_STATUSES = new Set(['queued', 'running', 'paused']);
const POLLING_JITTER_MS = 500;
const QUEUE_STATUS_POLL_INTERVAL_MS = 1_000;
const BURST_REFRESH_WINDOW_MS = 15_000;
const QUEUE_LAG_THRESHOLD_KEY = 'ai_paths_queue_lag_threshold_ms';
const JobQueueStateContext = createContext<JobQueueStateValue | null>(null);
const JobQueueActionsContext = createContext<JobQueueActionsValue | null>(null);

export function JobQueueProvider({
  children,
  activePathId,
  sourceFilter,
  sourceMode = 'include',
  visibility = 'scoped',
  isActive = true,
}: {
  children: React.ReactNode;
  activePathId?: string | null;
  sourceFilter?: string | null;
  sourceMode?: 'include' | 'exclude';
  visibility?: AiPathRunVisibility;
  isActive?: boolean;
}): React.JSX.Element {
  const pathname = usePathname();
  const { toast } = useToast();

  const normalizedVisibility = visibility === 'global' ? 'global' : 'scoped';

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
  const forceFreshRunsRef = useRef(false);
  const forceFreshQueueStatusRef = useRef(false);
  const previousQueueSignatureRef = useRef<string | null>(null);
  const [pausedStreams, setPausedStreams] = useState<Set<string>>(new Set());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [autoRefreshInterval, setAutoRefreshIntervalState] = useState<number>(
    DEFAULT_JOB_QUEUE_AUTO_REFRESH_INTERVAL
  );
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [burstRefreshUntil, setBurstRefreshUntil] = useState(0);
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

  const setAutoRefreshInterval = useCallback((interval: number): void => {
    setAutoRefreshIntervalState(normalizeJobQueueAutoRefreshInterval(interval));
  }, []);

  // Preferences hydration
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedEnabled = window.localStorage.getItem(AUTO_REFRESH_ENABLED_KEY);
    setAutoRefreshEnabled(savedEnabled === 'true');
    const savedInterval = window.localStorage.getItem(AUTO_REFRESH_INTERVAL_KEY);
    if (savedInterval) {
      setAutoRefreshInterval(normalizeJobQueueAutoRefreshInterval(savedInterval));
    }
    setPreferencesHydrated(true);
  }, [setAutoRefreshInterval]);

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
  const effectiveAutoRefreshEnabled =
    preferencesHydrated &&
    autoRefreshEnabled &&
    isDocumentVisible &&
    isWindowFocused &&
    isPanelActive;
  const isBurstRefreshActive = burstRefreshUntil > Date.now();

  const markBurstRefresh = useCallback((): void => {
    setBurstRefreshUntil(Date.now() + BURST_REFRESH_WINDOW_MS);
  }, []);

  const resolveRunsRefetchInterval = useCallback(
    (query: { state: { data?: { runs?: AiPathRunRecord[] } } }): number | false => {
      if (!effectiveAutoRefreshEnabled) return false;
      if (isBurstRefreshActive) {
        return ACTIVE_RUN_REFRESH_INTERVAL_MS + Math.floor(Math.random() * POLLING_JITTER_MS);
      }
      const runs = query.state.data?.runs ?? [];
      const hasActiveRuns = runs.some((run) =>
        ACTIVE_RUN_STATUSES.has(
          String(run.status ?? '')
            .trim()
            .toLowerCase()
        )
      );
      if (hasActiveRuns) {
        return ACTIVE_RUN_REFRESH_INTERVAL_MS + Math.floor(Math.random() * POLLING_JITTER_MS);
      }
      return (
        Math.max(IDLE_RUN_REFRESH_MIN_MS, autoRefreshInterval) +
        Math.floor(Math.random() * POLLING_JITTER_MS)
      );
    },
    [autoRefreshInterval, effectiveAutoRefreshEnabled, isBurstRefreshActive]
  );

  const runsQuery = createListQueryV2<
    { runs: AiPathRunRecord[]; total: number },
    { runs: AiPathRunRecord[]; total: number }
  >({
    queryKey: QUERY_KEYS.ai.aiPaths.jobQueue({
      pathId: normalizedPathFilter,
      source: normalizedSourceFilter,
      sourceMode,
      visibility: normalizedVisibility as AiPathRunVisibility,
      query: normalizedQuery,
      status: statusFilter,
      page,
      pageSize,
    }),
    queryFn: async () => {
      const fresh = forceFreshRunsRef.current;
      forceFreshRunsRef.current = false;
      const options = {
        pathId: normalizedPathFilter || undefined,
        source: normalizedSourceFilter || undefined,
        sourceMode,
        visibility: normalizedVisibility as AiPathRunVisibility,
        query: normalizedQuery || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: pageSize,
        offset,
        ...(fresh ? { fresh: true } : {}),
      };
      const response = await listAiPathRuns(options);
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
        visibility: normalizedVisibility as AiPathRunVisibility,
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
    queryKey: QUERY_KEYS.ai.aiPaths.queueStatus({
      visibility: normalizedVisibility as AiPathRunVisibility,
    }),
    queryFn: async () => {
      const fresh = forceFreshQueueStatusRef.current;
      forceFreshQueueStatusRef.current = false;
      const response = await getAiPathQueueStatus({
        visibility: normalizedVisibility as AiPathRunVisibility,
        ...(fresh ? { fresh: true } : {}),
      });
      if (!response.ok) throw new Error(response.error);
      return response.data as { status: QueueStatus };
    },
    enabled: isPanelActive,
    refetchInterval: effectiveAutoRefreshEnabled
      ? QUEUE_STATUS_POLL_INTERVAL_MS + Math.floor(Math.random() * POLLING_JITTER_MS)
      : false,
    meta: {
      source: 'ai-paths.job-queue',
      operation: 'polling',
      resource: 'ai-path-runs-queue-status',
      queryKey: QUERY_KEYS.ai.aiPaths.queueStatus({
        visibility: normalizedVisibility as AiPathRunVisibility,
      }),
      domain: 'global',
      criticality: 'normal',
    },
  });

  const refetchRuns = runsQuery.refetch;
  const refetchQueueStatus = queueStatusQuery.refetch;

  const refetchQueueData = useCallback(
    (options?: {
      fresh?: boolean;
      includeRuns?: boolean;
      includeQueueStatus?: boolean;
      markBurst?: boolean;
    }): void => {
      const includeRuns = options?.includeRuns !== false;
      const includeQueueStatus = options?.includeQueueStatus !== false;
      if (options?.fresh) {
        if (includeRuns) forceFreshRunsRef.current = true;
        if (includeQueueStatus) forceFreshQueueStatusRef.current = true;
      }
      if (options?.markBurst) {
        markBurstRefresh();
      }
      if (includeRuns) void refetchRuns();
      if (includeQueueStatus) void refetchQueueStatus();
    },
    [markBurstRefresh, refetchQueueStatus, refetchRuns]
  );

  const clearRunsMutation = createDeleteMutationV2({
    mutationKey: QUERY_KEYS.ai.aiPaths.mutation('job-queue.clear-runs'),
    mutationFn: async (scope: 'terminal' | 'all') => {
      const res = await clearAiPathRuns({
        scope,
        pathId: normalizedPathFilter || undefined,
        source: normalizedSourceFilter || undefined,
        sourceMode,
      });
      if (!res.ok) throw new Error(res.error);
      return res.data as { deleted: number; scope: 'all' | 'terminal' };
    },
    onSuccess: (res) => {
      toast(`Cleared ${res.deleted} runs.`, { variant: 'success' });
      setClearScope(null);
      refetchQueueData({ fresh: true, markBurst: true });
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
      const res = await cancelAiPathRun(id);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast('Run canceled.', { variant: 'success' });
      refetchQueueData({ fresh: true, markBurst: true });
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
      const res = await removeAiPathRun(id);
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: (_, _runId) => {
      setRunToDelete(null);
      toast('Run deleted.', { variant: 'success' });
      refetchQueueData({ fresh: true, markBurst: true });
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
      const response = await getAiPathRun(runId);
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

  const handleToggleRun = useCallback(
    async (runId: string) => {
      setExpandedRunIds((prev) => {
        const next = new Set(prev);
        if (next.has(runId)) next.delete(runId);
        else next.add(runId);
        return next;
      });
      if (!runDetails[runId]) {
        await loadRunDetail(runId);
      }
    },
    [loadRunDetail, runDetails]
  );

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
    const signature = JSON.stringify({
      queuedCount: status.queuedCount ?? 0,
      activeRuns: status.activeRuns ?? 0,
      waitingCount: status.waitingCount ?? 0,
      delayedCount: status.delayedCount ?? 0,
      failedCount: status.failedCount ?? 0,
    });
    if (
      previousQueueSignatureRef.current !== null &&
      previousQueueSignatureRef.current !== signature &&
      isPanelActive
    ) {
      refetchQueueData({
        fresh: true,
        includeQueueStatus: false,
        markBurst: true,
      });
    }
    const hasSignatureChanged = previousQueueSignatureRef.current !== signature;
    previousQueueSignatureRef.current = signature;
    if (!hasSignatureChanged) return;
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
  }, [isPanelActive, queueStatusQuery.data?.status, refetchQueueData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const refreshQueueViews = (): void => {
      if (!isPanelActive) return;
      refetchQueueData({ fresh: true, markBurst: true });
    };

    const handleWindowEvent = (event: Event): void => {
      const payload = parseAiPathRunEnqueuedEventPayload(
        (event as CustomEvent<unknown>).detail
      );
      if (!payload) return;
      refreshQueueViews();
    };

    window.addEventListener(AI_PATH_RUN_ENQUEUED_EVENT_NAME, handleWindowEvent as EventListener);

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel(AI_PATH_RUN_QUEUE_CHANNEL);
        channel.onmessage = (event) => {
          if (!parseAiPathRunEnqueuedEventPayload(event.data)) return;
          refreshQueueViews();
        };
      } catch {
        channel = null;
      }
    }

    return (): void => {
      window.removeEventListener(
        AI_PATH_RUN_ENQUEUED_EVENT_NAME,
        handleWindowEvent as EventListener
      );
      if (channel) {
        channel.close();
      }
    };
  }, [isPanelActive, refetchQueueData]);

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
            return {
              ...prev,
              [runId]: refreshRunDetailErrorSummary({
                ...current,
                run: payload,
              }),
            };
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
            return {
              ...prev,
              [runId]: refreshRunDetailErrorSummary({
                ...current,
                nodes: normalizeRunNodes(payload),
              }),
            };
          });
        } catch (error) {
          console.error('[JobQueueContext] Failed to parse nodes stream payload:', error);
        }
      });

      source.addEventListener('events', (event: Event) => {
        try {
          const messageEvent = event as MessageEvent;
          const payload = JSON.parse(messageEvent.data as string) as unknown;
          const incoming = Array.isArray(payload)
            ? payload
            : (payload as Record<string, unknown>)['events'] || [];
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
            merged.sort(
              (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
            );
            return {
              ...prev,
              [runId]: refreshRunDetailErrorSummary({
                ...current,
                events: merged,
              }),
            };
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

  const toggleRun = useCallback(
    (runId: string): void => {
      void handleToggleRun(runId);
    },
    [handleToggleRun]
  );
  const setHistorySelectionForRun = useCallback(
    (runId: string, nodeId: string): void => {
      setHistorySelection((prev) => ({ ...prev, [runId]: nodeId }));
    },
    []
  );
  const isCancelingRun = useCallback(
    (id: string): boolean => cancelRunMutation.isPending && cancelRunMutation.variables === id,
    [cancelRunMutation.isPending, cancelRunMutation.variables]
  );
  const isDeletingRun = useCallback(
    (id: string): boolean => deleteRunMutation.isPending && deleteRunMutation.variables === id,
    [deleteRunMutation.isPending, deleteRunMutation.variables]
  );
  const refetchQueueDataAction = useCallback((): void => {
    refetchQueueData({ fresh: true, markBurst: true });
  }, [refetchQueueData]);
  const handleClearRuns = useCallback(
    async (scope: 'terminal' | 'all'): Promise<void> => {
      await clearRunsMutation.mutateAsync(scope);
    },
    [clearRunsMutation.mutateAsync]
  );
  const handleCancelRun = useCallback(
    async (id: string): Promise<void> => {
      await cancelRunMutation.mutateAsync(id);
    },
    [cancelRunMutation.mutateAsync]
  );
  const handleDeleteRun = useCallback(
    async (id: string): Promise<void> => {
      await deleteRunMutation.mutateAsync(id);
    },
    [deleteRunMutation.mutateAsync]
  );

  const stateValue: JobQueueStateValue = useMemo(
    (): JobQueueStateValue => ({
      pathFilter,
      searchQuery,
      statusFilter,
      pageSize,
      page,
      expandedRunIds,
      runDetails,
      runDetailLoading,
      runDetailErrors,
      historySelection,
      streamStatuses,
      pausedStreams,
      autoRefreshEnabled,
      autoRefreshInterval,
      showMetricsPanel,
      queueHistory,
      clearScope,
      runToDelete,
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
      isCancelingRun,
      isDeletingRun,
    }),
    [
      pathFilter,
      searchQuery,
      statusFilter,
      pageSize,
      page,
      expandedRunIds,
      runDetails,
      runDetailLoading,
      runDetailErrors,
      historySelection,
      streamStatuses,
      pausedStreams,
      autoRefreshEnabled,
      autoRefreshInterval,
      showMetricsPanel,
      queueHistory,
      clearScope,
      runToDelete,
      sourceFilter,
      sourceMode,
      normalizedVisibility,
      heavyMap,
      runsQuery.data,
      runsQuery.isLoading,
      runsQuery.error,
      queueStatusQuery.data,
      queueStatusQuery.isLoading,
      clearRunsMutation.isPending,
      isCancelingRun,
      isDeletingRun,
    ]
  );

  const actionsValue: JobQueueActionsValue = useMemo(
    (): JobQueueActionsValue => ({
      setPathFilter,
      setSearchQuery,
      setStatusFilter,
      setPageSize,
      setPage,
      toggleRun,
      setHistorySelection: setHistorySelectionForRun,
      toggleStream: handleToggleStream,
      pauseAllStreams,
      resumeAllStreams,
      setAutoRefreshEnabled,
      setAutoRefreshInterval,
      setShowMetricsPanel,
      setQueueHistory,
      setClearScope,
      setRunToDelete,
      refetchQueueData: refetchQueueDataAction,
      handleClearRuns,
      handleCancelRun,
      handleDeleteRun,
      loadRunDetail,
    }),
    [
      setPathFilter,
      setSearchQuery,
      setStatusFilter,
      setPageSize,
      setPage,
      toggleRun,
      setHistorySelectionForRun,
      handleToggleStream,
      pauseAllStreams,
      resumeAllStreams,
      setAutoRefreshEnabled,
      setAutoRefreshInterval,
      setShowMetricsPanel,
      setQueueHistory,
      setClearScope,
      setRunToDelete,
      refetchQueueDataAction,
      handleClearRuns,
      handleCancelRun,
      handleDeleteRun,
      loadRunDetail,
    ]
  );

  return (
    <JobQueueStateContext.Provider value={stateValue}>
      <JobQueueActionsContext.Provider value={actionsValue}>
        {children}
      </JobQueueActionsContext.Provider>
    </JobQueueStateContext.Provider>
  );
}

export function useJobQueueState(): JobQueueStateValue {
  const ctx = useContext(JobQueueStateContext);
  if (!ctx) throw internalError('useJobQueueState must be used within JobQueueProvider');
  return ctx;
}

export function useJobQueueActions(): JobQueueActionsValue {
  const ctx = useContext(JobQueueActionsContext);
  if (!ctx) throw internalError('useJobQueueActions must be used within JobQueueProvider');
  return ctx;
}
