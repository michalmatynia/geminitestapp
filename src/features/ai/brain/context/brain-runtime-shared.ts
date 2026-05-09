import {
  AI_INSIGHTS_SETTINGS_KEYS,
  DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
} from '@/shared/contracts/ai-insights';
import { PLAYWRIGHT_PERSONA_SETTINGS_KEY } from '@/shared/contracts/playwright';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import type {
  AiBrainFeature,
  AiBrainProvider,
  AiBrainSettings,
} from '../settings';

export {
  AI_INSIGHTS_SETTINGS_KEYS,
  DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
  PLAYWRIGHT_PERSONA_SETTINGS_KEY,
};

export const REPORT_FEATURE_KEYS = new Set<AiBrainFeature>([
  'analytics',
  'runtime_analytics',
  'system_logs',
  'error_logs',
]);

export const ALL_BRAIN_FEATURE_KEYS: AiBrainFeature[] = [
  'cms_builder',
  'image_studio',
  'products',
  'integrations',
  'case_resolver',
  'agent_runtime',
  'agent_teaching',
  'prompt_engine',
  'ai_paths',
  'chatbot',
  'kangur_ai_tutor',
  'social_publishing',
  'job_board',
  'analytics',
  'runtime_analytics',
  'system_logs',
  'error_logs',
  'playwright',
];

export const DEFAULT_BRAIN_OVERRIDES_ENABLED: Record<AiBrainFeature, boolean> = {
  cms_builder: false,
  image_studio: false,
  prompt_engine: false,
  ai_paths: false,
  chatbot: false,
  kangur_ai_tutor: false,
  social_publishing: false,
  job_board: false,
  products: false,
  integrations: false,
  case_resolver: false,
  agent_runtime: false,
  agent_teaching: false,
  analytics: true,
  runtime_analytics: true,
  system_logs: true,
  error_logs: true,
  playwright: false,
};

const AI_BRAIN_PROVIDER_SETTING_KEYS = new Set<string>([
  'openai_api_key',
  'anthropic_api_key',
  'gemini_api_key',
]);

export const getAllowedProvidersForFeature = (
  feature: AiBrainFeature
): AiBrainProvider[] => (feature === 'cms_builder' ? ['model', 'agent'] : ['model']);

export const hasAnyBrainOrInsightsSetting = (map: Map<string, string>): boolean => {
  for (const key of map.keys()) {
    if (
      AI_BRAIN_PROVIDER_SETTING_KEYS.has(key) ||
      key.startsWith('ai_brain_') ||
      key.startsWith('ai_insights_') ||
      key.startsWith('ai_analytics_') ||
      key.startsWith('ai_runtime_analytics_') ||
      key.startsWith('ai_logs_')
    ) {
      return true;
    }
  }
  return false;
};

export const buildBrainOverridesEnabled = (
  settings: AiBrainSettings
): Record<AiBrainFeature, boolean> =>
  Object.fromEntries(
    ALL_BRAIN_FEATURE_KEYS.map((feature: AiBrainFeature): [AiBrainFeature, boolean] => [
      feature,
      DEFAULT_BRAIN_OVERRIDES_ENABLED[feature] || settings.assignments[feature] !== undefined,
    ])
  ) as Record<AiBrainFeature, boolean>;

export const parseBooleanSetting = (
  value: string | null | undefined,
  fallback: boolean
): boolean => {
  if (value === null || value === undefined) {
    return fallback;
  }
  return value === 'true' || value === '1';
};

export const parseNumberSetting = (
  value: string | null | undefined,
  fallback: number,
  min: number = 1
): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min) {
    return fallback;
  }
  return parsed;
};

export const parsePlaywrightPersonaIds = (raw: string | null | undefined): string[] => {
  const parsed = parseJsonSetting<unknown>(raw, []);
  if (!Array.isArray(parsed)) {
    return [];
  }
  const seen = new Set<string>();
  const ids: string[] = [];
  parsed.forEach((item: unknown) => {
    if (item === null || typeof item !== 'object') {
      return;
    }
    const id = (item as { id?: unknown }).id;
    if (typeof id !== 'string') {
      return;
    }
    const trimmed = id.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) {
      return;
    }
    seen.add(trimmed);
    ids.push(trimmed);
  });
  return ids;
};
