'use client';

import React, { createContext, useMemo } from 'react';

import type { PromptEngineSettings, PromptValidationRule } from '@/shared/contracts/prompt-engine';
import type {
  PromptExploderParserTuningRuleDraft,
  PromptExploderRuntimeRuleProfile,
  PromptExploderRuntimeValidationScope,
  PromptExploderSegmentationLibraryState,
  PromptExploderSegmentationReturnTarget,
  PromptExploderValidationRuleStack,
} from '@/shared/contracts/prompt-exploder';
import type { ValidatorPatternList } from '@/shared/contracts/validator';
import { internalError } from '@/shared/errors/app-error';
import {
  useSettingsMap,
  useUpdateSetting,
  useUpdateSettingsBulk,
} from '@/shared/hooks/use-settings';

import {
  parsePromptExploderSegmentationLibrary,
  PROMPT_EXPLODER_SEGMENTATION_LIBRARY_KEY,
  sortPromptExploderSegmentationRecordsByCapturedAt,
} from '../segmentation-library';
import type {
  PromptExploderLearnedTemplate,
  PromptExploderPatternSnapshot,
} from '../types';
import { parsePromptExploderSettings, type PromptExploderSettingsValidationError } from '../settings';
import { useSettingsActionsImpl } from './settings/useSettingsActionsImpl';
import { useSettingsDataImpl } from './settings/useSettingsDataImpl';

import type { PromptValidationOrchestrationResult } from '../prompt-validation-orchestrator';

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

export interface SettingsCoreState {
  promptSettings: PromptEngineSettings;
  promptExploderSettings: ReturnType<typeof parsePromptExploderSettings>;
  promptExploderSettingsValidationError: PromptExploderSettingsValidationError | null;
  validatorPatternLists: ValidatorPatternList[];
  incomingBridgeSource: string | null;
  activeValidationScope: PromptExploderRuntimeValidationScope;
  activeValidationRuleStack: PromptExploderValidationRuleStack;
  segmentationLibrary: PromptExploderSegmentationLibraryState;
  isInitialLoading: boolean;
  isRefreshing: boolean;
}

export interface SettingsRuntimeState {
  activeValidationScope: PromptExploderRuntimeValidationScope;
  activeValidationRuleStack: PromptExploderValidationRuleStack;
  scopedRules: PromptValidationRule[];
  effectiveRules: PromptValidationRule[];
  runtimeValidationRules: PromptValidationRule[];
  effectiveLearnedTemplates: PromptExploderLearnedTemplate[];
  runtimeLearnedTemplates: PromptExploderLearnedTemplate[];
  runtimeGuardrailIssue: string | null;
  returnTarget: PromptExploderSegmentationReturnTarget;
  applyToDrafts: boolean;
}

export interface SettingsDraftsState {
  learningDraft: LearningDraft;
  setLearningDraft: React.Dispatch<React.SetStateAction<LearningDraft>>;
  parserTuningDrafts: PromptExploderParserTuningRuleDraft[];
  setParserTuningDrafts: React.Dispatch<React.SetStateAction<PromptExploderParserTuningRuleDraft[]>>;
  hasUnsavedLearningDraft: boolean;
  hasUnsavedParserTuningDrafts: boolean;
  saveError: string | null;
  setSaveError: React.Dispatch<React.SetStateAction<string | null>>;
  isParserTuningOpen: boolean;
  setIsParserTuningOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sessionLearnedRules: PromptValidationRule[];
  sessionLearnedTemplates: PromptExploderLearnedTemplate[];
}

export interface SettingsSnapshotsState {
  snapshotDraftName: string;
  selectedSnapshotId: string;
  availableSnapshots: PromptExploderPatternSnapshot[];
  selectedSnapshot: PromptExploderPatternSnapshot | null;
}

export const SettingsActionsContext = createContext<PromptExploderSettingsActions | null>(null);
const SettingsCoreContext = createContext<SettingsCoreState | null>(null);
const SettingsDraftsContext = createContext<SettingsDraftsState | null>(null);
const SettingsRuntimeContext = createContext<SettingsRuntimeState | null>(null);
const SettingsSnapshotsContext = createContext<SettingsSnapshotsState | null>(null);

export const useSettingsState = (): PromptExploderSettingsState => {
  const ctx = React.useContext(SettingsStateContext);
  if (!ctx) throw internalError('useSettingsState must be used within SettingsProvider');
  return ctx;
};

export const useSettingsActions = (): PromptExploderSettingsActions => {
  const ctx = React.useContext(SettingsActionsContext);
  if (!ctx) throw internalError('useSettingsActions must be used within SettingsProvider');
  return ctx;
};

export interface PromptExploderSettingsState
  extends SettingsCoreState, SettingsRuntimeState, SettingsDraftsState, SettingsSnapshotsState {
  isBusy: boolean;
  templateMergeThreshold: number;
  settingsMap: Map<string, string>;
  runtimeSelection: PromptValidationOrchestrationResult;
  applyToDrafts: boolean;
  setApplyToDrafts: (value: boolean) => void;
}

export const SettingsStateContext = createContext<PromptExploderSettingsState | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const settingsQuery = useSettingsMap({ scope: 'all' });
  const updateSetting = useUpdateSetting();
  const updateSettingsBulk = useUpdateSettingsBulk();
  const settingsMap = settingsQuery.data ?? new Map<string, string>();

  const data = useSettingsDataImpl({
    settingsQuery,
    settingsMap,
  });

  const rawSegmentationLibrary = settingsMap.get(PROMPT_EXPLODER_SEGMENTATION_LIBRARY_KEY) ?? null;
  const parsedSegmentationLibraryState = useMemo(
    () => parsePromptExploderSegmentationLibrary(rawSegmentationLibrary),
    [rawSegmentationLibrary]
  );
  const segmentationLibraryState = useMemo<PromptExploderSegmentationLibraryState>(() => {
    const records = sortPromptExploderSegmentationRecordsByCapturedAt(
      parsedSegmentationLibraryState.records
    );
    return {
      records,
      lastCapturedAt: records[0]?.capturedAt ?? null,
      totalCaptured: parsedSegmentationLibraryState.records.length,
      version: parsedSegmentationLibraryState.version ?? 1,
    };
  }, [parsedSegmentationLibraryState.records, parsedSegmentationLibraryState.version]);

  const returnTarget =
    data.incomingBridgeSource === 'case-resolver' ? 'case-resolver' : 'image-studio';

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
      setLearningDraft: (update) => {
        if (typeof update === 'function') {
          data.setLearningDraftState(update);
        } else {
          data.setLearningDraftState((prev) => ({ ...prev, ...update }));
        }
      },
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

  const actionsValue = useMemo<PromptExploderSettingsActions>(
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

  const aggregatedValue = useMemo<PromptExploderSettingsState>(
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
