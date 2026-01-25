"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { logClientError } from "@/lib/client/error-logger";
import { DocsTabPanel, PathsTabPanel } from "./ai-paths/ui-panels";
import { evaluateGraph } from "./ai-paths/runtime";
import { CanvasBoard } from "./ai-paths/canvas-board";
import { CanvasSidebar } from "./ai-paths/canvas-sidebar";
import { NodeConfigDialog } from "./ai-paths/node-config-dialog";
import type {
  AiNode,
  ClusterPreset,
  ContextConfig,
  DatabaseConfig,
  DatabaseOperation,
  DbQueryConfig,
  Edge,
  NodeConfig,
  NodeDefinition,
  PathConfig,
  PathMeta,
  RuntimeState,
  UpdaterMapping,
} from "./ai-paths/types";
import {
  AI_PATHS_LAST_ERROR_KEY,
  BUNDLE_INPUT_PORTS,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CLUSTER_PRESETS_KEY,
  DB_COLLECTION_OPTIONS,
  DEFAULT_CONTEXT_ROLE,
  DEFAULT_MODELS,
  NODE_MIN_HEIGHT,
  NODE_WIDTH,
  PARSER_PATH_OPTIONS,
  PARSER_PRESETS,
  PATH_CONFIG_PREFIX,
  PATH_INDEX_KEY,
  PORT_SIZE,
  STORAGE_VERSION,
  TEMPLATE_INPUT_PORTS,
  TRIGGER_EVENTS,
  VIEW_MARGIN,
  buildFlattenedMappings,
  buildTopLevelMappings,
  clampScale,
  clampTranslate,
  createAiDescriptionPath,
  createDefaultPathConfig,
  createParserMappings,
  createPathId,
  createPathMeta,
  createPresetId,
  createViewerOutputs,
  extractJsonPathEntries,
  formatRuntimeValue,
  getContextPresetSet,
  getDefaultConfigForType,
  getPortOffsetY,
  inferImageMappingPath,
  initialEdges,
  initialNodes,
  normalizeNodes,
  palette,
  parsePathList,
  safeParseJson,
  sanitizeEdges,
  toNumber,
  triggers,
  typeStyles,
  validateConnection,
} from "./ai-paths/helpers";

type AiPathsSettingsProps = {
  activeTab: "canvas" | "paths" | "docs";
  renderActions?: (actions: React.ReactNode) => React.ReactNode;
  onTabChange?: (tab: "canvas" | "paths" | "docs") => void;
};

export function AiPathsSettings({ activeTab, renderActions, onTabChange }: AiPathsSettingsProps) {
  const { toast } = useToast();
  const docsWiringSnippet = [
    "Simulation.simulation → Trigger.simulation",
    "Context.role → Trigger.role",
    "Trigger.context → ResultViewer.context",
    "Trigger.meta → ResultViewer.meta",
    "Trigger.trigger → ResultViewer.trigger",
  ].join("\n");
  const docsDescriptionSnippet = [
    "Context.entityJson → Parser.entityJson",
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
  const [configOpen, setConfigOpen] = useState(false);
  const [modelOptions, setModelOptions] = useState<string[]>(DEFAULT_MODELS);
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
  const [parserSamples, setParserSamples] = useState<
    Record<
      string,
      {
        entityType: string;
        entityId: string;
        json: string;
        mappingMode: "top" | "flatten";
        depth: number;
        keyStyle: "path" | "leaf";
        includeContainers: boolean;
      }
    >
  >({});
  const [parserSampleLoading, setParserSampleLoading] = useState(false);
  const [updaterSamples, setUpdaterSamples] = useState<
    Record<
      string,
      {
        entityType: string;
        entityId: string;
        json: string;
        depth: number;
        includeContainers: boolean;
      }
    >
  >({});
  const [updaterSampleLoading, setUpdaterSampleLoading] = useState(false);
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
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<{
    message: string;
    time: string;
    pathId?: string | null;
  } | null>(null);
  const [clusterPresets, setClusterPresets] = useState<ClusterPreset[]>([]);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetDraft, setPresetDraft] = useState({
    name: "",
    description: "",
    bundlePorts: "context\nmeta\ntrigger\nentityJson\nentityId\nentityType\nresult",
    template: "Write a summary for {{context.entity.title}}",
  });
  const lastGraphModelPayload = useMemo(() => {
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      const node = nodes[index];
      if (node.type !== "model") continue;
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
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // RAF throttling refs for drag performance
  const pendingDragRef = useRef<{ nodeId: string; x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const persistLastError = async (
    payload: { message: string; time: string; pathId?: string | null } | null
  ) => {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: AI_PATHS_LAST_ERROR_KEY,
          value: payload ? JSON.stringify(payload) : "",
        }),
      });
    } catch (error) {
      console.warn("[AI Paths] Failed to persist last error.", error);
    }
  };

  const saveClusterPresets = async (nextPresets: ClusterPreset[]) => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: CLUSTER_PRESETS_KEY,
          value: JSON.stringify(nextPresets),
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to save cluster presets.");
      }
    } catch (error) {
      reportAiPathsError(error, { action: "saveClusterPresets" }, "Failed to save presets:");
      toast("Failed to save cluster presets.", { variant: "error" });
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

  const togglePaletteGroup = (title: string) => {
    setExpandedPaletteGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const reportAiPathsError = (
    error: unknown,
    context: Record<string, unknown>,
    fallbackMessage?: string
  ) => {
    const rawMessage =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
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
  };

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const settingsRes = await fetch("/api/settings");
        if (!settingsRes.ok) {
          throw new Error("Failed to load AI Paths settings.");
        }
        const data = (await settingsRes.json()) as Array<{ key: string; value: string }>;
        let preferredPathId: string | null = null;
        let preferredGroups: string[] | null = null;
        try {
          const prefsRes = await fetch("/api/user/preferences");
          if (prefsRes.ok) {
            const prefs = (await prefsRes.json()) as {
              aiPathsActivePathId?: string | null;
              aiPathsExpandedGroups?: string[] | null;
              aiPathsPaletteCollapsed?: boolean | null;
            };
            preferredPathId =
              typeof prefs.aiPathsActivePathId === "string"
                ? prefs.aiPathsActivePathId
                : null;
            preferredGroups = Array.isArray(prefs.aiPathsExpandedGroups)
              ? prefs.aiPathsExpandedGroups
              : null;
            if (typeof prefs.aiPathsPaletteCollapsed === "boolean") {
              setPaletteCollapsed(prefs.aiPathsPaletteCollapsed);
            }
          }
        } catch (error) {
          console.warn("[AI Paths] Failed to load user preferences.", error);
        }
        const map = new Map(data.map((item) => [item.key, item.value]));
        const indexRaw = map.get(PATH_INDEX_KEY);
        const lastErrorRaw = map.get(AI_PATHS_LAST_ERROR_KEY);
        const presetsRaw = map.get(CLUSTER_PRESETS_KEY);
        const configs: Record<string, PathConfig> = {};
        let metas: PathMeta[] = [];
        if (lastErrorRaw) {
          try {
            const parsed = JSON.parse(lastErrorRaw) as {
              message?: string;
              time?: string;
              pathId?: string | null;
            };
            if (parsed?.message && parsed?.time) {
              setLastError({
                message: parsed.message,
                time: parsed.time,
                pathId: parsed.pathId ?? null,
              });
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
        if (indexRaw) {
          const parsedIndex = JSON.parse(indexRaw) as PathMeta[];
          if (Array.isArray(parsedIndex)) {
            metas = parsedIndex;
          }
        }

        if (metas.length > 0) {
          metas.forEach((meta) => {
            const configRaw = map.get(`${PATH_CONFIG_PREFIX}${meta.id}`);
            if (configRaw) {
              try {
                const parsedConfig = JSON.parse(configRaw) as PathConfig;
                configs[meta.id] = {
                  ...parsedConfig,
                  id: meta.id,
                  name: parsedConfig.name || meta.name,
                };
              } catch {
                configs[meta.id] = createDefaultPathConfig(meta.id);
              }
            } else {
              configs[meta.id] = createDefaultPathConfig(meta.id);
            }
          });
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
              trigger: parsed.trigger ?? (triggers[0] ?? "Product Modal - Context Grabber"),
              nodes: Array.isArray(parsed.nodes) ? parsed.nodes : initialNodes,
              edges: Array.isArray(parsed.edges) ? parsed.edges : initialEdges,
              updatedAt: new Date().toISOString(),
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
        if (preferredGroups !== null) {
          setExpandedPaletteGroups(new Set(preferredGroups));
        }
        const firstPathCandidate = metas[0]?.id ?? Object.keys(configs)[0] ?? "default";
        const firstPath =
          preferredPathId && configs[preferredPathId]
            ? preferredPathId
            : firstPathCandidate;
        setActivePathId(firstPath);
        const activeConfig = configs[firstPath] ?? createDefaultPathConfig(firstPath);
        const normalizedNodes = normalizeNodes(activeConfig.nodes);
        setNodes(normalizedNodes);
        setEdges(sanitizeEdges(normalizedNodes, activeConfig.edges));
        setPathName(activeConfig.name);
        setPathDescription(activeConfig.description);
        setActiveTrigger(activeConfig.trigger);
        setSelectedNodeId(normalizedNodes[0]?.id ?? null);
        setPrefsLoaded(true);
      } catch (error) {
        reportAiPathsError(error, { action: "loadConfig" }, "Failed to load AI Paths settings:");
        toast("Failed to load AI Paths settings.", { variant: "error" });
      } finally {
        setLoading(false);
      }
    };
    void loadConfig();
  }, [toast]);

  useEffect(() => {
    if (!prefsLoaded) return;
    const payload = {
      aiPathsActivePathId: activePathId,
      aiPathsExpandedGroups: Array.from(expandedPaletteGroups),
      aiPathsPaletteCollapsed: paletteCollapsed,
    };
    const timeout = setTimeout(() => {
      fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch((error) => {
        console.warn("[AI Paths] Failed to persist preferences.", error);
      });
    }, 200);
    return () => clearTimeout(timeout);
  }, [activePathId, expandedPaletteGroups, paletteCollapsed, prefsLoaded]);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const res = await fetch("/api/chatbot");
        if (!res.ok) return;
        const data = (await res.json()) as { models?: string[] };
        if (Array.isArray(data.models)) {
          const merged = Array.from(new Set([...DEFAULT_MODELS, ...data.models]));
          setModelOptions(merged);
        }
      } catch (error) {
        // Ignore model loading errors and fallback to defaults
        reportAiPathsError(error, { action: "loadModels" }, "Failed to load models:");
      }
    };
    void loadModels();
  }, []);

  useEffect(() => {
    const handlePointerUp = () => {
      setConnecting(null);
      setConnectingPos(null);
    };
    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, []);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-port]")) return;
      if (target?.closest("path")) return;
      setConnecting(null);
      setConnectingPos(null);
      setSelectedEdgeId(null);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setConnecting(null);
        setConnectingPos(null);
        setSelectedEdgeId(null);
      }
      if (event.key === "Backspace" || event.key === "Delete") {
        if (selectedEdgeId) {
          event.preventDefault();
          handleRemoveEdge(selectedEdgeId);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEdgeId, handleRemoveEdge]);

  useEffect(() => {
    setEdges((prev) => sanitizeEdges(nodes, prev));
  }, [nodes]);

  const setViewClamped = (next: { x: number; y: number; scale: number }) => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    const clampedScale = clampScale(next.scale);
    const clamped = clampTranslate(next.x, next.y, clampedScale, viewport);
    setView({ x: clamped.x, y: clamped.y, scale: clampedScale });
  };

  const zoomTo = (targetScale: number) => {
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

  const fitToNodesWith = (items: AiNode[]) => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    if (!viewport || items.length === 0) {
      resetView();
      return;
    }
    const padding = 120;
    const bounds = items.reduce(
      (acc, node) => {
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

  const fitToNodes = () => {
    fitToNodesWith(nodes);
  };

  const resetView = () => {
    setViewClamped({ x: VIEW_MARGIN, y: VIEW_MARGIN, scale: 1 });
  };

  const centerOnPoint = (x: number, y: number) => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    if (!viewport) return;
    const nextX = viewport.width / 2 - x * view.scale;
    const nextY = viewport.height / 2 - y * view.scale;
    const clamped = clampTranslate(nextX, nextY, view.scale, viewport);
    setView({ x: clamped.x, y: clamped.y, scale: view.scale });
  };

  const ensureNodeVisible = (node: AiNode) => {
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
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );
  const connectingFromNode = useMemo(
    () => (connecting ? nodes.find((node) => node.id === connecting.fromNodeId) ?? null : null),
    [connecting, nodes]
  );

  const getPortPosition = (
    node: AiNode,
    portName: string | undefined,
    side: "input" | "output"
  ) => {
    const ports = side === "input" ? node.inputs : node.outputs;
    const index = portName ? ports.indexOf(portName) : -1;
    const safeIndex = index >= 0 ? index : Math.max(0, Math.floor(ports.length / 2));
    const x = node.position.x + (side === "output" ? NODE_WIDTH : 0);
    const y = node.position.y + getPortOffsetY(safeIndex, ports.length);
    return { x, y };
  };

  // Create a stable key based only on edge-relevant node data (position, ports)
  // This prevents edge recalculation when only config/title changes occur
  const nodePositionsKey = useMemo(
    () =>
      nodes
        .map(
          (n) =>
            `${n.id}:${n.position.x}:${n.position.y}:${n.inputs.length}:${n.outputs.length}`
        )
        .join("|"),
    [nodes]
  );

  const edgePaths = useMemo(() => {
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    return edges
      .map((edge) => {
        const from = nodeMap.get(edge.from);
        const to = nodeMap.get(edge.to);
        if (!from || !to) return null;
        const fromPort =
          edge.fromPort ?? (from.outputs.length > 0 ? from.outputs[0] : undefined);
        const toPort = edge.toPort ?? (to.inputs.length > 0 ? to.inputs[0] : undefined);
        const fromPos = getPortPosition(from, fromPort, "output");
        const toPos = getPortPosition(to, toPort, "input");
        const fromX = fromPos.x;
        const fromY = fromPos.y;
        const toX = toPos.x;
        const toY = toPos.y;
        const midX = fromX + (toX - fromX) * 0.5;
        const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
        return { id: edge.id, path, label: edge.label };
      })
      .filter(Boolean) as { id: string; path: string; label?: string }[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edges, nodePositionsKey]);

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    nodeId: string
  ) => {
    event.stopPropagation();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const viewport = viewportRef.current?.getBoundingClientRect();
    if (!viewport) return;
    const node = nodes.find((item) => item.id === nodeId);
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
  ) => {
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
      rafIdRef.current = requestAnimationFrame(() => {
        if (pendingDragRef.current) {
          const { nodeId: id, x, y } = pendingDragRef.current;
          setNodes((prev) =>
            prev.map((node) =>
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
  ) => {
    if (dragState?.nodeId !== nodeId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);

    // Flush any pending RAF drag update immediately on pointer up
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (pendingDragRef.current) {
      const { nodeId: id, x, y } = pendingDragRef.current;
      setNodes((prev) =>
        prev.map((node) =>
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
  ) => {
    event.dataTransfer.effectAllowed = "copy";
    const payload = JSON.stringify(node);
    event.dataTransfer.setData("application/x-ai-node", payload);
    event.dataTransfer.setData("text/plain", payload);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
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
    const config = getDefaultConfigForType(payload.type, payload.outputs, payload.inputs);
    const newNode: AiNode = {
      ...payload,
      id: `node-${Math.random().toString(36).slice(2, 8)}`,
      position: { x: nextX, y: nextY },
      ...(config ? { config } : {}),
    };
    setSelectedNodeId(newNode.id);
    setNodes((prev) => [...prev, newNode]);
    ensureNodeVisible(newNode);
    setLastDrop({ x: nextX, y: nextY });
    toast(`Node added: ${payload.title}`, { variant: "success" });
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleClearWires = async () => {
    if (!activePathId) return;
    const updatedAt = new Date().toISOString();
    const config: PathConfig = {
      id: activePathId,
      version: STORAGE_VERSION,
      name: pathName,
      description: pathDescription,
      trigger: activeTrigger,
      nodes,
      edges: [],
      updatedAt,
    };
    setEdges([]);
    setPathConfigs((prev) => ({ ...prev, [activePathId]: config }));
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: `${PATH_CONFIG_PREFIX}${activePathId}`,
          value: JSON.stringify(config),
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to clear wires.");
      }
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
  ) => {
    event.stopPropagation();
    const start = getPortPosition(node, port, "output");
    setConnecting({ fromNodeId: node.id, fromPort: port, start });
    setConnectingPos(start);
  };

  const handleCompleteConnection = (
    event: React.PointerEvent<HTMLButtonElement>,
    node: AiNode,
    port: string
  ) => {
    event.stopPropagation();
    if (!connecting) return;
    if (connecting.fromNodeId === node.id && connecting.fromPort === port) {
      setConnecting(null);
      setConnectingPos(null);
      return;
    }

    const fromNode = nodes.find((n) => n.id === connecting.fromNodeId);
    if (!fromNode) {
      setConnecting(null);
      setConnectingPos(null);
      return;
    }

    const validation = validateConnection(
      fromNode,
      node,
      connecting.fromPort,
      port,
      edges
    );

    if (!validation.valid) {
      toast(validation.message ?? "Invalid connection.", { variant: "error" });
      setConnecting(null);
      setConnectingPos(null);
      return;
    }

    setEdges((prev) => [
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

  const handlePanStart = (event: React.PointerEvent<HTMLDivElement>) => {
    const canvasEl = canvasRef.current;
    if (event.target !== event.currentTarget && event.target !== canvasEl) return;
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

  const handlePanMove = (event: React.PointerEvent<HTMLDivElement>) => {
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

  const handlePanEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (panState) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      setPanState(null);
    }
    if (connecting) {
      setConnecting(null);
      setConnectingPos(null);
    }
  };

  const updateSelectedNode = (patch: Partial<AiNode>) => {
    if (!selectedNodeId) return;
    setNodes((prev) =>
      prev.map((node) =>
        node.id === selectedNodeId ? { ...node, ...patch } : node
      )
    );
  };

  const updateSelectedNodeConfig = (patch: NodeConfig) => {
    if (!selectedNode) return;
    updateSelectedNode({
      config: {
        ...selectedNode.config,
        ...patch,
      },
    });
  };

  const fetchProductById = async (productId: string) => {
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
        cache: "no-store",
      });
      if (!res.ok) return null;
      return (await res.json()) as Record<string, unknown>;
    } catch (error) {
      reportAiPathsError(error, { action: "fetchProduct", productId }, "Failed to fetch product:");
      return null;
    }
  };

  const fetchNoteById = async (noteId: string) => {
    try {
      const res = await fetch(`/api/notes/${encodeURIComponent(noteId)}`, {
        cache: "no-store",
      });
      if (!res.ok) return null;
      return (await res.json()) as Record<string, unknown>;
    } catch (error) {
      reportAiPathsError(error, { action: "fetchNote", noteId }, "Failed to fetch note:");
      return null;
    }
  };

  const fetchEntityByType = async (entityType: string, entityId: string) => {
    if (!entityType || !entityId) return null;
    const normalized = entityType.toLowerCase();
    if (normalized === "product") {
      return fetchProductById(entityId);
    }
    if (normalized === "note") {
      return fetchNoteById(entityId);
    }
    return null;
  };

  const handleFetchParserSample = async (
    nodeId: string,
    entityType: string,
    entityId: string
  ) => {
    if (!entityId.trim()) {
      toast("Enter an entity ID to load a sample.", { variant: "error" });
      return;
    }
    if (entityType === "custom") {
      toast("Use pasted JSON for custom samples.", { variant: "error" });
      return;
    }
    setParserSampleLoading(true);
    try {
      const sample = await fetchEntityByType(entityType, entityId);
      if (!sample) {
        toast("No sample found for that ID.", { variant: "error" });
        return;
      }
      setParserSamples((prev) => ({
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
    } finally {
      setParserSampleLoading(false);
    }
  };

  const handleFetchUpdaterSample = async (
    nodeId: string,
    entityType: string,
    entityId: string
  ) => {
    if (!entityId.trim()) {
      toast("Enter an entity ID to load a sample.", { variant: "error" });
      return;
    }
    if (entityType === "custom") {
      toast("Use pasted JSON for custom samples.", { variant: "error" });
      return;
    }
    setUpdaterSampleLoading(true);
    try {
      const sample = await fetchEntityByType(entityType, entityId);
      if (!sample) {
        toast("No sample found for that ID.", { variant: "error" });
        return;
      }
      setUpdaterSamples((prev) => ({
        ...prev,
        [nodeId]: {
          entityType,
          entityId,
          json: JSON.stringify(sample, null, 2),
          depth: prev[nodeId]?.depth ?? 2,
          includeContainers: prev[nodeId]?.includeContainers ?? false,
        },
      }));
    } finally {
      setUpdaterSampleLoading(false);
    }
  };

  const runGraphForTrigger = async (triggerNode: AiNode) => {
    const triggerEvent = triggerNode.config?.trigger?.event ?? TRIGGER_EVENTS[0]?.id;
    const result = await evaluateGraph({
      nodes,
      edges,
      activePathId,
      triggerNodeId: triggerNode.id,
      triggerEvent,
      fetchEntityByType,
      reportAiPathsError,
      toast,
    });
    setRuntimeState(result);
    setLastRunAt(new Date().toISOString());
  };

  const getTriggerContextInfo = (triggerId: string) => {
    const roleEdges = edges
      .filter((edge) => edge.to === triggerId)
      .filter(
        (edge) =>
          (!edge.toPort || edge.toPort === "role") &&
          (!edge.fromPort || edge.fromPort === "role")
      )
      .map((edge) => nodes.find((node) => node.id === edge.from))
      .filter(Boolean) as AiNode[];
    const contextNodes = roleEdges.filter((node) => node.type === "context");
    const contextNodeIds = contextNodes.map((node) => node.id);
    const roles = Array.from(
      new Set(
        roleEdges
          .map((node) => {
            if (node.type === "context") {
              return node.config?.context?.role?.trim() || node.title;
            }
            return node.title;
          })
          .filter(Boolean)
      )
    );
    return { contextNodeIds, roles };
  };

  const dispatchTrigger = (
    eventName: string,
    entityId: string,
    contextNodeIds: string[] = [],
    roles: string[] = [],
    entityType?: string
  ) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("ai-path-trigger", {
        detail: {
          trigger: eventName,
          productId: entityId,
          entityId,
          entityType: entityType ?? "product",
          contextNodeIds,
          roles,
        },
      })
    );
  };

  const handleRunSimulation = (
    simulationNode: AiNode,
    triggerEvent?: string,
    contextNodeIds?: string[],
    roles?: string[]
  ) => {
    const entityId =
      simulationNode.config?.simulation?.entityId?.trim() ||
      simulationNode.config?.simulation?.productId?.trim();
    const entityType = simulationNode.config?.simulation?.entityType ?? "product";
    if (!entityId) {
      toast("Enter an Entity ID in the simulation node.", { variant: "error" });
      return;
    }
    let eventName = triggerEvent ?? TRIGGER_EVENTS[0]?.id ?? "path_generate_description";
    let resolvedContextIds = contextNodeIds ?? [];
    let resolvedRoles = roles ?? [];
    if (!triggerEvent) {
      const connectedTriggerIds = edges
        .filter(
          (edge) =>
            edge.from === simulationNode.id &&
            (!edge.fromPort || edge.fromPort === "simulation")
        )
        .map((edge) => edge.to);
      const triggerNode = nodes.find(
        (node) => node.type === "trigger" && connectedTriggerIds.includes(node.id)
      );
      if (triggerNode) {
        eventName = triggerNode.config?.trigger?.event ?? eventName;
        const triggerContext = getTriggerContextInfo(triggerNode.id);
        resolvedContextIds = triggerContext.contextNodeIds;
        resolvedRoles = triggerContext.roles;
        void runGraphForTrigger(triggerNode);
      }
    }
    dispatchTrigger(eventName, entityId, resolvedContextIds, resolvedRoles, entityType);
    toast(`Simulated ${eventName} for ${entityType} ${entityId}`, {
      variant: "success",
    });
  };

  const handleFireTrigger = (triggerNode: AiNode) => {
    const triggerEvent = triggerNode.config?.trigger?.event ?? TRIGGER_EVENTS[0]?.id;
    const { contextNodeIds, roles } = getTriggerContextInfo(triggerNode.id);
    const connectedSimulationIds = edges
      .filter((edge) => edge.to === triggerNode.id)
      .filter(
        (edge) =>
          (!edge.toPort || edge.toPort === "simulation") &&
          (!edge.fromPort || edge.fromPort === "simulation")
      )
      .map((edge) => edge.from);
    const simulationNodes = nodes.filter(
      (node) => node.type === "simulation" && connectedSimulationIds.includes(node.id)
    );
    if (simulationNodes.length === 0) {
      toast("Connect a Simulation node to the Trigger simulation input.", { variant: "error" });
      return;
    }
    simulationNodes.forEach((node) =>
      handleRunSimulation(node, triggerEvent, contextNodeIds, roles)
    );
    void runGraphForTrigger(triggerNode);
  };

  const handleDeleteSelectedNode = () => {
    if (!selectedNodeId) return;
    const targetNode = nodes.find((node) => node.id === selectedNodeId);
    const label = targetNode?.title || "this node";
    const confirmed = window.confirm(`Remove ${label}? This will delete connected wires.`);
    if (!confirmed) return;
    setNodes((prev) => prev.filter((node) => node.id !== selectedNodeId));
    setEdges((prev) =>
      prev.filter((edge) => edge.from !== selectedNodeId && edge.to !== selectedNodeId)
    );
    setSelectedNodeId(null);
  };

  function handleRemoveEdge(edgeId: string) {
    setEdges((prev) => prev.filter((edge) => edge.id !== edgeId));
    if (selectedEdgeId === edgeId) {
      setSelectedEdgeId(null);
    }
  }

  const getCanvasCenterPosition = () => {
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

  const handleSavePreset = async () => {
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
      const index = nextPresets.findIndex((preset) => preset.id === editingPresetId);
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

  const handleLoadPreset = (preset: ClusterPreset) => {
    setEditingPresetId(preset.id);
    setPresetDraft({
      name: preset.name,
      description: preset.description ?? "",
      bundlePorts: preset.bundlePorts.join("\n"),
      template: preset.template ?? "",
    });
  };

  const handleDeletePreset = async (presetId: string) => {
    const target = clusterPresets.find((preset) => preset.id === presetId);
    if (!target) return;
    const confirmed = window.confirm(`Delete preset "${target.name}"?`);
    if (!confirmed) return;
    const nextPresets = clusterPresets.filter((preset) => preset.id !== presetId);
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

  const handleApplyPreset = (preset: ClusterPreset) => {
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
    setNodes((prev) => [...prev, bundleNode, templateNode]);
    setEdges((prev) => [...prev, edge]);
    setSelectedNodeId(templateNode.id);
    ensureNodeVisible(templateNode);
    toast(`Preset applied: ${preset.name}`, { variant: "success" });
  };

  const handleExportPresets = () => {
    const payload = JSON.stringify(clusterPresets, null, 2);
    setPresetsJson(payload);
    setPresetsModalOpen(true);
  };

  const handleImportPresets = async (mode: "merge" | "replace") => {
    if (!presetsJson.trim()) {
      toast("Paste presets JSON to import.", { variant: "error" });
      return;
    }
    if (mode === "replace") {
      const confirmed = window.confirm("Replace existing presets? This cannot be undone.");
      if (!confirmed) return;
    }
    try {
      const parsed = JSON.parse(presetsJson);
      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.presets)
          ? parsed.presets
          : null;
      if (!list) {
        toast("Invalid presets JSON. Expected an array.", { variant: "error" });
        return;
      }
      const normalized = list.map((item: Partial<ClusterPreset>) => normalizePreset(item));
      let nextPresets = mode === "replace" ? [] : [...clusterPresets];
      const existingIds = new Set(nextPresets.map((preset) => preset.id));
      const merged = normalized.map((preset) => {
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

  const handlePresetFromSelection = () => {
    const selectedTemplate = selectedNode?.type === "template" ? selectedNode : null;
    const selectedBundle = selectedNode?.type === "bundle" ? selectedNode : null;

    const findBundleForTemplate = (template: AiNode) => {
      const bundleEdges = edges.filter(
        (edge) => edge.to === template.id && edge.toPort === "bundle"
      );
      const bundleNodes = bundleEdges
        .map((edge) => nodes.find((node) => node.id === edge.from))
        .filter((node): node is AiNode => Boolean(node && node.type === "bundle"));
      return bundleNodes;
    };

    const findTemplateForBundle = (bundle: AiNode) => {
      const templateEdges = edges.filter(
        (edge) => edge.from === bundle.id && edge.fromPort === "bundle"
      );
      const templateNodes = templateEdges
        .map((edge) => nodes.find((node) => node.id === edge.to))
        .filter((node): node is AiNode => Boolean(node && node.type === "template"));
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

  const applyContextPreset = (
    current: ContextConfig,
    preset: "light" | "medium" | "full"
  ) => {
    const presetSet = getContextPresetSet(current.entityType);
    if (preset === "full") {
      return {
        ...current,
        scopeMode: "full" as const,
        includePaths: [],
        excludePaths: [],
      };
    }
    return {
      ...current,
      scopeMode: "include" as const,
      includePaths: presetSet[preset],
      excludePaths: [],
    };
  };

  const toggleContextTarget = (current: ContextConfig, field: string) => {
    const include = new Set(current.includePaths ?? []);
    if (include.has(field)) {
      include.delete(field);
    } else {
      include.add(field);
    }
    return {
      ...current,
      scopeMode: "include" as const,
      includePaths: Array.from(include),
      excludePaths: [],
    };
  };

  const updateActivePathMeta = (name: string) => {
    if (!activePathId) return;
    const updatedAt = new Date().toISOString();
    setPaths((prev) =>
      prev.map((path) =>
        path.id === activePathId ? { ...path, name, updatedAt } : path
      )
    );
  };

  const handleSave = async () => {
    if (!activePathId) return;
    setSaving(true);
    try {
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
      };
      const nextPaths = paths.map((path) =>
        path.id === activePathId ? { ...path, name: pathName, updatedAt } : path
      );
      setPathConfigs((prev) => ({ ...prev, [activePathId]: config }));
      setPaths(nextPaths);
      const [configRes, indexRes] = await Promise.all([
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: `${PATH_CONFIG_PREFIX}${activePathId}`,
            value: JSON.stringify(config),
          }),
        }),
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: PATH_INDEX_KEY,
            value: JSON.stringify(nextPaths),
          }),
        }),
      ]);
      if (!configRes.ok || !indexRes.ok) {
        throw new Error("Failed to save AI Path settings.");
      }
      setLastError(null);
      void persistLastError(null);
      toast("AI Paths saved.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(error, { action: "savePath", pathId: activePathId }, "Failed to save AI Paths settings:");
      toast("Failed to save AI Paths settings.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!activePathId) return;
    const resetConfig = createDefaultPathConfig(activePathId);
    const normalizedNodes = normalizeNodes(resetConfig.nodes);
    setNodes(normalizedNodes);
    setEdges(sanitizeEdges(normalizedNodes, resetConfig.edges));
    setSelectedNodeId(normalizedNodes[0]?.id ?? null);
    setPathName(resetConfig.name);
    setPathDescription(resetConfig.description);
    setActiveTrigger(resetConfig.trigger);
    setPathConfigs((prev) => ({ ...prev, [activePathId]: resetConfig }));
    updateActivePathMeta(resetConfig.name);
  };

  const handleCreatePath = () => {
    const id = createPathId();
    const now = new Date().toISOString();
    const name = `New Path ${paths.length + 1}`;
    const config: PathConfig = {
      id,
      version: STORAGE_VERSION,
      name,
      description: "",
      trigger: triggers[0] ?? "Product Modal - Context Grabber",
      nodes: [],
      edges: [],
      updatedAt: now,
    };
    const meta: PathMeta = {
      id,
      name,
      createdAt: now,
      updatedAt: now,
    };
    setPaths((prev) => [...prev, meta]);
    setPathConfigs((prev) => ({ ...prev, [id]: config }));
    setActivePathId(id);
    setNodes([]);
    setEdges([]);
    setPathName(name);
    setPathDescription("");
    setActiveTrigger(config.trigger);
    setSelectedNodeId(null);
  };

  const handleCreateAiDescriptionPath = () => {
    const id = createPathId();
    const config = createAiDescriptionPath(id);
    const now = new Date().toISOString();
    const meta: PathMeta = {
      id,
      name: config.name,
      createdAt: now,
      updatedAt: now,
    };
    setPaths((prev) => [...prev, meta]);
    setPathConfigs((prev) => ({ ...prev, [id]: config }));
    setActivePathId(id);
    const normalizedNodes = normalizeNodes(config.nodes);
    setNodes(normalizedNodes);
    setEdges(sanitizeEdges(normalizedNodes, config.edges));
    setPathName(config.name);
    setPathDescription(config.description);
    setActiveTrigger(config.trigger);
    setSelectedNodeId(normalizedNodes[0]?.id ?? null);
    toast("AI Description Path created.", { variant: "success" });
  };

  const handleDeletePath = async (pathId?: string) => {
    const targetId = pathId ?? activePathId;
    if (!targetId) return;
    const nextPaths = paths.filter((path) => path.id !== targetId);
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
      setActiveTrigger(fallback.trigger);
      setSelectedNodeId(normalizedNodes[0]?.id ?? null);
      toast("Cannot delete the last path. Reset to default instead.", {
        variant: "info",
      });
      return;
    }
    const nextId = nextPaths[0]?.id ?? null;
    setPaths(nextPaths);
    setPathConfigs((prev) => {
      const copy = { ...prev };
      delete copy[targetId];
      return copy;
    });
    if (nextId) {
      const nextConfig = pathConfigs[nextId] ?? createDefaultPathConfig(nextId);
      setActivePathId(nextId);
      const normalizedNodes = normalizeNodes(nextConfig.nodes);
      setNodes(normalizedNodes);
      setEdges(sanitizeEdges(normalizedNodes, nextConfig.edges));
      setPathName(nextConfig.name);
      setPathDescription(nextConfig.description);
      setActiveTrigger(nextConfig.trigger);
      setSelectedNodeId(normalizedNodes[0]?.id ?? null);
    } else {
      setActivePathId(null);
    }
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: PATH_INDEX_KEY,
          value: JSON.stringify(nextPaths),
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to update path index.");
      }
      toast("Path removed from the index.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(error, { action: "deletePath", pathId: targetId }, "Failed to update path index:");
      toast("Failed to update path index.", { variant: "error" });
    }
  };

  const handleSwitchPath = (value: string) => {
    if (!value) return;
    const config = pathConfigs[value] ?? createDefaultPathConfig(value);
    setActivePathId(value);
    const normalizedNodes = normalizeNodes(config.nodes);
    setNodes(normalizedNodes);
    setEdges(sanitizeEdges(normalizedNodes, config.edges));
    setPathName(config.name);
    setPathDescription(config.description);
    setActiveTrigger(config.trigger);
    setSelectedNodeId(normalizedNodes[0]?.id ?? null);
  };

  const savePathIndex = async (nextPaths: PathMeta[]) => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: PATH_INDEX_KEY,
          value: JSON.stringify(nextPaths),
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to save path index.");
      }
      toast("Path list saved.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(error, { action: "savePathIndex" }, "Failed to save path list:");
      toast("Failed to save path list.", { variant: "error" });
    }
  };

  const handleCopyDocsWiring = async () => {
    try {
      await navigator.clipboard.writeText(docsWiringSnippet);
      toast("Wiring copied to clipboard.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(error, { action: "copyDocsWiring" }, "Failed to copy wiring:");
      toast("Failed to copy wiring.", { variant: "error" });
    }
  };

  const handleCopyDocsDescription = async () => {
    try {
      await navigator.clipboard.writeText(docsDescriptionSnippet);
      toast("AI Description wiring copied.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(error, { action: "copyDocsDescription" }, "Failed to copy wiring:");
      toast("Failed to copy wiring.", { variant: "error" });
    }
  };

  const handleCopyDocsJobs = async () => {
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

  return (
    <div className="space-y-6">
      {activeTab === "canvas" && (
        <div className="space-y-6">
          {typeof document !== "undefined" && renderActions
            ? createPortal(
                renderActions(
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      className="rounded-md border border-gray-700 text-sm text-white hover:bg-gray-900/80"
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
                      className="rounded-md border border-gray-700 text-sm text-white hover:bg-gray-900/80"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Path"}
                    </Button>
                    <Button
                      className="rounded-md border border-gray-800 text-sm text-gray-300 hover:bg-gray-900/60"
                      onClick={handleReset}
                      type="button"
                    >
                      Reset to Defaults
                    </Button>
                    <Button
                      className="rounded-md border border-gray-800 text-sm text-rose-200 hover:bg-rose-500/10"
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
                    {lastRunAt && (
                      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] text-emerald-200">
                        Last run: {new Date(lastRunAt).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                ),
                document.getElementById("ai-paths-actions") ?? document.body
              )
            : null}
          {typeof document !== "undefined" && activePathId
            ? createPortal(
                <Input
                  className="h-9 w-[260px] rounded-md border border-gray-800 bg-gray-950/60 px-3 text-sm text-white"
                  value={pathName}
                  onChange={(event) => {
                    const value = event.target.value;
                    setPathName(value);
                    updateActivePathMeta(value);
                  }}
                  placeholder="Path name"
                />,
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
                onTogglePaletteCollapsed={() => setPaletteCollapsed((prev) => !prev)}
                expandedPaletteGroups={expandedPaletteGroups}
                onTogglePaletteGroup={togglePaletteGroup}
                onDragStart={handleDragStart}
                selectedNode={selectedNode}
                nodes={nodes}
                edges={edges}
                selectedEdgeId={selectedEdgeId}
                onSelectEdge={setSelectedEdgeId}
                onFireTrigger={handleFireTrigger}
                onOpenSimulation={setSimulationOpenNodeId}
                onUpdateSelectedNode={updateSelectedNode}
                onOpenNodeConfig={() => setConfigOpen(true)}
                onDeleteSelectedNode={handleDeleteSelectedNode}
                onRemoveEdge={handleRemoveEdge}
                onClearWires={() => void handleClearWires()}
              />
              <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
            <div className="mb-3 flex items-center justify-between text-sm font-semibold text-white">
              <span>Cluster Presets</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  className="rounded-md border border-gray-700 px-2 py-1 text-[10px] text-gray-200 hover:bg-gray-900/80"
                  onClick={() => handlePresetFromSelection()}
                >
                  From Selection
                </Button>
                {editingPresetId && (
                  <Button
                    type="button"
                    className="rounded-md border border-gray-700 px-2 py-1 text-[10px] text-gray-200 hover:bg-gray-900/80"
                    onClick={() => {
                      setEditingPresetId(null);
                      setPresetDraft({
                        name: "",
                        description: "",
                        bundlePorts: "context\nmeta\ntrigger\nentityJson\nentityId\nentityType\nresult",
                        template: "Write a summary for {{context.entity.title}}",
                      });
                    }}
                  >
                    New
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-3 text-xs text-gray-300">
              <div>
                <Label className="text-[10px] uppercase text-gray-500">Name</Label>
                <Input
                  className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 px-3 py-2 text-xs text-white"
                  value={presetDraft.name}
                  onChange={(event) =>
                    setPresetDraft((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-gray-500">Description</Label>
                <Textarea
                  className="mt-2 min-h-[64px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-xs text-white"
                  value={presetDraft.description}
                  onChange={(event) =>
                    setPresetDraft((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-gray-500">
                  Bundle Ports (one per line)
                </Label>
                <Textarea
                  className="mt-2 min-h-[90px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-xs text-white"
                  value={presetDraft.bundlePorts}
                  onChange={(event) =>
                    setPresetDraft((prev) => ({ ...prev, bundlePorts: event.target.value }))
                  }
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-gray-500">Template</Label>
                <Textarea
                  className="mt-2 min-h-[90px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-xs text-white"
                  value={presetDraft.template}
                  onChange={(event) =>
                    setPresetDraft((prev) => ({ ...prev, template: event.target.value }))
                  }
                />
              </div>
              <Button
                className="w-full rounded-md border border-emerald-500/40 text-xs text-emerald-200 hover:bg-emerald-500/10"
                type="button"
                onClick={() => void handleSavePreset()}
              >
                {editingPresetId ? "Update Preset" : "Save Preset"}
              </Button>
            </div>
            <div className="mt-4 space-y-2 text-xs text-gray-400">
              <div className="text-[11px] uppercase text-gray-500">Library</div>
              {clusterPresets.length === 0 && (
                <div className="rounded-md border border-gray-800 bg-gray-900/50 p-3 text-[11px] text-gray-500">
                  No presets yet. Save a bundle + template pair to reuse across apps.
                </div>
              )}
              {clusterPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="rounded-md border border-gray-800 bg-gray-900/50 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-white">{preset.name}</div>
                      {preset.description && (
                        <div className="text-[11px] text-gray-500">
                          {preset.description}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        className="rounded-md border border-gray-700 px-2 py-1 text-[10px] text-gray-200 hover:bg-gray-900/80"
                        onClick={() => handleLoadPreset(preset)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        className="rounded-md border border-emerald-500/40 px-2 py-1 text-[10px] text-emerald-200 hover:bg-emerald-500/10"
                        onClick={() => handleApplyPreset(preset)}
                      >
                        Apply
                      </Button>
                      <Button
                        type="button"
                        className="rounded-md border border-rose-500/40 px-2 py-1 text-[10px] text-rose-200 hover:bg-rose-500/10"
                        onClick={() => void handleDeletePreset(preset.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-gray-500">
                    Updated: {new Date(preset.updatedAt).toLocaleString()}
                  </div>
                </div>
              ))}
              <Button
                type="button"
                className="w-full rounded-md border border-gray-700 text-xs text-white hover:bg-gray-900/80"
                onClick={handleExportPresets}
              >
                Export / Import
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
            <div className="mb-2 text-sm font-semibold text-white">Graph Model Debug</div>
            {lastGraphModelPayload ? (
              <pre className="max-h-60 overflow-auto rounded-md border border-gray-800 bg-gray-950/70 p-3 text-[11px] text-gray-300 whitespace-pre-wrap">
                {JSON.stringify(lastGraphModelPayload, null, 2)}
              </pre>
            ) : (
              <div className="text-[11px] text-gray-500">
                Run a model node to capture the latest payload.
              </div>
            )}
          </div>
        </div>
        <CanvasBoard
          viewportRef={viewportRef}
          canvasRef={canvasRef}
          nodes={nodes}
          edges={edges}
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
          onSelectEdgeId={setSelectedEdgeId}
          onRemoveEdge={handleRemoveEdge}
          onSelectNode={setSelectedNodeId}
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
          onCreatePath={handleCreatePath}
          onCreateAiDescriptionPath={handleCreateAiDescriptionPath}
          onSaveList={() => savePathIndex(paths)}
          onEditPath={(pathId) => {
            handleSwitchPath(pathId);
            onTabChange?.("canvas");
          }}
          onDeletePath={(pathId) => {
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
        updateSelectedNode={updateSelectedNode}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
        handleFetchParserSample={handleFetchParserSample}
        handleFetchUpdaterSample={handleFetchUpdaterSample}
        handleRunSimulation={handleRunSimulation}
        toast={toast}
      />
      <Dialog open={presetsModalOpen} onOpenChange={setPresetsModalOpen}>
        <DialogContent className="max-w-2xl border border-gray-800 bg-gray-950 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg">Export / Import Presets</DialogTitle>
            <DialogDescription className="text-sm text-gray-400">
              Share Cluster Presets as JSON across projects.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              className="min-h-[240px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
              value={presetsJson}
              onChange={(event) => setPresetsJson(event.target.value)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                className="rounded-md border border-gray-700 text-xs text-white hover:bg-gray-900/80"
                onClick={() => setPresetsJson(JSON.stringify(clusterPresets, null, 2))}
              >
                Load Export
              </Button>
              <Button
                type="button"
                className="rounded-md border border-emerald-500/40 text-xs text-emerald-200 hover:bg-emerald-500/10"
                onClick={() => void handleImportPresets("merge")}
              >
                Import (Merge)
              </Button>
              <Button
                type="button"
                className="rounded-md border border-rose-500/40 text-xs text-rose-200 hover:bg-rose-500/10"
                onClick={() => void handleImportPresets("replace")}
              >
                Replace Existing
              </Button>
              <Button
                type="button"
                className="rounded-md border border-gray-700 text-xs text-white hover:bg-gray-900/80"
                onClick={() => {
                  const value = presetsJson || JSON.stringify(clusterPresets, null, 2);
                  navigator.clipboard
                    .writeText(value)
                    .then(() => toast("Presets copied to clipboard.", { variant: "success" }))
                    .catch((error) => {
                      reportAiPathsError(error, { action: "copyPresets" }, "Failed to copy presets:");
                      toast("Failed to copy presets.", { variant: "error" });
                    });
                }}
              >
                Copy JSON
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {simulationOpenNodeId ? (
        <Dialog
          open={Boolean(simulationOpenNodeId)}
          onOpenChange={(open) => {
            if (!open) setSimulationOpenNodeId(null);
          }}
        >
          <DialogContent className="max-w-md border border-gray-800 bg-gray-950 text-white">
            <DialogHeader>
              <DialogTitle className="text-lg">Simulation Modal</DialogTitle>
              <DialogDescription className="text-sm text-gray-400">
                Set an Entity ID and simulate the connected trigger action.
              </DialogDescription>
            </DialogHeader>
            {(() => {
              const simulationNode = nodes.find((node) => node.id === simulationOpenNodeId);
              if (!simulationNode) return null;
              const simulationConfig = simulationNode.config?.simulation ?? { productId: "" };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Entity ID</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={simulationConfig.entityId ?? simulationConfig.productId}
                      onChange={(event) => {
                        const value = event.target.value;
                        setNodes((prev) =>
                          prev.map((node) =>
                            node.id === simulationNode.id
                              ? {
                                  ...node,
                                  config: {
                                    ...node.config,
                                    simulation: {
                                      productId: value,
                                      entityId: value,
                                      entityType: simulationConfig.entityType ?? "product",
                                    },
                                  },
                                }
                              : node
                          )
                        );
                      }}
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      Current entity type: {simulationConfig.entityType ?? "product"}
                    </p>
                  </div>
                  <Button
                    className="w-full rounded-md border border-cyan-500/40 text-sm text-cyan-200 hover:bg-cyan-500/10"
                    type="button"
                    onClick={() => handleRunSimulation(simulationNode)}
                  >
                    Simulate Trigger
                  </Button>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
