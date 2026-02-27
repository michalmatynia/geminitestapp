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

export type GraphCompileCode =
  | 'fan_in_single_port'
  | 'required_input_missing_wiring'
  | 'cycle_detected'
  | 'unsupported_cycle'
  | 'cycle_wait_deadlock_risk'
  | 'incompatible_wiring'
  | 'optional_input_incompatible_wiring'
  | 'trigger_context_resolution_risk'
  | 'model_prompt_deadlock_risk'
  | 'context_cache_scope_risk';

export type GraphCompileFinding = {
  code: GraphCompileCode | string;
  severity: 'error' | 'warning';
  message: string;
  ruleTitle?: string;
  nodeId?: string;
  edgeId?: string;
  port?: string;
  metadata?: Record<string, unknown>;
};

export type GraphCompileReport = CompiledGraph & {
  ok: boolean;
  errors: number;
  warnings: number;
  findings: GraphCompileFinding[];
};
