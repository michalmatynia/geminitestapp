'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  AiNode,
  ClusterPreset,
  DbNodePreset,
  DbQueryPreset,
  Edge,
  PathConfig,
  PathDebugSnapshot,
  PathMeta,
} from '@/features/ai/ai-paths/lib';
import {
  AI_PATHS_HISTORY_RETENTION_KEY,
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
import { createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { invalidateAiPathSettings } from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import {
  buildPersistedRuntimeState,
  parseRuntimeState,
  sanitizePathConfig,
} from '../AiPathsSettingsUtils';
import {
  buildNodesForAutoSave as buildNodesForAutoSaveHelper,
  lintPathNodeRoles,
  mergeNodeOverride,
  normalizeConfigForHash,
  normalizeHistoryRetentionOptionsMax,
  normalizeHistoryRetentionPasses,
  normalizeLoadedPathName,
  normalizeLoadedPathMetas,
  resolvePathSaveBlockedMessage,
  stripNodeConfig,
} from './useAiPathsPersistence.helpers';
import {
  USER_PREFERENCES_STALE_MS,
  resolvePreferredActivePathId,
  type AiPathsUiState,
  type AiPathsUserPreferences,
  type PathSaveOptions,
  type PersistSettingsPayload,
  type UseAiPathsPersistenceArgs,
  type UseAiPathsPersistenceResult,
} from './useAiPathsPersistence.types';

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
  strictFlowMode,
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
  setStrictFlowMode,
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
  const stringifyForStorage = useCallback((value: unknown, label: string): string => {
    const serialized = stableStringify(value);
    if (!serialized) {
      throw new Error(`Failed to serialize ${label} for AI Paths persistence.`);
    }
    return serialized;
  }, []);

  const queryClient = useQueryClient();
  const updateAiPathsSettingsMutation = createUpdateMutationV2({
    mutationKey: QUERY_KEYS.ai.aiPaths.mutation('settings.bulk-update'),
    mutationFn: async (
      payloads: Array<{ key: string; value: string }>
    ): Promise<Array<{ key: string; value: string }>> =>
      await updateAiPathsSettingsBulk(payloads),
    meta: {
      source: 'ai.ai-paths.settings.persistence.bulk-update',
      operation: 'update',
      resource: 'ai-paths.settings',
      domain: 'global',
      tags: ['ai-paths', 'settings', 'persistence'],
    },
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
  const settingsWriteQueueRef = useRef<Promise<void>>(Promise.resolve());
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

  const enqueueSettingsWrite = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T> => {
      const run = settingsWriteQueueRef.current.then(operation, operation);
      settingsWriteQueueRef.current = run.then(
        () => undefined,
        () => undefined
      );
      return await run;
    },
    []
  );

  const persistSettingsBulk = useCallback(
    async (payload: PersistSettingsPayload): Promise<void> => {
      await enqueueSettingsWrite(async (): Promise<void> => {
        await updateAiPathsSettingsMutation.mutateAsync(payload);
      });
    },
    [enqueueSettingsWrite, updateAiPathsSettingsMutation]
  );

  const persistUiState = useCallback(
    async (payload: AiPathsUiState): Promise<void> => {
      await enqueueSettingsWrite(async (): Promise<void> => {
        await updateAiPathsSettingsMutation.mutateAsync([
          { key: AI_PATHS_UI_STATE_KEY, value: JSON.stringify(payload) },
        ]);
      });
    },
    [enqueueSettingsWrite, updateAiPathsSettingsMutation]
  );
  const persistUserPreferences = useCallback(
    async (pathId: string | null): Promise<void> => {
      const updatedPreferences = await api.patch<AiPathsUserPreferences>(
        '/api/user/preferences',
        {
          aiPathsActivePathId: pathId,
        }
      );
      const nextPathId = resolvePreferredActivePathId(updatedPreferences) ?? pathId ?? null;
      const updateCachedPreferences = (
        current: AiPathsUserPreferences | undefined
      ): AiPathsUserPreferences => ({
        ...(current ?? {}),
        aiPathsActivePathId: nextPathId,
      });
      queryClient.setQueryData<AiPathsUserPreferences>(
        QUERY_KEYS.userPreferences.all,
        updateCachedPreferences
      );
      queryClient.setQueryData<AiPathsUserPreferences>(
        QUERY_KEYS.auth.preferences.detail('ai-paths'),
        updateCachedPreferences
      );
    },
    [queryClient]
  );
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

  const resolveUserPreferences = useCallback(
    async (): Promise<AiPathsUserPreferences | null> => {
      const cachedPreferences = queryClient.getQueryData<AiPathsUserPreferences>(
        QUERY_KEYS.userPreferences.all
      );
      if (cachedPreferences && typeof cachedPreferences === 'object') {
        return cachedPreferences;
      }
      try {
        return await queryClient.fetchQuery({
          queryKey: QUERY_KEYS.userPreferences.all,
          queryFn: async (): Promise<AiPathsUserPreferences> => {
            return await api.get<AiPathsUserPreferences>('/api/user/preferences', {
              logError: false,
            });
          },
          staleTime: USER_PREFERENCES_STALE_MS,
        });
      } catch {
        return null;
      }
    },
    [queryClient]
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
          resolveUserPreferences(),
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
        const preferredPathIdFromUser = resolvePreferredActivePathId(userPreferences);
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
          const parsedIndex = safeParseJson(indexRaw).value;
          if (Array.isArray(parsedIndex)) {
            settingsMetas = normalizeLoadedPathMetas(
              parsedIndex.filter(
                (meta: unknown): meta is PathMeta =>
                  Boolean(meta) && typeof meta === 'object'
              )
            );
          }
        }

        if (settingsMetas.length > 0) {
          settingsMetas.forEach((meta: PathMeta) => {
            const configRaw = map.get(`${PATH_CONFIG_PREFIX}${meta.id}`);
            if (configRaw) {
              try {
                const parsedConfig = JSON.parse(configRaw) as PathConfig;
                const resolvedName =
                  normalizeLoadedPathName(meta.id, parsedConfig.name) ||
                  normalizeLoadedPathName(meta.id, meta.name) ||
                  `Path ${meta.id.slice(0, 6)}`;
                const mergedConfig: PathConfig = {
                  ...parsedConfig,
                  id: meta.id,
                  name: resolvedName,
                };
                const migration = migratePathConfigCollections(mergedConfig);
                const normalizedRunCountRaw = migration.config.runCount;
                const normalizedRunCount =
                  typeof normalizedRunCountRaw === 'number' &&
                  Number.isFinite(normalizedRunCountRaw)
                    ? Math.max(0, Math.trunc(normalizedRunCountRaw))
                    : 0;
                const normalizedStrictFlowMode =
                  migration.config.strictFlowMode !== false;
                const normalizedConfig: PathConfig = {
                  ...migration.config,
                  runCount: normalizedRunCount,
                  strictFlowMode: normalizedStrictFlowMode,
                };
                settingsConfigs[meta.id] = normalizedConfig;
                if (
                  migration.changed ||
                  normalizedRunCountRaw !== normalizedRunCount ||
                  migration.config.strictFlowMode !== normalizedStrictFlowMode ||
                  normalizeLoadedPathName(meta.id, parsedConfig.name) !==
                    resolvedName
                ) {
                  migrationPayload.push({
                    key: `${PATH_CONFIG_PREFIX}${meta.id}`,
                    value: JSON.stringify(normalizedConfig),
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
          const normalizedSourceName = normalizeLoadedPathName(pathId, name);
          if (normalizedSourceName.length > 0) {
            return normalizedSourceName;
          }
          const configName = normalizeLoadedPathName(pathId, configs[pathId]?.name);
          if (configName.length > 0) {
            return configName;
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
        setExecutionMode(
          activeConfig.executionMode === 'local' || activeConfig.executionMode === 'server'
            ? activeConfig.executionMode
            : 'server'
        );
        setFlowIntensity(
          activeConfig.flowIntensity === 'off' ||
            activeConfig.flowIntensity === 'low' ||
            activeConfig.flowIntensity === 'medium' ||
            activeConfig.flowIntensity === 'high'
            ? activeConfig.flowIntensity
            : 'medium'
        );
        setRunMode(
          activeConfig.runMode === 'automatic' || activeConfig.runMode === 'manual' || activeConfig.runMode === 'step'
            ? activeConfig.runMode
            : activeConfig.runMode === 'queue'
              ? 'automatic'
              : 'manual'
        );
        setStrictFlowMode(activeConfig.strictFlowMode !== false);
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
            await enqueueSettingsWrite(async (): Promise<void> => {
              await updateAiPathsSettingsMutation.mutateAsync(migrationPayload);
            });
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
    enqueueSettingsWrite,
    persistLastError,
    resolveUserPreferences,
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
      const responses = await enqueueSettingsWrite(
        async (): Promise<Array<{ key: string; value: string }>> =>
          await updateAiPathsSettingsMutation.mutateAsync([
            { key: PATH_INDEX_KEY, value: stringifyForStorage(nextPaths, 'path index') },
            {
              key: `${PATH_CONFIG_PREFIX}${configId}`,
              value: stringifyForStorage(sanitizedConfig, `path config (${configId})`),
            },
          ])
      );
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
      const payload = stringifyForStorage(
        sanitizePathConfig(config),
        `runtime path config (${configId})`
      );
      await enqueueSettingsWrite(async (): Promise<void> => {
        await updateAiPathsSettingsMutation.mutateAsync([
          { key: `${PATH_CONFIG_PREFIX}${configId}`, value: payload },
        ]);
      });
    },
    [enqueueSettingsWrite, stringifyForStorage, updateAiPathsSettingsMutation]
  );

  const buildNodesForAutoSave = useCallback(
    (baseNodes: AiNode[] = nodes): AiNode[] =>
      buildNodesForAutoSaveHelper(baseNodes, activePathId, pathConfigs),
    [activePathId, nodes, pathConfigs]
  );

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
        strictFlowMode,
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
        runCount:
          activePathId &&
          typeof pathConfigs[activePathId]?.runCount === 'number' &&
          Number.isFinite(pathConfigs[activePathId]?.runCount)
            ? Math.max(0, Math.trunc(pathConfigs[activePathId]?.runCount ?? 0))
            : 0,
      }),
    [
      activePathId,
      pathName,
      pathDescription,
      activeTrigger,
      executionMode,
      flowIntensity,
      runMode,
      strictFlowMode,
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
      pathConfigs,
    ]
  );

  const buildActivePathConfig = useCallback(
    (
      updatedAt: string,
      nodesOverride?: AiNode[],
      nameOverride?: string,
      edgesOverride?: Edge[]
    ): PathConfig => {
      const existingVersionRaw = activePathId
        ? pathConfigsRef.current[activePathId]?.version
        : undefined;
      const existingVersion =
        typeof existingVersionRaw === 'number' && Number.isFinite(existingVersionRaw)
          ? Math.trunc(existingVersionRaw)
          : STORAGE_VERSION;
      const resolvedVersion = Math.max(STORAGE_VERSION, existingVersion);

      return {
        id: activePathId ?? 'default',
        version: resolvedVersion,
        name: nameOverride ?? pathName,
        description: pathDescription,
        trigger: activeTrigger,
        executionMode,
        flowIntensity,
        runMode,
        strictFlowMode,
        nodes: nodesOverride ?? nodesRef.current,
        edges: edgesOverride ?? edgesRef.current,
        updatedAt,
        isLocked: isPathLocked,
        isActive: isPathActive,
        parserSamples,
        updaterSamples,
        runtimeState,
        lastRunAt,
        runCount:
          activePathId &&
          typeof pathConfigsRef.current[activePathId]?.runCount === 'number' &&
          Number.isFinite(pathConfigsRef.current[activePathId]?.runCount)
            ? Math.max(0, Math.trunc(pathConfigsRef.current[activePathId]?.runCount ?? 0))
            : 0,
        uiState: {
          selectedNodeId,
        },
      };
    },
    [
      activePathId,
      pathName,
      pathDescription,
      activeTrigger,
      executionMode,
      flowIntensity,
      runMode,
      strictFlowMode,
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
    async (options?: PathSaveOptions): Promise<boolean> => {
      if (!activePathId) return false;
      const silent = options?.silent ?? false;
      const force = options?.force ?? false;
      const includeNodeConfig = options?.includeNodeConfig ?? true;
      const resolvedName = options?.pathNameOverride ?? pathName;
      const blockedMessage = resolvePathSaveBlockedMessage(isPathLocked, isPathActive);
      if (blockedMessage) {
        if (!silent) {
          toast(blockedMessage, { variant: 'info' });
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
        const resolvedNodes = mergeNodeOverride(baseNodes, options?.nodeOverride);
        const nodesForSave = includeNodeConfig
          ? resolvedNodes
          : buildNodesForAutoSave(resolvedNodes);
        const lintResult = lintPathNodeRoles(nodesForSave);
        if (lintResult.errors.length > 0) {
          const baselineNodes = pathConfigsRef.current[activePathId]?.nodes ?? [];
          const baselineLint = lintPathNodeRoles(
            Array.isArray(baselineNodes) ? baselineNodes : []
          );
          const baselineDuplicateCounts = new Map<string, number>(
            baselineLint.duplicateRoleTypes.map(
              (item: { type: string; count: number }): [string, number] => [item.type, item.count]
            )
          );
          const hasNewDuplicateRoleViolation = lintResult.duplicateRoleTypes.some(
            (item: { type: string; count: number }): boolean =>
              item.count > (baselineDuplicateCounts.get(item.type) ?? 1)
          );
          if (hasNewDuplicateRoleViolation) {
            if (!silent) {
              toast(lintResult.errors.join(' '), { variant: 'error' });
            }
            return false;
          }
        }
        if (!silent && lintResult.warnings.length > 0) {
          lintResult.warnings.forEach((message: string): void => {
            toast(message, { variant: 'info' });
          });
        }
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
    async (options?: PathSaveOptions): Promise<boolean> => {
      const silent = options?.silent ?? false;
      const blockedMessage = resolvePathSaveBlockedMessage(isPathLocked, isPathActive);
      if (blockedMessage) {
        if (!silent) {
          toast(blockedMessage, { variant: 'info' });
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
