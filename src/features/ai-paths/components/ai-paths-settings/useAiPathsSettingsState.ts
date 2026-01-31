"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/shared/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { logClientError } from "@/features/observability";
import { useUpdateSetting } from "@/shared/hooks/useSettings";
import { evaluateGraph, dbApi, aiJobsApi, entityApi, runsApi } from "@/features/ai-paths/lib";
import { buildHistoryNodeOptions, type HistoryNodeOption } from "../run-history-utils";
import { DOCS_DESCRIPTION_SNIPPET, DOCS_JOBS_SNIPPET, DOCS_WIRING_SNIPPET } from "./docs-snippets";
import { useAiPathsCanvasInteractions } from "./useAiPathsCanvasInteractions";
import { useAiPathsPersistence } from "./useAiPathsPersistence";
import type { RunHistoryFilter } from "../run-history-panel";
import type { ClusterPresetDraft } from "../cluster-presets-panel";
import type {
  AiNode,
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
  ClusterPreset,
  DbQueryConfig,
  DbQueryPreset,
  DbNodePreset,
  Edge,
  NodeConfig,
  ParserSampleState,
  PathConfig,
  PathDebugEntry,
  PathDebugSnapshot,
  PathMeta,
  RuntimePortValues,
  RuntimeState,
  UpdaterSampleState,
} from "@/features/ai-paths/lib";
import {
  AI_PATHS_LAST_ERROR_KEY,
  BUNDLE_INPUT_PORTS,
  CLUSTER_PRESETS_KEY,
  DB_QUERY_PRESETS_KEY,
  DB_NODE_PRESETS_KEY,
  DEFAULT_MODELS,
  PATH_DEBUG_PREFIX,
  PATH_INDEX_KEY,
  STORAGE_VERSION,
  TEMPLATE_INPUT_PORTS,
  TRIGGER_EVENTS,
  createAiDescriptionPath,
  createDefaultPathConfig,
  createPathId,
  createPathMeta,
  createPresetId,
  coerceInput,
  initialEdges,
  initialNodes,
  normalizeNodes,
  palette,
  parsePathList,
  safeStringify,
  sanitizeEdges,
  triggers,
} from "@/features/ai-paths/lib";
import {
  DEFAULT_DB_QUERY,
  safeJsonStringify,
  parseRuntimeState,
  serializePathConfigs,
  pollDatabaseQuery,
  pollGraphJob,
} from "../AiPathsSettingsUtils";

type AiPathsSettingsStateOptions = {
  activeTab: "canvas" | "paths" | "docs" | "queue";
};

const DEFAULT_PRESET_DRAFT: ClusterPresetDraft = {
  name: "",
  description: "",
  bundlePorts: "context\nmeta\ntrigger\nentityJson\nentityId\nentityType\nresult",
  template: "Write a summary for {{context.entity.title}}",
};

export function useAiPathsSettingsState({ activeTab }: AiPathsSettingsStateOptions) {
  const { toast } = useToast();
  const normalizeTriggerLabel = (value?: string | null): string =>
    value === "Product Modal - Context Grabber"
      ? "Product Modal - Context Filter"
      : value ?? (triggers[0] ?? "Product Modal - Context Filter");
  const [nodes, setNodes] = useState<AiNode[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [paths, setPaths] = useState<PathMeta[]>([]);
  const [pathConfigs, setPathConfigs] = useState<Record<string, PathConfig>>({});
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    initialNodes[0]?.id ?? null
  );
  const [loading, setLoading] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [simulationOpenNodeId, setSimulationOpenNodeId] = useState<string | null>(
    null
  );
  const [pathName, setPathName] = useState("AI Description Path");
  const [pathDescription, setPathDescription] = useState(
    "Visual analysis + description generation with structured updates."
  );
  const [activeTrigger, setActiveTrigger] = useState(triggers[0] ?? "");
  const [parserSamples, setParserSamples] = useState<Record<string, ParserSampleState>>(
    {}
  );
  const [updaterSamples, setUpdaterSamples] = useState<Record<string, UpdaterSampleState>>(
    {}
  );
  const [runtimeState, setRuntimeState] = useState<RuntimeState>({
    inputs: {},
    outputs: {},
  });
  const [pathDebugSnapshots, setPathDebugSnapshots] = useState<
    Record<string, PathDebugSnapshot>
  >({});
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
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [sendingToAi, setSendingToAi] = useState(false);
  const [lastError, setLastError] = useState<{
    message: string;
    time: string;
    pathId?: string | null;
  } | null>(null);
  const [clusterPresets, setClusterPresets] = useState<ClusterPreset[]>([]);
  const [dbQueryPresets, setDbQueryPresets] = useState<DbQueryPreset[]>([]);
  const [dbNodePresets, setDbNodePresets] = useState<DbNodePreset[]>([]);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetDraft, setPresetDraft] = useState<ClusterPresetDraft>(DEFAULT_PRESET_DRAFT);

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
      ? runDetail.events.reduce<string | null>((max: string | null, event: AiPathRunEventRecord) => {
          const time = new Date(event.createdAt).getTime();
          if (!Number.isFinite(time)) return max;
          if (!max) return new Date(time).toISOString();
          return time > new Date(max).getTime() ? new Date(time).toISOString() : max;
        }, null)
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
      setRunDetail((prev: typeof runDetail) => {
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
        setRunDetail((prev: typeof runDetail) => (prev ? { ...prev, run: payload } : prev));
      } catch {
        // ignore parse errors
      }
    });
    source.addEventListener("nodes", (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data as string) as AiPathRunNodeRecord[];
        setRunDetail((prev: typeof runDetail) => (prev ? { ...prev, nodes: payload } : prev));
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
    if (runHistoryNodeId && runDetailHistoryOptions.some((option: HistoryNodeOption) => option.id === runHistoryNodeId)) {
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
  const lastGraphModelPayload = useMemo(() => {
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      const node = nodes[index];
      if (!node || node.type !== "model") continue;
      const output = runtimeState.outputs[node.id] as
        | { debugPayload?: unknown }
        | undefined;
      if (output?.debugPayload) {
        return output.debugPayload;
      }
    }
    return null;
  }, [nodes, runtimeState.outputs]);
  const [presetsModalOpen, setPresetsModalOpen] = useState(false);
  const [presetsJson, setPresetsJson] = useState("");
  const [expandedPaletteGroups, setExpandedPaletteGroups] = useState<Set<string>>(
    new Set(["Triggers"])
  );
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const [loadNonce, setLoadNonce] = useState(0);
  const pollInFlightRef = useRef<Set<string>>(new Set());
  const lastTriggerNodeIdRef = useRef<string | null>(null);
  const triggerContextRef = useRef<Record<string, unknown> | null>(null);
  const runtimeStateRef = useRef<RuntimeState>({ inputs: {}, outputs: {} });
  const queryClient = useQueryClient();
  const updateSettingMutation = useUpdateSetting();
  const enqueueAiJobMutation = useMutation({
    mutationFn: async (payload: { productId: string; type: string; payload: unknown }): Promise<unknown> => {
      const result = await aiJobsApi.enqueue(payload);
      if (!result.ok) {
        throw new Error(result.error || "Failed to enqueue AI job.");
      }
      return result.data;
    },
  });

  // Parser sample fetching mutation
  const fetchParserSampleMutation = useMutation({
    mutationFn: async ({
      nodeId,
      entityType,
      entityId,
    }: {
      nodeId: string;
      entityType: string;
      entityId: string;
    }): Promise<{ nodeId: string; entityType: string; entityId: string; sample: Record<string, unknown> }> => {
      if (!entityId.trim()) {
        throw new Error("Enter an entity ID to load a sample.");
      }
      if (entityType === "custom") {
        throw new Error("Use pasted JSON for custom samples.");
      }
      const normalized = entityType.toLowerCase();
      let sample: Record<string, unknown> | null = null;
      if (normalized === "product") {
        sample = await queryClient.fetchQuery({
          queryKey: ["products", entityId],
          queryFn: async () => {
            const result = await entityApi.getProduct(entityId);
            return result.ok ? result.data : null;
          },
          staleTime: 0,
        });
      } else if (normalized === "note") {
        sample = await queryClient.fetchQuery({
          queryKey: ["notes", entityId],
          queryFn: async () => {
            const result = await entityApi.getNote(entityId);
            return result.ok ? result.data : null;
          },
          staleTime: 0,
        });
      }
      if (!sample) {
        throw new Error("No sample found for that ID.");
      }
      return { nodeId, entityType, entityId, sample };
    },
    onSuccess: ({ nodeId, entityType, entityId, sample }: { nodeId: string; entityType: string; entityId: string; sample: unknown }): void => {
      setParserSamples((prev: Record<string, ParserSampleState>) => ({
        ...prev,
        [nodeId]: {
          entityType,
          entityId,
          json: JSON.stringify(sample, null, 2),
          mappingMode: prev[nodeId]?.mappingMode ?? "top",
          depth: prev[nodeId]?.depth ?? 2,
          keyStyle: prev[nodeId]?.keyStyle ?? "path",
          includeContainers: prev[nodeId]?.includeContainers ?? false,
        },
      }));
    },
    onError: (error: Error): void => {
      toast(error instanceof Error ? error.message : "Failed to fetch sample.", { variant: "error" });
    },
  });

  // Updater sample fetching mutation
  const fetchUpdaterSampleMutation = useMutation({
    mutationFn: async ({
      nodeId,
      entityType,
      entityId,
    }: {
      nodeId: string;
      entityType: string;
      entityId: string;
    }): Promise<{ nodeId: string; entityType: string; entityId: string; sample: unknown }> => {
      if (entityType === "custom") {
        throw new Error("Use pasted JSON for custom samples.");
      }
      let sample: unknown = null;
      let fetchedId = entityId;

      // If no entityId provided, fetch first document from collection
      if (!entityId.trim()) {
        const data = await queryClient.fetchQuery({
          queryKey: ["db-browse-sample", entityType],
          queryFn: async () => {
            const result = await dbApi.browse(entityType, { limit: 1 });
            if (!result.ok) return { documents: [] as Record<string, unknown>[] };
            return { documents: result.data.documents ?? [] };
          },
          staleTime: 0,
        });
        const firstDoc = data.documents?.[0];
        if (firstDoc) {
          sample = firstDoc;
          const rawId = firstDoc._id ?? firstDoc.id;
          fetchedId = (rawId as { toString?: () => string })?.toString?.() ?? "";
        }
      } else {
        const normalized = entityType.toLowerCase();
        if (normalized === "product") {
          sample = await queryClient.fetchQuery({
            queryKey: ["products", entityId],
            queryFn: async () => {
              const result = await entityApi.getProduct(entityId);
              return result.ok ? result.data : null;
            },
            staleTime: 0,
          });
        } else if (normalized === "note") {
          sample = await queryClient.fetchQuery({
            queryKey: ["notes", entityId],
            queryFn: async () => {
              const result = await entityApi.getNote(entityId);
              return result.ok ? result.data : null;
            },
            staleTime: 0,
          });
        }
      }

      if (!sample) {
        throw new Error("No sample found.");
      }
      return { nodeId, entityType, entityId: fetchedId, sample };
    },
    onSuccess: ({ nodeId, entityType, entityId, sample }: { nodeId: string; entityType: string; entityId: string; sample: unknown }): void => {
      setUpdaterSamples((prev: Record<string, UpdaterSampleState>) => ({
        ...prev,
        [nodeId]: {
          entityType,
          entityId,
          json: JSON.stringify(sample, null, 2),
          depth: prev[nodeId]?.depth ?? 2,
          includeContainers: prev[nodeId]?.includeContainers ?? false,
        },
      }));
      toast("Sample fetched.", { variant: "success" });
    },
    onError: (error: Error): void => {
      toast(error instanceof Error ? error.message : "Failed to fetch sample.", { variant: "error" });
    },
  });

  // Derived loading states from mutations
  const parserSampleLoading = fetchParserSampleMutation.isPending;
  const updaterSampleLoading = fetchUpdaterSampleMutation.isPending;

  const persistLastError = useCallback(
    async (
      payload: { message: string; time: string; pathId?: string | null } | null
    ): Promise<void> => {
      try {
        await updateSettingMutation.mutateAsync({
          key: AI_PATHS_LAST_ERROR_KEY,
          value: payload ? JSON.stringify(payload) : "",
        });
      } catch (error: unknown) {
        console.warn("[AI Paths] Failed to persist last error.", error);
      }
    },
    [updateSettingMutation]
  );

  const saveClusterPresets = async (nextPresets: ClusterPreset[]): Promise<void> => {
    try {
      await updateSettingMutation.mutateAsync({
        key: CLUSTER_PRESETS_KEY,
        value: JSON.stringify(nextPresets),
      });
    } catch (error: unknown) {
      reportAiPathsError(error, { action: "saveClusterPresets" }, "Failed to save presets:");
      toast("Failed to save cluster presets.", { variant: "error" });
    }
  };

  const saveDbQueryPresets = async (nextPresets: DbQueryPreset[]): Promise<void> => {
    try {
      await updateSettingMutation.mutateAsync({
        key: DB_QUERY_PRESETS_KEY,
        value: JSON.stringify(nextPresets),
      });
    } catch (error: unknown) {
      reportAiPathsError(error, { action: "saveDbQueryPresets" }, "Failed to save query presets:");
      toast("Failed to save query presets.", { variant: "error" });
    }
  };

  const saveDbNodePresets = async (nextPresets: DbNodePreset[]): Promise<void> => {
    try {
      await updateSettingMutation.mutateAsync({
        key: DB_NODE_PRESETS_KEY,
        value: JSON.stringify(nextPresets),
      });
    } catch (error: unknown) {
      reportAiPathsError(error, { action: "saveDbNodePresets" }, "Failed to save database presets:");
      toast("Failed to save database presets.", { variant: "error" });
    }
  };

  const normalizePreset = (raw: Partial<ClusterPreset>): ClusterPreset => {
    const now = new Date().toISOString();
    const bundlePorts = Array.isArray(raw.bundlePorts) ? raw.bundlePorts : [];
    return {
      id: raw.id && typeof raw.id === "string" ? raw.id : createPresetId(),
      name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Cluster Preset",
      description: typeof raw.description === "string" ? raw.description : "",
      bundlePorts,
      template: typeof raw.template === "string" ? raw.template : "",
      createdAt: raw.createdAt ?? now,
      updatedAt: raw.updatedAt ?? now,
    };
  };

  const normalizeDbQueryPreset = (raw: Partial<DbQueryPreset>): DbQueryPreset => {
    const now = new Date().toISOString();
    return {
      id: raw.id && typeof raw.id === "string" ? raw.id : createPresetId(),
      name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Query Preset",
      queryTemplate:
        typeof raw.queryTemplate === "string" && raw.queryTemplate.trim()
          ? raw.queryTemplate
          : "{\n  \"_id\": \"{{value}}\"\n}",
      updateTemplate:
        typeof raw.updateTemplate === "string" ? raw.updateTemplate : "",
      createdAt: raw.createdAt ?? now,
      updatedAt: raw.updatedAt ?? now,
    };
  };

  const normalizeDbNodePreset = (raw: Partial<DbNodePreset>): DbNodePreset => {
    const now = new Date().toISOString();
    return {
      id: raw.id && typeof raw.id === "string" ? raw.id : createPresetId(),
      name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Database Preset",
      description: typeof raw.description === "string" ? raw.description : "",
      config: raw.config && typeof raw.config === "object" ? raw.config : ({ operation: "query" } as DbNodePreset["config"]),
      createdAt: raw.createdAt ?? now,
      updatedAt: raw.updatedAt ?? now,
    };
  };

  const togglePaletteGroup = (title: string): void => {
    setExpandedPaletteGroups((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const reportAiPathsError = useCallback(
    (
      error: unknown,
      context: Record<string, unknown>,
      fallbackMessage?: string
    ): void => {
      const rawMessage = error instanceof Error ? error.message : safeStringify(error);
      const summary = (fallbackMessage ?? rawMessage).replace(/:$/, "");
      const logMessage = `[AI Paths] ${summary}`;
      const logError = new Error(logMessage);
      if (error instanceof Error && error.stack) {
        logError.stack = error.stack;
        logError.name = error.name;
      }
      console.error(fallbackMessage ?? "AI Paths error:", error);
      const payload = {
        message: summary,
        time: new Date().toISOString(),
        pathId: activePathId,
      };
      setLastError(payload);
      void persistLastError(payload);
      logClientError(logError, {
        context: {
          feature: "ai-paths",
          pathId: activePathId,
          pathName,
          tab: activeTab,
          nodeCount: nodes.length,
          edgeCount: edges.length,
          errorSummary: summary,
          rawMessage,
          ...context,
        },
      });
    },
    [activePathId, activeTab, edges.length, nodes.length, pathName, persistLastError]
  );

  const {
    saving,
    autoSaveStatus,
    autoSaveAt,
    handleSave,
    persistPathSettings,
    persistPreferences,
    persistSettingsBulk,
    savePathIndex,
    syncNodesRef,
  } = useAiPathsPersistence({
    activePathId,
    activeTrigger,
    edges,
    expandedPaletteGroups,
    lastRunAt,
    loadNonce,
    loading,
    nodes,
    paletteCollapsed,
    parserSamples,
    pathConfigs,
    pathDescription,
    pathName,
    paths,
    runtimeState,
    updaterSamples,
    normalizeDbNodePreset,
    normalizeDbQueryPreset,
    normalizeTriggerLabel,
    persistLastError,
    reportAiPathsError,
    setActivePathId,
    setActiveTrigger,
    setClusterPresets,
    setDbNodePresets,
    setDbQueryPresets,
    setEdges,
    setExpandedPaletteGroups,
    setLastError,
    setLastRunAt,
    setLoading,
    setNodes,
    setPaletteCollapsed,
    setParserSamples,
    setPathConfigs,
    setPathDebugSnapshots,
    setPathDescription,
    setPathName,
    setPaths,
    setRuntimeState,
    setSelectedNodeId,
    setUpdaterSamples,
    toast,
  });

  const modelsQuery = useQuery<{ models?: string[] }>({
    queryKey: ["ai-paths-models"],
    queryFn: async (): Promise<{ models?: string[] }> => {
      const res = await fetch("/api/chatbot");
      if (!res.ok) {
        throw new Error("Failed to load models.");
      }
      return (await res.json()) as { models?: string[] };
    },
    staleTime: 1000 * 60 * 5,
  });

  const modelOptions = useMemo((): string[] => {
    const apiModels = modelsQuery.data?.models;
    const savedModels = nodes
      .filter((node: AiNode): boolean => node.type === "model")
      .map((node: AiNode): string | undefined => node.config?.model?.modelId)
      .filter((modelId: string | undefined): modelId is string => Boolean(modelId && modelId.trim()));
    return Array.from(
      new Set([
        ...DEFAULT_MODELS,
        ...(Array.isArray(apiModels) ? apiModels : []),
        ...savedModels,
      ])
    );
  }, [modelsQuery.data, nodes]);

  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (!res.ok) return null;
      return (await res.json()) as {
        user?: { id?: string; name?: string | null; email?: string | null };
      };
    },
    staleTime: 0,
  });

  const sessionUser = useMemo(() => {
    const user = sessionQuery.data?.user;
    if (!user) return null;
    return {
      id: user.id,
      name: user.name ?? null,
      email: user.email ?? null,
    };
  }, [sessionQuery.data]);

  const runsQuery = useQuery({
    queryKey: ["ai-paths-runs", activePathId],
    queryFn: async (): Promise<{ ok: boolean; data: { runs: AiPathRunRecord[] } }> => runsApi.list({ ...(activePathId ? { pathId: activePathId } : {}) }),
    enabled: Boolean(activePathId),
    refetchInterval: (data: unknown): number | false => {
      const d: { ok: boolean; data: { runs: AiPathRunRecord[] } } | undefined = data as { ok: boolean; data: { runs: AiPathRunRecord[] } } | undefined;
      if (!d || !d.ok) return false;
      const runs: AiPathRunRecord[] = d.data?.runs ?? [];
      const hasActive: boolean = runs.some(
        (run: AiPathRunRecord): boolean => run.status === "queued" || run.status === "running"
      );
      return hasActive ? 5000 : false;
    },
  });


  useEffect((): void => {
    runtimeStateRef.current = runtimeState;
  }, [runtimeState]);

  const pruneRuntimeInputs = useCallback(
    (state: RuntimeState, removedEdges: Edge[], remainingEdges: Edge[]): RuntimeState => {
      if (removedEdges.length === 0) return state;
      const remainingTargets = new Set<string>();
      remainingEdges.forEach((edge: Edge) => {
        if (!edge.toPort) return;
        remainingTargets.add(`${edge.to}:${edge.toPort}`);
      });

      const existingInputs = state.inputs ?? {};
      let nextInputs = existingInputs;
      let changed = false;

      removedEdges.forEach((edge: Edge) => {
        if (!edge.toPort) return;
        const targetKey = `${edge.to}:${edge.toPort}`;
        if (remainingTargets.has(targetKey)) return;
        const nodeInputs = (nextInputs?.[edge.to] ?? {}) as Record<string, unknown>;
        if (!(edge.toPort in nodeInputs)) return;
        if (!changed) {
          nextInputs = { ...existingInputs };
          changed = true;
        }
        const nextNodeInputs = { ...nodeInputs };
        delete nextNodeInputs[edge.toPort];
        if (Object.keys(nextNodeInputs).length === 0) {
          delete (nextInputs as Record<string, Record<string, unknown>>)[edge.to];
        } else {
          (nextInputs as Record<string, Record<string, unknown>>)[edge.to] = nextNodeInputs;
        }
      });

      if (!changed) return state;
      return { ...state, inputs: nextInputs };
    },
    []
  );

  const clearRuntimeInputsForEdges = useCallback(
    (removedEdges: Edge[], remainingEdges: Edge[]): void => {
      if (removedEdges.length === 0) return;
      setRuntimeState((prev: RuntimeState): RuntimeState =>
        pruneRuntimeInputs(prev, removedEdges, remainingEdges)
      );
    },
    [pruneRuntimeInputs]
  );

  const clearRuntimeForNode = React.useCallback((nodeId: string): void => {
    setRuntimeState((prev: RuntimeState): RuntimeState => {
      const nextInputs = { ...prev.inputs };
      const nextOutputs = { ...prev.outputs };
      const nextHashes = prev.hashes ? { ...prev.hashes } : undefined;
      const nextHistory = prev.history ? { ...prev.history } : undefined;
      delete nextInputs[nodeId];
      delete nextOutputs[nodeId];
      if (nextHashes) {
        delete nextHashes[nodeId];
      }
      if (nextHistory) {
        delete nextHistory[nodeId];
      }
      return {
        ...prev,
        inputs: nextInputs,
        outputs: nextOutputs,
        hashes: nextHashes,
        history: nextHistory,
      };
    });
  }, []);

  const {
    viewportRef,
    canvasRef,
    view,
    panState,
    dragState,
    connecting,
    connectingPos,
    lastDrop,
    selectedEdgeId,
    edgePaths,
    connectingFromNode,
    ensureNodeVisible,
    getCanvasCenterPosition,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDragStart,
    handleDrop,
    handleDragOver,
    handleStartConnection,
    handleCompleteConnection,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleReconnectInput,
    handleRemoveEdge,
    handleDisconnectPort,
    handleDeleteSelectedNode,
    handleSelectEdge,
    handleSelectNode,
    zoomTo,
    fitToNodes,
    resetView,
  } = useAiPathsCanvasInteractions({
    nodes,
    setNodes,
    edges,
    setEdges,
    selectedNodeId,
    setSelectedNodeId,
    clearRuntimeInputsForEdges,
    reportAiPathsError,
    toast,
  });

  const selectedNode = useMemo(
    (): AiNode | null =>
      nodes.find((node: AiNode): boolean => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  const handleClearWires = async (): Promise<void> => {
    if (!activePathId) return false;
    const updatedAt = new Date().toISOString();
    const nextRuntimeState = pruneRuntimeInputs(runtimeState, edges, []);
    if (nextRuntimeState !== runtimeState) {
      setRuntimeState(nextRuntimeState);
    }
    const config: PathConfig = {
      id: activePathId,
      version: STORAGE_VERSION,
      name: pathName,
      description: pathDescription,
      trigger: activeTrigger,
      nodes,
      edges: [],
      updatedAt,
      parserSamples,
      updaterSamples,
      runtimeState: nextRuntimeState,
      lastRunAt,
    };
    setEdges([]);
    const nextConfigs = { ...pathConfigs, [activePathId]: config };
    setPathConfigs(nextConfigs);
    try {
      const safeConfigs = serializePathConfigs(nextConfigs);
      await persistPreferences({
        aiPathsPathIndex: paths,
        aiPathsPathConfigs: safeConfigs,
      });
      await persistPathSettings(paths, activePathId, config);
      toast("Wires cleared.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(error, { action: "clearWires" }, "Failed to clear wires:");
      toast("Failed to clear wires.", { variant: "error" });
    }
  };

  const updateSelectedNode = (patch: Partial<AiNode>): void => {
    if (!selectedNodeId) return;
    const shouldSanitizeEdges = Boolean(patch.inputs || patch.outputs);
    setNodes((prev: AiNode[]): AiNode[] => {
      const next = prev.map((node: AiNode): AiNode =>
        node.id === selectedNodeId ? { ...node, ...patch } : node
      );
      if (shouldSanitizeEdges) {
        setEdges((current: Edge[]): Edge[] => sanitizeEdges(next, current));
      }
      return next;
    });
  };

  const updateSelectedNodeConfig = (patch: NodeConfig): void => {
    if (!selectedNodeId) return;
    setNodes((prev: AiNode[]): AiNode[] => {
      const currentNode = prev.find((node: AiNode): boolean => node.id === selectedNodeId);
      if (!currentNode) return prev;
      const next = prev.map((node: AiNode): AiNode => {
        if (node.id !== selectedNodeId) return node;
        // Deep merge for nested config objects to prevent stale closure issues
        const currentConfig = node.config ?? {};
        const mergedConfig = { ...currentConfig };
        for (const key of Object.keys(patch) as Array<keyof NodeConfig>) {
          const patchValue = patch[key];
          const currentValue = currentConfig[key];
          // Deep merge objects (but not arrays)
          if (
            patchValue &&
            typeof patchValue === "object" &&
            !Array.isArray(patchValue) &&
            currentValue &&
            typeof currentValue === "object" &&
            !Array.isArray(currentValue)
          ) {
            (mergedConfig as Record<string, unknown>)[key] = { ...currentValue, ...patchValue };
          } else {
            (mergedConfig as Record<string, unknown>)[key] = patchValue;
          }
        }
        return { ...node, config: mergedConfig };
      });
      // Update ref synchronously so beforeunload has latest value
      syncNodesRef(next);
      return next;
    });
  };

  const fetchProductById = useCallback(async (productId: string): Promise<Record<string, unknown> | null> => {
    try {
      return await queryClient.fetchQuery({
        queryKey: ["products", productId],
        queryFn: async (): Promise<Record<string, unknown> | null> => {
          const result = await entityApi.getProduct(productId);
          return result.ok ? result.data : null;
        },
        staleTime: 0,
      });
    } catch (error) {
      reportAiPathsError(error, { action: "fetchProduct", productId }, "Failed to fetch product:");
      return null;
    }
  }, [queryClient, reportAiPathsError]);

  const fetchNoteById = useCallback(async (noteId: string): Promise<Record<string, unknown> | null> => {
    try {
      return await queryClient.fetchQuery({
        queryKey: ["notes", noteId],
        queryFn: async (): Promise<Record<string, unknown> | null> => {
          const result = await entityApi.getNote(noteId);
          return result.ok ? result.data : null;
        },
        staleTime: 0,
      });
    } catch (error) {
      reportAiPathsError(error, { action: "fetchNote", noteId }, "Failed to fetch note:");
      return null;
    }
  }, [queryClient, reportAiPathsError]);

  const fetchEntityByType = useCallback(async (entityType: string, entityId: string): Promise<Record<string, unknown> | null> => {
    if (!entityType || !entityId) return null;
    const normalized = entityType.toLowerCase();
    if (normalized === "product") {
      return fetchProductById(entityId);
    }
    if (normalized === "note") {
      return fetchNoteById(entityId);
    }
    return null;
  }, [fetchProductById, fetchNoteById]);

  const buildActivePathConfig = useCallback((updatedAt: string): PathConfig => ({
    id: activePathId ?? "default",
    version: STORAGE_VERSION,
    name: pathName,
    description: pathDescription,
    trigger: activeTrigger,
    nodes,
    edges,
    updatedAt,
    parserSamples,
    updaterSamples,
    runtimeState,
    lastRunAt,
  }), [
    activePathId,
    pathName,
    pathDescription,
    activeTrigger,
    nodes,
    edges,
    parserSamples,
    updaterSamples,
    runtimeState,
    lastRunAt,
  ]);

  // Handler functions that trigger the mutations
  const handleFetchParserSample = async (
    nodeId: string,
    entityType: string,
    entityId: string
  ): Promise<void> => {
    await fetchParserSampleMutation.mutateAsync({ nodeId, entityType, entityId });
  };

  const handleFetchUpdaterSample = async (
    nodeId: string,
    entityType: string,
    entityId: string
  ): Promise<void> => {
    await fetchUpdaterSampleMutation.mutateAsync({ nodeId, entityType, entityId });
  };

  const getDomSelector = (element: Element | null): string | null => {
    if (!element) return null;
    const selectorEscape = (val: string): string => {
      if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
        return CSS.escape(val);
      }
      return val.replace(/[^\w-]/g, "\\$&");
    };
    const dataSelector =
      element.getAttribute("data-component") ||
      element.getAttribute("data-testid") ||
      element.getAttribute("data-node");
    if (dataSelector) {
      const attr =
        element.getAttribute("data-component") !== null
          ? "data-component"
          : element.getAttribute("data-testid") !== null
            ? "data-testid"
            : "data-node";
      return `${element.tagName.toLowerCase()}[${attr}="${selectorEscape(
        dataSelector
      )}"]`;
    }
    if (element.id) {
      return `#${selectorEscape(element.id)}`;
    }
    const segments: string[] = [];
    let current: Element | null = element;
    while (current && current.tagName.toLowerCase() !== "html" && segments.length < 5) {
      const tagName = current.tagName.toLowerCase();
              const parent = current.parentElement;
              if (!parent) break;
              const siblings = Array.from(parent.children).filter(
                (child: Element): boolean => child.tagName === (current as Element).tagName
              );
              const index = siblings.indexOf(current) + 1;
              segments.unshift(`${tagName}:nth-of-type(${index})`);
              if (parent.id) {
                segments.unshift(`#${selectorEscape(parent.id)}`);
                break;
              }
              current = parent as Element;
      
    }
    return segments.length ? segments.join(" > ") : element.tagName.toLowerCase();
  };

  const getTargetInfo = (event?: React.MouseEvent): Record<string, unknown> | null => {
    const target = event?.target as Element | null;
    if (!target) return null;
    const element =
      target.closest(
        "[data-component],[data-testid],[data-node],button,a,[role='button']"
      ) ?? target;
    const rect = element.getBoundingClientRect();
    const dataset = element instanceof HTMLElement ? element.dataset : undefined;
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id || undefined,
      className: element.getAttribute("class") || undefined,
      name: element.getAttribute("name") || undefined,
      type: element.getAttribute("type") || undefined,
      role: element.getAttribute("role") || undefined,
      ariaLabel: element.getAttribute("aria-label") || undefined,
      dataComponent: element.getAttribute("data-component") || undefined,
      dataTestId: element.getAttribute("data-testid") || undefined,
      dataNode: element.getAttribute("data-node") || undefined,
      selector: getDomSelector(element),
      boundingClientRect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
      },
      dataset: dataset ? { ...dataset } : undefined,
    };
  };


  const buildDebugSnapshot = useCallback((
    pathId: string | null,
    runAt: string,
    state: RuntimeState
  ): PathDebugSnapshot | null => {
    if (!pathId) return null;
    const entries = nodes
      .filter((node: AiNode): boolean => node.type === "database")
      .map((node: AiNode): PathDebugEntry | null => {
        const output = state.outputs[node.id] as
          | { debugPayload?: unknown }
          | undefined;
        const debugPayload = output?.debugPayload;
        if (debugPayload === undefined || debugPayload === null) return null;
        return {
          nodeId: node.id,
          title: node.title,
          debug: debugPayload,
        };
      })
      .filter((entry: PathDebugEntry | null): entry is PathDebugEntry => entry !== null);
    if (entries.length === 0) return null;
    return { pathId, runAt, entries };
  }, [nodes]);

  const persistDebugSnapshot = useCallback(async (
    pathId: string | null,
    runAt: string,
    state: RuntimeState
  ): Promise<void> => {
    if (!pathId) return;
    const snapshot = buildDebugSnapshot(pathId, runAt, state);
    if (!snapshot) return;
    const payload = safeJsonStringify(snapshot);
    if (!payload) return;
    try {
      await updateSettingMutation.mutateAsync({
        key: `${PATH_DEBUG_PREFIX}${pathId}`,
        value: payload,
      });
      setPathDebugSnapshots((prev: Record<string, PathDebugSnapshot>) => ({
        ...prev,
        [pathId]: snapshot,
      }));
    } catch (error) {
      console.warn("[AI Paths] Failed to persist debug snapshot.", error);
    }
  }, [buildDebugSnapshot, updateSettingMutation]);

  const buildTriggerContext = (
    triggerNode: AiNode,
    triggerEvent: string,
    event?: React.MouseEvent
  ): Record<string, unknown> => {
    const timestamp = new Date().toISOString();
    const nativeEvent = event?.nativeEvent;
    const pointer = nativeEvent
      ? {
          clientX: nativeEvent.clientX,
          clientY: nativeEvent.clientY,
          pageX: nativeEvent.pageX,
          pageY: nativeEvent.pageY,
          screenX: nativeEvent.screenX,
          screenY: nativeEvent.screenY,
          offsetX: "offsetX" in nativeEvent ? nativeEvent.offsetX : undefined,
          offsetY: "offsetY" in nativeEvent ? nativeEvent.offsetY : undefined,
          button: nativeEvent.button,
          buttons: nativeEvent.buttons,
          altKey: nativeEvent.altKey,
          ctrlKey: nativeEvent.ctrlKey,
          shiftKey: nativeEvent.shiftKey,
          metaKey: nativeEvent.metaKey,
        }
      : undefined;
    const targetInfo = getTargetInfo(event);
    const location =
      typeof window !== "undefined"
        ? {
            href: window.location.href,
            origin: window.location.origin,
            pathname: window.location.pathname,
            search: window.location.search,
            hash: window.location.hash,
            referrer: document.referrer || undefined,
          }
        : {};
    const ui =
      typeof window !== "undefined"
        ? {
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight,
              devicePixelRatio: window.devicePixelRatio,
            },
            screen: {
              width: window.screen?.width,
              height: window.screen?.height,
              availWidth: window.screen?.availWidth,
              availHeight: window.screen?.availHeight,
            },
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            languages: navigator.languages,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            documentTitle: document.title,
            visibilityState: document.visibilityState,
            scroll: {
              x: window.scrollX,
              y: window.scrollY,
            },
          }
        : {};
    return {
      timestamp,
      location,
      ui,
      user: sessionUser,
      event: {
        id: triggerEvent,
        nodeId: triggerNode.id,
        nodeTitle: triggerNode.title,
        type: event?.type,
        pointer,
        target: targetInfo,
      },
      source: {
        pathId: activePathId,
        pathName,
        tab: activeTab,
      },
      extras: {
        triggerLabel: activeTrigger,
      },
    };
  };

  const runGraphForTrigger = async (triggerNode: AiNode, event?: React.MouseEvent): Promise<void> => {
    const triggerEvent = triggerNode.config?.trigger?.event ?? TRIGGER_EVENTS[0]?.id ?? "path_generate_description";
    lastTriggerNodeIdRef.current = triggerNode.id;
    const triggerContext = buildTriggerContext(triggerNode, triggerEvent, event);
    triggerContextRef.current = triggerContext;
    const result = await evaluateGraph({
      nodes,
      edges,
      activePathId,
      activePathName: pathName,
      triggerNodeId: triggerNode.id,
      triggerEvent,
      triggerContext,
      deferPoll: true,
      recordHistory: true,
      historyLimit: 50,
      seedHistory: runtimeStateRef.current.history ?? undefined,
      fetchEntityByType,
      reportAiPathsError,
      toast,
    });
    const runAt = new Date().toISOString();
    setRuntimeState(result);
    setLastRunAt(runAt);
    void persistDebugSnapshot(activePathId ?? null, runAt, result);
    if (activePathId) {
      setPathConfigs((prev: Record<string, PathConfig>) => ({
        ...prev,
        [activePathId]: {
          ...(prev[activePathId] ?? buildActivePathConfig(runAt)),
          runtimeState: result,
          lastRunAt: runAt,
        },
      }));
    }
  };


  const runPollUpdate = useCallback(async (
    node: AiNode,
    options: {
      jobId?: string;
      nodeInputs: RuntimePortValues;
    }
  ): Promise<void> => {
    const fallbackJobId = options.jobId;
    const pollKey = `${node.id}:${options.jobId ?? "db"}`;
    if (pollInFlightRef.current.has(pollKey)) return;
    pollInFlightRef.current.add(pollKey);
          try {
            const pollConfig = node.config?.poll;
            const pollMode = pollConfig?.mode ?? "job";
            let pollOutput: RuntimePortValues | null = null;
            if (pollMode === "database") {
              const queryConfig: DbQueryConfig = {
                ...DEFAULT_DB_QUERY,
                ...(pollConfig?.dbQuery ?? {}),
              };
              const response = await pollDatabaseQuery(options.nodeInputs, {
                intervalMs: pollConfig?.intervalMs ?? 2000,
                maxAttempts: pollConfig?.maxAttempts ?? 30,
                dbQuery: queryConfig,
                successPath: pollConfig?.successPath ?? "status",
                successOperator: pollConfig?.successOperator ?? "equals",
                successValue: pollConfig?.successValue ?? "completed",
                resultPath: pollConfig?.resultPath ?? "result",
              });
              pollOutput = {
                result: response.result,
                status: response.status,
                bundle: response.bundle,
              };
            } else {
              const jobId = options.jobId ?? "";
              if (!jobId) {
                return;
              }
              const result = await pollGraphJob(jobId, {
                intervalMs: pollConfig?.intervalMs ?? 2000,
                maxAttempts: pollConfig?.maxAttempts ?? 30,
              });
    
        pollOutput = {
          result,
          status: "completed",
          jobId,
          bundle: { jobId, status: "completed", result },
        };
      }
      const resolvedJobId =
        typeof pollOutput?.jobId === "string" ? pollOutput.jobId : fallbackJobId;
      const updatedOutputs: Record<string, RuntimePortValues> = {
        ...runtimeStateRef.current.outputs,
        [node.id]: pollOutput ?? runtimeStateRef.current.outputs[node.id] ?? {},
      };
      if (resolvedJobId) {
        nodes
          .filter((item: AiNode): boolean => item.type === "model")
          .forEach((modelNode: AiNode) => {
            const modelOutput = updatedOutputs[modelNode.id] as
              | { jobId?: string; status?: string; result?: unknown; debugPayload?: unknown }
              | undefined;
            if (!modelOutput || modelOutput.jobId !== resolvedJobId) return;
            updatedOutputs[modelNode.id] = {
              ...modelOutput,
              status: pollOutput?.status ?? "completed",
              result:
                pollOutput?.result !== undefined ? pollOutput.result : modelOutput.result,
            };
          });
      }
      setRuntimeState((prev: RuntimeState): RuntimeState => ({
        ...prev,
        outputs: updatedOutputs,
      }));
      const triggerNodeId = lastTriggerNodeIdRef.current ?? undefined;
      const seededOutputs = updatedOutputs;
      const downstreamState = await evaluateGraph({
        nodes,
        edges,
        activePathId,
        activePathName: pathName,
        ...(triggerNodeId ? { triggerNodeId } : {}),
        triggerContext: triggerContextRef.current,
        deferPoll: true,
        skipAiJobs: true,
        seedOutputs: seededOutputs,
        seedHashes: runtimeStateRef.current.hashes ?? undefined,
        seedHistory: runtimeStateRef.current.history ?? undefined,
        recordHistory: true,
        historyLimit: 50,
        fetchEntityByType,
        reportAiPathsError,
        toast,
      });
      const runAt = new Date().toISOString();
      setRuntimeState(downstreamState);
      setLastRunAt(runAt);
      void persistDebugSnapshot(activePathId ?? null, runAt, downstreamState);
      if (activePathId) {
        setPathConfigs((prev: Record<string, PathConfig>) => ({
          ...prev,
          [activePathId]: {
            ...(prev[activePathId] ?? buildActivePathConfig(runAt)),
            runtimeState: downstreamState,
            lastRunAt: runAt,
          },
        }));
      }
    } catch (error) {
      reportAiPathsError(
        error,
        { action: "pollJob", nodeId: node.id, jobId: fallbackJobId },
        "AI job polling failed:"
      );
      setRuntimeState((prev: RuntimeState): RuntimeState => ({
        ...prev,
        outputs: {
          ...prev.outputs,
          [node.id]: {
            result: null,
            status: "failed",
            jobId: fallbackJobId,
            bundle: {
              jobId: fallbackJobId,
              status: "failed",
              error: error instanceof Error ? error.message : "Polling failed",
            },
          },
        },
      }));
    } finally {
      pollInFlightRef.current.delete(pollKey);
    }
  }, [nodes, edges, activePathId, pathName, fetchEntityByType, reportAiPathsError, toast, persistDebugSnapshot, buildActivePathConfig]);

  const startPendingPolls = useCallback((state: RuntimeState): void => {
    nodes
      .filter((node: AiNode): boolean => node.type === "poll")
      .forEach((node: AiNode) => {
        const pollConfig = node.config?.poll;
        const output = state.outputs[node.id] as
          | { status?: string; jobId?: string }
          | undefined;
        const nodeInputs = state.inputs[node.id] ?? {};
        const inputJobId = coerceInput(nodeInputs.jobId);
        const jobId =
          output?.jobId ??
          (typeof inputJobId === "string" || typeof inputJobId === "number"
            ? String(inputJobId).trim()
            : "");
        const status = output?.status ?? "polling";
        if (status === "completed" || status === "failed") return;
        if (pollConfig?.mode !== "database" && !jobId) return;
        void runPollUpdate(node, { jobId, nodeInputs });
      });
  }, [nodes, runPollUpdate]);

  useEffect((): void => {
    if (!runtimeState || nodes.length === 0) return;
    startPendingPolls(runtimeState);
  }, [nodes, runtimeState, startPendingPolls]);

  const dispatchTrigger = (
    eventName: string,
    entityId: string,
    entityType?: string
  ): void => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("ai-path-trigger", {
        detail: {
          trigger: eventName,
          productId: entityId,
          entityId,
          entityType: entityType ?? "product",
        },
      })
    );
  };

  const handleRunSimulation = (
    simulationNode: AiNode,
    triggerEvent?: string
  ): void => {
    const entityId =
      simulationNode.config?.simulation?.entityId?.trim() ||
      simulationNode.config?.simulation?.productId?.trim();
    const entityType = simulationNode.config?.simulation?.entityType ?? "product";
    if (!entityId) {
      toast("Enter an Entity ID in the simulation node.", { variant: "error" });
      return;
    }
    let eventName = triggerEvent ?? TRIGGER_EVENTS[0]?.id ?? "path_generate_description";
    if (!triggerEvent) {
      const connectedTriggerIds = edges
        .filter(
          (edge: Edge): boolean =>
            edge.from === simulationNode.id &&
            (!edge.fromPort || edge.fromPort === "simulation")
        )
        .map((edge: Edge): string => edge.to);
      const triggerNode = nodes.find(
        (node: AiNode): boolean => node.type === "trigger" && connectedTriggerIds.includes(node.id)
      );
      if (triggerNode) {
        eventName = triggerNode.config?.trigger?.event ?? eventName;
        void runGraphForTrigger(triggerNode);
      }
    }
    dispatchTrigger(eventName, entityId, entityType);
    toast(`Simulated ${eventName} for ${entityType} ${entityId}`, {
      variant: "success",
    });
  };

  const handleFireTrigger = (triggerNode: AiNode, event?: React.MouseEvent): void => {
    const triggerEvent = triggerNode.config?.trigger?.event ?? TRIGGER_EVENTS[0]?.id;
    const isScheduled = triggerEvent === "scheduled_run";
    const connectedSimulationIds = edges
      .filter((edge: Edge): boolean => edge.to === triggerNode.id)
      .filter(
        (edge: Edge): boolean =>
          (!edge.toPort || edge.toPort === "simulation") &&
          (!edge.fromPort || edge.fromPort === "simulation")
      )
      .map((edge: Edge): string => edge.from);
    const simulationNodes = nodes.filter(
      (node: AiNode): boolean => node.type === "simulation" && connectedSimulationIds.includes(node.id)
    );
    if (simulationNodes.length === 0) {
      if (!isScheduled) {
        toast("Connect a Simulation node to the Trigger simulation input.", { variant: "error" });
        return;
      }
      void runGraphForTrigger(triggerNode, event);
      return;
    }
    simulationNodes.forEach((node: AiNode) => handleRunSimulation(node, triggerEvent));
    void runGraphForTrigger(triggerNode, event);
  };

  const handleFireTriggerPersistent = async (
    triggerNode: AiNode,
    event?: React.MouseEvent
  ): Promise<void> => {
    const triggerEvent = triggerNode.config?.trigger?.event ?? TRIGGER_EVENTS[0]?.id;
    const isScheduled = triggerEvent === "scheduled_run";
    const connectedSimulationIds = edges
      .filter((edge: Edge): boolean => edge.to === triggerNode.id)
      .filter(
        (edge: Edge): boolean =>
          (!edge.toPort || edge.toPort === "simulation") &&
          (!edge.fromPort || edge.fromPort === "simulation")
      )
      .map((edge: Edge): string => edge.from);
    const simulationNodes = nodes.filter(
      (node: AiNode): boolean => node.type === "simulation" && connectedSimulationIds.includes(node.id)
    );
    if (simulationNodes.length === 0) {
      if (!isScheduled) {
        toast("Connect a Simulation node to the Trigger simulation input.", { variant: "error" });
        return;
      }
      const triggerContext = buildTriggerContext(triggerNode, triggerEvent ?? "", event);
      const enqueueResult = await runsApi.enqueue({
        pathId: activePathId ?? "default",
        pathName,
        nodes,
        edges,
        ...(triggerEvent ? { triggerEvent } : {}),
        triggerNodeId: triggerNode.id,
        triggerContext,
        meta: {
          source: "ai_paths_ui",
        },
      });
      if (!enqueueResult.ok) {
        toast(enqueueResult.error || "Failed to enqueue persistent run.", {
          variant: "error",
        });
        return;
      }
      toast("Persistent run queued.", { variant: "success" });
      return;
    }
    const primarySimulation = simulationNodes[0]!;
    const entityId =
      primarySimulation.config?.simulation?.entityId?.trim() ||
      primarySimulation.config?.simulation?.productId?.trim() ||
      "";
    const entityType = primarySimulation.config?.simulation?.entityType?.trim() || "product";
    if (!entityId) {
      toast("Simulation node is missing an Entity ID.", { variant: "error" });
      return;
    }
    const triggerContext = {
      ...buildTriggerContext(triggerNode, triggerEvent ?? "", event),
      entityId,
      entityType,
    };
    const enqueueResult = await runsApi.enqueue({
      pathId: activePathId ?? "default",
      pathName,
      nodes,
      edges,
      ...(triggerEvent ? { triggerEvent } : {}),
      triggerNodeId: triggerNode.id,
      triggerContext,
      entityId,
      entityType,
      meta: {
        source: "ai_paths_ui",
      },
    });
    if (!enqueueResult.ok) {
      toast(enqueueResult.error || "Failed to enqueue persistent run.", {
        variant: "error",
      });
      return;
    }
    toast("Persistent run queued.", { variant: "success" });
  };

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
      toast(
        error instanceof Error ? error.message : "Failed to load run details.",
        { variant: "error" }
      );
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

  const handleSendToAi = async (sourceNodeId: string, prompt: string): Promise<void> => {
    // Find the source node to determine its type
    const sourceNode = nodes.find((n: AiNode): boolean => n.id === sourceNodeId);
    if (!sourceNode) {
      toast("Source node not found.", { variant: "error" });
      return;
    }

    // Find the connected AI Model node
    // For database nodes, prefer aiPrompt port; for prompt nodes, prefer prompt port; but accept any connection to a model
    const preferredPort = sourceNode.type === "database" ? "aiPrompt" : "prompt";

    // First try to find edge with preferred port
    let aiEdge = edges.find(
      (edge: Edge): boolean => edge.from === sourceNodeId && edge.fromPort === preferredPort
    );

    // If not found, find any edge that connects to a model node
    if (!aiEdge) {
      aiEdge = edges.find((edge: Edge): boolean => {
        if (edge.from !== sourceNodeId) return false;
        const targetNode = nodes.find((n: AiNode): boolean => n.id === edge.to);
        return targetNode?.type === "model";
      });
    }

    if (!aiEdge) {
      toast("No AI Model connected.", { variant: "error" });
      return;
    }
    const aiNode = nodes.find((n: AiNode): boolean => n.id === aiEdge.to && n.type === "model");
    if (!aiNode) {
      toast("Connected node is not an AI Model.", { variant: "error" });
      return;
    }
    const modelConfig = aiNode.config?.model ?? {
      modelId: "gpt-4o",
      temperature: 0.7,
      maxTokens: 800,
      vision: false,
    };
    setSendingToAi(true);
    try {
      const payload = {
        prompt: prompt.trim(),
        imageUrls: [],
        modelId: modelConfig.modelId,
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
        vision: modelConfig.vision,
        source: "ai_paths_direct",
        graph: {
          pathId: activePathId ?? undefined,
          nodeId: aiNode.id,
          nodeTitle: aiNode.title,
        },
      };
      const enqueueData = (await enqueueAiJobMutation.mutateAsync({
        productId: activePathId ?? "direct",
        type: "graph_model",
        payload,
      })) as { jobId: string };
      toast("AI job queued. Waiting for result...", { variant: "success" });
      const result = await pollGraphJob(enqueueData.jobId);
      // Update runtime state with the result
      setRuntimeState((prev: RuntimeState): RuntimeState => {
        const sourceInputs = prev.inputs[sourceNodeId] ?? {};
        const sourceOutputs = prev.outputs[sourceNodeId] ?? {};
        const aiOutputs = prev.outputs[aiNode.id] ?? {};

        // For database nodes, store result in queryCallback (both input and output)
        // For prompt nodes, store result in the result input (so it shows in the Result Input field)
        const updatedSourceOutputs = sourceNode.type === "database"
          ? { ...sourceOutputs, queryCallback: result }
          : sourceOutputs;

        const updatedSourceInputs = sourceNode.type === "database"
          ? { ...sourceInputs, queryCallback: result }
          : sourceNode.type === "prompt"
            ? { ...sourceInputs, result }
            : sourceInputs;

        return {
          ...prev,
          inputs: {
            ...prev.inputs,
            [sourceNodeId]: updatedSourceInputs,
          },
          outputs: {
            ...prev.outputs,
            [sourceNodeId]: updatedSourceOutputs,
            [aiNode.id]: {
              ...aiOutputs,
              result,
              jobId: enqueueData.jobId,
              status: "completed",
            },
          },
        };
      });
      toast("AI response received.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(
        error,
        { action: "sendToAi", nodeId: sourceNodeId },
        "Send to AI failed:"
      );
      toast("Send to AI failed.", { variant: "error" });
    } finally {
      setSendingToAi(false);
    }
  };

  const handleSavePreset = async (): Promise<void> => {
    const name = presetDraft.name.trim();
    if (!name) {
      toast("Preset name is required.", { variant: "error" });
      return;
    }
    const now = new Date().toISOString();
    const bundlePorts = parsePathList(presetDraft.bundlePorts);
    const template = presetDraft.template.trim();
    const nextPresets = [...clusterPresets];
    if (editingPresetId) {
      const index = nextPresets.findIndex((preset: ClusterPreset): boolean => preset.id === editingPresetId);
      const existing = nextPresets[index];
      if (index >= 0 && existing) {
        nextPresets[index] = {
          ...existing,
          name,
          description: presetDraft.description.trim(),
          bundlePorts,
          template,
          updatedAt: now,
        };
      }
    } else {
      nextPresets.push({
        id: createPresetId(),
        name,
        description: presetDraft.description.trim(),
        bundlePorts,
        template,
        createdAt: now,
        updatedAt: now,
      });
    }
    setClusterPresets(nextPresets);
    await saveClusterPresets(nextPresets);
    setEditingPresetId(null);
    toast("Cluster preset saved.", { variant: "success" });
  };

  const handleLoadPreset = (preset: ClusterPreset): void => {
    setEditingPresetId(preset.id);
    setPresetDraft({
      name: preset.name,
      description: preset.description ?? "",
      bundlePorts: preset.bundlePorts.join("\n"),
      template: preset.template ?? "",
    });
  };

  const handleDeletePreset = async (presetId: string): Promise<void> => {
    const target = clusterPresets.find((preset: ClusterPreset): boolean => preset.id === presetId);
    if (!target) return;
    const confirmed = window.confirm(`Delete preset "${target.name}"?`);
    if (!confirmed) return;
    const nextPresets = clusterPresets.filter((preset: ClusterPreset): boolean => preset.id !== presetId);
    setClusterPresets(nextPresets);
    await saveClusterPresets(nextPresets);
    if (editingPresetId === presetId) {
      setEditingPresetId(null);
      setPresetDraft({
        name: "",
        description: "",
        bundlePorts: "context\nmeta\ntrigger\nentityJson\nentityId\nentityType\nresult",
        template: "Write a summary for {{context.entity.title}}",
      });
    }
  };

  const handleApplyPreset = (preset: ClusterPreset): void => {
    const base = getCanvasCenterPosition();
    const bundleNode: AiNode = {
      id: `node-${Math.random().toString(36).slice(2, 8)}`,
      type: "bundle",
      title: `${preset.name} Bundle`,
      description: preset.description || "Cluster preset bundle.",
      inputs: BUNDLE_INPUT_PORTS,
      outputs: ["bundle"],
      position: { x: base.x, y: base.y },
      config: {
        bundle: {
          includePorts: preset.bundlePorts ?? [],
        },
      },
    };
    const templateNode: AiNode = {
      id: `node-${Math.random().toString(36).slice(2, 8)}`,
      type: "template",
      title: `${preset.name} Template`,
      description: "Preset template prompt.",
      inputs: TEMPLATE_INPUT_PORTS,
      outputs: ["prompt"],
      position: { x: base.x + 320, y: base.y },
      config: {
        template: {
          template: preset.template ?? "",
        },
      },
    };
    const edge: Edge = {
      id: `edge-${Math.random().toString(36).slice(2, 8)}`,
      from: bundleNode.id,
      to: templateNode.id,
      fromPort: "bundle",
      toPort: "bundle",
    };
    setNodes((prev: AiNode[]): AiNode[] => [...prev, bundleNode, templateNode]);
    setEdges((prev: Edge[]): Edge[] => [...prev, edge]);
    setSelectedNodeId(templateNode.id);
    ensureNodeVisible(templateNode);
    toast(`Preset applied: ${preset.name}`, { variant: "success" });
  };

  const handleExportPresets = (): void => {
    const payload = JSON.stringify(clusterPresets, null, 2);
    setPresetsJson(payload);
    setPresetsModalOpen(true);
  };

  const handleImportPresets = async (mode: "merge" | "replace"): Promise<void> => {
    if (!presetsJson.trim()) {
      toast("Paste presets JSON to import.", { variant: "error" });
      return;
    }
    if (mode === "replace") {
      const confirmed = window.confirm("Replace existing presets? This cannot be undone.");
      if (!confirmed) return;
    }
    try {
      const parsed = JSON.parse(presetsJson) as unknown;
      const list = (Array.isArray(parsed)
        ? parsed
        : (parsed && typeof parsed === "object" && "presets" in (parsed as Record<string, unknown>))
          ? (parsed as Record<string, unknown>).presets
          : null) as unknown[] | null;
      if (!list) {
        toast("Invalid presets JSON. Expected an array.", { variant: "error" });
        return;
      }
      const normalized = list.map((item: unknown): ClusterPreset => normalizePreset(item as Partial<ClusterPreset>));
      let nextPresets = mode === "replace" ? [] : [...clusterPresets];
      const existingIds = new Set(nextPresets.map((preset: ClusterPreset): string => preset.id));
      const merged = normalized.map((preset: ClusterPreset): ClusterPreset => {
        if (existingIds.has(preset.id)) {
          return { ...preset, id: createPresetId(), updatedAt: new Date().toISOString() };
        }
        return preset;
      });
      nextPresets = [...nextPresets, ...merged];
      setClusterPresets(nextPresets);
      await saveClusterPresets(nextPresets);
      toast("Presets imported.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(error, { action: "importPresets" }, "Failed to import presets:");
      toast("Failed to import presets. Check JSON format.", { variant: "error" });
    }
  };

  const handlePresetFromSelection = (): void => {
    const selectedTemplate = selectedNode?.type === "template" ? selectedNode : null;
    const selectedBundle = selectedNode?.type === "bundle" ? selectedNode : null;

    const findBundleForTemplate = (template: AiNode): AiNode[] => {
      const bundleEdges = edges.filter(
        (edge: Edge): boolean => edge.to === template.id && edge.toPort === "bundle"
      );
      const bundleNodes = bundleEdges
        .map((edge: Edge): AiNode | undefined => nodes.find((node: AiNode): boolean => node.id === edge.from))
        .filter((node: AiNode | undefined): node is AiNode => Boolean(node && node.type === "bundle"));
      return bundleNodes;
    };

    const findTemplateForBundle = (bundle: AiNode): AiNode[] => {
      const templateEdges = edges.filter(
        (edge: Edge): boolean => edge.from === bundle.id && edge.fromPort === "bundle"
      );
      const templateNodes = templateEdges
        .map((edge: Edge): AiNode | undefined => nodes.find((node: AiNode): boolean => node.id === edge.to))
        .filter((node: AiNode | undefined): node is AiNode => Boolean(node && node.type === "template"));
      return templateNodes;
    };

    let templateNode: AiNode | null = selectedTemplate;
    let bundleNode: AiNode | null = selectedBundle;

    if (selectedTemplate && !bundleNode) {
      const bundles = findBundleForTemplate(selectedTemplate);
      if (bundles.length > 1) {
        toast("Multiple bundles connected. Using the first one.", { variant: "info" });
      }
      bundleNode = bundles[0] ?? null;
    }

    if (selectedBundle && !templateNode) {
      const templates = findTemplateForBundle(selectedBundle);
      if (templates.length > 1) {
        toast("Multiple templates connected. Using the first one.", { variant: "info" });
      }
      templateNode = templates[0] ?? null;
    }

    if (!templateNode || !bundleNode) {
      toast("Select a connected Bundle + Template pair.", { variant: "error" });
      return;
    }

    const presetName = templateNode.title.replace(/template/i, "").trim() || "Cluster Preset";
    setEditingPresetId(null);
    setPresetDraft({
      name: presetName,
      description: bundleNode.description ?? "",
      bundlePorts: (bundleNode.config?.bundle?.includePorts ?? bundleNode.inputs).join("\n"),
      template: templateNode.config?.template?.template ?? "",
    });
    toast("Preset draft loaded from selection.", { variant: "success" });
  };

  const handleResetPresetDraft = (): void => {
    setEditingPresetId(null);
    setPresetDraft(DEFAULT_PRESET_DRAFT);
  };



  const updateActivePathMeta = (name: string): void => {
    if (!activePathId) return;
    const updatedAt = new Date().toISOString();
    setPaths((prev: PathMeta[]): PathMeta[] =>
      prev.map((path: PathMeta): PathMeta =>
        path.id === activePathId ? { ...path, name, updatedAt } : path
      )
    );
  };

  const handleReset = (): void => {
    if (!activePathId) return;
    const resetConfig = createDefaultPathConfig(activePathId);
    const normalizedNodes = normalizeNodes(resetConfig.nodes);
    setNodes(normalizedNodes);
    setEdges(sanitizeEdges(normalizedNodes, resetConfig.edges));
    setSelectedNodeId(normalizedNodes[0]?.id ?? null);
    setPathName(resetConfig.name);
    setPathDescription(resetConfig.description);
    setActiveTrigger(normalizeTriggerLabel(resetConfig.trigger));
    setParserSamples(resetConfig.parserSamples ?? {});
    setUpdaterSamples(resetConfig.updaterSamples ?? {});
    setPathConfigs((prev: Record<string, PathConfig>): Record<string, PathConfig> => ({ ...prev, [activePathId]: resetConfig }));
    updateActivePathMeta(resetConfig.name);
  };

  const handleCreatePath = (): void => {
    const id = createPathId();
    const now = new Date().toISOString();
    const name = `New Path ${paths.length + 1}`;
    const config: PathConfig = {
      id,
      version: STORAGE_VERSION,
      name,
      description: "",
      trigger: triggers[0] ?? "Product Modal - Context Filter",
      nodes: [],
      edges: [],
      updatedAt: now,
      parserSamples: {},
      updaterSamples: {},
      runtimeState: { inputs: {}, outputs: {} },
      lastRunAt: null,
    };
    const meta: PathMeta = {
      id,
      name,
      createdAt: now,
      updatedAt: now,
    };
    setPaths((prev: PathMeta[]): PathMeta[] => [...prev, meta]);
    setPathConfigs((prev: Record<string, PathConfig>): Record<string, PathConfig> => ({ ...prev, [id]: config }));
    setActivePathId(id);
    setNodes([]);
    setEdges([]);
    setPathName(name);
    setPathDescription("");
    setActiveTrigger(normalizeTriggerLabel(config.trigger));
    setParserSamples({});
    setUpdaterSamples({});
    setRuntimeState({ inputs: {}, outputs: {} });
    setLastRunAt(null);
    setSelectedNodeId(null);
  };

  const handleCreateAiDescriptionPath = (): void => {
    const id = createPathId();
    const config = createAiDescriptionPath(id);
    const now = new Date().toISOString();
    const meta: PathMeta = {
      id,
      name: config.name,
      createdAt: now,
      updatedAt: now,
    };
    setPaths((prev: PathMeta[]): PathMeta[] => [...prev, meta]);
    setPathConfigs((prev: Record<string, PathConfig>): Record<string, PathConfig> => ({ ...prev, [id]: config }));
    setActivePathId(id);
    const normalizedNodes = normalizeNodes(config.nodes);
    setNodes(normalizedNodes);
    setEdges(sanitizeEdges(normalizedNodes, config.edges));
    setPathName(config.name);
    setPathDescription(config.description);
    setActiveTrigger(normalizeTriggerLabel(config.trigger));
    setParserSamples(config.parserSamples ?? {});
    setUpdaterSamples(config.updaterSamples ?? {});
    setRuntimeState(parseRuntimeState(config.runtimeState));
    setLastRunAt(config.lastRunAt ?? null);
    setSelectedNodeId(normalizedNodes[0]?.id ?? null);
    toast("AI Description Path created.", { variant: "success" });
  };

  const handleDeletePath = async (pathId?: string): Promise<void> => {
    const targetId = pathId ?? activePathId;
    if (!targetId) return;
    const nextPaths = paths.filter((path: PathMeta): boolean => path.id !== targetId);
    if (nextPaths.length === 0) {
      const fallbackId = "default";
      const fallback = createDefaultPathConfig(fallbackId);
      const fallbackMeta = createPathMeta(fallback);
      setPaths([fallbackMeta]);
      setPathConfigs({ [fallbackId]: fallback });
      setActivePathId(fallbackId);
      const normalizedNodes = normalizeNodes(fallback.nodes);
      setNodes(normalizedNodes);
      setEdges(sanitizeEdges(normalizedNodes, fallback.edges));
      setPathName(fallback.name);
      setPathDescription(fallback.description);
      setActiveTrigger(normalizeTriggerLabel(fallback.trigger));
      setParserSamples(fallback.parserSamples ?? {});
      setUpdaterSamples(fallback.updaterSamples ?? {});
      setRuntimeState(parseRuntimeState(fallback.runtimeState));
      setLastRunAt(fallback.lastRunAt ?? null);
      setSelectedNodeId(normalizedNodes[0]?.id ?? null);
      toast("Cannot delete the last path. Reset to default instead.", {
        variant: "info",
      });
      return;
    }
    const nextId = nextPaths[0]?.id ?? null;
    setPaths(nextPaths);
    const nextConfigs = { ...pathConfigs };
    delete nextConfigs[targetId];
    setPathConfigs(nextConfigs);
    if (nextId) {
      const nextConfig = pathConfigs[nextId] ?? createDefaultPathConfig(nextId);
      setActivePathId(nextId);
      const normalizedNodes = normalizeNodes(nextConfig.nodes);
      setNodes(normalizedNodes);
      setEdges(sanitizeEdges(normalizedNodes, nextConfig.edges));
      setPathName(nextConfig.name);
      setPathDescription(nextConfig.description);
      setActiveTrigger(normalizeTriggerLabel(nextConfig.trigger));
      setParserSamples(nextConfig.parserSamples ?? {});
      setUpdaterSamples(nextConfig.updaterSamples ?? {});
      setRuntimeState(parseRuntimeState(nextConfig.runtimeState));
      setLastRunAt(nextConfig.lastRunAt ?? null);
      setSelectedNodeId(normalizedNodes[0]?.id ?? null);
    } else {
      setActivePathId(null);
    }
    try {
      const safeConfigs = serializePathConfigs(nextConfigs);
      await persistPreferences({
        aiPathsPathIndex: nextPaths,
        aiPathsPathConfigs: safeConfigs,
      });
      if (nextId) {
        const nextConfig = nextConfigs[nextId] ?? createDefaultPathConfig(nextId);
        await persistPathSettings(nextPaths, nextId, nextConfig);
      } else {
        await persistSettingsBulk([
          { key: PATH_INDEX_KEY, value: JSON.stringify(nextPaths) },
        ]);
      }
      toast("Path removed from the index.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(error, { action: "deletePath", pathId: targetId }, "Failed to update path index:");
      toast("Failed to update path index.", { variant: "error" });
    }
  };

  const handleSwitchPath = (value: string): void => {
    if (!value) return;
    const config = pathConfigs[value] ?? createDefaultPathConfig(value);
    setActivePathId(value);
    const normalizedNodes = normalizeNodes(config.nodes);
    setNodes(normalizedNodes);
    setEdges(sanitizeEdges(normalizedNodes, config.edges));
    setPathName(config.name);
    setPathDescription(config.description);
    setActiveTrigger(normalizeTriggerLabel(config.trigger));
    setParserSamples(config.parserSamples ?? {});
    setUpdaterSamples(config.updaterSamples ?? {});
    setRuntimeState(parseRuntimeState(config.runtimeState));
    setLastRunAt(config.lastRunAt ?? null);
    setSelectedNodeId(normalizedNodes[0]?.id ?? null);
  };

  const handleCopyDocsWiring = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(DOCS_WIRING_SNIPPET);
      toast("Wiring copied to clipboard.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(error, { action: "copyDocsWiring" }, "Failed to copy wiring:");
      toast("Failed to copy wiring.", { variant: "error" });
    }
  };

  const handleCopyDocsDescription = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(DOCS_DESCRIPTION_SNIPPET);
      toast("AI Description wiring copied.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(error, { action: "copyDocsDescription" }, "Failed to copy wiring:");
      toast("Failed to copy wiring.", { variant: "error" });
    }
  };

  const handleCopyDocsJobs = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(DOCS_JOBS_SNIPPET);
      toast("AI job wiring copied.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(error, { action: "copyDocsJobs" }, "Failed to copy wiring:");
      toast("Failed to copy wiring.", { variant: "error" });
    }
  };

  const autoSaveLabel = loading
    ? "Loading AI Paths..."
    : autoSaveStatus === "saving"
      ? "Auto-saving..."
      : autoSaveStatus === "saved"
        ? `Auto-saved${autoSaveAt ? ` at ${new Date(autoSaveAt).toLocaleTimeString()}` : ""}`
        : autoSaveStatus === "error"
          ? "Auto-save failed"
          : "Auto-save ready";
  const autoSaveClasses =
    autoSaveStatus === "saved"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
      : autoSaveStatus === "error"
        ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
        : autoSaveStatus === "saving"
          ? "border-sky-500/40 bg-sky-500/10 text-sky-200"
          : "border bg-card/60 text-gray-300";

  return {
    loading,
    docsWiringSnippet: DOCS_WIRING_SNIPPET,
    docsDescriptionSnippet: DOCS_DESCRIPTION_SNIPPET,
    docsJobsSnippet: DOCS_JOBS_SNIPPET,
    handleCopyDocsWiring,
    handleCopyDocsDescription,
    handleCopyDocsJobs,
    autoSaveLabel,
    autoSaveClasses,
    saving,
    handleCreatePath,
    handleCreateAiDescriptionPath,
    handleSave,
    handleReset,
    handleDeletePath,
    activePathId,
    lastError,
    setLastError,
    persistLastError,
    setLoadNonce,
    lastRunAt,
    pathName,
    setPathName,
    updateActivePathMeta,
    paths,
    handleSwitchPath,
    savePathIndex,
    nodes,
    setNodes,
    edges,
    runtimeState,
    edgePaths,
    view,
    panState,
    lastDrop,
    connecting,
    connectingPos,
    connectingFromNode,
    selectedNodeId,
    dragState,
    selectedEdgeId,
    palette,
    paletteCollapsed,
    setPaletteCollapsed,
    expandedPaletteGroups,
    togglePaletteGroup,
    handleDragStart,
    selectedNode,
    handleSelectEdge,
    handleFireTrigger,
    handleFireTriggerPersistent,
    setSimulationOpenNodeId,
    updateSelectedNode,
    setConfigOpen,
    handleDeleteSelectedNode,
    handleRemoveEdge,
    handleClearWires,
    handleDisconnectPort,
    handleReconnectInput,
    handleSelectNode,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleStartConnection,
    handleCompleteConnection,
    handleDrop,
    handleDragOver,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    zoomTo,
    fitToNodes,
    resetView,
    presetDraft,
    setPresetDraft,
    editingPresetId,
    handleResetPresetDraft,
    handlePresetFromSelection,
    handleSavePreset,
    clusterPresets,
    handleLoadPreset,
    handleApplyPreset,
    handleDeletePreset,
    handleExportPresets,
    lastGraphModelPayload,
    runList,
    runsQuery,
    runFilter,
    setRunFilter,
    expandedRunHistory,
    setExpandedRunHistory,
    runHistorySelection,
    setRunHistorySelection,
    handleOpenRunDetail,
    handleResumeRun,
    handleCancelRun,
    handleRequeueDeadLetter,
    viewportRef,
    canvasRef,
    configOpen,
    setConfigOpen,
    modelOptions,
    parserSamples,
    setParserSamples,
    parserSampleLoading,
    updaterSamples,
    setUpdaterSamples,
    updaterSampleLoading,
    pathDebugSnapshots,
    updateSelectedNodeConfig,
    handleFetchParserSample,
    handleFetchUpdaterSample,
    handleRunSimulation,
    clearRuntimeForNode,
    handleSendToAi,
    sendingToAi,
    dbQueryPresets,
    setDbQueryPresets,
    saveDbQueryPresets,
    dbNodePresets,
    setDbNodePresets,
    saveDbNodePresets,
    runDetailOpen,
    setRunDetailOpen,
    runDetailLoading,
    runDetail,
    runStreamStatus,
    runStreamPaused,
    setRunStreamPaused,
    runNodeSummary,
    runEventsOverflow,
    runEventsBatchLimit,
    runDetailHistoryOptions,
    runDetailSelectedHistoryNodeId,
    setRunHistoryNodeId,
    runDetailSelectedHistoryEntries,
    presetsModalOpen,
    setPresetsModalOpen,
    presetsJson,
    setPresetsJson,
    handleImportPresets,
    simulationOpenNodeId,
    reportAiPathsError,
    toast,
  };
}

export type AiPathsSettingsState = ReturnType<typeof useAiPathsSettingsState>;
