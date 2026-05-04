/**
 * AI Insights Settings
 * 
 * Configuration and settings management for AI insights system.
 * Provides:
 * - Default system prompts for different insight types
 * - Settings key definitions and exports
 * - Analytics insight configuration
 * - Logs insight configuration
 * - Runtime analytics prompt templates
 */

import { AI_INSIGHTS_SETTINGS_KEYS as KEYS } from '@/shared/contracts/ai-insights';

export {
  DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
} from '@/shared/contracts/ai-insights';

export const AI_INSIGHTS_SETTINGS_KEYS = KEYS;
