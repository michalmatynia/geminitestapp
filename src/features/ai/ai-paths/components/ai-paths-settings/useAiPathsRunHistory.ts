'use client';

import { type Query } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';

import {
  cancelAiPathRun,
  getAiPathRun,
  listAiPathRuns,
  aiPathRunRecordSchema,
  resumeAiPathRun,
  type AiPathRunEventRecord,
  type AiPathRunNodeRecord,
  type AiPathRunRecord,
  type RuntimeHistoryEntry,
} from '@/shared/lib/ai-paths';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import {
  useRunHistoryActions,
  useRunHistoryState,
} from '@/features/ai/ai-paths/context/RunHistoryContext';

import { buildHistoryNodeOptions, type HistoryNodeOption } from '../run-history-utils';

type ToastFn = (
  message: string,
  options?: { variant?: 'success' | 'error' | 'info' | 'warning' }
) => void;

type UseAiPathsRunHistoryArgs = {
  activePathId: string | null;
  toast: ToastFn;
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
      return parsed.success ? [parsed.data] : [];
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
    const url = params.toString()
      ? `/api/ai-paths/runs/${encodeURIComponent(runId)}/stream?${params.toString()}`
      : `/api/ai-paths/runs/${encodeURIComponent(runId)}/stream`;
    const source = new EventSource(url);
    runHistoryActions.setRunStreamStatus('connecting');

    source.addEventListener('ready', () => {
      runHistoryActions.setRunStreamStatus('live');
    });
    source.addEventListener('run', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data as string) as AiPathRunRecord;
        runHistoryActions.setRunDetail(
          (
            prev: {
              run: AiPathRunRecord;
              nodes: AiPathRunNodeRecord[];
              events: AiPathRunEventRecord[];
            } | null
          ) => (prev ? { ...prev, run: payload } : prev)
        );
      } catch {
        // ignore parse errors
      }
    });
    source.addEventListener('nodes', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data as string) as AiPathRunNodeRecord[];
        runHistoryActions.setRunDetail(
          (
            prev: {
              run: AiPathRunRecord;
              nodes: AiPathRunNodeRecord[];
              events: AiPathRunEventRecord[];
            } | null
          ) => (prev ? { ...prev, nodes: payload } : prev)
        );
      } catch {
        // ignore parse errors
      }
    });
    source.addEventListener('events', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data as string) as
          | AiPathRunEventRecord[]
          | { events?: AiPathRunEventRecord[]; overflow?: boolean; limit?: number };
        if (Array.isArray(payload)) {
          runHistoryActions.mergeRunEvents(payload);
          runHistoryActions.setRunEventsOverflow(false);
          runHistoryActions.setRunEventsBatchLimit(null);
          return;
        }
        const events = Array.isArray(payload.events) ? payload.events : [];
        runHistoryActions.mergeRunEvents(events);
        if (typeof payload.limit === 'number') {
          runHistoryActions.setRunEventsBatchLimit(payload.limit);
        }
        if (payload.overflow) {
          runHistoryActions.setRunEventsOverflow(true);
        } else {
          runHistoryActions.setRunEventsOverflow(false);
        }
      } catch {
        // ignore parse errors
      }
    });
    source.addEventListener('done', () => {
      runHistoryActions.setRunStreamStatus('stopped');
      source.close();
    });
    source.addEventListener('error', () => {
      runHistoryActions.setRunStreamStatus('stopped');
    });

    return (): void => {
      source.close();
      runHistoryActions.setRunStreamStatus('stopped');
    };
  }, [runDetailOpen, runDetail?.run?.id, runStreamPaused, runDetail?.events, runHistoryActions]);

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
        (run: AiPathRunRecord): boolean => run.status === 'queued' || run.status === 'running'
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
    },
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
        const data = response.data as {
          run: AiPathRunRecord;
          nodes: AiPathRunNodeRecord[];
          events: AiPathRunEventRecord[];
        };
        runHistoryActions.setRunDetail(data);
      } catch (error) {
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
      cancelRun: handleCancelRun,
      requeueDeadLetter: handleRequeueDeadLetter,
    });
    return () => {
      runHistoryActions.setRunOperationHandlers(null);
    };
  }, [handleCancelRun, handleRequeueDeadLetter, handleResumeRun, refetchRuns, runHistoryActions]);
}
