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
    allowValidationStackFallback: false,
    caseResolverCaptureMode: 'rules_only',
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
    const rawParsed = JSON.parse(rawValue) as unknown;
    if (!rawParsed || typeof rawParsed !== 'object' || Array.isArray(rawParsed)) {
      return defaultPromptExploderSettings;
    }
    const record = rawParsed as Record<string, unknown>;
    
    const getNestedObject = (key: string): Record<string, unknown> => {
      const val = record[key];
      return (val && typeof val === 'object' && !Array.isArray(val)) 
        ? (val as Record<string, unknown>) 
        : {};
    };

    const learningRecord = getNestedObject('learning');
    const templates = Array.isArray(learningRecord['templates']) 
      ? (learningRecord['templates'] as unknown[]) 
      : [];

    const merged = {
      ...defaultPromptExploderSettings,
      ...record,
      runtime: {
        ...defaultPromptExploderSettings.runtime,
        ...getNestedObject('runtime'),
      },
      learning: {
        ...defaultPromptExploderSettings.learning,
        ...learningRecord,
        templates,
      },
      ai: {
        ...defaultPromptExploderSettings.ai,
        ...getNestedObject('ai'),
      },
    };

    const result = promptExploderSettingsSchema.safeParse(merged);
    if (!result.success) {
      return defaultPromptExploderSettings;
    }
    const normalized = {
      ...result.data,
      runtime: {
        ...result.data.runtime,
        validationRuleStack: normalizePromptExploderValidationRuleStack(
          result.data.runtime.validationRuleStack
        ),
        allowValidationStackFallback:
          result.data.runtime.allowValidationStackFallback ?? false,
        caseResolverCaptureMode:
          result.data.runtime.caseResolverCaptureMode ?? 'rules_only',
      },
      learning: {
        ...result.data.learning,
        templates: result.data.learning.templates.map((template) => ({
          ...template,
          state: template.state ?? 'active',
        })),
      },
    };
    return normalized;
  } catch {
    return defaultPromptExploderSettings;
  }
}
