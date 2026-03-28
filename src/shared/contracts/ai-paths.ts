import { z } from 'zod';

import {
  normalizeOptionalQueryString,
  optionalIntegerQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

export * from './ai-paths-core';
export * from './ai-paths-analytics';
export * from './ai-paths-maintenance';
export * from './ai-paths-ui';

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
import { aiPathRuntimeTraceAnalyticsSchema, type AiPathRuntimeTraceAnalytics } from './ai-paths-analytics';
import { pathUiStateSchema } from './ai-paths-ui';

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

export const pathMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PathMeta = z.infer<typeof pathMetaSchema>;

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

export const executeAiPathSchema = z.object({
  pathId: z.string(),
  triggerNodeId: z.string().optional(),
  triggerEvent: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});
export type ExecuteAiPath = z.infer<typeof executeAiPathSchema>;

export type PathFlowIntensity = 'off' | 'low' | 'medium' | 'high';

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
