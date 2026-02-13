'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  AI_PATHS_HISTORY_RETENTION_DEFAULT,
  AI_PATHS_HISTORY_RETENTION_KEY,
  AI_PATHS_HISTORY_RETENTION_MAX,
  AI_PATHS_HISTORY_RETENTION_MIN,
  AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_DEFAULT,
  AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_KEY,
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
  normalizeNodes,
  migrateDatabaseConfigCollections,
  migratePathConfigCollections,
  safeParseJson,
  stableStringify,
  sanitizeEdges,
} from '@/features/ai/ai-paths/lib';
import {
  fetchAiPathsSettingsCached,
  updateAiPathsSettingsBulk,
} from '@/features/ai/ai-paths/lib/settings-store-client';
import { logClientError } from '@/features/observability';
import { api } from '@/shared/lib/api-client';
import { invalidateAiPathSettings } from '@/shared/lib/query-invalidation';

import {
  buildPersistedRuntimeState,
  parseRuntimeState,
  sanitizePathConfig,
} from '../AiPathsSettingsUtils';


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
  setHistoryRetentionPasses: (value: number) => void;
  setHistoryRetentionOptionsMax: (value: number) => void;
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
    pathNameOverride?: string | undefined;
    nodesOverride?: AiNode[] | undefined;
    nodeOverride?: AiNode | undefined;
    edgesOverride?: Edge[] | undefined;
  }) => Promise<boolean>;
  persistActivePathPreference: (pathId: string | null) => Promise<void>;
  persistPathSettings: (
    nextPaths: PathMeta[],
    configId: string,
    config: PathConfig
  ) => Promise<PathConfig | null>;
  persistRuntimePathState: (
    configId: string,
    config: PathConfig
  ) => Promise<void>;
  persistSettingsBulk: (payload: PersistSettingsPayload) => Promise<void>;
  savePathIndex: (nextPaths: PathMeta[]) => Promise<void>;
  saving: boolean;
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
  setHistoryRetentionPasses,
  setHistoryRetentionOptionsMax,
  setPathName,
  setPaths,
  setRuntimeState,
  setConfigOpen,
  setSelectedNodeId,
  setUpdaterSamples,
  toast,
}: UseAiPathsPersistenceArgs): UseAiPathsPersistenceResult {
  const queryClient = useQueryClient();
  const updateAiPathsSettingsMutation = useMutation({
    mutationFn: async (
      payloads: Array<{ key: string; value: string }>
    ): Promise<Array<{ key: string; value: string }>> =>
      await updateAiPathsSettingsBulk(payloads),
    onSuccess: (): void => {
      void invalidateAiPathSettings(queryClient);
    },
  });
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [autoSaveAt, setAutoSaveAt] = useState<string | null>(null);
  const [uiStateLoaded, setUiStateLoaded] = useState(false);

  const lastSavedSnapshotRef = useRef<string | null>(null);
  const lastUiStatePayloadRef = useRef<string>('');
  const lastSettingsPayloadRef = useRef<string>('');
  const lastUserPrefsActivePathIdRef = useRef<string | null>(null);
  const loadAttemptRef = useRef<number | null>(null);
  const loadInFlightRef = useRef(false);
  const nodesRef = useRef<AiNode[]>(nodes);
  const edgesRef = useRef<Edge[]>(edges);
  const pathsRef = useRef<PathMeta[]>(paths);
  const pathConfigsRef = useRef<Record<string, PathConfig>>(pathConfigs);

  useEffect((): void => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect((): void => {
    edgesRef.current = edges;
  }, [edges]);
  useEffect((): void => {
    pathsRef.current = paths;
  }, [paths]);
  useEffect((): void => {
    pathConfigsRef.current = pathConfigs;
  }, [pathConfigs]);

  const normalizeHistoryRetentionPasses = useCallback((value: unknown): number => {
    const parsed =
      typeof value === 'number'
        ? value
        : Number.parseInt(typeof value === 'string' ? value : '', 10);
    if (!Number.isFinite(parsed) || parsed < AI_PATHS_HISTORY_RETENTION_MIN) {
      return AI_PATHS_HISTORY_RETENTION_DEFAULT;
    }
    return Math.min(
      AI_PATHS_HISTORY_RETENTION_MAX,
      Math.max(AI_PATHS_HISTORY_RETENTION_MIN, Math.trunc(parsed))
    );
  }, []);
  const normalizeHistoryRetentionOptionsMax = useCallback((value: unknown): number => {
    const parsed =
      typeof value === 'number'
        ? value
        : Number.parseInt(typeof value === 'string' ? value : '', 10);
    if (!Number.isFinite(parsed) || parsed < AI_PATHS_HISTORY_RETENTION_MIN) {
      return AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_DEFAULT;
    }
    return Math.min(
      AI_PATHS_HISTORY_RETENTION_MAX,
      Math.max(AI_PATHS_HISTORY_RETENTION_MIN, Math.trunc(parsed))
    );
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
      await updateAiPathsSettingsMutation.mutateAsync(payload);
    },
    [updateAiPathsSettingsMutation]
  );

  const persistUiState = useCallback(
    async (payload: AiPathsUiState): Promise<void> => {
      await updateAiPathsSettingsMutation.mutateAsync([
        { key: AI_PATHS_UI_STATE_KEY, value: JSON.stringify(payload) },
      ]);
    },
    [updateAiPathsSettingsMutation]
  );
  const persistUserPreferences = useCallback(async (pathId: string | null): Promise<void> => {
    await api.patch('/api/user/preferences', {
      aiPathsActivePathId: pathId,
    });
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
        logClientError(error, { context: { source: 'useAiPathsPersistence', action: 'persistActivePathPreference', pathId: resolved } });
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
        const [data, userPreferences] = await Promise.all([
          fetchAiPathsSettingsCached({ bypassCache: true }),
          (async (): Promise<AiPathsUserPreferences | null> => {
            try {
              return await api.get<AiPathsUserPreferences>('/api/user/preferences', {
                cache: 'no-store',
                logError: false,
              });
            } catch {
              return null;
            }
          })(),
        ]);
        const map = new Map(
          data.map((item: { key: string; value: string }): [string, string] => [
            item.key,
            item.value,
          ])
        );
        const historyRetentionRaw = map.get(AI_PATHS_HISTORY_RETENTION_KEY);
        const normalizedHistoryRetentionPasses = normalizeHistoryRetentionPasses(historyRetentionRaw);
        const historyRetentionOptionsMaxRaw = map.get(
          AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_KEY
        );
        const normalizedHistoryRetentionOptionsMax = normalizeHistoryRetentionOptionsMax(
          historyRetentionOptionsMaxRaw
        );
        setHistoryRetentionPasses(normalizedHistoryRetentionPasses);
        setHistoryRetentionOptionsMax(normalizedHistoryRetentionOptionsMax);
        const uiStateRaw = map.get(AI_PATHS_UI_STATE_KEY);
        const uiStateParsed = uiStateRaw ? safeParseJson(uiStateRaw).value : null;
        const uiState =
          uiStateParsed && typeof uiStateParsed === 'object'
            ? (uiStateParsed as Record<string, unknown>)
            : null;
        const preferredPathIdFromUi =
          typeof uiState?.['activePathId'] === 'string' ? uiState?.['activePathId'] : null;
        const preferredPathIdFromUser =
          typeof userPreferences?.['aiPathsActivePathId'] === 'string' &&
          userPreferences['aiPathsActivePathId'].trim().length > 0
            ? userPreferences['aiPathsActivePathId'].trim()
            : null;
        const preferredGroups = Array.isArray(uiState?.['expandedGroups'])
          ? (uiState?.['expandedGroups'] as unknown[]).filter(
            (value: unknown): value is string =>
              typeof value === 'string' && value.trim().length > 0
          )
          : null;
        const preferredPaletteCollapsed =
          typeof uiState?.['paletteCollapsed'] === 'boolean'
            ? uiState?.['paletteCollapsed']
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
        const migrationPayload: PersistSettingsPayload = [];
        if ((historyRetentionRaw?.trim() ?? '') !== String(normalizedHistoryRetentionPasses)) {
          migrationPayload.push({
            key: AI_PATHS_HISTORY_RETENTION_KEY,
            value: String(normalizedHistoryRetentionPasses),
          });
        }
        if (
          historyRetentionOptionsMaxRaw !== undefined &&
          historyRetentionOptionsMaxRaw.trim() !== String(normalizedHistoryRetentionOptionsMax)
        ) {
          migrationPayload.push({
            key: AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_KEY,
            value: String(normalizedHistoryRetentionOptionsMax),
          });
        }
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
              let dbNodePresetsChanged = false;
              const normalized = parsed.map((item: DbNodePreset): DbNodePreset => {
                const preset = normalizeDbNodePreset(item);
                const migration = migrateDatabaseConfigCollections(preset.config);
                if (!migration.changed || !migration.databaseConfig) {
                  return preset;
                }
                dbNodePresetsChanged = true;
                return {
                  ...preset,
                  config: migration.databaseConfig,
                };
              });
              if (dbNodePresetsChanged) {
                migrationPayload.push({
                  key: DB_NODE_PRESETS_KEY,
                  value: JSON.stringify(normalized),
                });
              }
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
                const mergedConfig: PathConfig = {
                  ...parsedConfig,
                  id: meta.id,
                  name: parsedConfig.name || meta.name,
                };
                const migration = migratePathConfigCollections(mergedConfig);
                settingsConfigs[meta.id] = migration.config;
                if (migration.changed) {
                  migrationPayload.push({
                    key: `${PATH_CONFIG_PREFIX}${meta.id}`,
                    value: JSON.stringify(migration.config),
                  });
                }
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
          const fallback = createDefaultPathConfig('default');
          configs[fallback.id] = fallback;
          metas = [createPathMeta(fallback)];
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
          migrationPayload.push({
            key: PATH_INDEX_KEY,
            value: JSON.stringify(normalizedMetas),
          });
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
        if (migrationPayload.length > 0) {
          try {
            await updateAiPathsSettingsMutation.mutateAsync(migrationPayload);
          } catch (error) {
            logClientError(error, { context: { source: 'useAiPathsPersistence', action: 'loadConfigMigration' } });
          }
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
    updateAiPathsSettingsMutation,
    normalizeConfigForHash,
    normalizeHistoryRetentionPasses,
    normalizeHistoryRetentionOptionsMax,
    persistLastError,
    setLoading,
    setHistoryRetentionPasses,
    setHistoryRetentionOptionsMax,
  ]);

  useEffect((): void | (() => void) => {
    if (!uiStateLoaded) return;
    const expandedGroups = Array.from(expandedPaletteGroups).sort();
    const payload: AiPathsUiState = {
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
        logClientError(error, { context: { source: 'useAiPathsPersistence', action: 'autoPersistUiState' } });
      });
      if (shouldPersistUserPrefs) {
        void persistUserPreferences(nextActivePathId)
          .then(() => {
            lastUserPrefsActivePathIdRef.current = nextActivePathId;
          })
          .catch((error: unknown) => {
            logClientError(error, { context: { source: 'useAiPathsPersistence', action: 'autoPersistUserPrefs', pathId: nextActivePathId } });
          });
      }
    }, 200);
    return (): void => clearTimeout(timeout);
  }, [activePathId, expandedPaletteGroups, paletteCollapsed, uiStateLoaded, persistUiState, persistUserPreferences]);

  const persistPathSettings = useCallback(
    async (
      nextPaths: PathMeta[],
      configId: string,
      config: PathConfig
    ): Promise<PathConfig | null> => {
      const sanitizedConfig = sanitizePathConfig(config);
      const payloadKey = stableStringify({
        index: nextPaths,
        configId,
        config: normalizeConfigForHash(sanitizedConfig),
      });
      if (payloadKey === lastSettingsPayloadRef.current) return sanitizedConfig;
      const responses = await updateAiPathsSettingsMutation.mutateAsync([
        { key: PATH_INDEX_KEY, value: JSON.stringify(nextPaths) },
        {
          key: `${PATH_CONFIG_PREFIX}${configId}`,
          value: JSON.stringify(sanitizedConfig),
        },
      ]);
      lastSettingsPayloadRef.current = payloadKey;
      const configResponse = responses[1];
      if (!configResponse) return sanitizedConfig;
      try {
        const payload = configResponse as { key?: unknown; value?: unknown };
        if (
          payload &&
          typeof payload.key === 'string' &&
          payload.key === `${PATH_CONFIG_PREFIX}${configId}` &&
          typeof payload.value === 'string'
        ) {
          const parsed = safeParseJson(payload.value).value;
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as PathConfig;
          }
        }
      } catch {
        // Fallback to the client-side sanitized config when response payload parsing fails.
      }
      return sanitizedConfig;
    },
    [normalizeConfigForHash, updateAiPathsSettingsMutation]
  );

  const persistRuntimePathState = useCallback(
    async (
      configId: string,
      config: PathConfig
    ): Promise<void> => {
      const payload = JSON.stringify(sanitizePathConfig(config));
      await updateAiPathsSettingsMutation.mutateAsync([
        { key: `${PATH_CONFIG_PREFIX}${configId}`, value: payload },
      ]);
    },
    [updateAiPathsSettingsMutation]
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
    (nameOverride?: string): string =>
      stableStringify({
        activePathId,
        name: nameOverride ?? pathName,
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
    (
      updatedAt: string,
      nodesOverride?: AiNode[],
      nameOverride?: string,
      edgesOverride?: Edge[]
    ): PathConfig => ({
      id: activePathId ?? 'default',
      version: STORAGE_VERSION,
      name: nameOverride ?? pathName,
      description: pathDescription,
      trigger: activeTrigger,
      executionMode,
      flowIntensity,
      runMode,
      nodes: nodesOverride ?? nodesRef.current,
      edges: edgesOverride ?? edgesRef.current,
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
      pathNameOverride?: string | undefined;
      nodesOverride?: AiNode[] | undefined;
      nodeOverride?: AiNode | undefined;
      edgesOverride?: Edge[] | undefined;
    }): Promise<boolean> => {
      if (!activePathId) return false;
      const silent = options?.silent ?? false;
      const force = options?.force ?? false;
      const includeNodeConfig = options?.includeNodeConfig ?? true;
      const resolvedName = options?.pathNameOverride ?? pathName;
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
        const snapshot = buildPathSnapshot(resolvedName);
        if (snapshot && snapshot === lastSavedSnapshotRef.current) {
          return true;
        }
      }
      if (!silent) setSaving(true);
      try {
        const updatedAt = new Date().toISOString();
        const baseNodes = options?.nodesOverride ?? nodesRef.current;
        const resolvedNodes = options?.nodeOverride
          ? (() => {
            const targetNode = options.nodeOverride;
            let replaced = false;
            const next = baseNodes.map((node: AiNode): AiNode => {
              if (node.id !== targetNode.id) return node;
              replaced = true;
              return targetNode;
            });
            return replaced ? next : [...next, targetNode];
          })()
          : baseNodes;
        const nodesForSave = includeNodeConfig
          ? resolvedNodes
          : buildNodesForAutoSave(resolvedNodes);
        const config = buildActivePathConfig(
          updatedAt,
          nodesForSave,
          resolvedName,
          options?.edgesOverride
        );
        const nextPaths = pathsRef.current.map((path: PathMeta): PathMeta =>
          path.id === activePathId ? { ...path, name: resolvedName, updatedAt } : path
        );
        const persistedConfig = await persistPathSettings(nextPaths, activePathId, config);
        const finalConfig = persistedConfig ?? config;
        if (options?.nodeOverride) {
          const expectedNode = options.nodeOverride;
          const persistedNode = finalConfig.nodes.find(
            (node: AiNode): boolean => node.id === expectedNode.id
          );
          const expectedConfigHash = stableStringify(expectedNode.config ?? null);
          const persistedConfigHash = stableStringify(persistedNode?.config ?? null);
          if (!persistedNode || expectedConfigHash !== persistedConfigHash) {
            throw new Error(`Node save verification failed for ${expectedNode.id}`);
          }
        }
        const finalUpdatedAt =
          typeof finalConfig.updatedAt === 'string' && finalConfig.updatedAt.trim().length > 0
            ? finalConfig.updatedAt
            : updatedAt;
        const finalPaths = nextPaths.map((path: PathMeta): PathMeta =>
          path.id === activePathId ? { ...path, updatedAt: finalUpdatedAt } : path
        );
        setPathConfigs({ ...pathConfigsRef.current, [activePathId]: finalConfig });
        setPaths(finalPaths);
        setLastError(null);
        void persistLastError(null);
        lastSavedSnapshotRef.current = buildPathSnapshot(resolvedName);
        if (!silent) {
          toast('AI Paths saved.', { variant: 'success' });
        }
        return true;
      } catch (error) {
        reportAiPathsError(
          error,
          { action: silent ? 'savePathSilent' : 'savePath', pathId: activePathId },
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
      buildActivePathConfig,
      buildNodesForAutoSave,
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
      pathNameOverride?: string | undefined;
      nodesOverride?: AiNode[] | undefined;
      nodeOverride?: AiNode | undefined;
      edgesOverride?: Edge[] | undefined;
    }): Promise<boolean> => {
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
        return false;
      }
      const ok = await persistPathConfig({
        force: options?.force ?? true,
        silent,
        includeNodeConfig: options?.includeNodeConfig,
        pathNameOverride: options?.pathNameOverride,
        nodesOverride: options?.nodesOverride,
        nodeOverride: options?.nodeOverride,
        edgesOverride: options?.edgesOverride,
      });
      if (silent) return ok;
      if (ok) {
        setAutoSaveStatus('saved');
        setAutoSaveAt(new Date().toISOString());
      } else {
        setAutoSaveStatus('error');
      }
      return ok;
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
    persistRuntimePathState,
    persistSettingsBulk,
    savePathIndex,
    saving,
  };
}
