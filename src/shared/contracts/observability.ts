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
