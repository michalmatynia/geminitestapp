"use client";
import React, { useCallback, useMemo, useState } from "react";
import { useToast } from "@/shared/ui";
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { logClientError } from "@/features/observability";
import { useUpdateSetting } from "@/shared/hooks/use-settings";
import { dbApi, entityApi } from "@/features/ai/ai-paths/lib";
import { DOCS_DESCRIPTION_SNIPPET, DOCS_JOBS_SNIPPET, DOCS_OVERVIEW_SNIPPET, DOCS_WIRING_SNIPPET } from "./docs-snippets";
import { useAiPathsCanvasInteractions } from "./useAiPathsCanvasInteractions";
import { useAiPathsPersistence } from "./useAiPathsPersistence";
import { useAiPathsRunHistory } from "./useAiPathsRunHistory";
import { useAiPathsPresets } from "./useAiPathsPresets";
import { useAiPathsRuntime } from "./useAiPathsRuntime";
import type {
  AiNode,
  Edge,
  NodeConfig,
  NodeDefinition,
  ParserSampleState,
  PathConfig,
  PathDebugSnapshot,
  PathMeta,
  RuntimeState,
  UpdaterSampleState,
  AiPathRunRecord,
  AiPathRunNodeRecord,
  AiPathRunEventRecord,
  RuntimeHistoryEntry,
  ClusterPreset,
  DbQueryPreset,
  DbNodePreset,
} from "@/features/ai/ai-paths/lib";
import {
  AI_PATHS_LAST_ERROR_KEY,
  DEFAULT_MODELS,
  PATH_INDEX_KEY,
  STORAGE_VERSION,
  createAiDescriptionPath,
  createDefaultPathConfig,
  createPathId,
  createPathMeta,
  initialEdges,
  initialNodes,
  normalizeNodes,
  palette,
  safeStringify,
  sanitizeEdges,
  TRIGGER_INPUT_PORTS,
  TRIGGER_OUTPUT_PORTS,
  triggers,
  triggerButtonsApi,
} from "@/features/ai/ai-paths/lib";
import {
  parseRuntimeState,
  serializePathConfigs,
} from "../AiPathsSettingsUtils";
import type { AiTriggerButtonRecord } from "@/shared/types/ai-trigger-buttons";
import type { ClusterPresetDraft } from "../cluster-presets-panel";
import type { RunHistoryFilter } from "../run-history-panel";
import type { HistoryNodeOption } from "../run-history-utils";

type AiPathsSettingsStateOptions = {
  activeTab: "canvas" | "paths" | "docs";
};

export interface UseAiPathsSettingsStateReturn {
  loading: boolean;
  docsOverviewSnippet: string;
  docsWiringSnippet: string;
  docsDescriptionSnippet: string;
  docsJobsSnippet: string;
  handleCopyDocsWiring: () => void;
  handleCopyDocsDescription: () => void;
  handleCopyDocsJobs: () => void;
  autoSaveLabel: string;
  autoSaveClasses: string;
  saving: boolean;
  handleCreatePath: () => void;
  handleCreateAiDescriptionPath: () => void;
  handleSave: (options?: { notify?: boolean }) => Promise<void>;
  handleReset: () => void;
  handleDeletePath: (pathId?: string) => Promise<void>;
  activePathId: string | null;
  activeTrigger: string;
  triggers: string[];
  isPathLocked: boolean;
  isPathActive: boolean;
  handleTogglePathLock: () => void;
  handleTogglePathActive: () => void;
  lastError: {
    message: string;
    time: string;
    pathId?: string | null;
  } | null;
  setLastError: React.Dispatch<
    React.SetStateAction<{
      message: string;
      time: string;
      pathId?: string | null;
    } | null>
  >;
  persistLastError: (
    payload: { message: string; time: string; pathId?: string | null } | null
  ) => Promise<void>;
  setLoadNonce: React.Dispatch<React.SetStateAction<number>>;
  lastRunAt: string | null;
  pathName: string;
  setPathName: React.Dispatch<React.SetStateAction<string>>;
  updateActivePathMeta: (name: string) => void;
  paths: PathMeta[];
  pathConfigs: Record<string, PathConfig>;
  pathFlagsById: Record<string, { isLocked: boolean; isActive: boolean }>;
  handleSwitchPath: (pathId: string) => void;
  savePathIndex: (pathId: string) => Promise<void>;
  nodes: AiNode[];
  setNodes: React.Dispatch<React.SetStateAction<AiNode[]>>;
  edges: Edge[];
  runtimeState: RuntimeState;
  edgePaths: {
    id: string;
    path: string;
    label?: string | undefined;
    arrow?: { x: number; y: number; angle: number } | undefined;
  }[];
  view: { x: number; y: number; scale: number };
  panState: {
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null;
  lastDrop: { x: number; y: number } | null;
  connecting: {
    fromNodeId: string;
    fromPort: string;
    start: { x: number; y: number };
  } | null;
  connectingPos: { x: number; y: number } | null;
  connectingFromNode: AiNode | null;
  selectedNodeId: string | null;
  dragState: {
    nodeId: string;
    offsetX: number;
    offsetY: number;
  } | null;
  selectedEdgeId: string | null;
  palette: NodeDefinition[];
  paletteCollapsed: boolean;
  setPaletteCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  expandedPaletteGroups: Set<string>;
  togglePaletteGroup: (group: string) => void;
  handleDragStart: (e: React.DragEvent, node: NodeDefinition) => void;
  selectedNode: AiNode | null;
  handleSelectEdge: (edgeId: string | null) => void;
  handleFireTrigger: (triggerId: string) => Promise<void>;
  handleFireTriggerPersistent: (triggerId: string) => Promise<void>;
  setSimulationOpenNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  updateSelectedNode: (update: Partial<AiNode>) => void;
  setConfigOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleDeleteSelectedNode: () => void;
  handleRemoveEdge: (edgeId: string) => void;
  handleClearWires: () => Promise<void>;
  handleClearConnectorData: () => Promise<void>;
  handleClearHistory: () => Promise<void>;
  handleClearNodeHistory: (nodeId: string) => Promise<void>;
  handleDisconnectPort: (
    direction: "input" | "output",
    nodeId: string,
    port: string
  ) => void;
  handleReconnectInput: (
    event: React.PointerEvent<HTMLButtonElement>,
    nodeId: string,
    port: string
  ) => void;
  handleSelectNode: (nodeId: string) => void;
  handlePointerDown: (
    event: React.PointerEvent<HTMLDivElement>,
    nodeId: string
  ) => void;
  handlePointerMove: (
    event: React.PointerEvent<HTMLDivElement>,
    nodeId: string
  ) => void;
  handlePointerUp: (
    event: React.PointerEvent<HTMLDivElement>,
    nodeId: string
  ) => void;
  handleStartConnection: (
    event: React.PointerEvent<HTMLButtonElement>,
    node: AiNode,
    port: string
  ) => void;
  handleCompleteConnection: (
    event: React.PointerEvent<HTMLButtonElement>,
    node: AiNode,
    port: string
  ) => void;
  handleDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  handlePanStart: (event: React.PointerEvent<HTMLDivElement>) => void;
  handlePanMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  handlePanEnd: (event: React.PointerEvent<HTMLDivElement>) => void;
  zoomTo: (factor: number) => void;
  fitToNodes: () => void;
  resetView: () => void;
  presetDraft: ClusterPresetDraft;
  setPresetDraft: React.Dispatch<React.SetStateAction<ClusterPresetDraft>>;
  editingPresetId: string | null;
  handleResetPresetDraft: () => void;
  handlePresetFromSelection: () => void;
  handleSavePreset: () => Promise<void>;
  clusterPresets: ClusterPreset[];
  handleLoadPreset: (preset: ClusterPreset) => void;
  handleApplyPreset: (preset: ClusterPreset) => void;
  handleDeletePreset: (presetId: string) => Promise<void>;
  handleExportPresets: () => void;
  lastGraphModelPayload: unknown;
  runList: AiPathRunRecord[];
  runsQuery: UseQueryResult<{ ok: boolean; data: { runs: AiPathRunRecord[] } }>;
  runFilter: RunHistoryFilter;
  setRunFilter: React.Dispatch<React.SetStateAction<RunHistoryFilter>>;
  expandedRunHistory: Record<string, boolean>;
  setExpandedRunHistory: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  runHistorySelection: Record<string, string>;
  setRunHistorySelection: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  handleOpenRunDetail: (runId: string) => Promise<void>;
  handleResumeRun: (runId: string, mode: "resume" | "replay") => Promise<void>;
  handleCancelRun: (runId: string) => Promise<void>;
  handleRequeueDeadLetter: (runId: string) => Promise<void>;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  configOpen: boolean;
  modelOptions: string[];
  parserSamples: Record<string, ParserSampleState>;
  setParserSamples: React.Dispatch<
    React.SetStateAction<Record<string, ParserSampleState>>
  >;
  parserSampleLoading: boolean;
  updaterSamples: Record<string, UpdaterSampleState>;
  setUpdaterSamples: React.Dispatch<
    React.SetStateAction<Record<string, UpdaterSampleState>>
  >;
  updaterSampleLoading: boolean;
  pathDebugSnapshots: Record<string, PathDebugSnapshot>;
  updateSelectedNodeConfig: (config: NodeConfig) => void;
  handleFetchParserSample: (
    nodeId: string,
    entityType: string,
    entityId: string
  ) => Promise<void>;
  handleFetchUpdaterSample: (
    nodeId: string,
    entityType: string,
    entityId: string
  ) => Promise<void>;
  handleRunSimulation: (nodeId: string) => void;
  clearRuntimeForNode: (nodeId: string) => void;
  handleSendToAi: (options: { nodeId: string; prompt: string }) => Promise<void>;
  sendingToAi: boolean;
  dbQueryPresets: DbQueryPreset[];
  setDbQueryPresets: React.Dispatch<React.SetStateAction<DbQueryPreset[]>>;
  saveDbQueryPresets: (nextPresets: DbQueryPreset[]) => Promise<void>;
  dbNodePresets: DbNodePreset[];
  setDbNodePresets: React.Dispatch<React.SetStateAction<DbNodePreset[]>>;
  saveDbNodePresets: (nextPresets: DbNodePreset[]) => Promise<void>;
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
  runNodeSummary: {
    counts: Record<string, number>;
    total: number;
    completed: number;
    progress: number;
  } | null;
  runEventsOverflow: boolean;
  runEventsBatchLimit: number | null;
  runDetailHistoryOptions: HistoryNodeOption[];
  runDetailSelectedHistoryNodeId: string | null;
  setRunHistoryNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  runDetailSelectedHistoryEntries: RuntimeHistoryEntry[];
  presetsModalOpen: boolean;
  setPresetsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  presetsJson: string;
  setPresetsJson: React.Dispatch<React.SetStateAction<string>>;
  handleImportPresets: (mode: "merge" | "replace") => Promise<void>;
  simulationOpenNodeId: string | null;
  reportAiPathsError: (
    error: unknown,
    context: Record<string, unknown>,
    fallbackMessage?: string
  ) => void;
  toast: (
    message: string,
    options?: {
      variant?: "info" | "success" | "warning" | "error";
    }
  ) => void;
}

const AI_PATHS_SAMPLE_STALE_MS = 10_000;

export function useAiPathsSettingsState({ activeTab }: AiPathsSettingsStateOptions): UseAiPathsSettingsStateReturn {
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
  const [isPathLocked, setIsPathLocked] = useState(false);
  const [isPathActive, setIsPathActive] = useState(true);
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
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<{
    message: string;
    time: string;
    pathId?: string | null;
  } | null>(null);

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
  const [loadNonce, setLoadNonce] = useState(0);
  const queryClient = useQueryClient();
  const updateSettingMutation = useUpdateSetting();

  const triggerButtonsQuery = useQuery({
    queryKey: ["ai-paths", "trigger-buttons"],
    queryFn: async (): Promise<AiTriggerButtonRecord[]> => {
      const result = await triggerButtonsApi.list();
      if (!result.ok) return [];
      return Array.isArray(result.data) ? result.data : [];
    },
    staleTime: 10_000,
  });

  const paletteWithTriggerButtons = useMemo<NodeDefinition[]>(() => {
          const buttons = triggerButtonsQuery.data ?? [];
          if (buttons.length === 0) return palette;
    
          const usedTitles = new Set<string>(palette.map((node: NodeDefinition) => node.title));
          const derived: NodeDefinition[] = [];
    buttons.forEach((button: AiTriggerButtonRecord) => {
      const baseTitle = `Trigger: ${button.name}`;
      const title = usedTitles.has(baseTitle)
        ? `${baseTitle} (${button.id.slice(0, 6)})`
        : baseTitle;
      usedTitles.add(title);
      derived.push({
        type: "trigger",
        title,
        description: `User trigger button (${button.id}).`,
        inputs: TRIGGER_INPUT_PORTS,
        outputs: TRIGGER_OUTPUT_PORTS,
        config: { trigger: { event: button.id } },
      });
    });

    return [...palette, ...derived];
  }, [triggerButtonsQuery.data]);

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
      const normalized = entityType.trim().toLowerCase();
      const resolvedType =
        normalized === "products" ? "product" : normalized === "notes" ? "note" : normalized;
      let sample: Record<string, unknown> | null = null;
      if (resolvedType === "product") {
        sample = await queryClient.fetchQuery({
          queryKey: ["products", entityId],
          queryFn: async () => {
            const result = await entityApi.getProduct(entityId);
            return result.ok ? result.data : null;
          },
          staleTime: AI_PATHS_SAMPLE_STALE_MS,
        });
      } else if (resolvedType === "note") {
        sample = await queryClient.fetchQuery({
          queryKey: ["notes", entityId],
          queryFn: async () => {
            const result = await entityApi.getNote(entityId);
            return result.ok ? result.data : null;
          },
          staleTime: AI_PATHS_SAMPLE_STALE_MS,
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
          staleTime: AI_PATHS_SAMPLE_STALE_MS,
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
          staleTime: AI_PATHS_SAMPLE_STALE_MS,
        });
      } else if (normalized === "note") {
        sample = await queryClient.fetchQuery({
          queryKey: ["notes", entityId],
          queryFn: async () => {
            const result = await entityApi.getNote(entityId);
            return result.ok ? result.data : null;
          },
          staleTime: AI_PATHS_SAMPLE_STALE_MS,
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
      const result: RuntimeState = {
        ...prev,
        inputs: nextInputs,
        outputs: nextOutputs,
      };
      if (nextHashes !== undefined) result.hashes = nextHashes;
      if (nextHistory !== undefined) result.history = nextHistory;
      return result;
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
    isPathLocked,
  });

  const selectedNode = useMemo(
    (): AiNode | null =>
      nodes.find((node: AiNode): boolean => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  const {
    clusterPresets,
    setClusterPresets,
    dbQueryPresets,
    setDbQueryPresets,
    saveDbQueryPresets,
    dbNodePresets,
    setDbNodePresets,
    saveDbNodePresets,
    editingPresetId,
    presetDraft,
    setPresetDraft,
    handleSavePreset,
    handleLoadPreset,
    handleDeletePreset,
    handleApplyPreset,
    handleExportPresets,
    handleImportPresets,
    handlePresetFromSelection,
    handleResetPresetDraft,
    presetsModalOpen,
    setPresetsModalOpen,
    presetsJson,
    setPresetsJson,
    expandedPaletteGroups,
    setExpandedPaletteGroups,
    paletteCollapsed,
    setPaletteCollapsed,
    togglePaletteGroup,
    normalizeDbQueryPreset,
    normalizeDbNodePreset,
  } = useAiPathsPresets({
    nodes,
    edges,
    selectedNode,
    isPathLocked,
    setNodes,
    setEdges,
    setSelectedNodeId,
    ensureNodeVisible,
    getCanvasCenterPosition,
    toast,
    reportAiPathsError,
  });

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
    isPathActive,
    isPathLocked,
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
    selectedNodeId,
    configOpen,
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
    setIsPathActive,
    setIsPathLocked,
    setNodes,
    setPaletteCollapsed,
    setParserSamples,
    setPathConfigs,
    setPathDebugSnapshots,
    setPathDescription,
    setPathName,
    setPaths,
    setRuntimeState,
    setConfigOpen,
    setSelectedNodeId,
    setUpdaterSamples,
    toast,
  });

  const {
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
  } = useAiPathsRunHistory({ activePathId, toast });

  const {
    handleRunSimulation,
    handleFireTrigger,
    handleFireTriggerPersistent,
    handleSendToAi,
    sendingToAi,
  } = useAiPathsRuntime({
    activePathId,
    activeTab,
    activeTrigger,
    isPathActive,
    edges,
    nodes,
    pathDescription,
    pathName,
    parserSamples,
    updaterSamples,
    runtimeState,
    lastRunAt,
    setLastRunAt,
    setPathConfigs,
    setPathDebugSnapshots,
    setRuntimeState,
    toast,
    reportAiPathsError,
  });

  const handleClearWires = async (): Promise<void> => {
    if (!activePathId) return;
    if (isPathLocked) {
      toast("This path is locked. Unlock it to edit nodes or connections.", { variant: "info" });
      return;
    }
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
      isLocked: isPathLocked,
      isActive: isPathActive,
      parserSamples,
      updaterSamples,
      runtimeState: nextRuntimeState,
      lastRunAt,
      uiState: {
        selectedNodeId,
        configOpen,
      },
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

  const handleClearConnectorData = async (): Promise<void> => {
    if (!activePathId) return;
    if (isPathLocked) {
      toast("This path is locked. Unlock it to edit nodes or connections.", { variant: "info" });
      return;
    }
    const nextRuntimeState: RuntimeState = { inputs: {}, outputs: {} };
    const updatedAt = new Date().toISOString();
    const config: PathConfig = {
      id: activePathId,
      version: STORAGE_VERSION,
      name: pathName,
      description: pathDescription,
      trigger: activeTrigger,
      nodes,
      edges,
      updatedAt,
      isLocked: isPathLocked,
      isActive: isPathActive,
      parserSamples,
      updaterSamples,
      runtimeState: nextRuntimeState,
      lastRunAt,
      uiState: {
        selectedNodeId,
        configOpen,
      },
    };
    setRuntimeState(nextRuntimeState);
    const nextConfigs = { ...pathConfigs, [activePathId]: config };
    setPathConfigs(nextConfigs);
    try {
      const safeConfigs = serializePathConfigs(nextConfigs);
      await persistPreferences({
        aiPathsPathIndex: paths,
        aiPathsPathConfigs: safeConfigs,
      });
      await persistPathSettings(paths, activePathId, config);
      toast("Connector data cleared for current path.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(
        error,
        { action: "clearConnectorData", pathId: activePathId },
        "Failed to clear connector data:"
      );
      toast("Failed to clear connector data.", { variant: "error" });
    }
  };

  const handleClearHistory = async (): Promise<void> => {
    if (!activePathId) return;
    if (isPathLocked) {
      toast("This path is locked. Unlock it to clear history.", { variant: "info" });
      return;
    }
    const currentHistory = runtimeState.history ?? {};
    if (Object.keys(currentHistory).length === 0) {
      toast("No history recorded for this path yet.", { variant: "info" });
      return;
    }
    const nextRuntimeState: RuntimeState = { ...runtimeState };
    delete nextRuntimeState.history;
    const updatedAt = new Date().toISOString();
    const config: PathConfig = {
      id: activePathId,
      version: STORAGE_VERSION,
      name: pathName,
      description: pathDescription,
      trigger: activeTrigger,
      nodes,
      edges,
      updatedAt,
      isLocked: isPathLocked,
      isActive: isPathActive,
      parserSamples,
      updaterSamples,
      runtimeState: nextRuntimeState,
      lastRunAt,
      uiState: {
        selectedNodeId,
        configOpen,
      },
    };
    setRuntimeState(nextRuntimeState);
    const nextConfigs = { ...pathConfigs, [activePathId]: config };
    setPathConfigs(nextConfigs);
    try {
      const safeConfigs = serializePathConfigs(nextConfigs);
      await persistPreferences({
        aiPathsPathIndex: paths,
        aiPathsPathConfigs: safeConfigs,
      });
      await persistPathSettings(paths, activePathId, config);
      toast("History cleared for the current path.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(error, { action: "clearHistory", pathId: activePathId }, "Failed to clear history:");
      toast("Failed to clear history.", { variant: "error" });
    }
  };

  const handleClearNodeHistory = async (nodeId: string): Promise<void> => {
    if (!activePathId) return;
    if (isPathLocked) {
      toast("This path is locked. Unlock it to clear history.", { variant: "info" });
      return;
    }
    const currentHistory = runtimeState.history ?? {};
    if (!currentHistory[nodeId] || currentHistory[nodeId].length === 0) {
      toast("No history recorded for this node yet.", { variant: "info" });
      return;
    }
    const nextHistory = { ...currentHistory };
    delete nextHistory[nodeId];
    const nextRuntimeState: RuntimeState = { ...runtimeState };
    if (Object.keys(nextHistory).length > 0) {
      nextRuntimeState.history = nextHistory;
    } else {
      delete nextRuntimeState.history;
    }
    const updatedAt = new Date().toISOString();
    const config: PathConfig = {
      id: activePathId,
      version: STORAGE_VERSION,
      name: pathName,
      description: pathDescription,
      trigger: activeTrigger,
      nodes,
      edges,
      updatedAt,
      isLocked: isPathLocked,
      isActive: isPathActive,
      parserSamples,
      updaterSamples,
      runtimeState: nextRuntimeState,
      lastRunAt,
      uiState: {
        selectedNodeId,
        configOpen,
      },
    };
    setRuntimeState(nextRuntimeState);
    const nextConfigs = { ...pathConfigs, [activePathId]: config };
    setPathConfigs(nextConfigs);
    try {
      const safeConfigs = serializePathConfigs(nextConfigs);
      await persistPreferences({
        aiPathsPathIndex: paths,
        aiPathsPathConfigs: safeConfigs,
      });
      await persistPathSettings(paths, activePathId, config);
      toast("Node history cleared.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(error, { action: "clearNodeHistory", pathId: activePathId, nodeId }, "Failed to clear node history:");
      toast("Failed to clear node history.", { variant: "error" });
    }
  };

  const updateSelectedNode = (patch: Partial<AiNode>): void => {
    if (!selectedNodeId) return;
    if (isPathLocked) {
      toast("This path is locked. Unlock it to edit nodes or connections.", { variant: "info" });
      return;
    }
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
    if (isPathLocked) {
      toast("This path is locked. Unlock it to edit nodes or connections.", { variant: "info" });
      return;
    }
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

  const updateActivePathMeta = (name: string): void => {
    if (!activePathId) return;
    const updatedAt = new Date().toISOString();
    setPaths((prev: PathMeta[]): PathMeta[] =>
      prev.map((path: PathMeta): PathMeta =>
        path.id === activePathId ? { ...path, name, updatedAt } : path
      )
    );
  };

  const handleTogglePathLock = (): void => {
    if (!activePathId) return;
    const nextLocked = !isPathLocked;
    setIsPathLocked(nextLocked);
    setPathConfigs((prev: Record<string, PathConfig>): Record<string, PathConfig> => {
      const base = prev[activePathId] ?? createDefaultPathConfig(activePathId);
      return { ...prev, [activePathId]: { ...base, isLocked: nextLocked } };
    });
    toast(nextLocked ? "Path locked." : "Path unlocked.", { variant: "success" });
  };

  const handleTogglePathActive = (): void => {
    if (!activePathId) return;
    const nextActive = !isPathActive;
    setIsPathActive(nextActive);
    setPathConfigs((prev: Record<string, PathConfig>): Record<string, PathConfig> => {
      const base = prev[activePathId] ?? createDefaultPathConfig(activePathId);
      return { ...prev, [activePathId]: { ...base, isActive: nextActive } };
    });
    toast(nextActive ? "Path activated." : "Path deactivated.", { variant: "success" });
  };

  const handleReset = (): void => {
    if (!activePathId) return;
    if (isPathLocked) {
      toast("This path is locked. Unlock it to edit nodes or connections.", { variant: "info" });
      return;
    }
    const resetConfig = createDefaultPathConfig(activePathId);
    const normalizedNodes = normalizeNodes(resetConfig.nodes);
    setNodes(normalizedNodes);
    setEdges(sanitizeEdges(normalizedNodes, resetConfig.edges));
    setSelectedNodeId(normalizedNodes[0]?.id ?? null);
    setConfigOpen(Boolean(resetConfig.uiState?.configOpen) && Boolean(normalizedNodes[0]?.id));
    setPathName(resetConfig.name);
    setPathDescription(resetConfig.description);
    setActiveTrigger(normalizeTriggerLabel(resetConfig.trigger));
    setParserSamples(resetConfig.parserSamples ?? {});
    setUpdaterSamples(resetConfig.updaterSamples ?? {});
    setIsPathLocked(Boolean(resetConfig.isLocked));
    setIsPathActive(resetConfig.isActive !== false);
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
      isLocked: false,
      isActive: true,
      parserSamples: {},
      updaterSamples: {},
      runtimeState: { inputs: {}, outputs: {} },
      lastRunAt: null,
      uiState: {
        selectedNodeId: null,
        configOpen: false,
      },
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
    setIsPathLocked(false);
    setIsPathActive(true);
    setSelectedNodeId(null);
    setConfigOpen(false);
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
    setIsPathLocked(Boolean(config.isLocked));
    setIsPathActive(config.isActive !== false);
    const preferredNodeId = config.uiState?.selectedNodeId ?? null;
    const resolvedNodeId =
      preferredNodeId && normalizedNodes.some((node: AiNode): boolean => node.id === preferredNodeId)
        ? preferredNodeId
        : normalizedNodes[0]?.id ?? null;
    setSelectedNodeId(resolvedNodeId);
    setConfigOpen(Boolean(config.uiState?.configOpen) && Boolean(resolvedNodeId));
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
      setIsPathLocked(Boolean(fallback.isLocked));
      setIsPathActive(fallback.isActive !== false);
      const fallbackNodeId = normalizedNodes[0]?.id ?? null;
      setSelectedNodeId(fallbackNodeId);
      setConfigOpen(Boolean(fallback.uiState?.configOpen) && Boolean(fallbackNodeId));
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
      setIsPathLocked(Boolean(nextConfig.isLocked));
      setIsPathActive(nextConfig.isActive !== false);
      const preferredNodeId = nextConfig.uiState?.selectedNodeId ?? null;
      const resolvedNodeId =
        preferredNodeId && normalizedNodes.some((node: AiNode): boolean => node.id === preferredNodeId)
          ? preferredNodeId
          : normalizedNodes[0]?.id ?? null;
      setSelectedNodeId(resolvedNodeId);
      setConfigOpen(Boolean(nextConfig.uiState?.configOpen) && Boolean(resolvedNodeId));
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
    setIsPathLocked(Boolean(config.isLocked));
    setIsPathActive(config.isActive !== false);
    const preferredNodeId = config.uiState?.selectedNodeId ?? null;
    const resolvedNodeId =
      preferredNodeId && normalizedNodes.some((node: AiNode): boolean => node.id === preferredNodeId)
        ? preferredNodeId
        : normalizedNodes[0]?.id ?? null;
    setSelectedNodeId(resolvedNodeId);
    setConfigOpen(Boolean(config.uiState?.configOpen) && Boolean(resolvedNodeId));
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

  const pathFlagsById = useMemo((): Record<string, { isLocked: boolean; isActive: boolean }> => {
    const next: Record<string, { isLocked: boolean; isActive: boolean }> = {};
    paths.forEach((meta: PathMeta) => {
      const config = pathConfigs[meta.id];
      next[meta.id] = {
        isLocked: config?.isLocked ?? false,
        isActive: config?.isActive ?? true,
      };
    });
    return next;
  }, [pathConfigs, paths]);

  return {
    loading,
    docsOverviewSnippet: DOCS_OVERVIEW_SNIPPET,
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
    activeTrigger,
    triggers,
    isPathLocked,
    isPathActive,
    handleTogglePathLock,
    handleTogglePathActive,
    lastError,
    setLastError,
    persistLastError,
    setLoadNonce,
    lastRunAt,
    pathName,
    setPathName,
    updateActivePathMeta,
    paths,
    pathConfigs,
    pathFlagsById,
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
    palette: paletteWithTriggerButtons,
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
    handleClearConnectorData,
    handleClearHistory,
    handleClearNodeHistory,
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
    setRunDetail,
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

export type AiPathsSettingsState = UseAiPathsSettingsStateReturn;