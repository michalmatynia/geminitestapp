"use client";
import React, { useCallback, useMemo, useState } from "react";
import { useToast } from "@/shared/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { logClientError } from "@/features/observability";
import { useUpdateSetting } from "@/shared/hooks/useSettings";
import { dbApi, entityApi } from "@/features/ai-paths/lib";
import { DOCS_DESCRIPTION_SNIPPET, DOCS_JOBS_SNIPPET, DOCS_WIRING_SNIPPET } from "./docs-snippets";
import { useAiPathsCanvasInteractions } from "./useAiPathsCanvasInteractions";
import { useAiPathsPersistence } from "./useAiPathsPersistence";
import { useAiPathsRunHistory } from "./useAiPathsRunHistory";
import { useAiPathsPresets } from "./useAiPathsPresets";
import { useAiPathsRuntime } from "./useAiPathsRuntime";
import type {
  AiNode,
  Edge,
  NodeConfig,
  ParserSampleState,
  PathConfig,
  PathDebugSnapshot,
  PathMeta,
  RuntimeState,
  UpdaterSampleState,
} from "@/features/ai-paths/lib";
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
  triggers,
} from "@/features/ai-paths/lib";
import {
  parseRuntimeState,
  serializePathConfigs,
} from "../AiPathsSettingsUtils";

type AiPathsSettingsStateOptions = {
  activeTab: "canvas" | "paths" | "docs" | "queue";
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
