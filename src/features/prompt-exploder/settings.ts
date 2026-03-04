import { PROMPT_ENGINE_SETTINGS_KEY } from '@/shared/contracts/prompt-engine';
import {
  PROMPT_EXPLODER_SETTINGS_KEY,
  promptExploderSettingsSchema,
  type PromptExploderSettings,
} from '@/shared/contracts/prompt-exploder';
import { VALIDATOR_PATTERN_LISTS_KEY } from '@/shared/contracts/validator';

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
  promptValidation: {
    enabled: true,
    rules: [],
    learnedRules: [],
  },
  patternSnapshots: [],
};

export const PROMPT_EXPLODER_DEFAULT_SETTINGS = defaultPromptExploderSettings;

export const PROMPT_EXPLODER_STORAGE_KEYS = [
  PROMPT_ENGINE_SETTINGS_KEY,
  PROMPT_EXPLODER_SETTINGS_KEY,
  VALIDATOR_PATTERN_LISTS_KEY,
] as const;

export type PromptExploderSettingsValidationErrorCode =
  | 'invalid_settings_json'
  | 'invalid_shape'
  | 'deprecated_ai_keys';

export type PromptExploderSettingsValidationError = {
  code: PromptExploderSettingsValidationErrorCode;
  message: string;
  deprecatedKeys?: string[];
};

type PersistedPayloadParseResult =
  | { hasPayload: false; payload: null; error: null }
  | { hasPayload: true; payload: unknown; error: null }
  | { hasPayload: true; payload: null; error: PromptExploderSettingsValidationError };

const REQUIRED_TOP_LEVEL_KEYS = [
  'version',
  'mode',
  'patternLists',
  'activePatternIds',
  'runtime',
  'learning',
  'ai',
  'promptValidation',
  'patternSnapshots',
] as const;

const REQUIRED_RUNTIME_KEYS = ['ruleProfile', 'customBenchmarkCases'] as const;
const REQUIRED_LEARNING_KEYS = [
  'enabled',
  'autoActivate',
  'templates',
  'similarityThreshold',
  'templateMergeThreshold',
  'minApprovals',
  'minApprovalsForMatching',
  'maxTemplates',
  'autoActivateLearnedTemplates',
  'benchmarkSuggestionUpsertTemplates',
] as const;
const REQUIRED_AI_KEYS = ['operationMode'] as const;
const ALLOWED_AI_KEYS = new Set<string>(REQUIRED_AI_KEYS);

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const hasOwn = (record: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(record, key);

const hasRequiredKeys = (
  record: Record<string, unknown>,
  requiredKeys: readonly string[]
): boolean => requiredKeys.every((key) => hasOwn(record, key));

const invalidSettingsJsonError = (): PromptExploderSettingsValidationError => ({
  code: 'invalid_settings_json',
  message: 'Prompt Exploder settings payload is not valid JSON.',
});

const invalidShapeError = (details?: string): PromptExploderSettingsValidationError => ({
  code: 'invalid_shape',
  message: details
    ? `Prompt Exploder settings payload has invalid shape: ${details}`
    : 'Prompt Exploder settings payload has invalid shape.',
});

const deprecatedAiKeysError = (
  deprecatedKeys: string[]
): PromptExploderSettingsValidationError => ({
  code: 'deprecated_ai_keys',
  message: `Prompt Exploder settings payload contains deprecated AI snapshot keys: ${deprecatedKeys.join(', ')}`,
  deprecatedKeys,
});

const parsePersistedPayload = (raw: unknown): PersistedPayloadParseResult => {
  if (raw === null || raw === undefined) {
    return { hasPayload: false, payload: null, error: null };
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) {
      return { hasPayload: false, payload: null, error: null };
    }
    try {
      return { hasPayload: true, payload: JSON.parse(trimmed), error: null };
    } catch {
      return { hasPayload: true, payload: null, error: invalidSettingsJsonError() };
    }
  }

  return { hasPayload: true, payload: raw, error: null };
};

export function parsePromptExploderSettingsResult(raw: unknown): {
  settings: PromptExploderSettings;
  error: PromptExploderSettingsValidationError | null;
} {
  const persisted = parsePersistedPayload(raw);
  if (persisted.error) {
    return {
      settings: defaultPromptExploderSettings,
      error: persisted.error,
    };
  }
  if (!persisted.hasPayload || persisted.payload === null) {
    return {
      settings: defaultPromptExploderSettings,
      error: null,
    };
  }
  if (!isObjectRecord(persisted.payload)) {
    return {
      settings: defaultPromptExploderSettings,
      error: invalidShapeError(),
    };
  }
  if (!hasRequiredKeys(persisted.payload, REQUIRED_TOP_LEVEL_KEYS)) {
    return {
      settings: defaultPromptExploderSettings,
      error: invalidShapeError(),
    };
  }

  const runtimePayload = persisted.payload['runtime'];
  const learningPayload = persisted.payload['learning'];
  const aiPayload = persisted.payload['ai'];
  if (
    !isObjectRecord(runtimePayload) ||
    !isObjectRecord(learningPayload) ||
    !isObjectRecord(aiPayload) ||
    !hasRequiredKeys(runtimePayload, REQUIRED_RUNTIME_KEYS) ||
    !hasRequiredKeys(learningPayload, REQUIRED_LEARNING_KEYS) ||
    !hasRequiredKeys(aiPayload, REQUIRED_AI_KEYS)
  ) {
    return {
      settings: defaultPromptExploderSettings,
      error: invalidShapeError(),
    };
  }

  const deprecatedKeys = Object.keys(aiPayload)
    .filter((key) => !ALLOWED_AI_KEYS.has(key))
    .sort();
  if (deprecatedKeys.length > 0) {
    return {
      settings: defaultPromptExploderSettings,
      error: deprecatedAiKeysError(deprecatedKeys),
    };
  }

  const parsed = promptExploderSettingsSchema.safeParse(persisted.payload);
  if (!parsed.success) {
    return {
      settings: defaultPromptExploderSettings,
      error: invalidShapeError(parsed.error.issues[0]?.message),
    };
  }
  return {
    settings: parsed.data,
    error: null,
  };
}

export function parsePromptExploderSettings(raw: unknown): PromptExploderSettings {
  const parsed = parsePromptExploderSettingsResult(raw);
  if (parsed.error) {
    throw new Error(parsed.error.message);
  }
  return parsed.settings;
}
