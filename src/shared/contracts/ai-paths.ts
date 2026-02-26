import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';
import {
  aiEdgeSchema,
  aiNodeSchema,
  edgeSchema,
  type AiNode,
  type Edge,
} from './ai-paths-core';
export * from './ai-paths-core';

import {
  aiPathNodeStatusSchema,
  aiPathRunSchema,
  aiPathRunStatusSchema,
  type AiPathNodeStatus,
  type AiPathNodeStatusDto,
  type AiPathRunDto,
  type AiPathRunStatus,
  type AiPathRunStatusDto,
} from './ai-paths-runtime';

export {
  aiPathNodeStatusSchema,
  aiPathRunSchema,
  aiPathRunStatusSchema,
  type AiPathNodeStatus,
  type AiPathNodeStatusDto,
  type AiPathRunDto,
  type AiPathRunStatus,
  type AiPathRunStatusDto,
};

/**
 * AI Path Contract
 */
export const aiPathSchema = namedDtoSchema.extend({
  nodes: z.array(aiNodeSchema),
  edges: z.array(aiEdgeSchema),
  config: z.record(z.string(), z.unknown()),
  enabled: z.boolean(),
  version: z.number(),
});

export type AiPathDto = z.infer<typeof aiPathSchema>;

export const createAiPathSchema = aiPathSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAiPathDto = z.infer<typeof createAiPathSchema>;
export type AiPathCreateInput = CreateAiPathDto;
export type UpdateAiPathDto = Partial<CreateAiPathDto>;
export type AiPathUpdateInput = UpdateAiPathDto;

/**
 * AI Path Run Record Contract
 */
export const aiPathRunRecordSchema = aiPathRunSchema.extend({
  recordingPath: z.string().nullable().optional(),
  planState: z.record(z.string(), z.unknown()).nullable().optional(),
  activeStepId: z.string().nullable().optional(),
  checkpointedAt: z.string().nullable().optional(),
  graph: z.object({
    nodes: z.array(aiNodeSchema),
    edges: z.array(aiEdgeSchema),
  }).nullable().optional(),
  runtimeState: z.unknown().nullable().optional(), // Avoid circular dependency with ai-paths-runtime
  _count: z.object({
    browserSnapshots: z.number().optional(),
    browserLogs: z.number().optional(),
  }).optional(),
});

export type AiPathRunRecordDto = z.infer<typeof aiPathRunRecordSchema>;
export type AiPathRunRecord = AiPathRunRecordDto;

export const aiPathRunDetailSchema = z.object({
  run: aiPathRunRecordSchema,
  nodes: z.array(z.any()), // aiPathRunNodeSchema - can't use it yet because it is defined below
  events: z.array(z.any()), // aiPathRunEventSchema - defined below
});

export type AiPathRunDetailDto = z.infer<typeof aiPathRunDetailSchema>;
export type AiPathRunDetail = AiPathRunDetailDto;

export const createAiPathRunSchema = aiPathRunSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    status: true,
  })
  .extend({
    status: aiPathRunStatusSchema.optional(),
  });

export type CreateAiPathRunDto = z.infer<typeof createAiPathRunSchema>;
export type UpdateAiPathRunDto = Partial<CreateAiPathRunDto>;
export type AiPathRunUpdateInput = UpdateAiPathRunDto;

export const aiPathRunUpdateSchema = aiPathRunRecordSchema.partial().omit({
  id: true,
  userId: true,
  pathId: true,
  createdAt: true,
});

export type AiPathRunUpdateDto = z.infer<typeof aiPathRunUpdateSchema>;

/**
 * AI Path Run Node Contract
 */
export const aiPathRunNodeSchema = dtoBaseSchema.extend({
  runId: z.string(),
  nodeId: z.string(),
  nodeType: z.string(),
  nodeTitle: z.string().nullable().optional(),
  status: aiPathNodeStatusSchema,
  attempt: z.number(),
  inputs: z.record(z.string(), z.unknown()).optional(),
  outputs: z.record(z.string(), z.unknown()).optional(),
  error: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
});

export type AiPathRunNodeDto = z.infer<typeof aiPathRunNodeSchema>;
export type AiPathRunNodeRecord = AiPathRunNodeDto;

/**
 * AI Path Run Event Contract
 */
export const aiPathRunEventLevelSchema = z.enum(['debug', 'info', 'warn', 'error', 'fatal']);
export type AiPathRunEventLevelDto = z.infer<typeof aiPathRunEventLevelSchema>;
export type AiPathRunEventLevel = AiPathRunEventLevelDto;

export const aiPathRunEventSchema = dtoBaseSchema.extend({
  runId: z.string(),
  nodeId: z.string().nullable().optional(),
  nodeType: z.string().nullable().optional(),
  nodeTitle: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  iteration: z.number().nullable().optional(),
  level: aiPathRunEventLevelSchema,
  message: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type AiPathRunEventDto = z.infer<typeof aiPathRunEventSchema>;
export type AiPathRunEventRecord = AiPathRunEventDto;

export const aiPathRunNodeUpdateSchema = aiPathRunNodeSchema.partial().omit({
  id: true,
  runId: true,
  nodeId: true,
  createdAt: true,
});

export type AiPathRunNodeUpdateDto = z.infer<typeof aiPathRunNodeUpdateSchema>;

export const aiPathRunEventCreateInputSchema = z.object({
  runId: z.string(),
  nodeId: z.string().nullable().optional(),
  nodeType: z.string().nullable().optional(),
  nodeTitle: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  iteration: z.number().nullable().optional(),
  level: aiPathRunEventLevelSchema,
  message: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type AiPathRunEventCreateInputDto = z.infer<typeof aiPathRunEventCreateInputSchema>;

/**
 * AI Paths Composite & Domain DTOs
 */

export const aiPathRuntimeAnalyticsRangeSchema = z.enum(['1h', '24h', '7d', '30d']);
export type AiPathRuntimeAnalyticsRangeDto = z.infer<typeof aiPathRuntimeAnalyticsRangeSchema>;
export type AiPathRuntimeAnalyticsRange = AiPathRuntimeAnalyticsRangeDto;

export const aiPathRuntimeAnalyticsSlowestSpanSchema = z.object({
  runId: z.string(),
  spanId: z.string(),
  nodeId: z.string(),
  nodeType: z.string(),
  status: z.string(),
  durationMs: z.number(),
});

export type AiPathRuntimeAnalyticsSlowestSpanDto = z.infer<
  typeof aiPathRuntimeAnalyticsSlowestSpanSchema
>;
export type AiPathRuntimeAnalyticsSlowestSpan = AiPathRuntimeAnalyticsSlowestSpanDto;

export const aiPathRuntimeTraceSlowNodeSchema = z.object({
  nodeId: z.string(),
  nodeType: z.string(),
  spanCount: z.number(),
  avgDurationMs: z.number(),
  maxDurationMs: z.number(),
  totalDurationMs: z.number(),
});

export type AiPathRuntimeTraceSlowNodeDto = z.infer<
  typeof aiPathRuntimeTraceSlowNodeSchema
>;
export type AiPathRuntimeTraceSlowNode = AiPathRuntimeTraceSlowNodeDto;

export const aiPathRuntimeTraceFailedNodeSchema = z.object({
  nodeId: z.string(),
  nodeType: z.string(),
  failedCount: z.number(),
  spanCount: z.number(),
});

export type AiPathRuntimeTraceFailedNodeDto = z.infer<
  typeof aiPathRuntimeTraceFailedNodeSchema
>;
export type AiPathRuntimeTraceFailedNode = AiPathRuntimeTraceFailedNodeDto;

export const aiPathRuntimeTraceAnalyticsSchema = z.object({
  source: z.enum(['none', 'db_sample']),
  sampledRuns: z.number(),
  sampledSpans: z.number(),
  completedSpans: z.number(),
  failedSpans: z.number(),
  cachedSpans: z.number(),
  avgDurationMs: z.number().nullable(),
  p95DurationMs: z.number().nullable(),
  slowestSpan: aiPathRuntimeAnalyticsSlowestSpanSchema.nullable(),
  topSlowNodes: z.array(aiPathRuntimeTraceSlowNodeSchema),
  topFailedNodes: z.array(aiPathRuntimeTraceFailedNodeSchema),
  truncated: z.boolean(),
});

export type AiPathRuntimeTraceAnalyticsDto = z.infer<
  typeof aiPathRuntimeTraceAnalyticsSchema
>;
export type AiPathRuntimeTraceAnalytics = AiPathRuntimeTraceAnalyticsDto;

export const aiPathRuntimeAnalyticsSummarySchema = z.object({
  from: z.string(),
  to: z.string(),
  range: z.string(),
  storage: z.enum(['redis', 'disabled']),
  runs: z.object({
    total: z.number(),
    queued: z.number(),
    started: z.number(),
    completed: z.number(),
    failed: z.number(),
    canceled: z.number(),
    deadLettered: z.number(),
    successRate: z.number(),
    failureRate: z.number(),
    deadLetterRate: z.number(),
    avgDurationMs: z.number().nullable(),
    p95DurationMs: z.number().nullable(),
  }),
  nodes: z.object({
    started: z.number(),
    completed: z.number(),
    failed: z.number(),
    queued: z.number(),
    running: z.number(),
    polling: z.number(),
    cached: z.number(),
    waitingCallback: z.number(),
  }),
  brain: z.object({
    analyticsReports: z.number(),
    logReports: z.number(),
    totalReports: z.number(),
    warningReports: z.number(),
    errorReports: z.number(),
  }),
  traces: aiPathRuntimeTraceAnalyticsSchema,
  generatedAt: z.string(),
});

export type AiPathRuntimeAnalyticsSummaryDto = z.infer<typeof aiPathRuntimeAnalyticsSummarySchema>;
export type AiPathRuntimeAnalyticsSummary = AiPathRuntimeAnalyticsSummaryDto;

export const pathMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PathMetaDto = z.infer<typeof pathMetaSchema>;
export type PathMeta = PathMetaDto;

export const pathUiStateSchema = z.object({
  selectedNodeId: z.string().nullable().optional(),
  configOpen: z.boolean().optional(),
});

export type PathUiStateDto = z.infer<typeof pathUiStateSchema>;
export type PathUiState = PathUiStateDto;

export const aiPathsValidationSeveritySchema = z.enum(['error', 'warning', 'info']);
export type AiPathsValidationSeverityDto = z.infer<
  typeof aiPathsValidationSeveritySchema
>;
export type AiPathsValidationSeverity = AiPathsValidationSeverityDto;

export const aiPathsValidationModuleSchema = z.enum([
  'graph',
  'trigger',
  'simulation',
  'context',
  'parser',
  'database',
  'model',
  'poll',
  'router',
  'gate',
  'validation_pattern',
  'custom',
]);
export type AiPathsValidationModuleDto = z.infer<
  typeof aiPathsValidationModuleSchema
>;
export type AiPathsValidationModule = AiPathsValidationModuleDto;

export const aiPathsValidationOperatorSchema = z.enum([
  'exists',
  'non_empty',
  'equals',
  'in',
  'matches_regex',
  'wired_from',
  'wired_to',
  'has_incoming_port',
  'has_outgoing_port',
  'jsonpath_exists',
  'jsonpath_equals',
  'collection_exists',
  'entity_collection_resolves',
  'edge_endpoints_resolve',
  'edge_ports_declared',
  'node_types_known',
  'node_ids_unique',
  'edge_ids_unique',
  'node_positions_finite',
]);
export type AiPathsValidationOperatorDto = z.infer<
  typeof aiPathsValidationOperatorSchema
>;
export type AiPathsValidationOperator = AiPathsValidationOperatorDto;

export const aiPathsValidationConditionSchema = z.object({
  id: z.string(),
  operator: aiPathsValidationOperatorSchema,
  field: z.string().optional(),
  valuePath: z.string().optional(),
  expected: z.unknown().optional(),
  list: z.array(z.string()).optional(),
  flags: z.string().optional(),
  port: z.string().optional(),
  fromPort: z.string().optional(),
  toPort: z.string().optional(),
  fromNodeType: z.string().optional(),
  toNodeType: z.string().optional(),
  sourceNodeId: z.string().optional(),
  targetNodeId: z.string().optional(),
  collectionMapKey: z.string().optional(),
  negate: z.boolean().optional(),
});
export type AiPathsValidationConditionDto = z.infer<
  typeof aiPathsValidationConditionSchema
>;
export type AiPathsValidationCondition = AiPathsValidationConditionDto;

export const aiPathsValidationRuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  enabled: z.boolean(),
  severity: aiPathsValidationSeveritySchema,
  module: aiPathsValidationModuleSchema,
  appliesToNodeTypes: z.array(z.string()).optional(),
  sequence: z.number().optional(),
  conditionMode: z.enum(['all', 'any']).optional(),
  conditions: z.array(aiPathsValidationConditionSchema).min(1),
  weight: z.number().optional(),
  forceProbabilityIfFailed: z.number().optional(),
  recommendation: z.string().optional(),
  docsBindings: z.array(z.string()).optional(),
  inference: z
    .object({
      sourceType: z.enum(['manual', 'central_docs']).optional(),
      status: z.enum(['candidate', 'approved', 'rejected', 'deprecated']).optional(),
      assertionId: z.string().optional(),
      sourcePath: z.string().optional(),
      sourceHash: z.string().optional(),
      docsSnapshotHash: z.string().optional(),
      confidence: z.number().optional(),
      compilerVersion: z.string().optional(),
      inferredAt: z.string().optional(),
      approvedAt: z.string().optional(),
      approvedBy: z.string().optional(),
      reviewNote: z.string().optional(),
      tags: z.array(z.string()).optional(),
      deprecates: z.array(z.string()).optional(),
    })
    .optional(),
});
export type AiPathsValidationRuleDto = z.infer<typeof aiPathsValidationRuleSchema>;
export type AiPathsValidationRule = AiPathsValidationRuleDto;

export const aiPathsValidationDocsSyncStateSchema = z.object({
  lastSnapshotHash: z.string().optional(),
  lastSyncedAt: z.string().optional(),
  lastSyncStatus: z.enum(['idle', 'success', 'warning', 'error']).optional(),
  lastSyncWarnings: z.array(z.string()).optional(),
  sourceCount: z.number().optional(),
  candidateCount: z.number().optional(),
});
export type AiPathsValidationDocsSyncStateDto = z.infer<
  typeof aiPathsValidationDocsSyncStateSchema
>;
export type AiPathsValidationDocsSyncState = AiPathsValidationDocsSyncStateDto;

export const aiPathsValidationPolicySchema = z.enum([
  'report_only',
  'warn_below_threshold',
  'block_below_threshold',
]);
export type AiPathsValidationPolicyDto = z.infer<
  typeof aiPathsValidationPolicySchema
>;
export type AiPathsValidationPolicy = AiPathsValidationPolicyDto;

export const aiPathsValidationConfigSchema = z.object({
  schemaVersion: z.number().int().positive().optional(),
  enabled: z.boolean().optional(),
  policy: aiPathsValidationPolicySchema.optional(),
  warnThreshold: z.number().optional(),
  blockThreshold: z.number().optional(),
  baseScore: z.number().optional(),
  lastEvaluatedAt: z.string().nullable().optional(),
  collectionMap: z.record(z.string(), z.string()).optional(),
  docsSources: z.array(z.string()).optional(),
  rules: z.array(aiPathsValidationRuleSchema).optional(),
  inferredCandidates: z.array(aiPathsValidationRuleSchema).optional(),
  docsSyncState: aiPathsValidationDocsSyncStateSchema.optional(),
});
export type AiPathsValidationConfigDto = z.infer<
  typeof aiPathsValidationConfigSchema
>;
export type AiPathsValidationConfig = AiPathsValidationConfigDto;

export const pathBlockedRunPolicySchema = z.enum([
  'fail_run',
  'complete_with_warning',
]);
export type PathBlockedRunPolicyDto = z.infer<
  typeof pathBlockedRunPolicySchema
>;
export type PathBlockedRunPolicy = PathBlockedRunPolicyDto;

export const pathConfigSchema = z.object({
  id: z.string(),
  version: z.number(),
  name: z.string(),
  description: z.string(),
  trigger: z.string(),
  executionMode: z.string().optional(),
  flowIntensity: z.string().optional(),
  runMode: z.string().optional(),
  strictFlowMode: z.boolean().optional(),
  blockedRunPolicy: pathBlockedRunPolicySchema.optional(),
  nodes: z.array(aiNodeSchema),
  edges: z.array(edgeSchema),
  updatedAt: z.string(),
  isLocked: z.boolean().optional(),
  isActive: z.boolean().optional(),
  parserSamples: z.record(z.string(), z.any()).optional(),
  updaterSamples: z.record(z.string(), z.any()).optional(),
  runtimeState: z.any().optional(),
  lastRunAt: z.string().nullable().optional(),
  runCount: z.number().optional(),
  aiPathsValidation: aiPathsValidationConfigSchema.optional(),
  uiState: pathUiStateSchema.optional(),
});

export type PathConfigDto = z.infer<typeof pathConfigSchema>;
export type PathConfig = PathConfigDto;

export const pathDebugEntrySchema = z.object({
  nodeId: z.string(),
  title: z.string().optional(),
  debug: z.unknown(),
});

export type PathDebugEntryDto = z.infer<typeof pathDebugEntrySchema>;
export type PathDebugEntry = PathDebugEntryDto;

export const pathDebugSnapshotSchema = z.object({
  pathId: z.string(),
  runAt: z.string(),
  entries: z.array(pathDebugEntrySchema),
});

export type PathDebugSnapshotDto = z.infer<typeof pathDebugSnapshotSchema>;
export type PathDebugSnapshot = PathDebugSnapshotDto;

export const clusterPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  bundlePorts: z.array(z.string()),
  template: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ClusterPresetDto = z.infer<typeof clusterPresetSchema>;
export type ClusterPreset = ClusterPresetDto;

export const dbQueryPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  queryTemplate: z.string(),
  updateTemplate: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DbQueryPresetDto = z.infer<typeof dbQueryPresetSchema>;
export type DbQueryPreset = DbQueryPresetDto;

export const dbNodePresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  config: z.any(), // databaseConfigSchema
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DbNodePresetDto = z.infer<typeof dbNodePresetSchema>;
export type DbNodePreset = DbNodePresetDto;

export const jsonPathEntrySchema = z.object({
  path: z.string(),
  type: z.enum(['object', 'array', 'value']),
});

export type JsonPathEntryDto = z.infer<typeof jsonPathEntrySchema>;
export type JsonPathEntry = JsonPathEntryDto;

export const connectionValidationSchema = z.object({
  valid: z.boolean(),
  message: z.string().optional(),
});

export type ConnectionValidationDto = z.infer<typeof connectionValidationSchema>;
export type ConnectionValidation = ConnectionValidationDto;

/**
 * AI Path Run List Options Contract
 */
export const aiPathRunEventListOptionsSchema = z.object({
  since: z.string().nullable().optional(),
  after: z.object({
    createdAt: z.string(),
    id: z.string(),
  }).nullable().optional(),
  limit: z.number().optional(),
});

export type AiPathRunEventListOptionsDto = z.infer<typeof aiPathRunEventListOptionsSchema>;
export type AiPathRunEventListOptions = AiPathRunEventListOptionsDto;

export const aiPathRunListOptionsSchema = z.object({
  userId: z.string().nullable().optional(),
  pathId: z.string().optional(),
  nodeId: z.string().optional(),
  requestId: z.string().optional(),
  source: z.string().optional(),
  sourceMode: z.enum(['include', 'exclude']).optional(),
  status: aiPathRunStatusSchema.optional(),
  statuses: z.array(aiPathRunStatusSchema).optional(),
  query: z.string().optional(),
  createdAfter: z.string().nullable().optional(),
  createdBefore: z.string().nullable().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  includeTotal: z.boolean().optional(),
});

export type AiPathRunListOptionsDto = z.infer<typeof aiPathRunListOptionsSchema>;
export type AiPathRunListOptions = AiPathRunListOptionsDto;

export const aiPathRunListResultSchema = z.object({
  runs: z.array(aiPathRunSchema),
  total: z.number(),
});

export type AiPathRunListResultDto = z.infer<typeof aiPathRunListResultSchema>;
export type AiPathRunListResult = AiPathRunListResultDto;

/**
 * Execution Contract
 */
export const executeAiPathSchema = z.object({
  pathId: z.string(),
  triggerNodeId: z.string().optional(),
  triggerEvent: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export type ExecuteAiPathDto = z.infer<typeof executeAiPathSchema>;

export type PathFlowIntensity = 'off' | 'low' | 'medium' | 'high';

/**
 * AI Path Repository Interfaces
 */

export type AiPathRunCreateInput = Omit<CreateAiPathRunDto, 'status'> & {
  status?: AiPathRunStatus | undefined;
  graph?: { nodes: AiNode[]; edges: Edge[] | unknown[] } | null | undefined;
  runtimeState?: Record<string, unknown> | null | undefined;
};

export type AiPathRunUpdate = AiPathRunUpdateDto & {
  status?: AiPathRunStatus;
  triggerContext?: Record<string, unknown> | null;
  graph?: { nodes: AiNode[]; edges: Edge[] | unknown[] } | null;
};

export type AiPathRunNodeUpdate = Partial<AiPathRunNodeDto> & {
  status?: AiPathNodeStatus;
};

export type AiPathRunEventCreateInput = z.infer<typeof aiPathRunEventCreateInputSchema>;

export type AiPathRunRepository = {
  createRun(input: AiPathRunCreateInput): Promise<AiPathRunRecord>;
  updateRun(runId: string, data: AiPathRunUpdate): Promise<AiPathRunRecord>;
  updateRunIfStatus(
    runId: string,
    expectedStatuses: AiPathRunStatus[],
    data: AiPathRunUpdate
  ): Promise<AiPathRunRecord | null>;
  claimRunForProcessing(runId: string): Promise<AiPathRunRecord | null>;
  findRunById(runId: string): Promise<AiPathRunRecord | null>;
  deleteRun(runId: string): Promise<boolean>;
  listRuns(options?: AiPathRunListOptions): Promise<AiPathRunListResult>;
  deleteRuns(options?: AiPathRunListOptions): Promise<{ count: number }>;
  claimNextQueuedRun(): Promise<AiPathRunRecord | null>;
  getQueueStats(): Promise<{ queuedCount: number; oldestQueuedAt: Date | null }>;
  createRunNodes(runId: string, nodes: AiNode[]): Promise<void>;
  upsertRunNode(
    runId: string,
    nodeId: string,
    data: AiPathRunNodeUpdate & { nodeType: string; nodeTitle?: string | null }
  ): Promise<AiPathRunNodeRecord>;
  listRunNodes(runId: string): Promise<AiPathRunNodeRecord[]>;
  listRunNodesSince(
    runId: string,
    cursor: { updatedAt: Date | string; nodeId: string },
    options?: { limit?: number }
  ): Promise<AiPathRunNodeRecord[]>;
  createRunEvent(input: AiPathRunEventCreateInput): Promise<AiPathRunEventRecord>;
  listRunEvents(runId: string, options?: AiPathRunEventListOptions): Promise<AiPathRunEventRecord[]>;
  markStaleRunningRuns(maxAgeMs: number): Promise<{ count: number }>;
  finalizeRun(
    runId: string,
    status: AiPathRunStatus,
    options?: {
      errorMessage?: string | null;
      event?: Omit<AiPathRunEventCreateInput, 'runId'>;
      finishedAt?: string | null;
    }
  ): Promise<void>;
};

/**
 * Runtime Types (imported from ai-paths-runtime for consolidation)
 */
export type {
  RuntimeState,
  RuntimePortValues,
  RuntimeEventInputDto,
  RunStatusDto,
  SetNodeStatusInputDto,
  PathExecutionMode,
  PathRunMode,
  QueuedRunDto,
  RuntimeHistoryEntry,
  RuntimeHistoryLink,
} from './ai-paths-runtime';
