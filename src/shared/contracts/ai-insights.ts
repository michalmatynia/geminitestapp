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

export const AI_INSIGHTS_SETTINGS_KEYS = {
  analyticsProvider: 'ai_analytics_provider',
  analyticsModel: 'ai_analytics_model',
  analyticsAgentId: 'ai_analytics_agent_id',
  analyticsPromptSystem: 'ai_analytics_prompt_system',
  analyticsScheduleEnabled: 'ai_analytics_schedule_enabled',
  analyticsScheduleMinutes: 'ai_analytics_schedule_minutes',

  runtimeAnalyticsProvider: 'ai_runtime_analytics_provider',
  runtimeAnalyticsModel: 'ai_runtime_analytics_model',
  runtimeAnalyticsAgentId: 'ai_runtime_analytics_agent_id',
  runtimeAnalyticsPromptSystem: 'ai_runtime_analytics_prompt_system',
  runtimeAnalyticsScheduleEnabled: 'ai_runtime_analytics_schedule_enabled',
  runtimeAnalyticsScheduleMinutes: 'ai_runtime_analytics_schedule_minutes',

  logsProvider: 'ai_logs_provider',
  logsModel: 'ai_logs_model',
  logsAgentId: 'ai_logs_agent_id',
  logsPromptSystem: 'ai_logs_prompt_system',
  logsScheduleEnabled: 'ai_logs_schedule_enabled',
  logsScheduleMinutes: 'ai_logs_schedule_minutes',
  logsAutoOnError: 'ai_logs_autorun_on_error',

  analyticsHistory: 'ai_insights_analytics_history',
  runtimeAnalyticsHistory: 'ai_insights_runtime_analytics_history',
  logsHistory: 'ai_insights_logs_history',
  analyticsLastRunAt: 'ai_insights_analytics_last_run_at',
  runtimeAnalyticsLastRunAt: 'ai_insights_runtime_analytics_last_run_at',
  logsLastRunAt: 'ai_insights_logs_last_run_at',
  logsLastErrorSeenAt: 'ai_insights_logs_last_error_seen_at',
  notifications: 'ai_insights_notifications',
} as const;
