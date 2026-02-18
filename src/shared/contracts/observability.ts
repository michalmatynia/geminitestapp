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

export type MetricDto = z.infer<typeof metricSchema>;

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

export type LogEntryDto = z.infer<typeof logEntrySchema>;

/**
 * System Log DTOs
 */
export const systemLogLevelSchema = z.enum(['info', 'warn', 'error']);
export type SystemLogLevelDto = z.infer<typeof systemLogLevelSchema>;

export const systemLogRecordSchema = dtoBaseSchema.extend({
  level: systemLogLevelSchema,
  message: z.string(),
  source: z.string().nullable().optional(),
  context: z.record(z.string(), z.unknown()).nullable().optional(),
  stack: z.string().nullable().optional(),
  path: z.string().nullable().optional(),
  method: z.string().nullable().optional(),
  statusCode: z.number().nullable().optional(),
  requestId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
});

export type SystemLogRecordDto = z.infer<typeof systemLogRecordSchema>;

export const createSystemLogInputSchema = z.object({
  level: systemLogLevelSchema.optional(),
  message: z.string(),
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

export type CreateSystemLogInputDto = z.infer<typeof createSystemLogInputSchema>;

export const listSystemLogsResultSchema = z.object({
  logs: z.array(systemLogRecordSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type ListSystemLogsResultDto = z.infer<typeof listSystemLogsResultSchema>;

export const systemLogMetricsSchema = z.object({
  total: z.number(),
  levels: z.record(systemLogLevelSchema, z.number()),
  last24Hours: z.number(),
  last7Days: z.number(),
  topSources: z.array(z.object({ source: z.string(), count: z.number() })),
  topPaths: z.array(z.object({ path: z.string(), count: z.number() })),
  generatedAt: z.string(),
});

export type SystemLogMetricsDto = z.infer<typeof systemLogMetricsSchema>;

/**
 * Trace & Span DTOs
 */
export const spanLogSchema = z.object({
  timestamp: z.string(),
  fields: z.record(z.string(), z.unknown()),
});

export type SpanLogDto = z.infer<typeof spanLogSchema>;

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

export type SpanDto = z.infer<typeof spanSchema>;

export const traceSchema = dtoBaseSchema.extend({
  operationName: z.string(),
  duration: z.number(),
  status: z.enum(['ok', 'error', 'timeout']),
  spans: z.array(spanSchema),
  endTime: z.string(),
});

export type TraceDto = z.infer<typeof traceSchema>;

/**
 * Alert DTOs
 */
export const alertSchema = namedDtoSchema.extend({
  condition: z.record(z.string(), z.unknown()),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  enabled: z.boolean(),
});

export type AlertDto = z.infer<typeof alertSchema>;

export const createAlertSchema = alertSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAlertDto = z.infer<typeof createAlertSchema>;
export type UpdateAlertDto = Partial<CreateAlertDto>;

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

export type ErrorCategoryDto = z.infer<typeof errorCategorySchema>;

export const suggestedActionSchema = z.object({
  label: z.string(),
  description: z.string(),
  actionType: z.string(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export type SuggestedActionDto = z.infer<typeof suggestedActionSchema>;

export const errorContextSchema = z.record(z.string(), z.unknown()).and(z.object({
  service: z.string().nullable().optional(),
  runId: z.string().nullable().optional(),
  jobId: z.string().nullable().optional(),
  productId: z.string().nullable().optional(),
  errorId: z.string().nullable().optional(),
  category: z.union([errorCategorySchema, z.string()]).nullable().optional(),
  userMessage: z.string().nullable().optional(),
}));

export type ErrorContextDto = z.infer<typeof errorContextSchema>;
