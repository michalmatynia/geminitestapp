export const AI_INSIGHTS_SETTINGS_KEYS = {
  analyticsProvider: "ai_analytics_provider",
  analyticsModel: "ai_analytics_model",
  analyticsAgentId: "ai_analytics_agent_id",
  analyticsScheduleEnabled: "ai_analytics_schedule_enabled",
  analyticsScheduleMinutes: "ai_analytics_schedule_minutes",

  logsProvider: "ai_logs_provider",
  logsModel: "ai_logs_model",
  logsAgentId: "ai_logs_agent_id",
  logsScheduleEnabled: "ai_logs_schedule_enabled",
  logsScheduleMinutes: "ai_logs_schedule_minutes",
  logsAutoOnError: "ai_logs_autorun_on_error",

  analyticsHistory: "ai_insights_analytics_history",
  logsHistory: "ai_insights_logs_history",
  analyticsLastRunAt: "ai_insights_analytics_last_run_at",
  logsLastRunAt: "ai_insights_logs_last_run_at",
  logsLastErrorSeenAt: "ai_insights_logs_last_error_seen_at",
  notifications: "ai_insights_notifications",
} as const;
