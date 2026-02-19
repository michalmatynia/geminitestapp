import { z } from 'zod';

/**
 * AI Insight DTOs
 */

export const aiInsightTypeSchema = z.enum(['analytics', 'runtime_analytics', 'logs']);
export type AiInsightTypeDto = z.infer<typeof aiInsightTypeSchema>;

export const aiInsightStatusSchema = z.enum(['ok', 'warning', 'error']);
export type AiInsightStatusDto = z.infer<typeof aiInsightStatusSchema>;

export const aiInsightSourceSchema = z.enum(['manual', 'scheduled', 'auto']);
export type AiInsightSourceDto = z.infer<typeof aiInsightSourceSchema>;

export const aiInsightModelConfigSchema = z.object({
  provider: z.enum(['model', 'agent']),
  modelId: z.string().nullable().optional(),
  agentId: z.string().nullable().optional(),
});

export type AiInsightModelConfigDto = z.infer<typeof aiInsightModelConfigSchema>;

export const aiInsightRecordSchema = z.object({
  id: z.string(),
  type: aiInsightTypeSchema,
  status: aiInsightStatusSchema,
  summary: z.string(),
  warnings: z.array(z.string()),
  recommendations: z.array(z.string()).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
  source: aiInsightSourceSchema,
  model: aiInsightModelConfigSchema,
  window: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    scope: z.string().optional(),
  }).optional(),
});

export type AiInsightRecordDto = z.infer<typeof aiInsightRecordSchema>;

export const aiInsightNotificationSchema = z.object({
  id: z.string(),
  type: aiInsightTypeSchema,
  status: aiInsightStatusSchema,
  summary: z.string(),
  warnings: z.array(z.string()),
  createdAt: z.string(),
  source: aiInsightSourceSchema,
  model: aiInsightModelConfigSchema,
});

export type AiInsightNotificationDto = z.infer<typeof aiInsightNotificationSchema>;

export const aiInsightNotificationsResponseSchema = z.object({
  notifications: z.array(aiInsightNotificationSchema),
});

export type AiInsightNotificationsResponseDto = z.infer<typeof aiInsightNotificationsResponseSchema>;
