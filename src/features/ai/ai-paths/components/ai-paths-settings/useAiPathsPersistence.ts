'use client';

 

import { useCallback, useEffect, useRef, useState } from 'react';

import type { PathConfig, PathMeta, AiPathsValidationConfig } from '@/shared/lib/ai-paths';
import {
  AI_PATHS_HISTORY_RETENTION_KEY,
  AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_KEY,
  AI_PATHS_LAST_ERROR_KEY,
  PATH_CONFIG_PREFIX,
  PATH_INDEX_KEY,
  EMPTY_RUNTIME_STATE,
  createDefaultPathConfig,
  normalizeNodes,
  sanitizeEdges,
  normalizeAiPathsValidationConfig,
  migratePathConfigCollections,
  repairPathNodeIdentities,
  stableStringify,
} from '@/shared/lib/ai-paths';
import {
  fetchAiPathsSettingsByKeysCached,
  updateAiPathsSettingsBulk,
} from '@/shared/lib/ai-paths/settings-store-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  normalizeHistoryRetentionOptionsMax,
  normalizeHistoryRetentionPasses,
  normalizeLoadedPathMetas,
  resolvePathSaveBlockedMessage,
} from './useAiPathsPersistence.helpers';
import {
  normalizeParserSamples,
  normalizeUpdaterSamples,
  parseRuntimeState,
} from '../AiPathsSettingsUtils';
import {
  type AiPathsUiState,
  type PathSaveOptions,
  type UseAiPathsPersistenceArgs,
  type UseAiPathsPersistenceResult,
  resolvePreferredActivePathId,
} from './useAiPathsPersistence.types';

import { usePreferencePersistence } from './hooks/persistence/usePreferencePersistence';
import { usePathPersistence } from './hooks/persistence/usePathPersistence';
import { usePresetPersistence } from './hooks/persistence/usePresetPersistence';

export function useAiPathsPersistence(
  args: UseAiPathsPersistenceArgs
): UseAiPathsPersistenceResult {
  const {
    activePathId,
    expandedPaletteGroups,
    normalizeTriggerLabel,
    loadNonce,
    loading,
    paletteCollapsed,
    pathConfigs,
    reportAiPathsError,
    setAiPathsValidation,
    setActivePathId,
    setActiveTrigger,
    setBlockedRunPolicy,
    setConfigOpen,
    setEdges,
    setExecutionMode,
    setFlowIntensity,
    setHistoryRetentionOptionsMax,
    setHistoryRetentionPasses,
    setIsPathActive,
    setIsPathLocked,
    setLastRunAt,
    setLoading,
    setNodes,
    setParserSamples,
    setPathDescription,
    setPathConfigs,
    setPathName,
    setPaths,
    setRunMode,
    setRuntimeState,
    setSelectedNodeId,
    setStrictFlowMode,
    setUpdaterSamples,
    toast,
    isPathLocked,
    isPathActive,
  } = args;

  const [uiStateLoaded, setUiStateLoaded] = useState(false);
  const loadInFlightRef = useRef(false);
  const settingsWriteQueueRef = useRef<Promise<void>>(Promise.resolve());

  const stringifyForStorage = useCallback((value: unknown, label: string): string => {
    try {
      return JSON.stringify(value);
    } catch (error) {
      logClientError(error, {
        context: { source: 'useAiPathsPersistence', action: 'stringifyForStorage', label },
      });
      return '';
    }
  }, []);

  const enqueueSettingsWrite = useCallback(async <T>(operation: () => Promise<T>): Promise<T> => {
    const promise = settingsWriteQueueRef.current.then(operation);
    settingsWriteQueueRef.current = promise.then(() => {}).catch(() => {});
    return promise;
  }, []);

  const persistLastError = useCallback(
    async (error: unknown): Promise<void> => {
      const message = error instanceof Error ? error.message : error ? String(error) : null;
      await enqueueSettingsWrite(async (): Promise<void> => {
        await updateAiPathsSettingsBulk([{ key: AI_PATHS_LAST_ERROR_KEY, value: message ?? '' }]);
      });
    },
    [enqueueSettingsWrite]
  );

  const core = { enqueueSettingsWrite, stringifyForStorage, persistLastError };

  const prefs = usePreferencePersistence(args, core);
  const path = usePathPersistence(args, core);
  const presets = usePresetPersistence(args, core);

  useEffect((): void => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    setLoading(true);

    const loadConfig = async (): Promise<void> => {
      const loadStartedAt = Date.now();
      try {
        const baseKeys = [
          PATH_INDEX_KEY,
          'user_preferences',
          AI_PATHS_HISTORY_RETENTION_KEY,
          AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_KEY,
          'ai_paths_validation_v1',
          'ai_paths_ui_state',
          'ai_paths_trigger_buttons',
        ];
        const stageAStartedAt = Date.now();
        const baseSettings = await fetchAiPathsSettingsByKeysCached(baseKeys, { timeoutMs: 8_000 });
        const stageADurationMs = Date.now() - stageAStartedAt;
        const userPrefs = prefs.resolveUserPreferences(baseSettings);

        const pathIndexItem = baseSettings.find((s) => s.key === PATH_INDEX_KEY);
        let rawPaths: PathMeta[] = [];
        try {
          if (pathIndexItem?.value) rawPaths = JSON.parse(pathIndexItem.value) as PathMeta[];
        } catch {
          /* ignore */
        }
        const loadedPaths = normalizeLoadedPathMetas(rawPaths);
        setPaths(loadedPaths);

        const historyPassesItem = baseSettings.find((s) => s.key === AI_PATHS_HISTORY_RETENTION_KEY);
        setHistoryRetentionPasses(normalizeHistoryRetentionPasses(historyPassesItem?.value));

        const historyMaxItem = baseSettings.find(
          (s) => s.key === AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_KEY
        );
        setHistoryRetentionOptionsMax(normalizeHistoryRetentionOptionsMax(historyMaxItem?.value));

        const validationItem = baseSettings.find((s) => s.key === 'ai_paths_validation_v1');
        if (validationItem?.value) {
          try {
            setAiPathsValidation(JSON.parse(validationItem.value) as AiPathsValidationConfig);
          } catch {
            // ignore
          }
        }

        const preferredActivePathId = resolvePreferredActivePathId(userPrefs);
        const fallbackActivePathId = loadedPaths[0]?.id ?? null;
        const resolvedActivePathId =
          preferredActivePathId &&
          loadedPaths.some((path: PathMeta): boolean => path.id === preferredActivePathId)
            ? preferredActivePathId
            : fallbackActivePathId;

        if (!resolvedActivePathId) {
          setUiStateLoaded(true);
          return;
        }

        const activeConfigKey = `${PATH_CONFIG_PREFIX}${resolvedActivePathId}`;
        const stageBStartedAt = Date.now();
        let config: PathConfig = createDefaultPathConfig(resolvedActivePathId);
        try {
          const activeConfigSettings = await fetchAiPathsSettingsByKeysCached([activeConfigKey], {
            timeoutMs: 10_000,
          });
          const configItem = activeConfigSettings.find((item) => item.key === activeConfigKey);
          if (configItem?.value) {
            try {
              config = JSON.parse(configItem.value) as PathConfig;
            } catch (error) {
              logClientError(error, {
                context: {
                  source: 'useAiPathsPersistence',
                  action: 'parsePathConfig',
                  pathId: resolvedActivePathId,
                },
              });
            }
          }
        } catch (error) {
          logClientError(error, {
            context: {
              source: 'useAiPathsPersistence',
              action: 'loadActivePathConfig',
              pathId: resolvedActivePathId,
              level: 'warn',
            },
          });
        }
        const stageBDurationMs = Date.now() - stageBStartedAt;
        try {
          config = migratePathConfigCollections(config).config;
          config = repairPathNodeIdentities(config).config;
          config.nodes = normalizeNodes(config.nodes);
        } catch (error) {
          logClientError(error, {
            context: { source: 'useAiPathsPersistence', action: 'loadConfigMigration' },
          });
        }

        setActivePathId(resolvedActivePathId);
        setPathConfigs((prev) => ({ ...prev, [resolvedActivePathId]: config }));

        const normalizedNodes = normalizeNodes(config.nodes);
        setNodes(normalizedNodes);
        setEdges(sanitizeEdges(normalizedNodes, config.edges));
        setPathName(config.name);
        setPathDescription(config.description);
        setActiveTrigger(normalizeTriggerLabel(config.trigger));
        setExecutionMode(
          config.executionMode === 'local' || config.executionMode === 'server'
            ? config.executionMode
            : 'server'
        );
        setFlowIntensity(
          config.flowIntensity === 'off' ||
            config.flowIntensity === 'low' ||
            config.flowIntensity === 'medium' ||
            config.flowIntensity === 'high'
            ? config.flowIntensity
            : 'medium'
        );
        setRunMode(
          config.runMode === 'automatic' || config.runMode === 'manual' || config.runMode === 'step'
            ? config.runMode
            : config.runMode === 'queue'
              ? 'automatic'
              : 'manual'
        );
        setStrictFlowMode(config.strictFlowMode !== false);
        setBlockedRunPolicy(
          config.blockedRunPolicy === 'complete_with_warning' ? 'complete_with_warning' : 'fail_run'
        );
        setAiPathsValidation(normalizeAiPathsValidationConfig(config.aiPathsValidation));
        setParserSamples(normalizeParserSamples(config.parserSamples));
        setUpdaterSamples(normalizeUpdaterSamples(config.updaterSamples));
        let nextRuntimeState = EMPTY_RUNTIME_STATE;
        try {
          nextRuntimeState = parseRuntimeState(config.runtimeState);
        } catch (error) {
          console.warn('[AI Paths] Failed to parse runtime state while loading path config.', {
            context: 'useAiPathsPersistence.loadConfig',
            error: error instanceof Error ? error.message : String(error),
          });
        }
        setRuntimeState(nextRuntimeState);
        setLastRunAt(config.lastRunAt ?? null);
        setIsPathLocked(Boolean(config.isLocked));
        setIsPathActive(config.isActive !== false);
        const preferredNodeId = config.uiState?.selectedNodeId ?? null;
        const selectedNodeId =
          preferredNodeId && normalizedNodes.some((node): boolean => node.id === preferredNodeId)
            ? preferredNodeId
            : (normalizedNodes[0]?.id ?? null);
        setSelectedNodeId(selectedNodeId);
        setConfigOpen(false);

        if (resolvedActivePathId !== preferredActivePathId) {
          void prefs.persistActivePathPreference(resolvedActivePathId);
        }

        const totalDurationMs = Date.now() - loadStartedAt;
        if (totalDurationMs >= 300) {
          console.info('[ai-paths-load] hydrated active canvas path', {
            durationMs: totalDurationMs,
            stageA: stageADurationMs,
            stageB: stageBDurationMs,
            pathCount: loadedPaths.length,
            activePathId: resolvedActivePathId,
          });
        }
        setUiStateLoaded(true);
      } catch (error) {
        const errorDetail =
          error instanceof Error && error.message ? `: ${error.message}` : '';
        reportAiPathsError(
          error,
          { action: 'loadConfig' },
          `Failed to load AI Paths settings${errorDetail}`
        );
        toast(`Failed to load AI Paths settings${errorDetail}`, { variant: 'error' });
      } finally {
        loadInFlightRef.current = false;
        setLoading(false);
      }
    };
    void loadConfig();
  }, [loadNonce]);

  useEffect((): void | (() => void) => {
    if (!uiStateLoaded) return;
    const expandedGroups = Array.from(expandedPaletteGroups).sort();
    const uiState: AiPathsUiState = {
      expandedGroups,
      paletteCollapsed,
    };
    const payloadKey = stableStringify(uiState);
    if (payloadKey === prefs.lastUiStatePayloadRef.current) return;
    prefs.lastUiStatePayloadRef.current = payloadKey;
    const nextActivePathId = activePathId ?? null;
    const shouldPersistUserPrefs = nextActivePathId !== prefs.lastUserPrefsActivePathIdRef.current;

    const timeout = setTimeout((): void => {
      void prefs.persistUiState(uiState).catch((error: unknown) => {
        logClientError(error, {
          context: { source: 'useAiPathsPersistence', action: 'autoPersistUiState' },
        });
      });
      if (shouldPersistUserPrefs) {
        void prefs
          .persistUserPreferences(nextActivePathId)
          .then(() => {
            prefs.lastUserPrefsActivePathIdRef.current = nextActivePathId;
          })
          .catch((error: unknown) => {
            logClientError(error, {
              context: {
                source: 'useAiPathsPersistence',
                action: 'autoPersistUserPrefs',
                pathId: nextActivePathId,
              },
            });
          });
      }
    }, 200);
    return (): void => clearTimeout(timeout);
  }, [activePathId, expandedPaletteGroups, paletteCollapsed, uiStateLoaded, prefs]);

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
      const ok = await path.persistPathConfig({
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
        path.setAutoSaveStatus('saved');
        path.setAutoSaveAt(new Date().toISOString());
      } else {
        path.setAutoSaveStatus('error');
      }
      return ok;
    },
    [isPathActive, isPathLocked, path, toast]
  );

  useEffect((): void => {
    if (loading || !activePathId) return;
    path.lastSavedSnapshotRef.current = path.buildPathSnapshot();
  }, [activePathId, loading]);

  useEffect((): void => {
    if (loading || !activePathId) return;
    const snapshot = path.buildPathSnapshot();
    if (path.lastSavedSnapshotRef.current && snapshot !== path.lastSavedSnapshotRef.current) {
      if (path.autoSaveStatus !== 'idle') {
        path.setAutoSaveStatus('idle');
      }
      if (path.autoSaveAt) {
        path.setAutoSaveAt(null);
      }
    }
  }, [activePathId, path, loading]);

  const savePathIndex = useCallback(
    async (nextPaths: PathMeta[]): Promise<void> => {
      try {
        if (activePathId) {
          const activeConfig = pathConfigs[activePathId] ?? createDefaultPathConfig(activePathId);
          await path.persistPathSettings(nextPaths, activePathId, activeConfig);
        } else {
          await presets.persistSettingsBulk([
            { key: 'ai_paths_index_v1', value: JSON.stringify(nextPaths) },
          ]);
        }
        toast('Path list saved.', { variant: 'success' });
      } catch (error) {
        reportAiPathsError(error, { action: 'savePathIndex' }, 'Failed to save path list:');
        toast('Failed to save path list.', { variant: 'error' });
      }
    },
    [activePathId, pathConfigs, path, presets, reportAiPathsError, toast]
  );

  return {
    autoSaveAt: path.autoSaveAt,
    autoSaveStatus: path.autoSaveStatus,
    handleSave,
    persistActivePathPreference: prefs.persistActivePathPreference,
    persistPathSettings: path.persistPathSettings,
    persistRuntimePathState: path.persistRuntimePathState,
    persistSettingsBulk: presets.persistSettingsBulk,
    savePathIndex,
    saving: path.saving,
  };
}
