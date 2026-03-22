import { z } from 'zod';

import { contextRegistryConsumerEnvelopeSchema } from './ai-context-registry';
import {
  aiPathRuntimeAnalyticsRangeQuerySchema,
  aiPathRuntimeAnalyticsRangeSchema,
} from './ai-paths';
import { namedDtoSchema } from './base';

/**
 * AI Insight Contracts
 */

export const aiInsightTypeSchema = z.enum([
  'product_recommendation',
  'content_optimization',
  'anomaly_detection',
  'trend_analysis',
  'system_health',
  'analytics',
  'runtime_analytics',
  'system_logs',
  'logs',
]);

export type AiInsightType = z.infer<typeof aiInsightTypeSchema>;

export const aiInsightStatusSchema = z.enum([
  'new',
  'dismissed',
  'applied',
  'ignored',
  'ok',
  'warning',
  'error',
]);

export type AiInsightStatus = z.infer<typeof aiInsightStatusSchema>;

export const aiInsightSourceSchema = z.enum([
  'system',
  'user_triggered',
  'scheduled_job',
  'manual',
  'scheduled',
]);

export type AiInsightSource = z.infer<typeof aiInsightSourceSchema>;

export const aiInsightModelConfigSchema = z.object({
  modelId: z.string(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
});

export type AiInsightModelConfig = z.infer<typeof aiInsightModelConfigSchema>;

export const aiInsightRecordSchema = namedDtoSchema.extend({
  type: aiInsightTypeSchema,
  status: aiInsightStatusSchema,
  source: aiInsightSourceSchema,
  score: z.number(),
  content: z.record(z.string(), z.unknown()),
  actionUrl: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  summary: z.string().optional(),
  warnings: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
});

export type AiInsightRecord = z.infer<typeof aiInsightRecordSchema>;

export const aiInsightsResponseSchema = z.object({
  insights: z.array(aiInsightRecordSchema),
});

export type AiInsightsResponseDto = z.infer<typeof aiInsightsResponseSchema>;
export type AiInsightsResponse = AiInsightsResponseDto;

export const aiInsightResponseSchema = z.object({
  insight: aiInsightRecordSchema.nullable(),
});

export type AiInsightResponseDto = z.infer<typeof aiInsightResponseSchema>;
export type AiInsightResponse = AiInsightResponseDto;

export const aiInsightNotificationSchema = z.object({
  id: z.string().optional(),
  insightId: z.string(),
  userId: z.string(),
  type: aiInsightTypeSchema.optional(),
  readAt: z.string().nullable(),
  createdAt: z.string().optional(),
  status: aiInsightStatusSchema.optional(),
  summary: z.string().optional(),
  warnings: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
});

export type AiInsightNotification = z.infer<typeof aiInsightNotificationSchema>;

export interface AiInsightNotificationsResponse {
  notifications: AiInsightNotification[];
  total: number;
  unreadCount: number;
}

export const AI_INSIGHTS_SETTINGS_KEYS = {
  analyticsHistory: 'ai_insights_analytics_history',
  runtimeAnalyticsHistory: 'ai_insights_runtime_analytics_history',
  logsHistory: 'ai_insights_logs_history',
  notifications: 'ai_insights_notifications',
  analyticsPromptSystem: 'ai_insights_analytics_prompt_system',
  runtimeAnalyticsPromptSystem: 'ai_insights_runtime_analytics_prompt_system',
  logsPromptSystem: 'ai_insights_logs_prompt_system',
  analyticsModel: 'ai_insights_analytics_model',
  analyticsAgentId: 'ai_insights_analytics_agent_id',
  analyticsProvider: 'ai_insights_analytics_provider',
  analyticsLastRunAt: 'ai_insights_analytics_last_run_at',
  logsModel: 'ai_insights_logs_model',
  logsAgentId: 'ai_insights_logs_agent_id',
  logsProvider: 'ai_insights_logs_provider',
  logsLastRunAt: 'ai_insights_logs_last_run_at',
  logsLastErrorSeenAt: 'ai_insights_logs_last_error_seen_at',
  runtimeAnalyticsModel: 'ai_insights_runtime_analytics_model',
  runtimeAnalyticsAgentId: 'ai_insights_runtime_analytics_agent_id',
  runtimeAnalyticsProvider: 'ai_insights_runtime_analytics_provider',
  runtimeAnalyticsLastRunAt: 'ai_insights_runtime_analytics_last_run_at',
  analyticsScheduleEnabled: 'ai_insights_analytics_schedule_enabled',
  analyticsScheduleMinutes: 'ai_insights_analytics_schedule_minutes',
  runtimeAnalyticsScheduleEnabled: 'ai_insights_runtime_analytics_schedule_enabled',
  runtimeAnalyticsScheduleMinutes: 'ai_insights_runtime_analytics_schedule_minutes',
  logsScheduleEnabled: 'ai_insights_logs_schedule_enabled',
  logsScheduleMinutes: 'ai_insights_logs_schedule_minutes',
  logsAutoOnError: 'ai_insights_logs_auto_on_error',
} as const;

export const DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT =
  'You are a monitoring analyst reviewing product analytics snapshots. ' +
  'Identify meaningful changes, anomalies, and opportunities with practical next actions.';

export const DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT =
  'You are a production reliability analyst reviewing system and error logs. ' +
  'Prioritize root-cause clues, likely regressions, and immediate remediation actions.';

export const DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT =
  'You are a runtime performance analyst reviewing AI execution telemetry. ' +
  'Identify bottlenecks, queue pressure, node instability, and concrete optimization actions.';

export const analyticsInsightRunRequestSchema = z.object({
  contextRegistry: contextRegistryConsumerEnvelopeSchema.optional(),
});

export type AnalyticsInsightRunRequest = z.infer<typeof analyticsInsightRunRequestSchema>;

export const aiInsightsListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).optional(),
});

export type AiInsightsListQuery = z.infer<typeof aiInsightsListQuerySchema>;

export const runtimeAnalyticsInsightRunRequestSchema = z.object({
  range: aiPathRuntimeAnalyticsRangeSchema.optional(),
  contextRegistry: contextRegistryConsumerEnvelopeSchema.optional(),
});

export type RuntimeAnalyticsInsightRunRequest = z.infer<
  typeof runtimeAnalyticsInsightRunRequestSchema
>;

export const runtimeAnalyticsInsightsListQuerySchema = aiInsightsListQuerySchema.merge(
  aiPathRuntimeAnalyticsRangeQuerySchema
);

export type RuntimeAnalyticsInsightsListQuery = z.infer<
  typeof runtimeAnalyticsInsightsListQuerySchema
>;
