'use client';

import { useCallback, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import type { Toast, ListQuery, MutationResult } from '@/shared/contracts/ui';
import { internalError } from '@/shared/errors/app-error';
import type { AiPathRunListResult, AiPathRunRecord, AiPathRunVisibility } from '@/shared/lib/ai-paths';
import { cancelAiPathRun, clearAiPathRuns, getAiPathQueueStatus, listAiPathRuns, removeAiPathRun } from '@/shared/lib/ai-paths';
import {
  mergeAiPathQueuePayloadWithOptimisticRuns,
  patchQueuedCountWithOptimisticRuns,
  previewAiPathQueuePayloadWithOptimisticRuns,
  rememberOptimisticAiPathRun,
} from '@/shared/lib/ai-paths/optimistic-run-queue';
import { fetchAiPathsSettingsByKeysCached } from '@/shared/lib/ai-paths/settings-store-client';
import {
  createDeleteMutationV2,
  createListQueryV2,
  createMutationV2,
} from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type { QueueStatus } from './job-queue-panel-utils';

const ACTIVE_RUN_REFRESH_INTERVAL_MS = 1000;
const IDLE_RUN_REFRESH_MIN_MS = 30000;
const ACTIVE_RUN_STATUSES = new Set(['queued', 'running', 'paused']);
const POLLING_JITTER_MS = 500;
const QUEUE_STATUS_POLL_INTERVAL_MS = 1_000;

export const JOB_QUEUE_LAG_THRESHOLD_KEY = 'ai_paths_queue_lag_threshold_ms';

export type JobQueueRefetchOptions = {
  fresh?: boolean;
  includeRuns?: boolean;
  includeQueueStatus?: boolean;
  markBurst?: boolean;
};

export type JobQueueRefetchData = (options?: JobQueueRefetchOptions) => void;

type QueueStatusPayload = { status: QueueStatus };

interface JobQueueDataLayerParams {
  autoRefreshInterval: number;
  effectiveAutoRefreshEnabled: boolean;
  isBurstRefreshActive: boolean;
  isPanelActive: boolean;
  markBurstRefresh: () => void;
  optimisticRunsHydrated: boolean;
  normalizedPathFilter: string;
  normalizedQuery: string;
  normalizedSourceFilter: string;
  normalizedVisibility: AiPathRunVisibility;
  offset: number;
  page: number;
  pageSize: number;
  setClearScope: Dispatch<SetStateAction<'terminal' | 'all' | null>>;
  setRunToDelete: Dispatch<SetStateAction<AiPathRunRecord | null>>;
  sourceMode: 'include' | 'exclude';
  statusFilter: string;
  toast: Toast;
}

interface JobQueueDataLayerResult {
  cancelRunMutation: MutationResult<unknown, string>;
  clearRunsMutation: MutationResult<{ deleted: number; scope: 'all' | 'terminal' }, 'terminal' | 'all'>;
  deleteRunMutation: MutationResult<void, string>;
  heavyMap: Map<string, string>;
  rememberVisibleOptimisticRun: (run: AiPathRunRecord) => void;
  queueStatusQuery: ListQuery<QueueStatusPayload, QueueStatusPayload>;
  refetchQueueData: JobQueueRefetchData;
  runsQuery: ListQuery<AiPathRunListResult, AiPathRunListResult>;
  visibleRunsPayload: AiPathRunListResult;
}

export function useJobQueueDataLayer({
  autoRefreshInterval,
  effectiveAutoRefreshEnabled,
  isBurstRefreshActive,
  isPanelActive,
  markBurstRefresh,
  optimisticRunsHydrated,
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
}: JobQueueDataLayerParams): JobQueueDataLayerResult {
  const [optimisticRunsRevision, setOptimisticRunsRevision] = useState(0);
  const aiPathsSettingsQuery = createListQueryV2<
    Array<{ key: string; value: string }>,
    Array<{ key: string; value: string }>
  >({
    queryKey: QUERY_KEYS.ai.aiPaths.settings(),
    queryFn: async () => {
      try {
        return await fetchAiPathsSettingsByKeysCached([JOB_QUEUE_LAG_THRESHOLD_KEY]);
      } catch (error) {
        logClientCatch(error, {
          source: 'ai-paths.job-queue',
          action: 'loadLagThreshold',
          settingsKey: JOB_QUEUE_LAG_THRESHOLD_KEY,
          level: 'warn',
        });
        return [];
      }
    },
    enabled: isPanelActive,
    staleTime: 60_000,
    meta: {
      source: 'ai-paths.job-queue',
      operation: 'list',
      resource: 'ai-paths-settings',
      queryKey: QUERY_KEYS.ai.aiPaths.settings(),
      domain: 'global',
      criticality: 'normal',
      description: 'Loads ai paths settings.',
    },
  });

  const heavyMap = useMemo(
    () => new Map((aiPathsSettingsQuery.data ?? []).map((item) => [item.key, item.value])),
    [aiPathsSettingsQuery.data]
  );

  const forceFreshRunsRef = useRef(false);
  const forceFreshQueueStatusRef = useRef(false);

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

  const runsQuery = createListQueryV2<AiPathRunListResult, AiPathRunListResult>({
    queryKey: QUERY_KEYS.ai.aiPaths.jobQueue({
      pathId: normalizedPathFilter,
      source: normalizedSourceFilter,
      sourceMode,
      visibility: normalizedVisibility,
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
        visibility: normalizedVisibility,
        query: normalizedQuery || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: pageSize,
        offset,
        ...(fresh ? { fresh: true } : {}),
      };
      const response = await listAiPathRuns(options);
      if (!response.ok) throw internalError(response.error);
      return mergeAiPathQueuePayloadWithOptimisticRuns(response.data, {
        pathId: normalizedPathFilter || undefined,
        source: normalizedSourceFilter || undefined,
        sourceMode,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        query: normalizedQuery || undefined,
        limit: pageSize,
        offset,
      });
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
        visibility: normalizedVisibility,
        query: normalizedQuery,
        status: statusFilter,
        page,
        pageSize,
      }),
      domain: 'global',
      criticality: 'high',
      description: 'Loads ai path runs.',
    },
  });

  const queueStatusQuery = createListQueryV2<QueueStatusPayload, QueueStatusPayload>({
    queryKey: QUERY_KEYS.ai.aiPaths.queueStatus({
      visibility: normalizedVisibility,
    }),
    queryFn: async () => {
      const fresh = forceFreshQueueStatusRef.current;
      forceFreshQueueStatusRef.current = false;
      const response = await getAiPathQueueStatus({
        visibility: normalizedVisibility,
        ...(fresh ? { fresh: true } : {}),
      });
      if (!response.ok) throw internalError(response.error);
      return {
        status: patchQueuedCountWithOptimisticRuns((response.data as QueueStatusPayload).status),
      };
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
        visibility: normalizedVisibility,
      }),
      domain: 'global',
      criticality: 'normal',
      description: 'Polls ai path runs queue status.',
    },
  });

  const refetchQueueData = useCallback<JobQueueRefetchData>(
    (options) => {
      const includeRuns = options?.includeRuns !== false;
      const includeQueueStatus = options?.includeQueueStatus !== false;
      if (options?.fresh) {
        if (includeRuns) forceFreshRunsRef.current = true;
        if (includeQueueStatus) forceFreshQueueStatusRef.current = true;
      }
      if (options?.markBurst) {
        markBurstRefresh();
      }
      if (includeRuns) void runsQuery.refetch();
      if (includeQueueStatus) void queueStatusQuery.refetch();
    },
    [markBurstRefresh, queueStatusQuery, runsQuery]
  );

  const queuePreviewFilters = useMemo(
    () => ({
      pathId: normalizedPathFilter || undefined,
      source: normalizedSourceFilter || undefined,
      sourceMode,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      query: normalizedQuery || undefined,
      limit: pageSize,
      offset,
    }),
    [
      normalizedPathFilter,
      normalizedQuery,
      normalizedSourceFilter,
      offset,
      pageSize,
      sourceMode,
      statusFilter,
    ]
  );

  const visibleRunsPayload = useMemo(
    (): AiPathRunListResult =>
      optimisticRunsHydrated
        ? previewAiPathQueuePayloadWithOptimisticRuns(
          runsQuery.data ?? { runs: [], total: 0 },
          queuePreviewFilters
        )
        : (runsQuery.data ?? { runs: [], total: 0 }),
    [optimisticRunsHydrated, optimisticRunsRevision, queuePreviewFilters, runsQuery.data]
  );

  const rememberVisibleOptimisticRun = useCallback((run: AiPathRunRecord): void => {
    rememberOptimisticAiPathRun(run);
    setOptimisticRunsRevision((prev) => prev + 1);
  }, []);

  const clearRunsMutation = createDeleteMutationV2<
    { deleted: number; scope: 'all' | 'terminal' },
    'terminal' | 'all'
  >({
    mutationKey: QUERY_KEYS.ai.aiPaths.mutation('job-queue.clear-runs'),
    mutationFn: async (scope) => {
      const res = await clearAiPathRuns({
        scope,
        pathId: normalizedPathFilter || undefined,
        source: normalizedSourceFilter || undefined,
        sourceMode,
      });
      if (!res.ok) throw internalError(res.error);
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
      description: 'Deletes ai path runs.',
    },
  });

  const cancelRunMutation = createMutationV2<unknown, string>({
    mutationKey: QUERY_KEYS.ai.aiPaths.mutation('job-queue.cancel-run'),
    mutationFn: async (id: string) => {
      const res = await cancelAiPathRun(id);
      if (!res.ok) throw internalError(res.error);
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
      description: 'Runs ai path run cancel.',
    },
  });

  const deleteRunMutation = createDeleteMutationV2<void, string>({
    mutationKey: QUERY_KEYS.ai.aiPaths.mutation('job-queue.delete-run'),
    mutationFn: async (id: string) => {
      const res = await removeAiPathRun(id);
      if (!res.ok) throw internalError(res.error);
    },
    onSuccess: () => {
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
      description: 'Deletes ai path run.',
    },
  });

  return {
    cancelRunMutation,
    clearRunsMutation,
    deleteRunMutation,
    heavyMap,
    rememberVisibleOptimisticRun,
    queueStatusQuery,
    refetchQueueData,
    runsQuery,
    visibleRunsPayload,
  };
}
