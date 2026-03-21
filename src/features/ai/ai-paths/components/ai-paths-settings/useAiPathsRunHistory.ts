'use client';

import { type Query } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';

import {
  useRunHistoryActions,
  useRunHistoryState,
} from '@/features/ai/ai-paths/context/RunHistoryContext';
import {
  cancelAiPathRun,
  getAiPathRun,
  listAiPathRuns,
  aiPathRunRecordSchema,
  handoffAiPathRun,
  resumeAiPathRun,
  retryAiPathRunNode,
  type AiPathRunEventRecord,
  type AiPathRunRecord,
  type RuntimeHistoryEntry,
} from '@/shared/lib/ai-paths';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { Toast as ToastFn } from '@/shared/contracts/ui';

import {
  normalizeRunDetail,
  normalizeRunEvents,
  normalizeRunNodes,
} from '../job-queue-panel-utils';
import { buildHistoryNodeOptions, type HistoryNodeOption } from '../run-history-utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type UseAiPathsRunHistoryArgs = {
  activePathId: string | null;
  toast: ToastFn;
};

const RUN_STATUS_ALIASES: Record<string, AiPathRunRecord['status']> = {
  queued: 'queued',
  queue: 'queued',
  running: 'running',
  blocked_on_lease: 'blocked_on_lease',
  blocked: 'blocked_on_lease',
  paused: 'paused',
  handoff_ready: 'handoff_ready',
  handoff: 'handoff_ready',
  completed: 'completed',
  complete: 'completed',
  success: 'completed',
  failed: 'failed',
  failure: 'failed',
  error: 'failed',
  canceled: 'canceled',
  cancelled: 'canceled',
  dead_lettered: 'dead_lettered',
  deadlettered: 'dead_lettered',
};

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asIsoTimestamp = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  return null;
};

const normalizeRunStatus = (value: unknown): AiPathRunRecord['status'] | null => {
  const normalized = asTrimmedString(value)?.toLowerCase();
  if (!normalized) return null;
  return RUN_STATUS_ALIASES[normalized] ?? null;
};

const coerceRunRecord = (value: unknown): AiPathRunRecord | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const id = asTrimmedString(raw['id']) ?? asTrimmedString(raw['_id']);
  const status = normalizeRunStatus(raw['status']);
  if (!id || !status) return null;

  const createdAt =
    asIsoTimestamp(raw['createdAt']) ??
    asIsoTimestamp(raw['startedAt']) ??
    asIsoTimestamp(raw['updatedAt']) ??
    new Date().toISOString();
  const updatedAt =
    asIsoTimestamp(raw['updatedAt']) ??
    asIsoTimestamp(raw['finishedAt']) ??
    asIsoTimestamp(raw['startedAt']) ??
    null;

  const candidate: Record<string, unknown> = {
    id,
    status,
    createdAt,
    updatedAt,
    pathId: asTrimmedString(raw['pathId']),
    pathName: asTrimmedString(raw['pathName']),
    triggerEvent: asTrimmedString(raw['triggerEvent']),
    triggerNodeId: asTrimmedString(raw['triggerNodeId']),
    startedAt: asIsoTimestamp(raw['startedAt']),
    finishedAt: asIsoTimestamp(raw['finishedAt']),
    errorMessage: asTrimmedString(raw['errorMessage']) ?? asTrimmedString(raw['error']),
    entityId: asTrimmedString(raw['entityId']),
    entityType: asTrimmedString(raw['entityType']),
    retryCount:
      typeof raw['retryCount'] === 'number' && Number.isFinite(raw['retryCount'])
        ? raw['retryCount']
        : null,
    maxAttempts:
      typeof raw['maxAttempts'] === 'number' && Number.isFinite(raw['maxAttempts'])
        ? raw['maxAttempts']
        : null,
    nextRetryAt: asIsoTimestamp(raw['nextRetryAt']),
    deadLetteredAt: asIsoTimestamp(raw['deadLetteredAt']),
    meta: raw['meta'],
    graph: raw['graph'],
    runtimeState: raw['runtimeState'],
    triggerContext: raw['triggerContext'],
  };

  const parsed = aiPathRunRecordSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
};

function isSameRunList(prev: AiPathRunRecord[], next: AiPathRunRecord[]): boolean {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;
  for (let index = 0; index < prev.length; index += 1) {
    const prevRun = prev[index];
    const nextRun = next[index];
    if (!prevRun || !nextRun) return false;
    if (prevRun === nextRun) continue;
    if (prevRun.id !== nextRun.id) return false;
    if (prevRun.status !== nextRun.status) return false;
    if (prevRun.updatedAt !== nextRun.updatedAt) return false;
    if (prevRun.startedAt !== nextRun.startedAt) return false;
    if (prevRun.finishedAt !== nextRun.finishedAt) return false;
  }
  return true;
}

function normalizeRunListResponse(response: Awaited<ReturnType<typeof listAiPathRuns>>): {
  ok: boolean;
  data: { runs: AiPathRunRecord[] };
} {
  if (!response.ok) {
    return {
      ok: false,
      data: { runs: [] },
    };
  }
  const runs = Array.isArray(response.data.runs)
    ? response.data.runs.flatMap((run): AiPathRunRecord[] => {
      const parsed = aiPathRunRecordSchema.safeParse(run);
      if (parsed.success) return [parsed.data];
      const coerced = coerceRunRecord(run);
      return coerced ? [coerced] : [];
    })
    : [];
  return {
    ok: true,
    data: { runs },
  };
}

export function useAiPathsRunHistory({ activePathId, toast }: UseAiPathsRunHistoryArgs): void {
  const runHistoryState = useRunHistoryState();
  const runHistoryActions = useRunHistoryActions();

  const runDetailOpen = runHistoryState.runDetailOpen;
  const runDetail = runHistoryState.runDetail;
  const runHistoryNodeId = runHistoryState.runHistoryNodeId;
  const runStreamPaused = runHistoryState.runStreamPaused;

  useEffect(() => {
    if (!runDetailOpen || !runDetail?.run?.id) {
      runHistoryActions.setRunStreamStatus('stopped');
      return;
    }
    if (runStreamPaused) {
      runHistoryActions.setRunStreamStatus('paused');
      return;
    }

    const runId = runDetail.run.id;
    const params = new URLSearchParams();
    const latestEventTimestamp = runDetail.events?.length
      ? runDetail.events.reduce<string | null>(
        (max: string | null, event: AiPathRunEventRecord) => {
          if (!event.createdAt) return max;
          const time = new Date(event.createdAt).getTime();
          if (!Number.isFinite(time)) return max;
          if (!max) return new Date(time).toISOString();
          return time > new Date(max).getTime() ? new Date(time).toISOString() : max;
        },
        null
      )
      : null;
    if (latestEventTimestamp) {
      params.set('since', latestEventTimestamp);
    }
    // Only reopen when the viewed run changes or streaming state toggles.
    // Reopening on every merged event causes client-side stream churn.
    const url = params.toString()
      ? `/api/ai-paths/runs/${encodeURIComponent(runId)}/stream?${params.toString()}`
      : `/api/ai-paths/runs/${encodeURIComponent(runId)}/stream`;
    const source = new EventSource(url);
    runHistoryActions.setRunStreamStatus('connecting');

    const stopStream = (): void => {
      source.removeEventListener('ready', handleReadyEvent);
      source.removeEventListener('run', handleRunEvent);
      source.removeEventListener('nodes', handleNodesEvent);
      source.removeEventListener('events', handleEventsEvent);
      source.removeEventListener('done', handleDoneEvent);
      source.removeEventListener('error', handleErrorEvent);
      source.close();
      runHistoryActions.setRunStreamStatus('stopped');
    };

    const handleReadyEvent = (): void => {
      runHistoryActions.setRunStreamStatus('live');
    };
    const handleRunEvent = (event: MessageEvent): void => {
      try {
        const payload = JSON.parse(event.data as string) as AiPathRunRecord;
        runHistoryActions.setRunDetail((prev) => (prev ? { ...prev, run: payload } : prev));
      } catch (error) {
        logClientError(error);
      
        // ignore parse errors
      }
    };
    const handleNodesEvent = (event: MessageEvent): void => {
      try {
        const payload = JSON.parse(event.data as string) as unknown;
        const nodes = normalizeRunNodes(payload);
        runHistoryActions.setRunDetail((prev) => (prev ? { ...prev, nodes } : prev));
      } catch (error) {
        logClientError(error);
      
        // ignore parse errors
      }
    };
    const handleEventsEvent = (event: MessageEvent): void => {
      try {
        const payload = JSON.parse(event.data as string) as
          | AiPathRunEventRecord[]
          | { events?: AiPathRunEventRecord[]; overflow?: boolean; limit?: number };
        if (Array.isArray(payload)) {
          runHistoryActions.mergeRunEvents(normalizeRunEvents(payload));
          runHistoryActions.setRunEventsOverflow(false);
          runHistoryActions.setRunEventsBatchLimit(null);
          return;
        }
        const events = normalizeRunEvents(payload.events);
        runHistoryActions.mergeRunEvents(events);
        if (typeof payload.limit === 'number') {
          runHistoryActions.setRunEventsBatchLimit(payload.limit);
        }
        if (payload.overflow) {
          runHistoryActions.setRunEventsOverflow(true);
        } else {
          runHistoryActions.setRunEventsOverflow(false);
        }
      } catch (error) {
        logClientError(error);
      
        // ignore parse errors
      }
    };
    const handleDoneEvent = (): void => {
      stopStream();
    };
    const handleErrorEvent = (): void => {
      runHistoryActions.setRunStreamStatus('stopped');
    };

    source.addEventListener('ready', handleReadyEvent);
    source.addEventListener('run', handleRunEvent);
    source.addEventListener('nodes', handleNodesEvent);
    source.addEventListener('events', handleEventsEvent);
    source.addEventListener('done', handleDoneEvent);
    source.addEventListener('error', handleErrorEvent);

    return (): void => {
      stopStream();
    };
  }, [runDetailOpen, runDetail?.run?.id, runStreamPaused, runHistoryActions]);

  useEffect(() => {
    runHistoryActions.setRunEventsOverflow(false);
    runHistoryActions.setRunEventsBatchLimit(null);
  }, [runDetail?.run?.id, runHistoryActions]);

  const runDetailHistory = (
    runDetail?.run?.runtimeState as { history?: Record<string, RuntimeHistoryEntry[]> } | undefined
  )?.history;
  const runDetailHistoryOptions = useMemo(
    () =>
      buildHistoryNodeOptions(
        runDetailHistory,
        runDetail?.nodes ?? null,
        runDetail?.run?.graph?.nodes ?? null
      ),
    [runDetailHistory, runDetail?.nodes, runDetail?.run?.graph?.nodes]
  );

  useEffect(() => {
    if (!runDetail?.run?.id) {
      runHistoryActions.setRunHistoryNodeId(null);
      return;
    }
    const firstHistoryOption = runDetailHistoryOptions.at(0);
    if (!firstHistoryOption) {
      runHistoryActions.setRunHistoryNodeId(null);
      return;
    }
    if (
      runHistoryNodeId &&
      runDetailHistoryOptions.some((option: HistoryNodeOption) => option.id === runHistoryNodeId)
    ) {
      return;
    }
    runHistoryActions.setRunHistoryNodeId(firstHistoryOption.id);
  }, [runDetail?.run?.id, runDetailHistoryOptions, runHistoryActions, runHistoryNodeId]);

  const runsQuery = createListQueryV2<
    { ok: boolean; data: { runs: AiPathRunRecord[] } },
    { ok: boolean; data: { runs: AiPathRunRecord[] } }
  >({
    queryKey: QUERY_KEYS.ai.aiPaths.runs({ pathId: activePathId }),
    queryFn: async ({ signal }) => {
      const res = await listAiPathRuns({
        ...(activePathId ? { pathId: activePathId } : {}),
        includeTotal: false,
        limit: 100,
        timeoutMs: 4000,
        ...(signal ? { signal } : {}),
      });
      return normalizeRunListResponse(res);
    },
    enabled: Boolean(activePathId),
    retry: 0,
    refetchInterval: (
      query: Query<
        { ok: boolean; data: { runs: AiPathRunRecord[] } },
        Error,
        { ok: boolean; data: { runs: AiPathRunRecord[] } },
        readonly unknown[]
      >
    ): number | false => {
      const d = query.state['data'] as
        | { ok: boolean; data: { runs: AiPathRunRecord[] } }
        | undefined;
      if (!d?.ok) return false;
      const runs: AiPathRunRecord[] = d.data?.runs ?? [];
      const hasActive: boolean = runs.some(
        (run: AiPathRunRecord): boolean =>
          run.status === 'queued' ||
          run.status === 'running' ||
          run.status === 'blocked_on_lease'
      );
      return hasActive ? 5000 : false;
    },
    transformError: (error: unknown): Error =>
      error instanceof Error ? error : new Error('Failed to load run history.'),
    meta: {
      source: 'ai.ai-paths.run-history.runs',
      operation: 'list',
      resource: 'ai-paths.runs',
      domain: 'global',
      tags: ['ai-paths', 'run-history'],
      description: 'Loads ai paths runs.'},
  });

  const runList = useMemo((): AiPathRunRecord[] => {
    if (!runsQuery.data?.ok) return [] as AiPathRunRecord[];
    return runsQuery.data.data.runs ?? [];
  }, [runsQuery.data]);
  const refetchRuns = runsQuery.refetch;

  useEffect(() => {
    runHistoryActions.setRunList((prev) => (isSameRunList(prev, runList) ? prev : runList));
  }, [runHistoryActions, runList]);

  useEffect(() => {
    runHistoryActions.setRunsRefreshing(runsQuery.isFetching);
  }, [runHistoryActions, runsQuery.isFetching]);

  const handleOpenRunDetail = useCallback(
    async (runId: string): Promise<void> => {
      runHistoryActions.setRunDetailOpen(true);
      runHistoryActions.setRunDetailLoading(true);
      try {
        const response = await getAiPathRun(runId);
        if (!response.ok) {
          throw new Error(response.error || 'Failed to load run details.');
        }
        const data = normalizeRunDetail(response.data);
        if (!data) {
          throw new Error('Run detail payload was invalid.');
        }
        runHistoryActions.setRunDetail(data);
      } catch (error) {
        logClientError(error);
        toast(error instanceof Error ? error.message : 'Failed to load run details.', {
          variant: 'error',
        });
        runHistoryActions.setRunDetail(null);
      } finally {
        runHistoryActions.setRunDetailLoading(false);
      }
    },
    [runHistoryActions, toast]
  );

  const handleResumeRun = useCallback(
    async (runId: string, mode: 'resume' | 'replay'): Promise<void> => {
      const response = await resumeAiPathRun(runId, mode);
      if (!response.ok) {
        toast(response.error || 'Failed to resume run.', { variant: 'error' });
        return;
      }
      toast(mode === 'resume' ? 'Run resumed.' : 'Run replay queued.', {
        variant: 'success',
      });
      void refetchRuns();
    },
    [refetchRuns, toast]
  );

  const handleHandoffRun = useCallback(
    async (runId: string, reason?: string): Promise<boolean> => {
      const response = await handoffAiPathRun(runId, reason ? { reason } : undefined);
      if (!response.ok) {
        toast(response.error || 'Failed to mark run handoff-ready.', { variant: 'error' });
        return false;
      }
      toast('Run marked handoff-ready.', { variant: 'success' });
      void refetchRuns();
      return true;
    },
    [refetchRuns, toast]
  );

  const handleCancelRun = useCallback(
    async (runId: string): Promise<void> => {
      const response = await cancelAiPathRun(runId);
      if (!response.ok) {
        toast(response.error || 'Failed to cancel run.', { variant: 'error' });
        return;
      }
      const payload = (response.data ?? {}) as { canceled?: boolean; message?: string };
      const wasCanceled = payload.canceled !== false;
      toast(
        payload.message || (wasCanceled ? 'Run canceled.' : 'Run already finished or removed.'),
        {
          variant: wasCanceled ? 'success' : 'info',
        }
      );
      void refetchRuns();
    },
    [refetchRuns, toast]
  );

  const handleRetryRunNode = useCallback(
    async (runId: string, nodeId: string): Promise<void> => {
      const response = await retryAiPathRunNode(runId, nodeId);
      if (!response.ok) {
        toast(response.error || 'Failed to queue node retry.', { variant: 'error' });
        return;
      }
      toast('Node retry queued.', { variant: 'success' });
      void refetchRuns();
    },
    [refetchRuns, toast]
  );

  const handleRequeueDeadLetter = useCallback(
    async (runId: string): Promise<void> => {
      const response = await resumeAiPathRun(runId, 'replay');
      if (!response.ok) {
        toast(response.error || 'Failed to requeue run.', { variant: 'error' });
        return;
      }
      toast('Dead-letter run requeued.', { variant: 'success' });
      void refetchRuns();
    },
    [refetchRuns, toast]
  );

  useEffect(() => {
    runHistoryActions.setOpenRunDetailHandler((runId: string): void => {
      void handleOpenRunDetail(runId);
    });
    return () => {
      runHistoryActions.setOpenRunDetailHandler(null);
    };
  }, [handleOpenRunDetail, runHistoryActions]);

  useEffect(() => {
    runHistoryActions.setRunOperationHandlers({
      refreshRuns: async (): Promise<void> => {
        await refetchRuns();
      },
      resumeRun: handleResumeRun,
      handoffRun: handleHandoffRun,
      retryRunNode: handleRetryRunNode,
      cancelRun: handleCancelRun,
      requeueDeadLetter: handleRequeueDeadLetter,
    });
    return () => {
      runHistoryActions.setRunOperationHandlers(null);
    };
  }, [
    handleCancelRun,
    handleHandoffRun,
    handleRequeueDeadLetter,
    handleResumeRun,
    handleRetryRunNode,
    refetchRuns,
    runHistoryActions,
  ]);
}
