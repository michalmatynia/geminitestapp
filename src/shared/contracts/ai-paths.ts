import { z } from 'zod';

export * from './ai-paths-core';

import {
  aiNodeSchema,
  edgeSchema,
  aiPathsValidationConfigSchema,
  type AiNode,
  type Edge,
  type AiPathsValidationRule,
} from './ai-paths-core';

import { dtoBaseSchema, namedDtoSchema } from './base';

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
  nodes: z.array(z.lazy(() => aiNodeSchema)),
  edges: z.array(z.lazy(() => edgeSchema)),
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
  graph: z
    .object({
      nodes: z.array(z.lazy(() => aiNodeSchema)),
      edges: z.array(z.lazy(() => edgeSchema)),
    })
    .nullable()
    .optional(),
  runtimeState: z.unknown().nullable().optional(), // Avoid circular dependency with ai-paths-runtime
  _count: z
    .object({
      browserSnapshots: z.number().optional(),
      browserLogs: z.number().optional(),
    })
    .optional(),
});

export type AiPathRunRecordDto = z.infer<typeof aiPathRunRecordSchema>;
export type AiPathRunRecord = AiPathRunRecordDto;

export const aiPathRunDetailSchema = z.object({
  run: aiPathRunRecordSchema,
  nodes: z.array(z.lazy(() => aiPathRunNodeSchema)),
  events: z.array(z.lazy(() => aiPathRunEventSchema)),
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

export const aiPathRunEventSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().nullable().optional(),
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

export type AiPathRuntimeTraceSlowNodeDto = z.infer<typeof aiPathRuntimeTraceSlowNodeSchema>;
export type AiPathRuntimeTraceSlowNode = AiPathRuntimeTraceSlowNodeDto;

export const aiPathRuntimeTraceFailedNodeSchema = z.object({
  nodeId: z.string(),
  nodeType: z.string(),
  failedCount: z.number(),
  spanCount: z.number(),
});

export type AiPathRuntimeTraceFailedNodeDto = z.infer<typeof aiPathRuntimeTraceFailedNodeSchema>;
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

export type AiPathRuntimeTraceAnalyticsDto = z.infer<typeof aiPathRuntimeTraceAnalyticsSchema>;
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

export type CentralDocsSnapshotSource = {
  id: string;
  path: string;
  type: string;
  hash: string;
  assertionCount: number;
  priority?: number | undefined;
  tags?: string[] | undefined;
  snippetNames?: string[] | undefined;
};

export type CentralDocsSnapshotPayload = {
  generatedAt: string;
  snapshotHash: string;
  warnings: string[];
  sources: CentralDocsSnapshotSource[];
};

export type CentralDocsSnapshotResponse = {
  snapshot: CentralDocsSnapshotPayload;
  inferredCandidates: AiPathsValidationRule[];
};

export type CandidateChangeKind = 'new' | 'changed' | 'existing';

/**
 * AI Path Local Run Contracts
 */
export type AiPathLocalRunStatus = 'success' | 'error';

export type AiPathLocalRunRecord = {
  id: string;
  pathId?: string | null;
  pathName?: string | null;
  triggerEvent?: string | null;
  triggerLabel?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  status: AiPathLocalRunStatus;
  startedAt: string;
  finishedAt: string;
  durationMs?: number | null;
  nodeCount?: number | null;
  /** Engine-measured per-node execution durations (ms) for post-run analysis */
  nodeDurations?: Record<string, number> | null;
  error?: string | null;
  source?: string | null;
};

export const AI_PATHS_MAINTENANCE_ACTION_IDS = [
  'compact_oversized_configs',
  'repair_path_index',
  'ensure_parameter_inference_defaults',
  'ensure_description_inference_defaults',
  'ensure_base_export_defaults',
  'upgrade_translation_en_pl',
  'upgrade_runtime_input_contracts',
  'upgrade_server_execution_mode',
] as const;

export type AiPathsMaintenanceActionId = (typeof AI_PATHS_MAINTENANCE_ACTION_IDS)[number];

export type AiPathsMaintenanceActionReport = {
  id: AiPathsMaintenanceActionId;
  title: string;
  description: string;
  blocking: boolean;
  status: 'pending' | 'ready';
  affectedRecords: number;
};

export type AiPathsMaintenanceReport = {
  scannedAt: string;
  pendingActions: number;
  blockingActions: number;
  actions: AiPathsMaintenanceActionReport[];
};

export type AiPathsMaintenanceApplyResult = {
  appliedActionIds: AiPathsMaintenanceActionId[];
  report: AiPathsMaintenanceReport;
};

export const pathBlockedRunPolicySchema = z.enum(['fail_run', 'complete_with_warning']);
export type PathBlockedRunPolicyDto = z.infer<typeof pathBlockedRunPolicySchema>;
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
  nodes: z.array(z.lazy(() => aiNodeSchema)),
  edges: z.array(z.lazy(() => edgeSchema)),
  updatedAt: z.string(),
  isLocked: z.boolean().optional(),
  isActive: z.boolean().optional(),
  parserSamples: z.record(z.string(), z.unknown()).optional(),
  updaterSamples: z.record(z.string(), z.unknown()).optional(),
  runtimeState: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
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
  config: z.record(z.string(), z.unknown()),
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
  after: z
    .object({
      createdAt: z.string(),
      id: z.string(),
    })
    .nullable()
    .optional(),
  limit: z.number().optional(),
});

export type AiPathRunEventListOptionsDto = z.infer<typeof aiPathRunEventListOptionsSchema>;
export type AiPathRunEventListOptions = AiPathRunEventListOptionsDto;

export const aiPathRunListOptionsSchema = z.object({
  id: z.string().optional(),
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
 * AI Path Canvas UI Types
 */
export type MarqueeMode = 'replace' | 'add' | 'subtract';

export type MarqueeSelectionState = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  mode: MarqueeMode;
  baseNodeIds: string[];
};

export type SubgraphClipboardPayload = {
  version: 1;
  sourcePathId: string | null;
  capturedAt: string;
  nodes: AiNode[];
  edges: Edge[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
};

export type TouchPointSample = {
  x: number;
  y: number;
  time: number;
  ts?: number;
  vx?: number;
  vy?: number;
};

export type TouchGestureState =
  | {
      mode: 'pinch';
      pointerIds: [number, number];
      startDistance: number;
      startScale: number;
      anchorCanvas: { x: number; y: number };
    }
  | {
      mode: 'pan';
      pointerId: number;
      recentSamples: TouchPointSample[];
    };

export type TouchLongPressSelectionState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startedAt: number;
  indicatorViewportX: number;
  indicatorViewportY: number;
  mode: MarqueeMode;
  baseNodeIds: string[];
  timerId: number | null;
};

export type TouchLongPressIndicatorState = {
  x: number;
  y: number;
  progress: number;
  phase: 'pending' | 'activated';
};

export interface HandleSelectNodeOptions {
  toggle?: boolean;
}

/**
 * AI Path Runtime Profile Contracts
 */
export type RuntimeProfileHighlight = {
  type: 'run' | 'iteration' | 'node';
  phase?: 'start' | 'end' | undefined;
  nodeId?: string | undefined;
  nodeType?: string | undefined;
  status?: string | undefined;
  reason?: string | undefined;
  iteration?: number | undefined;
  durationMs?: number | undefined;
  hashMs?: number | undefined;
};

export type RuntimeProfileNodeSpanStatus =
  | 'running'
  | 'completed'
  | 'failed'
  | 'cached'
  | 'skipped'
  | 'blocked';

export type RuntimeProfileNodeSpan = {
  spanId: string;
  nodeId: string;
  nodeType: string;
  nodeTitle: string | null;
  iteration: number;
  attempt: number;
  status: RuntimeProfileNodeSpanStatus;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  error: string | null;
  cached: boolean;
};

export type RuntimeProfileSnapshot = {
  traceId: string;
  recordedAt: string;
  eventCount: number;
  sampledEventCount: number;
  droppedEventCount: number;
  summary: {
    durationMs: number;
    iterationCount: number;
    nodeCount: number;
    edgeCount: number;
    hottestNodes: Array<{
      nodeId: string;
      nodeType: string;
      count: number;
      totalMs: number;
      maxMs: number;
      avgMs: number;
      errorCount: number;
      cachedCount: number;
      skippedCount: number;
    }>;
  } | null;
  highlights: RuntimeProfileHighlight[];
  nodeSpans: RuntimeProfileNodeSpan[];
};

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
  listRunEvents(
    runId: string,
    options?: AiPathRunEventListOptions
  ): Promise<AiPathRunEventRecord[]>;
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
