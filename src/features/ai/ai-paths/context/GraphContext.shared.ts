
import type { AiNode, Edge, NodeConfig, PathConfig, PathMeta } from '@/shared/contracts/ai-paths';

import type { ReactNode } from 'react';

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
}

export interface GraphDataState {
  nodes: AiNode[];
  edges: Edge[];
  graphRevision: number;
  lastMutation: GraphMutationRecord | null;
  paths: PathMeta[];
  pathConfigs: Record<string, PathConfig>;
  activePathId: string | null;
}

/**
 * @deprecated Use `usePathConfigState` from `PathConfigContext` instead.
 * Kept temporarily so external types continue to resolve during migration.
 */
export type PathMetadataState = GraphDataState;

export type GraphState = GraphDataState;

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
