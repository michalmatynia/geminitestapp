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

interface AiPathConfigData {
  selectedNode: AiNode | null;
  nodes: AiNode[];
  edges: Edge[];
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
}

const AiPathConfigContext = createContext<AiPathConfigData | null>(null);

export function AiPathConfigProvider({
  children,
  ...props
}: AiPathConfigData & { children: React.ReactNode }): React.ReactNode {
  const value = useMemo(() => props, [
    props.selectedNode,
    props.nodes,
    props.edges,
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
    props.onSendToAi,
    props.sendingToAi,
    props.dbQueryPresets,
    props.setDbQueryPresets,
    props.saveDbQueryPresets,
    props.dbNodePresets,
    props.setDbNodePresets,
    props.saveDbNodePresets,
    props.toast,
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
    throw new Error('useAiPathConfig must be used within an AiPathConfigProvider');
  }
  return context;
}
