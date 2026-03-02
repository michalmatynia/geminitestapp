import {
  type AiNode,
  type Edge,
  type ParserSampleState,
  type UpdaterSampleState,
  type AiPathsValidationConfig,
} from './nodes';
import { type RuntimeState } from '../ai-paths-runtime';

/**
 * Validation Engine DTOs
 */

export type AiPathsValidationFinding = {
  id: string;
  ruleId: string;
  ruleTitle: string;
  severity: 'error' | 'warning' | 'info';
  module: string;
  nodeId: string | null;
  nodeTitle: string | null;
  message: string;
  recommendation: string | null;
  docsBindings: string[];
  failedConditionIds: string[];
};

export type AiPathsValidationRecommendation = {
  id: string;
  ruleId: string;
  module: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  recommendation: string;
  nodeId: string | null;
  nodeTitle: string | null;
};

export type AiPathsValidationModuleImpact = {
  module: string;
  rulesEvaluated: number;
  failedRules: number;
  scorePenalty: number;
  severityCounts: Record<'error' | 'warning' | 'info', number>;
};

export type AiPathsValidationReport = {
  schemaVersion: number;
  evaluatedAt: string;
  enabled: boolean;
  policy: NonNullable<AiPathsValidationConfig['policy']>;
  score: number;
  blocked: boolean;
  shouldWarn: boolean;
  warnThreshold: number;
  blockThreshold: number;
  rulesEvaluated: number;
  failedRules: number;
  findings: AiPathsValidationFinding[];
  recommendations: AiPathsValidationRecommendation[];
  severityCounts: Record<'error' | 'warning' | 'info', number>;
  graphStats: {
    nodes: number;
    edges: number;
    byType: Record<string, number>;
  };
  moduleImpact: Record<string, AiPathsValidationModuleImpact>;
  appliedRuleIds: string[];
  skippedRuleIds: string[];
};

export type EvaluateAiPathsValidationInput = {
  nodes: AiNode[];
  edges: Edge[];
  config: AiPathsValidationConfig | null | undefined;
};

/**
 * Graph Integrity & Compilation DTOs
 */

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

/**
 * Dependency Inspector DTOs
 */

export type DependencyRiskSeverity = 'warning' | 'error';

export type DependencyRisk = {
  id: string;
  nodeId: string;
  nodeTitle: string;
  nodeType: string;
  severity: DependencyRiskSeverity;
  category: string;
  message: string;
  recommendation: string;
};

export type DependencyReport = {
  risks: DependencyRisk[];
  warnings: number;
  errors: number;
  strictReady: boolean;
};

export type DependencyInspectorScopeMode = 'full' | 'reachable_from_roots';

export type DependencyInspectorOptions = {
  scopeMode?: DependencyInspectorScopeMode;
  scopeRootNodeIds?: string[] | Set<string>;
};

/**
 * Data Contract Preflight DTOs
 */

export type DataContractPreflightMode = 'light' | 'full';
export type DataContractPreflightScopeMode = 'full' | 'reachable_from_roots';
export type DataContractIssueSeverity = 'warning' | 'error';

export type DataContractIssueCode =
  | 'connection_type_mismatch'
  | 'runtime_value_type_mismatch'
  | 'required_input_unresolved'
  | 'required_input_nullish'
  | 'required_input_empty'
  | 'database_template_token_missing'
  | 'database_template_token_empty'
  | 'database_query_input_shape_mismatch'
  | 'database_scalar_identity_expected';

export type DataContractPreflightIssue = {
  id: string;
  nodeId: string;
  nodeType: string;
  nodeTitle: string;
  severity: DataContractIssueSeverity;
  code: DataContractIssueCode;
  message: string;
  recommendation: string;
  port?: string | undefined;
  token?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
};

export type DataContractNodeIssueSummary = {
  errors: number;
  warnings: number;
  issues: DataContractPreflightIssue[];
};

export type DataContractPreflightReport = {
  mode: DataContractPreflightMode;
  scopeMode: DataContractPreflightScopeMode;
  scopedNodeIds: string[];
  issues: DataContractPreflightIssue[];
  errors: number;
  warnings: number;
  byNodeId: Record<string, DataContractNodeIssueSummary>;
};

export type EvaluateDataContractPreflightArgs = {
  nodes: AiNode[];
  edges: Edge[];
  runtimeState?: RuntimeState | null | undefined;
  parserSamples?: Record<string, ParserSampleState> | null | undefined;
  updaterSamples?: Record<string, UpdaterSampleState> | null | undefined;
  mode?: DataContractPreflightMode | undefined;
  scopeMode?: DataContractPreflightScopeMode | undefined;
  scopeRootNodeIds?: string[] | Set<string> | undefined;
};

/**
 * Run Preflight DTOs
 */

export type RunPreflightBlockReason =
  | 'validation'
  | 'compile'
  | 'dependency'
  | 'data_contract'
  | null;

export type RunPreflightWarning = {
  source: 'validation' | 'compile' | 'dependency' | 'data_contract';
  code: string;
  message: string;
};

export type RunPreflightReport = {
  nodeValidationEnabled: boolean;
  shouldBlock: boolean;
  blockReason: RunPreflightBlockReason;
  blockMessage: string | null;
  validationReport: AiPathsValidationReport;
  compileReport: GraphCompileReport;
  dependencyReport: DependencyReport | null;
  dataContractReport: DataContractPreflightReport;
  warnings: RunPreflightWarning[];
};

export type EvaluateRunPreflightArgs = {
  nodes: AiNode[];
  edges: Edge[];
  aiPathsValidation?: AiPathsValidationConfig | null | undefined;
  strictFlowMode?: boolean | undefined;
  triggerNodeId?: string | null | undefined;
  runtimeState?: RuntimeState | null | undefined;
  parserSamples?: Record<string, ParserSampleState> | null | undefined;
  updaterSamples?: Record<string, UpdaterSampleState> | null | undefined;
  mode?: DataContractPreflightMode | undefined;
};
