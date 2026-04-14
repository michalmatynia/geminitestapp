'use client';

import { useCallback } from 'react';

import { useGraphActions } from '@/features/ai/ai-paths/context/GraphContext';
import { useRuntimeActions } from '@/features/ai/ai-paths/context/RuntimeContext';
import type { Toast } from '@/shared/contracts/ui/base';
import type { ConfirmConfig } from '@/shared/hooks/ui/useConfirm';
import type { AiNode, Edge, PathBlockedRunPolicy, PathConfig, PathExecutionMode, PathFlowIntensity, AiPathsValidationConfig, PathMeta, PathRunMode } from '@/shared/contracts/ai-paths';
import type { ParserSampleState, UpdaterSampleState } from '@/shared/contracts/ai-paths';
import type { RuntimeState } from '@/shared/contracts/ai-paths-runtime';
import { STORAGE_VERSION } from '@/shared/lib/ai-paths/core/constants';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type UseAiPathsSettingsCleanupActionsInput = {
  activePathId: string | null;
  isPathLocked: boolean;
  toast: Toast;
  confirm: (config: ConfirmConfig) => void;
  runtimeState: RuntimeState;
  resetRuntimeDiagnostics: () => void;
  edges: Edge[];
  nodes: AiNode[];
  pathName: string;
  pathDescription: string;
  activeTrigger: string;
  executionMode: PathExecutionMode;
  flowIntensity: PathFlowIntensity;
  runMode: PathRunMode;
  strictFlowMode: boolean;
  blockedRunPolicy: PathBlockedRunPolicy;
  aiPathsValidation: AiPathsValidationConfig;
  isPathActive: boolean;
  parserSamples: Record<string, ParserSampleState>;
  updaterSamples: Record<string, UpdaterSampleState>;
  lastRunAt: string | null;
  selectedNodeId: string | null;
  configOpen: boolean;
  pathConfigs: Record<string, PathConfig>;
  paths: PathMeta[];
  persistPathSettings: (
    nextPaths: PathMeta[],
    nextActivePathId: string,
    nextConfig: PathConfig
  ) => Promise<void>;
  reportAiPathsError: (
    error: unknown,
    context: Record<string, unknown>,
    fallbackMessage?: string
  ) => void;
  pruneRuntimeInputs: (
    state: RuntimeState,
    removedEdges: Edge[],
    remainingEdges: Edge[]
  ) => RuntimeState;
};

const buildConnectorClearedRuntimeState = (): RuntimeState => ({
  status: 'idle',
  nodeStatuses: {},
  nodeOutputs: {},
  variables: {},
  events: [],
  currentRun: null,
  inputs: {},
  outputs: {},
});

const clearNodeStatusPorts = (
  outputs: RuntimeState['outputs'] | undefined
): RuntimeState['outputs'] => {
  const next: RuntimeState['outputs'] = {};
  if (!outputs) return next;
  Object.entries(outputs).forEach(([nodeId, value]) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    const cleanedValue = { ...value };
    delete cleanedValue['status'];
    next[nodeId] = cleanedValue;
  });
  return next;
};

const buildHistoryClearedRuntimeState = (state: RuntimeState): RuntimeState => {
  const nextRuntimeState: RuntimeState = {
    ...state,
    status: 'idle',
    nodeStatuses: {},
    nodeOutputs: {},
    events: [],
    outputs: clearNodeStatusPorts(state.outputs),
  };
  delete nextRuntimeState.history;
  return nextRuntimeState;
};

export type UseAiPathsSettingsCleanupActionsReturn = {
  handleClearWires: () => Promise<void>;
  handleClearConnectorData: () => Promise<void>;
  handleClearHistory: () => Promise<void>;
  handleClearNodeHistory: (nodeId: string) => Promise<void>;
};

export function useAiPathsSettingsCleanupActions({
  activePathId,
  isPathLocked,
  toast,
  confirm,
  runtimeState,
  resetRuntimeDiagnostics,
  edges,
  nodes,
  pathName,
  pathDescription,
  activeTrigger,
  executionMode,
  flowIntensity,
  runMode,
  strictFlowMode,
  blockedRunPolicy,
  aiPathsValidation,
  isPathActive,
  parserSamples,
  updaterSamples,
  lastRunAt,
  selectedNodeId,
  configOpen,
  pathConfigs,
  paths,
  persistPathSettings,
  reportAiPathsError,
  pruneRuntimeInputs,
}: UseAiPathsSettingsCleanupActionsInput): UseAiPathsSettingsCleanupActionsReturn {
  const { setEdges, setPathConfigs } = useGraphActions();
  const { setRuntimeState } = useRuntimeActions();

  const handleClearWires = useCallback(async (): Promise<void> => {
    if (!activePathId) return;
    if (isPathLocked) {
      toast('This path is locked. Unlock it to edit nodes or connections.', {
        variant: 'info',
      });
      return;
    }

    confirm({
      title: 'Clear All Wires?',
      message:
        'Are you sure you want to remove all connections in this path? This action cannot be undone.',
      confirmText: 'Clear Wires',
      isDangerous: true,
      onConfirm: async () => {
        const updatedAt = new Date().toISOString();
        const nextRuntimeState = pruneRuntimeInputs(runtimeState, edges, []);
        if (nextRuntimeState !== runtimeState) {
          setRuntimeState(nextRuntimeState);
        }
        const config: PathConfig = {
          id: activePathId,
          version: STORAGE_VERSION,
          name: pathName,
          description: pathDescription,
          trigger: activeTrigger,
          executionMode,
          flowIntensity,
          runMode,
          strictFlowMode,
          blockedRunPolicy,
          aiPathsValidation,
          nodes,
          edges: [],
          updatedAt,
          isLocked: isPathLocked,
          isActive: isPathActive,
          parserSamples,
          updaterSamples,
          runtimeState: nextRuntimeState,
          lastRunAt,
          runCount:
            typeof pathConfigs[activePathId]?.runCount === 'number' &&
            Number.isFinite(pathConfigs[activePathId]?.runCount)
              ? Math.max(0, Math.trunc(pathConfigs[activePathId]?.runCount ?? 0))
              : 0,
          uiState: {
            selectedNodeId,
            configOpen,
          },
        };
        setEdges([]);
        const nextConfigs = { ...pathConfigs, [activePathId]: config };
        setPathConfigs(nextConfigs);
        try {
          await persistPathSettings(paths, activePathId, config);
          toast('Wires cleared.', { variant: 'success' });
        } catch (error) {
          logClientError(error);
          reportAiPathsError(error, { action: 'clearWires' }, 'Failed to clear wires:');
          toast('Failed to clear wires.', { variant: 'error' });
        }
      },
    });
  }, [
    activePathId,
    activeTrigger,
    configOpen,
    confirm,
    edges,
    executionMode,
    flowIntensity,
    isPathActive,
    isPathLocked,
    lastRunAt,
    nodes,
    parserSamples,
    pathConfigs,
    pathDescription,
    pathName,
    paths,
    persistPathSettings,
    pruneRuntimeInputs,
    reportAiPathsError,
    runMode,
    strictFlowMode,
    aiPathsValidation,
    selectedNodeId,
    setPathConfigs,
    setEdges,
    setRuntimeState,
    toast,
    runtimeState,
    updaterSamples,
  ]);

  const handleClearConnectorData = useCallback(async (): Promise<void> => {
    if (!activePathId) return;
    if (isPathLocked) {
      toast('This path is locked. Unlock it to edit nodes or connections.', {
        variant: 'info',
      });
      return;
    }

    confirm({
      title: 'Clear Connector Data?',
      message:
        'Remove all inputs and outputs for all nodes in this path? This will reset the runtime state.',
      confirmText: 'Clear Data',
      isDangerous: true,
      onConfirm: async () => {
        resetRuntimeDiagnostics();
        const nextRuntimeState = buildConnectorClearedRuntimeState();
        const updatedAt = new Date().toISOString();
        const config: PathConfig = {
          id: activePathId,
          version: STORAGE_VERSION,
          name: pathName,
          description: pathDescription,
          trigger: activeTrigger,
          executionMode,
          flowIntensity,
          runMode,
          strictFlowMode,
          blockedRunPolicy,
          aiPathsValidation,
          nodes,
          edges,
          updatedAt,
          isLocked: isPathLocked,
          isActive: isPathActive,
          parserSamples,
          updaterSamples,
          runtimeState: nextRuntimeState,
          lastRunAt,
          runCount:
            typeof pathConfigs[activePathId]?.runCount === 'number' &&
            Number.isFinite(pathConfigs[activePathId]?.runCount)
              ? Math.max(0, Math.trunc(pathConfigs[activePathId]?.runCount ?? 0))
              : 0,
          uiState: {
            selectedNodeId,
            configOpen,
          },
        };
        setRuntimeState(nextRuntimeState);
        const nextConfigs = { ...pathConfigs, [activePathId]: config };
        setPathConfigs(nextConfigs);
        try {
          await persistPathSettings(paths, activePathId, config);
          toast('Connector data cleared for current path.', {
            variant: 'success',
          });
        } catch (error) {
          logClientError(error);
          reportAiPathsError(
            error,
            { action: 'clearConnectorData', pathId: activePathId },
            'Failed to clear connector data:'
          );
          toast('Failed to clear connector data.', { variant: 'error' });
        }
      },
    });
  }, [
    activePathId,
    activeTrigger,
    configOpen,
    confirm,
    edges,
    executionMode,
    flowIntensity,
    isPathActive,
    isPathLocked,
    lastRunAt,
    nodes,
    parserSamples,
    pathConfigs,
    pathDescription,
    pathName,
    paths,
    persistPathSettings,
    reportAiPathsError,
    runMode,
    strictFlowMode,
    aiPathsValidation,
    selectedNodeId,
    setPathConfigs,
    setRuntimeState,
    resetRuntimeDiagnostics,
    toast,
    updaterSamples,
  ]);

  const handleClearHistory = useCallback(async (): Promise<void> => {
    if (!activePathId) return;
    if (isPathLocked) {
      toast('This path is locked. Unlock it to clear history.', {
        variant: 'info',
      });
      return;
    }
    const currentHistory = runtimeState.history ?? {};
    if (Object.keys(currentHistory).length === 0) {
      toast('No history recorded for this path yet.', { variant: 'info' });
      return;
    }

    confirm({
      title: 'Clear Execution History?',
      message: 'Remove all historical logs and execution data for this path?',
      confirmText: 'Clear History',
      isDangerous: true,
      onConfirm: async () => {
        resetRuntimeDiagnostics();
        const nextRuntimeState = buildHistoryClearedRuntimeState(runtimeState);
        const updatedAt = new Date().toISOString();
        const config: PathConfig = {
          id: activePathId,
          version: STORAGE_VERSION,
          name: pathName,
          description: pathDescription,
          trigger: activeTrigger,
          executionMode,
          flowIntensity,
          runMode,
          strictFlowMode,
          aiPathsValidation,
          nodes,
          edges,
          updatedAt,
          isLocked: isPathLocked,
          isActive: isPathActive,
          parserSamples,
          updaterSamples,
          runtimeState: nextRuntimeState,
          lastRunAt,
          runCount:
            typeof pathConfigs[activePathId]?.runCount === 'number' &&
            Number.isFinite(pathConfigs[activePathId]?.runCount)
              ? Math.max(0, Math.trunc(pathConfigs[activePathId]?.runCount ?? 0))
              : 0,
          uiState: {
            selectedNodeId,
            configOpen,
          },
        };
        setRuntimeState(nextRuntimeState);
        const nextConfigs = { ...pathConfigs, [activePathId]: config };
        setPathConfigs(nextConfigs);
        try {
          await persistPathSettings(paths, activePathId, config);
          toast('History cleared for the current path.', {
            variant: 'success',
          });
        } catch (error) {
          logClientError(error);
          reportAiPathsError(
            error,
            { action: 'clearHistory', pathId: activePathId },
            'Failed to clear history:'
          );
          toast('Failed to clear history.', { variant: 'error' });
        }
      },
    });
  }, [
    activePathId,
    activeTrigger,
    configOpen,
    confirm,
    edges,
    executionMode,
    flowIntensity,
    isPathActive,
    isPathLocked,
    lastRunAt,
    nodes,
    parserSamples,
    pathConfigs,
    pathDescription,
    pathName,
    paths,
    persistPathSettings,
    reportAiPathsError,
    runMode,
    strictFlowMode,
    aiPathsValidation,
    runtimeState,
    selectedNodeId,
    setPathConfigs,
    setRuntimeState,
    resetRuntimeDiagnostics,
    toast,
    updaterSamples,
  ]);

  const handleClearNodeHistory = useCallback(
    async (nodeId: string): Promise<void> => {
      if (!activePathId) return;
      if (isPathLocked) {
        toast('This path is locked. Unlock it to clear history.', {
          variant: 'info',
        });
        return;
      }
      const currentHistory = runtimeState.history ?? {};
      if (!currentHistory[nodeId] || currentHistory[nodeId].length === 0) {
        toast('No history recorded for this node yet.', { variant: 'info' });
        return;
      }
      const nextHistory = { ...currentHistory };
      delete nextHistory[nodeId];
      const nextRuntimeState: RuntimeState = { ...runtimeState };
      if (Object.keys(nextHistory).length > 0) {
        nextRuntimeState.history = nextHistory;
      } else {
        delete nextRuntimeState.history;
      }
      const updatedAt = new Date().toISOString();
      const config: PathConfig = {
        id: activePathId,
        version: STORAGE_VERSION,
        name: pathName,
        description: pathDescription,
        trigger: activeTrigger,
        executionMode,
        flowIntensity,
        runMode,
        strictFlowMode,
        blockedRunPolicy,
        aiPathsValidation,
        nodes,
        edges,
        updatedAt,
        isLocked: isPathLocked,
        isActive: isPathActive,
        parserSamples,
        updaterSamples,
        runtimeState: nextRuntimeState,
        lastRunAt,
        runCount:
          typeof pathConfigs[activePathId]?.runCount === 'number' &&
          Number.isFinite(pathConfigs[activePathId]?.runCount)
            ? Math.max(0, Math.trunc(pathConfigs[activePathId]?.runCount ?? 0))
            : 0,
        uiState: {
          selectedNodeId,
          configOpen,
        },
      };
      setRuntimeState(nextRuntimeState);
      const nextConfigs = { ...pathConfigs, [activePathId]: config };
      setPathConfigs(nextConfigs);
      try {
        await persistPathSettings(paths, activePathId, config);
        toast('Node history cleared.', { variant: 'success' });
      } catch (error) {
        logClientError(error);
        reportAiPathsError(
          error,
          { action: 'clearNodeHistory', pathId: activePathId, nodeId },
          'Failed to clear node history:'
        );
        toast('Failed to clear node history.', { variant: 'error' });
      }
    },
    [
      activePathId,
      activeTrigger,
      configOpen,
      edges,
      executionMode,
      flowIntensity,
      isPathActive,
      isPathLocked,
      lastRunAt,
      nodes,
      parserSamples,
      pathConfigs,
      pathDescription,
      pathName,
      paths,
      persistPathSettings,
      reportAiPathsError,
      runMode,
      strictFlowMode,
      aiPathsValidation,
      runtimeState,
      selectedNodeId,
      setPathConfigs,
      setRuntimeState,
      toast,
      updaterSamples,
    ]
  );

  return {
    handleClearWires,
    handleClearConnectorData,
    handleClearHistory,
    handleClearNodeHistory,
  };
}
