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
import type { AiPathRunRecord } from "@/shared/types/ai-paths";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZES = [10, 25, 50];

export function AdminAiPathsDeadLetterPage() {
  const { toast } = useToast();
  const [pathId, setPathId] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<{
    run: AiPathRunRecord;
    nodes: unknown[];
    events: unknown[];
  } | null>(null);

  const normalizedPathId = pathId.trim();
  const offset = (page - 1) * pageSize;

  const runsQuery = useQuery({
    queryKey: ["ai-paths-dead-letter", normalizedPathId, page, pageSize],
    queryFn: async () => {
      const response = await runsApi.list({
        status: "dead_lettered",
        pathId: normalizedPathId || undefined,
        limit: pageSize,
        offset,
      });
      if (!response.ok) {
        throw new Error(response.error || "Failed to load dead-letter runs.");
      }
      return response.data as { runs: AiPathRunRecord[]; total: number };
    },
    keepPreviousData: true,
  });

  const total = runsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const runs = runsQuery.data?.runs ?? [];

  useEffect(() => {
    setPage(1);
  }, [normalizedPathId, pageSize]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [normalizedPathId]);

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

  const requeueSelectedMutation = useMutation({
    mutationFn: async () => {
      const response = await runsApi.requeueDeadLetter({
        runIds: Array.from(selectedIds),
        mode: "resume",
      });
      if (!response.ok) {
        throw new Error(response.error || "Failed to requeue selected runs.");
      }
      return response.data;
    },
    onSuccess: (data) => {
      toast(`Requeued ${data.requeued} run(s).`, { variant: "success" });
      clearSelection();
      void runsQuery.refetch();
    },
    onError: (error) => {
      toast(error instanceof Error ? error.message : "Failed to requeue runs.", {
        variant: "error",
      });
    },
  });

  const requeueAllMutation = useMutation({
    mutationFn: async () => {
      const response = await runsApi.requeueDeadLetter({
        pathId: normalizedPathId || null,
        mode: "resume",
      });
      if (!response.ok) {
        throw new Error(response.error || "Failed to requeue dead-letter runs.");
      }
      return response.data;
    },
    onSuccess: (data) => {
      toast(`Requeued ${data.requeued} run(s).`, { variant: "success" });
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
    try {
      const response = await runsApi.get(runId);
      if (!response.ok) {
        throw new Error(response.error || "Failed to load run details.");
      }
      setDetail(response.data as { run: AiPathRunRecord; nodes: unknown[]; events: unknown[] });
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

  const handleRequeueSingle = async (runId: string) => {
    const response = await runsApi.resume(runId, "resume");
    if (!response.ok) {
      toast(response.error || "Failed to requeue run.", { variant: "error" });
      return;
    }
    toast("Run requeued.", { variant: "success" });
    void runsQuery.refetch();
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
              className="h-9 w-[240px] border-border bg-card/70 text-sm text-white"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => void runsQuery.refetch()}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => void requeueSelectedMutation.mutateAsync()}
              disabled={selectedCount === 0 || requeueSelectedMutation.isPending}
            >
              {requeueSelectedMutation.isPending ? "Requeueing..." : "Requeue selected"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void requeueAllMutation.mutateAsync()}
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
                        onClick={() => void handleOpenDetail(run.id)}
                      >
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleRequeueSingle(run.id)}
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Run Details</DialogTitle>
            <DialogDescription>Inspect the run state, node statuses, and events.</DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="text-sm text-gray-400">Loading run details...</div>
          ) : detail ? (
            <pre className="max-h-[60vh] overflow-auto rounded-md bg-black/40 p-4 text-xs text-gray-200">
              {JSON.stringify(detail, null, 2)}
            </pre>
          ) : (
            <div className="text-sm text-gray-400">No detail available.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
