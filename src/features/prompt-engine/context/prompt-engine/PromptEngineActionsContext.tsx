'use client';

import { createContext, useContext } from 'react';

import { internalError } from '@/shared/errors/app-error';

import type { PatternCollectionTab, ExploderPatternSubTab } from './PromptEngineConfigContext';
import type { RulePatch } from '../prompt-engine-context-utils';

export interface PromptEngineActions {
  setPatternTab: (tab: PatternCollectionTab) => void;
  setExploderSubTab: (subTab: ExploderPatternSubTab) => void;
  handleRuleTextChange: (uid: string, nextText: string) => void;
  handlePatchRule: (uid: string, patch: RulePatch) => void;
  handleToggleRuleEnabled: (uid: string, enabled: boolean) => void;
  handleDuplicateRule: (uid: string) => void;
  handleSequenceDrop: (draggedUid: string, targetUid: string) => void;
  handleSaveSequenceGroup: (groupId: string, label: string, debounceMs: number) => void;
  handleUngroupSequenceGroup: (groupId: string) => void;
  handleLearnedRuleTextChange: (uid: string, nextText: string) => void;
  handleAddRule: () => void;
  handleAddLearnedRule: () => void;
  handleRemoveRule: (uid: string) => void;
  handleRemoveLearnedRule: (uid: string) => void;
  handleRefresh: () => Promise<void>;
  handleExport: () => void;
  handleExportLearned: () => void;
  handleImport: (file: File) => Promise<void>;
  handleImportLearned: (file: File) => Promise<void>;
  handleSave: () => Promise<void>;
  handleCopy: (value: string, label: string) => Promise<void>;
}

export const ActionsContext = createContext<PromptEngineActions | null>(null);

export const usePromptEngineActions = () => {
  const context = useContext(ActionsContext);
  if (!context) throw internalError('usePromptEngineActions must be used within PromptEngineProvider');
  return context;
};
