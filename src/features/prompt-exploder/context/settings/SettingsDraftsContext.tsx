'use client';

import { createContext, useContext } from 'react';
import type { 
  PromptExploderParserTuningRuleDraft,
  PromptExploderLearnedTemplate,
} from '@/shared/contracts/prompt-exploder';
import type { PromptValidationRule } from '@/shared/contracts/prompt-engine';

export interface LearningDraft {
  runtimeRuleProfile: 'all' | 'pattern_pack' | 'learned_only';
  runtimeValidationRuleStack: string | { id: string; name?: string; rules?: any[]; ruleIds?: string[]; isCustom?: boolean };
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

export interface SettingsDraftsContextValue {
  learningDraft: LearningDraft;
  setLearningDraft: (draft: Partial<LearningDraft> | ((prev: LearningDraft) => LearningDraft)) => void;
  parserTuningDrafts: PromptExploderParserTuningRuleDraft[];
  setParserTuningDrafts: (drafts: PromptExploderParserTuningRuleDraft[] | ((prev: PromptExploderParserTuningRuleDraft[]) => PromptExploderParserTuningRuleDraft[])) => void;
  isParserTuningOpen: boolean;
  setIsParserTuningOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sessionLearnedRules: PromptValidationRule[];
  sessionLearnedTemplates: PromptExploderLearnedTemplate[];
  hasUnsavedLearningDraft: boolean;
  hasUnsavedParserTuningDrafts: boolean;
  saveError: string | null;
  setSaveError: (error: string | null) => void;
}

export type SettingsDraftsState = SettingsDraftsContextValue;

export const SettingsDraftsContext = createContext<SettingsDraftsContextValue | null>(null);

export function useSettingsDrafts(): SettingsDraftsContextValue {
  const context = useContext(SettingsDraftsContext);
  if (!context) {
    throw new Error('useSettingsDrafts must be used within SettingsProvider');
  }
  return context;
}
