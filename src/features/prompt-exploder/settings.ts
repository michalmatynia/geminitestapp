import { z } from 'zod';

import {
  promptExploderSettingsSchema,
} from '@/shared/contracts/prompt-exploder';

import {
  DEFAULT_PROMPT_EXPLODER_VALIDATION_RULE_STACK,
  normalizePromptExploderValidationRuleStack,
} from './validation-stack';

import type {
  PromptExploderSettings,
} from './types';

export const PROMPT_EXPLODER_SETTINGS_KEY = 'prompt_exploder_settings';

export const defaultPromptExploderSettings: PromptExploderSettings = {
  version: 1,
  runtime: {
    ruleProfile: 'all',
    validationRuleStack: DEFAULT_PROMPT_EXPLODER_VALIDATION_RULE_STACK,
    orchestratorEnabled: true,
    benchmarkSuite: 'default',
    benchmarkLowConfidenceThreshold: 0.55,
    benchmarkSuggestionLimit: 4,
    customBenchmarkCases: [],
  },
  learning: {
    enabled: true,
    similarityThreshold: 0.68,
    templateMergeThreshold: 0.63,
    benchmarkSuggestionUpsertTemplates: true,
    minApprovalsForMatching: 1,
    maxTemplates: 1000,
    autoActivateLearnedTemplates: true,
    templates: [],
  },
  ai: {
    operationMode: 'rules_only',
    provider: 'auto',
    modelId: '',
    fallbackModelId: '',
    temperature: 0.2,
    maxTokens: 1200,
  },
  patternSnapshots: [],
};

export function parsePromptExploderSettings(rawValue: string | null | undefined): PromptExploderSettings {
  if (!rawValue?.trim()) return defaultPromptExploderSettings;

  try {
    const parsed: unknown = JSON.parse(rawValue);
    const result = promptExploderSettingsSchema.safeParse(parsed);
    if (!result.success) return defaultPromptExploderSettings;
    return {
      ...result.data,
      runtime: {
        ...result.data.runtime,
        validationRuleStack: normalizePromptExploderValidationRuleStack(
          result.data.runtime.validationRuleStack
        ),
      },
      learning: {
        ...result.data.learning,
        templates: result.data.learning.templates.map((template) => ({
          ...template,
          state: template.state ?? 'active',
        })),
      },
    };
  } catch {
    return defaultPromptExploderSettings;
  }
}
