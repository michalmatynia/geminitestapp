'use client';

import { createContext, useContext } from 'react';

import { internalError } from '@/shared/errors/app-error';

import type { RuleDraft } from '../prompt-engine-context-utils';

export interface PromptEngineData {
  drafts: RuleDraft[];
  learnedDrafts: RuleDraft[];
  filteredDrafts: RuleDraft[];
  filteredLearnedDrafts: RuleDraft[];
  isDirty: boolean;
  learnedDirty: boolean;
  saveError: string | null;
  isLoading: boolean;
  isSaving: boolean;
}

export const DataContext = createContext<PromptEngineData | null>(null);

export const usePromptEngineData = () => {
  const context = useContext(DataContext);
  if (!context) throw internalError('usePromptEngineData must be used within PromptEngineProvider');
  return context;
};
