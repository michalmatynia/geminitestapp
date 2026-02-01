"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUpdateSettingsBulk } from "@/shared/hooks/use-settings";
import type {
  AiNode,
  ClusterPreset,
  DbNodePreset,
  DbQueryPreset,
  Edge,
  ParserSampleState,
  PathConfig,
  PathDebugSnapshot,
  PathMeta,
  RuntimeState,
  UpdaterSampleState,
} from "@/features/ai-paths/lib";
import {
  AI_PATHS_LAST_ERROR_KEY,
  CLUSTER_PRESETS_KEY,
  DB_NODE_PRESETS_KEY,
  DB_QUERY_PRESETS_KEY,
  PATH_CONFIG_PREFIX,
  PATH_DEBUG_PREFIX,
  PATH_INDEX_KEY,
  STORAGE_VERSION,
  createDefaultPathConfig,
  createPathMeta,
  initialEdges,
  initialNodes,
  normalizeNodes,
  safeParseJson,
  stableStringify,
  sanitizeEdges,
  triggers,
} from "@/features/ai-paths/lib";
import {
  parseRuntimeState,
  sanitizePathConfig,
  serializePathConfigs,
} from "../AiPathsSettingsUtils";

const AUTO_SAVE_DEBOUNCE_MS = 100; // Very short debounce for near-immediate saves

type ToastFn = (message: string, options?: Partial<{ variant: "success" | "error" | "info"; duration: number }>) => void;

type UseAiPathsPersistenceArgs = {
  activePathId: string | null;
  activeTrigger: string;
  edges: Edge[];
  expandedPaletteGroups: Set<string>;
  lastRunAt: string | null;
  loadNonce: number;
  loading: boolean;
  nodes: AiNode[];
  paletteCollapsed: boolean;
  parserSamples: Record<string, ParserSampleState>;
  pathConfigs: Record<string, PathConfig>;
  pathDescription: string;
  pathName: string;
  paths: PathMeta[];
  runtimeState: RuntimeState;
  updaterSamples: Record<string, UpdaterSampleState>;
  normalizeDbNodePreset: (raw: Partial<DbNodePreset>) => DbNodePreset;
  normalizeDbQueryPreset: (raw: Partial<DbQueryPreset>) => DbQueryPreset;
  normalizeTriggerLabel: (value?: string | null) => string;
  persistLastError: (
    payload: { message: string; time: string; pathId?: string | null } | null
  ) => Promise<void>;
  reportAiPathsError: (
    error: unknown,
    context: Record<string, unknown>,
    fallbackMessage?: string
  ) => void;
  setActivePathId: (value: string | null) => void;
  setActiveTrigger: (value: string) => void;
  setClusterPresets: React.Dispatch<React.SetStateAction<ClusterPreset[]>>;
  setDbNodePresets: React.Dispatch<React.SetStateAction<DbNodePreset[]>>;
  setDbQueryPresets: React.Dispatch<React.SetStateAction<DbQueryPreset[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  setExpandedPaletteGroups: React.Dispatch<React.SetStateAction<Set<string>>>;
  setLastError: React.Dispatch<
    React.SetStateAction<{ message: string; time: string; pathId?: string | null } | null>
  >;
  setLastRunAt: (value: string | null) => void;
  setLoading: (value: boolean) => void;
  setNodes: React.Dispatch<React.SetStateAction<AiNode[]>>;
  setPaletteCollapsed: (value: boolean) => void;
  setParserSamples: React.Dispatch<React.SetStateAction<Record<string, ParserSampleState>>>;
  setPathConfigs: React.Dispatch<React.SetStateAction<Record<string, PathConfig>>>;
  setPathDebugSnapshots: React.Dispatch<React.SetStateAction<Record<string, PathDebugSnapshot>>>;
  setPathDescription: (value: string) => void;
  setPathName: (value: string) => void;
  setPaths: React.Dispatch<React.SetStateAction<PathMeta[]>>;
  setRuntimeState: React.Dispatch<React.SetStateAction<RuntimeState>>;
  setSelectedNodeId: (value: string | null) => void;
  setUpdaterSamples: React.Dispatch<React.SetStateAction<Record<string, UpdaterSampleState>>>;
  toast: ToastFn;
};

type PersistSettingsPayload = Array<{ key: string; value: string }>;

type UseAiPathsPersistenceResult = {
  autoSaveAt: string | null;
  autoSaveStatus: "idle" | "saving" | "saved" | "error";
  handleSave: () => Promise<void>;
  persistPathSettings: (nextPaths: PathMeta[], configId: string, config: PathConfig) => Promise<void>;
  persistPreferences: (payload: Record<string, unknown>) => Promise<void>;
  persistSettingsBulk: (payload: PersistSettingsPayload) => Promise<void>;
  savePathIndex: (nextPaths: PathMeta[]) => Promise<void>;
  saving: boolean;
  syncNodesRef: (next: AiNode[]) => void;
};

export function useAiPathsPersistence({
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
}: UseAiPathsPersistenceArgs): UseAiPathsPersistenceResult {
  const queryClient = useQueryClient();
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

  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [autoSaveAt, setAutoSaveAt] = useState<string | null>(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const lastSavedSnapshotRef = useRef<string | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);
  const autoSaveInFlightRef = useRef(false);
  const lastPrefsPayloadRef = useRef<string>("");
  const lastPathSavePayloadRef = useRef<string>("");
  const lastSettingsPayloadRef = useRef<string>("");
  const loadAttemptRef = useRef<number | null>(null);
  const loadInFlightRef = useRef(false);

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

  const syncNodesRef = useCallback((next: AiNode[]): void => {
    currentNodesRef.current = next;
  }, []);

  const normalizeConfigForHash = useCallback(
    (config: PathConfig): PathConfig => ({
      ...config,
      nodes: [...config.nodes].sort((a: AiNode, b: AiNode): number => a.id.localeCompare(b.id)),
      edges: [...config.edges].sort((a: Edge, b: Edge): number => a.id.localeCompare(b.id)),
    }),
    []
  );

  const buildPathConfigsHash = useCallback(
    (configs: Record<string, PathConfig>): string => {
      const normalizedConfigs = Object.fromEntries(
        Object.entries(configs).map(([key, config]: [string, PathConfig]) => [
          key,
          normalizeConfigForHash(sanitizePathConfig(config)),
        ])
      );
      return stableStringify(normalizedConfigs);
    },
    [normalizeConfigForHash]
  );

  const persistPreferences = useCallback(
    async (payload: Record<string, unknown>): Promise<void> => {
      await updatePreferencesMutation.mutateAsync(payload);
    },
    [updatePreferencesMutation]
  );

  const persistSettingsBulk = useCallback(
    async (payload: PersistSettingsPayload): Promise<void> => {
      await updateSettingsBulkMutation.mutateAsync(payload);
    },
    [updateSettingsBulkMutation]
  );

  useEffect((): void => {
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
        const map = new Map(
          data.map((item: { key: string; value: string }): [string, string] => [item.key, item.value])
        );
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
              const normalized = parsed.map((item: DbQueryPreset): DbQueryPreset =>
                normalizeDbQueryPreset(item)
              );
              setDbQueryPresets(normalized);
            }
          } catch (error) {
            reportAiPathsError(
              error,
              { action: "parseQueryPresets" },
              "Failed to parse query presets:"
            );
          }
        }
        if (dbNodePresetsRaw) {
          try {
            const parsed = JSON.parse(dbNodePresetsRaw) as DbNodePreset[];
            if (Array.isArray(parsed)) {
              const normalized = parsed.map((item: DbNodePreset): DbNodePreset =>
                normalizeDbNodePreset(item)
              );
              setDbNodePresets(normalized);
            }
          } catch (error) {
            reportAiPathsError(
              error,
              { action: "parseDbNodePresets" },
              "Failed to parse database presets:"
            );
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
        } else if (
          shouldPreferPrefs &&
          preferredPathConfigs &&
          Object.keys(preferredPathConfigs).length > 0
        ) {
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
              const settingsPayloads = metas.map(
                (meta: PathMeta): { key: string; value: string } => ({
                  key: `${PATH_CONFIG_PREFIX}${meta.id}`,
                  value: JSON.stringify(sanitizePathConfig(configs[meta.id]!)),
                })
              );
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
          preferredPathId && configs[preferredPathId] ? preferredPathId : firstPathCandidate;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setLoading,
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

  const persistPathSettings = useCallback(
    async (nextPaths: PathMeta[], configId: string, config: PathConfig): Promise<void> => {
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
    },
    [normalizeConfigForHash, updateSettingsBulkMutation]
  );

  const buildPathSnapshot = useCallback(
    (): string =>
      stableStringify({
        activePathId,
        name: pathName,
        description: pathDescription,
        trigger: activeTrigger,
        nodes: [...nodes].sort((a: AiNode, b: AiNode): number => a.id.localeCompare(b.id)),
        edges: [...edges].sort((a: Edge, b: Edge): number => a.id.localeCompare(b.id)),
        parserSamples,
        updaterSamples,
      }),
    [
      activePathId,
      pathName,
      pathDescription,
      activeTrigger,
      nodes,
      edges,
      parserSamples,
      updaterSamples,
    ]
  );

  const buildActivePathConfig = useCallback(
    (updatedAt: string): PathConfig => ({
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
    }),
    [
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
    ]
  );

  const persistPathConfig = useCallback(
    async (options?: { silent?: boolean; force?: boolean }): Promise<boolean> => {
      if (!activePathId) return false;
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
          await persistPreferences({
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
        reportAiPathsError(
          error,
          { action: silent ? "autoSavePath" : "savePath", pathId: activePathId },
          "Failed to save AI Paths settings:"
        );
        if (!silent) {
          toast("Failed to save AI Paths settings.", { variant: "error" });
        }
        return false;
      } finally {
        if (!silent) setSaving(false);
      }
    },
    [
      activePathId,
      pathName,
      paths,
      pathConfigs,
      buildActivePathConfig,
      persistPathSettings,
      buildPathSnapshot,
      buildPathConfigsHash,
      persistPreferences,
      reportAiPathsError,
      persistLastError,
      setLastError,
      setPathConfigs,
      setPaths,
      toast,
    ]
  );

  const handleSave = useCallback(async (): Promise<void> => {
    const ok = await persistPathConfig({ force: true });
    if (ok) {
      setAutoSaveStatus("saved");
      setAutoSaveAt(new Date().toISOString());
    } else {
      setAutoSaveStatus("error");
    }
  }, [persistPathConfig]);

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
  useEffect((): void => {
    currentNodesRef.current = nodes;
  }, [nodes]);
  useEffect((): void => {
    currentEdgesRef.current = edges;
  }, [edges]);
  useEffect((): void => {
    currentPathsRef.current = paths;
  }, [paths]);
  useEffect((): void => {
    currentPathConfigsRef.current = pathConfigs;
  }, [pathConfigs]);
  useEffect((): void => {
    currentActivePathIdRef.current = activePathId;
  }, [activePathId]);
  useEffect((): void => {
    currentPathNameRef.current = pathName;
  }, [pathName]);
  useEffect((): void => {
    currentPathDescriptionRef.current = pathDescription;
  }, [pathDescription]);
  useEffect((): void => {
    currentActiveTriggerRef.current = activeTrigger;
  }, [activeTrigger]);
  useEffect((): void => {
    currentParserSamplesRef.current = parserSamples;
  }, [parserSamples]);
  useEffect((): void => {
    currentUpdaterSamplesRef.current = updaterSamples;
  }, [updaterSamples]);
  useEffect((): void => {
    currentRuntimeStateRef.current = runtimeState;
  }, [runtimeState]);
  useEffect((): void => {
    currentLastRunAtRef.current = lastRunAt;
  }, [lastRunAt]);

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
      const configPayload = JSON.stringify({
        key: `${PATH_CONFIG_PREFIX}${pathId}`,
        value: JSON.stringify(sanitizedConfig),
      });

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

  const savePathIndex = useCallback(
    async (nextPaths: PathMeta[]): Promise<void> => {
      try {
        const safeConfigs = serializePathConfigs(pathConfigs);
        await persistPreferences({
          aiPathsPathIndex: nextPaths,
          aiPathsPathConfigs: safeConfigs,
        });
        if (activePathId) {
          const activeConfig = pathConfigs[activePathId] ?? createDefaultPathConfig(activePathId);
          await persistPathSettings(nextPaths, activePathId, activeConfig);
        } else {
          await persistSettingsBulk([
            { key: PATH_INDEX_KEY, value: JSON.stringify(nextPaths) },
          ]);
        }
        toast("Path list saved.", { variant: "success" });
      } catch (error) {
        reportAiPathsError(error, { action: "savePathIndex" }, "Failed to save path list:");
        toast("Failed to save path list.", { variant: "error" });
      }
    },
    [
      activePathId,
      pathConfigs,
      persistPreferences,
      persistPathSettings,
      persistSettingsBulk,
      reportAiPathsError,
      toast,
    ]
  );

  return {
    autoSaveAt,
    autoSaveStatus,
    handleSave,
    persistPathSettings,
    persistPreferences,
    persistSettingsBulk,
    savePathIndex,
    saving,
    syncNodesRef,
  };
}
