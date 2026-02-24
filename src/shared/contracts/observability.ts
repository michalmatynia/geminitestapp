import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';

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

export const systemLogRecordSchema = dtoBaseSchema.extend({
  level: systemLogLevelSchema,
  message: z.string(),
  category: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  context: z.record(z.string(), z.unknown()).nullable().optional(),
  stack: z.string().nullable().optional(),
  path: z.string().nullable().optional(),
  method: z.string().nullable().optional(),
  statusCode: z.number().nullable().optional(),
  requestId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
});

export type SystemLogRecord = z.infer<typeof systemLogRecordSchema>;

export const createSystemLogInputSchema = z.object({
  level: systemLogLevelSchema.optional(),
  message: z.string(),
  category: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  context: z.record(z.string(), z.unknown()).nullable().optional(),
  stack: z.string().nullable().optional(),
  path: z.string().nullable().optional(),
  method: z.string().nullable().optional(),
  statusCode: z.number().nullable().optional(),
  requestId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  createdAt: z.string().optional(), // ISO string when sent as DTO
});

export type CreateSystemLogInput = z.infer<typeof createSystemLogInputSchema>;

export const listSystemLogsInputSchema = z.object({
  page: z.number().optional(),
  pageSize: z.number().optional(),
  level: systemLogLevelSchema.nullable().optional(),
  source: z.string().nullable().optional(),
  method: z.string().nullable().optional(),
  statusCode: z.number().nullable().optional(),
  requestId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  fingerprint: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  query: z.string().nullable().optional(),
  from: z.string().nullable().optional(), // ISO string
  to: z.string().nullable().optional(), // ISO string
});

export type ListSystemLogsInput = z.infer<typeof listSystemLogsInputSchema>;

export const listSystemLogsResultSchema = z.object({
  logs: z.array(systemLogRecordSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type ListSystemLogsResult = z.infer<typeof listSystemLogsResultSchema>;

export const systemLogMetricsSchema = z.object({
  total: z.number(),
  levels: z.record(systemLogLevelSchema, z.number()),
  last24Hours: z.number(),
  last7Days: z.number(),
  topSources: z.array(z.object({ source: z.string(), count: z.number() })),
  topPaths: z.array(z.object({ path: z.string(), count: z.number() })),
  generatedAt: z.string(),
});

export type SystemLogMetrics = z.infer<typeof systemLogMetricsSchema>;

export const systemLogsResponseSchema = z.object({
  logs: z.array(systemLogRecordSchema).optional(),
  total: z.number().optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
});

export type SystemLogsResponse = z.infer<typeof systemLogsResponseSchema>;

export const systemActivityResponseSchema = z.object({
  data: z.array(z.any()), // activityLogSchema reference can be circular or complex, use any for now or import properly
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type SystemActivityResponse = z.infer<typeof systemActivityResponseSchema>;

export const systemLogMetricsResponseSchema = z.object({
  metrics: systemLogMetricsSchema.optional(),
});

export type SystemLogMetricsResponse = z.infer<typeof systemLogMetricsResponseSchema>;

export const clientLoggingSettingsSchema = z.object({
  featureFlags: z.record(z.string(), z.unknown()).nullable(),
  tags: z.record(z.string(), z.unknown()).nullable(),
});

export type ClientLoggingSettings = z.infer<typeof clientLoggingSettingsSchema>;

export const systemLogFilterFormValuesSchema = z.object({
  level: z.union([systemLogLevelSchema, z.literal('all')]),
  query: z.string(),
  source: z.string(),
  method: z.string(),
  statusCode: z.string(),
  requestId: z.string(),
  userId: z.string(),
  fingerprint: z.string(),
  category: z.string(),
  fromDate: z.string(),
  toDate: z.string(),
});

export type SystemLogFilterFormValues = z.infer<typeof systemLogFilterFormValuesSchema>;

export const logTriagePresetSchema = z.object({
  id: z.enum(['recent-errors-24h', 'http-500-last7d', 'client-errors-last7d', 'auth-anomalies-last3d']),
  label: z.string(),
  description: z.string(),
});

export type LogTriagePreset = z.infer<typeof logTriagePresetSchema>;

export const mongoIndexInfoSchema = z.object({
  name: z.string().optional(),
  key: z.record(z.string(), z.unknown()),
});

export type MongoIndexInfo = z.infer<typeof mongoIndexInfoSchema>;

export const mongoCollectionIndexStatusSchema = z.object({
  name: z.string(),
  expected: z.array(mongoIndexInfoSchema),
  existing: z.array(mongoIndexInfoSchema),
  missing: z.array(mongoIndexInfoSchema),
  extra: z.array(mongoIndexInfoSchema),
  error: z.string().optional(),
});

export type MongoCollectionIndexStatus = z.infer<typeof mongoCollectionIndexStatusSchema>;

export const clearLogsResponseSchema = z.object({
  deleted: z.number(),
});

export type ClearLogsResponse = z.infer<typeof clearLogsResponseSchema>;

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

export const errorCategorySchema = z.enum([
  'SYSTEM',
  'USER',
  'VALIDATION',
  'EXTERNAL',
  'AI',
  'DATABASE',
]);

export type ErrorCategory = z.infer<typeof errorCategorySchema>;

export const ERROR_CATEGORY = {
  SYSTEM: 'SYSTEM',
  USER: 'USER',
  VALIDATION: 'VALIDATION',
  EXTERNAL: 'EXTERNAL',
  AI: 'AI',
  DATABASE: 'DATABASE',
} as const;

export const suggestedActionSchema = z.object({
  label: z.string(),
  description: z.string(),
  actionType: z.string(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export type SuggestedAction = z.infer<typeof suggestedActionSchema>;

export const errorContextSchema = z.record(z.string(), z.unknown()).and(z.object({
  service: z.string().nullable().optional(),
  runId: z.string().nullable().optional(),
  jobId: z.string().nullable().optional(),
  productId: z.string().nullable().optional(),
  errorId: z.string().nullable().optional(),
  category: z.union([errorCategorySchema, z.string()]).nullable().optional(),
  userMessage: z.string().nullable().optional(),
}));

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
