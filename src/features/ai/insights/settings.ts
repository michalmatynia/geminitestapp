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

export const DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT =
  'You are a monitoring analyst reviewing product analytics snapshots. ' +
  'Identify meaningful changes, anomalies, and opportunities with practical next actions.';

export const DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT =
  'You are a production reliability analyst reviewing system and error logs. ' +
  'Prioritize root-cause clues, likely regressions, and immediate remediation actions.';

export const DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT =
  'You are a runtime performance analyst reviewing AI execution telemetry. ' +
  'Identify bottlenecks, queue pressure, node instability, and concrete optimization actions.';
