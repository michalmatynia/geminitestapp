"use client";

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SectionHeader,
  SectionPanel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from "@/shared/ui";
import { runsApi } from "@/features/ai-paths/lib";
import type {
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
} from "@/shared/types/ai-paths";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useState } from "react";

const PAGE_SIZES = [10, 25, 50];
const SEARCH_DEBOUNCE_MS = 300;

export function AdminAiPathsDeadLetterPage() {
  const { toast } = useToast();
  const [pathId, setPathId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [requeueMode, setRequeueMode] = useState<"resume" | "replay">("resume");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<{
    run: AiPathRunRecord;
    nodes: AiPathRunNodeRecord[];
    events: AiPathRunEventRecord[];
  } | null>(null);
  const [retryFailedPending, setRetryFailedPending] = useState(false);
  const [showRetryFailedConfirm, setShowRetryFailedConfirm] = useState(false);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const [streamStatus, setStreamStatus] = useState<"connecting" | "live" | "stopped" | "paused">("stopped");
  const [streamPaused, setStreamPaused] = useState(false);
  const [eventsOverflow, setEventsOverflow] = useState(false);
  const [eventsBatchLimit, setEventsBatchLimit] = useState<number | null>(null);

  const normalizedPathId = pathId.trim();
  const normalizedQuery = debouncedSearchQuery.trim();
  const offset = (page - 1) * pageSize;

  const runsQuery = useQuery<{ runs: AiPathRunRecord[]; total: number }>({
    queryKey: ["ai-paths-dead-letter", normalizedPathId, normalizedQuery, page, pageSize],
    queryFn: async () => {
      const response = await runsApi.list({
        status: "dead_lettered",
        ...(normalizedPathId ? { pathId: normalizedPathId } : {}),
        ...(normalizedQuery ? { query: normalizedQuery } : {}),
        limit: pageSize,
        offset,
      });
      if (!response.ok) {
        throw new Error(response.error || "Failed to load dead-letter runs.");
      }
      return response.data as { runs: AiPathRunRecord[]; total: number };
    },
  });

  const total = runsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const runs = useMemo(() => runsQuery.data?.runs ?? [], [runsQuery.data?.runs]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [normalizedPathId, normalizedQuery, pageSize]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [normalizedPathId, normalizedQuery]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (!runsQuery.error) return;
    toast(
      runsQuery.error instanceof Error
        ? runsQuery.error.message
        : "Failed to load dead-letter runs.",
      { variant: "error" }
    );
  }, [runsQuery.error, toast]);

  useEffect(() => {
    setExpandedNodeIds(new Set());
    setEventsOverflow(false);
    setEventsBatchLimit(null);
  }, [detail?.run?.id]);

  useEffect(() => {
    if (!detailOpen || !detail?.run?.id) {
      setStreamStatus("stopped");
      return;
    }
    if (streamPaused) {
      setStreamStatus("paused");
      return;
    }

    const runId = detail.run.id;
    const params = new URLSearchParams();
    const latestEventTimestamp = getLatestEventTimestamp(detail.events);
    if (latestEventTimestamp) {
      params.set("since", latestEventTimestamp);
    }
    const url = params.toString()
      ? `/api/ai-paths/runs/${encodeURIComponent(runId)}/stream?${params.toString()}`
      : `/api/ai-paths/runs/${encodeURIComponent(runId)}/stream`;
    const source = new EventSource(url);
    setStreamStatus("connecting");

    const mergeEvents = (incoming: AiPathRunEventRecord[]) => {
      setDetail((prev) => {
        if (!prev) return prev;
        const existingIds = new Set(prev.events.map((event) => event.id));
        const merged = [...prev.events];
        incoming.forEach((event) => {
          if (!existingIds.has(event.id)) {
            merged.push(event);
          }
        });
        merged.sort((a, b) => {
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
          return aTime - bTime;
        });
        return { ...prev, events: merged };
      });
    };

    source.addEventListener("ready", () => {
      setStreamStatus("live");
    });
    source.addEventListener("run", (event) => {
      try {
        const payload = JSON.parse(event.data) as AiPathRunRecord;
        setDetail((prev) => (prev ? { ...prev, run: payload } : prev));
      } catch {
        // ignore parse errors
      }
    });
    source.addEventListener("nodes", (event) => {
      try {
        const payload = JSON.parse(event.data) as AiPathRunNodeRecord[];
        setDetail((prev) => (prev ? { ...prev, nodes: payload } : prev));
      } catch {
        // ignore parse errors
      }
    });
    source.addEventListener("events", (event) => {
      try {
        const payload = JSON.parse(event.data) as
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
        if (typeof payload.limit === "number") {
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
    source.addEventListener("done", () => {
      setStreamStatus("stopped");
      source.close();
    });
    source.addEventListener("error", () => {
      setStreamStatus("stopped");
    });

    return () => {
      source.close();
      setStreamStatus("stopped");
    };
  }, [detailOpen, detail?.run?.id, streamPaused]);

  const selectedCount = selectedIds.size;
  const visibleSelectedCount = useMemo(
    () => runs.filter((run) => selectedIds.has(run.id)).length,
    [runs, selectedIds]
  );
  const allVisibleSelected = runs.length > 0 && visibleSelectedCount === runs.length;
  const headerCheckboxState =
    runs.length === 0
      ? false
      : allVisibleSelected
        ? true
        : visibleSelectedCount > 0
          ? "indeterminate"
          : false;

  const toggleSelected = (runId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else {
        next.add(runId);
      }
      return next;
    });
  };

  const toggleSelectVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        runs.forEach((run) => next.delete(run.id));
      } else {
        runs.forEach((run) => next.add(run.id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());
  const hasFilters = normalizedPathId.length > 0 || searchQuery.trim().length > 0;
  const clearFilters = () => {
    setPathId("");
    setSearchQuery("");
    setDebouncedSearchQuery("");
  };

  const handleRequeueResult = (data: {
    requeued: number;
    errors?: Array<{ runId: string; error: string }>;
  }) => {
    const modeLabel = requeueMode === "resume" ? "resume" : "replay";
    toast(`Requeued ${data.requeued} run(s) (${modeLabel}).`, { variant: "success" });
    const errorCount = data.errors?.length ?? 0;
    if (errorCount > 0) {
      toast(`${errorCount} run(s) failed to requeue.`, { variant: "error" });
    }
  };

  const requeueSelectedMutation = useMutation<
    { requeued: number; errors?: Array<{ runId: string; error: string }> },
    Error
  >({
    mutationFn: async () => {
      const response = await runsApi.requeueDeadLetter({
        runIds: Array.from(selectedIds),
        mode: requeueMode,
      });
      if (!response.ok) {
        throw new Error(response.error || "Failed to requeue selected runs.");
      }
      return response.data as { requeued: number; errors?: Array<{ runId: string; error: string }> };
    },
    onSuccess: (data) => {
      handleRequeueResult(data);
      clearSelection();
      void runsQuery.refetch();
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : "Failed to requeue runs.", {
        variant: "error",
      });
    },
  });

  const requeueAllMutation = useMutation<
    { requeued: number; errors?: Array<{ runId: string; error: string }> },
    Error
  >({
    mutationFn: async () => {
      const response = await runsApi.requeueDeadLetter({
        pathId: normalizedPathId || null,
        query: normalizedQuery || null,
        mode: requeueMode,
      });
      if (!response.ok) {
        throw new Error(response.error || "Failed to requeue dead-letter runs.");
      }
      return response.data as { requeued: number; errors?: Array<{ runId: string; error: string }> };
    },
    onSuccess: (data) => {
      handleRequeueResult(data);
      clearSelection();
      void runsQuery.refetch();
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : "Failed to requeue runs.", {
        variant: "error",
      });
    },
  });

  const handleOpenDetail = async (runId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setStreamPaused(false);
    try {
      const response = await runsApi.get(runId);
      if (!response.ok) {
        throw new Error(response.error || "Failed to load run details.");
      }
      setDetail(
        response.data as {
          run: AiPathRunRecord;
          nodes: AiPathRunNodeRecord[];
          events: AiPathRunEventRecord[];
        }
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to load run details.", {
        variant: "error",
      });
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const paginationLabel = useMemo(() => {
    if (total === 0) return "0 results";
    const start = offset + 1;
    const end = Math.min(offset + pageSize, total);
    return `${start}-${end} of ${total}`;
  }, [offset, pageSize, total]);

  const getLatestEventTimestamp = (events: AiPathRunEventRecord[]) => {
    let max = 0;
    events.forEach((event) => {
      const time = new Date(event.createdAt).getTime();
      if (Number.isFinite(time) && time > max) {
        max = time;
      }
    });
    return max > 0 ? new Date(max).toISOString() : null;
  };

  const toggleNodeExpanded = (nodeId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const formatTimestamp = (value?: Date | string | null) => {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
  };

  const nodeStatusSummary = useMemo(() => {
    if (!detail) return null;
    const counts: Record<string, number> = {};
    detail.nodes.forEach((node) => {
      counts[node.status] = (counts[node.status] ?? 0) + 1;
    });
    const totalNodes = detail.nodes.length;
    const completed = counts.completed ?? 0;
    const progress = totalNodes > 0 ? Math.round((completed / totalNodes) * 100) : 0;
    return { counts, totalNodes, completed, progress };
  }, [detail]);

  const handleRequeueSingle = async (runId: string) => {
    const response = await runsApi.resume(runId, requeueMode);
    if (!response.ok) {
      toast(response.error || "Failed to requeue run.", { variant: "error" });
      return;
    }
    toast(`Run requeued (${requeueMode === "resume" ? "resume" : "replay"}).`, {
      variant: "success",
    });
    void runsQuery.refetch();
  };

  const retryNodeMutation = useMutation<
    { run: unknown },
    Error,
    { runId: string; nodeId: string }
  >({
    mutationFn: async ({ runId, nodeId }) => {
      const response = await runsApi.retryNode(runId, nodeId);
      if (!response.ok) {
        throw new Error(response.error || "Failed to retry node.");
      }
      return response.data as { run: unknown };
    },
    onSuccess: (_data, variables) => {
      toast(`Node ${variables.nodeId} retry queued.`, { variant: "success" });
      void runsQuery.refetch();
      if (detail?.run?.id) {
        void handleOpenDetail(detail.run.id);
      }
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : "Failed to retry node.", {
        variant: "error",
      });
    },
  });

  const handleRetryFailedNodes = async () => {
    if (!detail || retryFailedPending) return;
    const retryableNodes = detail.nodes.filter(
      (node) => node.status === "failed" || node.status === "blocked"
    );
    if (retryableNodes.length === 0) {
      toast("No failed or blocked nodes to retry.", { variant: "info" });
      return;
    }
    setRetryFailedPending(true);
    try {
      const results = await Promise.all(
        retryableNodes.map((node) => runsApi.retryNode(detail.run.id, node.nodeId))
      );
      const failed = results.filter((result) => !result.ok);
      const successCount = results.length - failed.length;
      if (successCount > 0) {
        toast(`Queued ${successCount} node(s) for retry.`, { variant: "success" });
      }
      if (failed.length > 0) {
        toast(`${failed.length} node(s) failed to retry.`, { variant: "error" });
      }
      if (successCount > 0) {
        void runsQuery.refetch();
        void handleOpenDetail(detail.run.id);
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to retry nodes.", {
        variant: "error",
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
              onChange={(event) => setPathId(event.target.value)}
              placeholder="Filter by path ID"
              className="h-9 w-[220px] border-border bg-card/70 text-sm text-white"
            />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
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
              {runsQuery.isFetching ? "Refreshing..." : "Refresh"}
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
              {allVisibleSelected ? "Unselect visible" : "Select visible"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              disabled={selectedCount === 0}
            >
              Clear selection
            </Button>
            <Select
              value={requeueMode}
              onValueChange={(value) => setRequeueMode(value as "resume" | "replay")}
            >
              <SelectTrigger className="h-8 w-[160px] border-border bg-card/70 text-xs text-white">
                <SelectValue placeholder="Requeue mode" />
              </SelectTrigger>
              <SelectContent className="border-border bg-gray-900 text-white">
                <SelectItem value="resume">Resume (continue)</SelectItem>
                <SelectItem value="replay">Replay (from start)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { void requeueSelectedMutation.mutateAsync(); }}
              disabled={selectedCount === 0 || requeueSelectedMutation.isPending}
            >
              {requeueSelectedMutation.isPending ? "Requeueing..." : "Requeue selected"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { void requeueAllMutation.mutateAsync(); }}
              disabled={requeueAllMutation.isPending || total === 0}
            >
              {requeueAllMutation.isPending ? "Requeueing..." : "Requeue all filtered"}
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
              {runs.map((run) => (
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
                    <div>{run.pathName || "Untitled"}</div>
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
                        : "-"}
                  </TableCell>
                  <TableCell className="text-[11px] text-gray-500">
                    {run.errorMessage || "-"}
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
            {PAGE_SIZES.map((size) => (
              <Button
                key={size}
                variant={size === pageSize ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPageSize(size)}
              >
                {size}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
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
                      Stream:{" "}
                      {streamStatus === "live"
                        ? "live"
                        : streamStatus === "connecting"
                          ? "connecting"
                          : streamStatus === "paused"
                            ? "paused"
                            : "stopped"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStreamPaused((prev) => !prev)}
                    >
                      {streamPaused ? "Resume stream" : "Pause stream"}
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
                    <div className="mt-1 text-xs text-gray-200">{detail.run.pathName || "Untitled"}</div>
                    <div className="text-[10px] text-gray-500">{detail.run.pathId}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500">Entity</div>
                    <div className="mt-1 text-xs text-gray-200">{detail.run.entityId || "-"}</div>
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
                      {detail.run.errorMessage || "-"}
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
                        {Object.entries(nodeStatusSummary.counts).map(([status, count]) => (
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
                        const hasAnyExpanded = detail.nodes.some((node) =>
                          expandedNodeIds.has(node.nodeId)
                        );
                        if (hasAnyExpanded) {
                          setExpandedNodeIds(new Set());
                          return;
                        }
                        const next = new Set<string>();
                        detail.nodes.forEach((node) => {
                          if (node.inputs || node.outputs) {
                            next.add(node.nodeId);
                          }
                        });
                        setExpandedNodeIds(next);
                      }}
                      disabled={detail.nodes.every((node) => !node.inputs && !node.outputs)}
                    >
                      {detail.nodes.some((node) => expandedNodeIds.has(node.nodeId))
                        ? "Collapse all"
                        : "Expand all"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRetryFailedConfirm(true)}
                      disabled={
                        retryFailedPending ||
                        detail.nodes.every(
                          (node) => node.status !== "failed" && node.status !== "blocked"
                        )
                      }
                    >
                      {retryFailedPending ? "Retrying..." : "Retry failed only"}
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
                      {detail.nodes.map((node) => {
                        const isRetryable = node.status === "failed" || node.status === "blocked";
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
                                {node.errorMessage || "-"}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleNodeExpanded(node.nodeId)}
                                  disabled={!hasData}
                                >
                                  {hasData ? (isExpanded ? "Hide" : "Show") : "No data"}
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
                                  {isRetrying ? "Retrying..." : "Retry node"}
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
                                        {node.inputs ? JSON.stringify(node.inputs, null, 2) : "No inputs"}
                                      </pre>
                                    </div>
                                    <div>
                                      <div className="text-[11px] text-gray-500">Outputs</div>
                                      <pre className="mt-2 max-h-32 overflow-auto rounded bg-black/40 p-2 text-[10px] text-gray-200 whitespace-pre-wrap">
                                        {node.outputs ? JSON.stringify(node.outputs, null, 2) : "No outputs"}
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

              <AlertDialog open={showRetryFailedConfirm} onOpenChange={setShowRetryFailedConfirm}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Retry failed nodes?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will requeue all failed or blocked nodes for this run. Any node retries
                      will reset their status to pending and enqueue the run.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={retryFailedPending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => { void handleRetryFailedNodes(); }}
                      className="bg-amber-500 text-white hover:bg-amber-600"
                      disabled={retryFailedPending}
                    >
                      {retryFailedPending ? "Retrying..." : "Retry failed nodes"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="rounded-md border border-border/70 bg-black/20">
                <div className="flex items-center justify-between px-4 pt-4 text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <span>Events</span>
                    {eventsOverflow ? (
                      <span className="rounded border border-amber-400/50 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200">
                        Truncated{eventsBatchLimit ? ` (limit ${eventsBatchLimit})` : ""}
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
                      {detail.events.map((event) => (
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
