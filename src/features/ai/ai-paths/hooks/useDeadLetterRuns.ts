'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';

import { runsApi } from '@/features/ai/ai-paths/lib';
import { logClientError } from '@/features/observability';
import { createListQueryV2, createMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type {
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
} from '@/shared/types/domain/ai-paths';
import { useToast } from '@/shared/ui';

import {
  SEARCH_DEBOUNCE_MS,
  getLatestEventTimestamp,
  showRequeueResultToast,
  type RunDetail,
} from '../pages/dead-letter-utils';

export interface UseDeadLetterRunsReturn {
  runs: AiPathRunRecord[];
  total: number;
  totalPages: number;
  page: number;
  setPage: (page: number | ((prev: number) => number)) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  pathId: string;
  setPathId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  requeueMode: 'resume' | 'replay';
  setRequeueMode: (mode: 'resume' | 'replay') => void;
  selectedIds: Set<string>;
  toggleSelected: (id: string) => void;
  toggleSelectVisible: () => void;
  clearSelection: () => void;
  detailOpen: boolean;
  setDetailOpen: (open: boolean) => void;
  detailLoading: boolean;
  detail: RunDetail;
  handleOpenDetail: (runId: string) => Promise<void>;
  requeueSelected: () => void;
  requeueAll: () => void;
  requeueingSelected: boolean;
  requeueingAll: boolean;
  retryFailedPending: boolean;
  showRetryFailedConfirm: boolean;
  setShowRetryFailedConfirm: (show: boolean) => void;
  handleRetryFailedNodes: () => Promise<void>;
  retryNode: (nodeId: string) => void;
  retryingNodeId: string | null | undefined;
  expandedNodeIds: Set<string>;
  toggleNodeExpanded: (nodeId: string) => void;
  streamStatus: 'connecting' | 'live' | 'stopped' | 'paused';
  streamPaused: boolean;
  setStreamPaused: (paused: boolean | ((prev: boolean) => boolean)) => void;
  eventsOverflow: boolean;
  eventsBatchLimit: number | null;
  loading: boolean;
  isFetching: boolean;
  refetch: () => void;
  handleRequeueSingle: (runId: string) => Promise<void>;
}

export function useDeadLetterRuns(): UseDeadLetterRunsReturn {
  const { toast } = useToast();
  const [pathId, setPathId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [requeueMode, setRequeueMode] = useState<'resume' | 'replay'>('resume');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<RunDetail>(null);
  const [retryFailedPending, setRetryFailedPending] = useState(false);
  const [showRetryFailedConfirm, setShowRetryFailedConfirm] = useState(false);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const [streamStatus, setStreamStatus] = useState<'connecting' | 'live' | 'stopped' | 'paused'>('stopped');
  const [streamPaused, setStreamPaused] = useState(false);
  const [eventsOverflow, setEventsOverflow] = useState(false);
  const [eventsBatchLimit, setEventsBatchLimit] = useState<number | null>(null);

  const normalizedPathId = pathId.trim();
  const normalizedQuery = debouncedSearchQuery.trim();
  const offset = (page - 1) * pageSize;

  const runsQuery = createListQueryV2<{ runs: AiPathRunRecord[]; total: number }, { runs: AiPathRunRecord[]; total: number }>({
    queryKey: QUERY_KEYS.ai.aiPaths.deadLetter({
      status: 'dead_lettered',
      pathId: normalizedPathId,
      query: normalizedQuery,
      page,
      pageSize,
    }),
    queryFn: async (): Promise<{ runs: AiPathRunRecord[]; total: number }> => {
      const response = await runsApi.list({
        status: 'dead_lettered',
        ...(normalizedPathId ? { pathId: normalizedPathId } : {}),
        ...(normalizedQuery ? { query: normalizedQuery } : {}),
        limit: pageSize,
        offset,
      });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to load dead-letter runs.');
      }
      return response.data as { runs: AiPathRunRecord[]; total: number };
    },
    meta: {
      source: 'ai.ai-paths.dead-letter.runs',
      operation: 'list',
      resource: 'ai-paths.dead-letter-runs',
      domain: 'global',
      tags: ['ai-paths', 'dead-letter'],
    },
  });

  const loading = runsQuery.isLoading;

  const total = runsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const runs = useMemo(() => runsQuery.data?.runs ?? [], [runsQuery.data?.runs]);

  useEffect((): (() => void) => {
    const timer: ReturnType<typeof setTimeout> = setTimeout((): void => {
      setDebouncedSearchQuery(searchQuery);
    }, SEARCH_DEBOUNCE_MS);
    return (): void => clearTimeout(timer);
  }, [searchQuery]);

  useEffect((): void => {
    setPage(1);
  }, [normalizedPathId, normalizedQuery, pageSize]);

  useEffect((): void => {
    setSelectedIds(new Set());
  }, [normalizedPathId, normalizedQuery]);

  useEffect((): void => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect((): void => {
    if (!runsQuery.error) return;
    logClientError(runsQuery.error, { context: { source: 'useDeadLetterRuns', action: 'loadRuns', pathId: normalizedPathId, query: normalizedQuery } });
    toast(
      runsQuery.error instanceof Error
        ? runsQuery.error.message
        : 'Failed to load dead-letter runs.',
      { variant: 'error' }
    );
  }, [runsQuery.error, toast, normalizedPathId, normalizedQuery]);

  useEffect((): void => {
    setExpandedNodeIds(new Set());
    setEventsOverflow(false);
    setEventsBatchLimit(null);
  }, [detail?.run?.id]);

  useEffect((): void | (() => void) => {
    if (!detailOpen || !detail?.run?.id) {
      setStreamStatus('stopped');
      return;
    }
    if (streamPaused) {
      setStreamStatus('paused');
      return;
    }

    const runId = detail.run.id;
    const params = new URLSearchParams();
    const latestEventTimestamp = getLatestEventTimestamp(detail.events);
    if (latestEventTimestamp) {
      params.set('since', latestEventTimestamp);
    }
    const url = params.toString()
      ? `/api/ai-paths/runs/${encodeURIComponent(runId)}/stream?${params.toString()}`
      : `/api/ai-paths/runs/${encodeURIComponent(runId)}/stream`;
    const source = new EventSource(url);
    setStreamStatus('connecting');

    const mergeEvents = (incoming: AiPathRunEventRecord[]): void => {
      setDetail((prev: RunDetail): RunDetail => {
        if (!prev) return prev;
        const existingIds = new Set(prev.events.map((event: AiPathRunEventRecord) => event.id));
        const merged = [...prev.events];
        incoming.forEach((event: AiPathRunEventRecord) => {
          if (!existingIds.has(event.id)) {
            merged.push(event);
          }
        });
        merged.sort((a: AiPathRunEventRecord, b: AiPathRunEventRecord) => {
          const aTime = new Date(a.createdAt || 0).getTime();
          const bTime = new Date(b.createdAt || 0).getTime();
          return aTime - bTime;
        });
        return { ...prev, events: merged };
      });
    };

    source.addEventListener('ready', (): void => {
      setStreamStatus('live');
    });
    source.addEventListener('run', (event: MessageEvent): void => {
      try {
        const payload = JSON.parse(event.data as string) as AiPathRunRecord;
        setDetail((prev: RunDetail): RunDetail => (prev ? { ...prev, run: payload } : prev));
      } catch {
        // ignore parse errors
      }
    });
    source.addEventListener('nodes', (event: MessageEvent): void => {
      try {
        const payload = JSON.parse(event.data as string) as AiPathRunNodeRecord[];
        setDetail((prev: RunDetail): RunDetail => (prev ? { ...prev, nodes: payload } : prev));
      } catch {
        // ignore parse errors
      }
    });
    source.addEventListener('events', (event: MessageEvent): void => {
      try {
        const payload = JSON.parse(event.data as string) as
          | AiPathRunEventRecord[]
          | { events?: AiPathRunEventRecord[]; overflow?: boolean; limit?: number };
        if (Array.isArray(payload)) {
          mergeEvents(payload);
          setEventsOverflow(false);
          setEventsBatchLimit(null);
          return;
        }
        const events = Array.isArray(payload.events) ? payload.events : [];
        mergeEvents(events);
        if (typeof payload.limit === 'number') {
          setEventsBatchLimit(payload.limit);
        }
        if (payload.overflow) {
          setEventsOverflow(true);
        } else {
          setEventsOverflow(false);
        }
      } catch {
        // ignore parse errors
      }
    });
    source.addEventListener('done', (): void => {
      setStreamStatus('stopped');
      source.close();
    });
    source.addEventListener('error', (): void => {
      setStreamStatus('stopped');
    });

    return (): void => {
      source.close();
      setStreamStatus('stopped');
    };
  }, [detailOpen, detail?.run?.id, streamPaused, detail?.events]);

  const toggleSelected = useCallback((runId: string): void => {
    setSelectedIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else {
        next.add(runId);
      }
      return next;
    });
  }, []);

  const toggleSelectVisible = useCallback((): void => {
    setSelectedIds((prev: Set<string>) => {
      const next = new Set(prev);
      const visibleSelectedCount = runs.filter((run) => prev.has(run.id)).length;
      const allVisibleSelected = runs.length > 0 && visibleSelectedCount === runs.length;
      
      if (allVisibleSelected) {
        runs.forEach((run) => next.delete(run.id));
      } else {
        runs.forEach((run) => next.add(run.id));
      }
      return next;
    });
  }, [runs]);

  const clearSelection = useCallback((): void => setSelectedIds(new Set()), []);

  const requeueSelectedMutation = createMutationV2<
    { requeued: number; errors?: Array<{ runId: string; error: string }> },
    void
  >({
    mutationKey: QUERY_KEYS.ai.aiPaths.mutation('dead-letter.requeue-selected'),
    mutationFn: async (): Promise<{ requeued: number; errors?: Array<{ runId: string; error: string }> }> => {
      const response = await runsApi.requeueDeadLetter({
        runIds: Array.from(selectedIds),
        mode: requeueMode,
      });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to requeue selected runs.');
      }
      return response.data as { requeued: number; errors?: Array<{ runId: string; error: string }> };
    },
    meta: {
      source: 'ai.ai-paths.dead-letter.requeue-selected',
      operation: 'action',
      resource: 'ai-paths.dead-letter-requeue',
      domain: 'global',
      tags: ['ai-paths', 'dead-letter', 'requeue'],
    },
    onSuccess: (data: { requeued: number; errors?: Array<{ runId: string; error: string }> }): void => {
      showRequeueResultToast(toast, requeueMode, data);
      clearSelection();
      void runsQuery.refetch();
    },
    onError: (error: Error): void => {
      logClientError(error, { context: { source: 'useDeadLetterRuns', action: 'requeueSelected', count: selectedIds.size, mode: requeueMode } });
      toast(error instanceof Error ? error.message : 'Failed to requeue runs.', {
        variant: 'error',
      });
    },
  });

  const requeueAllMutation = createMutationV2<
    { requeued: number; errors?: Array<{ runId: string; error: string }> },
    void
  >({
    mutationKey: QUERY_KEYS.ai.aiPaths.mutation('dead-letter.requeue-all'),
    mutationFn: async (): Promise<{ requeued: number; errors?: Array<{ runId: string; error: string }> }> => {
      const response = await runsApi.requeueDeadLetter({
        pathId: normalizedPathId || null,
        query: normalizedQuery || null,
        mode: requeueMode,
      });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to requeue dead-letter runs.');
      }
      return response.data as { requeued: number; errors?: Array<{ runId: string; error: string }> };
    },
    meta: {
      source: 'ai.ai-paths.dead-letter.requeue-all',
      operation: 'action',
      resource: 'ai-paths.dead-letter-requeue',
      domain: 'global',
      tags: ['ai-paths', 'dead-letter', 'requeue'],
    },
    onSuccess: (data: { requeued: number; errors?: Array<{ runId: string; error: string }> }): void => {
      showRequeueResultToast(toast, requeueMode, data);
      clearSelection();
      void runsQuery.refetch();
    },
    onError: (error: Error): void => {
      logClientError(error, { context: { source: 'useDeadLetterRuns', action: 'requeueAll', pathId: normalizedPathId, query: normalizedQuery, mode: requeueMode } });
      toast(error instanceof Error ? error.message : 'Failed to requeue runs.', {
        variant: 'error',
      });
    },
  });

  const handleOpenDetail = useCallback(async (runId: string): Promise<void> => {
    setDetailOpen(true);
    setDetailLoading(true);
    setStreamPaused(false);
    try {
      const response = await runsApi.get(runId);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to load run details.');
      }
      setDetail(
        response.data as {
          run: AiPathRunRecord;
          nodes: AiPathRunNodeRecord[];
          events: AiPathRunEventRecord[];
        }
      );
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'useDeadLetterRuns', action: 'loadDetail', runId } });
      toast(error instanceof Error ? error.message : 'Failed to load run details.', {
        variant: 'error',
      });
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, [toast]);

  const toggleNodeExpanded = useCallback((nodeId: string): void => {
    setExpandedNodeIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleRequeueSingle = useCallback(async (runId: string): Promise<void> => {
    const response = await runsApi.resume(runId, requeueMode);
    if (!response.ok) {
      toast(response.error || 'Failed to requeue run.', { variant: 'error' });
      return;
    }
    toast(`Run requeued (${requeueMode === 'resume' ? 'resume' : 'replay'}).`, {
      variant: 'success',
    });
    void runsQuery.refetch();
  }, [requeueMode, runsQuery, toast]);

  const retryNodeMutation = createMutationV2<
    { run: unknown },
    { runId: string; nodeId: string }
  >({
    mutationKey: QUERY_KEYS.ai.aiPaths.mutation('dead-letter.retry-node'),
    mutationFn: async ({ runId, nodeId }: { runId: string; nodeId: string }): Promise<{ run: unknown }> => {
      const response = await runsApi.retryNode(runId, nodeId);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to retry node.');
      }
      return response.data as { run: unknown };
    },
    meta: {
      source: 'ai.ai-paths.dead-letter.retry-node',
      operation: 'action',
      resource: 'ai-paths.dead-letter-node-retry',
      domain: 'global',
      tags: ['ai-paths', 'dead-letter', 'retry'],
    },
    onSuccess: (_data: { run: unknown }, variables: { runId: string; nodeId: string }): void => {
      toast(`Node ${variables.nodeId} retry queued.`, { variant: 'success' });
      void runsQuery.refetch();
      if (detail?.run?.id) {
        void handleOpenDetail(detail.run.id);
      }
    },
    onError: (error: Error, variables: { runId: string; nodeId: string }): void => {
      logClientError(error, { context: { source: 'useDeadLetterRuns', action: 'retryNode', runId: variables.runId, nodeId: variables.nodeId } });
      toast(error instanceof Error ? error.message : 'Failed to retry node.', {
        variant: 'error',
      });
    },
  });

  const handleRetryFailedNodes = async (): Promise<void> => {
    if (!detail || retryFailedPending) return;
    const retryableNodes = detail.nodes.filter(
      (node: AiPathRunNodeRecord) => node.status === 'failed' || node.status === 'blocked'
    );
    if (retryableNodes.length === 0) {
      toast('No failed or blocked nodes to retry.', { variant: 'info' });
      return;
    }
    setRetryFailedPending(true);
    try {
      const results = await Promise.all(
        retryableNodes.map((node: AiPathRunNodeRecord) => runsApi.retryNode(detail.run.id, node.nodeId))
      );
      const failed = results.filter((result: { ok: boolean }) => !result.ok);
      const successCount = results.length - failed.length;
      if (successCount > 0) {
        toast(`Queued ${successCount} node(s) for retry.`, { variant: 'success' });
      }
      if (failed.length > 0) {
        toast(`${failed.length} node(s) failed to retry.`, { variant: 'error' });
      }
      if (successCount > 0) {
        void runsQuery.refetch();
        void handleOpenDetail(detail.run.id);
      }
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'useDeadLetterRuns', action: 'retryFailedNodes', runId: detail.run.id } });
      toast(error instanceof Error ? error.message : 'Failed to retry nodes.', {
        variant: 'error',
      });
    } finally {
      setRetryFailedPending(false);
      setShowRetryFailedConfirm(false);
    }
  };

  return {
    runs,
    total,
    totalPages,
    page,
    setPage,
    pageSize,
    setPageSize,
    pathId,
    setPathId,
    searchQuery,
    setSearchQuery,
    requeueMode,
    setRequeueMode,
    selectedIds,
    toggleSelected,
    toggleSelectVisible,
    clearSelection,
    detailOpen,
    setDetailOpen,
    detailLoading,
    detail,
    handleOpenDetail,
    requeueSelected: () => void requeueSelectedMutation.mutateAsync(),
    requeueAll: () => void requeueAllMutation.mutateAsync(),
    requeueingSelected: requeueSelectedMutation.isPending,
    requeueingAll: requeueAllMutation.isPending,
    retryFailedPending,
    showRetryFailedConfirm,
    setShowRetryFailedConfirm,
    handleRetryFailedNodes,
    retryNode: (nodeId: string) => detail?.run?.id && retryNodeMutation.mutate({ runId: detail.run.id, nodeId }),
    retryingNodeId: retryNodeMutation.isPending ? retryNodeMutation.variables?.nodeId : null,
    expandedNodeIds,
    toggleNodeExpanded,
    streamStatus,
    streamPaused,
    setStreamPaused,
    eventsOverflow,
    eventsBatchLimit,
    loading,
    isFetching: runsQuery.isFetching,
    refetch: () => void runsQuery.refetch(),
    handleRequeueSingle,
  };
}
