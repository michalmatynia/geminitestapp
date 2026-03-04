import { PROMPT_ENGINE_SETTINGS_KEY } from '@/shared/contracts/prompt-engine';
import {
  PROMPT_EXPLODER_SETTINGS_KEY,
  promptExploderSettingsSchema,
} from '@/shared/contracts/prompt-exploder';
import { VALIDATOR_PATTERN_LISTS_KEY } from '@/shared/contracts/validator';
import type {
  PromptExploderSettings,
} from '@/shared/contracts/prompt-exploder';

export { PROMPT_EXPLODER_SETTINGS_KEY, VALIDATOR_PATTERN_LISTS_KEY };

export const defaultPromptExploderSettings: PromptExploderSettings = {
  version: 1,
  mode: 'hybrid',
  patternLists: [],
  activePatternIds: [],
  runtime: {
    ruleProfile: 'all',
    orchestratorEnabled: true,
    benchmarkSuite: 'default',
    benchmarkLowConfidenceThreshold: 0.7,
    benchmarkSuggestionLimit: 10,
    customBenchmarkCases: [],
  },
  learning: {
    enabled: true,
    autoActivate: false,
    templates: [],
    similarityThreshold: 0.85,
    templateMergeThreshold: 0.9,
    minApprovals: 1,
    minApprovalsForMatching: 1,
    maxTemplates: 1000,
    autoActivateLearnedTemplates: true,
    benchmarkSuggestionUpsertTemplates: true,
  },
  ai: {
    operationMode: 'hybrid',
  },
  patternSnapshots: [],
};

export const PROMPT_EXPLODER_DEFAULT_SETTINGS = defaultPromptExploderSettings;

export const PROMPT_EXPLODER_STORAGE_KEYS = [
  PROMPT_ENGINE_SETTINGS_KEY,
  PROMPT_EXPLODER_SETTINGS_KEY,
  VALIDATOR_PATTERN_LISTS_KEY,
] as const;

export function parsePromptExploderSettings(raw: unknown): PromptExploderSettings {
  const result = promptExploderSettingsSchema.safeParse(raw);
  if (!result.success) return defaultPromptExploderSettings;
  const data = result.data as any;
  return {
    ...defaultPromptExploderSettings,
    ...data,
    runtime: data['runtime'] ?? defaultPromptExploderSettings.runtime,
    learning: data['learning'] ?? defaultPromptExploderSettings.learning,
    ai: data['ai'] ?? defaultPromptExploderSettings.ai,
  } as PromptExploderSettings;
}

export function parsePromptExploderSettingsResult(raw: unknown): {
  settings: PromptExploderSettings;
  error: string | null;
} {
  const result = promptExploderSettingsSchema.safeParse(raw);
  if (!result.success) {
    return {
      settings: defaultPromptExploderSettings,
      error: result.error.message,
    };
  }
  const data = result.data as any;
  return {
    settings: {
      ...defaultPromptExploderSettings,
      ...data,
      runtime: data['runtime'] ?? defaultPromptExploderSettings.runtime,
      learning: data['learning'] ?? defaultPromptExploderSettings.learning,
      ai: data['ai'] ?? defaultPromptExploderSettings.ai,
    } as PromptExploderSettings,
    error: null,
  };
}

export type PromptExploderSettingsValidationError = string;
