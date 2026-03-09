import type { ReactNode } from 'react';

import type {
  AiNode,
  AiPathsValidationConfig,
  Edge,
  NodeConfig,
  PathBlockedRunPolicy,
  PathConfig,
  PathExecutionMode,
  PathFlowIntensity,
  PathMeta,
  PathRunMode,
} from '@/shared/lib/ai-paths';
import {
  AI_PATHS_HISTORY_RETENTION_DEFAULT,
  AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_DEFAULT,
  DEFAULT_AI_PATHS_VALIDATION_CONFIG,
} from '@/shared/lib/ai-paths';

export type GraphMutationReason =
  | 'drop'
  | 'drag'
  | 'select'
  | 'delete'
  | 'load_path'
  | 'update'
  | 'unknown';

export interface GraphMutationMeta {
  reason?: GraphMutationReason;
  source?: string;
  allowNodeCountDecrease?: boolean;
}

export interface GraphMutationRecord {
  revision: number;
  reason: GraphMutationReason;
  source: string | null;
  timestamp: string;
  changedNodes: boolean;
  changedEdges: boolean;
}

export interface GraphLoadPayload {
  nodes: AiNode[];
  edges: Edge[];
  pathName?: string | undefined;
  pathDescription?: string | undefined;
  activeTrigger?: string | undefined;
  executionMode?: PathExecutionMode | undefined;
  flowIntensity?: PathFlowIntensity | undefined;
  runMode?: PathRunMode | undefined;
  strictFlowMode?: boolean | undefined;
  blockedRunPolicy?: PathBlockedRunPolicy | undefined;
  aiPathsValidation?: AiPathsValidationConfig | undefined;
  historyRetentionPasses?: number | undefined;
  historyRetentionOptionsMax?: number | undefined;
  isPathLocked?: boolean | undefined;
  isPathActive?: boolean | undefined;
}

export interface GraphState {
  nodes: AiNode[];
  edges: Edge[];
  paths: PathMeta[];
  pathConfigs: Record<string, PathConfig>;
  activePathId: string | null;
  pathName: string;
  pathDescription: string;
  activeTrigger: string;
  executionMode: PathExecutionMode;
  flowIntensity: PathFlowIntensity;
  runMode: PathRunMode;
  strictFlowMode: boolean;
  blockedRunPolicy: PathBlockedRunPolicy;
  aiPathsValidation: AiPathsValidationConfig;
  historyRetentionPasses: number;
  historyRetentionOptionsMax: number;
  isPathLocked: boolean;
  isPathActive: boolean;
  graphRevision: number;
  lastMutation: GraphMutationRecord | null;
}

export interface GraphActions {
  setNodes: (
    nodes: AiNode[] | ((prev: AiNode[]) => AiNode[]),
    mutationMeta?: GraphMutationMeta
  ) => void;
  addNode: (node: AiNode) => void;
  updateNode: (nodeId: string, update: Partial<AiNode>) => void;
  updateNodeConfig: (nodeId: string, config: NodeConfig) => void;
  removeNode: (nodeId: string) => void;
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[]), mutationMeta?: GraphMutationMeta) => void;
  addEdge: (edge: Edge) => void;
  removeEdge: (edgeId: string) => void;
  clearEdges: () => void;
  setPaths: (paths: PathMeta[] | ((prev: PathMeta[]) => PathMeta[])) => void;
  setPathConfigs: (
    configs:
      | Record<string, PathConfig>
      | ((prev: Record<string, PathConfig>) => Record<string, PathConfig>)
  ) => void;
  setActivePathId: (pathId: string | null) => void;
  setPathName: (name: string) => void;
  setPathDescription: (description: string) => void;
  setActiveTrigger: (trigger: string) => void;
  setExecutionMode: (mode: PathExecutionMode) => void;
  setFlowIntensity: (intensity: PathFlowIntensity) => void;
  setRunMode: (mode: PathRunMode) => void;
  setStrictFlowMode: (enabled: boolean) => void;
  setBlockedRunPolicy: (policy: PathBlockedRunPolicy) => void;
  setAiPathsValidation: (config: AiPathsValidationConfig) => void;
  setHistoryRetentionPasses: (passes: number) => void;
  setHistoryRetentionOptionsMax: (max: number) => void;
  setIsPathLocked: (locked: boolean) => void;
  togglePathLock: () => void;
  setIsPathActive: (active: boolean) => void;
  togglePathActive: () => void;
  loadGraph: (data: GraphLoadPayload) => void;
  resetGraph: () => void;
}

export interface GraphProviderProps {
  children: ReactNode;
  initialNodesData?: AiNode[] | undefined;
  initialEdgesData?: Edge[] | undefined;
  initialPaths?: PathMeta[] | undefined;
  initialPathConfigs?: Record<string, PathConfig> | undefined;
  initialActivePathId?: string | null | undefined;
}

export const DEFAULT_PATH_NAME = 'Description Inference Path';
export const DEFAULT_PATH_DESCRIPTION = 'Vision + text model workflow with structured updates.';
export const DEFAULT_TRIGGER = 'Product Modal - Context Filter';
export const DEFAULT_EXECUTION_MODE: PathExecutionMode = 'server';
export const DEFAULT_FLOW_INTENSITY: PathFlowIntensity = 'medium';
export const DEFAULT_RUN_MODE: PathRunMode = 'manual';
export const DEFAULT_STRICT_FLOW_MODE = true;
export const DEFAULT_BLOCKED_RUN_POLICY: PathBlockedRunPolicy = 'fail_run';
export const DEFAULT_AI_PATHS_VALIDATION: AiPathsValidationConfig =
  DEFAULT_AI_PATHS_VALIDATION_CONFIG;
export const DEFAULT_HISTORY_RETENTION_PASSES = AI_PATHS_HISTORY_RETENTION_DEFAULT;
export const DEFAULT_HISTORY_RETENTION_OPTIONS_MAX =
  AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_DEFAULT;
