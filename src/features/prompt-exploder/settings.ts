import { PROMPT_ENGINE_SETTINGS_KEY } from '@/shared/contracts/prompt-engine';
import {
  PROMPT_EXPLODER_SETTINGS_KEY,
  VALIDATOR_PATTERN_LISTS_KEY,
} from '@/shared/contracts/prompt-exploder';
import type {
  PromptExploderSettings,
} from '@/shared/contracts/prompt-exploder';

export const PROMPT_EXPLODER_DEFAULT_SETTINGS: PromptExploderSettings = {
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
    customBenchmarkCases: '',
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

export const PROMPT_EXPLODER_STORAGE_KEYS = [
  PROMPT_ENGINE_SETTINGS_KEY,
  PROMPT_EXPLODER_SETTINGS_KEY,
  VALIDATOR_PATTERN_LISTS_KEY,
] as const;
