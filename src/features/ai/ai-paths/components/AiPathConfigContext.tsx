'use client';

import React, { createContext, useContext, useMemo } from 'react';

import { logClientError } from '@/features/observability';
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
