import React, { useCallback } from 'react';

import type {
  AiNode,
  PathConfig,
  PathMeta,
} from '@/shared/lib/ai-paths';
import {
  PATH_CONFIG_PREFIX,
  PATH_DEBUG_PREFIX,
  PATH_INDEX_KEY,
  STORAGE_VERSION,
  DEFAULT_AI_PATHS_VALIDATION_CONFIG,
  PATH_TEMPLATES,
  buildPathConfigFromTemplate,
  createAiDescriptionPath,
  createDefaultPathConfig,
  createPathId,
  createPathMeta,
  duplicatePathConfig,
  normalizeAiPathsValidationConfig,
  normalizeNodes,
  sanitizeEdges,
  triggers,
} from '@/shared/lib/ai-paths';
import {
  deleteAiPathsSettings,
  fetchAiPathsSettingsCached,
  fetchAiPathsSettingsByKeysCached,
} from '@/shared/lib/ai-paths/settings-store-client';
import { useGraphActions } from '@/features/ai/ai-paths/context/GraphContext';
import { useRuntimeActions } from '@/features/ai/ai-paths/context/RuntimeContext';
import { useSelectionActions } from '@/features/ai/ai-paths/context/SelectionContext';
import { usePersistenceActions } from '@/features/ai/ai-paths/context/PersistenceContext';

import {
  normalizeParserSamples,
  normalizeUpdaterSamples,
  parseRuntimeState,
  sanitizePathConfig,
} from '../AiPathsSettingsUtils';

type ConfirmFn = (input: {
  title: string;
  message: string;
  confirmText: string;
  isDangerous: boolean;
  onConfirm: () => void | Promise<void>;
}) => void;

type ToastFn = (
  message: string,
  options?: {
    variant?: 'info' | 'success' | 'warning' | 'error';
  }
) => void;

type UseAiPathsSettingsPathActionsInput = {
  activePathId: string | null;
  isPathLocked: boolean;
  pathConfigs: Record<string, PathConfig>;
  paths: PathMeta[];
  normalizeTriggerLabel: (value?: string | null) => string;
  persistPathSettings: (
    nextPaths: PathMeta[],
    nextActivePathId: string,
    nextConfig: PathConfig
  ) => Promise<void>;
  persistSettingsBulk: (entries: Array<{ key: string; value: string }>) => Promise<void>;
  persistActivePathPreference: (pathId: string) => Promise<void>;
  reportAiPathsError: (
    error: unknown,
    context: Record<string, unknown>,
    fallbackMessage?: string
  ) => void;
  confirm: ConfirmFn;
  toast: ToastFn;
};

const SWITCH_PATH_FETCH_TIMEOUT_MS = 25_000;

export type UseAiPathsSettingsPathActionsReturn = {
  handleReset: () => void;
  handleCreatePath: () => void;
  handleCreateAiDescriptionPath: () => void;
  handleCreateFromTemplate: (templateId: string) => void;
  handleDuplicatePath: (pathId?: string) => void;
  handleDeletePath: (pathId?: string) => Promise<void>;
  handleSwitchPath: (pathId: string) => void;
};

export function useAiPathsSettingsPathActions({
  activePathId,
  isPathLocked,
  pathConfigs,
  paths,
  normalizeTriggerLabel,
  persistPathSettings,
  persistSettingsBulk,
  persistActivePathPreference,
  reportAiPathsError,
  confirm,
  toast,
}: UseAiPathsSettingsPathActionsInput): UseAiPathsSettingsPathActionsReturn {
  const {
    setNodes,
    setEdges,
    setPaths,
    setPathConfigs,
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
    setIsPathLocked,
    setIsPathActive,
  } = useGraphActions();
  const { setRuntimeState, setParserSamples, setUpdaterSamples, setLastRunAt } =
    useRuntimeActions();
  const { selectNode, setConfigOpen } = useSelectionActions();
  const { setIsPathSwitching } = usePersistenceActions();
  const switchRequestSeqRef = React.useRef(0);

  const sanitizePathConfigWithRuntimeFallback = useCallback(
    (config: PathConfig, pathId: string): PathConfig => {
      try {
        return sanitizePathConfig(config);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const errorMeta =
          typeof error === 'object' && error !== null && 'meta' in error
            ? (error as { meta?: unknown }).meta
            : null;
        const errorReason =
          errorMeta && typeof errorMeta === 'object' && !Array.isArray(errorMeta)
            ? (errorMeta as Record<string, unknown>)['reason']
            : null;
        const shouldRetryWithEmptyRuntime =
          errorReason === 'unsupported_runtime_identity_fields' ||
          message.includes('Invalid AI Paths runtime state payload');
        if (!shouldRetryWithEmptyRuntime) {
          throw error;
        }
        console.warn('[AI Paths] Recovering selected path from invalid runtime state.', {
          pathId,
          error: message,
        });
        return sanitizePathConfig({
          ...config,
          runtimeState: '',
        });
      }
    },
    []
  );

  const resolveDuplicatePathName = useCallback(
    (sourceName: string): string => {
      const baseName = sourceName.trim() || 'Untitled Path';
      const names = new Set(
        paths
          .map((path: PathMeta): string => path.name?.trim() || '')
          .filter((name: string): boolean => name.length > 0)
          .map((name: string): string => name.toLowerCase())
      );
      const firstCandidate = `${baseName} (Copy)`;
      if (!names.has(firstCandidate.toLowerCase())) {
        return firstCandidate;
      }
      let copyNumber = 2;
      while (copyNumber <= 9999) {
        const candidate = `${baseName} (Copy ${copyNumber})`;
        if (!names.has(candidate.toLowerCase())) {
          return candidate;
        }
        copyNumber += 1;
      }
      return `${baseName} (Copy ${Date.now().toString(36)})`;
    },
    [paths]
  );

  const applyPathConfigState = useCallback(
    (config: PathConfig): void => {
      const repairedConfig = sanitizePathConfig(config);
      const normalized = normalizeNodes(repairedConfig.nodes);
      setNodes(normalized);
      setEdges(sanitizeEdges(normalized, repairedConfig.edges));
      setPathName(repairedConfig.name);
      setPathDescription(repairedConfig.description);
      setActiveTrigger(normalizeTriggerLabel(repairedConfig.trigger));
      setExecutionMode(
        repairedConfig.executionMode === 'local' || repairedConfig.executionMode === 'server'
          ? repairedConfig.executionMode
          : 'server'
      );
      setFlowIntensity(
        repairedConfig.flowIntensity === 'off' ||
          repairedConfig.flowIntensity === 'low' ||
          repairedConfig.flowIntensity === 'medium' ||
          repairedConfig.flowIntensity === 'high'
          ? repairedConfig.flowIntensity
          : 'medium'
      );
      setRunMode(
        repairedConfig.runMode === 'automatic' ||
          repairedConfig.runMode === 'manual' ||
          repairedConfig.runMode === 'step'
          ? repairedConfig.runMode
          : 'manual'
      );
      setStrictFlowMode(repairedConfig.strictFlowMode !== false);
      setBlockedRunPolicy(
        repairedConfig.blockedRunPolicy === 'complete_with_warning'
          ? 'complete_with_warning'
          : 'fail_run'
      );
      setAiPathsValidation(normalizeAiPathsValidationConfig(repairedConfig.aiPathsValidation));
      setParserSamples(normalizeParserSamples(repairedConfig.parserSamples));
      setUpdaterSamples(normalizeUpdaterSamples(repairedConfig.updaterSamples));
      setRuntimeState(parseRuntimeState(repairedConfig.runtimeState));
      setLastRunAt(repairedConfig.lastRunAt ?? null);
      setIsPathLocked(Boolean(repairedConfig.isLocked));
      setIsPathActive(repairedConfig.isActive !== false);

      const preferredNodeId = repairedConfig.uiState?.selectedNodeId ?? null;
      const resolvedNodeId =
        preferredNodeId && normalized.some((node: AiNode): boolean => node.id === preferredNodeId)
          ? preferredNodeId
          : (normalized[0]?.id ?? null);
      selectNode(resolvedNodeId);
      setConfigOpen(false);
    },
    [
      normalizeTriggerLabel,
      setActiveTrigger,
      setConfigOpen,
      setEdges,
      setExecutionMode,
      setFlowIntensity,
      setIsPathActive,
      setIsPathLocked,
      setLastRunAt,
      setNodes,
      setParserSamples,
      setPathDescription,
      setPathName,
      setRunMode,
      setStrictFlowMode,
      setBlockedRunPolicy,
      setAiPathsValidation,
      setRuntimeState,
      selectNode,
      setUpdaterSamples,
    ]
  );

  const handleReset = useCallback((): void => {
    if (!activePathId) return;
    if (isPathLocked) {
      toast('This path is locked. Unlock it to edit nodes or connections.', {
        variant: 'info',
      });
      return;
    }

    const resetConfig = createDefaultPathConfig(activePathId);
    applyPathConfigState(resetConfig);
    setPathConfigs(
      (prev: Record<string, PathConfig>): Record<string, PathConfig> => ({
        ...prev,
        [activePathId]: resetConfig,
      })
    );
  }, [
    activePathId,
    applyPathConfigState,
    isPathLocked,
    setPathConfigs,
    toast,
  ]);

  const handleCreatePath = useCallback((): void => {
    const id = createPathId();
    const now = new Date().toISOString();
    const name = `New Path ${paths.length + 1}`;
    const config: PathConfig = {
      id,
      version: STORAGE_VERSION,
      name,
      description: '',
      trigger: triggers[0] ?? 'Product Modal - Context Filter',
      executionMode: 'server',
      flowIntensity: 'medium',
      runMode: 'manual',
      strictFlowMode: true,
      aiPathsValidation: normalizeAiPathsValidationConfig(DEFAULT_AI_PATHS_VALIDATION_CONFIG),
      nodes: [],
      edges: [],
      updatedAt: now,
      isLocked: false,
      isActive: true,
      parserSamples: {},
      updaterSamples: {},
      runtimeState: {},
      lastRunAt: null,
      runCount: 0,
      uiState: {
        selectedNodeId: null,
        configOpen: false,
      },
    };
    const meta: PathMeta = {
      id,
      name,
      createdAt: now,
      updatedAt: now,
    };
    setPaths((prev: PathMeta[]): PathMeta[] => [...prev, meta]);
    setPathConfigs(
      (prev: Record<string, PathConfig>): Record<string, PathConfig> => ({
        ...prev,
        [id]: config,
      })
    );
    setActivePathId(id);
    applyPathConfigState(config);
  }, [applyPathConfigState, paths.length, setActivePathId, setPathConfigs, setPaths]);

  const handleCreateAiDescriptionPath = useCallback((): void => {
    const id = createPathId();
    const config = createAiDescriptionPath(id);
    const now = new Date().toISOString();
    const meta: PathMeta = {
      id,
      name: config.name,
      createdAt: now,
      updatedAt: now,
    };
    setPaths((prev: PathMeta[]): PathMeta[] => [...prev, meta]);
    setPathConfigs(
      (prev: Record<string, PathConfig>): Record<string, PathConfig> => ({
        ...prev,
        [id]: config,
      })
    );
    setActivePathId(id);
    applyPathConfigState(config);
    toast('AI Description Path created.', { variant: 'success' });
  }, [applyPathConfigState, setActivePathId, setPathConfigs, setPaths, toast]);

  const handleCreateFromTemplate = useCallback(
    (templateId: string): void => {
      const template = PATH_TEMPLATES.find((t) => t.templateId === templateId);
      if (!template) {
        toast(`Path template "${templateId}" not found.`, { variant: 'error' });
        return;
      }
      const id = createPathId();
      const config = buildPathConfigFromTemplate(id, template);
      const meta = createPathMeta(config);
      setPaths((prev: PathMeta[]): PathMeta[] => [...prev, meta]);
      setPathConfigs(
        (prev: Record<string, PathConfig>): Record<string, PathConfig> => ({
          ...prev,
          [id]: config,
        })
      );
      setActivePathId(id);
      applyPathConfigState(config);
      toast(`Path "${template.name}" created from template.`, { variant: 'success' });
    },
    [applyPathConfigState, setActivePathId, setPathConfigs, setPaths, toast]
  );

  const handleDuplicatePath = useCallback(
    (pathId?: string): void => {
      const sourceId = pathId ?? activePathId;
      if (!sourceId) return;

      const sourceConfig = pathConfigs[sourceId] ?? createDefaultPathConfig(sourceId);
      const sourceMeta = paths.find((path: PathMeta): boolean => path.id === sourceId);
      const duplicateId = createPathId();
      const now = new Date().toISOString();
      const duplicateName = resolveDuplicatePathName(
        sourceMeta?.name || sourceConfig.name || `Path ${sourceId.slice(0, 6)}`
      );
      const duplicateConfig = duplicatePathConfig({
        sourceConfig,
        duplicateId,
        duplicateName,
        updatedAt: now,
      });
      const duplicateMeta: PathMeta = {
        id: duplicateId,
        name: duplicateName,
        createdAt: now,
        updatedAt: now,
      };

      setPaths((prev: PathMeta[]): PathMeta[] => [...prev, duplicateMeta]);
      setPathConfigs(
        (prev: Record<string, PathConfig>): Record<string, PathConfig> => ({
          ...prev,
          [duplicateId]: duplicateConfig,
        })
      );
      setActivePathId(duplicateId);
      applyPathConfigState(duplicateConfig);
      toast('Path duplicated.', { variant: 'success' });
    },
    [
      activePathId,
      applyPathConfigState,
      pathConfigs,
      paths,
      resolveDuplicatePathName,
      setActivePathId,
      setPathConfigs,
      setPaths,
      toast,
    ]
  );

  const handleDeletePath = useCallback(
    async (pathId?: string): Promise<void> => {
      const targetId = pathId ?? activePathId;
      if (!targetId) return;
      const targetPath = paths.find((path) => path.id === targetId);
      const label = targetPath?.name || targetId;

      confirm({
        title: 'Delete AI Path?',
        message: `Are you sure you want to delete "${label}"? This will permanently remove all node configurations and history for this path.`,
        confirmText: 'Delete Path',
        isDangerous: true,
        onConfirm: async () => {
          const nextPaths = paths.filter((path: PathMeta): boolean => path.id !== targetId);
          if (nextPaths.length === 0) {
            const fallbackId = 'default';
            const fallback = createDefaultPathConfig(fallbackId);
            const fallbackMeta = createPathMeta(fallback);
            setPaths([fallbackMeta]);
            setPathConfigs({ [fallbackId]: fallback });
            setActivePathId(fallbackId);
            applyPathConfigState(fallback);
            try {
              await persistSettingsBulk([
                { key: PATH_INDEX_KEY, value: JSON.stringify([fallbackMeta]) },
                {
                  key: `${PATH_CONFIG_PREFIX}${fallbackId}`,
                  value: JSON.stringify(fallback),
                },
              ]);
              if (targetId !== fallbackId) {
                await deleteAiPathsSettings([
                  `${PATH_CONFIG_PREFIX}${targetId}`,
                  `${PATH_DEBUG_PREFIX}${targetId}`,
                ]);
              }
            } catch (error) {
              reportAiPathsError(
                error,
                { action: 'deleteLastPathFallback', pathId: targetId },
                'Failed to persist fallback path:'
              );
              toast('Failed to persist fallback path.', { variant: 'error' });
            }
            toast('Cannot delete the last path. Reset to default instead.', {
              variant: 'info',
            });
            return;
          }

          const nextId = nextPaths[0]?.id ?? null;
          setPaths(nextPaths);
          const nextConfigs = { ...pathConfigs };
          delete nextConfigs[targetId];
          setPathConfigs(nextConfigs);
          if (nextId) {
            const nextConfig = nextConfigs[nextId] ?? createDefaultPathConfig(nextId);
            setActivePathId(nextId);
            applyPathConfigState(nextConfig);
          } else {
            setActivePathId(null);
          }

          try {
            if (nextId) {
              const nextConfig = nextConfigs[nextId] ?? createDefaultPathConfig(nextId);
              await persistPathSettings(nextPaths, nextId, nextConfig);
            } else {
              await persistSettingsBulk([
                { key: PATH_INDEX_KEY, value: JSON.stringify(nextPaths) },
              ]);
            }
            await deleteAiPathsSettings([
              `${PATH_CONFIG_PREFIX}${targetId}`,
              `${PATH_DEBUG_PREFIX}${targetId}`,
            ]);
            toast('Path removed from the index.', { variant: 'success' });
          } catch (error) {
            reportAiPathsError(
              error,
              { action: 'deletePath', pathId: targetId },
              'Failed to update path index:'
            );
            toast('Failed to update path index.', { variant: 'error' });
          }
        },
      });
    },
    [
      activePathId,
      applyPathConfigState,
      confirm,
      pathConfigs,
      paths,
      persistPathSettings,
      persistSettingsBulk,
      reportAiPathsError,
      setActivePathId,
      setPathConfigs,
      setPaths,
      toast,
    ]
  );

  const handleSwitchPath = useCallback(
    (value: string): void => {
      if (!value) return;
      const previousActivePathId = activePathId;
      const previousConfig = previousActivePathId ? pathConfigs[previousActivePathId] : null;
      const nextRequestSeq = switchRequestSeqRef.current + 1;
      switchRequestSeqRef.current = nextRequestSeq;
      setIsPathSwitching(true);
      const switchStartedAt = Date.now();

      const applyIfLatest = (
        config: PathConfig,
        phase: 'cache_hit' | 'selective_fetch' | 'fallback_fetch'
      ): void => {
        if (switchRequestSeqRef.current !== nextRequestSeq) return;
        setActivePathId(value);
        applyPathConfigState(config);
        setIsPathSwitching(false);
        const durationMs = Date.now() - switchStartedAt;
        if (durationMs >= 150) {
          console.info('[ai-paths-switch] applied path config', {
            pathId: value,
            phase,
            durationMs,
          });
        }
        void persistActivePathPreference(value);
      };

      const cachedConfig = pathConfigs[value];
      if (cachedConfig) {
        applyIfLatest(cachedConfig, 'cache_hit');
        return;
      }

      void (async (): Promise<void> => {
        try {
          const settings = await fetchAiPathsSettingsByKeysCached(
            [`${PATH_CONFIG_PREFIX}${value}`],
            { timeoutMs: SWITCH_PATH_FETCH_TIMEOUT_MS }
          );
          if (switchRequestSeqRef.current !== nextRequestSeq) return;

          const configItem = settings.find((item) => item.key === `${PATH_CONFIG_PREFIX}${value}`);
          let config: PathConfig = createDefaultPathConfig(value);
          if (configItem?.value) {
            try {
              config = JSON.parse(configItem.value) as PathConfig;
            } catch (error) {
              reportAiPathsError(
                error,
                { action: 'switchPathParseConfig', pathId: value },
                'Failed to parse selected path config:'
              );
            }
          }

          config = sanitizePathConfigWithRuntimeFallback(config, value);

          setPathConfigs(
            (prev: Record<string, PathConfig>): Record<string, PathConfig> => ({
              ...prev,
              [value]: config,
            })
          );
          applyIfLatest(config, 'selective_fetch');
        } catch (error) {
          try {
            const allSettings = await fetchAiPathsSettingsCached();
            if (switchRequestSeqRef.current !== nextRequestSeq) return;
            const configItem = allSettings.find(
              (item) => item.key === `${PATH_CONFIG_PREFIX}${value}`
            );
            if (configItem?.value) {
              let recoveredConfig = createDefaultPathConfig(value);
              try {
                recoveredConfig = JSON.parse(configItem.value) as PathConfig;
              } catch (parseError) {
                reportAiPathsError(
                  parseError,
                  { action: 'switchPathFallbackParseConfig', pathId: value },
                  'Failed to parse fallback selected path config:'
                );
              }
              recoveredConfig = sanitizePathConfigWithRuntimeFallback(recoveredConfig, value);
              setPathConfigs(
                (prev: Record<string, PathConfig>): Record<string, PathConfig> => ({
                  ...prev,
                  [value]: recoveredConfig,
                })
              );
              applyIfLatest(recoveredConfig, 'fallback_fetch');
              return;
            }
          } catch (fallbackError) {
            reportAiPathsError(
              fallbackError,
              { action: 'switchPathFallbackLoadConfig', pathId: value },
              'Failed to load fallback path config:'
            );
          }
          reportAiPathsError(
            error,
            { action: 'switchPathLoadConfig', pathId: value },
            'Failed to load selected path:'
          );
          if (switchRequestSeqRef.current !== nextRequestSeq) return;
          if (previousActivePathId) {
            setActivePathId(previousActivePathId);
            if (previousConfig) {
              applyPathConfigState(previousConfig);
            }
          } else {
            setActivePathId(null);
          }
          setIsPathSwitching(false);
          toast('Failed to load selected path. Try again in a moment.', { variant: 'error' });
        }
      })();
    },
    [
      activePathId,
      applyPathConfigState,
      pathConfigs,
      persistActivePathPreference,
      reportAiPathsError,
      sanitizePathConfigWithRuntimeFallback,
      setActivePathId,
      setIsPathSwitching,
      setPathConfigs,
      toast,
    ]
  );

  return {
    handleReset,
    handleCreatePath,
    handleCreateAiDescriptionPath,
    handleCreateFromTemplate,
    handleDuplicatePath,
    handleDeletePath,
    handleSwitchPath,
  };
}
