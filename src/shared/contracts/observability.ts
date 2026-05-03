import { z } from 'zod';

import {
  optionalIntegerQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

import { contextRegistryConsumerEnvelopeSchema } from './ai-context-registry';
import { dtoBaseSchema, namedDtoSchema } from './base';
import { activityLogSchema } from './system';

export const ERROR_CATEGORY = {
  SYSTEM: 'SYSTEM',
  NETWORK: 'NETWORK',
  AUTH: 'AUTH',
  VALIDATION: 'VALIDATION',
  DATABASE: 'DATABASE',
  INTEGRATION: 'INTEGRATION',
  AI: 'AI',
  UI: 'UI',
  UNKNOWN: 'UNKNOWN',
  USER: 'USER',
  EXTERNAL: 'EXTERNAL',
} as const;

export type ErrorCategory = (typeof ERROR_CATEGORY)[keyof typeof ERROR_CATEGORY];

export const errorCategorySchema = z.nativeEnum(ERROR_CATEGORY);

/**
 * Metric DTO
 */
export const metricSchema = dtoBaseSchema.extend({
  name: z.string(),
  value: z.number(),
  unit: z.string(),
  tags: z.record(z.string(), z.string()),
});

export type Metric = z.infer<typeof metricSchema>;

/**
 * Log Entry DTO
 */
export const logEntrySchema = dtoBaseSchema.extend({
  level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']),
  message: z.string(),
  source: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  traceId: z.string().nullable(),
});

export type LogEntry = z.infer<typeof logEntrySchema>;

/**
 * System Log DTOs
 */
export const systemLogLevelSchema = z.enum(['info', 'warn', 'error']);
export type SystemLogLevel = z.infer<typeof systemLogLevelSchema>;
export type SystemLogLevelDto = SystemLogLevel;

export const systemLogRecordSchema = dtoBaseSchema.extend({
  level: systemLogLevelSchema,
  message: z.string(),
  category: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  service: z.string().nullable().optional(),
  context: z.record(z.string(), z.unknown()).nullable().optional(),
  stack: z.string().nullable().optional(),
  path: z.string().nullable().optional(),
  method: z.string().nullable().optional(),
  statusCode: z.number().nullable().optional(),
  requestId: z.string().nullable().optional(),
  traceId: z.string().nullable().optional(),
  correlationId: z.string().nullable().optional(),
  spanId: z.string().nullable().optional(),
  parentSpanId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
});

export type SystemLogRecord = z.infer<typeof systemLogRecordSchema>;
export type SystemLogRecordDto = SystemLogRecord;

export const createSystemLogInputSchema = z.object({
  level: systemLogLevelSchema.optional(),
  message: z.string(),
  category: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  service: z.string().nullable().optional(),
  context: z.record(z.string(), z.unknown()).nullable().optional(),
  stack: z.string().nullable().optional(),
  path: z.string().nullable().optional(),
  method: z.string().nullable().optional(),
  statusCode: z.number().nullable().optional(),
  requestId: z.string().nullable().optional(),
  traceId: z.string().nullable().optional(),
  correlationId: z.string().nullable().optional(),
  spanId: z.string().nullable().optional(),
  parentSpanId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  createdAt: z.string().optional(), // ISO string when sent as DTO
});

export type CreateSystemLogInput = z.infer<typeof createSystemLogInputSchema>;
export type CreateSystemLogInputDto = CreateSystemLogInput;

export const listSystemLogsInputSchema = z.object({
  page: z.number().optional(),
  pageSize: z.number().optional(),
  level: systemLogLevelSchema.nullable().optional(),
  source: z.string().nullable().optional(),
  service: z.string().nullable().optional(),
  method: z.string().nullable().optional(),
  statusCode: z.number().nullable().optional(),
  minDurationMs: z.number().nullable().optional(),
  requestId: z.string().nullable().optional(),
  traceId: z.string().nullable().optional(),
  correlationId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  fingerprint: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  query: z.string().nullable().optional(),
  from: z.string().nullable().optional(), // ISO string
  to: z.string().nullable().optional(), // ISO string
});

export type ListSystemLogsInput = z.infer<typeof listSystemLogsInputSchema>;
export type ListSystemLogsInputDto = ListSystemLogsInput;

export const listSystemLogsResultSchema = z.object({
  logs: z.array(systemLogRecordSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type ListSystemLogsResult = z.infer<typeof listSystemLogsResultSchema>;
export type ListSystemLogsResultDto = ListSystemLogsResult;

export const systemLogsFilterQuerySchema = z.object({
  level: optionalTrimmedQueryString(systemLogLevelSchema),
  source: optionalTrimmedQueryString(),
  service: optionalTrimmedQueryString(),
  method: optionalTrimmedQueryString(),
  statusCode: optionalIntegerQuerySchema(z.number().int()),
  minDurationMs: optionalIntegerQuerySchema(z.number().int().nonnegative()),
  requestId: optionalTrimmedQueryString(),
  traceId: optionalTrimmedQueryString(),
  correlationId: optionalTrimmedQueryString(),
  userId: optionalTrimmedQueryString(),
  fingerprint: optionalTrimmedQueryString(),
  category: optionalTrimmedQueryString(),
  query: optionalTrimmedQueryString(),
  from: optionalTrimmedQueryString(z.string().datetime()),
  to: optionalTrimmedQueryString(z.string().datetime()),
});

export type SystemLogsFilterQuery = z.infer<typeof systemLogsFilterQuerySchema>;

export const systemLogsListQuerySchema = systemLogsFilterQuerySchema.extend({
  page: optionalIntegerQuerySchema(z.number().int().positive()),
  pageSize: optionalIntegerQuerySchema(z.number().int().positive()),
});

export type SystemLogsListQuery = z.infer<typeof systemLogsListQuerySchema>;

export const systemLogsMetricsQuerySchema = systemLogsFilterQuerySchema;
export type SystemLogsMetricsQuery = z.infer<typeof systemLogsMetricsQuerySchema>;

export const systemLogsCreateRequestSchema = z.object({
  level: systemLogLevelSchema.optional(),
  message: z.string().min(1),
  category: z.string().trim().optional(),
  source: z.string().trim().optional(),
  service: z.string().trim().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  stack: z.string().optional(),
  path: z.string().optional(),
  method: z.string().optional(),
  statusCode: z.number().int().optional(),
  requestId: z.string().optional(),
  traceId: z.string().optional(),
  correlationId: z.string().optional(),
  spanId: z.string().optional(),
  parentSpanId: z.string().optional(),
  userId: z.string().optional(),
});

export type SystemLogsCreateRequest = z.infer<typeof systemLogsCreateRequestSchema>;

export const systemLogMetricsSchema = z.object({
  total: z.number(),
  levels: z.record(systemLogLevelSchema, z.number()),
  last24Hours: z.number(),
  last7Days: z.number(),
  topSources: z.array(z.object({ source: z.string(), count: z.number() })),
  topServices: z.array(z.object({ service: z.string(), count: z.number() })),
  topPaths: z.array(z.object({ path: z.string(), count: z.number() })),
  generatedAt: z.string(),
});

export type SystemLogMetrics = z.infer<typeof systemLogMetricsSchema>;
export type SystemLogMetricsDto = SystemLogMetrics;

export const systemLogsResponseSchema = z.object({
  logs: z.array(systemLogRecordSchema).optional(),
  total: z.number().optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
});

export type SystemLogsResponse = z.infer<typeof systemLogsResponseSchema>;
export type SystemLogsResponseDto = SystemLogsResponse;

export const systemActivityResponseSchema = z.object({
  data: z.array(activityLogSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type SystemActivityResponse = z.infer<typeof systemActivityResponseSchema>;
export type SystemActivityResponseDto = SystemActivityResponse;

export const systemLogMetricsResponseSchema = z.object({
  metrics: systemLogMetricsSchema.optional(),
});

export type SystemLogMetricsResponse = z.infer<typeof systemLogMetricsResponseSchema>;
export type SystemLogMetricsResponseDto = SystemLogMetricsResponse;

export const clientLoggingSettingsSchema = z.object({
  featureFlags: z.record(z.string(), z.unknown()).nullable(),
  tags: z.record(z.string(), z.unknown()).nullable(),
});

export type ClientLoggingSettings = z.infer<typeof clientLoggingSettingsSchema>;

export const CLIENT_LOGGING_KEYS = {
  featureFlags: 'client_logging_feature_flags',
  tags: 'client_logging_tags',
} as const;

export const OBSERVABILITY_LOGGING_KEYS = {
  infoEnabled: 'observability_info_logging_enabled',
  activityEnabled: 'observability_activity_logging_enabled',
  errorEnabled: 'observability_error_logging_enabled',
} as const;

export const observabilityLoggingControlsSchema = z.object({
  infoEnabled: z.boolean(),
  activityEnabled: z.boolean(),
  errorEnabled: z.boolean(),
});

export type ObservabilityLoggingControls = z.infer<typeof observabilityLoggingControlsSchema>;

export const systemLogFilterFormValuesSchema = z.object({
  level: z.union([systemLogLevelSchema, z.literal('all')]),
  query: z.string(),
  source: z.string(),
  service: z.string(),
  method: z.string(),
  statusCode: z.string(),
  minDurationMs: z.string(),
  requestId: z.string(),
  traceId: z.string(),
  correlationId: z.string(),
  userId: z.string(),
  fingerprint: z.string(),
  category: z.string(),
  fromDate: z.string(),
  toDate: z.string(),
});

export type SystemLogFilterFormValues = z.infer<typeof systemLogFilterFormValuesSchema>;

export const logTriagePresetSchema = z.object({
  id: z.enum([
    'recent-errors-24h',
    'http-500-last7d',
    'client-errors-last7d',
    'auth-anomalies-last3d',
    'validation-errors-last7d',
    'integration-errors-last7d',
    'system-alerts-last24h',
    'kangur-source-last7d',
    'kangur-auth-last3d',
    'kangur-progress-last3d',
    'kangur-slow-progress-last3d',
    'kangur-tts-last3d',
  ]),
  label: z.string(),
  description: z.string(),
});

export type LogTriagePreset = z.infer<typeof logTriagePresetSchema>;

export const mongoIndexInfoSchema = z.object({
  name: z.string().optional(),
  key: z.record(z.string(), z.unknown()),
});

export type MongoIndexInfo = z.infer<typeof mongoIndexInfoSchema>;
export type MongoIndexInfoDto = MongoIndexInfo;

export const mongoCollectionIndexStatusSchema = z.object({
  name: z.string(),
  expected: z.array(mongoIndexInfoSchema),
  existing: z.array(mongoIndexInfoSchema),
  missing: z.array(mongoIndexInfoSchema),
  extra: z.array(mongoIndexInfoSchema),
  error: z.string().optional(),
});

export type MongoCollectionIndexStatus = z.infer<typeof mongoCollectionIndexStatusSchema>;
export type MongoCollectionIndexStatusDto = MongoCollectionIndexStatus;

export const mongoDiagnosticsResponseSchema = z.object({
  generatedAt: z.string(),
  collections: z.array(mongoCollectionIndexStatusSchema),
});

export type MongoDiagnosticsResponse = z.infer<typeof mongoDiagnosticsResponseSchema>;
export type MongoDiagnosticsResponseDto = MongoDiagnosticsResponse;

export const mongoCreatedIndexSchema = z.object({
  collection: z.string(),
  key: z.record(z.string(), z.unknown()),
});

export type MongoCreatedIndex = z.infer<typeof mongoCreatedIndexSchema>;
export type MongoCreatedIndexDto = MongoCreatedIndex;

export const mongoRebuildIndexesResponseSchema = mongoDiagnosticsResponseSchema.extend({
  created: z.array(mongoCreatedIndexSchema),
});

export type MongoRebuildIndexesResponse = z.infer<typeof mongoRebuildIndexesResponseSchema>;
export type MongoRebuildIndexesResponseDto = MongoRebuildIndexesResponse;

export const clearLogsTargetSchema = z.enum([
  'error_logs',
  'info_logs',
  'activity_logs',
  'page_access_logs',
  'all_logs',
]);

export type ClearLogsTarget = z.infer<typeof clearLogsTargetSchema>;
export type ClearLogsTargetDto = ClearLogsTarget;

export const systemLogsClearQuerySchema = z.object({
  before: optionalTrimmedQueryString(z.string().datetime()),
  target: optionalTrimmedQueryString(clearLogsTargetSchema).default('all_logs'),
});

export type SystemLogsClearQuery = z.infer<typeof systemLogsClearQuerySchema>;

export const clearLogsResponseSchema = z.object({
  target: clearLogsTargetSchema,
  deleted: z.number(),
  deletedByTarget: z.object({
    systemLogs: z.number(),
    activityLogs: z.number(),
    pageAccessLogs: z.number(),
  }),
});

export type ClearLogsResponse = z.infer<typeof clearLogsResponseSchema>;
export type ClearLogsResponseDto = ClearLogsResponse;

export const systemLogsInsightRequestSchema = z.object({
  contextRegistry: contextRegistryConsumerEnvelopeSchema.optional(),
});

export type SystemLogsInsightRequest = z.infer<typeof systemLogsInsightRequestSchema>;
export type SystemLogsInsightRequestDto = SystemLogsInsightRequest;

export const systemLogsInsightsListQuerySchema = z.object({
  limit: optionalIntegerQuerySchema(z.number().int().positive().max(50)),
});

export type SystemLogsInsightsListQuery = z.infer<typeof systemLogsInsightsListQuerySchema>;

export const systemLogsInterpretRequestSchema = z.object({
  logId: z.string().trim().min(1),
  contextRegistry: contextRegistryConsumerEnvelopeSchema.optional(),
});

export type SystemLogsInterpretRequest = z.infer<typeof systemLogsInterpretRequestSchema>;
export type SystemLogsInterpretRequestDto = SystemLogsInterpretRequest;

/**
 * Trace & Span DTOs
 */
export const spanLogSchema = z.object({
  timestamp: z.string(),
  fields: z.record(z.string(), z.unknown()),
});

export type SpanLog = z.infer<typeof spanLogSchema>;

export const spanSchema = dtoBaseSchema.extend({
  traceId: z.string(),
  parentId: z.string().nullable(),
  operationName: z.string(),
  duration: z.number(),
  status: z.enum(['ok', 'error']),
  tags: z.record(z.string(), z.string()),
  logs: z.array(spanLogSchema),
  endTime: z.string(),
});

export type Span = z.infer<typeof spanSchema>;

export const traceSchema = dtoBaseSchema.extend({
  operationName: z.string(),
  duration: z.number(),
  status: z.enum(['ok', 'error', 'timeout']),
  spans: z.array(spanSchema),
  endTime: z.string(),
});

export type Trace = z.infer<typeof traceSchema>;

/**
 * Alert DTOs
 */
export const alertSchema = namedDtoSchema.extend({
  condition: z.record(z.string(), z.unknown()),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  enabled: z.boolean(),
});

export type Alert = z.infer<typeof alertSchema>;

export const createAlertSchema = alertSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAlert = z.infer<typeof createAlertSchema>;
export type UpdateAlert = Partial<CreateAlert>;

/**
 * Error Diagnostics DTOs
 */

export const suggestedActionSchema = z.object({
  label: z.string(),
  description: z.string(),
  actionType: z.string(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export type SuggestedAction = z.infer<typeof suggestedActionSchema>;

export const errorContextSchema = z.record(z.string(), z.unknown()).and(
  z.object({
    service: z.string().nullable().optional(),
    runId: z.string().nullable().optional(),
    jobId: z.string().nullable().optional(),
    productId: z.string().nullable().optional(),
    errorId: z.string().nullable().optional(),
    category: z.union([errorCategorySchema, z.string()]).nullable().optional(),
    userMessage: z.string().nullable().optional(),
  })
);

export type ErrorContext = z.infer<typeof errorContextSchema>;

/**
 * Transient Recovery DTOs
 */

export const transientRecoverySettingsSchema = z.object({
  enabled: z.boolean(),
  retry: z.object({
    enabled: z.boolean(),
    maxAttempts: z.number(),
    initialDelayMs: z.number(),
    maxDelayMs: z.number(),
    timeoutMs: z.number().nullable(),
  }),
  circuit: z.object({
    enabled: z.boolean(),
    failureThreshold: z.number(),
    resetTimeoutMs: z.number(),
  }),
});

export type TransientRecoverySettings = z.infer<typeof transientRecoverySettingsSchema>;

export const TRANSIENT_RECOVERY_KEYS = {
  settings: 'transient_recovery_settings',
} as const;

/**
 * Client Error Reporting DTOs
 */
export const clientErrorPayloadSchema = z.object({
  message: z.string().trim().min(1).max(2_000).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  stack: z.string().trim().max(20_000).nullable().optional(),
  url: z.string().trim().max(2_000).optional(),
  timestamp: z.string().trim().max(200).optional(),
  digest: z.string().trim().max(256).optional(),
  userAgent: z.string().trim().max(1_000).optional(),
  componentStack: z.string().trim().max(8_000).nullable().optional(),
  context: z.unknown().optional(),
});

export type ClientErrorPayloadDto = z.infer<typeof clientErrorPayloadSchema>;

export type SystemLogRuntimeContextHydrationResult = {
  staticContextPatch: Record<string, unknown>;
  analysisContextPatch?: Record<string, unknown> | null;
  adapterMeta?: Record<string, unknown> | null;
};

/**
 * Context Registry Display DTOs
 */
export type ContextDocumentSectionDisplay = {
  id: string | null;
  kind: string | null;
  title: string;
  summary: string | null;
  text: string | null;
  items: Array<Record<string, string>>;
};

export type ContextDocumentDisplay = {
  id: string;
  entityType: string | null;
  title: string;
  summary: string | null;
  status: string | null;
  tags: string[];
  facts: Array<{ label: string; value: string }>;
  sections: ContextDocumentSectionDisplay[];
};

export type ContextRegistryNodeDisplay = {
  id: string;
  kind: string | null;
  name: string;
};

export type ContextRegistryDisplay = {
  refs: string[];
  documents: ContextDocumentDisplay[];
  nodes: ContextRegistryNodeDisplay[];
};

/**
 * Alert Evidence Core Types
 */
export type AlertEvidenceContextRegistry = {
  refs: Array<{
    id: string;
    kind: string;
    providerId?: string;
    entityType?: string;
  }>;
  engineVersion: string | null;
};

export type AlertEvidenceSample = {
  logId: string;
  createdAt: string;
  level: string;
  source: string | null;
  message: string;
  fingerprint: string | null;
  contextRegistry: AlertEvidenceContextRegistry | null;
};

export type AlertEvidenceContext = {
  windowStart: string | null;
  windowEnd: string;
  matchedCount: number;
  sampleSize: number;
  samples: AlertEvidenceSample[];
  lastObservedLog?: AlertEvidenceSample | null;
};

/**
 * Alert Evidence Display DTOs (Safe for public consumption)
 */
export type AlertEvidenceSampleDisplay = {
  [K in keyof AlertEvidenceSample]: K extends 'contextRegistry'
    ? ContextRegistryDisplay | null
    : AlertEvidenceSample[K] | null;
};

export type AlertEvidenceDisplay = {
  [K in keyof AlertEvidenceContext]: K extends 'samples'
    ? AlertEvidenceSampleDisplay[]
    : K extends 'lastObservedLog'
      ? AlertEvidenceSampleDisplay | null
      : AlertEvidenceContext[K] | null;
};
