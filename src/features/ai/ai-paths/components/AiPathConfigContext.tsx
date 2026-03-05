'use client';

import React, { createContext, useContext, useMemo } from 'react';

import type {
  AiNode,
  DbNodePreset,
  DbQueryPreset,
  Edge,
  NodeConfig,
  ParserSampleState,
  PathDebugSnapshot,
  RuntimeState,
  UpdaterSampleState,
} from '@/shared/lib/ai-paths';
import { useToast } from '@/shared/ui';
import type { Toast } from '@/shared/contracts/ui';

import {
  useGraphState,
  usePresetsActions,
  usePresetsState,
  useRuntimeActions,
  useRuntimeState,
  useSelectionActions,
  useSelectionState,
} from '../context';
import { useAiPathsSettingsOrchestrator } from './ai-paths-settings/AiPathsSettingsOrchestratorContext';

// --- Selection Context ---
export interface AiPathSelectionData {
  configOpen: boolean;
  setConfigOpen: (open: boolean) => void;
  selectedNode: AiNode | null;
  onDirtyChange: (dirty: boolean) => void;
}
const AiPathSelectionContext = createContext<AiPathSelectionData | null>(null);
export const useAiPathSelection = (): AiPathSelectionData => {
  const context = useContext(AiPathSelectionContext);
  if (!context) throw new Error('useAiPathSelection must be used within AiPathConfigProvider');
  return context;
};

// --- Graph Context ---
export interface AiPathGraphData {
  nodes: AiNode[];
  edges: Edge[];
  activePathId: string | null;
  isPathLocked: boolean;
}
const AiPathGraphContext = createContext<AiPathGraphData | null>(null);
export const useAiPathGraph = (): AiPathGraphData => {
  const context = useContext(AiPathGraphContext);
  if (!context) throw new Error('useAiPathGraph must be used within AiPathConfigProvider');
  return context;
};

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
const AiPathRuntimeContext = createContext<AiPathRuntimeData | null>(null);
export const useAiPathRuntime = (): AiPathRuntimeData => {
  const context = useContext(AiPathRuntimeContext);
  if (!context) throw new Error('useAiPathRuntime must be used within AiPathConfigProvider');
  return context;
};

// --- Presets Context ---
export interface AiPathPresetsData {
  dbQueryPresets: DbQueryPreset[];
  setDbQueryPresets: React.Dispatch<React.SetStateAction<DbQueryPreset[]>>;
  saveDbQueryPresets: (nextPresets: DbQueryPreset[]) => Promise<void>;
  dbNodePresets: DbNodePreset[];
  setDbNodePresets: React.Dispatch<React.SetStateAction<DbNodePreset[]>>;
  saveDbNodePresets: (nextPresets: DbNodePreset[]) => Promise<void>;
}
const AiPathPresetsContext = createContext<AiPathPresetsData | null>(null);
export const useAiPathPresets = (): AiPathPresetsData => {
  const context = useContext(AiPathPresetsContext);
  if (!context) throw new Error('useAiPathPresets must be used within AiPathConfigProvider');
  return context;
};

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
const AiPathOrchestratorContext = createContext<AiPathOrchestratorData | null>(null);
export const useAiPathOrchestrator = (): AiPathOrchestratorData => {
  const context = useContext(AiPathOrchestratorContext);
  if (!context) throw new Error('useAiPathOrchestrator must be used within AiPathConfigProvider');
  return context;
};

// --- Aggregated Interface ---
export interface AiPathConfigData
  extends
    AiPathSelectionData,
    AiPathGraphData,
    AiPathRuntimeData,
    AiPathPresetsData,
    AiPathOrchestratorData {}

const useAiPathConfigDefaults = () => {
  const orchestrator = useAiPathsSettingsOrchestrator();
  const { toast } = useToast();
  const { selectedNodeId, configOpen } = useSelectionState();
  const selectionActions = useSelectionActions();
  const graphState = useGraphState();
  const runtimeState = useRuntimeState();
  const runtimeActions = useRuntimeActions();
  const presetsState = usePresetsState();
  const presetsActions = usePresetsActions();

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
      updateSelectedNode: orchestrator.updateSelectedNode,
      updateSelectedNodeConfig: orchestrator.updateSelectedNodeConfig,
      clearNodeHistory: orchestrator.handleClearNodeHistory,
      // Node dialog saves should use the orchestrator save pipeline directly.
      savePathConfig: orchestrator.handleSave,
      toast,
    }),
    [
      orchestrator.updateSelectedNode,
      orchestrator.updateSelectedNodeConfig,
      orchestrator.handleClearNodeHistory,
      orchestrator.handleSave,
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
  value: AiPathConfigData;
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
            <AiPathOrchestratorContext.Provider value={value}>{children}</AiPathOrchestratorContext.Provider>
          </AiPathPresetsContext.Provider>
        </AiPathRuntimeContext.Provider>
      </AiPathGraphContext.Provider>
    </AiPathSelectionContext.Provider>
  );
}

type AiPathConfigProviderWithContextProps = {
  children: React.ReactNode;
  overrides?: Partial<AiPathConfigData>;
};

export function AiPathConfigProviderWithContext({
  children,
  overrides,
}: AiPathConfigProviderWithContextProps): React.ReactNode {
  const { selectionValue, graphValue, runtimeValue, presetsValue, orchestratorValue } =
    useAiPathConfigDefaults();

  const selection = useMemo(
    () => (overrides ? { ...selectionValue, ...overrides } : selectionValue),
    [selectionValue, overrides]
  );
  const graph = useMemo(
    () => (overrides ? { ...graphValue, ...overrides } : graphValue),
    [graphValue, overrides]
  );
  const runtime = useMemo(
    () => (overrides ? { ...runtimeValue, ...overrides } : runtimeValue),
    [runtimeValue, overrides]
  );
  const presets = useMemo(
    () => (overrides ? { ...presetsValue, ...overrides } : presetsValue),
    [presetsValue, overrides]
  );
  const orchestrator = useMemo(
    () => (overrides ? { ...orchestratorValue, ...overrides } : orchestratorValue),
    [orchestratorValue, overrides]
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
