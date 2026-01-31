"use client";
import React, { JSX, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button, Input, useToast } from "@/shared/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";

import { logClientError } from "@/features/observability";
import { useUpdateSetting, useUpdateSettingsBulk } from "@/shared/hooks/useSettings";
import { DocsTabPanel, PathsTabPanel } from "./ui-panels";
import { evaluateGraph, dbApi, aiJobsApi, entityApi, runsApi } from "@/features/ai-paths/lib";
import { CanvasBoard } from "./canvas-board";
import { CanvasSidebar } from "./canvas-sidebar";
import { NodeConfigDialog } from "./node-config-dialog";
import { ClusterPresetsPanel, type ClusterPresetDraft } from "./cluster-presets-panel";
import { GraphModelDebugPanel } from "./graph-model-debug-panel";
import { JobQueuePanel } from "./job-queue-panel";
import { PresetsDialog } from "./presets-dialog";
import { RunDetailDialog } from "./run-detail-dialog";
import { RunHistoryPanel, type RunHistoryFilter } from "./run-history-panel";
import { SimulationDialog } from "./simulation-dialog";
import { buildHistoryNodeOptions, type HistoryNodeOption } from "./run-history-utils";
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
  NodeDefinition,
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
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CLUSTER_PRESETS_KEY,
  DB_QUERY_PRESETS_KEY,
  DB_NODE_PRESETS_KEY,
  DEFAULT_MODELS,
  NODE_MIN_HEIGHT,
  NODE_WIDTH,
  PATH_CONFIG_PREFIX,
  PATH_DEBUG_PREFIX,
  PATH_INDEX_KEY,
  STORAGE_VERSION,
  TEMPLATE_INPUT_PORTS,
  TRIGGER_EVENTS,
  VIEW_MARGIN,
  clampScale,
  clampTranslate,
  createAiDescriptionPath,
  createDefaultPathConfig,
  createPathId,
  createPathMeta,
  createPresetId,
  coerceInput,
  getDefaultConfigForType,
  getPortOffsetY,
  initialEdges,
  initialNodes,
  normalizeNodes,
  palette,
  parsePathList,
  safeParseJson,
  safeStringify,
  stableStringify,
  sanitizeEdges,
  triggers,
  validateConnection,
} from "@/features/ai-paths/lib";
import {
  DEFAULT_DB_QUERY,
  safeJsonStringify,
  parseRuntimeState,
  sanitizePathConfig,
  serializePathConfigs,
  pollDatabaseQuery,
  pollGraphJob,
} from "./AiPathsSettingsUtils";

type AiPathsSettingsProps = {
  activeTab: "canvas" | "paths" | "docs" | "queue";
  renderActions?: (actions: React.ReactNode) => React.ReactNode;
  onTabChange?: (tab: "canvas" | "paths" | "docs" | "queue") => void;
};

const AUTO_SAVE_DEBOUNCE_MS = 100; // Very short debounce for near-immediate saves
const DEFAULT_PRESET_DRAFT: ClusterPresetDraft = {
  name: "",
  description: "",
  bundlePorts: "context\nmeta\ntrigger\nentityJson\nentityId\nentityType\nresult",
  template: "Write a summary for {{context.entity.title}}",
};

export function AiPathsSettings({ activeTab, renderActions, onTabChange }: AiPathsSettingsProps): JSX.Element {
  const { toast } = useToast();
  const normalizeTriggerLabel = (value?: string | null): string =>
    value === "Product Modal - Context Grabber"
      ? "Product Modal - Context Filter"
      : value ?? (triggers[0] ?? "Product Modal - Context Filter");
  const docsWiringSnippet = [
    "Simulation.simulation → Trigger.simulation",
    "Trigger.context → ContextFilter.context",
    "ContextFilter.entityJson → Parser.entityJson",
    "Trigger.context → ResultViewer.context",
    "Trigger.meta → ResultViewer.meta",
    "Trigger.trigger → ResultViewer.trigger",
  ].join("\n");
  const docsDescriptionSnippet = [
    "ContextFilter.entityJson → Parser.entityJson",
    "Parser.title → AI Description Generator.title",
    "Parser.images → AI Description Generator.images",
    "AI Description Generator.description_en → Description Updater.description_en",
    "Parser.productId → Description Updater.productId",
    "Description Updater.description_en → Result Viewer.description_en",
  ].join("\n");
  const docsJobsSnippet = [
    "# Inline (Model waits for result)",
    "Prompt.prompt → Model.prompt",
    "Prompt.images → Model.images",
    "Model.result → Result Viewer.result",
    "Model.result → Database.result",
    "Parser.productId → Database.entityId",
    "",
    "# Async (Model enqueue-only + Poll)",
    "Prompt.prompt → Model.prompt",
    "Prompt.images → Model.images",
    "Model.jobId → Poll.jobId",
    "Poll.result → Result Viewer.result",
    "Poll.result → Database.result",
    "Parser.productId → Database.entityId",
  ].join("\n");
  const [nodes, setNodes] = useState<AiNode[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [paths, setPaths] = useState<PathMeta[]>([]);
  const [pathConfigs, setPathConfigs] = useState<Record<string, PathConfig>>({});
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    initialNodes[0]?.id ?? null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [autoSaveAt, setAutoSaveAt] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  // Initial view centered on the middle of the canvas where nodes are placed
  const [view, setView] = useState({ x: -600, y: -320, scale: 1 });
  const [connecting, setConnecting] = useState<{
    fromNodeId: string;
    fromPort: string;
    start: { x: number; y: number };
  } | null>(null);
  const [connectingPos, setConnectingPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [lastDrop, setLastDrop] = useState<{ x: number; y: number } | null>(null);
  const [simulationOpenNodeId, setSimulationOpenNodeId] = useState<string | null>(
    null
  );
  const [pathName, setPathName] = useState("AI Description Path");
  const [pathDescription, setPathDescription] = useState(
    "Visual analysis + description generation with structured updates."
  );
  const [activeTrigger, setActiveTrigger] = useState(triggers[0] ?? "");
  const [dragState, setDragState] = useState<{
    nodeId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [parserSamples, setParserSamples] = useState<Record<string, ParserSampleState>>(
    {}
  );
  const [updaterSamples, setUpdaterSamples] = useState<Record<string, UpdaterSampleState>>(
    {}
  );
  const [panState, setPanState] = useState<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
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
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);
  const autoSaveInFlightRef = useRef(false);
  // Refs to track current state for beforeunload handler (avoids stale closure)
  const currentNodesRef = useRef<AiNode[]>(initialNodes);
  const currentEdgesRef = useRef<Edge[]>(initialEdges);
  const currentPathsRef = useRef<PathMeta[]>([]);
  const currentPathConfigsRef = useRef<Record<string, PathConfig>>({});
  const currentActivePathIdRef = useRef<string | null>(null);
  const currentPathNameRef = useRef("AI Description Path");
  const currentPathDescriptionRef = useRef("");
  const currentActiveTriggerRef = useRef(triggers[0] ?? "Product Modal - Context Filter");
  const currentParserSamplesRef = useRef<Record<string, ParserSampleState>>({});
  const currentUpdaterSamplesRef = useRef<Record<string, UpdaterSampleState>>({});
  const currentRuntimeStateRef = useRef<RuntimeState>({ inputs: {}, outputs: {} });
  const currentLastRunAtRef = useRef<string | null>(null);
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
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [loadNonce, setLoadNonce] = useState(0);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const pollInFlightRef = useRef<Set<string>>(new Set());
  const lastTriggerNodeIdRef = useRef<string | null>(null);
  const triggerContextRef = useRef<Record<string, unknown> | null>(null);
  const runtimeStateRef = useRef<RuntimeState>({ inputs: {}, outputs: {} });
  const lastDropTimerRef = useRef<number | null>(null);
  const loadAttemptRef = useRef<number | null>(null);
  const loadInFlightRef = useRef(false);
  const lastPrefsPayloadRef = useRef<string>("");
  const lastPathSavePayloadRef = useRef<string>("");
  const lastSettingsPayloadRef = useRef<string>("");
  const normalizeConfigForHash = useCallback((config: PathConfig): PathConfig => ({
    ...config,
    nodes: [...config.nodes].sort((a: AiNode, b: AiNode): number => a.id.localeCompare(b.id)),
    edges: [...config.edges].sort((a: Edge, b: Edge): number => a.id.localeCompare(b.id)),
  }), []);
  const buildPathConfigsHash = useCallback((configs: Record<string, PathConfig>): string => {
    const normalizedConfigs = Object.fromEntries(
      Object.entries(configs).map(([key, config]: [string, PathConfig]) => [
        key,
        normalizeConfigForHash(sanitizePathConfig(config)),
      ])
    );
    return stableStringify(normalizedConfigs);
  }, [normalizeConfigForHash]);
  const queryClient = useQueryClient();
  const updateSettingMutation = useUpdateSetting();
  const updateSettingsBulkMutation = useUpdateSettingsBulk();
  const updatePreferencesMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>): Promise<boolean> => {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Failed to update preferences.");
      }
      return true;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
    },
    onError: (error: Error): void => {
      console.warn("[AI Paths] Failed to persist preferences.", error);
    },
  });
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: async (): Promise<Array<{ key: string; value: string }>> => {
      const res = await fetch("/api/settings");
      if (!res.ok) {
        throw new Error("Failed to load AI Paths settings.");
      }
      return (await res.json()) as Array<{ key: string; value: string }>;
    },
    enabled: false,
  });
  const preferencesQuery = useQuery({
    queryKey: ["user-preferences"],
    queryFn: async (): Promise<{
      aiPathsActivePathId?: string | null;
      aiPathsExpandedGroups?: string[] | null;
      aiPathsPaletteCollapsed?: boolean | null;
      aiPathsPathIndex?: PathMeta[] | null;
      aiPathsPathConfigs?: Record<string, PathConfig> | string | null;
    }> => {
      const res = await fetch("/api/user/preferences");
      if (!res.ok) {
        throw new Error("Failed to load user preferences.");
      }
      return (await res.json()) as {
        aiPathsActivePathId?: string | null;
        aiPathsExpandedGroups?: string[] | null;
        aiPathsPaletteCollapsed?: boolean | null;
        aiPathsPathIndex?: PathMeta[] | null;
        aiPathsPathConfigs?: Record<string, PathConfig> | string | null;
      };
    },
    enabled: false,
  });
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

  // RAF throttling refs for drag performance
  const pendingDragRef = useRef<{ nodeId: string; x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (loadInFlightRef.current) return;
    if (loadAttemptRef.current === loadNonce) return;
    loadAttemptRef.current = loadNonce;
    loadInFlightRef.current = true;
    setLoading(true);
    const loadConfig = async (): Promise<void> => {
      try {
        const settingsResult = await settingsQuery.refetch();
        if (settingsResult.error || !settingsResult.data) {
          throw settingsResult.error ?? new Error("Failed to load AI Paths settings.");
        }
        const data = settingsResult.data as Array<{ key: string; value: string }>;
        let preferredPathId: string | null = null;
        let preferredGroups: string[] | null = null;
        let preferredPathIndex: PathMeta[] | null = null;
        let preferredPathConfigs: Record<string, PathConfig> | null = null;
        try {
          const prefsResult = await preferencesQuery.refetch();
          if (prefsResult.data) {
            const prefs = prefsResult.data as {
              aiPathsActivePathId?: string | null;
              aiPathsExpandedGroups?: string[] | null;
              aiPathsPaletteCollapsed?: boolean | null;
              aiPathsPathIndex?: PathMeta[] | null;
              aiPathsPathConfigs?: Record<string, PathConfig> | string | null;
            };
            preferredPathId =
              typeof prefs.aiPathsActivePathId === "string"
                ? prefs.aiPathsActivePathId
                : null;
            preferredGroups = Array.isArray(prefs.aiPathsExpandedGroups)
              ? prefs.aiPathsExpandedGroups
              : null;
            preferredPathIndex =
              Array.isArray(prefs.aiPathsPathIndex) && prefs.aiPathsPathIndex.length > 0
                ? prefs.aiPathsPathIndex
                : null;
            if (typeof prefs.aiPathsPathConfigs === "string") {
              const parsedConfigs = safeParseJson(prefs.aiPathsPathConfigs).value;
              preferredPathConfigs =
                parsedConfigs && typeof parsedConfigs === "object"
                  ? (parsedConfigs as Record<string, PathConfig>)
                  : null;
            } else if (
              prefs.aiPathsPathConfigs &&
              typeof prefs.aiPathsPathConfigs === "object"
            ) {
              preferredPathConfigs = prefs.aiPathsPathConfigs;
            } else {
              preferredPathConfigs = null;
            }
            if (typeof prefs.aiPathsPaletteCollapsed === "boolean") {
              setPaletteCollapsed(prefs.aiPathsPaletteCollapsed);
            }
          } else if (prefsResult.error) {
            console.warn("[AI Paths] Failed to load user preferences.", prefsResult.error);
          }
        } catch (error) {
          console.warn("[AI Paths] Failed to load user preferences.", error);
        }
        const map = new Map(data.map((item: { key: string; value: string }): [string, string] => [item.key, item.value]));
        const debugSnapshots: Record<string, PathDebugSnapshot> = {};
        map.forEach((value: string, key: string) => {
          if (!key.startsWith(PATH_DEBUG_PREFIX)) return;
          const pathId = key.slice(PATH_DEBUG_PREFIX.length);
          if (!pathId) return;
          const parsed = safeParseJson(value).value;
          if (parsed && typeof parsed === "object") {
            debugSnapshots[pathId] = parsed as PathDebugSnapshot;
          }
        });
        setPathDebugSnapshots(debugSnapshots);
        const indexRaw = map.get(PATH_INDEX_KEY);
        const lastErrorRaw = map.get(AI_PATHS_LAST_ERROR_KEY);
        const presetsRaw = map.get(CLUSTER_PRESETS_KEY);
        const queryPresetsRaw = map.get(DB_QUERY_PRESETS_KEY);
        const dbNodePresetsRaw = map.get(DB_NODE_PRESETS_KEY);
        const configs: Record<string, PathConfig> = {};
        const settingsConfigs: Record<string, PathConfig> = {};
        let metas: PathMeta[] = [];
        let settingsMetas: PathMeta[] = [];
        let loadedLastError: { message: string; time: string; pathId?: string | null } | null = null;
        if (lastErrorRaw) {
          try {
            const parsed = JSON.parse(lastErrorRaw) as {
              message?: string;
              time?: string;
              pathId?: string | null;
            };
            if (parsed?.message && parsed?.time) {
              loadedLastError = {
                message: parsed.message,
                time: parsed.time,
                pathId: parsed.pathId ?? null,
              };
              setLastError(loadedLastError);
            }
          } catch {
            setLastError(null);
          }
        }
        if (presetsRaw) {
          try {
            const parsed = JSON.parse(presetsRaw) as ClusterPreset[];
            if (Array.isArray(parsed)) {
              setClusterPresets(parsed);
            }
          } catch (error) {
            reportAiPathsError(error, { action: "parsePresets" }, "Failed to parse presets:");
          }
        }
        if (queryPresetsRaw) {
          try {
            const parsed = JSON.parse(queryPresetsRaw) as DbQueryPreset[];
            if (Array.isArray(parsed)) {
              const normalized = parsed.map((item: DbQueryPreset): DbQueryPreset => normalizeDbQueryPreset(item));
              setDbQueryPresets(normalized);
            }
          } catch (error) {
            reportAiPathsError(error, { action: "parseQueryPresets" }, "Failed to parse query presets:");
          }
        }
        if (dbNodePresetsRaw) {
          try {
            const parsed = JSON.parse(dbNodePresetsRaw) as DbNodePreset[];
            if (Array.isArray(parsed)) {
              const normalized = parsed.map((item: DbNodePreset): DbNodePreset => normalizeDbNodePreset(item));
              setDbNodePresets(normalized);
            }
          } catch (error) {
            reportAiPathsError(error, { action: "parseDbNodePresets" }, "Failed to parse database presets:");
          }
        }
        if (indexRaw) {
          const parsedIndex = JSON.parse(indexRaw) as PathMeta[];
          if (Array.isArray(parsedIndex)) {
            settingsMetas = parsedIndex;
          }
        }

        if (settingsMetas.length > 0) {
          settingsMetas.forEach((meta: PathMeta) => {
            const configRaw = map.get(`${PATH_CONFIG_PREFIX}${meta.id}`);
            if (configRaw) {
              try {
                const parsedConfig = JSON.parse(configRaw) as PathConfig;
                settingsConfigs[meta.id] = {
                  ...parsedConfig,
                  id: meta.id,
                  name: parsedConfig.name || meta.name,
                };
              } catch {
                settingsConfigs[meta.id] = createDefaultPathConfig(meta.id);
              }
            } else {
              settingsConfigs[meta.id] = createDefaultPathConfig(meta.id);
            }
          });
        }

        const shouldPreferPrefs =
          preferredPathConfigs &&
          Object.keys(preferredPathConfigs).length > 0 &&
          (settingsMetas.length === 0 ||
            Object.keys(preferredPathConfigs).some((id: string): boolean => {
              if (!settingsConfigs[id]) return true;
              const prefUpdated =
                typeof preferredPathConfigs[id]?.updatedAt === "string"
                  ? preferredPathConfigs[id]?.updatedAt
                  : "";
              const settingsUpdated =
                typeof settingsConfigs[id]?.updatedAt === "string"
                  ? settingsConfigs[id]?.updatedAt
                  : "";
              if (!settingsUpdated && prefUpdated) return true;
              if (!prefUpdated) return false;
              return prefUpdated > settingsUpdated;
            }));

        if (!shouldPreferPrefs && settingsMetas.length > 0) {
          Object.assign(configs, settingsConfigs);
          metas = settingsMetas;
        } else if (shouldPreferPrefs && preferredPathConfigs && Object.keys(preferredPathConfigs).length > 0) {
          Object.entries(preferredPathConfigs).forEach(([id, config]: [string, PathConfig]) => {
            const fallback = createDefaultPathConfig(id);
            configs[id] = {
              ...fallback,
              ...config,
              id,
              name: config?.name || fallback.name,
              nodes: Array.isArray(config?.nodes) ? config.nodes : fallback.nodes,
              edges: Array.isArray(config?.edges) ? config.edges : fallback.edges,
              parserSamples: config?.parserSamples ?? fallback.parserSamples ?? {},
              updaterSamples: config?.updaterSamples ?? fallback.updaterSamples ?? {},
              runtimeState: parseRuntimeState(config?.runtimeState ?? fallback.runtimeState),
              lastRunAt: config?.lastRunAt ?? fallback.lastRunAt ?? null,
              updatedAt: config?.updatedAt ?? fallback.updatedAt,
            };
          });
          metas =
            preferredPathIndex && preferredPathIndex.length > 0
              ? preferredPathIndex.filter((meta: PathMeta): boolean => !!configs[meta.id])
              : Object.values(configs).map((c: PathConfig): PathMeta => createPathMeta(c));
          if (metas.length > 0) {
            try {
              const settingsPayloads = metas.map((meta: PathMeta): { key: string; value: string } => ({
                key: `${PATH_CONFIG_PREFIX}${meta.id}`,
                value: JSON.stringify(sanitizePathConfig(configs[meta.id]!)),
              }));
              settingsPayloads.push({
                key: PATH_INDEX_KEY,
                value: JSON.stringify(metas),
              });
              await updateSettingsBulkMutation.mutateAsync(settingsPayloads);
            } catch (error) {
              console.warn("[AI Paths] Failed to migrate path configs to settings.", error);
            }
          }
        } else {
          const legacyRaw = map.get(`${PATH_CONFIG_PREFIX}default`) ?? map.get("ai_paths_config");
          if (legacyRaw) {
            const parsed = JSON.parse(legacyRaw) as {
              version?: number;
              pathName?: string;
              description?: string;
              trigger?: string;
              nodes?: AiNode[];
              edges?: Edge[];
            };
            const legacyConfig: PathConfig = {
              id: "default",
              version: parsed.version ?? STORAGE_VERSION,
              name: parsed.pathName ?? "AI Description Path",
              description: parsed.description ?? "",
              trigger: parsed.trigger ?? (triggers[0] ?? "Product Modal - Context Filter"),
              nodes: Array.isArray(parsed.nodes) ? parsed.nodes : initialNodes,
              edges: Array.isArray(parsed.edges) ? parsed.edges : initialEdges,
              updatedAt: new Date().toISOString(),
              runtimeState: { inputs: {}, outputs: {} },
              lastRunAt: null,
            };
            configs[legacyConfig.id] = legacyConfig;
            metas = [createPathMeta(legacyConfig)];
          } else {
            const fallback = createDefaultPathConfig("default");
            configs[fallback.id] = fallback;
            metas = [createPathMeta(fallback)];
          }
        }

        setPaths(metas);
        setPathConfigs(configs);
        const initialConfigsHash = buildPathConfigsHash(configs);
        lastPathSavePayloadRef.current = stableStringify({
          aiPathsPathIndex: metas,
          aiPathsPathConfigs: initialConfigsHash,
        });
        if (preferredGroups !== null) {
          setExpandedPaletteGroups(new Set(preferredGroups));
        }
        const firstPathCandidate = metas[0]?.id ?? Object.keys(configs)[0] ?? "default";
        const firstPath =
          preferredPathId && configs[preferredPathId]
            ? preferredPathId
            : firstPathCandidate;
        const firstConfigForSettings = configs[firstPath];
        if (firstConfigForSettings) {
          lastSettingsPayloadRef.current = stableStringify({
            index: metas,
            configId: firstPath,
            config: normalizeConfigForHash(sanitizePathConfig(firstConfigForSettings)),
          });
        }
        setActivePathId(firstPath);
        const activeConfig = configs[firstPath] ?? createDefaultPathConfig(firstPath);
        const normalizedNodes = normalizeNodes(activeConfig.nodes);
        setNodes(normalizedNodes);
        setEdges(sanitizeEdges(normalizedNodes, activeConfig.edges));
        setPathName(activeConfig.name);
        setPathDescription(activeConfig.description);
        setActiveTrigger(normalizeTriggerLabel(activeConfig.trigger));
        setParserSamples(activeConfig.parserSamples ?? {});
        setUpdaterSamples(activeConfig.updaterSamples ?? {});
        setRuntimeState(parseRuntimeState(activeConfig.runtimeState));
        setLastRunAt(activeConfig.lastRunAt ?? null);
        setSelectedNodeId(normalizedNodes[0]?.id ?? null);
        if (loadedLastError?.message === "Failed to load AI Paths settings") {
          setLastError(null);
          void persistLastError(null);
        }
        setPrefsLoaded(true);
      } catch (error) {
        reportAiPathsError(error, { action: "loadConfig" }, "Failed to load AI Paths settings:");
        toast("Failed to load AI Paths settings.", { variant: "error" });
      } finally {
        loadInFlightRef.current = false;
        setLoading(false);
      }
    };
    void loadConfig();
  }, [
    toast,
    reportAiPathsError,
    loadNonce,
    settingsQuery,
    preferencesQuery,
    updateSettingsBulkMutation,
    normalizeConfigForHash,
    buildPathConfigsHash,
    persistLastError,
  ]);

  useEffect((): void | (() => void) => {
    if (!prefsLoaded) return;
    const expandedGroups = Array.from(expandedPaletteGroups).sort();
    const payload = {
      aiPathsActivePathId: activePathId,
      aiPathsExpandedGroups: expandedGroups,
      aiPathsPaletteCollapsed: paletteCollapsed,
    };
    const payloadKey = stableStringify(payload);
    if (payloadKey === lastPrefsPayloadRef.current) return;
    lastPrefsPayloadRef.current = payloadKey;
    const timeout = setTimeout((): void => {
      updatePreferencesMutation.mutate(payload);
    }, 200);
    return (): void => clearTimeout(timeout);
  }, [activePathId, expandedPaletteGroups, paletteCollapsed, prefsLoaded, updatePreferencesMutation]);

  useEffect((): void | (() => void) => {
    const handlePointerUp = (): void => {
      setConnecting(null);
      setConnectingPos(null);
    };
    window.addEventListener("pointerup", handlePointerUp);
    return (): void => window.removeEventListener("pointerup", handlePointerUp);
  }, []);

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

  useEffect((): void | (() => void) => {
    if (!lastDrop) return;
    if (lastDropTimerRef.current) {
      window.clearTimeout(lastDropTimerRef.current);
    }
    lastDropTimerRef.current = window.setTimeout((): void => {
      setLastDrop(null);
      lastDropTimerRef.current = null;
    }, 1600);
    return (): void => {
      if (lastDropTimerRef.current) {
        window.clearTimeout(lastDropTimerRef.current);
        lastDropTimerRef.current = null;
      }
    };
  }, [lastDrop]);

  // Cleanup RAF on unmount
  useEffect((): () => void => {
    return (): void => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  useEffect((): void | (() => void) => {
    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-port]")) return;
      if (target?.closest("path")) return;
      if (target?.closest("[data-edge-panel]")) return;
      setConnecting(null);
      setConnectingPos(null);
      setSelectedEdgeId(null);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return (): void => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const handleRemoveEdge = useCallback(
    (edgeId: string): void => {
      setEdges((prev: Edge[]): Edge[] => {
        const target = prev.find((edge: Edge): boolean => edge.id === edgeId) ?? null;
        if (!target) return prev;
        const remaining = prev.filter((edge: Edge): boolean => edge.id !== edgeId);
        clearRuntimeInputsForEdges([target], remaining);
        return remaining;
      });
      if (selectedEdgeId === edgeId) {
        setSelectedEdgeId(null);
      }
    },
    [clearRuntimeInputsForEdges, selectedEdgeId]
  );

  const handleDisconnectPort = useCallback(
    (direction: "input" | "output", nodeId: string, port: string): void => {
      setEdges((prev: Edge[]): Edge[] => {
        const shouldRemove = (edge: Edge): boolean =>
          direction === "input"
            ? edge.to === nodeId && edge.toPort === port
            : edge.from === nodeId && edge.fromPort === port;
        const removed = prev.filter((edge: Edge): boolean => shouldRemove(edge));
        const remaining = prev.filter((edge: Edge): boolean => !shouldRemove(edge));
        if (selectedEdgeId) {
          const selectedEdge = prev.find((edge: Edge) => edge.id === selectedEdgeId);
          if (selectedEdge && shouldRemove(selectedEdge)) {
            setSelectedEdgeId(null);
          }
        }
        clearRuntimeInputsForEdges(removed, remaining);
        return remaining;
      });
    },
    [clearRuntimeInputsForEdges, selectedEdgeId]
  );

  const isTypingTarget = (target: EventTarget | null): boolean => {
    const element = target as HTMLElement | null;
    if (!element) return false;
    if (element.isContentEditable) return true;
    const tag = element.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    return Boolean(element.closest("input, textarea, select, [contenteditable=\"true\"]"));
  };

  const handleDeleteSelectedNode = useCallback((): void => {
    if (!selectedNodeId) return;
    const targetNode = nodes.find((node: AiNode): boolean => node.id === selectedNodeId);
    const label = targetNode?.title || "this node";
    const confirmed = window.confirm(`Remove ${label}? This will delete connected wires.`);
    if (!confirmed) return;
    setNodes((prev: AiNode[]): AiNode[] => prev.filter((node: AiNode): boolean => node.id !== selectedNodeId));
    setEdges((prev: Edge[]): Edge[] => {
      const removed = prev.filter(
        (edge: Edge): boolean => edge.from === selectedNodeId || edge.to === selectedNodeId
      );
      const remaining = prev.filter(
        (edge: Edge): boolean => edge.from !== selectedNodeId && edge.to !== selectedNodeId
      );
      clearRuntimeInputsForEdges(removed, remaining);
      return remaining;
    });
    setSelectedNodeId(null);
  }, [nodes, selectedNodeId, clearRuntimeInputsForEdges]);

  useEffect((): void | (() => void) => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setConnecting(null);
        setConnectingPos(null);
        setSelectedEdgeId(null);
      }
      if (event.key === "Backspace" || event.key === "Delete") {
        if (isTypingTarget(event.target)) return;
        if (selectedEdgeId) {
          event.preventDefault();
          handleRemoveEdge(selectedEdgeId);
          return;
        }
        if (selectedNodeId) {
          event.preventDefault();
          handleDeleteSelectedNode();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return (): void => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEdgeId, selectedNodeId, handleRemoveEdge, handleDeleteSelectedNode]);

  useEffect((): void => {
    setEdges((prev: Edge[]): Edge[] => sanitizeEdges(nodes, prev));
  }, [nodes]);

  const setViewClamped = (next: { x: number; y: number; scale: number }): void => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    const clampedScale = clampScale(next.scale);
    const clamped = clampTranslate(next.x, next.y, clampedScale, viewport);
    setView({ x: clamped.x, y: clamped.y, scale: clampedScale });
  };

  const zoomTo = (targetScale: number): void => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    if (!viewport) {
      setViewClamped({ ...view, scale: targetScale });
      return;
    }
    const centerX = viewport.width / 2;
    const centerY = viewport.height / 2;
    const nextScale = clampScale(targetScale);
    const canvasX = (centerX - view.x) / view.scale;
    const canvasY = (centerY - view.y) / view.scale;
    const nextX = centerX - canvasX * nextScale;
    const nextY = centerY - canvasY * nextScale;
    const clamped = clampTranslate(nextX, nextY, nextScale, viewport);
    setView({ x: clamped.x, y: clamped.y, scale: nextScale });
  };

  const fitToNodesWith = (items: AiNode[]): void => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    if (!viewport || items.length === 0) {
      resetView();
      return;
    }
    const padding = 120;
    const bounds = items.reduce(
      (acc: { minX: number; minY: number; maxX: number; maxY: number }, node: AiNode) => {
        const x1 = node.position.x;
        const y1 = node.position.y;
        const x2 = node.position.x + NODE_WIDTH;
        const y2 = node.position.y + NODE_MIN_HEIGHT;
        return {
          minX: Math.min(acc.minX, x1),
          minY: Math.min(acc.minY, y1),
          maxX: Math.max(acc.maxX, x2),
          maxY: Math.max(acc.maxY, y2),
        };
      },
      {
        minX: Number.POSITIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
      }
    );
    const width = Math.max(1, bounds.maxX - bounds.minX + padding * 2);
    const height = Math.max(1, bounds.maxY - bounds.minY + padding * 2);
    const scaleX = viewport.width / width;
    const scaleY = viewport.height / height;
    const nextScale = clampScale(Math.min(scaleX, scaleY));
    const centerX = bounds.minX + (bounds.maxX - bounds.minX) / 2;
    const centerY = bounds.minY + (bounds.maxY - bounds.minY) / 2;
    const nextX = viewport.width / 2 - centerX * nextScale;
    const nextY = viewport.height / 2 - centerY * nextScale;
    const clamped = clampTranslate(nextX, nextY, nextScale, viewport);
    setView({ x: clamped.x, y: clamped.y, scale: nextScale });
  };

  const fitToNodes = (): void => {
    fitToNodesWith(nodes);
  };

  const resetView = (): void => {
    setViewClamped({ x: VIEW_MARGIN, y: VIEW_MARGIN, scale: 1 });
  };



  const ensureNodeVisible = (node: AiNode): void => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    if (!viewport) return;
    const nodeLeft = node.position.x * view.scale + view.x;
    const nodeTop = node.position.y * view.scale + view.y;
    const nodeRight = nodeLeft + NODE_WIDTH * view.scale;
    const nodeBottom = nodeTop + NODE_MIN_HEIGHT * view.scale;
    let nextX = view.x;
    let nextY = view.y;
    if (nodeLeft < VIEW_MARGIN) {
      nextX += VIEW_MARGIN - nodeLeft;
    } else if (nodeRight > viewport.width - VIEW_MARGIN) {
      nextX -= nodeRight - (viewport.width - VIEW_MARGIN);
    }
    if (nodeTop < VIEW_MARGIN) {
      nextY += VIEW_MARGIN - nodeTop;
    } else if (nodeBottom > viewport.height - VIEW_MARGIN) {
      nextY -= nodeBottom - (viewport.height - VIEW_MARGIN);
    }
    const clamped = clampTranslate(nextX, nextY, view.scale, viewport);
    setView({ x: clamped.x, y: clamped.y, scale: view.scale });
  };

  const selectedNode = useMemo(
    (): AiNode | null => nodes.find((node: AiNode): boolean => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );
  const connectingFromNode = useMemo(
    (): AiNode | null => (connecting ? nodes.find((node: AiNode): boolean => node.id === connecting.fromNodeId) ?? null : null),
    [connecting, nodes]
  );

  const getPortPosition = useCallback((
    node: AiNode,
    portName: string | undefined,
    side: "input" | "output"
  ): { x: number; y: number } => {
    const ports = side === "input" ? node.inputs : node.outputs;
    const index = portName ? ports.indexOf(portName) : -1;
    const safeIndex = index >= 0 ? index : Math.max(0, Math.floor(ports.length / 2));
    const x = node.position.x + (side === "output" ? NODE_WIDTH : 0);
    const y = node.position.y + getPortOffsetY(safeIndex, ports.length);
    return { x, y };
  }, []);

  const handleReconnectInput = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, nodeId: string, port: string): void => {
      if (connecting) return;
      let edgeToMove: Edge | null = null;
      for (let index = edges.length - 1; index >= 0; index -= 1) {
        const edge = edges[index];
        if (edge && edge.to === nodeId && edge.toPort === port) {
          edgeToMove = edge;
          break;
        }
      }
      if (!edgeToMove || !edgeToMove.from || !edgeToMove.fromPort) return;
      const fromNode = nodes.find((node: AiNode): boolean => node.id === edgeToMove.from);
      if (!fromNode) return;
      const start = getPortPosition(fromNode, edgeToMove.fromPort, "output");
      const viewport = viewportRef.current?.getBoundingClientRect();
      const nextPos = viewport
        ? {
            x: (event.clientX - viewport.left - view.x) / view.scale,
            y: (event.clientY - viewport.top - view.y) / view.scale,
          }
        : start;
      setEdges((prev: Edge[]): Edge[] => {
        const remaining = prev.filter(
          (edge: Edge): boolean => edge.id !== edgeToMove.id
        );
        clearRuntimeInputsForEdges([edgeToMove], remaining);
        return remaining;
      });
      if (selectedEdgeId === edgeToMove.id) {
        setSelectedEdgeId(null);
      }
      setConnecting({ fromNodeId: edgeToMove.from, fromPort: edgeToMove.fromPort, start });
      setConnectingPos(nextPos);
    },
    [connecting, edges, nodes, selectedEdgeId, view, getPortPosition, clearRuntimeInputsForEdges]
  );

  // Create a stable key based only on edge-relevant node data (position, ports)
  // This prevents edge recalculation when only config/title changes occur
  const nodePositionsKey = useMemo(
    (): string =>
      nodes
        .map(
          (n: AiNode): string =>
            `${n.id}:${n.position.x}:${n.position.y}:${n.inputs.length}:${n.outputs.length}`
        )
        .join("|"),
    [nodes]
  );

  const edgePaths = useMemo((): { id: string; path: string; label?: string; arrow?: { x: number; y: number; angle: number } }[] => {
    const nodeMap = new Map(nodes.map((node: AiNode): [string, AiNode] => [node.id, node]));
    const midpoint = (a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number } => ({
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    });
    return edges
      .map((edge: Edge): { id: string; path: string; label?: string; arrow?: { x: number; y: number; angle: number } } | null => {
        const from = nodeMap.get(edge.from);
        const to = nodeMap.get(edge.to);
        if (!from || !to) return null;
        const fromPort =
          edge.fromPort ?? (from.outputs.length > 0 ? from.outputs[0] : undefined);
        const toPort = edge.toPort ?? (to.inputs.length > 0 ? to.inputs[0] : undefined);
        const fromPos = getPortPosition(from, fromPort, "output");
        const toPos = getPortPosition(to, toPort, "input");
        const p0 = { x: fromPos.x, y: fromPos.y };
        const p3 = { x: toPos.x, y: toPos.y };
        const midX = p0.x + (p3.x - p0.x) * 0.5;
        const p1 = { x: midX, y: p0.y };
        const p2 = { x: midX, y: p3.y };
        const q0 = midpoint(p0, p1);
        const q1 = midpoint(p1, p2);
        const q2 = midpoint(p2, p3);
        const r0 = midpoint(q0, q1);
        const r1 = midpoint(q1, q2);
        const s = midpoint(r0, r1);
        const path = [
          `M ${p0.x} ${p0.y}`,
          `C ${q0.x} ${q0.y}, ${r0.x} ${r0.y}, ${s.x} ${s.y}`,
          `C ${r1.x} ${r1.y}, ${q2.x} ${q2.y}, ${p3.x} ${p3.y}`,
        ].join(" ");
        let dx = r1.x - r0.x;
        let dy = r1.y - r0.y;
        if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
          dx = p3.x - p0.x;
          dy = p3.y - p0.y;
        }
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        return {
          id: edge.id,
          path,
          label: edge.label,
          arrow: { x: s.x, y: s.y, angle },
        };
      })
      .filter(Boolean) as { id: string; path: string; label?: string; arrow?: { x: number; y: number; angle: number } }[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edges, nodePositionsKey]);

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    nodeId: string
  ): void => {
    event.stopPropagation();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const viewport = viewportRef.current?.getBoundingClientRect();
    if (!viewport) return;
    const node = nodes.find((item: AiNode): boolean => item.id === nodeId);
    if (!node) return;
    const canvasX = (event.clientX - viewport.left - view.x) / view.scale;
    const canvasY = (event.clientY - viewport.top - view.y) / view.scale;
    setDragState({
      nodeId,
      offsetX: canvasX - node.position.x,
      offsetY: canvasY - node.position.y,
    });
  };

  const handlePointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
    nodeId: string
  ): void => {
    if (!dragState || dragState.nodeId !== nodeId) return;
    const viewport = viewportRef.current?.getBoundingClientRect();
    if (!viewport) return;
    const nextX = Math.min(
      Math.max((event.clientX - viewport.left - view.x) / view.scale - dragState.offsetX, 16),
      CANVAS_WIDTH - NODE_WIDTH - 16
    );
    const nextY = Math.min(
      Math.max((event.clientY - viewport.top - view.y) / view.scale - dragState.offsetY, 16),
      CANVAS_HEIGHT - NODE_MIN_HEIGHT - 16
    );

    // RAF throttling: batch position updates to animation frames
    pendingDragRef.current = { nodeId, x: nextX, y: nextY };
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame((): void => {
        if (pendingDragRef.current) {
          const { nodeId: id, x, y } = pendingDragRef.current;
          setNodes((prev: AiNode[]): AiNode[] =>
            prev.map((node: AiNode): AiNode =>
              node.id === id ? { ...node, position: { x, y } } : node
            )
          );
        }
        rafIdRef.current = null;
      });
    }
  };

  const handlePointerUp = (
    event: React.PointerEvent<HTMLDivElement>,
    nodeId: string
  ): void => {
    if (dragState?.nodeId !== nodeId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);

    // Flush any pending RAF drag update immediately on pointer up
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (pendingDragRef.current) {
      const { nodeId: id, x, y } = pendingDragRef.current;
      setNodes((prev: AiNode[]): AiNode[] =>
        prev.map((node: AiNode): AiNode =>
          node.id === id ? { ...node, position: { x, y } } : node
        )
      );
      pendingDragRef.current = null;
    }

    setDragState(null);
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    node: NodeDefinition
  ): void => {
    event.dataTransfer.effectAllowed = "copy";
    const payload = JSON.stringify(node);
    event.dataTransfer.setData("application/x-ai-node", payload);
    event.dataTransfer.setData("text/plain", payload);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    const viewport = viewportRef.current?.getBoundingClientRect();
    if (!viewport) return;
    const canvasRect = canvasRef.current?.getBoundingClientRect() ?? null;
    const data =
      event.dataTransfer.getData("application/x-ai-node") ||
      event.dataTransfer.getData("text/plain");
    if (!data) return;
    let payload: NodeDefinition | null = null;
    try {
      payload = JSON.parse(data) as NodeDefinition;
    } catch (error) {
      reportAiPathsError(error, { action: "dropNode", dataPreview: data.slice(0, 120) });
      toast("Failed to add node. Drag again.", { variant: "error" });
      return;
    }
    if (!payload) return;
    const localX = canvasRect
      ? (event.clientX - canvasRect.left) / view.scale
      : (event.clientX - viewport.left - view.x) / view.scale;
    const localY = canvasRect
      ? (event.clientY - canvasRect.top) / view.scale
      : (event.clientY - viewport.top - view.y) / view.scale;
    const nextX = Math.min(
      Math.max(localX - NODE_WIDTH / 2, 16),
      CANVAS_WIDTH - NODE_WIDTH - 16
    );
    const nextY = Math.min(
      Math.max(localY - NODE_MIN_HEIGHT / 2, 16),
      CANVAS_HEIGHT - NODE_MIN_HEIGHT - 16
    );
    const defaultConfig = getDefaultConfigForType(payload.type, payload.outputs, payload.inputs);
    const mergedConfig = payload.config
      ? {
          ...(defaultConfig ?? {}),
          ...payload.config,
        }
      : defaultConfig;
    const newNode: AiNode = {
      ...payload,
      id: `node-${Math.random().toString(36).slice(2, 8)}`,
      position: { x: nextX, y: nextY },
      ...(mergedConfig ? { config: mergedConfig } : {}),
    };
    setSelectedNodeId(newNode.id);
    setNodes((prev: AiNode[]): AiNode[] => [...prev, newNode]);
    ensureNodeVisible(newNode);
    setLastDrop({ x: nextX, y: nextY });
    toast(`Node added: ${payload.title}`, { variant: "success" });
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

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
      await updatePreferencesMutation.mutateAsync({
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

  const handleStartConnection = (
    event: React.PointerEvent<HTMLButtonElement>,
    node: AiNode,
    port: string
  ): void => {
    event.stopPropagation();
    const start = getPortPosition(node, port, "output");
    setConnecting({ fromNodeId: node.id, fromPort: port, start });
    setConnectingPos(start);
  };

  const handleCompleteConnection = (
    event: React.PointerEvent<HTMLButtonElement>,
    node: AiNode,
    port: string
  ): void => {
    event.stopPropagation();
    if (!connecting) return;
    if (connecting.fromNodeId === node.id && connecting.fromPort === port) {
      setConnecting(null);
      setConnectingPos(null);
      return;
    }

    const fromNode = nodes.find((n: AiNode): boolean => n.id === connecting.fromNodeId);
    if (!fromNode) {
      setConnecting(null);
      setConnectingPos(null);
      return;
    }

    const validation = validateConnection(
      fromNode,
      node,
      connecting.fromPort,
      port
    );

    if (!validation.valid) {
      toast(validation.message ?? "Invalid connection.", { variant: "error" });
      setConnecting(null);
      setConnectingPos(null);
      return;
    }

    setEdges((prev: Edge[]): Edge[] => [
      ...prev,
      {
        id: `edge-${Math.random().toString(36).slice(2, 8)}`,
        from: connecting.fromNodeId,
        to: node.id,
        fromPort: connecting.fromPort,
        toPort: port,
      },
    ]);
    toast("Connection created.", { variant: "success" });
    setConnecting(null);
    setConnectingPos(null);
  };

  const handlePanStart = (event: React.PointerEvent<HTMLDivElement>): void => {
    const canvasEl = canvasRef.current;
    const targetEl = event.target as Element | null;
    if (targetEl?.closest("path")) return;
    if (
      event.target !== event.currentTarget &&
      event.target !== canvasEl &&
      targetEl?.tagName?.toLowerCase() !== "svg"
    ) {
      return;
    }
    if (connecting) {
      setConnecting(null);
      setConnectingPos(null);
      return;
    }
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    setPanState({
      startX: event.clientX,
      startY: event.clientY,
      originX: view.x,
      originY: view.y,
    });
  };

  const handlePanMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (connecting) {
      const viewport = viewportRef.current?.getBoundingClientRect();
      if (!viewport) return;
      const x = (event.clientX - viewport.left - view.x) / view.scale;
      const y = (event.clientY - viewport.top - view.y) / view.scale;
      setConnectingPos({ x, y });
      return;
    }
    if (!panState) return;
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    const nextX = panState.originX + (event.clientX - panState.startX);
    const nextY = panState.originY + (event.clientY - panState.startY);
    const clamped = clampTranslate(nextX, nextY, view.scale, viewport);
    setView({ x: clamped.x, y: clamped.y, scale: view.scale });
  };

  const handlePanEnd = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (panState) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      setPanState(null);
    }
    if (connecting) {
      setConnecting(null);
      setConnectingPos(null);
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
      currentNodesRef.current = next;
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

  const handleSelectEdge = (edgeId: string | null): void => {
    setSelectedEdgeId(edgeId);
    if (edgeId) {
      setSelectedNodeId(null);
    }
  };

  const handleSelectNode = (nodeId: string): void => {
    setSelectedEdgeId(null);
    setSelectedNodeId(nodeId);
  };

  const getCanvasCenterPosition = (): { x: number; y: number } => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    if (!viewport) return { x: VIEW_MARGIN, y: VIEW_MARGIN };
    const centerX = (viewport.width / 2 - view.x) / view.scale;
    const centerY = (viewport.height / 2 - view.y) / view.scale;
    const nextX = Math.min(
      Math.max(centerX - NODE_WIDTH / 2, 16),
      CANVAS_WIDTH - NODE_WIDTH - 16
    );
    const nextY = Math.min(
      Math.max(centerY - NODE_MIN_HEIGHT / 2, 16),
      CANVAS_HEIGHT - NODE_MIN_HEIGHT - 16
    );
    return { x: nextX, y: nextY };
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

  const persistPathSettings = useCallback(async (
    nextPaths: PathMeta[],
    configId: string,
    config: PathConfig
  ): Promise<void> => {
    const sanitizedConfig = sanitizePathConfig(config);
    const payloadKey = stableStringify({
      index: nextPaths,
      configId,
      config: normalizeConfigForHash(sanitizedConfig),
    });
    if (payloadKey === lastSettingsPayloadRef.current) return;
    await updateSettingsBulkMutation.mutateAsync([
      { key: PATH_INDEX_KEY, value: JSON.stringify(nextPaths) },
      {
        key: `${PATH_CONFIG_PREFIX}${configId}`,
        value: JSON.stringify(sanitizedConfig),
      },
    ]);
    lastSettingsPayloadRef.current = payloadKey;
  }, [normalizeConfigForHash, updateSettingsBulkMutation]);

  const buildPathSnapshot = useCallback((): string =>
    stableStringify({
      activePathId,
      name: pathName,
      description: pathDescription,
      trigger: activeTrigger,
      nodes: [...nodes].sort((a: AiNode, b: AiNode): number => a.id.localeCompare(b.id)),
      edges: [...edges].sort((a: Edge, b: Edge): number => a.id.localeCompare(b.id)),
      parserSamples,
      updaterSamples,
    }), [
    activePathId,
    pathName,
    pathDescription,
    activeTrigger,
    nodes,
    edges,
    parserSamples,
    updaterSamples,
  ]);

  const persistPathConfig = useCallback(async (options?: { silent?: boolean; force?: boolean }): Promise<boolean> => {
    if (!activePathId) return;
    const silent = options?.silent ?? false;
    const force = options?.force ?? false;
    if (!force) {
      const snapshot = buildPathSnapshot();
      if (snapshot && snapshot === lastSavedSnapshotRef.current) {
        return true;
      }
    }
    if (!silent) setSaving(true);
    try {
      const updatedAt = new Date().toISOString();
      const config = buildActivePathConfig(updatedAt);
      const nextPaths = paths.map((path: PathMeta): PathMeta =>
        path.id === activePathId ? { ...path, name: pathName, updatedAt } : path
      );
      const nextConfigs = { ...pathConfigs, [activePathId]: config };
      setPathConfigs(nextConfigs);
      setPaths(nextPaths);
      const safeConfigs = serializePathConfigs(nextConfigs);
      const safeConfigsHash = buildPathConfigsHash(nextConfigs);
      const payloadKey = stableStringify({
        aiPathsPathIndex: nextPaths,
        aiPathsPathConfigs: safeConfigsHash,
      });
      if (payloadKey !== lastPathSavePayloadRef.current) {
        await updatePreferencesMutation.mutateAsync({
          aiPathsPathIndex: nextPaths,
          aiPathsPathConfigs: safeConfigs,
        });
        lastPathSavePayloadRef.current = payloadKey;
      }
      await persistPathSettings(nextPaths, activePathId, config);
      setLastError(null);
      void persistLastError(null);
      lastSavedSnapshotRef.current = buildPathSnapshot();
      if (!silent) {
        toast("AI Paths saved.", { variant: "success" });
      }
      return true;
    } catch (error) {
      reportAiPathsError(error, { action: silent ? "autoSavePath" : "savePath", pathId: activePathId }, "Failed to save AI Paths settings:");
      if (!silent) {
        toast("Failed to save AI Paths settings.", { variant: "error" });
      }
      return false;
    } finally {
      if (!silent) setSaving(false);
    }
  }, [
    activePathId,
    pathName,
    paths,
    pathConfigs,
    buildActivePathConfig,
    persistPathSettings,
    buildPathSnapshot,
    buildPathConfigsHash,
    updatePreferencesMutation,
    reportAiPathsError,
    persistLastError,
    toast,
  ]);

  const handleSave = async (): Promise<void> => {
    const ok = await persistPathConfig({ force: true });
    if (ok) {
      setAutoSaveStatus("saved");
      setAutoSaveAt(new Date().toISOString());
    } else {
      setAutoSaveStatus("error");
    }
  };

  useEffect((): void => {
    if (loading || !activePathId) return;
    lastSavedSnapshotRef.current = buildPathSnapshot();
  }, [activePathId, loading, buildPathSnapshot]);

  useEffect((): void | (() => void) => {
    if (loading || !activePathId) return;
    if (saving || autoSaveInFlightRef.current) return;
    const snapshot = buildPathSnapshot();
    if (!lastSavedSnapshotRef.current) {
      lastSavedSnapshotRef.current = snapshot;
      return;
    }
    if (snapshot === lastSavedSnapshotRef.current) return;
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = window.setTimeout((): void => {
      if (autoSaveInFlightRef.current) return;
      autoSaveInFlightRef.current = true;
      setAutoSaveStatus("saving");
      void persistPathConfig({ silent: true })
        .then((ok: boolean) => {
          if (ok) {
            setAutoSaveStatus("saved");
            setAutoSaveAt(new Date().toISOString());
          } else {
            setAutoSaveStatus("error");
          }
        })
        .finally(() => {
          autoSaveInFlightRef.current = false;
        });
    }, AUTO_SAVE_DEBOUNCE_MS);
    return (): void => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [
    activePathId,
    activeTrigger,
    edges,
    loading,
    nodes,
    parserSamples,
    pathDescription,
    pathName,
    saving,
    updaterSamples,
    buildPathSnapshot,
    persistPathConfig,
  ]);

  // Keep refs in sync with state (for beforeunload handler which can't use stale closures)
  useEffect((): void => { currentNodesRef.current = nodes; }, [nodes]);
  useEffect((): void => { currentEdgesRef.current = edges; }, [edges]);
  useEffect((): void => { currentPathsRef.current = paths; }, [paths]);
  useEffect((): void => { currentPathConfigsRef.current = pathConfigs; }, [pathConfigs]);
  useEffect((): void => { currentActivePathIdRef.current = activePathId; }, [activePathId]);
  useEffect((): void => { currentPathNameRef.current = pathName; }, [pathName]);
  useEffect((): void => { currentPathDescriptionRef.current = pathDescription; }, [pathDescription]);
  useEffect((): void => { currentActiveTriggerRef.current = activeTrigger; }, [activeTrigger]);
  useEffect((): void => { currentParserSamplesRef.current = parserSamples; }, [parserSamples]);
  useEffect((): void => { currentUpdaterSamplesRef.current = updaterSamples; }, [updaterSamples]);
  useEffect((): void => { currentRuntimeStateRef.current = runtimeState; }, [runtimeState]);
  useEffect((): void => { currentLastRunAtRef.current = lastRunAt; }, [lastRunAt]);

  // Save immediately when page is about to unload or tab loses focus
  useEffect((): void | (() => void) => {
    const flushPendingSaveAsync = (): void => {
      if (!currentActivePathIdRef.current || loading) return;
      // Clear any pending debounced save
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      // Check if there are unsaved changes
      const snapshot = buildPathSnapshot();
      if (snapshot === lastSavedSnapshotRef.current) return;
      if (autoSaveInFlightRef.current) return;
      // Trigger immediate save
      autoSaveInFlightRef.current = true;
      void persistPathConfig({ silent: true }).finally(() => {
        autoSaveInFlightRef.current = false;
      });
    };

    // Synchronous save using sendBeacon for beforeunload (async won't complete)
    // Uses refs to get the LATEST state values, not stale closure values
    const flushPendingSaveSync = (): void => {
      const pathId = currentActivePathIdRef.current;
      if (!pathId) return;
      // Clear any pending debounced save
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      // Always save on navigation - don't skip even if snapshot matches
      // Build the payload using refs (latest values)
      const updatedAt = new Date().toISOString();
      const config: PathConfig = {
        id: pathId,
        version: STORAGE_VERSION,
        name: currentPathNameRef.current,
        description: currentPathDescriptionRef.current,
        trigger: currentActiveTriggerRef.current,
        nodes: currentNodesRef.current,
        edges: currentEdgesRef.current,
        updatedAt,
        parserSamples: currentParserSamplesRef.current,
        updaterSamples: currentUpdaterSamplesRef.current,
        runtimeState: currentRuntimeStateRef.current,
        lastRunAt: currentLastRunAtRef.current,
      };
      const currentPaths = currentPathsRef.current;
      const nextPaths = currentPaths.map((path: PathMeta): PathMeta =>
        path.id === pathId ? { ...path, name: currentPathNameRef.current, updatedAt } : path
      );
      const nextConfigs = { ...currentPathConfigsRef.current, [pathId]: config };
      const safeConfigs = serializePathConfigs(nextConfigs);

      // Use sendBeacon for reliable delivery during page unload
      const prefsPayload = JSON.stringify({
        aiPathsPathIndex: nextPaths,
        aiPathsPathConfigs: safeConfigs,
      });

      // Save to preferences
      try {
        navigator.sendBeacon(
          "/api/user/preferences",
          new Blob([prefsPayload], { type: "application/json" })
        );
      } catch {
        void fetch("/api/user/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: prefsPayload,
          keepalive: true,
        });
      }

      // Also save to settings (the primary storage)
      const sanitizedConfig = sanitizePathConfig(config);
      const indexPayload = JSON.stringify({ key: PATH_INDEX_KEY, value: JSON.stringify(nextPaths) });
      const configPayload = JSON.stringify({ key: `${PATH_CONFIG_PREFIX}${pathId}`, value: JSON.stringify(sanitizedConfig) });

      try {
        navigator.sendBeacon(
          "/api/settings",
          new Blob([indexPayload], { type: "application/json" })
        );
        navigator.sendBeacon(
          "/api/settings",
          new Blob([configPayload], { type: "application/json" })
        );
      } catch {
        void fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: indexPayload,
          keepalive: true,
        });
        void fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: configPayload,
          keepalive: true,
        });
      }
    };

    const handleBeforeUnload = (): void => {
      flushPendingSaveSync();
    };

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === "hidden") {
        flushPendingSaveAsync();
      }
    };

    // Intercept clicks on links to save before Next.js client-side navigation
    const handleLinkClick = (event: MouseEvent): void => {
      const target = event.target as HTMLElement;
      const anchor = target.closest("a");
      if (anchor && anchor.href && !anchor.href.startsWith("javascript:")) {
        // This is a link click - flush save immediately
        flushPendingSaveSync();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("click", handleLinkClick, true); // Use capture phase

    return (): void => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("click", handleLinkClick, true);
    };
  }, [loading, buildPathSnapshot, persistPathConfig]);

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
      await updatePreferencesMutation.mutateAsync({
        aiPathsPathIndex: nextPaths,
        aiPathsPathConfigs: safeConfigs,
      });
      if (nextId) {
        const nextConfig = nextConfigs[nextId] ?? createDefaultPathConfig(nextId);
        await persistPathSettings(nextPaths, nextId, nextConfig);
      } else {
        await updateSettingsBulkMutation.mutateAsync([
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

  const savePathIndex = async (nextPaths: PathMeta[]): Promise<void> => {
    try {
      const safeConfigs = serializePathConfigs(pathConfigs);
      await updatePreferencesMutation.mutateAsync({
        aiPathsPathIndex: nextPaths,
        aiPathsPathConfigs: safeConfigs,
      });
      if (activePathId) {
        const activeConfig = pathConfigs[activePathId] ?? createDefaultPathConfig(activePathId);
        await persistPathSettings(nextPaths, activePathId, activeConfig);
      } else {
        await updateSettingsBulkMutation.mutateAsync([
          { key: PATH_INDEX_KEY, value: JSON.stringify(nextPaths) },
        ]);
      }
      toast("Path list saved.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(error, { action: "savePathIndex" }, "Failed to save path list:");
      toast("Failed to save path list.", { variant: "error" });
    }
  };

  const handleCopyDocsWiring = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(docsWiringSnippet);
      toast("Wiring copied to clipboard.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(error, { action: "copyDocsWiring" }, "Failed to copy wiring:");
      toast("Failed to copy wiring.", { variant: "error" });
    }
  };

  const handleCopyDocsDescription = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(docsDescriptionSnippet);
      toast("AI Description wiring copied.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(error, { action: "copyDocsDescription" }, "Failed to copy wiring:");
      toast("Failed to copy wiring.", { variant: "error" });
    }
  };

  const handleCopyDocsJobs = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(docsJobsSnippet);
      toast("AI job wiring copied.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(error, { action: "copyDocsJobs" }, "Failed to copy wiring:");
      toast("Failed to copy wiring.", { variant: "error" });
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-400">Loading AI Paths...</div>;
  }

  const autoSaveLabel =
    autoSaveStatus === "saving"
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

  return (
    <div className="space-y-6">
      {activeTab === "canvas" && (
        <div className="space-y-6">
          {typeof document !== "undefined" && renderActions
            ? createPortal(
                renderActions(
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      className="rounded-md border text-sm text-white hover:bg-muted/60"
                      type="button"
                      onClick={handleCreatePath}
                    >
                      New Path
                    </Button>
                    <Button
                      className="rounded-md border border-indigo-500/40 text-sm text-indigo-200 hover:bg-indigo-500/10"
                      type="button"
                      onClick={handleCreateAiDescriptionPath}
                    >
                      Create AI Description Path
                    </Button>
                    <Button
                      className="rounded-md border text-sm text-white hover:bg-muted/60"
                      onClick={() => { void handleSave(); }}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Path"}
                    </Button>
                    <Button
                      className="rounded-md border border-border text-sm text-gray-300 hover:bg-card/60"
                      onClick={handleReset}
                      type="button"
                    >
                      Reset to Defaults
                    </Button>
                    <Button
                      className="rounded-md border border-border text-sm text-rose-200 hover:bg-rose-500/10"
                      onClick={() => void handleDeletePath()}
                      type="button"
                      disabled={!activePathId}
                    >
                      Delete Path
                    </Button>
                    {lastError && (
                      <div className="flex items-center gap-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-200">
                        <span className="max-w-[220px] truncate">
                          Last error: {lastError.message}
                        </span>
                        <Button
                          type="button"
                          className="rounded-md border border-rose-400/50 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-500/20"
                          onClick={() => {
                            setLastError(null);
                            void persistLastError(null);
                          }}
                        >
                          Clear
                        </Button>
                        {lastError.message === "Failed to load AI Paths settings" && (
                          <Button
                            type="button"
                            className="rounded-md border border-rose-400/50 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-500/20"
                            onClick={() => {
                              setLastError(null);
                              void persistLastError(null);
                              setLoadNonce((prev: number) => prev + 1);
                            }}
                          >
                            Retry
                          </Button>
                        )}
                        <Button
                          type="button"
                          className="rounded-md border border-rose-400/50 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-500/20"
                          onClick={() =>
                            window.location.assign(
                              `/admin/system/logs?level=error&source=client&query=${encodeURIComponent(
                                "AI Paths"
                              )}`
                            )
                          }
                        >
                          View logs
                        </Button>
                      </div>
                    )}
                  </div>
                ),
                document.getElementById("ai-paths-actions") ?? document.body
              )
            : null}
          {typeof document !== "undefined" && activePathId
            ? createPortal(
                <div className="flex items-center gap-2">
                  <div
                    className={`rounded-md border px-2 py-1 text-[10px] ${autoSaveClasses}`}
                  >
                    {autoSaveLabel}
                  </div>
                  {lastRunAt && (
                    <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-200">
                      Last run: {new Date(lastRunAt).toLocaleTimeString()}
                    </div>
                  )}
                  <Input
                    className="h-9 w-[260px] rounded-md border border-border bg-card/60 px-3 text-sm text-white"
                    value={pathName}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      const value = event.target.value;
                      setPathName(value);
                      updateActivePathMeta(value);
                    }}
                    placeholder="Path name"
                  />
                </div>,
                document.getElementById("ai-paths-name") ?? document.body
              )
            : null}

          <div className="flex flex-wrap items-start gap-6">
            <div className="min-w-[240px] flex-1 space-y-4" />
            <div className="min-w-[220px] space-y-4" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
            <div className="space-y-4">
              <CanvasSidebar
                palette={palette}
                paletteCollapsed={paletteCollapsed}
                onTogglePaletteCollapsed={() => setPaletteCollapsed((prev: boolean) => !prev)}
                expandedPaletteGroups={expandedPaletteGroups}
                onTogglePaletteGroup={togglePaletteGroup}
                onDragStart={handleDragStart}
                selectedNode={selectedNode}
                nodes={nodes}
                edges={edges}
                selectedEdgeId={selectedEdgeId}
                onSelectEdge={handleSelectEdge}
                onFireTrigger={handleFireTrigger}
                onFireTriggerPersistent={(node: AiNode, event?: React.MouseEvent<HTMLButtonElement>): void => { void handleFireTriggerPersistent(node, event); }}
                onOpenSimulation={setSimulationOpenNodeId}
                onUpdateSelectedNode={updateSelectedNode}
                onOpenNodeConfig={() => setConfigOpen(true)}
                onDeleteSelectedNode={handleDeleteSelectedNode}
                onRemoveEdge={handleRemoveEdge}
                onClearWires={() => void handleClearWires()}
              />
              <ClusterPresetsPanel
                presetDraft={presetDraft}
                setPresetDraft={setPresetDraft}
                editingPresetId={editingPresetId}
                onResetPresetDraft={handleResetPresetDraft}
                onPresetFromSelection={handlePresetFromSelection}
                onSavePreset={() => void handleSavePreset()}
                clusterPresets={clusterPresets}
                onLoadPreset={handleLoadPreset}
                onApplyPreset={handleApplyPreset}
                onDeletePreset={(presetId: string) => void handleDeletePreset(presetId)}
                onExportPresets={handleExportPresets}
              />
              <GraphModelDebugPanel payload={lastGraphModelPayload} />
              <RunHistoryPanel
                runs={runList}
                isRefreshing={runsQuery.isFetching}
                onRefresh={() => { void runsQuery.refetch(); }}
                runFilter={runFilter}
                setRunFilter={setRunFilter}
                expandedRunHistory={expandedRunHistory}
                setExpandedRunHistory={setExpandedRunHistory}
                runHistorySelection={runHistorySelection}
                setRunHistorySelection={setRunHistorySelection}
                onOpenRunDetail={(runId: string) => { void handleOpenRunDetail(runId); }}
                onResumeRun={(runId: string, mode: "resume" | "replay") => void handleResumeRun(runId, mode)}
                onCancelRun={(runId: string) => void handleCancelRun(runId)}
                onRequeueDeadLetter={(runId: string) => void handleRequeueDeadLetter(runId)}
              />
            </div>
            <CanvasBoard
              viewportRef={viewportRef}
              canvasRef={canvasRef}
              nodes={nodes}
              edges={edges}
              runtimeState={runtimeState}
              edgePaths={edgePaths}
              view={view}
              panState={panState}
              lastDrop={lastDrop}
              connecting={connecting}
              connectingPos={connectingPos}
              connectingFromNode={connectingFromNode}
              selectedNodeId={selectedNodeId}
              draggingNodeId={dragState?.nodeId ?? null}
              selectedEdgeId={selectedEdgeId}
              onSelectEdgeId={handleSelectEdge}
              onRemoveEdge={handleRemoveEdge}
              onDisconnectPort={handleDisconnectPort}
              onReconnectInput={handleReconnectInput}
              onSelectNode={handleSelectNode}
              onOpenNodeConfig={() => setConfigOpen(true)}
              onFireTrigger={handleFireTrigger}
              onPointerDownNode={handlePointerDown}
              onPointerMoveNode={handlePointerMove}
              onPointerUpNode={handlePointerUp}
              onStartConnection={handleStartConnection}
              onCompleteConnection={handleCompleteConnection}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onPanStart={handlePanStart}
              onPanMove={handlePanMove}
              onPanEnd={handlePanEnd}
              onZoomTo={zoomTo}
              onFitToNodes={fitToNodes}
              onResetView={resetView}
            />
          </div>
        </div>
      )}

      {activeTab === "paths" && (
        <PathsTabPanel
          paths={paths}
          onCreatePath={() => { void handleCreatePath(); }}
          onCreateAiDescriptionPath={() => { void handleCreateAiDescriptionPath(); }}
          onSaveList={() => { void savePathIndex(paths); }}
          onEditPath={(pathId: string): void => {
            handleSwitchPath(pathId);
            onTabChange?.("canvas");
          }}
          onDeletePath={(pathId: string): void => {
            void handleDeletePath(pathId);
          }}
        />
      )}

      {activeTab === "docs" && (
        <DocsTabPanel
          docsWiringSnippet={docsWiringSnippet}
          docsDescriptionSnippet={docsDescriptionSnippet}
          docsJobsSnippet={docsJobsSnippet}
          onCopyDocsWiring={() => void handleCopyDocsWiring()}
          onCopyDocsDescription={() => void handleCopyDocsDescription()}
          onCopyDocsJobs={() => void handleCopyDocsJobs()}
        />
      )}

      {activeTab === "queue" && <JobQueuePanel activePathId={activePathId} />}

      <NodeConfigDialog
        configOpen={configOpen}
        setConfigOpen={setConfigOpen}
        selectedNode={selectedNode}
        nodes={nodes}
        edges={edges}
        modelOptions={modelOptions}
        parserSamples={parserSamples}
        setParserSamples={setParserSamples}
        parserSampleLoading={parserSampleLoading}
        updaterSamples={updaterSamples}
        setUpdaterSamples={setUpdaterSamples}
        updaterSampleLoading={updaterSampleLoading}
        runtimeState={runtimeState}
        pathDebugSnapshot={
          (activePathId ? pathDebugSnapshots[activePathId] : null) ?? null
        }
        updateSelectedNode={updateSelectedNode}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
        handleFetchParserSample={handleFetchParserSample}
        handleFetchUpdaterSample={handleFetchUpdaterSample}
        handleRunSimulation={handleRunSimulation}
        clearRuntimeForNode={clearRuntimeForNode}
        onSendToAi={handleSendToAi}
        sendingToAi={sendingToAi}
        dbQueryPresets={dbQueryPresets}
        setDbQueryPresets={setDbQueryPresets}
        saveDbQueryPresets={saveDbQueryPresets}
        dbNodePresets={dbNodePresets}
        setDbNodePresets={setDbNodePresets}
        saveDbNodePresets={saveDbNodePresets}
        toast={toast}
      />
      <RunDetailDialog
        open={runDetailOpen}
        onOpenChange={(open: boolean): void => {
          setRunDetailOpen(open);
          if (open) setRunStreamPaused(false);
          if (!open) setRunDetail(null);
        }}
        runDetailLoading={runDetailLoading}
        runDetail={runDetail}
        runStreamStatus={runStreamStatus}
        runStreamPaused={runStreamPaused}
        onToggleStreamPause={() => setRunStreamPaused((prev: boolean) => !prev)}
        runNodeSummary={runNodeSummary}
        runEventsOverflow={runEventsOverflow}
        runEventsBatchLimit={runEventsBatchLimit}
        historyOptions={runDetailHistoryOptions}
        selectedHistoryNodeId={runDetailSelectedHistoryNodeId}
        onSelectHistoryNode={(value: string) => setRunHistoryNodeId(value)}
        historyEntries={runDetailSelectedHistoryEntries}
      />
      <PresetsDialog
        open={presetsModalOpen}
        onOpenChange={(open: boolean): void => setPresetsModalOpen(open)}
        presetsJson={presetsJson}
        setPresetsJson={setPresetsJson}
        clusterPresets={clusterPresets}
        onImportPresets={(mode: "merge" | "replace") => void handleImportPresets(mode)}
        toast={toast}
        reportAiPathsError={reportAiPathsError}
      />

      <SimulationDialog
        openNodeId={simulationOpenNodeId}
        onClose={() => setSimulationOpenNodeId(null)}
        nodes={nodes}
        setNodes={setNodes}
        onRunSimulation={handleRunSimulation}
      />
    </div>
  );
}
