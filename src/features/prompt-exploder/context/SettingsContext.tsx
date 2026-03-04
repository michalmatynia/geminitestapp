'use client';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import React, { createContext, useMemo, useContext } from 'react';

import {
  useSettingsMap,
  useUpdateSetting,
  useUpdateSettingsBulk,
} from '@/shared/hooks/use-settings';

import { SettingsCoreContext, type SettingsCoreState } from './settings/SettingsCoreContext';
import {
  SettingsRuntimeContext,
  type SettingsRuntimeState,
} from './settings/SettingsRuntimeContext';
import {
  SettingsDraftsContext,
  type SettingsDraftsState,
  type LearningDraft,
} from './settings/SettingsDraftsContext';
import {
  SettingsSnapshotsContext,
  type SettingsSnapshotsState,
} from './settings/SettingsSnapshotsContext';
import { SettingsActionsContext, type SettingsActions } from './settings/SettingsActionsContext';

import { useSettingsDataImpl } from './settings/useSettingsDataImpl';
import { useSettingsActionsImpl } from './settings/useSettingsActionsImpl';
import { useLibrary } from './hooks/useLibrary';
import { useDocumentPrompt } from './hooks/useDocument';
import type { PromptValidationOrchestrationResult } from '../prompt-validation-orchestrator';

export type { LearningDraft, SettingsActions };
export { SettingsActionsContext };

export interface SettingsState
  extends SettingsCoreState, SettingsRuntimeState, SettingsDraftsState, SettingsSnapshotsState {
  isBusy: boolean;
  templateMergeThreshold: number;
  settingsMap: Map<string, string>;
  runtimeSelection: PromptValidationOrchestrationResult;
  applyToDrafts: boolean;
  setApplyToDrafts: (value: boolean) => void;
}

export const SettingsStateContext = createContext<SettingsState | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const settingsQuery = useSettingsMap({ scope: 'all' });
  const updateSetting = useUpdateSetting();
  const updateSettingsBulk = useUpdateSettingsBulk();
  const settingsMap = settingsQuery.data ?? new Map<string, string>();

  const data = useSettingsDataImpl({
    settingsQuery,
    settingsMap,
  });

  const { segmentationLibraryState } = useLibrary();
  const { returnTarget } = useDocumentPrompt();

  const actions = useSettingsActionsImpl({
    settingsMap,
    updateSetting,
    promptSettings: data.promptSettings,
    promptExploderSettings: data.promptExploderSettings,
    activeValidationScope: data.activeValidationScope,
    learningDraft: data.learningDraft,
    setHasUnsavedLearningDraft: data.setHasUnsavedLearningDraft,
    parserTuningDrafts: data.parserTuningDrafts,
    setParserTuningDrafts: data.setParserTuningDraftsState,
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

  const [applyToDrafts, setApplyToDrafts] = React.useState(false);

  const coreValue = useMemo<SettingsCoreState>(
    () => ({
      promptSettings: data.promptSettings,
      promptExploderSettings: data.promptExploderSettings,
      promptExploderSettingsValidationError: data.promptExploderSettingsValidationError,
      validatorPatternLists: data.validatorPatternLists,
      incomingBridgeSource: data.incomingBridgeSource,
      activeValidationScope: data.activeValidationScope,
      activeValidationRuleStack: data.activeValidationRuleStack,
      segmentationLibrary: segmentationLibraryState,
      isInitialLoading: settingsQuery.isLoading && data.validatorPatternLists.length === 0,
      isRefreshing: settingsQuery.isRefetching,
    }),
    [data, settingsQuery.isLoading, settingsQuery.isRefetching, segmentationLibraryState]
  );

  const runtimeValue = useMemo<SettingsRuntimeState>(
    () => ({
      activeValidationScope: data.activeValidationScope,
      activeValidationRuleStack: data.activeValidationRuleStack,
      scopedRules: data.scopedRules,
      effectiveRules: data.effectiveRules,
      runtimeValidationRules: data.runtimeValidationRules,
      effectiveLearnedTemplates: data.effectiveLearnedTemplates,
      runtimeLearnedTemplates: data.runtimeLearnedTemplates,
      runtimeGuardrailIssue: data.runtimeGuardrailIssue,
      returnTarget,
      applyToDrafts,
    }),
    [data, returnTarget, applyToDrafts]
  );

  const draftsValue = useMemo<SettingsDraftsState>(
    () => ({
      learningDraft: data.learningDraft,
      setLearningDraft: data.setLearningDraftState,
      hasUnsavedLearningDraft: data.hasUnsavedLearningDraft,
      parserTuningDrafts: data.parserTuningDrafts,
      setParserTuningDrafts: data.setParserTuningDraftsState,
      hasUnsavedParserTuningDrafts: data.hasUnsavedParserTuningDrafts,
      saveError: data.saveError,
      setSaveError: data.setSaveError,
      isParserTuningOpen: data.isParserTuningOpen,
      setIsParserTuningOpen: data.setIsParserTuningOpen,
      sessionLearnedRules: data.sessionLearnedRules,
      sessionLearnedTemplates: data.sessionLearnedTemplates,
    }),
    [data]
  );

  const snapshotsValue = useMemo<SettingsSnapshotsState>(
    () => ({
      availableSnapshots: data.availableSnapshots,
      selectedSnapshotId: data.selectedSnapshotId,
      setSelectedSnapshotId: data.setSelectedSnapshotId,
      selectedSnapshot: data.selectedSnapshot,
      snapshotDraftName: data.snapshotDraftName,
      setSnapshotDraftName: data.setSnapshotDraftName,
    }),
    [data]
  );

  const actionsValue = useMemo<SettingsActions>(
    () => ({
      setLearningDraft: data.setLearningDraftState,
      setParserTuningDrafts: data.setParserTuningDraftsState,
      setIsParserTuningOpen: data.setIsParserTuningOpen,
      setSnapshotDraftName: data.setSnapshotDraftName,
      setSelectedSnapshotId: data.setSelectedSnapshotId,
      setSessionLearnedRules: data.setSessionLearnedRules,
      setSessionLearnedTemplates: data.setSessionLearnedTemplates,
      patchParserTuningDraft: actions.patchParserTuningDraft,
      handleInstallPatternPack: actions.handleInstallPatternPack,
      handleSaveLearningSettings: actions.handleSaveLearningSettings,
      handleSaveParserTuningRules: actions.handleSaveParserTuningRules,
      handleResetParserTuningDrafts: actions.handleResetParserTuningDrafts,
      handleCapturePatternSnapshot: actions.handleCapturePatternSnapshot,
      handleRestorePatternSnapshot: actions.handleRestorePatternSnapshot,
      handleDeletePatternSnapshot: actions.handleDeletePatternSnapshot,
      handleTemplateStateChange: actions.handleTemplateStateChange,
      handleDeleteTemplate: actions.handleDeleteTemplate,
      handleRefresh: actions.handleRefresh,
      updateSetting,
      updateSettingsBulk,
    }),
    [actions, data, updateSetting, updateSettingsBulk]
  );

  const aggregatedValue = useMemo<SettingsState>(
    () => ({
      ...coreValue,
      ...runtimeValue,
      ...draftsValue,
      ...snapshotsValue,
      isBusy: data.isBusy,
      templateMergeThreshold: data.templateMergeThreshold,
      settingsMap: data.settingsMap,
      runtimeSelection: data.runtimeSelection,
      applyToDrafts,
      setApplyToDrafts,
    }),
    [coreValue, runtimeValue, draftsValue, snapshotsValue, data, applyToDrafts]
  );

  return (
    <SettingsCoreContext.Provider value={coreValue}>
      <SettingsRuntimeContext.Provider value={runtimeValue}>
        <SettingsDraftsContext.Provider value={draftsValue}>
          <SettingsSnapshotsContext.Provider value={snapshotsValue}>
            <SettingsActionsContext.Provider value={actionsValue}>
              <SettingsStateContext.Provider value={aggregatedValue}>
                {children}
              </SettingsStateContext.Provider>
            </SettingsActionsContext.Provider>
          </SettingsSnapshotsContext.Provider>
        </SettingsDraftsContext.Provider>
      </SettingsRuntimeContext.Provider>
    </SettingsCoreContext.Provider>
  );
}

export function usePromptExploderSettings(): SettingsState {
  const context = useContext(SettingsStateContext);
  if (!context) {
    throw new Error('usePromptExploderSettings must be used within a SettingsProvider');
  }
  return context;
}
