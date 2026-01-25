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
  const [presetsModalOpen, setPresetsModalOpen] = useState(false);
  const [presetsJson, setPresetsJson] = useState("");
  const [expandedPaletteGroups, setExpandedPaletteGroups] = useState<Set<string>>(
    new Set(["Triggers"])
  );
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
        const res = await fetch("/api/settings");
        if (!res.ok) {
          throw new Error("Failed to load AI Paths settings.");
        }
        const data = (await res.json()) as Array<{ key: string; value: string }>;
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
        const firstPath = metas[0]?.id ?? Object.keys(configs)[0] ?? "default";
        setActivePathId(firstPath);
        const activeConfig = configs[firstPath] ?? createDefaultPathConfig(firstPath);
        const normalizedNodes = normalizeNodes(activeConfig.nodes);
        setNodes(normalizedNodes);
        setEdges(sanitizeEdges(normalizedNodes, activeConfig.edges));
        setPathName(activeConfig.name);
        setPathDescription(activeConfig.description);
        setActiveTrigger(activeConfig.trigger);
        setSelectedNodeId(normalizedNodes[0]?.id ?? null);
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
          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
            <div className="mb-3 text-sm font-semibold text-white">Node Palette</div>
            <div className="max-h-[520px] space-y-1 overflow-y-auto pr-1">
              {[
                { title: "Triggers", types: ["trigger"], icon: "⚡" },
                { title: "Simulation", types: ["simulation"], icon: "🧪" },
                { title: "Context + Parsing", types: ["context", "parser"], icon: "📦" },
                { title: "Transforms", types: ["mapper", "mutator", "validator"], icon: "🧭" },
                {
                  title: "Signals + Logic",
                  types: ["constant", "math", "compare", "gate", "router", "delay"],
                  icon: "🧪",
                },
                { title: "Bundles + Templates", types: ["bundle", "template"], icon: "🧩" },
                { title: "IO + Fetch", types: ["http", "database"], icon: "🌐" },
                { title: "Prompts + Models", types: ["prompt", "model", "ai_description"], icon: "🤖" },
                { title: "Description", types: ["description_updater"], icon: "✍️" },
                { title: "Viewers", types: ["viewer"], icon: "👁" },
              ].map((group) => {
                const items = palette.filter((node) => group.types.includes(node.type));
                if (items.length === 0) return null;
                const isExpanded = expandedPaletteGroups.has(group.title);
                return (
                  <div key={group.title} className="rounded-md border border-gray-800/50">
                    <button
                      type="button"
                      onClick={() => togglePaletteGroup(group.title)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left transition hover:bg-gray-900/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{group.icon}</span>
                        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-300">
                          {group.title}
                        </span>
                        <span className="rounded-full bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400">
                          {items.length}
                        </span>
                      </div>
                      <svg
                        className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className="space-y-2 px-3 pb-3">
                        {items.map((node) => (
                          <div
                            key={node.title}
                            draggable
                            onDragStart={(event) => handleDragStart(event, node)}
                            className="cursor-grab rounded-lg border border-gray-800 bg-gray-900/60 p-3 text-xs text-gray-300 transition hover:border-gray-600 hover:bg-gray-900 active:cursor-grabbing"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-white">
                                {node.title}
                              </span>
                              <span className="text-[10px] uppercase text-gray-500">
                                {node.type}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-gray-400">
                              {node.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
            <div className="mb-3 text-sm font-semibold text-white">Inspector</div>
            {selectedNode ? (
              <div className="space-y-3 text-xs text-gray-300">
                {selectedNode.type === "trigger" && (
                  <Button
                    className="w-full rounded-md border border-emerald-500/40 text-xs text-emerald-200 hover:bg-emerald-500/10"
                    type="button"
                    onClick={() => handleFireTrigger(selectedNode)}
                  >
                    Fire Trigger
                  </Button>
                )}
                {selectedNode.type === "simulation" && (
                  <Button
                    className="w-full rounded-md border border-cyan-500/40 text-xs text-cyan-200 hover:bg-cyan-500/10"
                    type="button"
                    onClick={() => setSimulationOpenNodeId(selectedNode.id)}
                  >
                    Open Simulation
                  </Button>
                )}
                <div>
                  <Label className="text-[10px] uppercase text-gray-500">Title</Label>
                  <Input
                    className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 px-3 py-2 text-xs text-white"
                    value={selectedNode.title}
                    onChange={(event) =>
                      updateSelectedNode({ title: event.target.value })
                    }
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-gray-500">
                    Description
                  </Label>
                  <Textarea
                    className="mt-2 min-h-[64px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-xs text-white"
                    value={selectedNode.description}
                    onChange={(event) =>
                      updateSelectedNode({ description: event.target.value })
                    }
                  />
                </div>
                <div className="rounded-md border border-gray-800 bg-gray-900/50 p-3 text-[11px] text-gray-400">
                  Inputs: {selectedNode.inputs.join(", ") || "None"} <br />
                  Outputs: {selectedNode.outputs.join(", ") || "None"}
                </div>
                {selectedNode.type === "prompt" && (() => {
                  const incomingEdges = edges.filter((edge) => edge.to === selectedNode.id);
                  const inputPorts = incomingEdges
                    .map((edge) => edge.toPort)
                    .filter((port): port is string => Boolean(port));
                  const bundleKeys = new Set<string>();
                  incomingEdges.forEach((edge) => {
                    if (edge.toPort !== "bundle") return;
                    const fromNode = nodes.find((node) => node.id === edge.from);
                    if (!fromNode) return;
                    if (fromNode.type === "parser") {
                      const mappings =
                        fromNode.config?.parser?.mappings ??
                        createParserMappings(fromNode.outputs);
                      Object.keys(mappings).forEach((key) => {
                        const trimmed = key.trim();
                        if (trimmed) bundleKeys.add(trimmed);
                      });
                      return;
                    }
                    if (fromNode.type === "bundle") {
                      fromNode.inputs.forEach((port) => {
                        const trimmed = port.trim();
                        if (trimmed) bundleKeys.add(trimmed);
                      });
                    }
                    if (fromNode.type === "mapper") {
                      const mapperOutputs =
                        fromNode.config?.mapper?.outputs ?? fromNode.outputs;
                      mapperOutputs.forEach((output) => {
                        const trimmed = output.trim();
                        if (trimmed) bundleKeys.add(trimmed);
                      });
                    }
                  });
                  const directPlaceholders = inputPorts.filter((port) => port !== "bundle");
                  if (bundleKeys.size === 0 && directPlaceholders.length === 0) return null;
                  return (
                    <div className="rounded-md border border-gray-800 bg-gray-900/50 p-3 text-[11px] text-gray-400">
                      <div className="text-gray-300">Prompt placeholders</div>
                      {bundleKeys.size > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Array.from(bundleKeys).map((key) => (
                            <span
                              key={key}
                              className="rounded-full border border-gray-700 px-2 py-0.5 text-[10px] text-gray-200"
                            >
                              {`{{${key}}}`}
                            </span>
                          ))}
                        </div>
                      )}
                      {directPlaceholders.length > 0 && (
                        <div className="mt-2 text-[11px] text-gray-500">
                          Direct inputs:{" "}
                          {directPlaceholders.map((port) => `{{${port}}}`).join(", ")}
                        </div>
                      )}
                    </div>
                  );
                })()}
                <Button
                  className="w-full rounded-md border border-gray-700 text-xs text-white hover:bg-gray-900/80"
                  onClick={() => setConfigOpen(true)}
                >
                  Open Node Config
                </Button>
                <Button
                  className="w-full rounded-md border border-rose-500/40 text-xs text-rose-200 hover:bg-rose-500/10"
                  type="button"
                  onClick={handleDeleteSelectedNode}
                >
                  Remove Node
                </Button>
              </div>
            ) : (
              <div className="text-xs text-gray-500">
                Select a node to inspect inputs, outputs, and configuration.
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
            <div className="mb-3 text-sm font-semibold text-white">Connections</div>
            <div className="space-y-2 text-xs text-gray-400">
              <div>Active wires: {edges.length}</div>
              {selectedEdgeId ? (() => {
                const selectedEdge = edges.find((e) => e.id === selectedEdgeId);
                const fromNode = selectedEdge ? nodes.find((n) => n.id === selectedEdge.from) : null;
                const toNode = selectedEdge ? nodes.find((n) => n.id === selectedEdge.to) : null;
                return selectedEdge ? (
                  <div className="space-y-3 rounded-md border border-blue-500/30 bg-blue-500/5 p-3">
                    <div className="text-xs font-medium text-blue-300">Selected Wire</div>
                    <div className="space-y-2">
                      <div className="rounded border border-gray-700 bg-gray-900/50 p-2">
                        <div className="text-[10px] uppercase text-gray-500">From</div>
                        <div className="text-sm text-white">{fromNode?.title ?? selectedEdge.from}</div>
                        <div className="text-[11px] text-gray-400">
                          Type: <span className="text-amber-300">{fromNode?.type ?? "unknown"}</span>
                        </div>
                        <div className="text-[11px] text-gray-400">
                          Port: <span className="text-amber-300">{selectedEdge.fromPort ?? "default"}</span>
                        </div>
                      </div>
                      <div className="flex justify-center text-gray-500">↓</div>
                      <div className="rounded border border-gray-700 bg-gray-900/50 p-2">
                        <div className="text-[10px] uppercase text-gray-500">To</div>
                        <div className="text-sm text-white">{toNode?.title ?? selectedEdge.to}</div>
                        <div className="text-[11px] text-gray-400">
                          Type: <span className="text-sky-300">{toNode?.type ?? "unknown"}</span>
                        </div>
                        <div className="text-[11px] text-gray-400">
                          Port: <span className="text-sky-300">{selectedEdge.toPort ?? "default"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 rounded-md border border-gray-600 text-xs text-gray-300 hover:bg-gray-700"
                        type="button"
                        onClick={() => setSelectedEdgeId(null)}
                      >
                        Deselect
                      </Button>
                      <Button
                        className="flex-1 rounded-md border border-rose-500/40 text-xs text-rose-200 hover:bg-rose-500/10"
                        type="button"
                        onClick={() => handleRemoveEdge(selectedEdgeId)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : null;
              })() : (
                <div className="text-[11px] text-gray-500">
                  Click a wire to select it.
                </div>
              )}
              <Button
                className="w-full rounded-md border border-rose-500/40 text-xs text-rose-200 hover:bg-rose-500/10"
                type="button"
                onClick={() => void handleClearWires()}
              >
                Clear All Wires
              </Button>
            </div>
            {edges.length > 0 && (
              <div className="mt-3 space-y-2 text-[11px] text-gray-500">
                {edges.map((edge) => {
                  const fromNode = nodes.find((node) => node.id === edge.from);
                  const toNode = nodes.find((node) => node.id === edge.to);
                  const label = `${fromNode?.title ?? edge.from}.${edge.fromPort ?? "?"} → ${toNode?.title ?? edge.to}.${edge.toPort ?? "?"}`;
                  const isSelected = edge.id === selectedEdgeId;
                  return (
                    <div
                      key={edge.id}
                      className={`flex items-center justify-between gap-2 rounded-md border px-2 py-1 ${
                        isSelected
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                          : "border-gray-800 bg-gray-900/40"
                      }`}
                    >
                      <span className="truncate">{label}</span>
                      <Button
                        type="button"
                        className="rounded-md border border-rose-500/40 px-2 py-0.5 text-[10px] text-rose-200 hover:bg-rose-500/10"
                        onClick={() => handleRemoveEdge(edge.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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
        </div>
        <div
          ref={viewportRef}
          className={`relative min-h-[560px] rounded-lg border border-gray-800 bg-gray-950/70 overflow-hidden ${
            panState ? "cursor-grabbing" : "cursor-grab"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onPointerDown={handlePanStart}
          onPointerMove={handlePanMove}
          onPointerUp={handlePanEnd}
          onPointerLeave={handlePanEnd}
        >
          <div className="absolute bottom-3 left-3 z-10 rounded-md border border-gray-800 bg-gray-950/70 px-3 py-2 text-[11px] text-gray-400">
            Nodes: {nodes.length}
            {lastDrop ? ` • Last drop: ${Math.round(lastDrop.x)}, ${Math.round(lastDrop.y)}` : ""}
            {` • View: ${Math.round(view.x)}, ${Math.round(view.y)} @ ${Math.round(view.scale * 100)}%`}
          </div>
          <div className="absolute bottom-4 right-4 z-10 rounded-md border border-gray-800 bg-gray-950/70 p-2 text-xs text-gray-300">
            <div className="mb-2 text-[11px] uppercase text-gray-500">
              View Controls
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="h-7 w-7 rounded-full border border-gray-700 text-xs text-white hover:bg-gray-900/80"
                type="button"
                onClick={() => zoomTo(view.scale - 0.1)}
              >
                -
              </Button>
              <span className="min-w-[56px] text-center text-[11px] text-gray-300">
                {Math.round(view.scale * 100)}%
              </span>
              <Button
                className="h-7 w-7 rounded-full border border-gray-700 text-xs text-white hover:bg-gray-900/80"
                type="button"
                onClick={() => zoomTo(view.scale + 0.1)}
              >
                +
              </Button>
              <Button
                className="h-7 rounded-full border border-gray-700 px-2 text-[11px] text-white hover:bg-gray-900/80"
                type="button"
                onClick={fitToNodes}
              >
                Fit
              </Button>
              <Button
                className="h-7 rounded-full border border-gray-700 px-2 text-[11px] text-white hover:bg-gray-900/80"
                type="button"
                onClick={resetView}
              >
                Reset
              </Button>
            </div>
          </div>
          <div
            ref={canvasRef}
            className="absolute left-0 top-0"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
              transformOrigin: "0 0",
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.18) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          >
            {lastDrop ? (
              <div
                className="absolute rounded-full border border-red-400 bg-red-500/30"
                style={{
                  width: 10,
                  height: 10,
                  transform: `translate(${lastDrop.x}px, ${lastDrop.y}px)`,
                }}
              />
            ) : null}
            <svg
              className="absolute inset-0"
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              style={{ pointerEvents: "none" }}
            >
              {edgePaths.map((edge) => {
                const isSelected = selectedEdgeId === edge.id;
                return (
                  <g key={edge.id} className="group cursor-pointer">
                    {/* Invisible wider hit area for easier hover/click */}
                    <path
                      d={edge.path}
                      stroke="transparent"
                      strokeWidth="14"
                      fill="none"
                      style={{ pointerEvents: "stroke" }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        handleRemoveEdge(edge.id);
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setSelectedEdgeId(edge.id);
                      }}
                    />
                    {/* Visible wire - highlighted on group hover */}
                    <path
                      d={edge.path}
                      className={`transition-all duration-150 ${
                        isSelected
                          ? "stroke-blue-400"
                          : "stroke-slate-400/45 group-hover:stroke-blue-400/70"
                      }`}
                      strokeWidth={isSelected ? 2.5 : 1.6}
                      fill="none"
                      style={{ pointerEvents: "none" }}
                    />
                  </g>
                );
              })}
              {connecting && connectingPos ? (() => {
                const fromX = connecting.start.x;
                const fromY = connecting.start.y;
                const toX = connectingPos.x;
                const toY = connectingPos.y;
                const midX = fromX + (toX - fromX) * 0.5;
                const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
                return (
                  <path
                    d={path}
                    stroke="rgba(148,163,184,0.7)"
                    strokeWidth="1.6"
                    fill="none"
                    strokeDasharray="4 3"
                  />
                );
              })() : null}
            </svg>

            {nodes.map((node) => {
              const isSelected = node.id === selectedNodeId;
              const style = typeStyles[node.type];
              const runtimeInputs = runtimeState.inputs[node.id] ?? {};
              const viewerOutputs =
                node.type === "viewer"
                  ? {
                      ...createViewerOutputs(node.inputs),
                      ...(node.config?.viewer?.outputs ?? {}),
                      ...runtimeInputs,
                    }
                  : null;
              return (
                <div
                  key={node.id}
                  className={`absolute ${dragState?.nodeId === node.id ? "cursor-grabbing" : "cursor-grab"}`}
                  style={{
                    width: NODE_WIDTH,
                    transform: `translate(${node.position.x}px, ${node.position.y}px)`,
                  }}
                  onPointerDown={(event) => handlePointerDown(event, node.id)}
                  onPointerMove={(event) => handlePointerMove(event, node.id)}
                  onPointerUp={(event) => handlePointerUp(event, node.id)}
                  onClick={() => setSelectedNodeId(node.id)}
                >
                  <div
                    className={`relative flex flex-col gap-2 rounded-xl border bg-gray-950/80 p-3 text-xs text-gray-200 shadow-lg backdrop-blur ${
                      style.border
                    } ${style.glow} ${isSelected ? "ring-2 ring-white/20" : ""}`}
                  >
                    {node.inputs.map((input, index) => (
                      <div
                        key={`input-${node.id}-${input}`}
                        className="absolute flex items-center"
                        style={{
                          left: -(PORT_SIZE / 2) - 4,
                          top: getPortOffsetY(index, node.inputs.length) - PORT_SIZE / 2,
                        }}
                      >
                        <button
                          type="button"
                          data-port="input"
                          className="cursor-pointer rounded-full border border-sky-400/60 bg-sky-500/20 shadow-[0_0_8px_rgba(56,189,248,0.35)] hover:border-sky-200"
                          style={{
                            width: PORT_SIZE + 2,
                            height: PORT_SIZE + 2,
                          }}
                          onPointerUp={(event) => handleCompleteConnection(event, node, input)}
                          aria-label={`Connect to ${input}`}
                          title={`Input: ${input}`}
                        />
                        <span className="ml-1.5 rounded bg-sky-500/10 px-1 py-0.5 text-[8px] font-medium text-sky-300">
                          {input}
                        </span>
                      </div>
                    ))}
                    {node.outputs.map((output, index) => (
                      <div
                        key={`output-${node.id}-${output}`}
                        className="absolute flex items-center"
                        style={{
                          right: -(PORT_SIZE / 2) - 4,
                          top: getPortOffsetY(index, node.outputs.length) - PORT_SIZE / 2,
                        }}
                      >
                        <span className="mr-1.5 rounded bg-amber-500/10 px-1 py-0.5 text-[8px] font-medium text-amber-300">
                          {output}
                        </span>
                        <button
                          type="button"
                          data-port="output"
                          className="cursor-pointer rounded-full border border-amber-400/60 bg-amber-500/20 shadow-[0_0_8px_rgba(251,191,36,0.35)] hover:border-amber-200"
                          style={{
                            width: PORT_SIZE + 2,
                            height: PORT_SIZE + 2,
                          }}
                          onPointerDown={(event) => handleStartConnection(event, node, output)}
                          aria-label={`Start connection from ${output}`}
                          title={`Output: ${output}`}
                        />
                      </div>
                    ))}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">{node.title}</span>
                      <span className="rounded-full border border-gray-700 px-2 py-[1px] text-[10px] uppercase text-gray-400">
                        {node.type}
                      </span>
                    </div>
                    {node.type === "trigger" && (
                      <Button
                        className="self-start rounded-md border border-emerald-500/40 px-2 py-1 text-[10px] text-emerald-200 hover:bg-emerald-500/10"
                        type="button"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() => handleFireTrigger(node)}
                      >
                        Fire Trigger
                      </Button>
                    )}
                    <p className="text-[11px] text-gray-400">{node.description}</p>
                    {node.type === "context" && (
                      <span className="text-[10px] uppercase text-emerald-300/80">
                        Role output can feed any Trigger
                      </span>
                    )}
                    {node.type === "simulation" && (
                      <span className="text-[10px] uppercase text-cyan-300/80">
                        Connect simulation → Trigger
                      </span>
                    )}
                    {node.type === "trigger" && (
                      <span className="text-[10px] uppercase text-lime-200/80">
                        Accepts role + simulation inputs
                      </span>
                    )}
                    {node.type === "viewer" && viewerOutputs && (
                      <div className="space-y-2 rounded-md border border-gray-800 bg-gray-950/60 p-2 text-[10px] text-gray-300">
                        <div className="flex items-center justify-between text-[9px] uppercase text-gray-500">
                          <span>Results</span>
                          <span>{node.inputs.length} inputs</span>
                        </div>
                        <div className="space-y-1">
                          {node.inputs.map((input) => (
                            <div key={input} className="space-y-1">
                              <div className="flex items-center justify-between text-[9px] uppercase text-gray-500">
                                <span>{input}</span>
                                {runtimeInputs[input] !== undefined && (
                                  <span className="text-[9px] text-emerald-300">runtime</span>
                                )}
                              </div>
                              <div className="line-clamp-3 rounded border border-gray-800 bg-gray-900/60 px-2 py-1 text-[10px] text-gray-200">
                                {formatRuntimeValue(viewerOutputs[input]) || "No data yet"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
          onCopyDocsWiring={() => void handleCopyDocsWiring()}
          onCopyDocsDescription={() => void handleCopyDocsDescription()}
        />
      )}

      {selectedNode ? (
        <Dialog open={configOpen} onOpenChange={setConfigOpen}>
          <DialogContent className="max-h-[85vh] w-[95vw] max-w-4xl overflow-y-auto border border-gray-800 bg-gray-950 text-white">
            <DialogHeader>
              <DialogTitle className="text-lg">
                Configure {selectedNode.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-400">
                Adjust parser mappings, model selection, or database operations
                for this node.
              </DialogDescription>
            </DialogHeader>

            {selectedNode.type === "parser" && (() => {
              const parserConfig = selectedNode.config?.parser ?? {
                mappings: createParserMappings(selectedNode.outputs),
                outputMode: "individual",
                presetId: PARSER_PRESETS[0]?.id ?? "custom",
              };
              const mappings =
                parserConfig.mappings ?? createParserMappings(selectedNode.outputs);
              const outputMode = parserConfig.outputMode ?? "individual";
              const presetId =
                parserConfig.presetId ?? PARSER_PRESETS[0]?.id ?? "custom";
              const presetOptions = [
                ...PARSER_PRESETS,
                {
                  id: "custom",
                  label: "Custom",
                  description: "Use manual mappings.",
                  mappings: {},
                },
              ];
              const activePreset =
                presetOptions.find((preset) => preset.id === presetId) ?? null;
              const sampleState =
                parserSamples[selectedNode.id] ?? {
                  entityType: "product",
                  entityId: "",
                  json: "",
                  mappingMode: "top",
                  depth: 2,
                  keyStyle: "path",
                  includeContainers: false,
                };
              const parsedSample = safeParseJson(sampleState.json);
              const sampleValue = parsedSample.value;
              const sampleMappings = sampleValue
                ? sampleState.mappingMode === "flatten"
                  ? buildFlattenedMappings(
                      sampleValue,
                      sampleState.depth ?? 2,
                      sampleState.keyStyle ?? "path",
                      sampleState.includeContainers ?? false
                    )
                  : buildTopLevelMappings(sampleValue)
                : {};
              const sampleEntries = sampleValue
                ? extractJsonPathEntries(sampleValue, sampleState.depth ?? 2)
                : [];
              const samplePaths = sampleEntries
                .filter((entry) => {
                  if (sampleState.includeContainers) return true;
                  return entry.type === "value" || entry.type === "array";
                })
                .map((entry) => entry.path);
              const samplePathOptions = samplePaths.map((path) => {
                const value = path.startsWith("[") ? `$${path}` : `$.${path}`;
                return { label: `Sample: ${path}`, value };
              });
              const suggestedPathOptions = samplePathOptions.length
                ? [...samplePathOptions, ...PARSER_PATH_OPTIONS]
                : PARSER_PATH_OPTIONS;
              const entries = Object.entries(mappings);
              const commitMappings = (
                nextMappings: Record<string, string>,
                nextMode: "individual" | "bundle" = outputMode,
                nextPresetId: string = presetId
              ) => {
                const keys = Object.keys(nextMappings)
                  .map((key) => key.trim())
                  .filter(Boolean);
                const nextOutputs = nextMode === "bundle" ? ["bundle"] : keys;
                updateSelectedNode({
                  outputs: nextOutputs.length ? nextOutputs : selectedNode.outputs,
                  config: {
                    ...selectedNode.config,
                    parser: {
                      mappings: nextMappings,
                      outputMode: nextMode,
                      presetId: nextPresetId,
                    },
                  },
                });
              };
              const addMapping = (baseKey: string, defaultPath: string) => {
                let nextKey = baseKey;
                let counter = 1;
                while (mappings[nextKey]) {
                  counter += 1;
                  nextKey = `${baseKey}_${counter}`;
                }
                commitMappings({ ...mappings, [nextKey]: defaultPath });
              };
              const updateMappingKey = (index: number, value: string) => {
                const nextEntries = entries.map((entry, idx) => {
                  if (idx !== index) return entry;
                  const nextKey = value.trim() || entry[0];
                  return [nextKey, entry[1]] as [string, string];
                });
                const nextMappings: Record<string, string> = {};
                nextEntries.forEach(([key, path]) => {
                  if (!key.trim()) return;
                  nextMappings[key.trim()] = path;
                });
                commitMappings(nextMappings);
              };
              const updateMappingPath = (index: number, value: string) => {
                const nextEntries = entries.map((entry, idx) =>
                  idx === index ? [entry[0], value] : entry
                );
                const nextMappings: Record<string, string> = {};
                nextEntries.forEach(([key, path]) => {
                  if (!key.trim()) return;
                  nextMappings[key.trim()] = path;
                });
                commitMappings(nextMappings);
              };
              const removeMapping = (index: number) => {
                if (entries.length <= 1) return;
                const nextEntries = entries.filter((_, idx) => idx !== index);
                const nextMappings: Record<string, string> = {};
                nextEntries.forEach(([key, path]) => {
                  if (!key.trim()) return;
                  nextMappings[key.trim()] = path;
                });
                commitMappings(nextMappings);
              };
              const applyPreset = (mode: "replace" | "merge") => {
                if (!activePreset || activePreset.id === "custom") return;
                if (mode === "replace") {
                  commitMappings(activePreset.mappings, outputMode, activePreset.id);
                  return;
                }
                const merged: Record<string, string> = { ...mappings };
                Object.entries(activePreset.mappings).forEach(([key, value]) => {
                  if (!(key in merged)) {
                    merged[key] = value;
                  }
                });
                commitMappings(merged, outputMode, activePreset.id);
              };
              const applySampleMappings = (mode: "replace" | "merge") => {
                const keys = Object.keys(sampleMappings);
                if (keys.length === 0) return;
                if (mode === "replace") {
                  commitMappings(sampleMappings, outputMode, "custom");
                  return;
                }
                const merged: Record<string, string> = { ...mappings };
                keys.forEach((key) => {
                  if (!(key in merged)) {
                    merged[key] = sampleMappings[key] ?? "";
                  }
                });
                commitMappings(merged, outputMode, "custom");
              };
              const handleDetectImages = () => {
                if (!sampleValue) {
                  toast("Provide sample JSON to detect image fields.", { variant: "error" });
                  return;
                }
                const detected = inferImageMappingPath(
                  sampleValue,
                  sampleState.depth ?? 2
                );
                if (!detected) {
                  toast("No image-like field detected in the sample.", { variant: "error" });
                  return;
                }
                if (imageEntryIndex >= 0) {
                  updateMappingPath(imageEntryIndex, detected);
                  return;
                }
                addMapping("images", detected);
              };
              const imageEntryIndex = entries.findIndex(([key]) =>
                key.toLowerCase().includes("image")
              );
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Preset</Label>
                    <Select
                      value={presetId}
                      onValueChange={(value) =>
                        commitMappings(mappings, outputMode, value)
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select preset" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        {presetOptions.map((preset) => (
                          <SelectItem key={preset.id} value={preset.id}>
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {activePreset && (
                      <p className="mt-2 text-[11px] text-gray-500">
                        {activePreset.description}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                        onClick={() => applyPreset("replace")}
                      >
                        Replace mappings
                      </Button>
                      <Button
                        type="button"
                        className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                        onClick={() => applyPreset("merge")}
                      >
                        Add missing fields
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-400">Sample JSON</Label>
                    <div className="mt-2 grid gap-2 sm:grid-cols-[160px_1fr_auto] sm:items-center">
                      <Select
                        value={sampleState.entityType}
                        onValueChange={(value) =>
                          setParserSamples((prev) => ({
                            ...prev,
                            [selectedNode.id]: {
                              ...sampleState,
                              entityType: value,
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="border-gray-800 bg-gray-950/70 text-sm text-white">
                          <SelectValue placeholder="Entity type" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-800 bg-gray-900">
                          <SelectItem value="product">Product</SelectItem>
                          <SelectItem value="note">Note</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        className="w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                        value={sampleState.entityId}
                        onChange={(event) =>
                          setParserSamples((prev) => ({
                            ...prev,
                            [selectedNode.id]: {
                              ...sampleState,
                              entityId: event.target.value,
                            },
                          }))
                        }
                        placeholder="Entity ID"
                      />
                      <Button
                        type="button"
                        className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                        disabled={parserSampleLoading}
                        onClick={() =>
                          void handleFetchParserSample(
                            selectedNode.id,
                            sampleState.entityType,
                            sampleState.entityId
                          )
                        }
                      >
                        {parserSampleLoading ? "Loading..." : "Fetch sample"}
                      </Button>
                    </div>
                    <Textarea
                      className="mt-2 min-h-[120px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={sampleState.json}
                      onChange={(event) =>
                        setParserSamples((prev) => ({
                          ...prev,
                          [selectedNode.id]: {
                            ...sampleState,
                            json: event.target.value,
                          },
                        }))
                      }
                      placeholder='{ "id": "123", "title": "Sample" }'
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Select
                        value={sampleState.mappingMode}
                        onValueChange={(value) =>
                          setParserSamples((prev) => ({
                            ...prev,
                            [selectedNode.id]: {
                              ...sampleState,
                              mappingMode: value as "top" | "flatten",
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="w-[180px] border-gray-800 bg-gray-950/70 text-sm text-white">
                          <SelectValue placeholder="Mapping mode" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-800 bg-gray-900">
                          <SelectItem value="top">Top-level fields</SelectItem>
                          <SelectItem value="flatten">Flatten nested</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={String(sampleState.depth)}
                        onValueChange={(value) =>
                          setParserSamples((prev) => ({
                            ...prev,
                            [selectedNode.id]: {
                              ...sampleState,
                              depth: Number(value),
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="w-[160px] border-gray-800 bg-gray-950/70 text-sm text-white">
                          <SelectValue placeholder="Depth" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-800 bg-gray-900">
                          {[1, 2, 3, 4].map((depth) => (
                            <SelectItem key={depth} value={String(depth)}>
                              Depth {depth}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        className={`rounded-md border border-gray-700 px-3 text-[10px] ${
                          sampleState.includeContainers
                            ? "text-emerald-200 hover:bg-emerald-500/10"
                            : "text-gray-300 hover:bg-gray-900/80"
                        }`}
                        onClick={() =>
                          setParserSamples((prev) => ({
                            ...prev,
                            [selectedNode.id]: {
                              ...sampleState,
                              includeContainers: !sampleState.includeContainers,
                            },
                          }))
                        }
                      >
                        {sampleState.includeContainers ? "Containers: On" : "Containers: Off"}
                      </Button>
                      {sampleState.mappingMode === "flatten" && (
                        <Select
                          value={sampleState.keyStyle}
                          onValueChange={(value) =>
                            setParserSamples((prev) => ({
                              ...prev,
                              [selectedNode.id]: {
                                ...sampleState,
                                keyStyle: value as "path" | "leaf",
                              },
                            }))
                          }
                        >
                          <SelectTrigger className="w-[170px] border-gray-800 bg-gray-950/70 text-sm text-white">
                            <SelectValue placeholder="Key style" />
                          </SelectTrigger>
                          <SelectContent className="border-gray-800 bg-gray-900">
                            <SelectItem value="path">Path keys</SelectItem>
                            <SelectItem value="leaf">Leaf keys</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    {parsedSample.error ? (
                      <p className="mt-2 text-[11px] text-rose-300">
                        {parsedSample.error}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.keys(sampleMappings).length > 0 && (
                        <>
                          <Button
                            type="button"
                            className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                            onClick={() => applySampleMappings("replace")}
                          >
                            Generate from sample
                          </Button>
                          <Button
                            type="button"
                            className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                            onClick={() => applySampleMappings("merge")}
                          >
                            Add missing from sample
                          </Button>
                        </>
                      )}
                      <Button
                        type="button"
                        className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                        onClick={handleDetectImages}
                      >
                        Detect images
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-400">Output Mode</Label>
                    <Select
                      value={outputMode}
                      onValueChange={(value) =>
                        commitMappings(
                          mappings,
                          value as "individual" | "bundle"
                        )
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select output mode" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="individual">Individual outputs</SelectItem>
                        <SelectItem value="bundle">Single bundle output</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="mt-2 text-[11px] text-gray-500">
                      Bundle mode emits a single <span className="text-gray-300">bundle</span>{" "}
                      port and uses mapping keys as placeholders for Prompt templates.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                      onClick={() => addMapping("title", "$.title")}
                    >
                      Add title
                    </Button>
                    <Button
                      type="button"
                      className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                      onClick={() => addMapping("images", "$.images")}
                    >
                      Add images
                    </Button>
                    <Button
                      type="button"
                      className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                      onClick={() => addMapping("productId", "$.id")}
                    >
                      Add id
                    </Button>
                    <Button
                      type="button"
                      className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                      onClick={() => addMapping("sku", "$.sku")}
                    >
                      Add sku
                    </Button>
                    <Button
                      type="button"
                      className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                      onClick={() => addMapping("price", "$.price")}
                    >
                      Add price
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {entries.map(([key, path], index) => (
                      <div
                        key={`${key}-${index}`}
                        className="grid gap-2 sm:grid-cols-[160px_1fr_auto] sm:items-start"
                      >
                        <Input
                          className="w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                          value={key}
                          onChange={(event) =>
                            updateMappingKey(index, event.target.value)
                          }
                          placeholder="output key"
                        />
                        <div className="space-y-2">
                          <Input
                            className="w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                            value={path}
                            onChange={(event) =>
                              updateMappingPath(index, event.target.value)
                            }
                            placeholder="$.path.to.value"
                          />
                          <Select onValueChange={(value) => updateMappingPath(index, value)}>
                            <SelectTrigger className="border-gray-800 bg-gray-950/70 text-[10px] text-gray-200">
                              <SelectValue placeholder="Pick a suggested path" />
                            </SelectTrigger>
                            <SelectContent className="border-gray-800 bg-gray-900">
                              {suggestedPathOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          disabled={entries.length <= 1}
                          className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => removeMapping(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    className="w-full rounded-md border border-gray-700 text-xs text-white hover:bg-gray-900/80"
                    onClick={() =>
                      addMapping(`field_${entries.length + 1}`, "")
                    }
                  >
                    Add mapping
                  </Button>
                  {imageEntryIndex >= 0 && (
                    <div className="rounded-md border border-gray-800 bg-gray-900/50 p-3 text-[11px] text-gray-400">
                      <div className="text-gray-300">Image helpers</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                          onClick={() =>
                            updateMappingPath(imageEntryIndex, "$.images")
                          }
                        >
                          Use $.images
                        </Button>
                        <Button
                          type="button"
                          className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                          onClick={() =>
                            updateMappingPath(imageEntryIndex, "$.imageLinks")
                          }
                        >
                          Use $.imageLinks
                        </Button>
                        <Button
                          type="button"
                          className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                          onClick={() =>
                            updateMappingPath(imageEntryIndex, "$.media")
                          }
                        >
                          Use $.media
                        </Button>
                      </div>
                    </div>
                  )}
                  <p className="text-[11px] text-gray-500">
                    Use JSON paths like{" "}
                    <span className="text-gray-300">{`$.images`}</span>,{" "}
                    <span className="text-gray-300">{`$.imageLinks`}</span>, or{" "}
                    <span className="text-gray-300">{`$.media`}</span> for image arrays.
                  </p>
                </div>
              );
            })()}

            {selectedNode.type === "mapper" && (() => {
              const mapperConfig = selectedNode.config?.mapper ?? {
                outputs: selectedNode.outputs.length ? selectedNode.outputs : ["value"],
                mappings: createParserMappings(
                  selectedNode.outputs.length ? selectedNode.outputs : ["value"]
                ),
              };
              const outputs = mapperConfig.outputs.length
                ? mapperConfig.outputs
                : selectedNode.outputs.length
                  ? selectedNode.outputs
                  : ["value"];
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">
                      Outputs (one per line)
                    </Label>
                    <Textarea
                      className="mt-2 min-h-[90px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={outputs.join("\n")}
                      onChange={(event) => {
                        const list = parsePathList(event.target.value);
                        const nextOutputs = list.length ? list : ["value"];
                        const nextMappings = createParserMappings(nextOutputs);
                        nextOutputs.forEach((output) => {
                          if (mapperConfig.mappings?.[output]) {
                            nextMappings[output] = mapperConfig.mappings[output];
                          }
                        });
                        updateSelectedNode({
                          outputs: nextOutputs,
                          config: {
                            ...selectedNode.config,
                            mapper: {
                              outputs: nextOutputs,
                              mappings: nextMappings,
                            },
                          },
                        });
                      }}
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      Outputs must match downstream input ports exactly.
                    </p>
                  </div>
                  {outputs.map((output) => (
                    <div key={output}>
                      <Label className="text-xs text-gray-400">
                        {output} Mapping Path
                      </Label>
                      <Input
                        className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                        value={mapperConfig.mappings?.[output] ?? ""}
                        onChange={(event) => {
                          const nextMappings = {
                            ...mapperConfig.mappings,
                            [output]: event.target.value,
                          };
                          updateSelectedNodeConfig({
                            mapper: { outputs, mappings: nextMappings },
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
              );
            })()}

            {selectedNode.type === "mutator" && (() => {
              const mutatorConfig = selectedNode.config?.mutator ?? {
                path: "entity.title",
                valueTemplate: "{{value}}",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Target Path</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={mutatorConfig.path}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          mutator: { ...mutatorConfig, path: event.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Value Template</Label>
                    <Textarea
                      className="mt-2 min-h-[90px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={mutatorConfig.valueTemplate}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          mutator: {
                            ...mutatorConfig,
                            valueTemplate: event.target.value,
                          },
                        })
                      }
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      Use <span className="text-gray-300">{`{{value}}`}</span> for
                      the current value or dot paths like{" "}
                      <span className="text-gray-300">{`{{entity.title}}`}</span>.
                    </p>
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "validator" && (() => {
              const validatorConfig = selectedNode.config?.validator ?? {
                requiredPaths: ["entity.id"],
                mode: "all",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Validation Mode</Label>
                    <Select
                      value={validatorConfig.mode}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          validator: {
                            ...validatorConfig,
                            mode: value as "all" | "any",
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="all">All paths required</SelectItem>
                        <SelectItem value="any">Any path required</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">
                      Required Paths (one per line)
                    </Label>
                    <Textarea
                      className="mt-2 min-h-[100px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={(validatorConfig.requiredPaths ?? []).join("\n")}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          validator: {
                            ...validatorConfig,
                            requiredPaths: parsePathList(event.target.value),
                          },
                        })
                      }
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      Paths are relative to the incoming context object.
                    </p>
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "constant" && (() => {
              const constantConfig = selectedNode.config?.constant ?? {
                valueType: "string",
                value: "",
              };
              const isJson = constantConfig.valueType === "json";
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Value Type</Label>
                    <Select
                      value={constantConfig.valueType}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          constant: {
                            ...constantConfig,
                            valueType: value as ConstantConfig["valueType"],
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="string">String</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Value</Label>
                    {isJson ? (
                      <Textarea
                        className="mt-2 min-h-[120px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                        value={constantConfig.value}
                        onChange={(event) =>
                          updateSelectedNodeConfig({
                            constant: { ...constantConfig, value: event.target.value },
                          })
                        }
                      />
                    ) : (
                      <Input
                        className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                        value={constantConfig.value}
                        onChange={(event) =>
                          updateSelectedNodeConfig({
                            constant: { ...constantConfig, value: event.target.value },
                          })
                        }
                      />
                    )}
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "math" && (() => {
              const mathConfig = selectedNode.config?.math ?? {
                operation: "add",
                operand: 0,
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Operation</Label>
                    <Select
                      value={mathConfig.operation}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          math: {
                            ...mathConfig,
                            operation: value as MathConfig["operation"],
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select operation" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="add">Add</SelectItem>
                        <SelectItem value="subtract">Subtract</SelectItem>
                        <SelectItem value="multiply">Multiply</SelectItem>
                        <SelectItem value="divide">Divide</SelectItem>
                        <SelectItem value="round">Round</SelectItem>
                        <SelectItem value="ceil">Ceil</SelectItem>
                        <SelectItem value="floor">Floor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Operand</Label>
                    <Input
                      type="number"
                      step="0.1"
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={mathConfig.operand}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          math: {
                            ...mathConfig,
                            operand: toNumber(event.target.value, mathConfig.operand),
                          },
                        })
                      }
                    />
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "compare" && (() => {
              const compareConfig = selectedNode.config?.compare ?? {
                operator: "eq",
                compareTo: "",
                caseSensitive: false,
                message: "Comparison failed",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Operator</Label>
                    <Select
                      value={compareConfig.operator}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          compare: {
                            ...compareConfig,
                            operator: value as CompareConfig["operator"],
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select operator" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="eq">Equals</SelectItem>
                        <SelectItem value="neq">Not equals</SelectItem>
                        <SelectItem value="gt">Greater than</SelectItem>
                        <SelectItem value="gte">Greater or equal</SelectItem>
                        <SelectItem value="lt">Less than</SelectItem>
                        <SelectItem value="lte">Less or equal</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                        <SelectItem value="startsWith">Starts with</SelectItem>
                        <SelectItem value="endsWith">Ends with</SelectItem>
                        <SelectItem value="isEmpty">Is empty</SelectItem>
                        <SelectItem value="notEmpty">Not empty</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Compare To</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={compareConfig.compareTo}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          compare: {
                            ...compareConfig,
                            compareTo: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2 text-xs text-gray-300">
                    <span>Case Sensitive</span>
                    <Button
                      type="button"
                      className={`rounded border border-gray-700 px-3 py-1 text-xs ${
                        compareConfig.caseSensitive
                          ? "text-emerald-200 hover:bg-emerald-500/10"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                      onClick={() =>
                        updateSelectedNodeConfig({
                          compare: {
                            ...compareConfig,
                            caseSensitive: !compareConfig.caseSensitive,
                          },
                        })
                      }
                    >
                      {compareConfig.caseSensitive ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Error Message</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={compareConfig.message ?? "Comparison failed"}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          compare: {
                            ...compareConfig,
                            message: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "router" && (() => {
              const routerConfig = selectedNode.config?.router ?? {
                mode: "valid",
                matchMode: "truthy",
                compareTo: "",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Match Source</Label>
                    <Select
                      value={routerConfig.mode}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          router: {
                            ...routerConfig,
                            mode: value as RouterConfig["mode"],
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="valid">Validator valid</SelectItem>
                        <SelectItem value="value">Value input</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Match Mode</Label>
                    <Select
                      value={routerConfig.matchMode}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          router: {
                            ...routerConfig,
                            matchMode: value as RouterConfig["matchMode"],
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select match mode" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="truthy">Truthy</SelectItem>
                        <SelectItem value="falsy">Falsy</SelectItem>
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Compare To</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={routerConfig.compareTo}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          router: {
                            ...routerConfig,
                            compareTo: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "delay" && (() => {
              const delayConfig = selectedNode.config?.delay ?? { ms: 300 };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Delay (ms)</Label>
                    <Input
                      type="number"
                      step="50"
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={delayConfig.ms}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          delay: {
                            ms: toNumber(event.target.value, delayConfig.ms),
                          },
                        })
                      }
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Adds a pause before passing inputs downstream.
                  </p>
                </div>
              );
            })()}

            {selectedNode.type === "http" && (() => {
              const httpConfig = selectedNode.config?.http ?? {
                url: "",
                method: "GET",
                headers: "{\n  \"Content-Type\": \"application/json\"\n}",
                bodyTemplate: "",
                responseMode: "json",
                responsePath: "",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">URL</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={httpConfig.url}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          http: { ...httpConfig, url: event.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs text-gray-400">Method</Label>
                      <Select
                        value={httpConfig.method}
                        onValueChange={(value) =>
                          updateSelectedNodeConfig({
                            http: { ...httpConfig, method: value as HttpConfig["method"] },
                          })
                        }
                      >
                        <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-800 bg-gray-900">
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="PATCH">PATCH</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">Response Mode</Label>
                      <Select
                        value={httpConfig.responseMode}
                        onValueChange={(value) =>
                          updateSelectedNodeConfig({
                            http: {
                              ...httpConfig,
                              responseMode: value as HttpConfig["responseMode"],
                            },
                          })
                        }
                      >
                        <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-800 bg-gray-900">
                          <SelectItem value="json">JSON</SelectItem>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="status">Status only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Headers (JSON)</Label>
                    <Textarea
                      className="mt-2 min-h-[90px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={httpConfig.headers}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          http: { ...httpConfig, headers: event.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Body Template</Label>
                    <Textarea
                      className="mt-2 min-h-[110px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={httpConfig.bodyTemplate}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          http: { ...httpConfig, bodyTemplate: event.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Response Path</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={httpConfig.responsePath}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          http: { ...httpConfig, responsePath: event.target.value },
                        })
                      }
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      Optional JSON path to extract a field from the response.
                    </p>
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "database" && (() => {
              const defaultQuery: DbQueryConfig = {
                provider: "auto",
                collection: "products",
                mode: "preset",
                preset: "by_id",
                field: "_id",
                idType: "string",
                queryTemplate: "{\n  \"_id\": \"{{value}}\"\n}",
                limit: 20,
                sort: "",
                projection: "",
                single: false,
              };
              const persistedDatabase = (selectedNode.config?.database ?? {}) as DatabaseConfig;
              const defaultMappings: UpdaterMapping[] = [
                {
                  targetPath: "content_en",
                  sourcePort: selectedNode.inputs.includes("result") ? "result" : "content_en",
                },
              ];
              const databaseConfig: DatabaseConfig = {
                operation: persistedDatabase.operation ?? "query",
                entityType: persistedDatabase.entityType ?? "product",
                idField: persistedDatabase.idField ?? "entityId",
                mode: persistedDatabase.mode ?? "replace",
                mappings:
                  persistedDatabase.mappings && persistedDatabase.mappings.length > 0
                    ? persistedDatabase.mappings
                    : defaultMappings,
                query: {
                  ...defaultQuery,
                  ...(persistedDatabase.query ?? {}),
                },
                writeSource: persistedDatabase.writeSource ?? "bundle",
                writeSourcePath: persistedDatabase.writeSourcePath ?? "",
                dryRun: persistedDatabase.dryRun ?? false,
              };
              const operation = databaseConfig.operation ?? "query";
              const queryConfig = databaseConfig.query ?? defaultQuery;
              const incomingEdges = edges.filter((edge) => edge.to === selectedNode.id);
              const incomingPorts = Array.from(
                new Set(
                  incomingEdges
                    .map((edge) => edge.toPort)
                    .filter((port): port is string => Boolean(port))
                )
              );
              const availablePorts = incomingPorts.length
                ? incomingPorts
                : selectedNode.inputs;
              const bundleKeys = new Set<string>();
              incomingEdges.forEach((edge) => {
                if (edge.toPort !== "bundle") return;
                const fromNode = nodes.find((node) => node.id === edge.from);
                if (!fromNode) return;
                if (fromNode.type === "parser") {
                  const mappings =
                    fromNode.config?.parser?.mappings ??
                    createParserMappings(fromNode.outputs);
                  Object.keys(mappings).forEach((key) => {
                    const trimmed = key.trim();
                    if (trimmed) bundleKeys.add(trimmed);
                  });
                  return;
                }
                if (fromNode.type === "bundle") {
                  fromNode.inputs.forEach((port) => {
                    const trimmed = port.trim();
                    if (trimmed) bundleKeys.add(trimmed);
                  });
                }
                if (fromNode.type === "mapper") {
                  const mapperOutputs =
                    fromNode.config?.mapper?.outputs ?? fromNode.outputs;
                  mapperOutputs.forEach((output) => {
                    const trimmed = output.trim();
                    if (trimmed) bundleKeys.add(trimmed);
                  });
                }
              });
              const mappings =
                databaseConfig.mappings && databaseConfig.mappings.length > 0
                  ? databaseConfig.mappings
                  : defaultMappings;
              const sampleState =
                updaterSamples[selectedNode.id] ?? {
                  entityType: databaseConfig.entityType ?? "product",
                  entityId: "",
                  json: "",
                  depth: 2,
                  includeContainers: false,
                };
              const parsedSample = safeParseJson(sampleState.json);
              const sampleValue = parsedSample.value;
              const sampleEntries = sampleValue
                ? extractJsonPathEntries(sampleValue, sampleState.depth ?? 2)
                : [];
              const targetPaths = sampleEntries
                .filter((entry) => {
                  if (sampleState.includeContainers) return true;
                  return entry.type === "value" || entry.type === "array";
                })
                .map((entry) => entry.path);
              const targetPathOptions = targetPaths.map((path) => ({
                label: path,
                value: path,
              }));
              const findMatchingTargetPath = (port: string) => {
                const normalized = port.toLowerCase();
                const endsWith = targetPaths.find((path) =>
                  path.toLowerCase().endsWith(normalized)
                );
                if (endsWith) return endsWith;
                const includes = targetPaths.find((path) =>
                  path.toLowerCase().includes(normalized)
                );
                return includes ?? port;
              };
              const updateMappings = (nextMappings: UpdaterMapping[]) => {
                updateSelectedNodeConfig({
                  database: {
                    ...databaseConfig,
                    mappings: nextMappings,
                  },
                });
              };
              const updateMapping = (index: number, patch: Partial<UpdaterMapping>) => {
                const nextMappings = mappings.map((mapping, idx) =>
                  idx === index ? { ...mapping, ...patch } : mapping
                );
                updateMappings(nextMappings);
              };
              const addMapping = () => {
                updateMappings([
                  ...mappings,
                  {
                    targetPath: "",
                    sourcePort: availablePorts[0] ?? "result",
                    sourcePath: "",
                  },
                ]);
              };
              const removeMapping = (index: number) => {
                if (mappings.length <= 1) return;
                updateMappings(mappings.filter((_, idx) => idx !== index));
              };
              const mapInputsToTargets = () => {
                const nextMappings: UpdaterMapping[] = [];
                availablePorts.forEach((port) => {
                  if (port === databaseConfig.idField) return;
                  if (port === "bundle") {
                    if (bundleKeys.size === 0) return;
                    Array.from(bundleKeys).forEach((key) => {
                      nextMappings.push({
                        targetPath: key,
                        sourcePort: "bundle",
                        sourcePath: key,
                      });
                    });
                    return;
                  }
                  nextMappings.push({
                    targetPath: findMatchingTargetPath(port),
                    sourcePort: port,
                  });
                });
                if (nextMappings.length > 0) {
                  updateMappings(nextMappings);
                }
              };
              const handleOperationChange = (value: string) =>
                updateSelectedNodeConfig({
                  database: {
                    ...databaseConfig,
                    operation: value as DatabaseOperation,
                    query: databaseConfig.query ?? defaultQuery,
                    mappings,
                    writeSource: databaseConfig.writeSource ?? "bundle",
                    entityType: databaseConfig.entityType ?? "product",
                    idField: databaseConfig.idField ?? "entityId",
                    mode: databaseConfig.mode ?? "replace",
                  },
                });
              const writeSource = databaseConfig.writeSource ?? "bundle";
              const collectionOption = DB_COLLECTION_OPTIONS.some(
                (option) => option.value === queryConfig.collection
              )
                ? queryConfig.collection
                : "custom";
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Operation</Label>
                    <Select value={operation} onValueChange={handleOperationChange}>
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select operation" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="query">Query</SelectItem>
                        <SelectItem value="update">Update</SelectItem>
                        <SelectItem value="insert">Insert (POST)</SelectItem>
                        <SelectItem value="delete">Delete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2 text-xs text-gray-300">
                    <span>Dry run</span>
                    <Button
                      type="button"
                      className={`rounded border border-gray-700 px-3 py-1 text-xs ${
                        databaseConfig.dryRun
                          ? "text-emerald-200 hover:bg-emerald-500/10"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                      onClick={() =>
                        updateSelectedNodeConfig({
                          database: {
                            ...databaseConfig,
                            dryRun: !databaseConfig.dryRun,
                          },
                        })
                      }
                    >
                      {databaseConfig.dryRun ? "Enabled" : "Disabled"}
                    </Button>
                  </div>

                  {operation === "query" && (
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs text-gray-400">Provider</Label>
                          <Select
                            value={queryConfig.provider}
                            onValueChange={(value) =>
                              updateSelectedNodeConfig({
                                database: {
                                  ...databaseConfig,
                                  query: {
                                    ...queryConfig,
                                    provider: value as DbQueryConfig["provider"],
                                  },
                                },
                              })
                            }
                          >
                            <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                            <SelectContent className="border-gray-800 bg-gray-900">
                              <SelectItem value="auto">Auto</SelectItem>
                              <SelectItem value="mongodb">MongoDB</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-400">Collection</Label>
                          <Select
                            value={collectionOption}
                            onValueChange={(value) => {
                              updateSelectedNodeConfig({
                                database: {
                                  ...databaseConfig,
                                  query: {
                                    ...queryConfig,
                                    collection:
                                      value === "custom" ? queryConfig.collection : value,
                                  },
                                },
                              });
                            }}
                          >
                            <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                              <SelectValue placeholder="Select collection" />
                            </SelectTrigger>
                            <SelectContent className="border-gray-800 bg-gray-900">
                              {DB_COLLECTION_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {collectionOption === "custom" && (
                            <Input
                              className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                              value={queryConfig.collection}
                              onChange={(event) =>
                                updateSelectedNodeConfig({
                                  database: {
                                    ...databaseConfig,
                                    query: { ...queryConfig, collection: event.target.value },
                                  },
                                })
                              }
                              placeholder="collection_name"
                            />
                          )}
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs text-gray-400">Mode</Label>
                          <Select
                            value={queryConfig.mode}
                            onValueChange={(value) =>
                              updateSelectedNodeConfig({
                                database: {
                                  ...databaseConfig,
                                  query: {
                                    ...queryConfig,
                                    mode: value as DbQueryConfig["mode"],
                                  },
                                },
                              })
                            }
                          >
                            <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                              <SelectValue placeholder="Select mode" />
                            </SelectTrigger>
                            <SelectContent className="border-gray-800 bg-gray-900">
                              <SelectItem value="preset">Preset</SelectItem>
                              <SelectItem value="custom">Custom JSON</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-400">Limit</Label>
                          <Input
                            type="number"
                            step="1"
                            className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                            value={queryConfig.limit}
                            onChange={(event) =>
                              updateSelectedNodeConfig({
                                database: {
                                  ...databaseConfig,
                                  query: {
                                    ...queryConfig,
                                    limit: toNumber(event.target.value, queryConfig.limit),
                                  },
                                },
                              })
                            }
                          />
                        </div>
                      </div>
                      {queryConfig.mode === "preset" && (
                        <div className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <Label className="text-xs text-gray-400">Preset</Label>
                              <Select
                                value={queryConfig.preset}
                                onValueChange={(value) =>
                                  updateSelectedNodeConfig({
                                    database: {
                                      ...databaseConfig,
                                      query: {
                                        ...queryConfig,
                                        preset: value as DbQueryConfig["preset"],
                                      },
                                    },
                                  })
                                }
                              >
                                <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                                  <SelectValue placeholder="Select preset" />
                                </SelectTrigger>
                                <SelectContent className="border-gray-800 bg-gray-900">
                                  <SelectItem value="by_id">By ID (_id)</SelectItem>
                                  <SelectItem value="by_productId">By productId</SelectItem>
                                  <SelectItem value="by_entityId">By entityId</SelectItem>
                                  <SelectItem value="by_field">By custom field</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-400">ID Type</Label>
                              <Select
                                value={queryConfig.idType}
                                onValueChange={(value) =>
                                  updateSelectedNodeConfig({
                                    database: {
                                      ...databaseConfig,
                                      query: {
                                        ...queryConfig,
                                        idType: value as DbQueryConfig["idType"],
                                      },
                                    },
                                  })
                                }
                              >
                                <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                                  <SelectValue placeholder="Select id type" />
                                </SelectTrigger>
                                <SelectContent className="border-gray-800 bg-gray-900">
                                  <SelectItem value="string">String</SelectItem>
                                  <SelectItem value="objectId">ObjectId</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {queryConfig.preset === "by_field" && (
                            <div>
                              <Label className="text-xs text-gray-400">Field</Label>
                              <Input
                                className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                                value={queryConfig.field}
                                onChange={(event) =>
                                  updateSelectedNodeConfig({
                                    database: {
                                      ...databaseConfig,
                                      query: { ...queryConfig, field: event.target.value },
                                    },
                                  })
                                }
                                placeholder="fieldName"
                              />
                            </div>
                          )}
                        </div>
                      )}
                      {queryConfig.mode === "custom" && (
                        <div>
                          <Label className="text-xs text-gray-400">Query Template</Label>
                          <Textarea
                            className="mt-2 min-h-[140px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                            value={queryConfig.queryTemplate}
                            onChange={(event) =>
                              updateSelectedNodeConfig({
                                database: {
                                  ...databaseConfig,
                                  query: {
                                    ...queryConfig,
                                    queryTemplate: event.target.value,
                                  },
                                },
                              })
                            }
                          />
                          <p className="mt-2 text-[11px] text-gray-500">
                            Use placeholders like <span className="text-gray-300">{`{{value}}`}</span>{" "}
                            or <span className="text-gray-300">{`{{entityId}}`}</span>.
                          </p>
                        </div>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs text-gray-400">Sort (JSON)</Label>
                          <Textarea
                            className="mt-2 min-h-[80px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                            value={queryConfig.sort}
                            onChange={(event) =>
                              updateSelectedNodeConfig({
                                database: {
                                  ...databaseConfig,
                                  query: { ...queryConfig, sort: event.target.value },
                                },
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-400">Projection (JSON)</Label>
                          <Textarea
                            className="mt-2 min-h-[80px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                            value={queryConfig.projection}
                            onChange={(event) =>
                              updateSelectedNodeConfig({
                                database: {
                                  ...databaseConfig,
                                  query: { ...queryConfig, projection: event.target.value },
                                },
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2 text-xs text-gray-300">
                        <span>Single result</span>
                        <Button
                          type="button"
                          className={`rounded border border-gray-700 px-3 py-1 text-xs ${
                            queryConfig.single
                              ? "text-emerald-200 hover:bg-emerald-500/10"
                              : "text-gray-300 hover:bg-gray-800"
                          }`}
                          onClick={() =>
                            updateSelectedNodeConfig({
                              database: {
                                ...databaseConfig,
                                query: { ...queryConfig, single: !queryConfig.single },
                              },
                            })
                          }
                        >
                          {queryConfig.single ? "Enabled" : "Disabled"}
                        </Button>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        Collections are allowlisted on the server for safety.
                      </p>
                    </div>
                  )}

                  {operation === "update" && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs text-gray-400">Entity Type</Label>
                        <Select
                          value={databaseConfig.entityType ?? "product"}
                          onValueChange={(value) =>
                            updateSelectedNodeConfig({
                              database: { ...databaseConfig, entityType: value },
                            })
                          }
                        >
                          <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                            <SelectValue placeholder="Entity type" />
                          </SelectTrigger>
                          <SelectContent className="border-gray-800 bg-gray-900">
                            <SelectItem value="product">Product</SelectItem>
                            <SelectItem value="note">Note</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400">ID Field</Label>
                        <Select
                          value={databaseConfig.idField ?? "entityId"}
                          onValueChange={(value) =>
                            updateSelectedNodeConfig({
                              database: { ...databaseConfig, idField: value },
                            })
                          }
                        >
                          <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                            <SelectValue placeholder="Select ID input" />
                          </SelectTrigger>
                          <SelectContent className="border-gray-800 bg-gray-900">
                            {availablePorts.map((port) => (
                              <SelectItem key={port} value={port}>
                                {port}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400">Write Mode</Label>
                        <Select
                          value={databaseConfig.mode}
                          onValueChange={(value) =>
                            updateSelectedNodeConfig({
                              database: {
                                ...databaseConfig,
                                mode: value as "replace" | "append",
                              },
                            })
                          }
                        >
                          <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                            <SelectValue placeholder="Select mode" />
                          </SelectTrigger>
                          <SelectContent className="border-gray-800 bg-gray-900">
                            <SelectItem value="replace">Replace</SelectItem>
                            <SelectItem value="append">Append</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs text-gray-400">Sample JSON</Label>
                        <div className="mt-2 grid gap-2 sm:grid-cols-[160px_1fr_auto] sm:items-center">
                          <Select
                            value={sampleState.entityType}
                            onValueChange={(value) =>
                              setUpdaterSamples((prev) => ({
                                ...prev,
                                [selectedNode.id]: {
                                  ...sampleState,
                                  entityType: value,
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="border-gray-800 bg-gray-950/70 text-sm text-white">
                              <SelectValue placeholder="Entity type" />
                            </SelectTrigger>
                            <SelectContent className="border-gray-800 bg-gray-900">
                              <SelectItem value="product">Product</SelectItem>
                              <SelectItem value="note">Note</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            className="w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                            value={sampleState.entityId}
                            onChange={(event) =>
                              setUpdaterSamples((prev) => ({
                                ...prev,
                                [selectedNode.id]: {
                                  ...sampleState,
                                  entityId: event.target.value,
                                },
                              }))
                            }
                            placeholder="Entity ID"
                          />
                          <Button
                            type="button"
                            className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                            disabled={updaterSampleLoading}
                            onClick={() =>
                              void handleFetchUpdaterSample(
                                selectedNode.id,
                                sampleState.entityType,
                                sampleState.entityId
                              )
                            }
                          >
                            {updaterSampleLoading ? "Loading..." : "Fetch sample"}
                          </Button>
                        </div>
                        <Textarea
                          className="mt-2 min-h-[120px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                          value={sampleState.json}
                          onChange={(event) =>
                            setUpdaterSamples((prev) => ({
                              ...prev,
                              [selectedNode.id]: {
                                ...sampleState,
                                json: event.target.value,
                              },
                            }))
                          }
                          placeholder='{ "id": "123", "title": "Sample" }'
                        />
                        {parsedSample.error ? (
                          <p className="mt-2 text-[11px] text-rose-300">
                            {parsedSample.error}
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Select
                            value={String(sampleState.depth)}
                            onValueChange={(value) =>
                              setUpdaterSamples((prev) => ({
                                ...prev,
                                [selectedNode.id]: {
                                  ...sampleState,
                                  depth: Number(value),
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="w-[150px] border-gray-800 bg-gray-950/70 text-sm text-white">
                              <SelectValue placeholder="Depth" />
                            </SelectTrigger>
                            <SelectContent className="border-gray-800 bg-gray-900">
                              {[1, 2, 3, 4].map((depth) => (
                                <SelectItem key={depth} value={String(depth)}>
                                  Depth {depth}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            className={`rounded-md border border-gray-700 px-3 text-[10px] ${
                              sampleState.includeContainers
                                ? "text-emerald-200 hover:bg-emerald-500/10"
                                : "text-gray-300 hover:bg-gray-900/80"
                            }`}
                            onClick={() =>
                              setUpdaterSamples((prev) => ({
                                ...prev,
                                [selectedNode.id]: {
                                  ...sampleState,
                                  includeContainers: !sampleState.includeContainers,
                                },
                              }))
                            }
                          >
                            {sampleState.includeContainers ? "Containers: On" : "Containers: Off"}
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                          onClick={mapInputsToTargets}
                        >
                          Auto-map inputs
                        </Button>
                        {bundleKeys.size > 0 && (
                          <span className="text-[11px] text-gray-500">
                            Bundle keys: {Array.from(bundleKeys).join(", ")}
                          </span>
                        )}
                      </div>

                      <div className="space-y-3">
                        {mappings.map((mapping, index) => {
                          const targetValue = mapping.targetPath ?? "";
                          return (
                            <div
                              key={`${mapping.targetPath}-${index}`}
                              className="grid gap-2 sm:grid-cols-[1fr_140px_auto] sm:items-start"
                            >
                              <div className="space-y-2">
                                <Input
                                  className="w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                                  value={targetValue}
                                  onChange={(event) =>
                                    updateMapping(index, {
                                      targetPath: event.target.value,
                                    })
                                  }
                                  placeholder="Target field path"
                                />
                                <Select
                                  onValueChange={(value) =>
                                    updateMapping(index, { targetPath: value })
                                  }
                                >
                                  <SelectTrigger className="border-gray-800 bg-gray-950/70 text-[10px] text-gray-200">
                                    <SelectValue placeholder="Pick target field" />
                                  </SelectTrigger>
                                  <SelectContent className="border-gray-800 bg-gray-900">
                                    {targetPathOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Select
                                  value={mapping.sourcePort}
                                  onValueChange={(value) =>
                                    updateMapping(index, { sourcePort: value })
                                  }
                                >
                                  <SelectTrigger className="border-gray-800 bg-gray-950/70 text-[10px] text-gray-200">
                                    <SelectValue placeholder="Input" />
                                  </SelectTrigger>
                                  <SelectContent className="border-gray-800 bg-gray-900">
                                    {availablePorts.map((port) => (
                                      <SelectItem key={port} value={port}>
                                        {port}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {mapping.sourcePort === "bundle" && (
                                  <>
                                    <Input
                                      className="w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                                      value={mapping.sourcePath ?? ""}
                                      onChange={(event) =>
                                        updateMapping(index, {
                                          sourcePath: event.target.value,
                                        })
                                      }
                                      placeholder="Bundle path"
                                    />
                                    <Select
                                      onValueChange={(value) =>
                                        updateMapping(index, { sourcePath: value })
                                      }
                                    >
                                      <SelectTrigger className="border-gray-800 bg-gray-950/70 text-[10px] text-gray-200">
                                        <SelectValue placeholder="Pick bundle key" />
                                      </SelectTrigger>
                                      <SelectContent className="border-gray-800 bg-gray-900">
                                        {Array.from(bundleKeys).map((key) => (
                                          <SelectItem key={key} value={key}>
                                            {key}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </>
                                )}
                              </div>
                              <Button
                                type="button"
                                className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                                disabled={mappings.length <= 1}
                                onClick={() => removeMapping(index)}
                              >
                                Remove
                              </Button>
                            </div>
                          );
                        })}
                      </div>

                      <Button
                        type="button"
                        className="w-full rounded-md border border-gray-700 text-xs text-white hover:bg-gray-900/80"
                        onClick={addMapping}
                      >
                        Add mapping
                      </Button>
                    </div>
                  )}

                  {operation === "insert" && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs text-gray-400">Entity Type</Label>
                        <Select
                          value={databaseConfig.entityType ?? "product"}
                          onValueChange={(value) =>
                            updateSelectedNodeConfig({
                              database: { ...databaseConfig, entityType: value },
                            })
                          }
                        >
                          <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                            <SelectValue placeholder="Entity type" />
                          </SelectTrigger>
                          <SelectContent className="border-gray-800 bg-gray-900">
                            <SelectItem value="product">Product</SelectItem>
                            <SelectItem value="note">Note</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400">Payload Source</Label>
                        <Select
                          value={writeSource}
                          onValueChange={(value) =>
                            updateSelectedNodeConfig({
                              database: { ...databaseConfig, writeSource: value },
                            })
                          }
                        >
                          <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                            <SelectValue placeholder="Select payload input" />
                          </SelectTrigger>
                          <SelectContent className="border-gray-800 bg-gray-900">
                            {availablePorts.map((port) => (
                              <SelectItem key={port} value={port}>
                                {port}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="mt-2 text-[11px] text-gray-500">
                          The selected input should contain a JSON object. Bundle is recommended.
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400">Payload Path (optional)</Label>
                        <Input
                          className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                          value={databaseConfig.writeSourcePath ?? ""}
                          onChange={(event) =>
                            updateSelectedNodeConfig({
                              database: {
                                ...databaseConfig,
                                writeSourcePath: event.target.value,
                              },
                            })
                          }
                          placeholder="payload.subset"
                        />
                        {writeSource === "bundle" && bundleKeys.size > 0 && (
                          <Select
                            value={databaseConfig.writeSourcePath || undefined}
                            onValueChange={(value) =>
                              updateSelectedNodeConfig({
                                database: {
                                  ...databaseConfig,
                                  writeSourcePath: value,
                                },
                              })
                            }
                          >
                            <SelectTrigger className="mt-2 border-gray-800 bg-gray-950/70 text-[10px] text-gray-200">
                              <SelectValue placeholder="Pick bundle key" />
                            </SelectTrigger>
                            <SelectContent className="border-gray-800 bg-gray-900">
                              {Array.from(bundleKeys).map((key) => (
                                <SelectItem key={key} value={key}>
                                  {key}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <p className="mt-2 text-[11px] text-gray-500">
                          Optional path inside the payload to use as the request body.
                        </p>
                      </div>
                    </div>
                  )}

                  {operation === "delete" && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs text-gray-400">Entity Type</Label>
                        <Select
                          value={databaseConfig.entityType ?? "product"}
                          onValueChange={(value) =>
                            updateSelectedNodeConfig({
                              database: { ...databaseConfig, entityType: value },
                            })
                          }
                        >
                          <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                            <SelectValue placeholder="Entity type" />
                          </SelectTrigger>
                          <SelectContent className="border-gray-800 bg-gray-900">
                            <SelectItem value="product">Product</SelectItem>
                            <SelectItem value="note">Note</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400">ID Field</Label>
                        <Select
                          value={databaseConfig.idField ?? "entityId"}
                          onValueChange={(value) =>
                            updateSelectedNodeConfig({
                              database: { ...databaseConfig, idField: value },
                            })
                          }
                        >
                          <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                            <SelectValue placeholder="Select ID input" />
                          </SelectTrigger>
                          <SelectContent className="border-gray-800 bg-gray-900">
                            {availablePorts.map((port) => (
                              <SelectItem key={port} value={port}>
                                {port}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="mt-2 text-[11px] text-gray-500">
                          The selected input will be used as the entity ID to delete.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            {selectedNode.type === "gate" && (() => {
              const gateConfig = selectedNode.config?.gate ?? {
                mode: "block",
                failMessage: "Gate blocked",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Mode</Label>
                    <Select
                      value={gateConfig.mode}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          gate: {
                            ...gateConfig,
                            mode: value as GateConfig["mode"],
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="block">Block on invalid</SelectItem>
                        <SelectItem value="pass">Pass-through</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Fail Message</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={gateConfig.failMessage ?? ""}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          gate: { ...gateConfig, failMessage: event.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "bundle" && (() => {
              const bundleConfig = selectedNode.config?.bundle ?? {
                includePorts: [],
              };
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-400">
                      Included Ports (one per line)
                    </Label>
                    <Button
                      type="button"
                      className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                      onClick={() =>
                        updateSelectedNodeConfig({
                          bundle: { includePorts: selectedNode.inputs },
                        })
                      }
                    >
                      Use all inputs
                    </Button>
                  </div>
                  <Textarea
                    className="min-h-[110px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                    value={(bundleConfig.includePorts ?? []).join("\n")}
                    onChange={(event) =>
                      updateSelectedNodeConfig({
                        bundle: { includePorts: parsePathList(event.target.value) },
                      })
                    }
                  />
                  <p className="text-[11px] text-gray-500">
                    Bundle outputs a single object with the selected ports as keys.
                  </p>
                </div>
              );
            })()}

            {selectedNode.type === "template" && (() => {
              const templateConfig = selectedNode.config?.template ?? {
                template: "",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Template</Label>
                    <Textarea
                      className="mt-2 min-h-[140px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={templateConfig.template}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          template: { template: event.target.value },
                        })
                      }
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      Use placeholders like{" "}
                      <span className="text-gray-300">{`{{context.entity.title}}`}</span>{" "}
                      or{" "}
                      <span className="text-gray-300">{`{{result}}`}</span>.
                    </p>
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "prompt" && (() => {
              const promptConfig = selectedNode.config?.prompt ?? { template: "" };
              const incomingEdges = edges.filter((edge) => edge.to === selectedNode.id);
              const inputPorts = incomingEdges
                .map((edge) => edge.toPort)
                .filter((port): port is string => Boolean(port));
              const bundleKeys = new Set<string>();
              incomingEdges.forEach((edge) => {
                if (edge.toPort !== "bundle") return;
                const fromNode = nodes.find((node) => node.id === edge.from);
                if (!fromNode) return;
                if (fromNode.type === "parser") {
                  const mappings =
                    fromNode.config?.parser?.mappings ??
                    createParserMappings(fromNode.outputs);
                  Object.keys(mappings).forEach((key) => {
                    const trimmed = key.trim();
                    if (trimmed) bundleKeys.add(trimmed);
                  });
                  return;
                }
                if (fromNode.type === "bundle") {
                  fromNode.inputs.forEach((port) => {
                    const trimmed = port.trim();
                    if (trimmed) bundleKeys.add(trimmed);
                  });
                }
                if (fromNode.type === "mapper") {
                  const mapperOutputs =
                    fromNode.config?.mapper?.outputs ?? fromNode.outputs;
                  mapperOutputs.forEach((output) => {
                    const trimmed = output.trim();
                    if (trimmed) bundleKeys.add(trimmed);
                  });
                }
              });
              const directPlaceholders = inputPorts.filter((port) => port !== "bundle");
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Prompt Template</Label>
                    <Textarea
                      className="mt-2 min-h-[140px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={promptConfig.template}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          prompt: { template: event.target.value },
                        })
                      }
                      placeholder="Describe the product: {{title}}"
                    />
                  </div>
                  <div className="rounded-md border border-gray-800 bg-gray-900/50 p-3 text-[11px] text-gray-400">
                    <div className="text-gray-300">Available placeholders</div>
                    {bundleKeys.size > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Array.from(bundleKeys).map((key) => (
                          <span
                            key={key}
                            className="rounded-full border border-gray-700 px-2 py-0.5 text-[10px] text-gray-200"
                          >
                            {`{{${key}}}`}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 text-[11px] text-gray-500">
                        Connect a Parser or Bundle node to the bundle input to surface
                        placeholder hints.
                      </div>
                    )}
                    {directPlaceholders.length > 0 && (
                      <div className="mt-3 text-[11px] text-gray-500">
                        Direct inputs:{" "}
                        {directPlaceholders.map((port) => `{{${port}}}`).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "model" && (() => {
              const modelConfig =
                selectedNode.config?.model ?? {
                  modelId: DEFAULT_MODELS[0] ?? "gpt-4o",
                  temperature: 0.7,
                  maxTokens: 800,
                  vision: selectedNode.inputs.includes("images"),
                };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Model</Label>
                    <Select
                      value={modelConfig.modelId}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          model: { ...modelConfig, modelId: value },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        {modelOptions.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs text-gray-400">Temperature</Label>
                      <Input
                        type="number"
                        step="0.1"
                        className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                        value={modelConfig.temperature}
                        onChange={(event) =>
                          updateSelectedNodeConfig({
                            model: {
                              ...modelConfig,
                              temperature: toNumber(
                                event.target.value,
                                modelConfig.temperature
                              ),
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">Max Tokens</Label>
                      <Input
                        type="number"
                        step="50"
                        className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                        value={modelConfig.maxTokens}
                        onChange={(event) =>
                          updateSelectedNodeConfig({
                            model: {
                              ...modelConfig,
                              maxTokens: toNumber(
                                event.target.value,
                                modelConfig.maxTokens
                              ),
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2 text-xs text-gray-300">
                    <span>Accepts Images</span>
                    <Button
                      type="button"
                      className={`rounded border border-gray-700 px-3 py-1 text-xs ${
                        modelConfig.vision
                          ? "text-emerald-200 hover:bg-emerald-500/10"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                      onClick={() =>
                        updateSelectedNodeConfig({
                          model: { ...modelConfig, vision: !modelConfig.vision },
                        })
                      }
                    >
                      {modelConfig.vision ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "context" && (() => {
              const contextConfig = selectedNode.config?.context ?? {
                role: DEFAULT_CONTEXT_ROLE,
                entityType: "product",
                entityIdSource: "simulation",
                entityId: "",
                scopeMode: "full",
                includePaths: [],
                excludePaths: [],
              };
              const presetSet = getContextPresetSet(contextConfig.entityType);
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Context Role</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={contextConfig.role}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          context: { ...contextConfig, role: event.target.value },
                        })
                      }
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      Connect this role output into a Trigger input to define what the
                      trigger should execute.
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Context Presets</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(["light", "medium", "full"] as const).map((preset) => (
                        <Button
                          key={preset}
                          type="button"
                          className="rounded-md border border-gray-700 px-3 py-1 text-[10px] text-gray-200 hover:bg-gray-900/80"
                          onClick={() =>
                            updateSelectedNodeConfig({
                              context: applyContextPreset(contextConfig, preset),
                            })
                          }
                        >
                          {preset.toUpperCase()}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        className="rounded-md border border-gray-700 px-3 py-1 text-[10px] text-gray-200 hover:bg-gray-900/80"
                        onClick={() =>
                          updateSelectedNodeConfig({
                            context: {
                              ...contextConfig,
                              scopeMode: "full",
                              includePaths: [],
                              excludePaths: [],
                            },
                          })
                        }
                      >
                        RESET
                      </Button>
                    </div>
                    <p className="mt-2 text-[11px] text-gray-500">
                      Presets adjust scope to include curated fields for the selected entity (or a generic set when auto).
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs text-gray-400">Entity Type</Label>
                    <Select
                        value={contextConfig.entityType ?? "auto"}
                        onValueChange={(value) =>
                          updateSelectedNodeConfig({
                            context: { ...contextConfig, entityType: value },
                          })
                        }
                      >
                        <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                          <SelectValue placeholder="Select entity" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-800 bg-gray-900">
                          <SelectItem value="auto">Auto (use trigger)</SelectItem>
                          <SelectItem value="product">Product</SelectItem>
                          <SelectItem value="note">Note</SelectItem>
                          <SelectItem value="chat">Chat</SelectItem>
                          <SelectItem value="log">Log Entry</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">Entity ID Source</Label>
                      <Select
                        value={contextConfig.entityIdSource ?? "simulation"}
                        onValueChange={(value) =>
                          updateSelectedNodeConfig({
                            context: {
                              ...contextConfig,
                              entityIdSource: value as "simulation" | "manual",
                            },
                          })
                        }
                      >
                        <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-800 bg-gray-900">
                          <SelectItem value="simulation">Simulation node</SelectItem>
                          <SelectItem value="manual">Manual ID</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Target Fields</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {presetSet.suggested.map((field) => {
                        const active = contextConfig.includePaths?.includes(field);
                        return (
                          <button
                            key={field}
                            type="button"
                            onClick={() =>
                              updateSelectedNodeConfig({
                                context: toggleContextTarget(contextConfig, field),
                              })
                            }
                            className={`rounded-full border px-2 py-1 text-[10px] transition ${
                              active
                                ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                                : "border-gray-700 text-gray-300 hover:bg-gray-900/70"
                            }`}
                          >
                            {field}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() =>
                          updateSelectedNodeConfig({
                            context: {
                              ...contextConfig,
                              scopeMode: "include",
                              includePaths: [],
                              excludePaths: [],
                            },
                          })
                        }
                        className="rounded-full border border-gray-700 px-2 py-1 text-[10px] text-gray-300 hover:bg-gray-900/70"
                      >
                        Clear
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-gray-500">
                      Click to toggle fields. This switches scope to include mode.
                    </p>
                  </div>
                  {contextConfig.entityIdSource === "manual" && (
                    <div>
                      <Label className="text-xs text-gray-400">Entity ID</Label>
                      <Input
                        className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                        value={contextConfig.entityId ?? ""}
                        onChange={(event) =>
                          updateSelectedNodeConfig({
                            context: { ...contextConfig, entityId: event.target.value },
                          })
                        }
                      />
                    </div>
                  )}
                    <div>
                      <Label className="text-xs text-gray-400">Data Scope</Label>
                      <Select
                        value={contextConfig.scopeMode ?? "full"}
                        onValueChange={(value) =>
                          updateSelectedNodeConfig({
                            context: {
                              ...contextConfig,
                              scopeMode: value as "full" | "include" | "exclude",
                            },
                          })
                        }
                      >

                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select scope" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="full">Full entity payload</SelectItem>
                        <SelectItem value="include">Include only listed paths</SelectItem>
                        <SelectItem value="exclude">Exclude listed paths</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="mt-2 text-[11px] text-gray-500">
                      Use dot paths (e.g. <span className="text-gray-300">priceGroups.default</span>).
                    </p>
                  </div>
                  {(contextConfig.scopeMode === "include" ||
                    contextConfig.scopeMode === "exclude") && (
                    <div>
                      <Label className="text-xs text-gray-400">
                        {contextConfig.scopeMode === "include"
                          ? "Include paths (one per line)"
                          : "Exclude paths (one per line)"}
                      </Label>
                      <Textarea
                        className="mt-2 min-h-[120px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                        value={
                          contextConfig.scopeMode === "include"
                            ? (contextConfig.includePaths ?? []).join("\n")
                            : (contextConfig.excludePaths ?? []).join("\n")
                        }
                        onChange={(event) => {
                          const list = parsePathList(event.target.value);
                          updateSelectedNodeConfig({
                            context: {
                              ...contextConfig,
                              includePaths:
                                contextConfig.scopeMode === "include"
                                  ? list
                                  : contextConfig.includePaths ?? [],
                              excludePaths:
                                contextConfig.scopeMode === "exclude"
                                  ? list
                                  : contextConfig.excludePaths ?? [],
                            },
                          });
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })()}

            {selectedNode.type === "trigger" && (() => {
              const triggerConfig = selectedNode.config?.trigger ?? {
                event: TRIGGER_EVENTS[0]?.id ?? "path_generate_description",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Trigger Action</Label>
                    <Select
                      value={triggerConfig.event}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          trigger: { event: value },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        {TRIGGER_EVENTS.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "simulation" && (() => {
              const simulationConfig = selectedNode.config?.simulation ?? {
                productId: "",
                entityType: "product",
                entityId: "",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Entity Type</Label>
                    <Select
                      value={simulationConfig.entityType ?? "product"}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          simulation: {
                            ...simulationConfig,
                            entityType: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select entity" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="note">Note</SelectItem>
                        <SelectItem value="chat">Chat</SelectItem>
                        <SelectItem value="log">Log Entry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">
                      {simulationConfig.entityType === "product"
                        ? "Product ID"
                        : "Entity ID"}
                    </Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={simulationConfig.entityId ?? simulationConfig.productId}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          simulation: {
                            ...simulationConfig,
                            entityId: event.target.value,
                            productId: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Used to simulate {simulationConfig.entityType ?? "product"} context.
                  </p>
                  <Button
                    className="w-full rounded-md border border-cyan-500/40 text-sm text-cyan-200 hover:bg-cyan-500/10"
                    type="button"
                    onClick={() => handleRunSimulation(selectedNode)}
                  >
                    Run Simulation
                  </Button>
                </div>
              );
            })()}

            {selectedNode.type === "viewer" && (() => {
              const viewerConfig = selectedNode.config?.viewer ?? {
                outputs: createViewerOutputs(selectedNode.inputs),
              };
              const connections = edges.filter((edge) => edge.to === selectedNode.id);
              const runtimeInputs = runtimeState.inputs[selectedNode.id] ?? {};
              const outputValues = {
                ...createViewerOutputs(selectedNode.inputs),
                ...viewerConfig.outputs,
              };
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400">
                      Store and review outputs that flow into this node.
                    </div>
                    <Button
                      type="button"
                      className="rounded-md border border-gray-700 text-xs text-gray-200 hover:bg-gray-900/80"
                      onClick={() =>
                        updateSelectedNodeConfig({
                          viewer: { outputs: createViewerOutputs(selectedNode.inputs) },
                        })
                      }
                    >
                      Clear
                    </Button>
                  </div>
                  {selectedNode.inputs.map((input) => {
                    const connectedSources = connections
                      .filter((edge) => !edge.toPort || edge.toPort === input)
                      .map((edge) => {
                        const fromNode = nodes.find((node) => node.id === edge.from);
                        if (!fromNode) return null;
                        const portLabel = edge.fromPort ? `:${edge.fromPort}` : "";
                        return `${fromNode.title}${portLabel}`;
                      })
                      .filter(Boolean)
                      .join(", ");
                    const runtimeValue = runtimeInputs[input];
                    return (
                      <div key={input} className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <Label className="text-xs text-gray-400">{input}</Label>
                          {connectedSources && (
                            <span className="text-[10px] text-gray-500">
                              Connected: {connectedSources}
                            </span>
                          )}
                        </div>
                        {runtimeValue !== undefined && (
                          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-100">
                            <div className="mb-1 text-[9px] uppercase text-emerald-300">
                              Runtime
                            </div>
                            <pre className="whitespace-pre-wrap">
                              {formatRuntimeValue(runtimeValue)}
                            </pre>
                          </div>
                        )}
                        <Textarea
                          className="min-h-[90px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                          value={outputValues[input] ?? ""}
                          onChange={(event) =>
                            updateSelectedNodeConfig({
                              viewer: {
                                outputs: {
                                  ...outputValues,
                                  [input]: event.target.value,
                                },
                              },
                            })
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {selectedNode.type === "ai_description" && (() => {
              const descriptionConfig = selectedNode.config?.description ?? {
                visionOutputEnabled: true,
                generationOutputEnabled: true,
              };
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2 text-xs text-gray-300">
                    <span>Include vision analysis</span>
                    <Button
                      type="button"
                      className={`rounded border border-gray-700 px-3 py-1 text-xs ${
                        descriptionConfig.visionOutputEnabled
                          ? "text-emerald-200 hover:bg-emerald-500/10"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                      onClick={() =>
                        updateSelectedNodeConfig({
                          description: {
                            ...descriptionConfig,
                            visionOutputEnabled: !descriptionConfig.visionOutputEnabled,
                          },
                        })
                      }
                    >
                      {descriptionConfig.visionOutputEnabled ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2 text-xs text-gray-300">
                    <span>Include generation output</span>
                    <Button
                      type="button"
                      className={`rounded border border-gray-700 px-3 py-1 text-xs ${
                        descriptionConfig.generationOutputEnabled
                          ? "text-emerald-200 hover:bg-emerald-500/10"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                      onClick={() =>
                        updateSelectedNodeConfig({
                          description: {
                            ...descriptionConfig,
                            generationOutputEnabled:
                              !descriptionConfig.generationOutputEnabled,
                          },
                        })
                      }
                    >
                      {descriptionConfig.generationOutputEnabled ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                </div>
              );
            })()}

            {selectedNode.type !== "parser" &&
              selectedNode.type !== "model" &&
              selectedNode.type !== "database" &&
              selectedNode.type !== "trigger" &&
              selectedNode.type !== "simulation" &&
              selectedNode.type !== "context" &&
              selectedNode.type !== "mapper" &&
              selectedNode.type !== "mutator" &&
              selectedNode.type !== "validator" &&
              selectedNode.type !== "constant" &&
              selectedNode.type !== "math" &&
              selectedNode.type !== "template" &&
              selectedNode.type !== "bundle" &&
              selectedNode.type !== "gate" &&
              selectedNode.type !== "compare" &&
              selectedNode.type !== "router" &&
              selectedNode.type !== "delay" &&
              selectedNode.type !== "http" &&
              selectedNode.type !== "viewer" &&
              selectedNode.type !== "ai_description" &&
              selectedNode.type !== "description_updater" && (
                <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4 text-sm text-gray-400">
                  No configuration is available for this node yet.
                </div>
              )}
          </DialogContent>
        </Dialog>
      ) : null}

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
