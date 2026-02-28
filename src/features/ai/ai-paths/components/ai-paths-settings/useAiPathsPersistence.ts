'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  PathConfig,
  PathMeta,
  AiPathsValidationConfig,
} from '@/shared/lib/ai-paths';
import {
  AI_PATHS_HISTORY_RETENTION_KEY,
  AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_KEY,
  AI_PATHS_LAST_ERROR_KEY,
  PATH_INDEX_KEY,
  createDefaultPathConfig,
  normalizeNodes,
  migratePathConfigCollections,
  repairPathNodeIdentities,
  stableStringify,
} from '@/shared/lib/ai-paths';
import {
  fetchAiPathsSettingsCached,
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
  type AiPathsUiState,
  type PathSaveOptions,
  type UseAiPathsPersistenceArgs,
  type UseAiPathsPersistenceResult,
} from './useAiPathsPersistence.types';

import { usePreferencePersistence } from './hooks/persistence/usePreferencePersistence';
import { usePathPersistence } from './hooks/persistence/usePathPersistence';
import { usePresetPersistence } from './hooks/persistence/usePresetPersistence';

export function useAiPathsPersistence(args: UseAiPathsPersistenceArgs): UseAiPathsPersistenceResult {
  const {
    activePathId,
    expandedPaletteGroups,
    loadNonce,
    loading,
    paletteCollapsed,
    pathConfigs,
    reportAiPathsError,
    setAiPathsValidation,
    setHistoryRetentionOptionsMax,
    setHistoryRetentionPasses,
    setLoading,
    setPathConfigs,
    setPaths,
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
      try {
        const settings = await fetchAiPathsSettingsCached();
        const userPrefs = await prefs.resolveUserPreferences();
        
        const pathIndexItem = settings.find((s) => s.key === PATH_INDEX_KEY);
        let rawPaths: PathMeta[] = [];
        try {
          if (pathIndexItem?.value) rawPaths = JSON.parse(pathIndexItem.value) as PathMeta[];
        } catch { /* ignore */ }
        const loadedPaths = normalizeLoadedPathMetas(rawPaths);
        setPaths(loadedPaths);

        const historyPassesItem = settings.find((s) => s.key === AI_PATHS_HISTORY_RETENTION_KEY);
        setHistoryRetentionPasses(normalizeHistoryRetentionPasses(historyPassesItem?.value));

        const historyMaxItem = settings.find(
          (s) => s.key === AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_KEY
        );
        setHistoryRetentionOptionsMax(normalizeHistoryRetentionOptionsMax(historyMaxItem?.value));

        const validationItem = settings.find((s) => s.key === 'ai_paths_validation_v1');
        if (validationItem?.value) {
          try {
            setAiPathsValidation(JSON.parse(validationItem.value) as AiPathsValidationConfig);
          } catch {
            // ignore
          }
        }

        if (userPrefs?.activePathId) {
          const configId = userPrefs.activePathId;
          const configItem = settings.find((s) => s.key === `path_config_${configId}`);
          if (configItem?.value) {
            try {
              let config = JSON.parse(configItem.value) as PathConfig;
              config = migratePathConfigCollections(config).config;
              config = repairPathNodeIdentities(config).config;
              config.nodes = normalizeNodes(config.nodes);
              setPathConfigs((prev) => ({ ...prev, [configId]: config }));
            } catch (error) {
              logClientError(error, {
                context: { source: 'useAiPathsPersistence', action: 'loadConfigMigration' },
              });
            }
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
        void prefs.persistUserPreferences(nextActivePathId)
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
          await presets.persistSettingsBulk([{ key: 'ai_paths_index_v1', value: JSON.stringify(nextPaths) }]);
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
