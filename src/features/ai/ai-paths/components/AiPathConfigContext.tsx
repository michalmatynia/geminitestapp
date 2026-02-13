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
} from '@/features/ai/ai-paths/lib';
import { useToast } from '@/shared/ui';

import {
  useGraphState,
  usePersistenceActions,
  usePresetsActions,
  usePresetsState,
  useRuntimeActions,
  useRuntimeState,
  useSelectionActions,
  useSelectionState,
} from '../context';
import { useAiPathsSettingsOrchestrator } from './ai-paths-settings/AiPathsSettingsOrchestratorContext';

export interface AiPathConfigData {
  configOpen: boolean;
  setConfigOpen: (open: boolean) => void;
  selectedNode: AiNode | null;
  nodes: AiNode[];
  edges: Edge[];
  isPathLocked: boolean;
  modelOptions: string[];
  parserSamples: Record<string, ParserSampleState>;
  setParserSamples: React.Dispatch<React.SetStateAction<Record<string, ParserSampleState>>>;
  parserSampleLoading: boolean;
  updaterSamples: Record<string, UpdaterSampleState>;
  setUpdaterSamples: React.Dispatch<React.SetStateAction<Record<string, UpdaterSampleState>>>;
  updaterSampleLoading: boolean;
  runtimeState: RuntimeState;
  pathDebugSnapshot: PathDebugSnapshot | null;
  updateSelectedNode: (patch: Partial<AiNode>, options?: { nodeId?: string }) => void;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
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
  clearNodeHistory: (nodeId: string) => void | Promise<void>;
  onSendToAi: (databaseNodeId: string, prompt: string) => Promise<void>;
  sendingToAi: boolean;
  dbQueryPresets: DbQueryPreset[];
  setDbQueryPresets: React.Dispatch<React.SetStateAction<DbQueryPreset[]>>;
  saveDbQueryPresets: (nextPresets: DbQueryPreset[]) => Promise<void>;
  dbNodePresets: DbNodePreset[];
  setDbNodePresets: React.Dispatch<React.SetStateAction<DbNodePreset[]>>;
  saveDbNodePresets: (nextPresets: DbNodePreset[]) => Promise<void>;
  toast: (
    message: string,
    options?: { variant?: 'success' | 'error' | 'info' | 'warning' }
  ) => void;
  onDirtyChange: (dirty: boolean) => void;
  savePathConfig: (options?: {
    silent?: boolean | undefined;
    includeNodeConfig?: boolean | undefined;
    force?: boolean | undefined;
    nodesOverride?: AiNode[] | undefined;
    nodeOverride?: AiNode | undefined;
    edgesOverride?: Edge[] | undefined;
  }) => Promise<boolean>;
}

const AiPathConfigContext = createContext<AiPathConfigData | null>(null);

const useAiPathConfigDefaults = (): AiPathConfigData => {
  const orchestrator = useAiPathsSettingsOrchestrator();
  const { toast } = useToast();
  const { selectedNodeId, configOpen } = useSelectionState();
  const selectionActions = useSelectionActions();
  const graphState = useGraphState();
  const runtimeState = useRuntimeState();
  const runtimeActions = useRuntimeActions();
  const presetsState = usePresetsState();
  const presetsActions = usePresetsActions();
  const persistenceActions = usePersistenceActions();

  const selectedNode = useMemo(
    () =>
      selectedNodeId
        ? graphState.nodes.find((node: AiNode): boolean => node.id === selectedNodeId) ?? null
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

  return useMemo(
    (): AiPathConfigData => ({
      configOpen,
      setConfigOpen: selectionActions.setConfigOpen,
      selectedNode,
      nodes: graphState.nodes,
      edges: graphState.edges,
      isPathLocked: graphState.isPathLocked,
      modelOptions: orchestrator.modelOptions,
      parserSamples: runtimeState.parserSamples,
      setParserSamples: runtimeActions.setParserSamples,
      parserSampleLoading: runtimeState.parserSampleLoading,
      updaterSamples: runtimeState.updaterSamples,
      setUpdaterSamples: runtimeActions.setUpdaterSamples,
      updaterSampleLoading: runtimeState.updaterSampleLoading,
      runtimeState: runtimeState.runtimeState,
      pathDebugSnapshot,
      updateSelectedNode: orchestrator.updateSelectedNode,
      updateSelectedNodeConfig: orchestrator.updateSelectedNodeConfig,
      handleFetchParserSample: runtimeActions.fetchParserSample,
      handleFetchUpdaterSample: runtimeActions.fetchUpdaterSample,
      handleRunSimulation: runtimeActions.runSimulation,
      clearRuntimeForNode: runtimeActions.clearNodeRuntime,
      clearNodeCache: runtimeActions.clearNodeRuntime,
      clearNodeHistory: orchestrator.handleClearNodeHistory,
      onSendToAi: runtimeActions.sendToAi,
      sendingToAi: runtimeState.sendingToAi,
      dbQueryPresets: presetsState.dbQueryPresets,
      setDbQueryPresets: presetsActions.setDbQueryPresets,
      saveDbQueryPresets: presetsActions.saveDbQueryPresets,
      dbNodePresets: presetsState.dbNodePresets,
      setDbNodePresets: presetsActions.setDbNodePresets,
      saveDbNodePresets: presetsActions.saveDbNodePresets,
      toast,
      onDirtyChange: selectionActions.setNodeConfigDirty,
      savePathConfig: persistenceActions.savePathConfig,
    }),
    [
      configOpen,
      selectionActions.setConfigOpen,
      selectedNode,
      graphState.nodes,
      graphState.edges,
      graphState.isPathLocked,
      graphState.activePathId,
      orchestrator,
      runtimeState.parserSamples,
      runtimeState.parserSampleLoading,
      runtimeState.updaterSamples,
      runtimeState.updaterSampleLoading,
      runtimeState.runtimeState,
      runtimeState.pathDebugSnapshots,
      runtimeState.sendingToAi,
      runtimeActions.setParserSamples,
      runtimeActions.setUpdaterSamples,
      runtimeActions.fetchParserSample,
      runtimeActions.fetchUpdaterSample,
      runtimeActions.runSimulation,
      runtimeActions.clearNodeRuntime,
      runtimeActions.sendToAi,
      presetsState.dbQueryPresets,
      presetsState.dbNodePresets,
      presetsActions.setDbQueryPresets,
      presetsActions.saveDbQueryPresets,
      presetsActions.setDbNodePresets,
      presetsActions.saveDbNodePresets,
      toast,
      selectionActions.setNodeConfigDirty,
      persistenceActions.savePathConfig,
      pathDebugSnapshot,
    ]
  );
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
    <AiPathConfigContext.Provider value={value}>
      {children}
    </AiPathConfigContext.Provider>
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
  const defaults = useAiPathConfigDefaults();

  const value = useMemo<AiPathConfigData>(() => {
    if (!overrides) return defaults;
    return {
      ...defaults,
      ...Object.fromEntries(
        Object.entries(overrides).filter((entry) => entry[1] !== undefined)
      ),
    } as AiPathConfigData;
  }, [defaults, overrides]);

  return (
    <AiPathConfigProvider value={value}>
      {children}
    </AiPathConfigProvider>
  );
}

export function useAiPathConfig(): AiPathConfigData {
  const context = useContext(AiPathConfigContext);
  if (!context) {
    throw new Error('useAiPathConfig must be used within AiPathConfigProvider');
  }
  return context;
}
