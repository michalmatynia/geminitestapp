'use client';

import React, { useCallback, useMemo } from 'react';

import type { Toast } from '@/shared/contracts/ui';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import type { AiNode, DbNodePreset, DbQueryPreset, Edge, NodeConfig, ParserSampleState, PathDebugSnapshot, RuntimeState, UpdaterSampleState } from '@/shared/lib/ai-paths';
import { useToast } from '@/shared/ui/primitives.public';

import {
  useGraphState,
  usePresetsActions,
  usePresetsState,
  useRuntimeActions,
  useRuntimeState,
  useSelectionActions,
  useSelectionState,
  usePersistenceActions,
} from '../context';
import { useAiPathsNodeConfigActions } from './ai-paths-settings/hooks/useAiPathsNodeConfigActions';

// --- Selection Context ---
export interface AiPathSelectionData {
  configOpen: boolean;
  setConfigOpen: (open: boolean) => void;
  selectedNode: AiNode | null;
  onDirtyChange: (dirty: boolean) => void;
}
const { Context: AiPathSelectionContext, useStrictContext: useAiPathSelection } =
  createStrictContext<AiPathSelectionData>({
    hookName: 'useAiPathSelection',
    providerName: 'AiPathConfigProvider',
    displayName: 'AiPathSelectionContext',
    errorFactory: internalError,
  });
export { useAiPathSelection };

// --- Graph Context ---
export interface AiPathGraphData {
  nodes: AiNode[];
  edges: Edge[];
  activePathId: string | null;
  isPathLocked: boolean;
}
const { Context: AiPathGraphContext, useStrictContext: useAiPathGraph } =
  createStrictContext<AiPathGraphData>({
    hookName: 'useAiPathGraph',
    providerName: 'AiPathConfigProvider',
    displayName: 'AiPathGraphContext',
    errorFactory: internalError,
  });
export { useAiPathGraph };

// --- Runtime Context ---
export interface AiPathRuntimeData {
  parserSamples: Record<string, ParserSampleState>;
  setParserSamples: React.Dispatch<React.SetStateAction<Record<string, ParserSampleState>>>;
  parserSampleLoading: boolean;
  updaterSamples: Record<string, UpdaterSampleState>;
  setUpdaterSamples: React.Dispatch<React.SetStateAction<Record<string, UpdaterSampleState>>>;
  updaterSampleLoading: boolean;
  runtimeState: RuntimeState;
  pathDebugSnapshot: PathDebugSnapshot | null;
  handleFetchParserSample: (nodeId: string, entityType: string, entityId: string) => Promise<void>;
  handleFetchUpdaterSample: (
    nodeId: string,
    entityType: string,
    entityId: string,
    options?: { notify?: boolean }
  ) => Promise<void>;
  handleRunSimulation: (node: AiNode) => void | Promise<void>;
  clearRuntimeForNode: (nodeId: string) => void;
  clearNodeCache: (nodeId: string) => void;
  onSendToAi: (databaseNodeId: string, prompt: string) => Promise<void>;
  sendingToAi: boolean;
}
const { Context: AiPathRuntimeContext, useStrictContext: useAiPathRuntime } =
  createStrictContext<AiPathRuntimeData>({
    hookName: 'useAiPathRuntime',
    providerName: 'AiPathConfigProvider',
    displayName: 'AiPathRuntimeContext',
    errorFactory: internalError,
  });
export { useAiPathRuntime };

// --- Presets Context ---
export interface AiPathPresetsData {
  dbQueryPresets: DbQueryPreset[];
  setDbQueryPresets: React.Dispatch<React.SetStateAction<DbQueryPreset[]>>;
  saveDbQueryPresets: (nextPresets: DbQueryPreset[]) => Promise<void>;
  dbNodePresets: DbNodePreset[];
  setDbNodePresets: React.Dispatch<React.SetStateAction<DbNodePreset[]>>;
  saveDbNodePresets: (nextPresets: DbNodePreset[]) => Promise<void>;
}
const { Context: AiPathPresetsContext, useStrictContext: useAiPathPresets } =
  createStrictContext<AiPathPresetsData>({
    hookName: 'useAiPathPresets',
    providerName: 'AiPathConfigProvider',
    displayName: 'AiPathPresetsContext',
    errorFactory: internalError,
  });
export { useAiPathPresets };

// --- Orchestrator/Actions Context ---
export interface AiPathOrchestratorData {
  updateSelectedNode: (patch: Partial<AiNode>, options?: { nodeId?: string }) => void;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
  clearNodeHistory: (nodeId: string) => void | Promise<void>;
  savePathConfig: (options?: {
    silent?: boolean | undefined;
    includeNodeConfig?: boolean | undefined;
    force?: boolean | undefined;
    nodesOverride?: AiNode[] | undefined;
    nodeOverride?: AiNode | undefined;
    edgesOverride?: Edge[] | undefined;
  }) => Promise<boolean>;
  toast: Toast;
}
const { Context: AiPathOrchestratorContext, useStrictContext: useAiPathOrchestrator } =
  createStrictContext<AiPathOrchestratorData>({
    hookName: 'useAiPathOrchestrator',
    providerName: 'AiPathConfigProvider',
    displayName: 'AiPathOrchestratorContext',
    errorFactory: internalError,
  });
export { useAiPathOrchestrator };

type AiPathConfigValue = AiPathSelectionData &
  AiPathGraphData &
  AiPathRuntimeData &
  AiPathPresetsData &
  AiPathOrchestratorData;

const useAiPathConfigDefaults = () => {
  const { toast } = useToast();
  const { selectedNodeId, configOpen } = useSelectionState();
  const selectionActions = useSelectionActions();
  const graphState = useGraphState();
  const runtimeState = useRuntimeState();
  const runtimeActions = useRuntimeActions();
  const presetsState = usePresetsState();
  const presetsActions = usePresetsActions();
  const { savePathConfig } = usePersistenceActions();
  const nodeConfigActions = useAiPathsNodeConfigActions({ selectedNodeId });

  const handleClearNodeHistory = useCallback(
    async (nodeId: string): Promise<void> => {
      if (!graphState.activePathId) return;
      if (graphState.isPathLocked) {
        toast('This path is locked. Unlock it to clear history.', { variant: 'info' });
        return;
      }
      const currentHistory = runtimeState.runtimeState.history ?? {};
      if (!currentHistory[nodeId] || currentHistory[nodeId].length === 0) {
        toast('No history recorded for this node yet.', { variant: 'info' });
        return;
      }
      const { [nodeId]: _removed, ...restHistory } = currentHistory;
      const nextRuntimeState: RuntimeState = {
        ...runtimeState.runtimeState,
        history: Object.keys(restHistory).length > 0 ? restHistory : undefined,
      };
      runtimeActions.setRuntimeState(nextRuntimeState);
      const ok = await savePathConfig({ force: true, silent: true, runtimeStateOverride: nextRuntimeState });
      if (ok) {
        toast('Node history cleared.', { variant: 'success' });
      } else {
        toast('Failed to clear node history.', { variant: 'error' });
      }
    },
    [
      graphState.activePathId,
      graphState.isPathLocked,
      runtimeState.runtimeState,
      runtimeActions,
      savePathConfig,
      toast,
    ]
  );

  const selectedNode = useMemo(
    () =>
      selectedNodeId
        ? (graphState.nodes.find((node: AiNode): boolean => node.id === selectedNodeId) ?? null)
        : null,
    [graphState.nodes, selectedNodeId]
  );

  const pathDebugSnapshot = useMemo(
    () =>
      graphState.activePathId
        ? (runtimeState.pathDebugSnapshots[graphState.activePathId] ?? null)
        : null,
    [graphState.activePathId, runtimeState.pathDebugSnapshots]
  );

  const selectionValue = useMemo<AiPathSelectionData>(
    () => ({
      configOpen,
      setConfigOpen: selectionActions.setConfigOpen,
      selectedNode,
      onDirtyChange: selectionActions.setNodeConfigDirty,
    }),
    [configOpen, selectionActions.setConfigOpen, selectedNode, selectionActions.setNodeConfigDirty]
  );

  const graphValue = useMemo<AiPathGraphData>(
    () => ({
      nodes: graphState.nodes,
      edges: graphState.edges,
      activePathId: graphState.activePathId,
      isPathLocked: graphState.isPathLocked,
    }),
    [graphState.nodes, graphState.edges, graphState.activePathId, graphState.isPathLocked]
  );

  const runtimeValue = useMemo<AiPathRuntimeData>(
    () => ({
      parserSamples: runtimeState.parserSamples,
      setParserSamples: runtimeActions.setParserSamples,
      parserSampleLoading: runtimeState.parserSampleLoading,
      updaterSamples: runtimeState.updaterSamples,
      setUpdaterSamples: runtimeActions.setUpdaterSamples,
      updaterSampleLoading: runtimeState.updaterSampleLoading,
      runtimeState: runtimeState.runtimeState,
      pathDebugSnapshot,
      handleFetchParserSample: runtimeActions.fetchParserSample,
      handleFetchUpdaterSample: runtimeActions.fetchUpdaterSample,
      handleRunSimulation: runtimeActions.runSimulation,
      clearRuntimeForNode: runtimeActions.clearNodeRuntime,
      clearNodeCache: runtimeActions.clearNodeRuntime,
      onSendToAi: runtimeActions.sendToAi,
      sendingToAi: runtimeState.sendingToAi,
    }),
    [runtimeState, runtimeActions, pathDebugSnapshot]
  );

  const presetsValue = useMemo<AiPathPresetsData>(
    () => ({
      dbQueryPresets: presetsState.dbQueryPresets,
      setDbQueryPresets: presetsActions.setDbQueryPresets,
      saveDbQueryPresets: presetsActions.saveDbQueryPresets,
      dbNodePresets: presetsState.dbNodePresets,
      setDbNodePresets: presetsActions.setDbNodePresets,
      saveDbNodePresets: presetsActions.saveDbNodePresets,
    }),
    [presetsState, presetsActions]
  );

  const orchestratorValue = useMemo<AiPathOrchestratorData>(
    () => ({
      updateSelectedNode: nodeConfigActions.updateSelectedNode,
      updateSelectedNodeConfig: nodeConfigActions.updateSelectedNodeConfig,
      clearNodeHistory: handleClearNodeHistory,
      // Node dialog saves route through PersistenceContext which delegates to handleSave.
      savePathConfig,
      toast,
    }),
    [
      nodeConfigActions.updateSelectedNode,
      nodeConfigActions.updateSelectedNodeConfig,
      handleClearNodeHistory,
      savePathConfig,
      toast,
    ]
  );

  return {
    selectionValue,
    graphValue,
    runtimeValue,
    presetsValue,
    orchestratorValue,
  };
};

type AiPathConfigProviderProps = {
  children: React.ReactNode;
  value: AiPathConfigValue;
};

export function AiPathConfigProvider({
  children,
  value,
}: AiPathConfigProviderProps): React.ReactNode {
  return (
    <AiPathSelectionContext.Provider value={value}>
      <AiPathGraphContext.Provider value={value}>
        <AiPathRuntimeContext.Provider value={value}>
          <AiPathPresetsContext.Provider value={value}>
            <AiPathOrchestratorContext.Provider value={value}>
              {children}
            </AiPathOrchestratorContext.Provider>
          </AiPathPresetsContext.Provider>
        </AiPathRuntimeContext.Provider>
      </AiPathGraphContext.Provider>
    </AiPathSelectionContext.Provider>
  );
}

type AiPathConfigProviderWithContextProps = {
  children: React.ReactNode;
  overrides?: {
    selection?: Partial<AiPathSelectionData>;
    graph?: Partial<AiPathGraphData>;
    runtime?: Partial<AiPathRuntimeData>;
    presets?: Partial<AiPathPresetsData>;
    orchestrator?: Partial<AiPathOrchestratorData>;
  };
};

export function AiPathConfigProviderWithContext({
  children,
  overrides,
}: AiPathConfigProviderWithContextProps): React.ReactNode {
  const { selectionValue, graphValue, runtimeValue, presetsValue, orchestratorValue } =
    useAiPathConfigDefaults();
  const selectionOverrides = overrides?.selection;
  const graphOverrides = overrides?.graph;
  const runtimeOverrides = overrides?.runtime;
  const presetsOverrides = overrides?.presets;
  const orchestratorOverrides = overrides?.orchestrator;

  const selection = useMemo(
    () => (selectionOverrides ? { ...selectionValue, ...selectionOverrides } : selectionValue),
    [selectionValue, selectionOverrides]
  );
  const graph = useMemo(
    () => (graphOverrides ? { ...graphValue, ...graphOverrides } : graphValue),
    [graphValue, graphOverrides]
  );
  const runtime = useMemo(
    () => (runtimeOverrides ? { ...runtimeValue, ...runtimeOverrides } : runtimeValue),
    [runtimeValue, runtimeOverrides]
  );
  const presets = useMemo(
    () => (presetsOverrides ? { ...presetsValue, ...presetsOverrides } : presetsValue),
    [presetsValue, presetsOverrides]
  );
  const orchestrator = useMemo(
    () =>
      orchestratorOverrides
        ? { ...orchestratorValue, ...orchestratorOverrides }
        : orchestratorValue,
    [orchestratorValue, orchestratorOverrides]
  );

  return (
    <AiPathSelectionContext.Provider value={selection}>
      <AiPathGraphContext.Provider value={graph}>
        <AiPathRuntimeContext.Provider value={runtime}>
          <AiPathPresetsContext.Provider value={presets}>
            <AiPathOrchestratorContext.Provider value={orchestrator}>
              {children}
            </AiPathOrchestratorContext.Provider>
          </AiPathPresetsContext.Provider>
        </AiPathRuntimeContext.Provider>
      </AiPathGraphContext.Provider>
    </AiPathSelectionContext.Provider>
  );
}
