'use client';

import { createContext, useContext } from 'react';

import type { PromptValidationRule } from '@/shared/contracts/prompt-engine';
import type { PromptExploderParserTuningRuleDraft } from '@/shared/contracts/prompt-exploder';
import { internalError } from '@/shared/errors/app-error';
import { useUpdateSetting, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';

import type { LearningDraft } from './SettingsDraftsContext';
import type { PromptExploderLearnedTemplate } from '../../types';


export interface PromptExploderSettingsActions {
  setLearningDraft: React.Dispatch<React.SetStateAction<LearningDraft>>;
  setParserTuningDrafts: React.Dispatch<
    React.SetStateAction<PromptExploderParserTuningRuleDraft[]>
  >;
  setIsParserTuningOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSnapshotDraftName: React.Dispatch<React.SetStateAction<string>>;
  setSelectedSnapshotId: React.Dispatch<React.SetStateAction<string>>;
  setSessionLearnedRules: React.Dispatch<React.SetStateAction<PromptValidationRule[]>>;
  setSessionLearnedTemplates: React.Dispatch<React.SetStateAction<PromptExploderLearnedTemplate[]>>;
  patchParserTuningDraft: (
    ruleId: PromptExploderParserTuningRuleDraft['id'],
    patch: Partial<PromptExploderParserTuningRuleDraft>
  ) => void;
  handleInstallPatternPack: () => Promise<void>;
  handleSaveLearningSettings: () => Promise<void>;
  handleSaveParserTuningRules: () => Promise<void>;
  handleResetParserTuningDrafts: () => void;
  handleCapturePatternSnapshot: () => Promise<void>;
  handleRestorePatternSnapshot: () => Promise<void>;
  handleDeletePatternSnapshot: () => Promise<void>;
  handleTemplateStateChange: (
    templateId: string,
    nextState: PromptExploderLearnedTemplate['state']
  ) => Promise<void>;
  handleDeleteTemplate: (templateId: string) => Promise<void>;
  handleRefresh: () => Promise<void>;
  updateSetting: ReturnType<typeof useUpdateSetting>;
  updateSettingsBulk: ReturnType<typeof useUpdateSettingsBulk>;
}

export const SettingsActionsContext = createContext<PromptExploderSettingsActions | null>(null);

export function useSettingsActions(): PromptExploderSettingsActions {
  const context = useContext(SettingsActionsContext);
  if (!context) throw internalError('useSettingsActions must be used within SettingsProvider');
  return context;
}
