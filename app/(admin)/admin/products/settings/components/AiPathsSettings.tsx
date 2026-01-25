"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DbQueryConfig,
  DbQueryPreset,
  DbNodePreset,
  Edge,
  NodeConfig,
  NodeDefinition,
  ParserSampleState,
  PathConfig,
  PathMeta,
  RuntimePortValues,
  RuntimeState,
  UpdaterSampleState,
} from "./ai-paths/types";
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
  getValueAtMappingPath,
  parseJsonSafe,
  renderTemplate,
  getDefaultConfigForType,
  getPortOffsetY,
  initialEdges,
  initialNodes,
  normalizeNodes,
  palette,
  parsePathList,
  safeParseJson,
  safeStringify,
  sanitizeEdges,
  triggers,
  validateConnection,
} from "./ai-paths/helpers";

type AiPathsSettingsProps = {
  activeTab: "canvas" | "paths" | "docs";
  renderActions?: (actions: React.ReactNode) => React.ReactNode;
  onTabChange?: (tab: "canvas" | "paths" | "docs") => void;
};

const DEFAULT_DB_QUERY: DbQueryConfig = {
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
const AUTO_SAVE_DEBOUNCE_MS = 1500;

export function AiPathsSettings({ activeTab, renderActions, onTabChange }: AiPathsSettingsProps) {
  const { toast } = useToast();
  const normalizeTriggerLabel = (value?: string | null) =>
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
  const [parserSamples, setParserSamples] = useState<Record<string, ParserSampleState>>(
    {}
  );
  const [parserSampleLoading, setParserSampleLoading] = useState(false);
  const [updaterSamples, setUpdaterSamples] = useState<Record<string, UpdaterSampleState>>(
    {}
  );
  const [updaterSampleLoading, setUpdaterSampleLoading] = useState(false);
  const [sessionUser, setSessionUser] = useState<{
    id?: string;
    name?: string | null;
    email?: string | null;
  } | null>(null);
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
  const [dbQueryPresets, setDbQueryPresets] = useState<DbQueryPreset[]>([]);
  const [dbNodePresets, setDbNodePresets] = useState<DbNodePreset[]>([]);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetDraft, setPresetDraft] = useState({
    name: "",
    description: "",
    bundlePorts: "context\nmeta\ntrigger\nentityJson\nentityId\nentityType\nresult",
    template: "Write a summary for {{context.entity.title}}",
  });
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);
  const autoSaveInFlightRef = useRef(false);
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

  // RAF throttling refs for drag performance
  const pendingDragRef = useRef<{ nodeId: string; x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const persistLastError = useCallback(
    async (
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
    },
    []
  );

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

  const saveDbQueryPresets = async (nextPresets: DbQueryPreset[]) => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: DB_QUERY_PRESETS_KEY,
          value: JSON.stringify(nextPresets),
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to save query presets.");
      }
    } catch (error) {
      reportAiPathsError(error, { action: "saveDbQueryPresets" }, "Failed to save query presets:");
      toast("Failed to save query presets.", { variant: "error" });
    }
  };

  const saveDbNodePresets = async (nextPresets: DbNodePreset[]) => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: DB_NODE_PRESETS_KEY,
          value: JSON.stringify(nextPresets),
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to save database presets.");
      }
    } catch (error) {
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

  const reportAiPathsError = useCallback(
    (
      error: unknown,
      context: Record<string, unknown>,
      fallbackMessage?: string
    ) => {
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

  useEffect(() => {
    if (loadInFlightRef.current) return;
    if (loadAttemptRef.current === loadNonce) return;
    loadAttemptRef.current = loadNonce;
    loadInFlightRef.current = true;
    setLoading(true);
    const loadConfig = async () => {
      try {
        const settingsRes = await fetch("/api/settings");
        if (!settingsRes.ok) {
          throw new Error("Failed to load AI Paths settings.");
        }
        const data = (await settingsRes.json() as unknown) as Array<{ key: string; value: string }>;
        let preferredPathId: string | null = null;
        let preferredGroups: string[] | null = null;
        let preferredPathIndex: PathMeta[] | null = null;
        let preferredPathConfigs: Record<string, PathConfig> | null = null;
        try {
          const prefsRes = await fetch("/api/user/preferences");
          if (prefsRes.ok) {
            const prefs = (await prefsRes.json() as unknown) as {
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
          }
        } catch (error) {
          console.warn("[AI Paths] Failed to load user preferences.", error);
        }
        const map = new Map(data.map((item) => [item.key, item.value]));
        const indexRaw = map.get(PATH_INDEX_KEY);
        const lastErrorRaw = map.get(AI_PATHS_LAST_ERROR_KEY);
        const presetsRaw = map.get(CLUSTER_PRESETS_KEY);
        const queryPresetsRaw = map.get(DB_QUERY_PRESETS_KEY);
        const dbNodePresetsRaw = map.get(DB_NODE_PRESETS_KEY);
        const configs: Record<string, PathConfig> = {};
        let metas: PathMeta[] = [];
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
              const normalized = parsed.map((item) => normalizeDbQueryPreset(item));
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
              const normalized = parsed.map((item) => normalizeDbNodePreset(item));
              setDbNodePresets(normalized);
            }
          } catch (error) {
            reportAiPathsError(error, { action: "parseDbNodePresets" }, "Failed to parse database presets:");
          }
        }
        if (indexRaw) {
          const parsedIndex = JSON.parse(indexRaw) as PathMeta[];
          if (Array.isArray(parsedIndex)) {
            metas = parsedIndex;
          }
        }

        if (preferredPathConfigs && Object.keys(preferredPathConfigs).length > 0) {
          Object.entries(preferredPathConfigs).forEach(([id, config]) => {
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
              ? preferredPathIndex.filter((meta) => configs[meta.id])
              : Object.values(configs).map(createPathMeta);
        } else if (metas.length > 0) {
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
  }, [toast, reportAiPathsError, loadNonce]);

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
        const data = (await res.json() as unknown) as { models?: string[] };
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
  }, [reportAiPathsError]);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          user?: { id?: string; name?: string | null; email?: string | null };
        };
        if (data?.user) {
          setSessionUser({
            id: data.user.id,
            name: data.user.name ?? null,
            email: data.user.email ?? null,
          });
        }
      } catch {
        // ignore session load failures
      }
    };
    void loadSession();
  }, []);

  useEffect(() => {
    const handlePointerUp = () => {
      setConnecting(null);
      setConnectingPos(null);
    };
    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, []);

  useEffect(() => {
    runtimeStateRef.current = runtimeState;
  }, [runtimeState]);

  const clearRuntimeForNode = React.useCallback((nodeId: string) => {
    setRuntimeState((prev) => {
      const nextInputs = { ...prev.inputs };
      const nextOutputs = { ...prev.outputs };
      delete nextInputs[nodeId];
      delete nextOutputs[nodeId];
      return { ...prev, inputs: nextInputs, outputs: nextOutputs };
    });
  }, []);

  useEffect(() => {
    if (!lastDrop) return;
    if (lastDropTimerRef.current) {
      window.clearTimeout(lastDropTimerRef.current);
    }
    lastDropTimerRef.current = window.setTimeout(() => {
      setLastDrop(null);
      lastDropTimerRef.current = null;
    }, 1600);
    return () => {
      if (lastDropTimerRef.current) {
        window.clearTimeout(lastDropTimerRef.current);
        lastDropTimerRef.current = null;
      }
    };
  }, [lastDrop]);

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
      if (target?.closest("[data-edge-panel]")) return;
      setConnecting(null);
      setConnectingPos(null);
      setSelectedEdgeId(null);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const handleRemoveEdge = useCallback(
    (edgeId: string) => {
      setEdges((prev) => prev.filter((edge) => edge.id !== edgeId));
      if (selectedEdgeId === edgeId) {
        setSelectedEdgeId(null);
      }
    },
    [selectedEdgeId]
  );

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
      parserSamples,
      updaterSamples,
      runtimeState,
      lastRunAt,
    };
    setEdges([]);
    const nextConfigs = { ...pathConfigs, [activePathId]: config };
    setPathConfigs(nextConfigs);
    try {
      const safeConfigs = serializePathConfigs(nextConfigs);
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiPathsPathIndex: paths,
          aiPathsPathConfigs: safeConfigs,
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
    const shouldSanitizeEdges = Boolean(patch.inputs || patch.outputs);
    setNodes((prev) => {
      const next = prev.map((node) =>
        node.id === selectedNodeId ? { ...node, ...patch } : node
      );
      if (shouldSanitizeEdges) {
        setEdges((current) => sanitizeEdges(next, current));
      }
      return next;
    });
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
      return (await res.json() as unknown) as Record<string, unknown>;
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
      return (await res.json() as unknown) as Record<string, unknown>;
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

  const getDomSelector = (element: Element | null) => {
    if (!element) return null;
    const selectorEscape = (val: string) => {
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
                (child) => child.tagName === (current as Element).tagName
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

  const getTargetInfo = (event?: React.MouseEvent) => {
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

  const buildTriggerContext = (
    triggerNode: AiNode,
    triggerEvent: string,
    event?: React.MouseEvent
  ) => {
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

  const runGraphForTrigger = async (triggerNode: AiNode, event?: React.MouseEvent) => {
    const triggerEvent = triggerNode.config?.trigger?.event ?? TRIGGER_EVENTS[0]?.id;
    lastTriggerNodeIdRef.current = triggerNode.id;
    const triggerContext = buildTriggerContext(triggerNode, triggerEvent, event);
    triggerContextRef.current = triggerContext;
    const result = await evaluateGraph({
      nodes,
      edges,
      activePathId,
      triggerNodeId: triggerNode.id,
      triggerEvent,
      triggerContext,
      deferPoll: true,
      fetchEntityByType,
      reportAiPathsError,
      toast,
    });
    const runAt = new Date().toISOString();
    setRuntimeState(result);
    setLastRunAt(runAt);
    if (activePathId) {
      setPathConfigs((prev) => ({
        ...prev,
        [activePathId]: {
          ...(prev[activePathId] ?? buildActivePathConfig(runAt)),
          runtimeState: result,
          lastRunAt: runAt,
        },
      }));
    }
  };

  const buildDbQueryPayload = (
    nodeInputs: RuntimePortValues,
    queryConfig: DbQueryConfig
  ) => {
    const inputQuery = coerceInput(nodeInputs.query);
    const inputValue = coerceInput(nodeInputs.value) ?? coerceInput(nodeInputs.jobId);
    const entityIdInput = coerceInput(nodeInputs.entityId);
    const productIdInput = coerceInput(nodeInputs.productId);
    let query: Record<string, unknown> = {};
    if (queryConfig.mode === "preset") {
      const presetValue =
        queryConfig.preset === "by_productId"
          ? productIdInput ?? inputValue ?? entityIdInput
          : queryConfig.preset === "by_entityId"
            ? entityIdInput ?? inputValue ?? productIdInput
            : inputValue ?? entityIdInput ?? productIdInput;
      if (presetValue !== undefined) {
        const field =
          queryConfig.preset === "by_productId"
            ? "productId"
            : queryConfig.preset === "by_entityId"
              ? "entityId"
              : queryConfig.preset === "by_field"
                ? queryConfig.field || "id"
                : "_id";
        query = { [field]: presetValue };
      }
    } else if (inputQuery && typeof inputQuery === "object") {
      query = inputQuery as Record<string, unknown>;
    } else {
      const rendered = renderTemplate(
        queryConfig.queryTemplate ?? "{}",
        nodeInputs as Record<string, unknown>,
        inputValue ?? ""
      );
      const parsed = parseJsonSafe(rendered);
      if (parsed && typeof parsed === "object") {
        query = parsed as Record<string, unknown>;
      }
    }
    const projection = parseJsonSafe(queryConfig.projection ?? "") as
      | Record<string, unknown>
      | undefined;
    const sort = parseJsonSafe(queryConfig.sort ?? "") as
      | Record<string, unknown>
      | undefined;
    return {
      query,
      projection,
      sort,
      provider: queryConfig.provider,
      collection: queryConfig.collection,
      limit: queryConfig.limit,
      single: queryConfig.single,
      idType: queryConfig.idType,
    };
  };

  const pollDatabaseQuery = async (
    nodeInputs: RuntimePortValues,
    config: {
      intervalMs: number;
      maxAttempts: number;
      dbQuery: DbQueryConfig;
      successPath: string;
      successOperator: "truthy" | "equals" | "contains" | "notEquals";
      successValue: string;
      resultPath: string;
    }
  ): Promise<{ result: unknown; status: string; bundle: Record<string, unknown> }> => {
    const maxAttempts = config.maxAttempts;
    const intervalMs = config.intervalMs;
    const successPath = config.successPath || "status";
    const successOperator = config.successOperator || "equals";
    const successValue = config.successValue ?? "completed";
    const resultPath = config.resultPath || "";
    let lastBundle: Record<string, unknown> | null = null;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const payload = buildDbQueryPayload(nodeInputs, config.dbQuery);
      const res = await fetch("/api/ai-paths/db-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Failed to execute database query.");
      }
      const data = (await res.json() as unknown) as { item?: unknown; items?: unknown[] };
      const resultCandidate = payload.single ? data.item : data.items;
      lastBundle = {
        ...(payload.single ? { item: data.item } : { items: data.items }),
      };
      const resolvedStatus = successPath
        ? getValueAtMappingPath(resultCandidate, successPath)
        : resultCandidate;
      const asString = safeStringify(resolvedStatus);
      let success = false;
      switch (successOperator) {
        case "truthy":
          success = Boolean(resolvedStatus);
          break;
        case "notEquals":
          success = asString !== String(successValue);
          break;
        case "contains":
          success = asString.includes(String(successValue));
          break;
        case "equals":
        default:
          success = asString === String(successValue);
      }
      if (success) {
        const result = resultPath
          ? getValueAtMappingPath(resultCandidate, resultPath)
          : resultCandidate;
        return {
          result,
          status: "completed",
          bundle: lastBundle ?? {},
        };
      }
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, Math.max(0, intervalMs)));
      }
    }
    return {
      result: null,
      status: "timeout",
      bundle: lastBundle ?? {},
    };
  };

  const pollGraphJob = async (
    jobId: string,
    options?: { intervalMs?: number; maxAttempts?: number }
  ) => {
    const maxAttempts = options?.maxAttempts ?? 60;
    const intervalMs = options?.intervalMs ?? 2000;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const statusRes = await fetch(`/api/products/ai-jobs/${jobId}`);
      if (!statusRes.ok) {
        throw new Error("Failed to fetch job status.");
      }
      const payload = (await statusRes.json() as unknown) as {
        job?: { status?: string; result?: unknown; errorMessage?: string | null };
      };
      const job = payload.job;
      if (!job) continue;
      if (job.status === "completed") {
        const result = job.result as
          | { result?: string }
          | string
          | null
          | undefined;
        if (result && typeof result === "object" && "result" in result) {
          return (result as { result?: string }).result ?? "";
        }
        return typeof result === "string" ? result : JSON.stringify(result ?? "");
      }
      if (job.status === "failed") {
        throw new Error(job.errorMessage || "AI job failed.");
      }
      if (job.status === "canceled") {
        throw new Error("AI job was canceled.");
      }
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, Math.max(0, intervalMs)));
      }
    }
    throw new Error("AI job timed out.");
  };

  const runPollUpdate = async (
    node: AiNode,
    options: {
      jobId?: string;
      nodeInputs: RuntimePortValues;
    }
  ) => {
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
          .filter((item) => item.type === "model")
          .forEach((modelNode) => {
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
      setRuntimeState((prev) => ({
        ...prev,
        outputs: updatedOutputs,
      }));
      const triggerNodeId = lastTriggerNodeIdRef.current ?? undefined;
      const seededOutputs = updatedOutputs;
      const downstreamState = await evaluateGraph({
        nodes,
        edges,
        activePathId,
        triggerNodeId,
        triggerContext: triggerContextRef.current,
        deferPoll: true,
        skipAiJobs: true,
        seedOutputs: seededOutputs,
        fetchEntityByType,
        reportAiPathsError,
        toast,
      });
      const runAt = new Date().toISOString();
      setRuntimeState(downstreamState);
      setLastRunAt(runAt);
      if (activePathId) {
        setPathConfigs((prev) => ({
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
      setRuntimeState((prev) => ({
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
  };

  const startPendingPolls = (state: RuntimeState) => {
    nodes
      .filter((node) => node.type === "poll")
      .forEach((node) => {
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
  };

  useEffect(() => {
    if (!runtimeState || nodes.length === 0) return;
    startPendingPolls(runtimeState);
  }, [nodes, runtimeState, startPendingPolls]);

  const dispatchTrigger = (
    eventName: string,
    entityId: string,
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
        },
      })
    );
  };

  const handleRunSimulation = (
    simulationNode: AiNode,
    triggerEvent?: string
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
        void runGraphForTrigger(triggerNode);
      }
    }
    dispatchTrigger(eventName, entityId, entityType);
    toast(`Simulated ${eventName} for ${entityType} ${entityId}`, {
      variant: "success",
    });
  };

  const handleFireTrigger = (triggerNode: AiNode, event?: React.MouseEvent) => {
    const triggerEvent = triggerNode.config?.trigger?.event ?? TRIGGER_EVENTS[0]?.id;
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
    simulationNodes.forEach((node) => handleRunSimulation(node, triggerEvent));
    void runGraphForTrigger(triggerNode, event);
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

  const handleSelectEdge = (edgeId: string | null) => {
    setSelectedEdgeId(edgeId);
    if (edgeId) {
      setSelectedNodeId(null);
    }
  };

  const handleSelectNode = (nodeId: string) => {
    setSelectedEdgeId(null);
    setSelectedNodeId(nodeId);
  };

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
      const normalized = list.map((item: unknown) => normalizePreset(item as Partial<ClusterPreset>));
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



  const updateActivePathMeta = (name: string) => {
    if (!activePathId) return;
    const updatedAt = new Date().toISOString();
    setPaths((prev) =>
      prev.map((path) =>
        path.id === activePathId ? { ...path, name, updatedAt } : path
      )
    );
  };

  const toJsonSafe = (value: unknown): unknown => {
    const replacer = (_key: string, val: unknown) => {
      if (typeof val === "bigint") return val.toString();
      if (val instanceof Date) return val.toISOString();
      if (val instanceof Set) return Array.from(val.values()) as unknown[];
      if (val instanceof Map) return Object.fromEntries(val.entries()) as Record<string, unknown>;
      if (typeof val === "function" || typeof val === "symbol") return undefined;
      return val;
    };
    try {
      return JSON.parse(JSON.stringify(value, replacer)) as unknown;
    } catch {
      return null;
    }
  };

  const parseRuntimeState = (value: unknown): RuntimeState => {
    if (!value) return { inputs: {}, outputs: {} };
    if (typeof value === "string") {
      const parsed = safeParseJson(value).value;
      if (parsed && typeof parsed === "object") {
        return parsed as RuntimeState;
      }
      return { inputs: {}, outputs: {} };
    }
    if (typeof value === "object") {
      return value as RuntimeState;
    }
    return { inputs: {}, outputs: {} };
  };

  const buildPersistedRuntimeState = (
    state: RuntimeState,
    graphNodes: AiNode[]
  ): string => {
    const nodeIds = new Set(graphNodes.map((node) => node.id));
    const inputs: Record<string, RuntimePortValues> = {};
    const outputs: Record<string, RuntimePortValues> = {};
    Object.entries(state.inputs ?? {}).forEach(([key, value]) => {
      if (nodeIds.has(key)) {
        inputs[key] = value;
      }
    });
    Object.entries(state.outputs ?? {}).forEach(([key, value]) => {
      if (nodeIds.has(key)) {
        outputs[key] = value;
      }
    });
    const safe = toJsonSafe({ inputs, outputs });
    return safe ? JSON.stringify(safe) : "";
  };

  const sanitizePathConfig = (config: PathConfig): PathConfig => ({
    ...config,
    runtimeState: buildPersistedRuntimeState(
      parseRuntimeState(config.runtimeState),
      config.nodes
    ),
  });

  const sanitizePathConfigs = (configs: Record<string, PathConfig>) =>
    Object.fromEntries(
      Object.entries(configs).map(([key, value]) => [key, sanitizePathConfig(value)])
    );

  const serializePathConfigs = (configs: Record<string, PathConfig>) =>
    JSON.stringify(sanitizePathConfigs(configs));

  const buildActivePathConfig = (updatedAt: string): PathConfig => ({
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
  });

  const buildPathSnapshot = () =>
    JSON.stringify({
      activePathId,
      name: pathName,
      description: pathDescription,
      trigger: activeTrigger,
      nodes,
      edges,
      parserSamples,
      updaterSamples,
      runtimeState,
      lastRunAt,
    });

  const persistPathConfig = async (options?: { silent?: boolean }) => {
    if (!activePathId) return;
    const silent = options?.silent ?? false;
    if (!silent) setSaving(true);
    try {
      const updatedAt = new Date().toISOString();
      const config = buildActivePathConfig(updatedAt);
      const nextPaths = paths.map((path) =>
        path.id === activePathId ? { ...path, name: pathName, updatedAt } : path
      );
      const nextConfigs = { ...pathConfigs, [activePathId]: config };
      setPathConfigs(nextConfigs);
      setPaths(nextPaths);
      const safeConfigs = serializePathConfigs(nextConfigs);
      const prefsRes = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiPathsPathIndex: nextPaths,
          aiPathsPathConfigs: safeConfigs,
        }),
      });
      if (!prefsRes.ok) {
        throw new Error("Failed to save AI Path settings.");
      }
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
  };

  const handleSave = async () => {
    const ok = await persistPathConfig();
    if (ok) {
      setAutoSaveStatus("saved");
      setAutoSaveAt(new Date().toISOString());
    } else {
      setAutoSaveStatus("error");
    }
  };

  useEffect(() => {
    if (loading || !activePathId) return;
    lastSavedSnapshotRef.current = buildPathSnapshot();
  }, [activePathId, loading, buildPathSnapshot]);

  useEffect(() => {
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
    autoSaveTimerRef.current = window.setTimeout(() => {
      if (autoSaveInFlightRef.current) return;
      autoSaveInFlightRef.current = true;
      setAutoSaveStatus("saving");
      void persistPathConfig({ silent: true })
        .then((ok) => {
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
    return () => {
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
    runtimeState,
    lastRunAt,
    saving,
    updaterSamples,
    buildPathSnapshot,
    persistPathConfig,
  ]);

  const handleReset = () => {
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
    setPaths((prev) => [...prev, meta]);
    setPathConfigs((prev) => ({ ...prev, [id]: config }));
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
    setActiveTrigger(normalizeTriggerLabel(config.trigger));
    setParserSamples(config.parserSamples ?? {});
    setUpdaterSamples(config.updaterSamples ?? {});
    setRuntimeState(parseRuntimeState(config.runtimeState));
    setLastRunAt(config.lastRunAt ?? null);
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
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiPathsPathIndex: nextPaths,
          aiPathsPathConfigs: safeConfigs,
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
    setActiveTrigger(normalizeTriggerLabel(config.trigger));
    setParserSamples(config.parserSamples ?? {});
    setUpdaterSamples(config.updaterSamples ?? {});
    setRuntimeState(parseRuntimeState(config.runtimeState));
    setLastRunAt(config.lastRunAt ?? null);
    setSelectedNodeId(normalizedNodes[0]?.id ?? null);
  };

  const savePathIndex = async (nextPaths: PathMeta[]) => {
    try {
      const safeConfigs = serializePathConfigs(pathConfigs);
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiPathsPathIndex: nextPaths,
          aiPathsPathConfigs: safeConfigs,
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
          : "border-gray-700 bg-gray-900/60 text-gray-300";

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
                      onClick={() => { void handleSave(); }}
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
                        {lastError.message === "Failed to load AI Paths settings" && (
                          <Button
                            type="button"
                            className="rounded-md border border-rose-400/50 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-500/20"
                            onClick={() => {
                              setLastError(null);
                              void persistLastError(null);
                              setLoadNonce((prev) => prev + 1);
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
                    className="h-9 w-[260px] rounded-md border border-gray-800 bg-gray-950/60 px-3 text-sm text-white"
                    value={pathName}
                    onChange={(event) => {
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
                onTogglePaletteCollapsed={() => setPaletteCollapsed((prev) => !prev)}
                expandedPaletteGroups={expandedPaletteGroups}
                onTogglePaletteGroup={togglePaletteGroup}
                onDragStart={handleDragStart}
                selectedNode={selectedNode}
                nodes={nodes}
                edges={edges}
                selectedEdgeId={selectedEdgeId}
                onSelectEdge={handleSelectEdge}
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
        clearRuntimeForNode={clearRuntimeForNode}
        dbQueryPresets={dbQueryPresets}
        setDbQueryPresets={setDbQueryPresets}
        saveDbQueryPresets={saveDbQueryPresets}
        dbNodePresets={dbNodePresets}
        setDbNodePresets={setDbNodePresets}
        saveDbNodePresets={saveDbNodePresets}
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
