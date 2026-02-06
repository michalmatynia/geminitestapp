'use client';

import { useQuery } from '@tanstack/react-query';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import type {
  AiNode,
  ClusterPreset,
  DbNodePreset,
  DbQueryPreset,
  Edge,
  NodeConfig,
  ParserSampleState,
  PathConfig,
  PathExecutionMode,
  PathFlowIntensity,
  PathRunMode,
  PathDebugSnapshot,
  PathMeta,
  RuntimeState,
  UpdaterSampleState,
} from '@/features/ai/ai-paths/lib';
import {
  AI_PATHS_LAST_ERROR_KEY,
  AI_PATHS_UI_STATE_KEY,
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
} from '@/features/ai/ai-paths/lib';
import {
  fetchSettingsCached,
  invalidateSettingsCache,
} from '@/shared/api/settings-client';
import { useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';

import {
  buildPersistedRuntimeState,
  parseRuntimeState,
  sanitizePathConfig,
} from '../AiPathsSettingsUtils';

const AUTO_SAVE_DEBOUNCE_MS = 100; // Very short debounce for near-immediate saves
const AUTO_SAVE_ENABLED = false;

type ToastFn = (
  message: string,
  options?: { variant?: 'success' | 'error' | 'info' | 'warning' }
) => void;

type UseAiPathsPersistenceArgs = {
  activePathId: string | null;
  activeTrigger: string;
  edges: Edge[];
  expandedPaletteGroups: Set<string>;
  isPathActive: boolean;
  isPathLocked: boolean;
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
  executionMode: PathExecutionMode;
  flowIntensity: PathFlowIntensity;
  runMode: PathRunMode;
  selectedNodeId: string | null;
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
  setIsPathActive: (value: boolean) => void;
  setIsPathLocked: (value: boolean) => void;
  setNodes: React.Dispatch<React.SetStateAction<AiNode[]>>;
  setPaletteCollapsed: (value: boolean) => void;
  setParserSamples: React.Dispatch<React.SetStateAction<Record<string, ParserSampleState>>>;
  setPathConfigs: React.Dispatch<React.SetStateAction<Record<string, PathConfig>>>;
  setPathDebugSnapshots: React.Dispatch<React.SetStateAction<Record<string, PathDebugSnapshot>>>;
  setPathDescription: (value: string) => void;
  setExecutionMode: (value: PathExecutionMode) => void;
  setFlowIntensity: (value: PathFlowIntensity) => void;
  setRunMode: (value: PathRunMode) => void;
  setPathName: (value: string) => void;
  setPaths: React.Dispatch<React.SetStateAction<PathMeta[]>>;
  setRuntimeState: React.Dispatch<React.SetStateAction<RuntimeState>>;
  setConfigOpen: (value: boolean) => void;
  setSelectedNodeId: (value: string | null) => void;
  setUpdaterSamples: React.Dispatch<React.SetStateAction<Record<string, UpdaterSampleState>>>;
  toast: ToastFn;
};

type PersistSettingsPayload = Array<{ key: string; value: string }>;
type AiPathsUiState = {
  activePathId?: string | null;
  expandedGroups?: string[];
  paletteCollapsed?: boolean;
};
type AiPathsUserPreferences = {
  aiPathsActivePathId?: string | null;
};

type UseAiPathsPersistenceResult = {
  autoSaveAt: string | null;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  handleSave: (options?: {
    silent?: boolean | undefined;
    includeNodeConfig?: boolean | undefined;
    force?: boolean | undefined;
    nodesOverride?: AiNode[] | undefined;
  }) => Promise<void>;
  persistActivePathPreference: (pathId: string | null) => Promise<void>;
  persistPathSettings: (nextPaths: PathMeta[], configId: string, config: PathConfig) => Promise<void>;
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
  executionMode,
  flowIntensity,
  runMode,
  selectedNodeId,
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
  setExecutionMode,
  setFlowIntensity,
  setRunMode,
  setPathName,
  setPaths,
  setRuntimeState,
  setConfigOpen,
  setSelectedNodeId,
  setUpdaterSamples,
  toast,
}: UseAiPathsPersistenceArgs): UseAiPathsPersistenceResult {
  const updateSettingsBulkMutation = useUpdateSettingsBulk();
  const settingsQuery = useQuery({
    queryKey: ['settings', 'heavy'],
    queryFn: async (): Promise<Array<{ key: string; value: string }>> => {
      return await fetchSettingsCached({ scope: 'heavy' });
    },
    enabled: false,
  });
  const userPreferencesQuery = useQuery({
    queryKey: ['user-preferences', 'ai-paths'],
    queryFn: async (): Promise<AiPathsUserPreferences> => {
      const res = await fetch('/api/user/preferences', { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Failed to load user preferences');
      }
      return (await res.json()) as AiPathsUserPreferences;
    },
    enabled: false,
  });
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [autoSaveAt, setAutoSaveAt] = useState<string | null>(null);
  const [uiStateLoaded, setUiStateLoaded] = useState(false);

  const lastSavedSnapshotRef = useRef<string | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);
  const autoSaveInFlightRef = useRef(false);
  const lastUiStatePayloadRef = useRef<string>('');
  const lastSettingsPayloadRef = useRef<string>('');
  const lastUserPrefsActivePathIdRef = useRef<string | null>(null);
  const loadAttemptRef = useRef<number | null>(null);
  const loadInFlightRef = useRef(false);

  // Refs to track current state for beforeunload handler (avoids stale closure)
  const currentNodesRef = useRef<AiNode[]>(initialNodes);
  const currentEdgesRef = useRef<Edge[]>(initialEdges);
  const currentPathsRef = useRef<PathMeta[]>([]);
  const currentPathConfigsRef = useRef<Record<string, PathConfig>>({});
  const currentActivePathIdRef = useRef<string | null>(null);
  const currentPathNameRef = useRef('AI Description Path');
  const currentPathDescriptionRef = useRef('');
  const currentActiveTriggerRef = useRef(triggers[0] ?? 'Product Modal - Context Filter');
  const currentExecutionModeRef = useRef<PathExecutionMode>('server');
  const currentFlowIntensityRef = useRef<PathFlowIntensity>('medium');
  const currentRunModeRef = useRef<PathRunMode>('block');
  const currentParserSamplesRef = useRef<Record<string, ParserSampleState>>({});
  const currentUpdaterSamplesRef = useRef<Record<string, UpdaterSampleState>>({});
  const currentRuntimeStateRef = useRef<RuntimeState>({ inputs: {}, outputs: {} });
  const currentLastRunAtRef = useRef<string | null>(null);
  const currentSelectedNodeIdRef = useRef<string | null>(null);

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

  const persistSettingsBulk = useCallback(
    async (payload: PersistSettingsPayload): Promise<void> => {
      await updateSettingsBulkMutation.mutateAsync(payload);
    },
    [updateSettingsBulkMutation]
  );

  const persistUiState = useCallback(
    async (payload: AiPathsUiState): Promise<void> => {
      await updateSettingsBulkMutation.mutateAsync([
        { key: AI_PATHS_UI_STATE_KEY, value: JSON.stringify(payload) },
      ]);
    },
    [updateSettingsBulkMutation]
  );
  const persistUserPreferences = useCallback(async (pathId: string | null): Promise<void> => {
    const csrfHeaders = withCsrfHeaders({ 'Content-Type': 'application/json' });
    const res = await fetch('/api/user/preferences', {
      method: 'PATCH',
      headers: csrfHeaders,
      credentials: 'include',
      body: JSON.stringify({ aiPathsActivePathId: pathId }),
    });
    if (!res.ok) {
      throw new Error('Failed to update user preferences');
    }
  }, []);
  const persistActivePathPreference = useCallback(
    async (pathId: string | null): Promise<void> => {
      if (!uiStateLoaded) return;
      const resolved = pathId ?? null;
      if (resolved === lastUserPrefsActivePathIdRef.current) return;
      try {
        await persistUserPreferences(resolved);
        lastUserPrefsActivePathIdRef.current = resolved;
      } catch (error) {
        console.warn('[AI Paths] Failed to persist user preferences.', error);
      }
    },
    [persistUserPreferences, uiStateLoaded]
  );

  useEffect((): void => {
    if (loadInFlightRef.current) return;
    if (loadAttemptRef.current === loadNonce) return;
    loadAttemptRef.current = loadNonce;
    loadInFlightRef.current = true;
    setLoading(true);
    const loadConfig = async (): Promise<void> => {
      try {
        const [settingsResult, userPreferencesResult] = await Promise.all([
          settingsQuery.refetch(),
          userPreferencesQuery.refetch(),
        ]);
        if (settingsResult.error || !settingsResult.data) {
          throw settingsResult.error ?? new Error('Failed to load AI Paths settings.');
        }
        const userPreferences = userPreferencesResult?.data;
        const data = settingsResult.data as Array<{ key: string; value: string }>;
        const map = new Map(
          data.map((item: { key: string; value: string }): [string, string] => [
            item.key,
            item.value,
          ])
        );
        const uiStateRaw = map.get(AI_PATHS_UI_STATE_KEY);
        const uiStateParsed = uiStateRaw ? safeParseJson(uiStateRaw).value : null;
        const uiState =
          uiStateParsed && typeof uiStateParsed === 'object'
            ? (uiStateParsed as Record<string, unknown>)
            : null;
        const preferredPathIdFromUi =
          typeof uiState?.activePathId === 'string' ? uiState.activePathId : null;
        const preferredPathIdFromUser =
          typeof userPreferences?.aiPathsActivePathId === 'string' &&
          userPreferences.aiPathsActivePathId.trim().length > 0
            ? userPreferences.aiPathsActivePathId.trim()
            : null;
        const preferredGroups = Array.isArray(uiState?.expandedGroups)
          ? uiState.expandedGroups.filter(
            (value: unknown): value is string =>
              typeof value === 'string' && value.trim().length > 0
          )
          : null;
        const preferredPaletteCollapsed =
          typeof uiState?.paletteCollapsed === 'boolean'
            ? uiState.paletteCollapsed
            : null;
        const hasStoredUiState = Boolean(uiState);
        if (preferredGroups) {
          setExpandedPaletteGroups(new Set(preferredGroups));
        }
        if (typeof preferredPaletteCollapsed === 'boolean') {
          setPaletteCollapsed(preferredPaletteCollapsed);
        }
        const debugSnapshots: Record<string, PathDebugSnapshot> = {};
        map.forEach((value: string, key: string) => {
          if (!key.startsWith(PATH_DEBUG_PREFIX)) return;
          const pathId = key.slice(PATH_DEBUG_PREFIX.length);
          if (!pathId) return;
          const parsed = safeParseJson(value).value;
          if (parsed && typeof parsed === 'object') {
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
            reportAiPathsError(error, { action: 'parsePresets' }, 'Failed to parse presets:');
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
              { action: 'parseQueryPresets' },
              'Failed to parse query presets:'
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
              { action: 'parseDbNodePresets' },
              'Failed to parse database presets:'
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

        if (settingsMetas.length > 0) {
          Object.assign(configs, settingsConfigs);
          metas = settingsMetas;
        } else {
          const legacyRaw = map.get(`${PATH_CONFIG_PREFIX}default`) ?? map.get('ai_paths_config');
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
              id: 'default',
              version: parsed.version ?? STORAGE_VERSION,
              name: parsed.pathName ?? 'AI Description Path',
              description: parsed.description ?? '',
              trigger: parsed.trigger ?? (triggers[0] ?? 'Product Modal - Context Filter'),
              flowIntensity: 'medium',
              nodes: Array.isArray(parsed.nodes) ? parsed.nodes : initialNodes,
              edges: Array.isArray(parsed.edges) ? parsed.edges : initialEdges,
              updatedAt: new Date().toISOString(),
              runtimeState: { inputs: {}, outputs: {} },
              lastRunAt: null,
            };
            configs[legacyConfig.id] = legacyConfig;
            metas = [createPathMeta(legacyConfig)];
          } else {
            const fallback = createDefaultPathConfig('default');
            configs[fallback.id] = fallback;
            metas = [createPathMeta(fallback)];
          }
        }

        const normalizeMetaName = (name: unknown, pathId: string): string => {
          if (typeof name === 'string' && name.trim().length > 0) {
            return name.trim();
          }
          const configName = configs[pathId]?.name;
          if (typeof configName === 'string' && configName.trim().length > 0) {
            return configName.trim();
          }
          return `Path ${pathId.slice(0, 6)}`;
        };
        const normalizedMetas: PathMeta[] = metas.map((meta: PathMeta): PathMeta => {
          const config = configs[meta.id];
          const fallbackTimestamp = config?.updatedAt ?? new Date().toISOString();
          const normalizedName = normalizeMetaName(meta.name, meta.id);
          if (config && (!config.name || config.name.trim().length === 0)) {
            configs[meta.id] = { ...config, name: normalizedName };
          }
          return {
            ...meta,
            name: normalizedName,
            createdAt: meta.createdAt || fallbackTimestamp,
            updatedAt: meta.updatedAt || fallbackTimestamp,
          };
        });
        if (stableStringify(normalizedMetas) !== stableStringify(metas)) {
          try {
            await updateSettingsBulkMutation.mutateAsync([
              { key: PATH_INDEX_KEY, value: JSON.stringify(normalizedMetas) },
            ]);
          } catch (error) {
            console.warn('[AI Paths] Failed to persist normalized path names.', error);
          }
        }

        setPaths(normalizedMetas);
        setPathConfigs(configs);
        const firstPathCandidate = normalizedMetas[0]?.id ?? Object.keys(configs)[0] ?? 'default';
        const firstPath =
          preferredPathIdFromUser && configs[preferredPathIdFromUser]
            ? preferredPathIdFromUser
            : preferredPathIdFromUi && configs[preferredPathIdFromUi]
              ? preferredPathIdFromUi
              : firstPathCandidate;
        if (preferredPathIdFromUser && configs[preferredPathIdFromUser]) {
          lastUserPrefsActivePathIdRef.current = preferredPathIdFromUser;
        }
        const firstConfigForSettings = configs[firstPath];
        if (firstConfigForSettings) {
          lastSettingsPayloadRef.current = stableStringify({
            index: normalizedMetas,
            configId: firstPath,
            config: normalizeConfigForHash(sanitizePathConfig(firstConfigForSettings)),
          });
        }
        if (hasStoredUiState) {
          lastUiStatePayloadRef.current = stableStringify({
            activePathId: firstPath,
            expandedGroups: preferredGroups ?? Array.from(expandedPaletteGroups),
            paletteCollapsed:
              typeof preferredPaletteCollapsed === 'boolean'
                ? preferredPaletteCollapsed
                : paletteCollapsed,
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
        setExecutionMode(activeConfig.executionMode ?? 'server');
        setFlowIntensity(activeConfig.flowIntensity ?? 'medium');
        setRunMode(activeConfig.runMode ?? 'block');
        setParserSamples(activeConfig.parserSamples ?? {});
        setUpdaterSamples(activeConfig.updaterSamples ?? {});
        setRuntimeState(parseRuntimeState(activeConfig.runtimeState));
        setLastRunAt(activeConfig.lastRunAt ?? null);
        setIsPathLocked(Boolean(activeConfig.isLocked));
        setIsPathActive(activeConfig.isActive !== false);
        const preferredNodeId = activeConfig.uiState?.selectedNodeId ?? null;
        const resolvedNodeId =
          preferredNodeId && normalizedNodes.some((node: AiNode): boolean => node.id === preferredNodeId)
            ? preferredNodeId
            : normalizedNodes[0]?.id ?? null;
        setSelectedNodeId(resolvedNodeId);
        setConfigOpen(false);
        if (loadedLastError?.message === 'Failed to load AI Paths settings') {
          setLastError(null);
          void persistLastError(null);
        }
        setUiStateLoaded(true);
      } catch (error) {
        reportAiPathsError(error, { action: 'loadConfig' }, 'Failed to load AI Paths settings:');
        toast('Failed to load AI Paths settings.', { variant: 'error' });
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
    userPreferencesQuery,
    updateSettingsBulkMutation,
    normalizeConfigForHash,
    persistLastError,
    setLoading,
  ]);

  useEffect((): void | (() => void) => {
    if (!uiStateLoaded) return;
    const expandedGroups = Array.from(expandedPaletteGroups).sort();
    const payload: AiPathsUiState = {
      activePathId,
      expandedGroups,
      paletteCollapsed,
    };
    const payloadKey = stableStringify(payload);
    if (payloadKey === lastUiStatePayloadRef.current) return;
    lastUiStatePayloadRef.current = payloadKey;
    const nextActivePathId = activePathId ?? null;
    const shouldPersistUserPrefs = nextActivePathId !== lastUserPrefsActivePathIdRef.current;
    const timeout = setTimeout((): void => {
      void persistUiState(payload).catch((error: unknown) => {
        console.warn('[AI Paths] Failed to persist UI state.', error);
      });
      if (shouldPersistUserPrefs) {
        void persistUserPreferences(nextActivePathId)
          .then(() => {
            lastUserPrefsActivePathIdRef.current = nextActivePathId;
          })
          .catch((error: unknown) => {
            console.warn('[AI Paths] Failed to persist user preferences.', error);
          });
      }
    }, 200);
    return (): void => clearTimeout(timeout);
  }, [activePathId, expandedPaletteGroups, paletteCollapsed, uiStateLoaded, persistUiState, persistUserPreferences]);

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

  const stripNodeConfig = useCallback(
    (items: AiNode[]): AiNode[] =>
      items.map((node: AiNode): AiNode => {
        if (!node.config) return { ...node };
        return { ...node, config: undefined };
      }),
    []
  );

  const buildNodesForAutoSave = useCallback(
    (baseNodes: AiNode[] = nodes): AiNode[] => {
      const savedNodes = activePathId ? pathConfigs[activePathId]?.nodes ?? [] : [];
      const savedConfigById = new Map(
        savedNodes.map((node: AiNode): [string, NodeConfig | undefined] => [node.id, node.config])
      );
      return baseNodes.map((node: AiNode): AiNode => {
        if (savedConfigById.has(node.id)) {
          return { ...node, config: savedConfigById.get(node.id) };
        }
        return { ...node };
      });
    }, [activePathId, nodes, pathConfigs]);

  const buildPathSnapshot = useCallback(
    (): string =>
      stableStringify({
        activePathId,
        name: pathName,
        description: pathDescription,
        trigger: activeTrigger,
        executionMode,
        flowIntensity,
        runMode,
        isLocked: isPathLocked,
        isActive: isPathActive,
        uiState: {
          selectedNodeId,
        },
        nodes: stripNodeConfig([...nodes]).sort((a: AiNode, b: AiNode): number =>
          a.id.localeCompare(b.id)
        ),
        edges: [...edges].sort((a: Edge, b: Edge): number => a.id.localeCompare(b.id)),
        parserSamples,
        updaterSamples,
        runtimeState: buildPersistedRuntimeState(runtimeState, nodes),
        lastRunAt,
      }),
    [
      activePathId,
      pathName,
      pathDescription,
      activeTrigger,
      executionMode,
      flowIntensity,
      runMode,
      isPathLocked,
      isPathActive,
      selectedNodeId,
      nodes,
      edges,
      stripNodeConfig,
      parserSamples,
      updaterSamples,
      runtimeState,
      lastRunAt,
    ]
  );

  const buildActivePathConfig = useCallback(
    (updatedAt: string, nodesOverride?: AiNode[]): PathConfig => ({
      id: activePathId ?? 'default',
      version: STORAGE_VERSION,
      name: pathName,
      description: pathDescription,
      trigger: activeTrigger,
      executionMode,
      flowIntensity,
      runMode,
      nodes: nodesOverride ?? nodes,
      edges,
      updatedAt,
      isLocked: isPathLocked,
      isActive: isPathActive,
      parserSamples,
      updaterSamples,
      runtimeState,
      lastRunAt,
      uiState: {
        selectedNodeId,
      },
    }),
    [
      activePathId,
      pathName,
      pathDescription,
      activeTrigger,
      executionMode,
      flowIntensity,
      runMode,
      nodes,
      edges,
      isPathLocked,
      isPathActive,
      parserSamples,
      updaterSamples,
      runtimeState,
      lastRunAt,
      selectedNodeId,
    ]
  );

  const persistPathConfig = useCallback(
    async (options?: {
      silent?: boolean | undefined;
      force?: boolean | undefined;
      includeNodeConfig?: boolean | undefined;
      nodesOverride?: AiNode[] | undefined;
    }): Promise<boolean> => {
      if (!activePathId) return false;
      const silent = options?.silent ?? false;
      const force = options?.force ?? false;
      const includeNodeConfig = options?.includeNodeConfig ?? true;
      if (isPathLocked || !isPathActive) {
        if (!silent) {
          toast(
            isPathLocked
              ? 'This path is locked. Unlock it to save.'
              : 'This path is deactivated. Activate it to save.',
            { variant: 'info' }
          );
        }
        return false;
      }
      if (!force) {
        const snapshot = buildPathSnapshot();
        if (snapshot && snapshot === lastSavedSnapshotRef.current) {
          return true;
        }
      }
      if (!silent) setSaving(true);
      try {
        const updatedAt = new Date().toISOString();
        const baseNodes = options?.nodesOverride ?? nodes;
        const nodesForSave = includeNodeConfig
          ? baseNodes
          : buildNodesForAutoSave(baseNodes);
        const config = buildActivePathConfig(updatedAt, nodesForSave);
        const nextPaths = paths.map((path: PathMeta): PathMeta =>
          path.id === activePathId ? { ...path, name: pathName, updatedAt } : path
        );
        const nextConfigs = { ...pathConfigs, [activePathId]: config };
        setPathConfigs(nextConfigs);
        setPaths(nextPaths);
        await persistPathSettings(nextPaths, activePathId, config);
        setLastError(null);
        void persistLastError(null);
        lastSavedSnapshotRef.current = buildPathSnapshot();
        if (!silent) {
          toast('AI Paths saved.', { variant: 'success' });
        }
        return true;
      } catch (error) {
        reportAiPathsError(
          error,
          { action: silent ? 'autoSavePath' : 'savePath', pathId: activePathId },
          'Failed to save AI Paths settings:'
        );
        if (!silent) {
          toast('Failed to save AI Paths settings.', { variant: 'error' });
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
      buildNodesForAutoSave,
      nodes,
      isPathLocked,
      isPathActive,
      persistPathSettings,
      buildPathSnapshot,
      reportAiPathsError,
      persistLastError,
      setLastError,
      setPathConfigs,
      setPaths,
      toast,
    ]
  );

  const handleSave = useCallback(
    async (options?: {
      silent?: boolean | undefined;
      includeNodeConfig?: boolean | undefined;
      force?: boolean | undefined;
      nodesOverride?: AiNode[] | undefined;
    }): Promise<void> => {
      const silent = options?.silent ?? false;
      if (isPathLocked || !isPathActive) {
        if (!silent) {
          toast(
            isPathLocked
              ? 'This path is locked. Unlock it to save.'
              : 'This path is deactivated. Activate it to save.',
            { variant: 'info' }
          );
        }
        return;
      }
      const ok = await persistPathConfig({
        force: options?.force ?? true,
        silent,
        includeNodeConfig: options?.includeNodeConfig,
        nodesOverride: options?.nodesOverride,
      });
      if (silent) return;
      if (ok) {
        setAutoSaveStatus('saved');
        setAutoSaveAt(new Date().toISOString());
      } else {
        setAutoSaveStatus('error');
      }
    },
    [isPathActive, isPathLocked, persistPathConfig, toast]
  );

  useEffect((): void => {
    if (loading || !activePathId) return;
    lastSavedSnapshotRef.current = buildPathSnapshot();
     
  }, [activePathId, loading]);

  useEffect((): void => {
    if (loading || !activePathId) return;
    const snapshot = buildPathSnapshot();
    if (lastSavedSnapshotRef.current && snapshot !== lastSavedSnapshotRef.current) {
      if (autoSaveStatus !== 'idle') {
        setAutoSaveStatus('idle');
      }
      if (autoSaveAt) {
        setAutoSaveAt(null);
      }
    }
  }, [activePathId, autoSaveAt, autoSaveStatus, buildPathSnapshot, loading]);

  useEffect((): void | (() => void) => {
    if (!AUTO_SAVE_ENABLED) return;
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
      setAutoSaveStatus('saving');
      void persistPathConfig({ silent: true, includeNodeConfig: false })
        .then((ok: boolean) => {
          if (ok) {
            setAutoSaveStatus('saved');
            setAutoSaveAt(new Date().toISOString());
          } else {
            setAutoSaveStatus('error');
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
    executionMode,
    isPathLocked,
    isPathActive,
    edges,
    loading,
    nodes,
    parserSamples,
    pathDescription,
    pathName,
    saving,
    updaterSamples,
    runtimeState,
    lastRunAt,
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
    currentExecutionModeRef.current = executionMode;
  }, [executionMode]);
  useEffect((): void => {
    currentFlowIntensityRef.current = flowIntensity;
  }, [flowIntensity]);
  useEffect((): void => {
    currentRunModeRef.current = runMode;
  }, [runMode]);
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
  useEffect((): void => {
    currentSelectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

  // Save immediately when page is about to unload or tab loses focus
  useEffect((): void | (() => void) => {
    if (!AUTO_SAVE_ENABLED) return;
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
      void persistPathConfig({ silent: true, includeNodeConfig: false }).finally(() => {
        autoSaveInFlightRef.current = false;
      });
    };

    // Best-effort save on unload using keepalive fetch (allows CSRF headers)
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
      const savedNodes = currentPathConfigsRef.current[pathId]?.nodes ?? [];
      const savedConfigById = new Map(
        savedNodes.map((node: AiNode): [string, NodeConfig | undefined] => [node.id, node.config])
      );
      const nodesForSave = currentNodesRef.current.map((node: AiNode): AiNode => {
        if (savedConfigById.has(node.id)) {
          return { ...node, config: savedConfigById.get(node.id) };
        }
        return { ...node };
      });
      const config: PathConfig = {
        id: pathId,
        version: STORAGE_VERSION,
        name: currentPathNameRef.current,
        description: currentPathDescriptionRef.current,
        trigger: currentActiveTriggerRef.current,
        executionMode: currentExecutionModeRef.current,
        flowIntensity: currentFlowIntensityRef.current,
        runMode: currentRunModeRef.current,
        nodes: nodesForSave,
        edges: currentEdgesRef.current,
        updatedAt,
        parserSamples: currentParserSamplesRef.current,
        updaterSamples: currentUpdaterSamplesRef.current,
        runtimeState: currentRuntimeStateRef.current,
        lastRunAt: currentLastRunAtRef.current,
        uiState: {
          selectedNodeId: currentSelectedNodeIdRef.current,
        },
      };
      const currentPaths = currentPathsRef.current;
      const nextPaths = currentPaths.map((path: PathMeta): PathMeta =>
        path.id === pathId ? { ...path, name: currentPathNameRef.current, updatedAt } : path
      );

      const csrfHeaders = withCsrfHeaders({ 'Content-Type': 'application/json' });

      // Save to settings (the primary storage)
      const sanitizedConfig = sanitizePathConfig(config);
      const indexPayload = JSON.stringify({ key: PATH_INDEX_KEY, value: JSON.stringify(nextPaths) });
      const configPayload = JSON.stringify({
        key: `${PATH_CONFIG_PREFIX}${pathId}`,
        value: JSON.stringify(sanitizedConfig),
      });

      void fetch('/api/settings', {
        method: 'POST',
        headers: csrfHeaders,
        body: indexPayload,
        keepalive: true,
      }).catch((error: unknown) => {
        console.warn('[AI Paths] Failed to persist path index on unload.', error);
      });
      void fetch('/api/settings', {
        method: 'POST',
        headers: csrfHeaders,
        body: configPayload,
        keepalive: true,
      }).catch((error: unknown) => {
        console.warn('[AI Paths] Failed to persist path config on unload.', error);
      });
      void fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: csrfHeaders,
        credentials: 'include',
        body: JSON.stringify({ aiPathsActivePathId: pathId }),
        keepalive: true,
      }).catch((error: unknown) => {
        console.warn('[AI Paths] Failed to persist user preferences on unload.', error);
      });
      invalidateSettingsCache();
    };

    const handleBeforeUnload = (): void => {
      flushPendingSaveSync();
    };

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        flushPendingSaveAsync();
      }
    };

    // Intercept clicks on links to save before Next.js client-side navigation
    const handleLinkClick = (event: MouseEvent): void => {
      const target = event.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor && anchor.href && !anchor.href.startsWith('javascript:')) {
        // This is a link click - flush save immediately
        flushPendingSaveSync();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('click', handleLinkClick, true); // Use capture phase

    return (): void => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, [loading, buildPathSnapshot, persistPathConfig]);

  const savePathIndex = useCallback(
    async (nextPaths: PathMeta[]): Promise<void> => {
      try {
        if (activePathId) {
          const activeConfig = pathConfigs[activePathId] ?? createDefaultPathConfig(activePathId);
          await persistPathSettings(nextPaths, activePathId, activeConfig);
        } else {
          await persistSettingsBulk([
            { key: PATH_INDEX_KEY, value: JSON.stringify(nextPaths) },
          ]);
        }
        toast('Path list saved.', { variant: 'success' });
      } catch (error) {
        reportAiPathsError(error, { action: 'savePathIndex' }, 'Failed to save path list:');
        toast('Failed to save path list.', { variant: 'error' });
      }
    },
    [
      activePathId,
      pathConfigs,
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
    persistActivePathPreference,
    persistPathSettings,
    persistSettingsBulk,
    savePathIndex,
    saving,
    syncNodesRef,
  };
}
