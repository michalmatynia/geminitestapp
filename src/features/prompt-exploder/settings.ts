import { promptExploderSettingsSchema } from '@/shared/contracts/prompt-exploder';

import { DEFAULT_PROMPT_EXPLODER_VALIDATION_RULE_STACK } from './validation-stack';

import type { PromptExploderSettings } from './types';

export const PROMPT_EXPLODER_SETTINGS_KEY = 'prompt_exploder_settings';

const DEPRECATED_PROMPT_EXPLODER_AI_KEYS = [
  'provider',
  'modelId',
  'fallbackModelId',
  'temperature',
  'maxTokens',
] as const;

export class PromptExploderSettingsValidationError extends Error {
  code: 'invalid_json' | 'invalid_shape' | 'deprecated_ai_keys';
  deprecatedKeys: string[];

  constructor(args: {
    code: 'invalid_json' | 'invalid_shape' | 'deprecated_ai_keys';
    message: string;
    deprecatedKeys?: string[];
  }) {
    super(args.message);
    this.name = 'PromptExploderSettingsValidationError';
    this.code = args.code;
    this.deprecatedKeys = args.deprecatedKeys ?? [];
  }
}

export type PromptExploderSettingsParseResult = {
  settings: PromptExploderSettings;
  error: PromptExploderSettingsValidationError | null;
};

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
  },
  patternSnapshots: [],
};

export function parsePromptExploderSettingsResult(
  rawValue: string | null | undefined
): PromptExploderSettingsParseResult {
  if (!rawValue?.trim()) {
    return {
      settings: defaultPromptExploderSettings,
      error: null,
    };
  }

  try {
    const rawParsed = JSON.parse(rawValue) as unknown;
    if (!rawParsed || typeof rawParsed !== 'object' || Array.isArray(rawParsed)) {
      return {
        settings: defaultPromptExploderSettings,
        error: new PromptExploderSettingsValidationError({
          code: 'invalid_shape',
          message: 'Prompt Exploder settings payload must be a JSON object.',
        }),
      };
    }
    const record = rawParsed as Record<string, unknown>;

    const aiRecord = getNestedObject(record, 'ai');
    const deprecatedAiKeys = DEPRECATED_PROMPT_EXPLODER_AI_KEYS.filter(
      (key: string): boolean => key in aiRecord
    );
    if (deprecatedAiKeys.length > 0) {
      return {
        settings: defaultPromptExploderSettings,
        error: new PromptExploderSettingsValidationError({
          code: 'deprecated_ai_keys',
          message: `Prompt Exploder settings contain deprecated AI snapshot keys: ${deprecatedAiKeys.join(', ')}.`,
          deprecatedKeys: deprecatedAiKeys,
        }),
      };
    }
    const result = promptExploderSettingsSchema.safeParse(rawParsed);
    if (!result.success) {
      return {
        settings: defaultPromptExploderSettings,
        error: new PromptExploderSettingsValidationError({
          code: 'invalid_shape',
          message: 'Prompt Exploder settings failed validation.',
        }),
      };
    }
    const normalized: PromptExploderSettings = {
      ...result.data,
      patternSnapshots: result.data.patternSnapshots ?? [],
      runtime: {
        ...result.data.runtime,
        ruleProfile: result.data.runtime.ruleProfile,
        validationRuleStack: result.data.runtime.validationRuleStack,
        allowValidationStackFallback: result.data.runtime.allowValidationStackFallback ?? false,
        caseResolverCaptureMode: result.data.runtime.caseResolverCaptureMode ?? 'rules_only',
      },
      learning: {
        ...result.data.learning,
        templates: result.data.learning.templates.map((template) => ({
          ...template,
          state: template.state ?? 'active',
        })),
      },
    };
    return {
      settings: normalized,
      error: null,
    };
  } catch {
    return {
      settings: defaultPromptExploderSettings,
      error: new PromptExploderSettingsValidationError({
        code: 'invalid_json',
        message: 'Prompt Exploder settings are not valid JSON.',
      }),
    };
  }
}

export function parsePromptExploderSettings(
  rawValue: string | null | undefined
): PromptExploderSettings {
  const parsed = parsePromptExploderSettingsResult(rawValue);
  const hasPersistedPayload = Boolean(rawValue?.trim());
  if (parsed.error && hasPersistedPayload) {
    throw parsed.error;
  }
  return parsed.settings;
}

function getNestedObject(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const val = record[key];
  return val && typeof val === 'object' && !Array.isArray(val)
    ? (val as Record<string, unknown>)
    : {};
}
