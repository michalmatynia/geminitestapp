import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

export type GraphIntegrityIssue =
  | {
    kind: 'invalid_edge';
    count: number;
  }
  | {
    kind: 'disconnected_processing_node';
    nodeId: string;
    nodeType: string;
    nodeTitle: string;
  };

export type GraphIntegrityReport = {
  issues: GraphIntegrityIssue[];
  invalidEdgeCount: number;
  disconnectedProcessingNodes: Array<{
    nodeId: string;
    nodeType: string;
    nodeTitle: string;
  }>;
};

export type CompiledGraph = {
  nodes: AiNode[];
  edges: Edge[];
  nodeMap: Map<string, AiNode>;
  adjacency: Map<string, string[]>;
  inverseAdjacency: Map<string, string[]>;
  triggerNodeId: string | null;
  processingNodeIds: string[];
  terminalNodeIds: string[];
};
