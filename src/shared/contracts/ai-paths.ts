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
  type AiPathRun,
  type AiPathRunStatus,
} from './ai-paths-runtime';

export {
  aiPathNodeStatusSchema,
  aiPathRunSchema,
  aiPathRunStatusSchema,
  type AiPathNodeStatus,
  type AiPathRun,
  type AiPathRunStatus,
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

export type AiPath = z.infer<typeof aiPathSchema>;

export const createAiPathSchema = aiPathSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AiPathCreateInput = z.infer<typeof createAiPathSchema>;
export type AiPathUpdateInput = Partial<AiPathCreateInput>;

export type AiPathsSettingRecordDto = {
  key: string;
  value: string;
};
export type AiPathsSettingRecord = AiPathsSettingRecordDto;

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

export type AiPathRunRecord = z.infer<typeof aiPathRunRecordSchema>;

const nonEmptyTrimmedStringSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().min(1));

const aiPathRunEnqueueRunObjectSchema = z
  .object({
    id: nonEmptyTrimmedStringSchema.optional(),
    runId: nonEmptyTrimmedStringSchema.optional(),
    _id: nonEmptyTrimmedStringSchema.optional(),
  })
  .passthrough();

const aiPathRunEnqueueEnvelopeCandidateSchema = z
  .object({
    run: z.union([nonEmptyTrimmedStringSchema, aiPathRunEnqueueRunObjectSchema]).optional(),
    runId: nonEmptyTrimmedStringSchema.optional(),
  })
  .passthrough();

const readRunIdFromEnqueueEnvelopeCandidate = (
  value: z.infer<typeof aiPathRunEnqueueEnvelopeCandidateSchema>
): string | null => {
  if (typeof value.runId === 'string' && value.runId.length > 0) {
    return value.runId;
  }
  if (typeof value.run === 'string' && value.run.length > 0) {
    return value.run;
  }
  if (!value.run || typeof value.run !== 'object' || Array.isArray(value.run)) {
    return null;
  }
  const run = value.run as Record<string, unknown>;
  const candidates = [run['id'], run['runId'], run['_id']];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const normalized = candidate.trim();
    if (normalized.length > 0) return normalized;
  }
  return null;
};

export const extractAiPathRunIdFromEnqueueContractPayload = (value: unknown): string | null => {
  const parsed = aiPathRunEnqueueEnvelopeCandidateSchema.safeParse(value);
  if (parsed.success) {
    const runId = readRunIdFromEnqueueEnvelopeCandidate(parsed.data);
    if (runId) return runId;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const nested = record['data'];
  if (!nested || typeof nested !== 'object' || Array.isArray(nested)) return null;

  const nestedParsed = aiPathRunEnqueueEnvelopeCandidateSchema.safeParse(nested);
  if (!nestedParsed.success) return null;
  return readRunIdFromEnqueueEnvelopeCandidate(nestedParsed.data);
};

export const aiPathRunEnqueueResponseSchema = z
  .object({
    run: z.union([nonEmptyTrimmedStringSchema, aiPathRunEnqueueRunObjectSchema]).optional(),
    runId: nonEmptyTrimmedStringSchema.optional(),
    data: aiPathRunEnqueueEnvelopeCandidateSchema.optional(),
  })
  .passthrough()
  .superRefine((value, ctx) => {
    if (extractAiPathRunIdFromEnqueueContractPayload(value)) return;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'AI Paths enqueue response must include a non-empty run identifier.',
      path: ['runId'],
    });
  });

export type AiPathRunEnqueueResponse = z.infer<typeof aiPathRunEnqueueResponseSchema>;

export const AI_PATH_RUN_ENQUEUED_EVENT_NAME = 'ai-path-run-enqueued';
export const AI_PATH_RUN_QUEUE_CHANNEL = 'ai-path-queue';

export const aiPathRunEnqueuedEventSchema = z.object({
  type: z.literal('run-enqueued').optional().default('run-enqueued'),
  runId: nonEmptyTrimmedStringSchema,
  entityId: nonEmptyTrimmedStringSchema.nullish().transform((value) => value ?? null),
  entityType: nonEmptyTrimmedStringSchema
    .nullish()
    .transform((value) => (value ? value.toLowerCase() : null)),
  at: z.number().int().nonnegative().optional(),
});

export type AiPathRunEnqueuedEvent = z.infer<typeof aiPathRunEnqueuedEventSchema>;

export const parseAiPathRunEnqueuedEventPayload = (
  value: unknown
): AiPathRunEnqueuedEvent | null => {
  const parsed = aiPathRunEnqueuedEventSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export const aiPathRunDetailSchema = z.object({
  run: aiPathRunRecordSchema,
  nodes: z.array(z.lazy(() => aiPathRunNodeSchema)),
  events: z.array(z.lazy(() => aiPathRunEventSchema)),
});

export type AiPathRunDetail = z.infer<typeof aiPathRunDetailSchema>;

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

export type AiPathRunUpdateInput = Partial<z.infer<typeof createAiPathRunSchema>>;

export const aiPathRunUpdateSchema = aiPathRunRecordSchema.partial().omit({
  id: true,
  userId: true,
  pathId: true,
  createdAt: true,
});

type AiPathRunUpdateRecord = z.infer<typeof aiPathRunUpdateSchema>;

/**
 * AI Path Run Node Contract
 */
export const aiPathRunNodeSchema = dtoBaseSchema.extend({
  runId: z.string(),
  traceId: z.string().optional(),
  spanId: z.string().optional(),
  nodeId: z.string(),
  nodeType: z.string(),
  nodeTitle: z.string().nullable().optional(),
  status: aiPathNodeStatusSchema,
  iteration: z.number().optional(),
  attempt: z.number(),
  inputs: z.record(z.string(), z.unknown()).optional(),
  outputs: z.record(z.string(), z.unknown()).optional(),
  error: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional(),
});

export type AiPathRunNodeRecord = z.infer<typeof aiPathRunNodeSchema>;

/**
 * AI Path Run Event Contract
 */
export const aiPathRunEventLevelSchema = z.enum(['debug', 'info', 'warn', 'error', 'fatal']);
export type AiPathRunEventLevel = z.infer<typeof aiPathRunEventLevelSchema>;

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

export type AiPathRunEventRecord = z.infer<typeof aiPathRunEventSchema>;

export const aiPathRunNodeUpdateSchema = aiPathRunNodeSchema.partial().omit({
  id: true,
  runId: true,
  nodeId: true,
  createdAt: true,
});

export type AiPathRunNodeUpdate = z.infer<typeof aiPathRunNodeUpdateSchema>;

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

export type AiPathRunEventCreateInput = z.infer<typeof aiPathRunEventCreateInputSchema>;

/**
 * AI Paths Composite & Domain DTOs
 */

export const aiPathRuntimeAnalyticsRangeSchema = z.enum(['1h', '24h', '7d', '30d']);
export type AiPathRuntimeAnalyticsRange = z.infer<typeof aiPathRuntimeAnalyticsRangeSchema>;

export const aiPathRuntimeAnalyticsSlowestSpanSchema = z.object({
  runId: z.string(),
  spanId: z.string(),
  nodeId: z.string(),
  nodeType: z.string(),
  status: z.string(),
  durationMs: z.number(),
});

export type AiPathRuntimeAnalyticsSlowestSpan = z.infer<
  typeof aiPathRuntimeAnalyticsSlowestSpanSchema
>;

export const aiPathRuntimeTraceSlowNodeSchema = z.object({
  nodeId: z.string(),
  nodeType: z.string(),
  spanCount: z.number(),
  avgDurationMs: z.number(),
  maxDurationMs: z.number(),
  totalDurationMs: z.number(),
});

export type AiPathRuntimeTraceSlowNode = z.infer<typeof aiPathRuntimeTraceSlowNodeSchema>;

export const aiPathRuntimeTraceFailedNodeSchema = z.object({
  nodeId: z.string(),
  nodeType: z.string(),
  failedCount: z.number(),
  spanCount: z.number(),
});

export type AiPathRuntimeTraceFailedNode = z.infer<typeof aiPathRuntimeTraceFailedNodeSchema>;

export const aiPathRuntimeKernelStrategyCountsSchema = z.object({
  compatibility: z.number(),
  code_object_v3: z.number(),
  unknown: z.number(),
});

export type AiPathRuntimeKernelStrategyCounts = z.infer<
  typeof aiPathRuntimeKernelStrategyCountsSchema
>;

export const aiPathRuntimeKernelResolutionSourceCountsSchema = z.object({
  override: z.number(),
  registry: z.number(),
  missing: z.number(),
  unknown: z.number(),
});

export type AiPathRuntimeKernelResolutionSourceCounts = z.infer<
  typeof aiPathRuntimeKernelResolutionSourceCountsSchema
>;

export const aiPathRuntimeKernelParityAnalyticsSchema = z.object({
  sampledRuns: z.number(),
  runsWithKernelParity: z.number(),
  sampledHistoryEntries: z.number(),
  strategyCounts: aiPathRuntimeKernelStrategyCountsSchema,
  resolutionSourceCounts: aiPathRuntimeKernelResolutionSourceCountsSchema,
  codeObjectIds: z.array(z.string()),
});

export type AiPathRuntimeKernelParityAnalytics = z.infer<
  typeof aiPathRuntimeKernelParityAnalyticsSchema
>;

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
  kernelParity: aiPathRuntimeKernelParityAnalyticsSchema,
  truncated: z.boolean(),
});

export type AiPathRuntimeTraceAnalytics = z.infer<typeof aiPathRuntimeTraceAnalyticsSchema>;

export const aiPathRuntimePortableEngineCountsSchema = z.object({
  attempts: z.number(),
  successes: z.number(),
  failures: z.number(),
});

export type AiPathRuntimePortableEngineCounts = z.infer<
  typeof aiPathRuntimePortableEngineCountsSchema
>;

export const aiPathRuntimePortableEngineFailureSchema = z.object({
  at: z.string(),
  runner: z.enum(['client', 'server']),
  surface: z.enum(['canvas', 'product', 'api']),
  source: z
    .enum(['portable_package', 'portable_envelope', 'semantic_canvas', 'path_config'])
    .nullable(),
  stage: z.enum(['resolve', 'validation', 'runtime']),
  error: z.string(),
  durationMs: z.number(),
  validateBeforeRun: z.boolean(),
  validationMode: z.string().nullable(),
});

export type AiPathRuntimePortableEngineFailure = z.infer<
  typeof aiPathRuntimePortableEngineFailureSchema
>;

export const aiPathRuntimePortableEngineAnalyticsSchema = z.object({
  source: z.enum(['in_memory', 'unavailable']),
  totals: aiPathRuntimePortableEngineCountsSchema.extend({
    successRate: z.number(),
    failureRate: z.number(),
  }),
  byRunner: z.object({
    client: aiPathRuntimePortableEngineCountsSchema,
    server: aiPathRuntimePortableEngineCountsSchema,
  }),
  bySurface: z.object({
    canvas: aiPathRuntimePortableEngineCountsSchema,
    product: aiPathRuntimePortableEngineCountsSchema,
    api: aiPathRuntimePortableEngineCountsSchema,
  }),
  byInputSource: z.object({
    portable_package: aiPathRuntimePortableEngineCountsSchema,
    portable_envelope: aiPathRuntimePortableEngineCountsSchema,
    semantic_canvas: aiPathRuntimePortableEngineCountsSchema,
    path_config: aiPathRuntimePortableEngineCountsSchema,
  }),
  failureStageCounts: z.object({
    resolve: z.number(),
    validation: z.number(),
    runtime: z.number(),
  }),
  recentFailures: z.array(aiPathRuntimePortableEngineFailureSchema),
});

export type AiPathRuntimePortableEngineAnalytics = z.infer<
  typeof aiPathRuntimePortableEngineAnalyticsSchema
>;

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
  portableEngine: aiPathRuntimePortableEngineAnalyticsSchema.optional(),
  generatedAt: z.string(),
});

export type AiPathRuntimeAnalyticsSummary = z.infer<typeof aiPathRuntimeAnalyticsSummarySchema>;

export const pathMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PathMeta = z.infer<typeof pathMetaSchema>;

export const pathUiStateSchema = z.object({
  selectedNodeId: z.string().nullable().optional(),
  configOpen: z.boolean().optional(),
});

export type PathUiState = z.infer<typeof pathUiStateSchema>;

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
 * AI Path Runtime UI & Context Types
 */
export interface LastErrorInfo {
  message: string;
  time: string;
  pathId?: string | null;
}

export type RuntimeRunStatus = 'idle' | 'running' | 'paused' | 'stepping' | 'completed' | 'failed';

export interface RuntimeControlHandlers {
  fireTrigger?: (node: AiNode, event?: React.MouseEvent<Element>) => void | Promise<void>;
  fireTriggerPersistent?: (node: AiNode, event?: React.MouseEvent<Element>) => void | Promise<void>;
  pauseActiveRun?: () => void;
  resumeActiveRun?: () => void;
  stepActiveRun?: (triggerNode?: AiNode) => void;
  cancelActiveRun?: () => void;
  clearWires?: () => void | Promise<void>;
}

export interface RuntimeNodeConfigHandlers {
  fetchParserSample?: (
    nodeId: string,
    entityType: string,
    entityId: string
  ) => void | Promise<void>;
  fetchUpdaterSample?: (
    nodeId: string,
    entityType: string,
    entityId: string,
    options?: { notify?: boolean }
  ) => void | Promise<void>;
  runSimulation?: (node: AiNode, triggerEvent?: string) => void | Promise<void>;
  sendToAi?: (databaseNodeId: string, prompt: string) => void | Promise<void>;
}

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
  'ensure_starter_workflow_defaults',
  'refresh_starter_workflow_configs',
  'repair_trigger_button_bindings',
  'normalize_runtime_kernel_settings',
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
export type PathBlockedRunPolicy = z.infer<typeof pathBlockedRunPolicySchema>;

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
  extensions: z.record(z.string(), z.unknown()).optional(),
  uiState: pathUiStateSchema.optional(),
});

export type PathConfig = z.infer<typeof pathConfigSchema>;

export const pathDebugEntrySchema = z.object({
  nodeId: z.string(),
  title: z.string().optional(),
  debug: z.unknown(),
});

export type PathDebugEntry = z.infer<typeof pathDebugEntrySchema>;

export const pathDebugSnapshotSchema = z.object({
  pathId: z.string(),
  runAt: z.string(),
  entries: z.array(pathDebugEntrySchema),
});

export type PathDebugSnapshot = z.infer<typeof pathDebugSnapshotSchema>;

export const clusterPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  bundlePorts: z.array(z.string()),
  template: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ClusterPreset = z.infer<typeof clusterPresetSchema>;

export const dbQueryPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  queryTemplate: z.string(),
  updateTemplate: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DbQueryPreset = z.infer<typeof dbQueryPresetSchema>;

export const dbNodePresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  config: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DbNodePreset = z.infer<typeof dbNodePresetSchema>;

export const jsonPathEntrySchema = z.object({
  path: z.string(),
  type: z.enum(['object', 'array', 'value']),
});

export type JsonPathEntry = z.infer<typeof jsonPathEntrySchema>;

export const connectionValidationSchema = z.object({
  valid: z.boolean(),
  message: z.string().optional(),
});

export type ConnectionValidation = z.infer<typeof connectionValidationSchema>;

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

export type AiPathRunEventListOptions = z.infer<typeof aiPathRunEventListOptionsSchema>;

export type AiPathRunVisibility = 'scoped' | 'global';

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

export type AiPathRunListOptions = z.infer<typeof aiPathRunListOptionsSchema>;

export type AiPathRunQueueStatsOptions = {
  userId?: string | null;
  pathId?: string;
  source?: string;
  sourceMode?: 'include' | 'exclude';
};

export const aiPathRunListResultSchema = z.object({
  runs: z.array(aiPathRunRecordSchema),
  total: z.number(),
});

export type AiPathRunListResult = z.infer<typeof aiPathRunListResultSchema>;

/**
 * Execution Contract
 */
export const executeAiPathSchema = z.object({
  pathId: z.string(),
  triggerNodeId: z.string().optional(),
  triggerEvent: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export type ExecuteAiPath = z.infer<typeof executeAiPathSchema>;

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
  runtimeStrategy?: 'compatibility' | 'code_object_v3' | undefined;
  runtimeResolutionSource?: 'override' | 'registry' | 'missing' | undefined;
  runtimeCodeObjectId?: string | null | undefined;
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

export type AiPathRunCreateInput = Omit<z.infer<typeof createAiPathRunSchema>, 'status'> & {
  status?: AiPathRunStatus | undefined;
  graph?: { nodes: AiNode[]; edges: Edge[] | unknown[] } | null | undefined;
  runtimeState?: Record<string, unknown> | null | undefined;
};

export type AiPathRunUpdate = AiPathRunUpdateRecord & {
  status?: AiPathRunStatus;
  triggerContext?: Record<string, unknown> | null;
  graph?: { nodes: AiNode[]; edges: Edge[] | unknown[] } | null;
};

export type AiPathRunRepository = {
  createRun(input: AiPathRunCreateInput): Promise<AiPathRunRecord>;
  updateRun(runId: string, data: AiPathRunUpdate): Promise<AiPathRunRecord>;
  getRunByRequestId(pathId: string, requestId: string): Promise<AiPathRunRecord | null>;
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
  getQueueStats(
    options?: AiPathRunQueueStatsOptions
  ): Promise<{ queuedCount: number; oldestQueuedAt: Date | null }>;
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
  RuntimeEventInput,
  RunStatus,
  SetNodeStatusInput,
  PathExecutionMode,
  PathRunMode,
  QueuedRun,
  RuntimeHistoryEntry,
  RuntimeHistoryLink,
} from './ai-paths-runtime';
