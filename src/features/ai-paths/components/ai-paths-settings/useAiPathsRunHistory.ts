"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  runsApi,
  type AiPathRunEventRecord,
  type AiPathRunNodeRecord,
  type AiPathRunRecord,
  type RuntimeHistoryEntry,
} from "@/features/ai-paths/lib";
import { buildHistoryNodeOptions, type HistoryNodeOption } from "../run-history-utils";
import type { RunHistoryFilter } from "../run-history-panel";

type ToastFn = (message: string, options?: Partial<{ variant: "success" | "error" | "info"; duration: number }>) => void;

type UseAiPathsRunHistoryArgs = {
  activePathId: string | null;
  toast: ToastFn;
};

type UseAiPathsRunHistoryResult = {
  runsQuery: ReturnType<typeof useQuery>;
  runList: AiPathRunRecord[];
  runFilter: RunHistoryFilter;
  setRunFilter: React.Dispatch<React.SetStateAction<RunHistoryFilter>>;
  expandedRunHistory: Record<string, boolean>;
  setExpandedRunHistory: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  runHistorySelection: Record<string, string>;
  setRunHistorySelection: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  runDetailOpen: boolean;
  setRunDetailOpen: React.Dispatch<React.SetStateAction<boolean>>;
  runDetailLoading: boolean;
  runDetail: {
    run: AiPathRunRecord;
    nodes: AiPathRunNodeRecord[];
    events: AiPathRunEventRecord[];
  } | null;
  setRunDetail: React.Dispatch<
    React.SetStateAction<{
      run: AiPathRunRecord;
      nodes: AiPathRunNodeRecord[];
      events: AiPathRunEventRecord[];
    } | null>
  >;
  runStreamStatus: "connecting" | "live" | "stopped" | "paused";
  runStreamPaused: boolean;
  setRunStreamPaused: React.Dispatch<React.SetStateAction<boolean>>;
  runNodeSummary: { counts: Record<string, number>; total: number; completed: number; progress: number } | null;
  runEventsOverflow: boolean;
  runEventsBatchLimit: number | null;
  runDetailHistoryOptions: HistoryNodeOption[];
  runDetailSelectedHistoryNodeId: string | null;
  runDetailSelectedHistoryEntries: RuntimeHistoryEntry[];
  setRunHistoryNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  handleOpenRunDetail: (runId: string) => Promise<void>;
  handleResumeRun: (runId: string, mode: "resume" | "replay") => Promise<void>;
  handleCancelRun: (runId: string) => Promise<void>;
  handleRequeueDeadLetter: (runId: string) => Promise<void>;
};

export function useAiPathsRunHistory({
  activePathId,
  toast,
}: UseAiPathsRunHistoryArgs): UseAiPathsRunHistoryResult {
  const [runDetailOpen, setRunDetailOpen] = useState(false);
  const [runDetailLoading, setRunDetailLoading] = useState(false);
  const [runFilter, setRunFilter] = useState<RunHistoryFilter>("all");
  const [runDetail, setRunDetail] = useState<{
    run: AiPathRunRecord;
    nodes: AiPathRunNodeRecord[];
    events: AiPathRunEventRecord[];
  } | null>(null);
  const [runHistoryNodeId, setRunHistoryNodeId] = useState<string | null>(null);
  const [expandedRunHistory, setExpandedRunHistory] = useState<Record<string, boolean>>({});
  const [runHistorySelection, setRunHistorySelection] = useState<Record<string, string>>({});
  const [runStreamStatus, setRunStreamStatus] = useState<"connecting" | "live" | "stopped" | "paused">("stopped");
  const [runStreamPaused, setRunStreamPaused] = useState(false);
  const [runEventsOverflow, setRunEventsOverflow] = useState(false);
  const [runEventsBatchLimit, setRunEventsBatchLimit] = useState<number | null>(null);

  useEffect(() => {
    if (!runDetailOpen || !runDetail?.run?.id) {
      setRunStreamStatus("stopped");
      return;
    }
    if (runStreamPaused) {
      setRunStreamStatus("paused");
      return;
    }

    const runId = runDetail.run.id;
    const params = new URLSearchParams();
    const latestEventTimestamp = runDetail.events?.length
      ? runDetail.events.reduce<string | null>(
          (max: string | null, event: AiPathRunEventRecord) => {
            const time = new Date(event.createdAt).getTime();
            if (!Number.isFinite(time)) return max;
            if (!max) return new Date(time).toISOString();
            return time > new Date(max).getTime() ? new Date(time).toISOString() : max;
          },
          null
        )
      : null;
    if (latestEventTimestamp) {
      params.set("since", latestEventTimestamp);
    }
    const url = params.toString()
      ? `/api/ai-paths/runs/${encodeURIComponent(runId)}/stream?${params.toString()}`
      : `/api/ai-paths/runs/${encodeURIComponent(runId)}/stream`;
    const source = new EventSource(url);
    setRunStreamStatus("connecting");

    const mergeEvents = (incoming: AiPathRunEventRecord[]): void => {
      setRunDetail((prev: { run: AiPathRunRecord; nodes: AiPathRunNodeRecord[]; events: AiPathRunEventRecord[] } | null) => {
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

    source.addEventListener("ready", () => {
      setRunStreamStatus("live");
    });
    source.addEventListener("run", (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data as string) as AiPathRunRecord;
        setRunDetail((prev: { run: AiPathRunRecord; nodes: AiPathRunNodeRecord[]; events: AiPathRunEventRecord[] } | null) => (prev ? { ...prev, run: payload } : prev));
      } catch {
        // ignore parse errors
      }
    });
    source.addEventListener("nodes", (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data as string) as AiPathRunNodeRecord[];
        setRunDetail((prev: { run: AiPathRunRecord; nodes: AiPathRunNodeRecord[]; events: AiPathRunEventRecord[] } | null) => (prev ? { ...prev, nodes: payload } : prev));
      } catch {
        // ignore parse errors
      }
    });
    source.addEventListener("events", (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data as string) as
          | AiPathRunEventRecord[]
          | { events?: AiPathRunEventRecord[]; overflow?: boolean; limit?: number };
        if (Array.isArray(payload)) {
          mergeEvents(payload);
          setRunEventsOverflow(false);
          setRunEventsBatchLimit(null);
          return;
        }
        const events = Array.isArray(payload.events) ? payload.events : [];
        mergeEvents(events);
        if (typeof payload.limit === "number") {
          setRunEventsBatchLimit(payload.limit);
        }
        if (payload.overflow) {
          setRunEventsOverflow(true);
        } else {
          setRunEventsOverflow(false);
        }
      } catch {
        // ignore parse errors
      }
    });
    source.addEventListener("done", () => {
      setRunStreamStatus("stopped");
      source.close();
    });
    source.addEventListener("error", () => {
      setRunStreamStatus("stopped");
    });

    return (): void => {
      source.close();
      setRunStreamStatus("stopped");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runDetailOpen, runDetail?.run?.id, runStreamPaused]);

  useEffect(() => {
    setRunEventsOverflow(false);
    setRunEventsBatchLimit(null);
  }, [runDetail?.run?.id]);

  const runNodeSummary = useMemo(() => {
    if (!runDetail) return null;
    const counts: Record<string, number> = {};
    runDetail.nodes.forEach((node: AiPathRunNodeRecord) => {
      const status = node.status ?? "unknown";
      counts[status] = (counts[status] ?? 0) + 1;
    });
    const total = runDetail.nodes.length;
    const completed = counts.completed ?? 0;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { counts, total, completed, progress };
  }, [runDetail]);

  const runDetailHistory = runDetail?.run?.runtimeState?.history;
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
      setRunHistoryNodeId(null);
      return;
    }
    const firstHistoryOption = runDetailHistoryOptions.at(0);
    if (!firstHistoryOption) {
      setRunHistoryNodeId(null);
      return;
    }
    if (
      runHistoryNodeId &&
      runDetailHistoryOptions.some((option: HistoryNodeOption) => option.id === runHistoryNodeId)
    ) {
      return;
    }
    setRunHistoryNodeId(firstHistoryOption.id);
  }, [runDetail?.run?.id, runDetailHistoryOptions, runHistoryNodeId]);

  const runDetailSelectedHistoryNodeId =
    runHistoryNodeId ?? runDetailHistoryOptions.at(0)?.id ?? null;
  const runDetailSelectedHistoryEntries =
    runDetailSelectedHistoryNodeId && runDetailHistory
      ? runDetailHistory[runDetailSelectedHistoryNodeId] ?? []
      : [];

  const runsQuery = useQuery({
    queryKey: ["ai-paths-runs", activePathId],
    queryFn: async () => {
      const res = await runsApi.list({ ...(activePathId ? { pathId: activePathId } : {}) });
      return res as unknown as { ok: boolean; data: { runs: AiPathRunRecord[] } };
    },
    enabled: Boolean(activePathId),
    refetchInterval: (data: unknown): number | false => {
      const d: { ok: boolean; data: { runs: AiPathRunRecord[] } } | undefined = data as
        | { ok: boolean; data: { runs: AiPathRunRecord[] } }
        | undefined;
      if (!d || !d.ok) return false;
      const runs: AiPathRunRecord[] = d.data?.runs ?? [];
      const hasActive: boolean = runs.some(
        (run: AiPathRunRecord): boolean => run.status === "queued" || run.status === "running"
      );
      return hasActive ? 5000 : false;
    },
  });

  const runList = useMemo((): AiPathRunRecord[] => {
    if (!runsQuery.data || !runsQuery.data.ok) return [] as AiPathRunRecord[];
    return runsQuery.data.data.runs ?? [];
  }, [runsQuery.data]);

  const handleOpenRunDetail = async (runId: string): Promise<void> => {
    setRunDetailOpen(true);
    setRunDetailLoading(true);
    try {
      const response = await runsApi.get(runId);
      if (!response.ok) {
        throw new Error(response.error || "Failed to load run details.");
      }
      const data = response.data as {
        run: AiPathRunRecord;
        nodes: AiPathRunNodeRecord[];
        events: AiPathRunEventRecord[];
      };
      setRunDetail(data);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to load run details.", {
        variant: "error",
      });
      setRunDetail(null);
    } finally {
      setRunDetailLoading(false);
    }
  };

  const handleResumeRun = async (runId: string, mode: "resume" | "replay"): Promise<void> => {
    const response = await runsApi.resume(runId, mode);
    if (!response.ok) {
      toast(response.error || "Failed to resume run.", { variant: "error" });
      return;
    }
    toast(mode === "resume" ? "Run resumed." : "Run replay queued.", {
      variant: "success",
    });
    void runsQuery.refetch();
  };

  const handleCancelRun = async (runId: string): Promise<void> => {
    const response = await runsApi.cancel(runId);
    if (!response.ok) {
      toast(response.error || "Failed to cancel run.", { variant: "error" });
      return;
    }
    toast("Run canceled.", { variant: "success" });
    void runsQuery.refetch();
  };

  const handleRequeueDeadLetter = async (runId: string): Promise<void> => {
    const response = await runsApi.resume(runId, "replay");
    if (!response.ok) {
      toast(response.error || "Failed to requeue run.", { variant: "error" });
      return;
    }
    toast("Dead-letter run requeued.", { variant: "success" });
    void runsQuery.refetch();
  };

  return {
    runsQuery,
    runList,
    runFilter,
    setRunFilter,
    expandedRunHistory,
    setExpandedRunHistory,
    runHistorySelection,
    setRunHistorySelection,
    runDetailOpen,
    setRunDetailOpen,
    runDetailLoading,
    runDetail,
    setRunDetail,
    runStreamStatus,
    runStreamPaused,
    setRunStreamPaused,
    runNodeSummary,
    runEventsOverflow,
    runEventsBatchLimit,
    runDetailHistoryOptions,
    runDetailSelectedHistoryNodeId,
    runDetailSelectedHistoryEntries,
    setRunHistoryNodeId,
    handleOpenRunDetail,
    handleResumeRun,
    handleCancelRun,
    handleRequeueDeadLetter,
  };
}
