import { z } from 'zod';

import {
  normalizeOptionalQueryString,
  optionalIntegerQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

export * from './ai-paths-core';
import { contextRegistryConsumerEnvelopeSchema } from './ai-context-registry';
import {
  aiNodeSchema,
  edgeSchema,
  aiPathsValidationConfigSchema,
  playwrightBrowserEngineSchema,
  playwrightCaptureConfigSchema,
  type AiNode,
  type Edge,
  type AiPathsValidationRule,
} from './ai-paths-core';
import {
  aiPathNodeStatusSchema,
  aiPathRunSchema,
  aiPathRunStatusSchema,
  type AiPathNodeStatus,
  type AiPathRun,
  type AiPathRunStatus,
} from './ai-paths-runtime';
import type {
  AiPathLocalRunRecord,
  AiPathLocalRunStatus,
  LastErrorInfo,
  RuntimeControlHandlers,
  RuntimeNodeConfigHandlers,
  RuntimeRunStatus,
} from './ai-paths-runtime-ui-types';
import {
  AI_PATH_RUN_ENQUEUED_EVENT_NAME,
  AI_PATH_RUN_QUEUE_CHANNEL,
  aiPathRunEnqueuedEventSchema,
  aiPathRunEnqueueRequestSchema,
  aiPathRunEnqueueResponseSchema,
  aiPathRunRecordSchema,
  createAiPathRunSchema,
  extractAiPathRunIdFromEnqueueContractPayload,
  parseAiPathRunEnqueuedEventPayload,
  type AiPathRunEnqueuedEvent,
  type AiPathRunEnqueueRequest,
  type AiPathRunEnqueueResponse,
  type AiPathRunRecord,
  type AiPathRunUpdateInput,
} from './ai-paths-run-contract';
import { dtoBaseSchema, namedDtoSchema } from './base';
import type { SettingRecord } from './settings';

export {
  AI_PATH_RUN_ENQUEUED_EVENT_NAME,
  AI_PATH_RUN_QUEUE_CHANNEL,
  aiPathNodeStatusSchema,
  aiPathRunEnqueuedEventSchema,
  aiPathRunEnqueueRequestSchema,
  aiPathRunEnqueueResponseSchema,
  aiPathRunRecordSchema,
  aiPathRunSchema,
  aiPathRunStatusSchema,
  createAiPathRunSchema,
  extractAiPathRunIdFromEnqueueContractPayload,
  parseAiPathRunEnqueuedEventPayload,
  type AiPathNodeStatus,
  type AiPathRunEnqueuedEvent,
  type AiPathRunEnqueueRequest,
  type AiPathRunEnqueueResponse,
  type AiPathRunRecord,
  type AiPathRun,
  type AiPathRunStatus,
  type AiPathRunUpdateInput,
};
export type {
  AiPathLocalRunRecord,
  AiPathLocalRunStatus,
  LastErrorInfo,
  RuntimeControlHandlers,
  RuntimeNodeConfigHandlers,
  RuntimeRunStatus,
} from './ai-paths-runtime-ui-types';
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
export type AiPathsSettingRecordDto = SettingRecord;
export type AiPathsSettingRecord = AiPathsSettingRecordDto;
export const aiPathEntityUpdateRequestSchema = z.object({
  entityType: z.enum(['product', 'note', 'custom']),
  entityId: z.string().trim().optional(),
  updates: z.record(z.string(), z.unknown()).optional(),
  mode: z.enum(['replace', 'append']).optional(),
});
export type AiPathEntityUpdateRequest = z.infer<typeof aiPathEntityUpdateRequestSchema>;
export const aiPathRunDetailSchema = z.object({
  run: aiPathRunRecordSchema,
  nodes: z.array(z.lazy(() => aiPathRunNodeSchema)),
  events: z.array(z.lazy(() => aiPathRunEventSchema)),
});
export type AiPathRunDetail = z.infer<typeof aiPathRunDetailSchema>;
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
export const aiPathRuntimeAnalyticsRangeQuerySchema = z.object({
  range: optionalTrimmedQueryString(),
});
export type AiPathRuntimeAnalyticsRangeQuery = z.infer<
  typeof aiPathRuntimeAnalyticsRangeQuerySchema
>;
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
    blockedOnLease: z.number().optional(),
    handoffReady: z.number().optional(),
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
export const aiPathRuntimeAnalyticsSummaryResponseSchema = z.object({
  summary: aiPathRuntimeAnalyticsSummarySchema,
});
export type AiPathRuntimeAnalyticsSummaryResponse = z.infer<
  typeof aiPathRuntimeAnalyticsSummaryResponseSchema
>;
export type AiPathRuntimeAnalyticsSummaryResponseDto = AiPathRuntimeAnalyticsSummaryResponse;
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
export const AI_PATHS_MAINTENANCE_ACTION_IDS = [
  'compact_oversized_configs',
  'repair_path_index',
  'ensure_starter_workflow_defaults',
  'refresh_starter_workflow_configs',
  'normalize_runtime_kernel_settings',
] as const;
export const aiPathsMaintenanceActionIdSchema = z.enum(AI_PATHS_MAINTENANCE_ACTION_IDS);
export type AiPathsMaintenanceActionId = (typeof AI_PATHS_MAINTENANCE_ACTION_IDS)[number];
export const aiPathsMaintenanceActionStatusSchema = z.enum(['pending', 'ready']);
export const aiPathsMaintenanceActionReportSchema = z.object({
  id: aiPathsMaintenanceActionIdSchema,
  title: z.string(),
  description: z.string(),
  blocking: z.boolean(),
  status: aiPathsMaintenanceActionStatusSchema,
  affectedRecords: z.number().int().nonnegative(),
});
export type AiPathsMaintenanceActionReport = z.infer<typeof aiPathsMaintenanceActionReportSchema>;
export const aiPathsMaintenanceReportSchema = z.object({
  scannedAt: z.string(),
  pendingActions: z.number().int().nonnegative(),
  blockingActions: z.number().int().nonnegative(),
  actions: z.array(aiPathsMaintenanceActionReportSchema),
});
export type AiPathsMaintenanceReport = z.infer<typeof aiPathsMaintenanceReportSchema>;
export const aiPathsMaintenanceApplyResultSchema = z.object({
  appliedActionIds: z.array(aiPathsMaintenanceActionIdSchema),
  report: aiPathsMaintenanceReportSchema,
});
export type AiPathsMaintenanceApplyResult = z.infer<typeof aiPathsMaintenanceApplyResultSchema>;
const aiPathsSettingKeySchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => value.startsWith('ai_paths_'), {
    message: 'AI Paths setting keys must start with "ai_paths_".',
  });
export const aiPathsSettingWriteSchema = z.object({
  key: aiPathsSettingKeySchema,
  value: z.string(),
});
export type AiPathsSettingWrite = z.infer<typeof aiPathsSettingWriteSchema>;
export const aiPathsSettingsBulkWriteRequestSchema = z.object({
  items: z.array(aiPathsSettingWriteSchema).min(1),
});
export type AiPathsSettingsBulkWriteRequest = z.infer<typeof aiPathsSettingsBulkWriteRequestSchema>;
export const aiPathsSettingsDeleteRequestSchema = z
  .object({
    key: z.string().trim().min(1).optional(),
    keys: z.array(z.string().trim().min(1)).min(1).optional(),
  })
  .refine((value) => Boolean(value.key) || Boolean(value.keys && value.keys.length > 0), {
    message: 'Provide "key" or non-empty "keys".',
  });
export type AiPathsSettingsDeleteRequest = z.infer<typeof aiPathsSettingsDeleteRequestSchema>;
export const AI_PATHS_MAINTENANCE_COMPAT_ACTION_IDS = ['normalize_runtime_kernel_mode'] as const;
export type AiPathsMaintenanceCompatActionId =
  (typeof AI_PATHS_MAINTENANCE_COMPAT_ACTION_IDS)[number];
export const aiPathsMaintenanceCompatActionIdSchema = z.enum(
  AI_PATHS_MAINTENANCE_COMPAT_ACTION_IDS
);
export const aiPathsMaintenanceApplyRequestSchema = z.object({
  actionIds: z.array(
    z.union([aiPathsMaintenanceActionIdSchema, aiPathsMaintenanceCompatActionIdSchema])
  ).optional(),
});
export type AiPathsMaintenanceApplyRequest = z.infer<typeof aiPathsMaintenanceApplyRequestSchema>;
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
const AI_PATH_RUN_STATUS_SET: ReadonlySet<AiPathRunStatus> = new Set(aiPathRunStatusSchema.options);

const aiPathRunVisibilityQueryValueSchema = z
  .preprocess((value) => {
    const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
    return normalized === 'global' ? 'global' : 'scoped';
  }, z.enum(['scoped', 'global']))
  .default('scoped');

const aiPathRunSourceModeQueryValueSchema = z
  .preprocess((value) => {
    const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
    return normalized === 'exclude' ? 'exclude' : 'include';
  }, z.enum(['include', 'exclude']))
  .default('include');

const aiPathRunFreshQueryValueSchema = z
  .preprocess((value) => {
    const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  }, z.boolean())
  .default(false);

const aiPathRunStatusQueryValueSchema = z.preprocess((value) => {
  const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
  return normalized && AI_PATH_RUN_STATUS_SET.has(normalized as AiPathRunStatus)
    ? normalized
    : undefined;
}, aiPathRunStatusSchema.optional());

export const AI_PATH_RUN_TERMINAL_STATUSES: readonly AiPathRunStatus[] = [
  'completed',
  'failed',
  'canceled',
  'dead_lettered',
];

export const aiPathRunRouteParamsSchema = z.object({
  runId: z.string().trim().min(1, 'Run id is required'),
});
export type AiPathRunRouteParams = z.infer<typeof aiPathRunRouteParamsSchema>;

export const aiPathRunsListQuerySchema = z.object({
  visibility: aiPathRunVisibilityQueryValueSchema,
  pathId: optionalTrimmedQueryString(),
  nodeId: optionalTrimmedQueryString(),
  requestId: optionalTrimmedQueryString(),
  query: optionalTrimmedQueryString(),
  source: optionalTrimmedQueryString(),
  sourceMode: aiPathRunSourceModeQueryValueSchema,
  status: aiPathRunStatusQueryValueSchema,
  limit: optionalIntegerQuerySchema(z.number().int().min(1).max(500)),
  offset: optionalIntegerQuerySchema(z.number().int().min(0)),
  includeTotal: z
    .preprocess((value) => {
      const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
      return !(normalized === '0' || normalized === 'false' || normalized === 'no');
    }, z.boolean())
    .default(true),
  fresh: aiPathRunFreshQueryValueSchema,
});
export type AiPathRunsListQuery = z.infer<typeof aiPathRunsListQuerySchema>;

export const aiPathRunsDeleteQuerySchema = z.object({
  scope: z
    .preprocess((value) => {
      const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
      return normalized === 'all' ? 'all' : 'terminal';
    }, z.enum(['terminal', 'all']))
    .default('terminal'),
  pathId: optionalTrimmedQueryString(),
  source: optionalTrimmedQueryString(),
  sourceMode: aiPathRunSourceModeQueryValueSchema,
});
export type AiPathRunsDeleteQuery = z.infer<typeof aiPathRunsDeleteQuerySchema>;

export const aiPathRunQueueStatusQuerySchema = z.object({
  visibility: aiPathRunVisibilityQueryValueSchema,
  fresh: aiPathRunFreshQueryValueSchema,
});
export type AiPathRunQueueStatusQuery = z.infer<typeof aiPathRunQueueStatusQuerySchema>;

export const aiPathRunStreamQuerySchema = z.object({
  since: optionalTrimmedQueryString(),
});
export type AiPathRunStreamQuery = z.infer<typeof aiPathRunStreamQuerySchema>;

export const aiPathRunResumeRequestSchema = z.object({
  mode: z.enum(['resume', 'replay']).optional(),
});
export type AiPathRunResumeRequest = z.infer<typeof aiPathRunResumeRequestSchema>;

export const aiPathRunRetryNodeRequestSchema = z.object({
  nodeId: z.string().trim().min(1),
});
export type AiPathRunRetryNodeRequest = z.infer<typeof aiPathRunRetryNodeRequestSchema>;

export const aiPathRunDeadLetterRequeueRequestSchema = z.object({
  runIds: z.array(z.string().trim().min(1)).optional(),
  pathId: z.string().trim().optional().nullable(),
  query: z.string().trim().optional(),
  mode: z.enum(['resume', 'replay']).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
});
export type AiPathRunDeadLetterRequeueRequest = z.infer<
  typeof aiPathRunDeadLetterRequeueRequestSchema
>;

export const aiPathRunHandoffRequestSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
  checkpointLineageId: z.string().trim().min(1).max(200).optional(),
});
export type AiPathRunHandoffRequest = z.infer<typeof aiPathRunHandoffRequestSchema>;

export const aiPathsPlaywrightEnqueueRequestSchema = z.object({
  script: z.string().trim().min(1),
  input: z.record(z.string(), z.unknown()).optional(),
  startUrl: z.string().trim().optional(),
  timeoutMs: z
    .number()
    .int()
    .min(1000)
    .max(30 * 60 * 1000)
    .optional(),
  waitForResult: z.boolean().optional(),
  browserEngine: playwrightBrowserEngineSchema.optional(),
  personaId: z.string().trim().optional(),
  settingsOverrides: z.record(z.string(), z.unknown()).optional(),
  launchOptions: z.record(z.string(), z.unknown()).optional(),
  contextOptions: z.record(z.string(), z.unknown()).optional(),
  contextRegistry: contextRegistryConsumerEnvelopeSchema.optional(),
  capture: playwrightCaptureConfigSchema.optional(),
});
export type AiPathsPlaywrightEnqueueRequest = z.infer<
  typeof aiPathsPlaywrightEnqueueRequestSchema
>;

export const aiPathsPlaywrightRunRouteParamsSchema = z.object({
  runId: z.string().trim().min(1, 'Run id is required'),
});
export type AiPathsPlaywrightRunRouteParams = z.infer<
  typeof aiPathsPlaywrightRunRouteParamsSchema
>;

export const aiPathsPlaywrightArtifactRouteParamsSchema = z.object({
  runId: z.string().trim().min(1, 'Run id is required'),
  file: z.string().trim().min(1, 'File is required'),
});
export type AiPathsPlaywrightArtifactRouteParams = z.infer<
  typeof aiPathsPlaywrightArtifactRouteParamsSchema
>;

export const AI_PATHS_DB_ACTION_VALUES = [
  'insertOne',
  'insertMany',
  'find',
  'findOne',
  'countDocuments',
  'distinct',
  'aggregate',
  'updateOne',
  'updateMany',
  'replaceOne',
  'findOneAndUpdate',
  'deleteOne',
  'deleteMany',
  'findOneAndDelete',
] as const;
export const aiPathsDbActionSchema = z.enum(AI_PATHS_DB_ACTION_VALUES);
export type AiPathsDbAction = z.infer<typeof aiPathsDbActionSchema>;

export const aiPathsDbActionRequestSchema = z.object({
  provider: z.enum(['auto', 'mongodb']).optional(),
  collection: z.string().trim().min(1),
  collectionMap: z.record(z.string(), z.string()).optional(),
  action: aiPathsDbActionSchema,
  filter: z.record(z.string(), z.unknown()).optional(),
  query: z.never().optional(),
  update: z
    .union([z.record(z.string(), z.unknown()), z.array(z.record(z.string(), z.unknown()))])
    .optional(),
  updates: z.never().optional(),
  pipeline: z.array(z.record(z.string(), z.unknown())).optional(),
  document: z.record(z.string(), z.unknown()).optional(),
  documents: z.array(z.record(z.string(), z.unknown())).optional(),
  projection: z.record(z.string(), z.unknown()).optional(),
  sort: z.record(z.string(), z.union([z.number(), z.literal('asc'), z.literal('desc')])).optional(),
  limit: z.number().int().min(1).max(200).optional(),
  idType: z.enum(['string', 'objectId']).optional(),
  distinctField: z.string().optional(),
  upsert: z.boolean().optional(),
  returnDocument: z.enum(['before', 'after']).optional(),
});
export type AiPathsDbActionRequest = z.infer<typeof aiPathsDbActionRequestSchema>;
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
