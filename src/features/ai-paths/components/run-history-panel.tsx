"use client";

import React from "react";

import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";

import type { AiPathRunRecord, RuntimeHistoryEntry } from "@/features/ai-paths/lib";
import { RunHistoryEntries } from "./RunHistoryEntries";
import { buildHistoryNodeOptions } from "./run-history-utils";

export type RunHistoryFilter = "all" | "active" | "failed" | "dead";

type RunHistoryPanelProps = {
  runs: AiPathRunRecord[];
  isRefreshing: boolean;
  onRefresh: () => void;
  runFilter: RunHistoryFilter;
  setRunFilter: React.Dispatch<React.SetStateAction<RunHistoryFilter>>;
  expandedRunHistory: Record<string, boolean>;
  setExpandedRunHistory: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  runHistorySelection: Record<string, string>;
  setRunHistorySelection: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onOpenRunDetail: (runId: string) => void;
  onResumeRun: (runId: string, mode: "resume" | "replay") => void;
  onCancelRun: (runId: string) => void;
  onRequeueDeadLetter: (runId: string) => void;
};

export function RunHistoryPanel({
  runs,
  isRefreshing,
  onRefresh,
  runFilter,
  setRunFilter,
  expandedRunHistory,
  setExpandedRunHistory,
  runHistorySelection,
  setRunHistorySelection,
  onOpenRunDetail,
  onResumeRun,
  onCancelRun,
  onRequeueDeadLetter,
}: RunHistoryPanelProps): React.JSX.Element {
  const filteredRunList = React.useMemo((): AiPathRunRecord[] => {
    if (runFilter === "all") return runs;
    if (runFilter === "active") {
      return runs.filter(
        (run) => run.status === "queued" || run.status === "running"
      );
    }
    if (runFilter === "failed") {
      return runs.filter(
        (run) => run.status === "failed" || run.status === "paused"
      );
    }
    return runs.filter((run) => run.status === "dead_lettered");
  }, [runFilter, runs]);

  return (
    <div className="rounded-lg border border-border bg-card/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-white">Run History</span>
        <Button
          type="button"
          className="rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {[
          { id: "all", label: "All" },
          { id: "active", label: "Active" },
          { id: "failed", label: "Failed" },
          { id: "dead", label: "Dead-letter" },
        ].map((filter) => (
          <Button
            key={filter.id}
            type="button"
            className={`rounded-md border px-2 py-1 text-[10px] ${
              runFilter === filter.id
                ? "border-emerald-500/50 text-emerald-200"
                : "text-gray-300 hover:bg-muted/60"
            }`}
            onClick={() => setRunFilter(filter.id as RunHistoryFilter)}
          >
            {filter.label}
          </Button>
        ))}
      </div>
      {filteredRunList.length === 0 ? (
        <div className="text-[11px] text-gray-500">No runs yet.</div>
      ) : (
        <div className="space-y-2 text-xs text-gray-300">
          {filteredRunList.slice(0, 6).map((run) => {
            const statusClass =
              run.status === "completed"
                ? "text-emerald-200"
                : run.status === "failed"
                  ? "text-rose-200"
                  : run.status === "dead_lettered"
                    ? "text-rose-300"
                    : run.status === "running"
                      ? "text-sky-200"
                      : run.status === "queued"
                        ? "text-amber-200"
                        : "text-gray-300";
            const runHistory = (run.runtimeState?.history ?? undefined) as
              | Record<string, RuntimeHistoryEntry[]>
              | undefined;
            const runHistoryOptions = buildHistoryNodeOptions(
              runHistory,
              null,
              run.graph?.nodes ?? null
            );
            const rawSelectedHistoryNodeId = runHistorySelection[run.id] ?? null;
            const selectedHistoryNodeId = runHistoryOptions.some(
              (option) => option.id === rawSelectedHistoryNodeId
            )
              ? rawSelectedHistoryNodeId
              : runHistoryOptions[0]?.id ?? null;
            const historyOpen = Boolean(expandedRunHistory[run.id]);
            const historyEntries =
              selectedHistoryNodeId && runHistory
                ? runHistory[selectedHistoryNodeId] ?? []
                : [];
            return (
              <div
                key={run.id}
                className="rounded-md border border-border/60 bg-card/70 p-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-[10px] uppercase ${statusClass}`}>
                      {run.status}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {new Date(run.createdAt).toLocaleString()}
                    </div>
                    {typeof run.retryCount === "number" &&
                      typeof run.maxAttempts === "number" && (
                        <div className="text-[10px] text-gray-500">
                          Retries: {run.retryCount}/{run.maxAttempts}
                        </div>
                      )}
                    {run.nextRetryAt && (
                      <div className="text-[10px] text-amber-200">
                        Retry at {new Date(run.nextRetryAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      className="rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60"
                      onClick={() => onOpenRunDetail(run.id)}
                    >
                      Details
                    </Button>
                    <Button
                      type="button"
                      className="rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60"
                      onClick={() => {
                        setExpandedRunHistory((prev) => ({
                          ...prev,
                          [run.id]: !prev[run.id],
                        }));
                        if (!runHistorySelection[run.id] && runHistoryOptions[0]?.id) {
                          setRunHistorySelection((prev) => ({
                            ...prev,
                            [run.id]: runHistoryOptions[0].id,
                          }));
                        }
                      }}
                    >
                      {historyOpen ? "Hide history" : "History"}
                    </Button>
                    {(run.status === "failed" || run.status === "paused") && (
                      <Button
                        type="button"
                        className="rounded-md border px-2 py-1 text-[10px] text-amber-200 hover:bg-amber-500/10"
                        onClick={() => onResumeRun(run.id, "resume")}
                      >
                        Resume
                      </Button>
                    )}
                    <Button
                      type="button"
                      className="rounded-md border px-2 py-1 text-[10px] text-sky-200 hover:bg-sky-500/10"
                      onClick={() => onResumeRun(run.id, "replay")}
                    >
                      Replay
                    </Button>
                    {(run.status === "queued" || run.status === "running") && (
                      <Button
                        type="button"
                        className="rounded-md border px-2 py-1 text-[10px] text-rose-200 hover:bg-rose-500/10"
                        onClick={() => onCancelRun(run.id)}
                      >
                        Cancel
                      </Button>
                    )}
                    {run.status === "dead_lettered" && (
                      <Button
                        type="button"
                        className="rounded-md border px-2 py-1 text-[10px] text-amber-200 hover:bg-amber-500/10"
                        onClick={() => onRequeueDeadLetter(run.id)}
                      >
                        Requeue
                      </Button>
                    )}
                  </div>
                </div>
                {run.errorMessage && (
                  <div className="mt-2 text-[10px] text-rose-300">
                    {run.errorMessage}
                  </div>
                )}
                {historyOpen && (
                  <div className="mt-2 rounded-md border border-border/70 bg-black/20 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Label className="text-[10px] uppercase text-gray-500">History</Label>
                      {runHistory ? (
                        runHistoryOptions.length > 1 ? (
                          <Select
                            value={selectedHistoryNodeId ?? undefined}
                            onValueChange={(value) =>
                              setRunHistorySelection((prev) => ({
                                ...prev,
                                [run.id]: value,
                              }))
                            }
                          >
                            <SelectTrigger className="h-7 w-[220px] border-border bg-card/70 text-[11px] text-white">
                              <SelectValue placeholder="Select node" />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-gray-900 text-white">
                              {runHistoryOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="text-[11px] text-gray-400">
                            {runHistoryOptions[0]?.label ?? "No nodes"}
                          </div>
                        )
                      ) : null}
                    </div>
                    {runHistory && selectedHistoryNodeId ? (
                      <div className="mt-3">
                        <RunHistoryEntries
                          entries={historyEntries}
                          emptyMessage="No history for this node."
                        />
                      </div>
                    ) : (
                      <div className="mt-2 text-[11px] text-gray-500">
                        No history recorded for this run.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
