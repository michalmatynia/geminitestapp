'use client';

import React, { useCallback, useMemo } from 'react';

import type {
  PromptExploderLearnedTemplate,
  PromptExploderParserTuningRuleDraft,
  PromptExploderRuntimeRuleProfile,
  PromptExploderSegmentationLibraryState,
  PromptExploderValidationRuleStack,
} from '@/shared/contracts/prompt-exploder';
import type { PromptValidationRule } from '@/shared/contracts/prompt-engine';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { useSettingsMap, useUpdateSetting, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';

import {
  parsePromptExploderSegmentationLibrary,
  PROMPT_EXPLODER_SEGMENTATION_LIBRARY_KEY,
} from '../segmentation-library';
import { useSettingsActionsImpl } from './settings/useSettingsActionsImpl';
import { useSettingsDataImpl } from './settings/useSettingsDataImpl';

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

type SettingsData = ReturnType<typeof useSettingsDataImpl>;

export type PromptExploderSettingsState = SettingsData & {
  segmentationLibrary: PromptExploderSegmentationLibraryState;
};

export type PromptExploderSettingsActions = ReturnType<typeof useSettingsActionsImpl> & {
  setLearningDraft: React.Dispatch<React.SetStateAction<LearningDraft>>;
  setParserTuningDrafts: React.Dispatch<
    React.SetStateAction<PromptExploderParserTuningRuleDraft[]>
  >;
  setIsParserTuningOpen: SettingsData['setIsParserTuningOpen'];
  setSnapshotDraftName: SettingsData['setSnapshotDraftName'];
  setSelectedSnapshotId: SettingsData['setSelectedSnapshotId'];
  setSessionLearnedRules: React.Dispatch<React.SetStateAction<PromptValidationRule[]>>;
  setSessionLearnedTemplates: React.Dispatch<
    React.SetStateAction<PromptExploderLearnedTemplate[]>
  >;
  setSaveError: SettingsData['setSaveError'];
  updateSetting: ReturnType<typeof useUpdateSetting>;
  updateSettingsBulk: ReturnType<typeof useUpdateSettingsBulk>;
};

const settingsStateContextResult = createStrictContext<PromptExploderSettingsState>({
  hookName: 'useSettingsState',
  providerName: 'SettingsProvider',
  displayName: 'SettingsStateContext',
  errorFactory: (message) => internalError(message),
});

const settingsActionsContextResult = createStrictContext<PromptExploderSettingsActions>({
  hookName: 'useSettingsActions',
  providerName: 'SettingsProvider',
  displayName: 'SettingsActionsContext',
  errorFactory: (message) => internalError(message),
});

export const SettingsStateContext = settingsStateContextResult.Context;
export const SettingsActionsContext = settingsActionsContextResult.Context;
export const useSettingsState = settingsStateContextResult.useStrictContext;
export const useSettingsActions = settingsActionsContextResult.useStrictContext;
export const useOptionalSettingsState = settingsStateContextResult.useOptionalContext;
export const useOptionalSettingsActions = settingsActionsContextResult.useOptionalContext;

export function SettingsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();
  const updateSettingsBulk = useUpdateSettingsBulk();
  const settingsMap = settingsQuery.data ?? new Map<string, string>();

  const data = useSettingsDataImpl({
    settingsQuery,
    settingsMap,
  });

  const setLearningDraft = useCallback<React.Dispatch<React.SetStateAction<LearningDraft>>>(
    (updater) => {
      data.setHasUnsavedLearningDraft(true);
      data.setLearningDraftState(updater);
    },
    [data]
  );

  const setParserTuningDrafts = useCallback<
    React.Dispatch<React.SetStateAction<PromptExploderParserTuningRuleDraft[]>>
  >(
    (updater) => {
      data.setHasUnsavedParserTuningDrafts(true);
      data.setParserTuningDraftsState(updater);
    },
    [data]
  );

  const actionsImpl = useSettingsActionsImpl({
    settingsMap,
    updateSetting,
    promptSettings: data.promptSettings,
    promptExploderSettings: data.promptExploderSettings,
    activeValidationScope: data.activeValidationScope,
    learningDraft: data.learningDraft,
    setHasUnsavedLearningDraft: data.setHasUnsavedLearningDraft,
    parserTuningDrafts: data.parserTuningDrafts,
    setParserTuningDrafts,
    setParserTuningDraftsState: data.setParserTuningDraftsState,
    setHasUnsavedParserTuningDrafts: data.setHasUnsavedParserTuningDrafts,
    effectiveRules: data.effectiveRules,
    scopedRules: data.scopedRules,
    snapshotDraftName: data.snapshotDraftName,
    setSnapshotDraftName: data.setSnapshotDraftName,
    selectedSnapshot: data.selectedSnapshot,
    setSelectedSnapshotId: data.setSelectedSnapshotId,
    setSessionLearnedTemplates: data.setSessionLearnedTemplates,
    settingsQuery,
    setSaveError: data.setSaveError,
  });

  const segmentationLibrary = useMemo(
    (): PromptExploderSegmentationLibraryState =>
      parsePromptExploderSegmentationLibrary(
        settingsMap.get(PROMPT_EXPLODER_SEGMENTATION_LIBRARY_KEY) ?? null
      ),
    [settingsMap]
  );

  const stateValue = useMemo<PromptExploderSettingsState>(
    () => ({
      ...data,
      segmentationLibrary,
    }),
    [data, segmentationLibrary]
  );

  const actionsValue = useMemo<PromptExploderSettingsActions>(
    () => ({
      ...actionsImpl,
      setLearningDraft,
      setParserTuningDrafts,
      setIsParserTuningOpen: data.setIsParserTuningOpen,
      setSnapshotDraftName: data.setSnapshotDraftName,
      setSelectedSnapshotId: data.setSelectedSnapshotId,
      setSessionLearnedRules: data.setSessionLearnedRules,
      setSessionLearnedTemplates: data.setSessionLearnedTemplates,
      setSaveError: data.setSaveError,
      updateSetting,
      updateSettingsBulk,
    }),
    [actionsImpl, data, setLearningDraft, setParserTuningDrafts, updateSetting, updateSettingsBulk]
  );

  return (
    <SettingsStateContext.Provider value={stateValue}>
      <SettingsActionsContext.Provider value={actionsValue}>
        {children}
      </SettingsActionsContext.Provider>
    </SettingsStateContext.Provider>
  );
}
