 
import React, { useCallback } from 'react';

import type {
  AiNode,
  Edge,
  ParserSampleState,
  PathBlockedRunPolicy,
  PathConfig,
  PathExecutionMode,
  PathFlowIntensity,
  AiPathsValidationConfig,
  PathMeta,
  PathRunMode,
  RuntimeState,
  UpdaterSampleState,
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
  EMPTY_RUNTIME_STATE,
  normalizeAiPathsValidationConfig,
  normalizeNodes,
  sanitizeEdges,
  migratePathConfigCollections,
  repairPathNodeIdentities,
  triggers,
} from '@/shared/lib/ai-paths';
import {
  deleteAiPathsSettings,
  fetchAiPathsSettingsCached,
  fetchAiPathsSettingsByKeysCached,
} from '@/shared/lib/ai-paths/settings-store-client';

import {
  normalizeParserSamples,
  normalizeUpdaterSamples,
  parseRuntimeState,
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
  setActivePathId: React.Dispatch<React.SetStateAction<string | null>>;
  isPathLocked: boolean;
  pathConfigs: Record<string, PathConfig>;
  setPathConfigs: React.Dispatch<React.SetStateAction<Record<string, PathConfig>>>;
  paths: PathMeta[];
  setPaths: React.Dispatch<React.SetStateAction<PathMeta[]>>;
  setNodes: React.Dispatch<React.SetStateAction<AiNode[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  setPathName: React.Dispatch<React.SetStateAction<string>>;
  setPathDescription: React.Dispatch<React.SetStateAction<string>>;
  setActiveTrigger: React.Dispatch<React.SetStateAction<string>>;
  setExecutionMode: React.Dispatch<React.SetStateAction<PathExecutionMode>>;
  setFlowIntensity: React.Dispatch<React.SetStateAction<PathFlowIntensity>>;
  setRunMode: React.Dispatch<React.SetStateAction<PathRunMode>>;
  setStrictFlowMode: React.Dispatch<React.SetStateAction<boolean>>;
  setBlockedRunPolicy: React.Dispatch<React.SetStateAction<PathBlockedRunPolicy>>;
  setAiPathsValidation: React.Dispatch<React.SetStateAction<AiPathsValidationConfig>>;
  setParserSamples: React.Dispatch<React.SetStateAction<Record<string, ParserSampleState>>>;
  setUpdaterSamples: React.Dispatch<React.SetStateAction<Record<string, UpdaterSampleState>>>;
  setRuntimeState: React.Dispatch<React.SetStateAction<RuntimeState>>;
  setLastRunAt: React.Dispatch<React.SetStateAction<string | null>>;
  setIsPathLocked: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPathActive: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  setConfigOpen: React.Dispatch<React.SetStateAction<boolean>>;
  normalizeTriggerLabel: (value?: string | null) => string;
  updateActivePathMeta: (name: string) => void;
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
  setActivePathId,
  isPathLocked,
  pathConfigs,
  setPathConfigs,
  paths,
  setPaths,
  setNodes,
  setEdges,
  setPathName,
  setPathDescription,
  setActiveTrigger,
  setExecutionMode,
  setFlowIntensity,
  setRunMode,
  setStrictFlowMode,
  setBlockedRunPolicy,
  setAiPathsValidation,
  setParserSamples,
  setUpdaterSamples,
  setRuntimeState,
  setLastRunAt,
  setIsPathLocked,
  setIsPathActive,
  setSelectedNodeId,
  setConfigOpen,
  normalizeTriggerLabel,
  updateActivePathMeta,
  persistPathSettings,
  persistSettingsBulk,
  persistActivePathPreference,
  reportAiPathsError,
  confirm,
  toast,
}: UseAiPathsSettingsPathActionsInput): UseAiPathsSettingsPathActionsReturn {
  const switchRequestSeqRef = React.useRef(0);

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
      const migratedConfig = migratePathConfigCollections(config).config;
      const repairedConfig = repairPathNodeIdentities(migratedConfig).config;
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
          : repairedConfig.runMode === 'queue'
            ? 'automatic'
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
      let nextRuntimeState: RuntimeState = EMPTY_RUNTIME_STATE;
      try {
        nextRuntimeState = parseRuntimeState(repairedConfig.runtimeState);
      } catch (error) {
        console.warn(
          '[AI Paths] Failed to parse runtime state while applying path config. Using empty state.',
          {
            context: 'useAiPathsSettingsPathActions.applyPathConfigState',
            error: error instanceof Error ? error.message : String(error),
          }
        );
      }
      setRuntimeState(nextRuntimeState);
      setLastRunAt(repairedConfig.lastRunAt ?? null);
      setIsPathLocked(Boolean(repairedConfig.isLocked));
      setIsPathActive(repairedConfig.isActive !== false);

      const preferredNodeId = repairedConfig.uiState?.selectedNodeId ?? null;
      const resolvedNodeId =
        preferredNodeId && normalized.some((node: AiNode): boolean => node.id === preferredNodeId)
          ? preferredNodeId
          : (normalized[0]?.id ?? null);
      setSelectedNodeId(resolvedNodeId);
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
      setSelectedNodeId,
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
    updateActivePathMeta(resetConfig.name);
  }, [
    activePathId,
    applyPathConfigState,
    isPathLocked,
    setPathConfigs,
    toast,
    updateActivePathMeta,
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
      const duplicateBaseConfig: PathConfig = {
        ...sourceConfig,
        id: duplicateId,
        name: duplicateName,
        nodes: JSON.parse(JSON.stringify(sourceConfig.nodes ?? [])) as AiNode[],
        edges: JSON.parse(JSON.stringify(sourceConfig.edges ?? [])) as Edge[],
        updatedAt: now,
        isLocked: false,
        runtimeState: {},
        lastRunAt: null,
        runCount: 0,
        uiState: {
          selectedNodeId: sourceConfig.uiState?.selectedNodeId ?? null,
          configOpen: false,
        },
      };
      const repairedDuplicateConfig = repairPathNodeIdentities(
        migratePathConfigCollections(duplicateBaseConfig).config
      ).config;
      const duplicatedNodes = normalizeNodes(repairedDuplicateConfig.nodes);
      const duplicatedEdges = sanitizeEdges(duplicatedNodes, repairedDuplicateConfig.edges);
      const selectedNodeId = repairedDuplicateConfig.uiState?.selectedNodeId ?? null;
      const resolvedSelectedNodeId =
        selectedNodeId &&
        duplicatedNodes.some((node: AiNode): boolean => node.id === selectedNodeId)
          ? selectedNodeId
          : (duplicatedNodes[0]?.id ?? null);

      const duplicateConfig: PathConfig = {
        ...repairedDuplicateConfig,
        nodes: duplicatedNodes,
        edges: duplicatedEdges,
        uiState: {
          selectedNodeId: resolvedSelectedNodeId,
          configOpen: false,
        },
      };
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

      const applyIfLatest = (config: PathConfig): void => {
        if (switchRequestSeqRef.current !== nextRequestSeq) return;
        setActivePathId(value);
        applyPathConfigState(config);
        void persistActivePathPreference(value);
      };

      const cachedConfig = pathConfigs[value];
      if (cachedConfig) {
        applyIfLatest(cachedConfig);
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

          config = migratePathConfigCollections(config).config;
          config = repairPathNodeIdentities(config).config;
          config.nodes = normalizeNodes(config.nodes);

          setPathConfigs((prev: Record<string, PathConfig>): Record<string, PathConfig> => ({
            ...prev,
            [value]: config,
          }));
          applyIfLatest(config);
        } catch (error) {
          try {
            const allSettings = await fetchAiPathsSettingsCached();
            if (switchRequestSeqRef.current !== nextRequestSeq) return;
            const configItem = allSettings.find((item) => item.key === `${PATH_CONFIG_PREFIX}${value}`);
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
              recoveredConfig = migratePathConfigCollections(recoveredConfig).config;
              recoveredConfig = repairPathNodeIdentities(recoveredConfig).config;
              recoveredConfig.nodes = normalizeNodes(recoveredConfig.nodes);
              setPathConfigs((prev: Record<string, PathConfig>): Record<string, PathConfig> => ({
                ...prev,
                [value]: recoveredConfig,
              }));
              applyIfLatest(recoveredConfig);
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
      setActivePathId,
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
