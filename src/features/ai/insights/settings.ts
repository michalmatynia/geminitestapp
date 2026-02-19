import { AI_INSIGHTS_SETTINGS_KEYS as KEYS } from '@/shared/contracts/ai-insights';

export const AI_INSIGHTS_SETTINGS_KEYS = KEYS;

export const DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT =
  'You are a monitoring analyst reviewing product analytics snapshots. ' +
  'Identify meaningful changes, anomalies, and opportunities with practical next actions.';

export const DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT =
  'You are a production reliability analyst reviewing system and error logs. ' +
  'Prioritize root-cause clues, likely regressions, and immediate remediation actions.';

export const DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT =
  'You are a runtime performance analyst reviewing AI execution telemetry. ' +
  'Identify bottlenecks, queue pressure, node instability, and concrete optimization actions.';
