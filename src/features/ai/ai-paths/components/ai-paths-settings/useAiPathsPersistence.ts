'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useGraphActions } from '@/features/ai/ai-paths/context/GraphContext';
import { usePersistenceActions } from '@/features/ai/ai-paths/context/PersistenceContext';
import { useRuntimeActions } from '@/features/ai/ai-paths/context/RuntimeContext';
import { useSelectionActions } from '@/features/ai/ai-paths/context/SelectionContext';
import type { LastErrorInfo } from '@/shared/contracts/ai-paths-runtime-ui-types';
import type { PathConfig, PathMeta } from '@/shared/lib/ai-paths';
import { AI_PATHS_HISTORY_RETENTION_KEY, AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_KEY, AI_PATHS_LAST_ERROR_KEY, PATH_CONFIG_PREFIX, PATH_INDEX_KEY, createDefaultPathConfig, normalizeNodes, sanitizeEdges, normalizeAiPathsValidationConfig, stableStringify } from '@/shared/lib/ai-paths';
import { loadCanonicalStoredPathConfig } from '@/shared/lib/ai-paths/core/utils/stored-path-config';
import {
  normalizeParserSamples,
  normalizeUpdaterSamples,
  parseRuntimeState,
} from '@/shared/lib/ai-paths/core/utils/runtime-state';
import {
  fetchAiPathsSettingsByKeysCached,
  updateAiPathsSettingsBulk,
} from '@/shared/lib/ai-paths/settings-store-client';
import { logSystemEvent } from '@/shared/lib/observability/system-logger-client';
import {
  logClientCatch,
  logClientError,
} from '@/shared/utils/observability/client-error-logger';

import {
  normalizeHistoryRetentionOptionsMax,
  normalizeHistoryRetentionPasses,
  normalizeLoadedPathMetas,
  resolvePathSaveBlockedMessage,
} from './useAiPathsPersistence.helpers';
import { usePathPersistence } from './hooks/persistence/usePathPersistence';
import { usePreferencePersistence } from './hooks/persistence/usePreferencePersistence';
import { usePresetPersistence } from './hooks/persistence/usePresetPersistence';
import {
  type AiPathsUiState,
  type PathSaveOptions,
  type UseAiPathsPersistenceArgs,
  type UseAiPathsPersistenceResult,
  resolvePreferredActivePathId,
} from './useAiPathsPersistence.types';


const PATH_CONFIG_PREFETCH_BATCH_SIZE = 3;
const PATH_CONFIG_PREFETCH_IDLE_DELAY_MS = 250;
const PATH_CONFIG_PREFETCH_TIMEOUT_MS = 6_000;

export function useAiPathsPersistence(
  args: UseAiPathsPersistenceArgs
): UseAiPathsPersistenceResult {
  const {
    activePathId,
    expandedPaletteGroups,
    setExpandedPaletteGroups,
    normalizeTriggerLabel,
    loadNonce,
    loading,
    paletteCollapsed,
    setPaletteCollapsed,
    pathConfigs,
    reportAiPathsError,
    toast,
    isPathLocked,
    isPathActive,
    isPathTreeVisible,
    paths,
    setIsPathTreeVisible,
  } = args;
  const {
    setNodes,
    setEdges,
    setPathConfigs,
    setPaths,
    setActivePathId,
    setPathName,
    setPathDescription,
    setActiveTrigger,
    setExecutionMode,
    setFlowIntensity,
    setRunMode,
    setStrictFlowMode,
    setBlockedRunPolicy,
    setAiPathsValidation,
    setHistoryRetentionPasses,
    setHistoryRetentionOptionsMax,
    setIsPathLocked,
    setIsPathActive,
  } = useGraphActions();
  const { setRuntimeState, setParserSamples, setUpdaterSamples, setLastRunAt } =
    useRuntimeActions();
  const { setLoading } = usePersistenceActions();
  const { selectNode, setConfigOpen } = useSelectionActions();

  const [uiStateLoaded, setUiStateLoaded] = useState(false);
  const loadInFlightRef = useRef(false);
  const settingsWriteQueueRef = useRef<Promise<void>>(Promise.resolve());
  const prefetchedPathIdsRef = useRef<Set<string>>(new Set());

  const stringifyForStorage = useCallback((value: unknown, label: string): string => {
    try {
      return JSON.stringify(value);
    } catch (error) {
      logClientCatch(error, {
        source: 'useAiPathsPersistence',
        action: 'stringifyForStorage',
        label,
      });
      return '';
    }
  }, []);

  const enqueueSettingsWrite = useCallback(async <T>(operation: () => Promise<T>): Promise<T> => {
    const promise = settingsWriteQueueRef.current.then(operation);
    settingsWriteQueueRef.current = promise.then(() => {}).catch(() => {});
    return promise;
  }, []);

  const resolveLoadedPathConfig = useCallback(
    (payload: string, pathId: string): PathConfig => {
      return loadCanonicalStoredPathConfig({
        pathId,
        rawConfig: payload,
      });
    },
    []
  );

  const persistLastError = useCallback(
    async (error: LastErrorInfo | null): Promise<void> => {
      const message = error?.message ?? null;
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
          'ai_paths_ui_state',
          'ai_paths_trigger_buttons',
        ];
        const stageAStartedAt = Date.now();
        const baseSettings = await fetchAiPathsSettingsByKeysCached(baseKeys, { timeoutMs: 8_000 });
        const stageADurationMs = Date.now() - stageAStartedAt;
        const userPrefs = prefs.resolveUserPreferences(baseSettings);
        const uiState = prefs.resolveUiState(baseSettings);

        if (uiState?.expandedGroups) {
          setExpandedPaletteGroups(new Set(uiState.expandedGroups));
        }
        if (typeof uiState?.paletteCollapsed === 'boolean') {
          setPaletteCollapsed(uiState.paletteCollapsed);
        }
        if (typeof uiState?.pathTreeVisible === 'boolean') {
          setIsPathTreeVisible(uiState.pathTreeVisible);
        }

        if (uiState) {
          prefs.lastUiStatePayloadRef.current = stableStringify({
            expandedGroups: uiState.expandedGroups ?? Array.from(expandedPaletteGroups).sort(),
            paletteCollapsed: uiState.paletteCollapsed ?? paletteCollapsed,
            pathTreeVisible: uiState.pathTreeVisible ?? isPathTreeVisible,
          });
        }

        const pathIndexItem = baseSettings.find((s) => s.key === PATH_INDEX_KEY);
        let rawPaths: PathMeta[] = [];
        try {
          if (pathIndexItem?.value) rawPaths = JSON.parse(pathIndexItem.value) as PathMeta[];
        } catch (error) {
          logClientError(error);
        
          /* ignore */
        }
        const loadedPaths = normalizeLoadedPathMetas(rawPaths);
        setPaths(loadedPaths);

        const historyPassesItem = baseSettings.find(
          (s) => s.key === AI_PATHS_HISTORY_RETENTION_KEY
        );
        setHistoryRetentionPasses(normalizeHistoryRetentionPasses(historyPassesItem?.value));

        const historyMaxItem = baseSettings.find(
          (s) => s.key === AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_KEY
        );
        setHistoryRetentionOptionsMax(normalizeHistoryRetentionOptionsMax(historyMaxItem?.value));

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
        const activeConfigSettings = await fetchAiPathsSettingsByKeysCached([activeConfigKey], {
          timeoutMs: 10_000,
        });
        const configItem = activeConfigSettings.find((item) => item.key === activeConfigKey);
        if (!configItem?.value) {
          throw new Error(`Stored AI Path config not found for "${resolvedActivePathId}".`);
        }
        const config = resolveLoadedPathConfig(configItem.value, resolvedActivePathId);
        const stageBDurationMs = Date.now() - stageBStartedAt;

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
          config.runMode === 'automatic' ||
          config.runMode === 'manual' ||
          config.runMode === 'step'
            ? config.runMode
            : 'manual'
        );
        setStrictFlowMode(config.strictFlowMode !== false);
        setBlockedRunPolicy(
          config.blockedRunPolicy === 'complete_with_warning'
            ? 'complete_with_warning'
            : 'fail_run'
        );
        setAiPathsValidation(normalizeAiPathsValidationConfig(config.aiPathsValidation));
        setParserSamples(normalizeParserSamples(config.parserSamples));
        setUpdaterSamples(normalizeUpdaterSamples(config.updaterSamples));
        setRuntimeState(parseRuntimeState(config.runtimeState));
        setLastRunAt(config.lastRunAt ?? null);
        setIsPathLocked(Boolean(config.isLocked));
        setIsPathActive(config.isActive !== false);
        const preferredNodeId = config.uiState?.selectedNodeId ?? null;
        const selectedNodeId =
          preferredNodeId && normalizedNodes.some((node): boolean => node.id === preferredNodeId)
            ? preferredNodeId
            : (normalizedNodes[0]?.id ?? null);
        selectNode(selectedNodeId);
        setConfigOpen(false);

        if (resolvedActivePathId !== preferredActivePathId) {
          void prefs.persistActivePathPreference(resolvedActivePathId);
        }

        const totalDurationMs = Date.now() - loadStartedAt;
        if (totalDurationMs >= 300) {
          void logSystemEvent({
            source: 'ai.paths.persistence',
            message: 'Hydrated active canvas path',
            level: 'info',
            context: {
              durationMs: totalDurationMs,
              stageA: stageADurationMs,
              stageB: stageBDurationMs,
              pathCount: loadedPaths.length,
              activePathId: resolvedActivePathId,
            },
          });
        }
        setUiStateLoaded(true);
      } catch (error) {
        logClientError(error);
        const errorDetail = error instanceof Error && error.message ? `: ${error.message}` : '';
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
      pathTreeVisible: isPathTreeVisible,
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
  }, [activePathId, expandedPaletteGroups, isPathTreeVisible, paletteCollapsed, uiStateLoaded, prefs]);

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
    prefetchedPathIdsRef.current = new Set();
  }, [loadNonce]);

  useEffect((): void | (() => void) => {
    if (loading) return;
    if (!activePathId) return;
    if (paths.length <= 1) return;

    const pendingPathIds = paths
      .map((path) => path.id)
      .filter(
        (pathId): pathId is string =>
          typeof pathId === 'string' &&
          pathId.trim().length > 0 &&
          pathId !== activePathId &&
          !pathConfigs[pathId] &&
          !prefetchedPathIdsRef.current.has(pathId)
      );
    if (pendingPathIds.length === 0) return;

    let cancelled = false;
    let idleHandle: number | null = null;
    let fallbackTimerId: number | null = null;

    const runPrefetch = async (): Promise<void> => {
      const startedAt = Date.now();
      for (let index = 0; index < pendingPathIds.length; index += PATH_CONFIG_PREFETCH_BATCH_SIZE) {
        if (cancelled) return;
        const batch = pendingPathIds.slice(index, index + PATH_CONFIG_PREFETCH_BATCH_SIZE);
        if (batch.length === 0) continue;
        batch.forEach((pathId) => {
          prefetchedPathIdsRef.current.add(pathId);
        });
        const keys = batch.map((pathId) => `${PATH_CONFIG_PREFIX}${pathId}`);
        try {
          const settings = await fetchAiPathsSettingsByKeysCached(keys, {
            timeoutMs: PATH_CONFIG_PREFETCH_TIMEOUT_MS,
          });
          if (cancelled) return;
          const settingByKey = new Map(settings.map((item) => [item.key, item]));
          const hydratedConfigs: Record<string, PathConfig> = {};
          batch.forEach((pathId) => {
            const item = settingByKey.get(`${PATH_CONFIG_PREFIX}${pathId}`);
            if (!item?.value) return;
            try {
              hydratedConfigs[pathId] = resolveLoadedPathConfig(item.value, pathId);
            } catch (error) {
              logClientCatch(error, {
                source: 'useAiPathsPersistence',
                action: 'prefetchParsePathConfig',
                pathId,
              });
            }
          });
          const hydratedPathIds = Object.keys(hydratedConfigs);
          if (hydratedPathIds.length > 0) {
            setPathConfigs((prev) => {
              const next = { ...prev };
              hydratedPathIds.forEach((pathId) => {
                if (!next[pathId]) {
                  next[pathId] = hydratedConfigs[pathId] as PathConfig;
                }
              });
              return next;
            });
          }
        } catch (error) {
          logClientCatch(error, {
            source: 'useAiPathsPersistence',
            action: 'prefetchPathConfigBatch',
            batchSize: batch.length,
            level: 'warn',
          });
        }
      }
      const durationMs = Date.now() - startedAt;
      if (durationMs >= 200) {
        void logSystemEvent({
          source: 'ai.paths.persistence',
          message: 'Prefetched non-active path configs',
          level: 'info',
          context: {
            durationMs,
            pathCount: pendingPathIds.length,
          },
        });
      }
    };

    if (typeof window !== 'undefined') {
      const idleWindow = window as Window & {
        requestIdleCallback?: (
          callback: (deadline: IdleDeadline) => void,
          options?: IdleRequestOptions
        ) => number;
        cancelIdleCallback?: (handle: number) => void;
      };
      if (typeof idleWindow.requestIdleCallback === 'function') {
        idleHandle = idleWindow.requestIdleCallback(
          () => {
            void runPrefetch();
          },
          { timeout: 1_500 }
        );
      } else {
        fallbackTimerId = window.setTimeout(() => {
          void runPrefetch();
        }, PATH_CONFIG_PREFETCH_IDLE_DELAY_MS);
      }
    } else {
      void runPrefetch();
    }

    return (): void => {
      cancelled = true;
      if (typeof window !== 'undefined') {
        const idleWindow = window as Window & {
          cancelIdleCallback?: (handle: number) => void;
        };
        if (idleHandle !== null && typeof idleWindow.cancelIdleCallback === 'function') {
          idleWindow.cancelIdleCallback(idleHandle);
        }
        if (fallbackTimerId !== null) {
          window.clearTimeout(fallbackTimerId);
        }
      }
    };
  }, [
    activePathId,
    loading,
    pathConfigs,
    paths,
    resolveLoadedPathConfig,
    setPathConfigs,
  ]);

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
            { key: PATH_INDEX_KEY, value: JSON.stringify(nextPaths) },
          ]);
        }
        toast('Path list saved.', { variant: 'success' });
      } catch (error) {
        logClientError(error);
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
    persistSettingsBulk: presets.persistSettingsBulk,
    savePathIndex,
    saving: path.saving,
  };
}
