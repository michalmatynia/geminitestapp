'use client';

import { createContext, useContext } from 'react';
import type { PromptValidationRule } from '@/shared/contracts/prompt-engine';
import type { PromptExploderParserTuningRuleDraft } from '../../parser-tuning';
import type { PromptExploderLearnedTemplate } from '../../types';
import type { PromptExploderValidationRuleStack } from '../../validation-stack';

export interface LearningDraft {
  runtimeRuleProfile: 'all' | 'pattern_pack' | 'learned_only';
  runtimeValidationRuleStack: PromptExploderValidationRuleStack;
  enabled: boolean;
  similarityThreshold: number;
  templateMergeThreshold: number;
  benchmarkSuggestionUpsertTemplates: boolean;
  minApprovalsForMatching: number;
  maxTemplates: number;
  autoActivateLearnedTemplates: boolean;
}

export interface SettingsDraftsState {
  learningDraft: LearningDraft;
  parserTuningDrafts: PromptExploderParserTuningRuleDraft[];
  isParserTuningOpen: boolean;
  hasUnsavedLearningDraft: boolean;
  hasUnsavedParserTuningDrafts: boolean;
  sessionLearnedRules: PromptValidationRule[];
  sessionLearnedTemplates: PromptExploderLearnedTemplate[];
}

export const SettingsDraftsContext = createContext<SettingsDraftsState | null>(null);

export function useSettingsDrafts(): SettingsDraftsState {
  const context = useContext(SettingsDraftsContext);
  if (!context) throw new Error('useSettingsDrafts must be used within SettingsProvider');
  return context;
}
