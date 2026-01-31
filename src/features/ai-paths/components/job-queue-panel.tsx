"use client";

import React from "react";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/shared/ui";
import { useQuery } from "@tanstack/react-query";

import { runsApi } from "@/features/ai-paths/lib";
import type {
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
} from "@/features/ai-paths/lib";
import { RunHistoryEntries } from "./RunHistoryEntries";
import { buildHistoryNodeOptions } from "./run-history-utils";
import { safeJsonStringify } from "./AiPathsSettingsUtils";

type JobQueuePanelProps = {
  activePathId?: string | null;
};

type RunDetail = {
  run: AiPathRunRecord;
  nodes: AiPathRunNodeRecord[];
  events: AiPathRunEventRecord[];
};

type QueueStatus = {
  running: boolean;
  healthy: boolean;
  processing: boolean;
  activeRuns: number;
  concurrency: number;
  lastPollTime: number;
  timeSinceLastPoll: number;
};

type StreamMessageEvent = Event & { data: string };

const PAGE_SIZES = [10, 25, 50];
const SEARCH_DEBOUNCE_MS = 300;
const AUTO_REFRESH_ENABLED_KEY = "ai-paths-job-queue-auto-refresh-enabled";
const AUTO_REFRESH_INTERVAL_KEY = "ai-paths-job-queue-auto-refresh-interval";
const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "queued", label: "Queued" },
  { id: "running", label: "Running" },
  { id: "paused", label: "Paused" },
  { id: "completed", label: "Completed" },
  { id: "failed", label: "Failed" },
  { id: "canceled", label: "Canceled" },
  { id: "dead_lettered", label: "Dead-lettered" },
] as const;

const formatDate = (value?: Date | string | null): string => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const formatDurationMs = (value?: number | null): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  if (value < 1000) return `${Math.max(0, value)}ms`;
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
};

const safePrettyJson = (value: unknown): string => {
  const raw = safeJsonStringify(value);
  if (!raw) return "";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
};

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

export function JobQueuePanel({ activePathId }: JobQueuePanelProps): React.JSX.Element {
  const [pathFilter, setPathFilter] = React.useState(activePathId ?? "");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState(searchQuery);
  const [statusFilter, setStatusFilter] = React.useState<(typeof STATUS_FILTERS)[number]["id"]>("all");
  const [pageSize, setPageSize] = React.useState(25);
  const [page, setPage] = React.useState(1);
  const [expandedRunIds, setExpandedRunIds] = React.useState<Set<string>>(new Set());
  const [runDetails, setRunDetails] = React.useState<Record<string, RunDetail | null>>({});
  const [runDetailLoading, setRunDetailLoading] = React.useState<Set<string>>(new Set());
  const [runDetailErrors, setRunDetailErrors] = React.useState<Record<string, string>>({});
  const [historySelection, setHistorySelection] = React.useState<Record<string, string>>({});
  const [streamStatuses, setStreamStatuses] = React.useState<
    Record<string, "connecting" | "live" | "stopped" | "paused">
  >({});
  const streamSourcesRef = React.useRef<Map<string, EventSource>>(new Map());
  const [pausedStreams, setPausedStreams] = React.useState<Set<string>>(new Set());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = React.useState(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem(AUTO_REFRESH_ENABLED_KEY);
    if (saved === "false") return false;
    if (saved === "true") return true;
    return true;
  });
  const [autoRefreshInterval, setAutoRefreshInterval] = React.useState(() => {
    if (typeof window === "undefined") return 5000;
    const saved = window.localStorage.getItem(AUTO_REFRESH_INTERVAL_KEY);
    const parsed = saved ? Number.parseInt(saved, 10) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return 5000;
  });

  const normalizedPathFilter = pathFilter.trim();
  const normalizedQuery = debouncedQuery.trim();
  const offset = (page - 1) * pageSize;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, SEARCH_DEBOUNCE_MS);
    return (): void => clearTimeout(timer);
  }, [searchQuery]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      AUTO_REFRESH_ENABLED_KEY,
      autoRefreshEnabled ? "true" : "false"
    );
  }, [autoRefreshEnabled]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(AUTO_REFRESH_INTERVAL_KEY, String(autoRefreshInterval));
  }, [autoRefreshInterval]);

  React.useEffect(() => {
    setPage(1);
  }, [normalizedPathFilter, normalizedQuery, statusFilter, pageSize]);

  const runsQuery = useQuery<{ runs: AiPathRunRecord[]; total: number }>({
    queryKey: [
      "ai-paths-job-queue",
      normalizedPathFilter,
      normalizedQuery,
      statusFilter,
      page,
      pageSize,
    ],
    queryFn: async () => {
      const response = await runsApi.list({
        ...(normalizedPathFilter ? { pathId: normalizedPathFilter } : {}),
        ...(normalizedQuery ? { query: normalizedQuery } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        limit: pageSize,
        offset,
      });
      if (!response.ok) {
        throw new Error(response.error || "Failed to load job queue.");
      }
      return response.data as { runs: AiPathRunRecord[]; total: number };
    },
    refetchInterval: autoRefreshEnabled ? autoRefreshInterval : false,
  });

  const queueStatusQuery = useQuery<{ status: QueueStatus }>({
    queryKey: ["ai-paths-queue-status"],
    queryFn: async () => {
      const response = await runsApi.queueStatus();
      if (!response.ok) {
        throw new Error(response.error || "Failed to load queue status.");
      }
      return response.data as { status: QueueStatus };
    },
    refetchInterval: autoRefreshEnabled ? autoRefreshInterval : false,
  });

  const total = runsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const runs = runsQuery.data?.runs ?? [];
  const queueStatus = queueStatusQuery.data?.status;

  React.useEffect(() => {
    const sources = streamSourcesRef.current;
    return (): void => {
      sources.forEach((source: EventSource) => source.close());
      sources.clear();
    };
  }, []);

  React.useEffect(() => {
    streamSourcesRef.current.forEach((source: EventSource, runId: string) => {
      if (!expandedRunIds.has(runId)) {
        source.close();
        streamSourcesRef.current.delete(runId);
        setStreamStatuses((prev: Record<string, "connecting" | "live" | "stopped" | "paused">) => ({ ...prev, [runId]: "stopped" }));
      }
    });

    expandedRunIds.forEach((runId: string) => {
      if (streamSourcesRef.current.has(runId)) return;
      if (pausedStreams.has(runId)) return;
      const existing = runDetails[runId];
      const since = existing ? getLatestEventTimestamp(existing.events) : null;
      const params = new URLSearchParams();
      if (since) params.set("since", since);
      const url = params.toString()
        ? `/api/ai-paths/runs/${encodeURIComponent(runId)}/stream?${params.toString()}`
        : `/api/ai-paths/runs/${encodeURIComponent(runId)}/stream`;
      const source = new EventSource(url);
      streamSourcesRef.current.set(runId, source);
      setStreamStatuses((prev: Record<string, "connecting" | "live" | "stopped" | "paused">) => ({ ...prev, [runId]: "connecting" }));

      const mergeEvents = (incoming: AiPathRunEventRecord[]): void => {
        setRunDetails((prev: Record<string, RunDetail | null>) => {
          const current = prev[runId];
          if (!current) {
            return prev;
          }
                      const existingIds = new Set(current.events.map((event: AiPathRunEventRecord) => event.id));
                      const merged = [...current.events];
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
                      return { ...prev, [runId]: { ...current, events: merged } };
                    });
                  };
          
                  source.addEventListener("ready", () => {
                    setStreamStatuses((prev: Record<string, "connecting" | "live" | "stopped" | "paused">) => ({ ...prev, [runId]: "live" }));
                  });
                          source.addEventListener("run", (event: Event) => {
                            try {
                              const payload = JSON.parse((event as StreamMessageEvent).data) as AiPathRunRecord;
                              setRunDetails((prev: Record<string, RunDetail | null>) => {
                                const current = prev[runId];
                                if (current) {
                                  return { ...prev, [runId]: { ...current, run: payload } };
                                }
                                return { ...prev, [runId]: { run: payload, nodes: [], events: [] } };
                              });
                            } catch {
                              // ignore parse errors
                            }
                          });
                          source.addEventListener("nodes", (event: Event) => {
                            try {
                              const payload = JSON.parse((event as StreamMessageEvent).data) as AiPathRunNodeRecord[];
                              setRunDetails((prev: Record<string, RunDetail | null>) => {
                                const current = prev[runId];
                                if (!current) return prev;
                                return { ...prev, [runId]: { ...current, nodes: payload } };
                              });
                            } catch {
                              // ignore parse errors
                            }
                          });
                          source.addEventListener("events", (event: Event) => {
                            try {
                              const payload = JSON.parse((event as StreamMessageEvent).data) as
                                | AiPathRunEventRecord[]
                                | { events?: AiPathRunEventRecord[] };                      if (Array.isArray(payload)) {
                        mergeEvents(payload);
                        return;
                      }
                      const events = Array.isArray(payload.events) ? payload.events : [];
                      mergeEvents(events);
                    } catch {
                      // ignore parse errors
                    }
                  });
                  source.addEventListener("done", () => {
                    setStreamStatuses((prev: Record<string, "connecting" | "live" | "stopped" | "paused">) => ({ ...prev, [runId]: "stopped" }));
                    source.close();
                    streamSourcesRef.current.delete(runId);
                  });
                  source.addEventListener("error", () => {
                    setStreamStatuses((prev: Record<string, "connecting" | "live" | "stopped" | "paused">) => ({ ...prev, [runId]: "stopped" }));
                    source.close();
                    streamSourcesRef.current.delete(runId);
                  });
                });
              }, [expandedRunIds, pausedStreams, runDetails]);
          
              const loadRunDetail = React.useCallback(async (runId: string): Promise<void> => {
                setRunDetailErrors((prev: Record<string, string>) => {
                  const next = { ...prev };
                  delete next[runId];
                  return next;
                });
                setRunDetailLoading((prev: Set<string>) => new Set(prev).add(runId));
                try {
                  const response = await runsApi.get(runId);
                  if (!response.ok) {
                    throw new Error(response.error || "Failed to load run details.");
                  }
                  const data = response.data as RunDetail;
                  setRunDetails((prev: Record<string, RunDetail | null>) => ({ ...prev, [runId]: data }));
                } catch (error) {
                  setRunDetailErrors((prev: Record<string, string>) => ({
                    ...prev,
                    [runId]: error instanceof Error ? error.message : "Failed to load run details.",
                  }));
                } finally {
                  setRunDetailLoading((prev: Set<string>) => {
                    const next = new Set(prev);
                    next.delete(runId);
                    return next;
                  });
                }
              }, []);
          
              const toggleRun = (runId: string): void => {
                setExpandedRunIds((prev: Set<string>) => {
                  const next = new Set(prev);
                  if (next.has(runId)) {
                    next.delete(runId);
                  } else {
                    next.add(runId);
                  }
                  return next;
                });    if (!runDetails[runId]) {
      void loadRunDetail(runId);
    }
  };

  const toggleStream = (runId: string): void => {
    const source = streamSourcesRef.current.get(runId);
    setPausedStreams((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
        setStreamStatuses((statusPrev: Record<string, "connecting" | "live" | "stopped" | "paused">) => ({ ...statusPrev, [runId]: "connecting" }));
      } else {
        next.add(runId);
        setStreamStatuses((statusPrev: Record<string, "connecting" | "live" | "stopped" | "paused">) => ({ ...statusPrev, [runId]: "paused" }));
      }
      return next;
    });
    if (source) {
      source.close();
      streamSourcesRef.current.delete(runId);
    }
  };

  const pauseAllStreams = (): void => {
    const expandedIds = Array.from(expandedRunIds);
    if (expandedIds.length === 0) return;
    setPausedStreams(() => new Set(expandedIds));
    streamSourcesRef.current.forEach((source: EventSource) => source.close());
    streamSourcesRef.current.clear();
    setStreamStatuses((prev: Record<string, "connecting" | "live" | "stopped" | "paused">) => {
      const next = { ...prev };
      expandedIds.forEach((id: string) => {
        next[id] = "paused";
      });
      return next;
    });
  };

  const resumeAllStreams = (): void => {
    if (expandedRunIds.size === 0) return;
    setPausedStreams(new Set());
    setStreamStatuses((prev: Record<string, "connecting" | "live" | "stopped" | "paused">) => {
      const next = { ...prev };
      expandedRunIds.forEach((id: string) => {
        next[id] = "connecting";
      });
      return next;
    });
  };

  const ensureHistorySelection = React.useCallback(
          (runId: string, options: { id: string }[]): string | null => {
            if (!options.length) return null;
            const existing = historySelection[runId];
            if (existing && options.some((option: { id: string }) => option.id === existing)) return existing;
            return options[0]?.id ?? null;
          },    [historySelection]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">Job Queue</div>
          <div className="text-xs text-gray-400">Full run payloads and queue snapshots.</div>
        </div>
        <Button
          type="button"
          className="rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60"
          onClick={() => { void runsQuery.refetch(); }}
          disabled={runsQuery.isFetching}
        >
          {runsQuery.isFetching ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
        <Button
          type="button"
          className={`rounded-md border px-2 py-1 text-[10px] ${
            autoRefreshEnabled
              ? "border-emerald-500/50 text-emerald-200"
              : "text-gray-300 hover:bg-muted/60"
          }`}
                      onClick={() => setAutoRefreshEnabled((prev: boolean) => !prev)}
                    >
                      {autoRefreshEnabled ? "Auto-refresh on" : "Auto-refresh off"}
                    </Button>
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] uppercase text-gray-500">Interval</Label>
                      <Select
                        value={String(autoRefreshInterval)}
                        onValueChange={(value: string) => setAutoRefreshInterval(Number.parseInt(value, 10))}
                        disabled={!autoRefreshEnabled}
                      >
                        <SelectTrigger className="h-7 w-[110px] border-border bg-card/70 text-[11px] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-border bg-gray-900 text-white">
                          {[2000, 5000, 10000, 30000].map((value: number) => (
                            <SelectItem key={value} value={String(value)}>
                              {value / 1000}s
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>        <Button
          type="button"
          className="rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60"
          onClick={pauseAllStreams}
          disabled={expandedRunIds.size === 0}
        >
          Pause all streams
        </Button>
        <Button
          type="button"
          className="rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60"
          onClick={resumeAllStreams}
          disabled={expandedRunIds.size === 0}
        >
          Resume all streams
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300">
          <div className="text-[10px] uppercase text-gray-500">Worker</div>
          <div className="mt-1 text-sm text-white">
            {queueStatus ? (queueStatus.running ? "Running" : "Stopped") : "-"}
          </div>
          <div className="mt-1 text-[11px] text-gray-400">
            Healthy: {queueStatus ? (queueStatus.healthy ? "Yes" : "No") : "-"}
          </div>
        </div>
        <div className="rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300">
          <div className="text-[10px] uppercase text-gray-500">Concurrency</div>
          <div className="mt-1 text-sm text-white">
            {queueStatus?.concurrency ?? "-"}
          </div>
          <div className="mt-1 text-[11px] text-gray-400">
            Active runs: {queueStatus?.activeRuns ?? 0}
          </div>
        </div>
        <div className="rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300">
          <div className="text-[10px] uppercase text-gray-500">Last poll</div>
          <div className="mt-1 text-sm text-white">
            {queueStatus?.lastPollTime
              ? new Date(queueStatus.lastPollTime).toLocaleTimeString()
              : "-"}
          </div>
          <div className="mt-1 text-[11px] text-gray-400">
            Age:{" "}
            {formatDurationMs(queueStatus?.timeSinceLastPoll ?? null)}
          </div>
        </div>
        <div className="rounded-md border border-border/60 bg-card/50 p-3 text-xs text-gray-300">
          <div className="text-[10px] uppercase text-gray-500">Status</div>
          <div className="mt-1 text-sm text-white">
            {queueStatusQuery.isFetching ? "Refreshing..." : "Live"}
          </div>
          {queueStatusQuery.error ? (
            <div className="mt-1 text-[11px] text-rose-200">
              {queueStatusQuery.error instanceof Error
                ? queueStatusQuery.error.message
                : "Failed to load queue status."}
            </div>
          ) : (
            <div className="mt-1 text-[11px] text-gray-400">
              Updated every 5s
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-gray-500">Path filter</Label>
          <Input
            className="h-9 rounded-md border border-border bg-card/60 px-3 text-sm text-white"
            value={pathFilter}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPathFilter(event.target.value)}
            placeholder={activePathId ? `Active path: ${activePathId}` : "All paths"}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-gray-500">Search</Label>
          <Input
            className="h-9 rounded-md border border-border bg-card/60 px-3 text-sm text-white"
            value={searchQuery}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(event.target.value)}
            placeholder="Run ID, path name, entity, error..."
          />
        </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-gray-500">Page size</Label>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(value: string) => setPageSize(Number.parseInt(value, 10))}
                    >
                      <SelectTrigger className="h-9 w-[110px] border-border bg-card/70 text-[11px] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-border bg-gray-900 text-white">
                        {PAGE_SIZES.map((size: number) => (
                          <SelectItem key={size} value={String(size)}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>                    </div>
            
                            <div className="flex flex-wrap gap-2">
                              {STATUS_FILTERS.map((filter: (typeof STATUS_FILTERS)[number]) => {
                                const active = statusFilter === filter.id;
                                return (
                                  <Button
                                    key={filter.id}
                                    type="button"
                                    className={`rounded-md border px-2 py-1 text-[10px] ${
                                      active ? "border-emerald-500/50 text-emerald-200" : "text-gray-300 hover:bg-muted/60"
                                    }`}
                                    onClick={() => setStatusFilter(filter.id)}
                                  >
                                    {filter.label}
                                  </Button>
                                );
                              })}
                            </div>            
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400">
                      <span>
                        Showing {runs.length} of {total} runs
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          className="rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60"
                          onClick={() => setPage((prev: number) => Math.max(1, prev - 1))}
                          disabled={page <= 1}
                        >
                          Prev
                        </Button>
                        <span>
                          Page {page} / {totalPages}
                        </span>
                        <Button
                          type="button"
                          className="rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60"
                          onClick={() => setPage((prev: number) => Math.min(totalPages, prev + 1))}
                          disabled={page >= totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
            
                    {runs.length === 0 ? (
                      <div className="rounded-md border border-border bg-card/40 p-4 text-sm text-gray-400">
                        No runs found for the current filters.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {runs.map((run: AiPathRunRecord) => {            const isExpanded = expandedRunIds.has(run.id);
            const detail = runDetails[run.id];
            const detailLoading = runDetailLoading.has(run.id);
            const detailError = runDetailErrors[run.id];
            const detailRun = detail?.run ?? run;
            const isScheduledRun = detailRun.triggerEvent === "scheduled_run";
            const streamStatus = pausedStreams.has(run.id)
              ? "paused"
              : streamStatuses[run.id] ?? "stopped";
            const nodes = detail?.nodes ?? [];
            const events = detail?.events ?? [];
            const history = (detailRun.runtimeState?.history ?? undefined);
            const historyOptions = buildHistoryNodeOptions(
              history,
              nodes,
              detailRun.graph?.nodes ?? null
            );
            const selectedHistoryNodeId = ensureHistorySelection(run.id, historyOptions);
            const historyEntries =
              selectedHistoryNodeId && history
                ? history[selectedHistoryNodeId] ?? []
                : [];

            return (
              <div
                key={run.id}
                className="rounded-md border border-border/60 bg-card/70 p-3 text-xs text-gray-300"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase text-gray-400">{detailRun.status}</div>
                    {isScheduledRun ? (
                      <div className="mt-1 inline-flex rounded-full border border-amber-400/60 bg-amber-500/15 px-2 py-[1px] text-[9px] uppercase text-amber-200">
                        Scheduled
                      </div>
                    ) : null}
                    <div className="text-sm text-white">{detailRun.pathName ?? "AI Path"}</div>
                    <div className="text-[11px] text-gray-400">
                      Run ID: <span className="font-mono">{detailRun.id}</span>
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Created {formatDate(detailRun.createdAt)}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Stream: {streamStatus}
                    </div>
                    {(detailRun.entityType || detailRun.entityId) && (
                      <div className="text-[11px] text-gray-500">
                        Entity: {detailRun.entityType ?? "?"} {detailRun.entityId ?? ""}
                      </div>
                    )}
                    {detailRun.errorMessage && (
                      <div className="mt-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200">
                        Error: {detailRun.errorMessage}
                      </div>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    className="rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60"
                    onClick={() => toggleRun(run.id)}
                  >
                    {isExpanded ? "Hide details" : "Details"}
                  </Button>
                  <Button
                    type="button"
                    className="rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60"
                    onClick={() => toggleStream(run.id)}
                    disabled={!isExpanded}
                  >
                    {pausedStreams.has(run.id) ? "Resume stream" : "Pause stream"}
                  </Button>
                  <Button
                    type="button"
                    className="rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60"
                    onClick={() => void loadRunDetail(run.id)}
                    disabled={detailLoading}
                    >
                      {detailLoading ? "Loading..." : "Refresh detail"}
                    </Button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="mt-4 space-y-3">
                    {detailError ? (
                      <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-[11px] text-rose-200">
                        {detailError}
                      </div>
                    ) : null}

                    {!detail && !detailLoading ? (
                      <div className="text-[11px] text-gray-500">
                        Loading run details...
                      </div>
                    ) : null}

                    {detail ? (
                      <>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-[11px] text-gray-400">
                          <div>
                            <span className="uppercase text-gray-500">Path ID</span>
                            <div className="text-white">{detailRun.pathId ?? "-"}</div>
                          </div>
                          <div>
                            <span className="uppercase text-gray-500">Status</span>
                            <div className="text-white">{detailRun.status}</div>
                          </div>
                          <div>
                            <span className="uppercase text-gray-500">Trigger</span>
                            <div className="text-white">{detailRun.triggerEvent ?? "-"}</div>
                          </div>
                          <div>
                            <span className="uppercase text-gray-500">Started</span>
                            <div className="text-white">{formatDate(detailRun.startedAt)}</div>
                          </div>
                          <div>
                            <span className="uppercase text-gray-500">Finished</span>
                            <div className="text-white">{formatDate(detailRun.finishedAt)}</div>
                          </div>
                          <div>
                            <span className="uppercase text-gray-500">Dead-lettered</span>
                            <div className="text-white">{formatDate(detailRun.deadLetteredAt)}</div>
                          </div>
                          <div>
                            <span className="uppercase text-gray-500">Retry</span>
                            <div className="text-white">
                              {detailRun.retryCount ?? 0}/{detailRun.maxAttempts ?? "-"}
                            </div>
                          </div>
                          <div>
                            <span className="uppercase text-gray-500">Next retry</span>
                            <div className="text-white">{formatDate(detailRun.nextRetryAt)}</div>
                          </div>
                          <div>
                            <span className="uppercase text-gray-500">Trigger node</span>
                            <div className="text-white">{detailRun.triggerNodeId ?? "-"}</div>
                          </div>
                        </div>

                        <details className="rounded-md border border-border/70 bg-black/20 p-3">
                          <summary className="cursor-pointer text-[11px] uppercase text-gray-400">
                            Run history
                          </summary>
                          {historyOptions.length > 1 ? (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <Label className="text-[10px] uppercase text-gray-500">
                                Node
                              </Label>
                                                              <Select
                                                                {...(selectedHistoryNodeId != null ? { value: selectedHistoryNodeId } : {})}
                                                                onValueChange={(value: string) =>
                                                                  setHistorySelection((prev: Record<string, string>) => ({ ...prev, [run.id]: value }))
                                                                }
                                                              >
                                                                <SelectTrigger className="h-7 w-[220px] border-border bg-card/70 text-[11px] text-white">
                                                                  <SelectValue placeholder="Select node" />
                                                                </SelectTrigger>
                                                                <SelectContent className="border-border bg-gray-900 text-white">
                                                                  {historyOptions.map((option: { id: string; label: string }) => (
                                                                    <SelectItem key={option.id} value={option.id}>
                                                                      {option.label}
                                                                    </SelectItem>
                                                                  ))}
                                                                </SelectContent>
                                                              </Select>                            </div>
                          ) : (
                            <div className="mt-2 text-[11px] text-gray-500">
                              {historyOptions[0]?.label ?? "No history nodes"}
                            </div>
                          )}
                          <div className="mt-3">
                            <RunHistoryEntries
                              entries={historyEntries}
                              emptyMessage="No history recorded for this run."
                              showNodeLabel
                            />
                          </div>
                        </details>

                        <details className="rounded-md border border-border/70 bg-black/20 p-3">
                          <summary className="cursor-pointer text-[11px] uppercase text-gray-400">
                            Nodes ({nodes.length})
                          </summary>
                          {nodes.length === 0 ? (
                            <div className="mt-2 text-[11px] text-gray-500">
                              No nodes recorded for this run.
                            </div>
                                                      ) : (
                                                        <div className="mt-3 space-y-2">
                                                          {nodes.map((node: AiPathRunNodeRecord) => (
                                                            <details
                                                              key={node.id}
                                                              className="rounded-md border border-border/60 bg-black/30 p-3"
                                                            >                                  <summary className="cursor-pointer text-[11px] text-gray-300">
                                    {node.nodeTitle ?? node.nodeId}{" "}
                                    {node.nodeType ? `(${node.nodeType})` : ""}
                                    <span className="ml-2 text-gray-500">
                                      {node.status}
                                    </span>
                                  </summary>
                                  <div className="mt-2 grid gap-2 text-[11px] text-gray-400 sm:grid-cols-2 lg:grid-cols-3">
                                    <div>
                                      <span className="uppercase text-gray-500">Started</span>
                                      <div className="text-white">{formatDate(node.startedAt)}</div>
                                    </div>
                                    <div>
                                      <span className="uppercase text-gray-500">Finished</span>
                                      <div className="text-white">{formatDate(node.finishedAt)}</div>
                                    </div>
                                    <div>
                                      <span className="uppercase text-gray-500">Attempt</span>
                                      <div className="text-white">{node.attempt}</div>
                                    </div>
                                  </div>
                                  {node.errorMessage ? (
                                    <div className="mt-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-[11px] text-rose-200">
                                      Error: {node.errorMessage}
                                    </div>
                                  ) : null}
                                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                    <div>
                                      <Label className="text-[10px] uppercase text-gray-500">
                                        Inputs
                                      </Label>
                                      <Textarea
                                        className="mt-2 min-h-[120px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200"
                                        readOnly
                                        value={safePrettyJson(node.inputs)}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] uppercase text-gray-500">
                                        Outputs
                                      </Label>
                                      <Textarea
                                        className="mt-2 min-h-[120px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200"
                                        readOnly
                                        value={safePrettyJson(node.outputs)}
                                      />
                                    </div>
                                  </div>
                                </details>
                              ))}
                            </div>
                          )}
                        </details>

                        <details className="rounded-md border border-border/70 bg-black/20 p-3">
                          <summary className="cursor-pointer text-[11px] uppercase text-gray-400">
                            Events ({events.length})
                          </summary>
                          {events.length === 0 ? (
                            <div className="mt-2 text-[11px] text-gray-500">No events.</div>
                                                      ) : (
                                                        <div className="mt-3 divide-y divide-border/70">
                                                          {events.map((event: AiPathRunEventRecord) => (
                                                            <div key={event.id} className="py-2">                                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                                    <span>{formatDate(event.createdAt)}</span>
                                    <span className="rounded-full border px-2 py-0.5 text-[10px] text-gray-300">
                                      {event.level}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-sm text-white">{event.message}</div>
                                  {event.metadata ? (
                                    <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-border bg-black/30 p-2 text-[11px] text-gray-200">
                                      {safePrettyJson(event.metadata)}
                                    </pre>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          )}
                        </details>

                        <details className="rounded-md border border-border/70 bg-black/20 p-3">
                          <summary className="cursor-pointer text-[11px] uppercase text-gray-400">
                            Runtime state
                          </summary>
                          <div className="mt-3 grid gap-3 lg:grid-cols-2">
                            <div>
                              <Label className="text-[10px] uppercase text-gray-500">Inputs</Label>
                              <Textarea
                                className="mt-2 min-h-[120px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200"
                                readOnly
                                value={safePrettyJson(detailRun.runtimeState?.inputs)}
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] uppercase text-gray-500">Outputs</Label>
                              <Textarea
                                className="mt-2 min-h-[120px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200"
                                readOnly
                                value={safePrettyJson(detailRun.runtimeState?.outputs)}
                              />
                            </div>
                          </div>
                          <div className="mt-3">
                            <Label className="text-[10px] uppercase text-gray-500">Hashes</Label>
                            <Textarea
                              className="mt-2 min-h-[80px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200"
                              readOnly
                              value={safePrettyJson(detailRun.runtimeState?.hashes)}
                            />
                          </div>
                        </details>

                        <details className="rounded-md border border-border/70 bg-black/20 p-3">
                          <summary className="cursor-pointer text-[11px] uppercase text-gray-400">
                            Graph snapshot
                          </summary>
                          <Textarea
                            className="mt-2 min-h-[160px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200"
                            readOnly
                            value={safePrettyJson(detailRun.graph)}
                          />
                        </details>

                        <details className="rounded-md border border-border/70 bg-black/20 p-3">
                          <summary className="cursor-pointer text-[11px] uppercase text-gray-400">
                            Raw payloads
                          </summary>
                          <div className="mt-3 space-y-3">
                            <div>
                              <Label className="text-[10px] uppercase text-gray-500">Run</Label>
                              <Textarea
                                className="mt-2 min-h-[140px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200"
                                readOnly
                                value={safePrettyJson(detailRun)}
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] uppercase text-gray-500">Nodes</Label>
                              <Textarea
                                className="mt-2 min-h-[140px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200"
                                readOnly
                                value={safePrettyJson(nodes)}
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] uppercase text-gray-500">Events</Label>
                              <Textarea
                                className="mt-2 min-h-[120px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200"
                                readOnly
                                value={safePrettyJson(events)}
                              />
                            </div>
                          </div>
                        </details>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
