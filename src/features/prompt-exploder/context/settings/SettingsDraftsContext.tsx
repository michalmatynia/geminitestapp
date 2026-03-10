'use client';

import { createContext, type Dispatch, type SetStateAction } from 'react';

import type { PromptValidationRule } from '@/shared/contracts/prompt-engine';
import type {
  PromptExploderLearnedTemplate,
  PromptExploderParserTuningRuleDraft,
  PromptExploderRuntimeRuleProfile,
  PromptExploderValidationRuleStack,
} from '@/shared/contracts/prompt-exploder';

export interface LearningDraft {
  runtimeRuleProfile: PromptExploderRuntimeRuleProfile;
  runtimeValidationRuleStack: PromptExploderValidationRuleStack;
  enabled: boolean;
  autoActivate: boolean;
  similarityThreshold: number;
  templateMergeThreshold: number;
  benchmarkSuggestionUpsertTemplates: boolean;
  minApprovals: number;
  minApprovalsForMatching: number;
  maxTemplates: number;
  autoActivateLearnedTemplates: boolean;
}

export interface SettingsDraftsState {
  learningDraft: LearningDraft;
  setLearningDraft: Dispatch<SetStateAction<LearningDraft>>;
  parserTuningDrafts: PromptExploderParserTuningRuleDraft[];
  setParserTuningDrafts: Dispatch<SetStateAction<PromptExploderParserTuningRuleDraft[]>>;
  hasUnsavedLearningDraft: boolean;
  hasUnsavedParserTuningDrafts: boolean;
  saveError: string | null;
  setSaveError: Dispatch<SetStateAction<string | null>>;
  isParserTuningOpen: boolean;
  setIsParserTuningOpen: Dispatch<SetStateAction<boolean>>;
  sessionLearnedRules: PromptValidationRule[];
  sessionLearnedTemplates: PromptExploderLearnedTemplate[];
}

export const SettingsDraftsContext = createContext<SettingsDraftsState | null>(null);
