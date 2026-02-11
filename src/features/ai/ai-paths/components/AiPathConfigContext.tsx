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
import { logClientError } from '@/features/observability';
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
  pathDebugSnapshot?: PathDebugSnapshot | null | undefined;
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
  clearRuntimeForNode?: ((nodeId: string) => void) | undefined;
  clearNodeCache?: ((nodeId: string) => void) | undefined;
  clearNodeHistory?: ((nodeId: string) => void | Promise<void>) | undefined;
  onSendToAi?: ((databaseNodeId: string, prompt: string) => Promise<void>) | undefined;
  sendingToAi?: boolean | undefined;
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
  onDirtyChange?: ((dirty: boolean) => void) | undefined;
  savePathConfig?: ((options?: {
    silent?: boolean | undefined;
    includeNodeConfig?: boolean | undefined;
    force?: boolean | undefined;
    nodesOverride?: AiNode[] | undefined;
    nodeOverride?: AiNode | undefined;
    edgesOverride?: Edge[] | undefined;
  }) => Promise<boolean>) | undefined;
}

const AiPathConfigContext = createContext<AiPathConfigData | null>(null);

const FALLBACK_NODE: AiNode = {
  id: '__missing-node__',
  type: 'constant',
  title: 'Node',
  description: '',
  inputs: [],
  outputs: [],
  position: { x: 0, y: 0 },
  config: {},
};

const FALLBACK_RUNTIME_STATE: RuntimeState = {
  inputs: {},
  outputs: {},
  history: {},
};

const noop = (): void => {};
const asyncNoop = async (): Promise<void> => {};

const fallbackConfigValue: AiPathConfigData = {
  configOpen: false,
  setConfigOpen: noop,
  selectedNode: null,
  nodes: [FALLBACK_NODE],
  edges: [],
  isPathLocked: false,
  modelOptions: [],
  parserSamples: {},
  setParserSamples: noop as React.Dispatch<React.SetStateAction<Record<string, ParserSampleState>>>,
  parserSampleLoading: false,
  updaterSamples: {},
  setUpdaterSamples: noop as React.Dispatch<React.SetStateAction<Record<string, UpdaterSampleState>>>,
  updaterSampleLoading: false,
  runtimeState: FALLBACK_RUNTIME_STATE,
  pathDebugSnapshot: null,
  updateSelectedNode: noop,
  updateSelectedNodeConfig: noop,
  handleFetchParserSample: asyncNoop,
  handleFetchUpdaterSample: asyncNoop,
  handleRunSimulation: noop,
  clearRuntimeForNode: noop,
  clearNodeCache: noop,
  clearNodeHistory: asyncNoop,
  onSendToAi: asyncNoop,
  sendingToAi: false,
  dbQueryPresets: [],
  setDbQueryPresets: noop as React.Dispatch<React.SetStateAction<DbQueryPreset[]>>,
  saveDbQueryPresets: asyncNoop,
  dbNodePresets: [],
  setDbNodePresets: noop as React.Dispatch<React.SetStateAction<DbNodePreset[]>>,
  saveDbNodePresets: asyncNoop,
  toast: noop,
  onDirtyChange: noop,
  savePathConfig: async () => false,
};

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

export function AiPathConfigProvider({
  children,
  ...props
}: AiPathConfigData & { children: React.ReactNode }): React.ReactNode {
  const value = useMemo(() => props, [
    props.configOpen,
    props.setConfigOpen,
    props.selectedNode,
    props.nodes,
    props.edges,
    props.isPathLocked,
    props.modelOptions,
    props.parserSamples,
    props.setParserSamples,
    props.parserSampleLoading,
    props.updaterSamples,
    props.setUpdaterSamples,
    props.updaterSampleLoading,
    props.runtimeState,
    props.pathDebugSnapshot,
    props.updateSelectedNode,
    props.updateSelectedNodeConfig,
    props.handleFetchParserSample,
    props.handleFetchUpdaterSample,
    props.handleRunSimulation,
    props.clearRuntimeForNode,
    props.clearNodeCache,
    props.clearNodeHistory,
    props.onSendToAi,
    props.sendingToAi,
    props.dbQueryPresets,
    props.setDbQueryPresets,
    props.saveDbQueryPresets,
    props.dbNodePresets,
    props.setDbNodePresets,
    props.saveDbNodePresets,
    props.toast,
    props.onDirtyChange,
    props.savePathConfig,
  ]);

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
    <AiPathConfigProvider {...value}>
      {children}
    </AiPathConfigProvider>
  );
}

export function useAiPathConfig(): AiPathConfigData {
  const context = useContext(AiPathConfigContext);
  if (!context) {
    if (process.env['NODE_ENV'] !== 'production') {
      logClientError(new Error('Missing AiPathConfigProvider'), {
        context: { source: 'AiPathConfigContext', message: 'Using fallback config context.' },
      });
    }
    return fallbackConfigValue;
  }
  return context;
}
