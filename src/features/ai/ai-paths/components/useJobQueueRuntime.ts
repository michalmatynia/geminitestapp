'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

import {
  getAiPathRun,
  handoffAiPathRun,
  resumeAiPathRun,
  retryAiPathRunNode,
} from '@/shared/lib/ai-paths';
import type { AiPathRunRecord, AiPathRunVisibility } from '@/shared/lib/ai-paths';
import { internalError } from '@/shared/errors/app-error';
import { useToast } from '@/shared/ui';

import {
  DEFAULT_JOB_QUEUE_AUTO_REFRESH_INTERVAL,
  normalizeJobQueueAutoRefreshInterval,
} from './job-queue-auto-refresh';
import {
  getPanelDescription,
  getPanelLabel,
  normalizeRunDetail,
  type RunDetail,
} from './job-queue-panel-utils';
import type { JobQueueActionsValue, JobQueueStateValue } from './job-queue/types';
import {
  JOB_QUEUE_LAG_THRESHOLD_KEY,
  useJobQueueDataLayer,
} from './useJobQueueDataLayer';
import { useJobQueueRealtime } from './useJobQueueRealtime';

const AUTO_REFRESH_ENABLED_KEY = 'ai-paths-job-queue-auto-refresh-enabled';
const AUTO_REFRESH_INTERVAL_KEY = 'ai-paths-job-queue-auto-refresh-interval';
const BURST_REFRESH_WINDOW_MS = 15_000;

type JobQueueRuntimeParams = {
  activePathId?: string | null;
  sourceFilter?: string | null;
  sourceMode?: 'include' | 'exclude';
  visibility?: AiPathRunVisibility;
  isActive?: boolean;
};

interface JobQueueRuntimeResult {
  actionsValue: JobQueueActionsValue;
  stateValue: JobQueueStateValue;
}

export function useJobQueueRuntime({
  activePathId,
  sourceFilter,
  sourceMode = 'include',
  visibility = 'scoped',
  isActive = true,
}: JobQueueRuntimeParams): JobQueueRuntimeResult {
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
  const [showMetricsPanel, setShowMetricsPanel] = useState(false);

  const normalizedPathFilter = pathFilter.trim();
  const normalizedQuery = debouncedQuery.trim();
  const normalizedSourceFilter = sourceFilter?.trim() || '';
  const offset = (page - 1) * pageSize;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const setAutoRefreshInterval = useCallback((interval: number): void => {
    setAutoRefreshIntervalState(normalizeJobQueueAutoRefreshInterval(interval));
  }, []);

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

  useEffect(() => {
    if (!preferencesHydrated) return;
    window.localStorage.setItem(AUTO_REFRESH_ENABLED_KEY, String(autoRefreshEnabled));
    window.localStorage.setItem(AUTO_REFRESH_INTERVAL_KEY, String(autoRefreshInterval));
  }, [autoRefreshEnabled, autoRefreshInterval, preferencesHydrated]);

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

  const {
    cancelRunMutation,
    clearRunsMutation,
    deleteRunMutation,
    heavyMap,
    queueStatusQuery,
    refetchQueueData,
    runsQuery,
    visibleRunsPayload,
  } = useJobQueueDataLayer({
    autoRefreshInterval,
    effectiveAutoRefreshEnabled,
    isBurstRefreshActive,
    isPanelActive,
    markBurstRefresh,
    normalizedPathFilter,
    normalizedQuery,
    normalizedSourceFilter,
    normalizedVisibility,
    offset,
    page,
    pageSize,
    setClearScope,
    setRunToDelete,
    sourceMode,
    statusFilter,
    toast,
  });

  const {
    handleToggleStream,
    pauseAllStreams,
    pausedStreams,
    queueHistory,
    resumeAllStreams,
    setQueueHistory,
    streamStatuses,
  } = useJobQueueRealtime({
    expandedRunIds,
    isDocumentVisible,
    isPanelActive,
    isWindowFocused,
    queueStatus: queueStatusQuery.data?.status,
    refetchQueueData,
    runDetails,
    setRunDetails,
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
      if (!response.ok) throw internalError(response.error || 'Failed to load run details.');
      const data = normalizeRunDetail(response.data);
      if (!data) throw internalError('Failed to load run details.');
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

  const toggleRun = useCallback(
    (runId: string): void => {
      void handleToggleRun(runId);
    },
    [handleToggleRun]
  );

  const setHistorySelectionForRun = useCallback((runId: string, nodeId: string): void => {
    setHistorySelection((prev) => ({ ...prev, [runId]: nodeId }));
  }, []);

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

  const handleResumeRun = useCallback(
    async (id: string, mode: 'resume' | 'replay'): Promise<void> => {
      const response = await resumeAiPathRun(id, mode);
      if (!response.ok) {
        toast(response.error || 'Failed to resume run.', { variant: 'error' });
        return;
      }
      toast(mode === 'resume' ? 'Run resumed.' : 'Run replay queued.', {
        variant: 'success',
      });
      refetchQueueData({ fresh: true, markBurst: true });
    },
    [refetchQueueData, toast]
  );

  const handleHandoffRun = useCallback(
    async (id: string, reason?: string): Promise<boolean> => {
      const response = await handoffAiPathRun(id, reason ? { reason } : undefined);
      if (!response.ok) {
        toast(response.error || 'Failed to mark run handoff-ready.', { variant: 'error' });
        return false;
      }
      toast('Run marked handoff-ready.', { variant: 'success' });
      refetchQueueData({ fresh: true, markBurst: true });
      return true;
    },
    [refetchQueueData, toast]
  );

  const handleRetryRunNode = useCallback(
    async (id: string, nodeId: string): Promise<void> => {
      const response = await retryAiPathRunNode(id, nodeId);
      if (!response.ok) {
        toast(response.error || 'Failed to queue node retry.', { variant: 'error' });
        return;
      }
      toast('Node retry queued.', { variant: 'success' });
      refetchQueueData({ fresh: true, markBurst: true });
    },
    [refetchQueueData, toast]
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
      lagThresholdMs: Number(heavyMap.get(JOB_QUEUE_LAG_THRESHOLD_KEY)) || 60000,
      runs: visibleRunsPayload.runs,
      total: visibleRunsPayload.total,
      totalPages: Math.max(1, Math.ceil(visibleRunsPayload.total / pageSize)),
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
      heavyMap,
      visibleRunsPayload,
      queueStatusQuery.data,
      queueStatusQuery.isLoading,
      runsQuery.isLoading,
      runsQuery.error,
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
      handleResumeRun,
      handleHandoffRun,
      handleRetryRunNode,
      handleCancelRun,
      handleDeleteRun,
      loadRunDetail,
    }),
    [
      toggleRun,
      setHistorySelectionForRun,
      handleToggleStream,
      pauseAllStreams,
      resumeAllStreams,
      setAutoRefreshEnabled,
      setAutoRefreshInterval,
      setQueueHistory,
      refetchQueueDataAction,
      handleClearRuns,
      handleResumeRun,
      handleHandoffRun,
      handleRetryRunNode,
      handleCancelRun,
      handleDeleteRun,
      loadRunDetail,
    ]
  );

  return {
    actionsValue,
    stateValue,
  };
}
