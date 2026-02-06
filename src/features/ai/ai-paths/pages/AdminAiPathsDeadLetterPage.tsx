'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Fragment, useEffect, useMemo, useState } from 'react';

import { runsApi } from '@/features/ai/ai-paths/lib';
import type {
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
} from '@/shared/types/ai-paths';
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  UnifiedSelect,
  SectionHeader,
  SectionPanel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
  ConfirmDialog,
} from '@/shared/ui';

const PAGE_SIZES = [10, 25, 50];
const SEARCH_DEBOUNCE_MS = 300;

type RunDetail = {
  run: AiPathRunRecord;
  nodes: AiPathRunNodeRecord[];
  events: AiPathRunEventRecord[];
} | null;

export function AdminAiPathsDeadLetterPage(): React.JSX.Element {
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

  const runsQuery = useQuery<{ runs: AiPathRunRecord[]; total: number }>({
    queryKey: ['ai-paths-dead-letter', normalizedPathId, normalizedQuery, page, pageSize],
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
  });

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
    toast(
      runsQuery.error instanceof Error
        ? runsQuery.error.message
        : 'Failed to load dead-letter runs.',
      { variant: 'error' }
    );
  }, [runsQuery.error, toast]);

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
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
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

  const selectedCount = selectedIds.size;
  const visibleSelectedCount = useMemo(
    () => runs.filter((run: AiPathRunRecord) => selectedIds.has(run.id)).length,
    [runs, selectedIds]
  );
  const allVisibleSelected = runs.length > 0 && visibleSelectedCount === runs.length;
  const headerCheckboxState =
    runs.length === 0
      ? false
      : allVisibleSelected
        ? true
        : visibleSelectedCount > 0
          ? 'indeterminate'
          : false;

  const toggleSelected = (runId: string): void => {
    setSelectedIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else {
        next.add(runId);
      }
      return next;
    });
  };

  const toggleSelectVisible = (): void => {
    setSelectedIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        runs.forEach((run: AiPathRunRecord) => next.delete(run.id));
      } else {
        runs.forEach((run: AiPathRunRecord) => next.add(run.id));
      }
      return next;
    });
  };

  const clearSelection = (): void => setSelectedIds(new Set());
  const hasFilters = normalizedPathId.length > 0 || searchQuery.trim().length > 0;
  const clearFilters = (): void => {
    setPathId('');
    setSearchQuery('');
    setDebouncedSearchQuery('');
  };

  const handleRequeueResult = (data: {
    requeued: number;
    errors?: Array<{ runId: string; error: string }>;
  }): void => {
    const modeLabel = requeueMode === 'resume' ? 'resume' : 'replay';
    toast(`Requeued ${data.requeued} run(s) (${modeLabel}).`, { variant: 'success' });
    const errorCount = data.errors?.length ?? 0;
    if (errorCount > 0) {
      toast(`${errorCount} run(s) failed to requeue.`, { variant: 'error' });
    }
  };

  const requeueSelectedMutation = useMutation<
    { requeued: number; errors?: Array<{ runId: string; error: string }> },
    Error
  >({
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
    onSuccess: (data: { requeued: number; errors?: Array<{ runId: string; error: string }> }): void => {
      handleRequeueResult(data);
      clearSelection();
      void runsQuery.refetch();
    },
    onError: (error: Error): void => {
      toast(error instanceof Error ? error.message : 'Failed to requeue runs.', {
        variant: 'error',
      });
    },
  });

  const requeueAllMutation = useMutation<
    { requeued: number; errors?: Array<{ runId: string; error: string }> },
    Error
  >({
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
    onSuccess: (data: { requeued: number; errors?: Array<{ runId: string; error: string }> }): void => {
      handleRequeueResult(data);
      clearSelection();
      void runsQuery.refetch();
    },
    onError: (error: Error): void => {
      toast(error instanceof Error ? error.message : 'Failed to requeue runs.', {
        variant: 'error',
      });
    },
  });

  const handleOpenDetail = async (runId: string): Promise<void> => {
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
      toast(error instanceof Error ? error.message : 'Failed to load run details.', {
        variant: 'error',
      });
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const paginationLabel = useMemo((): string => {
    if (total === 0) return '0 results';
    const start = offset + 1;
    const end = Math.min(offset + pageSize, total);
    return `${start}-${end} of ${total}`;
  }, [offset, pageSize, total]);

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

  const toggleNodeExpanded = (nodeId: string): void => {
    setExpandedNodeIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const formatTimestamp = (value?: Date | string | null): string => {
    if (!value) return '-';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
  };

  const nodeStatusSummary = useMemo((): { counts: Record<string, number>; totalNodes: number; completed: number; progress: number } | null => {
    if (!detail) return null;
    const counts: Record<string, number> = {};
    detail.nodes.forEach((node: AiPathRunNodeRecord) => {
      counts[node.status] = (counts[node.status] ?? 0) + 1;
    });
    const totalNodes = detail.nodes.length;
    const completed = counts.completed ?? 0;
    const progress = totalNodes > 0 ? Math.round((completed / totalNodes) * 100) : 0;
    return { counts, totalNodes, completed, progress };
  }, [detail]);

  const handleRequeueSingle = async (runId: string): Promise<void> => {
    const response = await runsApi.resume(runId, requeueMode);
    if (!response.ok) {
      toast(response.error || 'Failed to requeue run.', { variant: 'error' });
      return;
    }
    toast(`Run requeued (${requeueMode === 'resume' ? 'resume' : 'replay'}).`, {
      variant: 'success',
    });
    void runsQuery.refetch();
  };

  const retryNodeMutation = useMutation<
    { run: unknown },
    Error,
    { runId: string; nodeId: string }
  >({
    mutationFn: async ({ runId, nodeId }: { runId: string; nodeId: string }): Promise<{ run: unknown }> => {
      const response = await runsApi.retryNode(runId, nodeId);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to retry node.');
      }
      return response.data as { run: unknown };
    },
    onSuccess: (_data: { run: unknown }, variables: { runId: string; nodeId: string }): void => {
      toast(`Node ${variables.nodeId} retry queued.`, { variant: 'success' });
      void runsQuery.refetch();
      if (detail?.run?.id) {
        void handleOpenDetail(detail.run.id);
      }
    },
    onError: (error: Error): void => {
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
      toast(error instanceof Error ? error.message : 'Failed to retry nodes.', {
        variant: 'error',
      });
    } finally {
      setRetryFailedPending(false);
      setShowRetryFailedConfirm(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <SectionHeader
        title="Dead Letter Queue"
        description="Runs that exceeded retry limits or failed permanently."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={pathId}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPathId(event.target.value)}
              placeholder="Filter by path ID"
              className="h-9 w-[220px] border-border bg-card/70 text-sm text-white"
            />
            <Input
              value={searchQuery}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(event.target.value)}
              placeholder="Search run/entity/error"
              className="h-9 w-[240px] border-border bg-card/70 text-sm text-white"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              disabled={!hasFilters}
            >
              Clear filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { void runsQuery.refetch(); }}
              disabled={runsQuery.isFetching}
            >
              {runsQuery.isFetching ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        }
      />

      <SectionPanel className="mt-6 space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400">
          <div className="flex flex-wrap items-center gap-3">
            <span>{paginationLabel}</span>
            <span>Selected: {selectedCount}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectVisible}
              disabled={runs.length === 0}
            >
              {allVisibleSelected ? 'Unselect visible' : 'Select visible'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              disabled={selectedCount === 0}
            >
              Clear selection
            </Button>
            <UnifiedSelect
              value={requeueMode}
              onValueChange={(value: string) => setRequeueMode(value as 'resume' | 'replay')}
              options={[
                { value: 'resume', label: 'Resume (continue)' },
                { value: 'replay', label: 'Replay (from start)' },
              ]}
              placeholder="Requeue mode"
              triggerClassName="h-8 w-[160px] border-border bg-card/70 text-xs text-white"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => { void requeueSelectedMutation.mutateAsync(); }}
              disabled={selectedCount === 0 || requeueSelectedMutation.isPending}
            >
              {requeueSelectedMutation.isPending ? 'Requeueing...' : 'Requeue selected'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { void requeueAllMutation.mutateAsync(); }}
              disabled={requeueAllMutation.isPending || total === 0}
            >
              {requeueAllMutation.isPending ? 'Requeueing...' : 'Requeue all filtered'}
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-border/70 bg-card/60">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60">
                <TableHead className="w-8">
                  <Checkbox
                    checked={headerCheckboxState}
                    onCheckedChange={toggleSelectVisible}
                    aria-label="Select visible runs"
                  />
                </TableHead>
                <TableHead className="text-xs text-gray-400">Run</TableHead>
                <TableHead className="text-xs text-gray-400">Path</TableHead>
                <TableHead className="text-xs text-gray-400">Retries</TableHead>
                <TableHead className="text-xs text-gray-400">Dead Lettered</TableHead>
                <TableHead className="text-xs text-gray-400">Error</TableHead>
                <TableHead className="text-xs text-gray-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run: AiPathRunRecord) => (
                <TableRow key={run.id} className="border-border/50">
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(run.id)}
                      onCheckedChange={() => toggleSelected(run.id)}
                      aria-label={`Select run ${run.id}`}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-gray-200">
                    <div className="font-mono text-[11px]">{run.id}</div>
                    {run.entityId ? (
                      <div className="mt-1 text-[10px] text-gray-500">
                        Entity: {run.entityId}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-xs text-gray-300">
                    <div>{run.pathName || 'Untitled'}</div>
                    <div className="text-[10px] text-gray-500">{run.pathId}</div>
                  </TableCell>
                  <TableCell className="text-xs text-gray-300">
                    {run.retryCount ?? 0}/{run.maxAttempts ?? 0}
                  </TableCell>
                  <TableCell className="text-xs text-gray-300">
                    {run.deadLetteredAt
                      ? new Date(run.deadLetteredAt).toLocaleString()
                      : run.updatedAt
                        ? new Date(run.updatedAt).toLocaleString()
                        : '-'}
                  </TableCell>
                  <TableCell className="text-[11px] text-gray-500">
                    {run.errorMessage || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { void handleOpenDetail(run.id); }}
                      >
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { void handleRequeueSingle(run.id); }}
                      >
                        Requeue
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!runsQuery.isFetching && runs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-28 text-center text-sm text-gray-400">
                    No dead-letter runs found.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400">
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            {PAGE_SIZES.map((size: number) => (
              <Button
                key={size}
                variant={size === pageSize ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setPageSize(size)}
              >
                {size}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev: number) => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev: number) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </SectionPanel>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl border border-border bg-card text-white">
          <DialogHeader>
            <DialogTitle>Run Details</DialogTitle>
            <DialogDescription className="text-gray-400">Inspect the run state, node statuses, and events.</DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="text-sm text-gray-400">Loading run details...</div>
          ) : detail ? (
            <div className="space-y-6">
              <div className="rounded-md border border-border/70 bg-black/20 p-4 text-xs text-gray-300">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
                  <span>Run summary</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-gray-500">
                      Stream:{' '}
                      {streamStatus === 'live'
                        ? 'live'
                        : streamStatus === 'connecting'
                          ? 'connecting'
                          : streamStatus === 'paused'
                            ? 'paused'
                            : 'stopped'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStreamPaused((prev: boolean) => !prev)}
                    >
                      {streamPaused ? 'Resume stream' : 'Pause stream'}
                    </Button>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div>
                    <div className="text-[11px] text-gray-500">Run ID</div>
                    <div className="mt-1 font-mono text-[11px] text-gray-200">{detail.run.id}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500">Status</div>
                    <div className="mt-1 text-xs text-gray-200">{detail.run.status}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500">Path</div>
                    <div className="mt-1 text-xs text-gray-200">{detail.run.pathName || 'Untitled'}</div>
                    <div className="text-[10px] text-gray-500">{detail.run.pathId}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500">Entity</div>
                    <div className="mt-1 text-xs text-gray-200">{detail.run.entityId || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500">Retries</div>
                    <div className="mt-1 text-xs text-gray-200">
                      {(detail.run.retryCount ?? 0)}/{detail.run.maxAttempts ?? 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500">Dead-lettered</div>
                    <div className="mt-1 text-xs text-gray-200">
                      {formatTimestamp(detail.run.deadLetteredAt ?? detail.run.updatedAt)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500">Started</div>
                    <div className="mt-1 text-xs text-gray-200">
                      {formatTimestamp(detail.run.startedAt)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500">Finished</div>
                    <div className="mt-1 text-xs text-gray-200">
                      {formatTimestamp(detail.run.finishedAt)}
                    </div>
                  </div>
                  <div className="md:col-span-3">
                    <div className="text-[11px] text-gray-500">Error</div>
                    <div className="mt-1 text-xs text-gray-200">
                      {detail.run.errorMessage || '-'}
                    </div>
                  </div>
                  {nodeStatusSummary ? (
                    <div className="md:col-span-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
                        <span>
                          Nodes: {nodeStatusSummary.completed}/{nodeStatusSummary.totalNodes} completed
                        </span>
                        <span>{nodeStatusSummary.progress}%</span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/40">
                        <div
                          className="h-full rounded-full bg-emerald-400/70 transition-all"
                          style={{ width: `${nodeStatusSummary.progress}%` }}
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500">
                        {Object.entries(nodeStatusSummary.counts).map(([status, count]: [string, number]) => (
                          <span key={status}>
                            {status}: {count}
                          </span>
                        ))}
                      </div>
                      
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-md border border-border/70 bg-card/60">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 text-xs text-gray-400">
                  <span>Nodes</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500">{detail.nodes.length} total</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const hasAnyExpanded = detail.nodes.some((node: AiPathRunNodeRecord) =>
                          expandedNodeIds.has(node.nodeId)
                        );
                        if (hasAnyExpanded) {
                          setExpandedNodeIds(new Set());
                          return;
                        }
                        const next = new Set<string>();
                        detail.nodes.forEach((node: AiPathRunNodeRecord) => {
                          if (node.inputs || node.outputs) {
                            next.add(node.nodeId);
                          }
                        });
                        setExpandedNodeIds(next);
                      }}
                      disabled={detail.nodes.every((node: AiPathRunNodeRecord) => !node.inputs && !node.outputs)}
                    >
                      {detail.nodes.some((node: AiPathRunNodeRecord) => expandedNodeIds.has(node.nodeId))
                        ? 'Collapse all'
                        : 'Expand all'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRetryFailedConfirm(true)}
                      disabled={
                        retryFailedPending ||
                                              detail.nodes.every(
                                                (node: AiPathRunNodeRecord) => node.status !== 'failed' && node.status !== 'blocked'
                                              )
                      }
                    >
                    
                      {retryFailedPending ? 'Retrying...' : 'Retry failed only'}
                    </Button>
                  </div>
                </div>
                <div className="mt-3 overflow-hidden rounded-md border-t border-border/60">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/60">
                        <TableHead className="text-xs text-gray-400">Node</TableHead>
                        <TableHead className="text-xs text-gray-400">Type</TableHead>
                        <TableHead className="text-xs text-gray-400">Status</TableHead>
                        <TableHead className="text-xs text-gray-400">Attempt</TableHead>
                        <TableHead className="text-xs text-gray-400">Error</TableHead>
                        <TableHead className="text-xs text-gray-400">Data</TableHead>
                        <TableHead className="text-xs text-gray-400 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.nodes.map((node: AiPathRunNodeRecord) => {
                        const isRetryable = node.status === 'failed' || node.status === 'blocked';
                        const isRetrying =
                          retryNodeMutation.isPending &&
                          retryNodeMutation.variables?.nodeId === node.nodeId &&
                          retryNodeMutation.variables?.runId === detail.run.id;
                        const hasData = Boolean(node.inputs) || Boolean(node.outputs);
                        const isExpanded = expandedNodeIds.has(node.nodeId);
                        return (
                          <Fragment key={node.id}>
                            <TableRow className="border-border/50">
                              <TableCell className="text-xs text-gray-200">
                                <div className="font-mono text-[11px]">{node.nodeId}</div>
                                {node.nodeTitle ? (
                                  <div className="mt-1 text-[10px] text-gray-500">
                                    {node.nodeTitle}
                                  </div>
                                ) : null}
                              </TableCell>
                              <TableCell className="text-xs text-gray-300">{node.nodeType}</TableCell>
                              <TableCell className="text-xs text-gray-300">{node.status}</TableCell>
                              <TableCell className="text-xs text-gray-300">{node.attempt ?? 0}</TableCell>
                              <TableCell className="text-[11px] text-gray-500">
                                {node.errorMessage || '-'}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleNodeExpanded(node.nodeId)}
                                  disabled={!hasData}
                                >
                                  {hasData ? (isExpanded ? 'Hide' : 'Show') : 'No data'}
                                </Button>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    retryNodeMutation.mutate({
                                      runId: detail.run.id,
                                      nodeId: node.nodeId,
                                    })
                                  }
                                  disabled={!isRetryable || retryNodeMutation.isPending}
                                >
                                  {isRetrying ? 'Retrying...' : 'Retry node'}
                                </Button>
                              </TableCell>
                            </TableRow>
                            {isExpanded ? (
                              <TableRow className="border-border/40 bg-black/20">
                                <TableCell colSpan={7} className="px-4 pb-4 pt-2">
                                  <div className="mb-4 grid gap-4 md:grid-cols-4">
                                    <div>
                                      <div className="text-[11px] text-gray-500">Started</div>
                                      <div className="mt-1 text-xs text-gray-200">
                                        {formatTimestamp(node.startedAt)}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-[11px] text-gray-500">Finished</div>
                                      <div className="mt-1 text-xs text-gray-200">
                                        {formatTimestamp(node.finishedAt)}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-[11px] text-gray-500">Updated</div>
                                      <div className="mt-1 text-xs text-gray-200">
                                        {formatTimestamp(node.updatedAt)}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-[11px] text-gray-500">Created</div>
                                      <div className="mt-1 text-xs text-gray-200">
                                        {formatTimestamp(node.createdAt)}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                      <div className="text-[11px] text-gray-500">Inputs</div>
                                      <pre className="mt-2 max-h-32 overflow-auto rounded bg-black/40 p-2 text-[10px] text-gray-200 whitespace-pre-wrap">
                                        {node.inputs ? JSON.stringify(node.inputs, null, 2) : 'No inputs'}
                                      </pre>
                                    </div>
                                    <div>
                                      <div className="text-[11px] text-gray-500">Outputs</div>
                                      <pre className="mt-2 max-h-32 overflow-auto rounded bg-black/40 p-2 text-[10px] text-gray-200 whitespace-pre-wrap">
                                        {node.outputs ? JSON.stringify(node.outputs, null, 2) : 'No outputs'}
                                      </pre>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : null}
                          </Fragment>
                        );
                      })}
                      {detail.nodes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-16 text-center text-xs text-gray-400">
                            No nodes recorded.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <ConfirmDialog
                open={showRetryFailedConfirm}
                onOpenChange={setShowRetryFailedConfirm}
                onConfirm={() => { void handleRetryFailedNodes(); }}
                title="Retry failed nodes?"
                description="This will requeue all failed or blocked nodes for this run. Any node retries will reset their status to pending and enqueue the run."
                confirmText="Retry failed nodes"
                variant="success"
                loading={retryFailedPending}
              />

              <div className="rounded-md border border-border/70 bg-black/20">
                <div className="flex items-center justify-between px-4 pt-4 text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <span>Events</span>
                    {eventsOverflow ? (
                      <span className="rounded border border-amber-400/50 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200">
                        Truncated{eventsBatchLimit ? ` (limit ${eventsBatchLimit})` : ''}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[11px] text-gray-500">{detail.events.length} total</span>
                </div>
                <div className="max-h-60 overflow-auto p-4 text-xs text-gray-200">
                  {detail.events.length === 0 ? (
                    <div className="text-xs text-gray-400">No events recorded.</div>
                  ) : (
                    <div className="space-y-2">
                      {detail.events.map((event: AiPathRunEventRecord) => (
                        <div
                          key={event.id}
                          className="rounded-md border border-border/60 bg-black/30 px-3 py-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
                            <span>{formatTimestamp(event.createdAt)}</span>
                            <span className="uppercase">{event.level}</span>
                          </div>
                          <div className="mt-1 text-xs text-gray-200">{event.message}</div>
                          {event.metadata ? (
                            <pre className="mt-2 max-h-28 overflow-auto rounded bg-black/40 p-2 text-[10px] text-gray-200 whitespace-pre-wrap">
                              {JSON.stringify(event.metadata, null, 2)}
                            </pre>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">No detail available.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
