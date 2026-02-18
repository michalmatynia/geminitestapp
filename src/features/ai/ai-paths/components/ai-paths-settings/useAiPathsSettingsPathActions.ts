import React, { useCallback } from 'react';

import type {
  AiNode,
  Edge,
  ParserSampleState,
  PathConfig,
  PathExecutionMode,
  PathFlowIntensity,
  PathMeta,
  PathRunMode,
  RuntimeState,
  UpdaterSampleState,
} from '@/features/ai/ai-paths/lib';
import {
  PATH_CONFIG_PREFIX,
  PATH_DEBUG_PREFIX,
  PATH_INDEX_KEY,
  STORAGE_VERSION,
  createAiDescriptionPath,
  createDefaultPathConfig,
  createPathId,
  createPathMeta,
  normalizeNodes,
  sanitizeEdges,
  triggers,
} from '@/features/ai/ai-paths/lib';
import { deleteAiPathsSettings } from '@/features/ai/ai-paths/lib/settings-store-client';

import { parseRuntimeState } from '../AiPathsSettingsUtils';

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
  },
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
  setParserSamples: React.Dispatch<
    React.SetStateAction<Record<string, ParserSampleState>>
  >;
  setUpdaterSamples: React.Dispatch<
    React.SetStateAction<Record<string, UpdaterSampleState>>
  >;
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
    nextConfig: PathConfig,
  ) => Promise<void>;
  persistSettingsBulk: (entries: Array<{ key: string; value: string }>) => Promise<void>;
  persistActivePathPreference: (pathId: string) => Promise<void>;
  reportAiPathsError: (
    error: unknown,
    context: Record<string, unknown>,
    fallbackMessage?: string,
  ) => void;
  confirm: ConfirmFn;
  toast: ToastFn;
};

export type UseAiPathsSettingsPathActionsReturn = {
  handleReset: () => void;
  handleCreatePath: () => void;
  handleCreateAiDescriptionPath: () => void;
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
  const applyPathConfigState = useCallback(
    (config: PathConfig): void => {
      const normalized = normalizeNodes(config.nodes);
      setNodes(normalized);
      setEdges(sanitizeEdges(normalized, config.edges));
      setPathName(config.name);
      setPathDescription(config.description);
      setActiveTrigger(normalizeTriggerLabel(config.trigger));
      setExecutionMode(config.executionMode ?? 'server');
      setFlowIntensity(config.flowIntensity ?? 'medium');
      setRunMode(config.runMode ?? 'block');
      setParserSamples(config.parserSamples ?? {});
      setUpdaterSamples(config.updaterSamples ?? {});
      setRuntimeState(parseRuntimeState(config.runtimeState));
      setLastRunAt(config.lastRunAt ?? null);
      setIsPathLocked(Boolean(config.isLocked));
      setIsPathActive(config.isActive !== false);

      const preferredNodeId = config.uiState?.selectedNodeId ?? null;
      const resolvedNodeId =
        preferredNodeId &&
        normalized.some((node: AiNode): boolean => node.id === preferredNodeId)
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
      setRuntimeState,
      setSelectedNodeId,
      setUpdaterSamples,
    ],
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
    setPathConfigs((prev: Record<string, PathConfig>): Record<string, PathConfig> => ({
      ...prev,
      [activePathId]: resetConfig,
    }));
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
      runMode: 'block',
      nodes: [],
      edges: [],
      updatedAt: now,
      isLocked: false,
      isActive: true,
      parserSamples: {},
      updaterSamples: {},
      runtimeState: { inputs: {}, outputs: {} },
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
    setPathConfigs((prev: Record<string, PathConfig>): Record<string, PathConfig> => ({
      ...prev,
      [id]: config,
    }));
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
    setPathConfigs((prev: Record<string, PathConfig>): Record<string, PathConfig> => ({
      ...prev,
      [id]: config,
    }));
    setActivePathId(id);
    applyPathConfigState(config);
    toast('AI Description Path created.', { variant: 'success' });
  }, [applyPathConfigState, setActivePathId, setPathConfigs, setPaths, toast]);

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
          const nextPaths = paths.filter(
            (path: PathMeta): boolean => path.id !== targetId,
          );
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
                'Failed to persist fallback path:',
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
              'Failed to update path index:',
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
    ],
  );

  const handleSwitchPath = useCallback(
    (value: string): void => {
      if (!value) return;
      const config = pathConfigs[value] ?? createDefaultPathConfig(value);
      setActivePathId(value);
      void persistActivePathPreference(value);
      applyPathConfigState(config);
    },
    [applyPathConfigState, pathConfigs, persistActivePathPreference, setActivePathId],
  );

  return {
    handleReset,
    handleCreatePath,
    handleCreateAiDescriptionPath,
    handleDeletePath,
    handleSwitchPath,
  };
}
