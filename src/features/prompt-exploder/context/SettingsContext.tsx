'use client';

 
 
 
 

import { useSearchParams } from 'next/navigation';
import React, { createContext, useCallback, useEffect, useMemo, useState, useContext } from 'react';

import {
  parseValidatorPatternLists,
  VALIDATOR_PATTERN_LISTS_KEY,
} from '@/features/admin/pages/validator-scope';
import type { ValidatorPatternList } from '@/features/admin/pages/validator-scope';
import {
  parsePromptEngineSettings,
  parsePromptValidationRules,
  PROMPT_ENGINE_SETTINGS_KEY,
} from '@/features/prompt-engine/settings';
import type { PromptValidationRule, PromptEngineSettings } from '@/features/prompt-engine/settings';
import {
  useSettingsMap,
  useUpdateSetting,
  useUpdateSettingsBulk,
} from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  PROMPT_EXPLODER_DRAFT_PROMPT_KEY,
  readPromptExploderDraftPayload,
} from '../bridge';
import { isPromptValidationStrictStackMode } from '../feature-flags';
import {
  applyPromptExploderParserTuningDrafts,
  buildPromptExploderParserTuningDrafts,
  validatePromptExploderParserTuningDrafts,
} from '../parser-tuning';
import type { PromptExploderParserTuningRuleDraft } from '../parser-tuning';
import {
  ensurePromptExploderPatternPack,
} from '../pattern-pack';
import {
  buildPatternSnapshot,
  mergeRestoredPromptExploderRules,
  prependPatternSnapshot,
  removePatternSnapshotById,
} from '../pattern-snapshots';
import type { PromptExploderPatternSnapshot } from '../pattern-snapshots';
import {
  resolvePromptValidationRuntime,
  type PromptValidationOrchestrationResult,
} from '../prompt-validation-orchestrator';
import { getPromptExploderRuntimeGuardrailIssue } from '../runtime-guardrails';
import { parsePromptExploderSettings, PROMPT_EXPLODER_SETTINGS_KEY } from '../settings';
import type { PromptExploderLearnedTemplate, PromptExploderSettings } from '../types';
import {
  DEFAULT_PROMPT_EXPLODER_VALIDATION_RULE_STACK,
  type PromptExploderRuntimeValidationScope,
} from '../validation-stack';

import { SettingsCoreContext, type SettingsCoreState } from './settings/SettingsCoreContext';
import { SettingsRuntimeContext, type SettingsRuntimeState } from './settings/SettingsRuntimeContext';
import { SettingsDraftsContext, type SettingsDraftsState, type LearningDraft } from './settings/SettingsDraftsContext';
import { SettingsSnapshotsContext, type SettingsSnapshotsState } from './settings/SettingsSnapshotsContext';
import { SettingsActionsContext, type SettingsActions } from './settings/SettingsActionsContext';

export type { LearningDraft, SettingsActions };

export interface SettingsState extends SettingsCoreState, SettingsRuntimeState, SettingsDraftsState, SettingsSnapshotsState {}

export const SettingsStateContext = createContext<SettingsState | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const settingsQuery = useSettingsMap({ scope: 'all' });
  const updateSetting = useUpdateSetting();
  const updateSettingsBulk = useUpdateSettingsBulk();
  
  const settingsMap = (settingsQuery.data as unknown as Map<string, string>) ?? new Map<string, string>();
  const returnTo = searchParams?.get('returnTo') || '/admin/image-studio';
  const isCaseResolverReturnTarget = returnTo.startsWith('/admin/case-resolver');

  const [learningDraft, setLearningDraftState] = useState<LearningDraft>({
    runtimeRuleProfile: 'all',
    runtimeValidationRuleStack: DEFAULT_PROMPT_EXPLODER_VALIDATION_RULE_STACK,
    enabled: true,
    similarityThreshold: 0.68,
    templateMergeThreshold: 0.63,
    benchmarkSuggestionUpsertTemplates: true,
    minApprovalsForMatching: 1,
    maxTemplates: 1000,
    autoActivateLearnedTemplates: true,
  });
  const [parserTuningDrafts, setParserTuningDraftsState] = useState<PromptExploderParserTuningRuleDraft[]>([]);
  const [isParserTuningOpen, setIsParserTuningOpen] = useState(false);
  const [snapshotDraftName, setSnapshotDraftName] = useState('');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState('');
  const [sessionLearnedRules, setSessionLearnedRules] = useState<PromptValidationRule[]>([]);
  const [sessionLearnedTemplates, setSessionLearnedTemplates] = useState<PromptExploderLearnedTemplate[]>([]);
  const [hasUnsavedLearningDraft, setHasUnsavedLearningDraft] = useState(false);
  const [hasUnsavedParserTuningDrafts, setHasUnsavedParserTuningDrafts] = useState(false);
  const [incomingBridgeSource, setIncomingBridgeSource] =
    useState<string | null>(null);

  const setLearningDraft = useCallback(
    (value: React.SetStateAction<LearningDraft>) => {
      setHasUnsavedLearningDraft(true);
      setLearningDraftState(value);
    },
    []
  );

  const setParserTuningDrafts = useCallback((value: React.SetStateAction<PromptExploderParserTuningRuleDraft[]>) => {
    setHasUnsavedParserTuningDrafts(true);
    setParserTuningDraftsState(value);
  }, []);

  const rawPromptSettings = settingsMap.get(PROMPT_ENGINE_SETTINGS_KEY) ?? null;
  const rawExploderSettings = settingsMap.get(PROMPT_EXPLODER_SETTINGS_KEY) ?? null;
  const rawValidatorPatternLists = settingsMap.get(VALIDATOR_PATTERN_LISTS_KEY) ?? null;

  const promptSettings = useMemo(
    () => parsePromptEngineSettings(rawPromptSettings),
    [rawPromptSettings]
  ) as unknown as PromptEngineSettings;
  const promptExploderSettings = useMemo(
    () => parsePromptExploderSettings(rawExploderSettings),
    [rawExploderSettings]
  ) as unknown as PromptExploderSettings;
  const validatorPatternLists = useMemo(
    () => parseValidatorPatternLists(rawValidatorPatternLists),
    [rawValidatorPatternLists]
  ) as unknown as ValidatorPatternList[];

  const strictStackMode = useMemo(
    () => isPromptValidationStrictStackMode(),
    []
  );
  const shouldPreferCaseResolverValidationStack =
    incomingBridgeSource === 'case-resolver' || isCaseResolverReturnTarget;
  const preferredValidatorScope =
    shouldPreferCaseResolverValidationStack
      ? 'case-resolver-prompt-exploder'
      : 'prompt-exploder';

  useEffect(() => {
    const payload = readPromptExploderDraftPayload();
    if (payload && (!payload.target || payload.target === 'prompt-exploder')) {
      setIncomingBridgeSource(payload.source);
      return;
    }
    if (isCaseResolverReturnTarget) {
      setIncomingBridgeSource('case-resolver');
      return;
    }
    setIncomingBridgeSource(null);
  }, [isCaseResolverReturnTarget]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent): void => {
      if (event.key !== PROMPT_EXPLODER_DRAFT_PROMPT_KEY) return;
      const payload = readPromptExploderDraftPayload();
      if (payload && (!payload.target || payload.target === 'prompt-exploder')) {
        setIncomingBridgeSource(payload.source);
        return;
      }
      if (isCaseResolverReturnTarget) {
        setIncomingBridgeSource('case-resolver');
        return;
      }
      setIncomingBridgeSource(null);
    };
    window.addEventListener('storage', handleStorage);
    return (): void => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [isCaseResolverReturnTarget]);

  const runtimeResolution = useMemo((): { 
    selection: PromptValidationOrchestrationResult; 
    warning: Error | null; 
    guardrailIssue: string | null 
  } => {
    const allowValidationStackFallback =
      promptExploderSettings.runtime.allowValidationStackFallback;
    try {
      const selection = resolvePromptValidationRuntime({
        promptSettings,
        promptExploderSettings,
        validatorPatternLists,
        runtimeRuleProfile: learningDraft.runtimeRuleProfile,
        runtimeValidationRuleStack: learningDraft.runtimeValidationRuleStack,
        learningEnabled: learningDraft.enabled,
        minApprovalsForMatching: learningDraft.minApprovalsForMatching,
        maxTemplates: learningDraft.maxTemplates,
        sessionLearnedRules,
        sessionLearnedTemplates,
        preferredValidatorScope,
        strictUnknownStack: strictStackMode,
      });
      return {
        selection,
        warning: null,
        guardrailIssue: getPromptExploderRuntimeGuardrailIssue({
          runtimeSelection: selection,
          allowValidationStackFallback: allowValidationStackFallback ?? false,
        }),
      };
    } catch (error) {
      const selection = resolvePromptValidationRuntime({
        promptSettings,
        promptExploderSettings,
        validatorPatternLists,
        runtimeRuleProfile: learningDraft.runtimeRuleProfile,
        runtimeValidationRuleStack: learningDraft.runtimeValidationRuleStack,
        learningEnabled: learningDraft.enabled,
        minApprovalsForMatching: learningDraft.minApprovalsForMatching,
        maxTemplates: learningDraft.maxTemplates,
        sessionLearnedRules,
        sessionLearnedTemplates,
        preferredValidatorScope,
        strictUnknownStack: false,
      });
      const warning = error instanceof Error ? error : new Error(String(error));
      return {
        selection,
        warning,
        guardrailIssue:
          getPromptExploderRuntimeGuardrailIssue({
            runtimeSelection: selection,
            allowValidationStackFallback: allowValidationStackFallback ?? false,
          }) ?? warning.message,
      };
    }
  }, [
    learningDraft.enabled,
    learningDraft.maxTemplates,
    learningDraft.minApprovalsForMatching,
    learningDraft.runtimeRuleProfile,
    learningDraft.runtimeValidationRuleStack,
    promptExploderSettings,
    promptSettings,
    preferredValidatorScope,
    sessionLearnedRules,
    sessionLearnedTemplates,
    strictStackMode,
    validatorPatternLists,
  ]);

  useEffect(() => {
    if (!runtimeResolution.warning && !runtimeResolution.guardrailIssue) return;
    const warning = runtimeResolution.warning;
    if (warning) {
      logClientError(warning, {
        context: {
          source: 'PromptExploderSettingsContext',
          action: 'resolvePromptValidationRuntime',
        },
      });
    }
  }, [runtimeResolution.warning, runtimeResolution.guardrailIssue]);

  const runtimeSelection = runtimeResolution.selection as unknown as PromptValidationOrchestrationResult;
  const runtimeGuardrailIssue = runtimeResolution.guardrailIssue;

  const activeValidationScope: PromptExploderRuntimeValidationScope =
    preferredValidatorScope === 'case-resolver-prompt-exploder'
      ? 'case_resolver_prompt_exploder'
      : 'prompt_exploder';
  const activeValidationRuleStack = runtimeSelection.validationRuleStack;

  const scopedRules = useMemo(
    () => (runtimeSelection.scopedRules as unknown as PromptValidationRule[]),
    [runtimeSelection.scopedRules]
  );

  const effectiveRules = useMemo(
    () => (runtimeSelection.effectiveRules as unknown as PromptValidationRule[]),
    [runtimeSelection.effectiveRules]
  );

  const runtimeValidationRules = useMemo(
    () => (runtimeSelection.runtimeValidationRules as unknown as PromptValidationRule[]),
    [runtimeSelection.runtimeValidationRules]
  );

  const effectiveLearnedTemplates = useMemo(
    () => (runtimeSelection.effectiveLearnedTemplates as unknown as PromptExploderLearnedTemplate[]),
    [runtimeSelection.effectiveLearnedTemplates]
  );

  const runtimeLearnedTemplates = useMemo(
    () => (runtimeSelection.runtimeLearnedTemplates as unknown as PromptExploderLearnedTemplate[]),
    [runtimeSelection.runtimeLearnedTemplates]
  );

  const templateMergeThreshold = learningDraft.templateMergeThreshold;

  const availableSnapshots = useMemo((): PromptExploderPatternSnapshot[] => {
    return (promptExploderSettings.patternSnapshots ?? []).map((snapshot) => {
      let rules: PromptValidationRule[] = [];
      try {
        if (snapshot.rulesJson) {
          rules = JSON.parse(snapshot.rulesJson) as PromptValidationRule[];
        }
      } catch (e) {
        logClientError(e, { context: { source: 'PromptExploderSettingsContext', action: 'parseSnapshotRules', snapshotId: snapshot.id } });
      }
      return {
        ...snapshot,
        rules,
      } as PromptExploderPatternSnapshot;
    });
  }, [promptExploderSettings.patternSnapshots]);

  const selectedSnapshot = useMemo(
    () => (availableSnapshots as unknown as PromptExploderPatternSnapshot[]).find((s) => s.id === selectedSnapshotId) ?? null,
    [availableSnapshots, selectedSnapshotId]
  ) as unknown as PromptExploderPatternSnapshot | null;

  useEffect(() => {
    if (settingsQuery.isLoading) return;
    const rulesJson = settingsMap.get(PROMPT_ENGINE_SETTINGS_KEY + '_rules');
    const rules = parsePromptValidationRules(rulesJson ?? '');
    if ('ok' in rules && rules.ok) {
      setSessionLearnedRules(rules.rules);
    }
    setSessionLearnedTemplates(promptExploderSettings.learning.templates);
  }, [settingsQuery.isLoading, settingsMap, promptExploderSettings.learning.templates]);

  useEffect(() => {
    const drafts = buildPromptExploderParserTuningDrafts({
      scopedRules,
      patternPackRules: effectiveRules,
      scope: activeValidationScope,
    });
    setParserTuningDraftsState(drafts);
    setHasUnsavedParserTuningDrafts(false);
  }, [activeValidationScope, effectiveRules, scopedRules]);

  const persistSettingIfChanged = useCallback(
    async (input: { key: string; value: string }): Promise<boolean> => {
      if (settingsMap.get(input.key) === input.value) {
        return false;
      }
      await updateSetting.mutateAsync(input);
      return true;
    },
    [settingsMap, updateSetting]
  );

  const patchParserTuningDraft = useCallback(
    (ruleId: string, patch: Partial<PromptExploderParserTuningRuleDraft>) => {
      setParserTuningDrafts((previous) =>
        previous.map((draft) => (draft.id === ruleId ? { ...draft, ...patch } : draft))
      );
    },
    [setParserTuningDrafts]
  );

  const handleInstallPatternPack = useCallback(async () => {
    try {
      const result = ensurePromptExploderPatternPack(promptSettings, {
        scope: activeValidationScope,
      });
      if (result.addedRuleIds.length === 0 && result.updatedRuleIds.length === 0) {
        toast('Prompt Exploder pattern pack is already installed.', { variant: 'info' });
        return;
      }
      await updateSetting.mutateAsync({
        key: PROMPT_ENGINE_SETTINGS_KEY,
        value: serializeSetting(result.nextSettings),
      });
      toast(`Installed pattern pack (${result.addedRuleIds.length} added, ${result.updatedRuleIds.length} updated).`, { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'PromptExploderSettingsContext', action: 'handleInstallPatternPack' } });
      toast('Failed to install pattern pack.', { variant: 'error' });
    }
  }, [activeValidationScope, promptSettings, toast, updateSetting]);

  const handleSaveLearningSettings = useCallback(async () => {
    try {
      const nextSettings = {
        ...promptExploderSettings,
        learning: {
          ...promptExploderSettings.learning,
          enabled: learningDraft.enabled,
          similarityThreshold: learningDraft.similarityThreshold,
          templateMergeThreshold: learningDraft.templateMergeThreshold,
          benchmarkSuggestionUpsertTemplates: learningDraft.benchmarkSuggestionUpsertTemplates,
          minApprovalsForMatching: learningDraft.minApprovalsForMatching,
          maxTemplates: learningDraft.maxTemplates,
          autoActivateLearnedTemplates: learningDraft.autoActivateLearnedTemplates,
        },
      };
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      setHasUnsavedLearningDraft(false);
      toast('Learning settings saved.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'PromptExploderSettingsContext', action: 'handleSaveLearningSettings' } });
      toast('Failed to save learning settings.', { variant: 'error' });
    }
  }, [learningDraft, promptExploderSettings, toast, updateSetting]);

  const handleSaveParserTuningRules = useCallback(async () => {
    const validation = validatePromptExploderParserTuningDrafts(parserTuningDrafts);
    if (!validation.ok) {
      toast(validation.error || 'Invalid parser tuning rules.', { variant: 'error' });
      return;
    }
    try {
      const nextSettings = applyPromptExploderParserTuningDrafts({
        settings: promptSettings,
        drafts: parserTuningDrafts,
        patternPackRules: effectiveRules,
        scope: activeValidationScope,
      });
      await updateSetting.mutateAsync({
        key: PROMPT_ENGINE_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      setHasUnsavedParserTuningDrafts(false);
      toast(`Saved ${parserTuningDrafts.length} parser tuning rules.`, { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'PromptExploderSettingsContext', action: 'handleSaveParserTuningRules' } });
      toast('Failed to save parser tuning rules.', { variant: 'error' });
    }
  }, [activeValidationScope, effectiveRules, parserTuningDrafts, promptSettings, toast, updateSetting]);

  const handleResetParserTuningDrafts = useCallback(() => {
    const drafts = buildPromptExploderParserTuningDrafts({
      scopedRules,
      patternPackRules: effectiveRules,
      scope: activeValidationScope,
    });
    setParserTuningDraftsState(drafts);
    setHasUnsavedParserTuningDrafts(false);
    toast('Parser tuning rules reset to current settings.', { variant: 'info' });
  }, [activeValidationScope, effectiveRules, scopedRules, toast]);

  const handleCapturePatternSnapshot = useCallback(async () => {
    if (!snapshotDraftName.trim()) {
      toast('Snapshot name is required.', { variant: 'error' });
      return;
    }
    try {
      const snapshot = buildPatternSnapshot({
        snapshotDraftName: snapshotDraftName.trim(),
        rules: promptSettings.promptValidation.rules,
        now: new Date().toISOString(),
      });
      const nextSnapshots = prependPatternSnapshot(
        promptExploderSettings.patternSnapshots ?? [],
        snapshot
      );
      const nextSettings = {
        ...promptExploderSettings,
        patternSnapshots: nextSnapshots,
      };
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      setSnapshotDraftName('');
      toast(`Captured snapshot "${snapshot.name}".`, { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'PromptExploderSettingsContext', action: 'handleCapturePatternSnapshot' } });
      toast('Failed to capture snapshot.', { variant: 'error' });
    }
  }, [promptExploderSettings, promptSettings.promptValidation.rules, snapshotDraftName, toast, updateSetting]);

  const handleRestorePatternSnapshot = useCallback(async () => {
    if (!selectedSnapshot) return;
    try {
      const nextRules = mergeRestoredPromptExploderRules({
        existingRules: promptSettings.promptValidation.rules,
        restoredRules: selectedSnapshot.rules ?? [],
        isPromptExploderManagedRule: (rule) => Boolean(rule.id), // Should use actual helper
      });
      const nextSettings = {
        ...promptSettings,
        promptValidation: {
          ...promptSettings.promptValidation,
          rules: nextRules,
        },
      };
      await updateSetting.mutateAsync({
        key: PROMPT_ENGINE_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      toast(`Restored rules from snapshot "${selectedSnapshot.name}".`, { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'PromptExploderSettingsContext', action: 'handleRestorePatternSnapshot' } });
      toast('Failed to restore snapshot.', { variant: 'error' });
    }
  }, [promptSettings, selectedSnapshot, toast, updateSetting]);

  const handleDeletePatternSnapshot = useCallback(async () => {
    if (!selectedSnapshot) return;
    try {
      const nextSnapshots = removePatternSnapshotById(
        promptExploderSettings.patternSnapshots ?? [],
        selectedSnapshot.id
      );
      const nextSettings = {
        ...promptExploderSettings,
        patternSnapshots: nextSnapshots,
      };
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      setSelectedSnapshotId('');
      toast(`Deleted snapshot "${selectedSnapshot.name}".`, { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'Failed to delete snapshot.',
        { variant: 'error' }
      );
    }
  }, [promptExploderSettings, selectedSnapshot, toast, updateSetting]);

  const handleTemplateStateChange = useCallback(
    async (templateId: string, nextState: PromptExploderLearnedTemplate['state']) => {
      try {
        const nextTemplates = promptExploderSettings.learning.templates.map((template) =>
          template.id === templateId
            ? { ...template, state: nextState, updatedAt: new Date().toISOString() }
            : template
        );
        const nextSettings: PromptExploderSettings = {
          ...promptExploderSettings,
          learning: { ...promptExploderSettings.learning, templates: nextTemplates },
        };
        const persisted = await persistSettingIfChanged({
          key: PROMPT_EXPLODER_SETTINGS_KEY,
          value: serializeSetting(nextSettings),
        });
        if (!persisted) {
          toast('Template state is already up to date.', { variant: 'info' });
          return;
        }
        setSessionLearnedTemplates((previous) =>
          previous.map((template) =>
            template.id === templateId
              ? { ...template, state: nextState, updatedAt: new Date().toISOString() }
              : template
          )
        );
        toast(`Template state changed to ${nextState}.`, { variant: 'success' });
      } catch (error) {
        toast(
          error instanceof Error ? error.message : 'Failed to update template state.',
          { variant: 'error' }
        );
      }
    },
    [persistSettingIfChanged, promptExploderSettings, toast]
  );

  const handleDeleteTemplate = useCallback(
    async (templateId: string) => {
      try {
        const nextTemplates = promptExploderSettings.learning.templates.filter(
          (template) => template.id !== templateId
        );
        const nextSettings: PromptExploderSettings = {
          ...promptExploderSettings,
          learning: { ...promptExploderSettings.learning, templates: nextTemplates },
        };
        const persisted = await persistSettingIfChanged({
          key: PROMPT_EXPLODER_SETTINGS_KEY,
          value: serializeSetting(nextSettings),
        });
        if (!persisted) {
          toast('Template was already removed.', { variant: 'info' });
          return;
        }
        setSessionLearnedTemplates((previous) =>
          previous.filter((template) => template.id !== templateId)
        );
        toast('Template removed.', { variant: 'success' });
      } catch (error) {
        toast(
          error instanceof Error ? error.message : 'Failed to remove template.',
          { variant: 'error' }
        );
      }
    },
    [persistSettingIfChanged, promptExploderSettings, toast]
  );

  const isBusy = updateSetting.isPending || updateSettingsBulk.isPending;

  const coreValue = useMemo(() => ({
    settingsMap,
    validatorPatternLists,
    promptSettings,
    promptExploderSettings,
    isBusy,
  }), [settingsMap, validatorPatternLists, promptSettings, promptExploderSettings, isBusy]);

  const runtimeValue = useMemo(() => ({
    activeValidationScope,
    activeValidationRuleStack,
    runtimeSelection,
    runtimeGuardrailIssue,
    scopedRules,
    effectiveRules,
    runtimeValidationRules,
    effectiveLearnedTemplates,
    runtimeLearnedTemplates,
    templateMergeThreshold,
  }), [activeValidationScope, activeValidationRuleStack, runtimeSelection, runtimeGuardrailIssue, scopedRules, effectiveRules, runtimeValidationRules, effectiveLearnedTemplates, runtimeLearnedTemplates, templateMergeThreshold]);

  const draftsValue = useMemo(() => ({
    learningDraft,
    parserTuningDrafts,
    isParserTuningOpen,
    hasUnsavedLearningDraft,
    hasUnsavedParserTuningDrafts,
    sessionLearnedRules,
    sessionLearnedTemplates,
  }), [learningDraft, parserTuningDrafts, isParserTuningOpen, hasUnsavedLearningDraft, hasUnsavedParserTuningDrafts, sessionLearnedRules, sessionLearnedTemplates]);

  const snapshotsValue = useMemo(() => ({
    snapshotDraftName,
    selectedSnapshotId,
    availableSnapshots,
    selectedSnapshot,
  }), [snapshotDraftName, selectedSnapshotId, availableSnapshots, selectedSnapshot]);

  const stateValue = useMemo(
    () => ({
      ...coreValue,
      ...runtimeValue,
      ...draftsValue,
      ...snapshotsValue,
    }),
    [coreValue, runtimeValue, draftsValue, snapshotsValue]
  );

  const actionsValue = useMemo(
    () => ({
      setLearningDraft,
      setParserTuningDrafts,
      setIsParserTuningOpen,
      setSnapshotDraftName,
      setSelectedSnapshotId,
      setSessionLearnedRules,
      setSessionLearnedTemplates,
      patchParserTuningDraft,
      handleInstallPatternPack,
      handleSaveLearningSettings,
      handleSaveParserTuningRules,
      handleResetParserTuningDrafts,
      handleCapturePatternSnapshot,
      handleRestorePatternSnapshot,
      handleDeletePatternSnapshot,
      handleTemplateStateChange,
      handleDeleteTemplate,
      updateSetting,
      updateSettingsBulk,
    }),
    [
      setLearningDraft,
      setParserTuningDrafts,
      patchParserTuningDraft,
      handleInstallPatternPack,
      handleSaveLearningSettings,
      handleSaveParserTuningRules,
      handleResetParserTuningDrafts,
      handleCapturePatternSnapshot,
      handleRestorePatternSnapshot,
      handleDeletePatternSnapshot,
      handleTemplateStateChange,
      handleDeleteTemplate,
      updateSetting,
      updateSettingsBulk,
    ]
  );

  return (
    <SettingsCoreContext.Provider value={coreValue}>
      <SettingsRuntimeContext.Provider value={runtimeValue}>
        <SettingsDraftsContext.Provider value={draftsValue}>
          <SettingsSnapshotsContext.Provider value={snapshotsValue}>
            <SettingsStateContext.Provider value={stateValue}>
              <SettingsActionsContext.Provider value={actionsValue}>
                {children}
              </SettingsActionsContext.Provider>
            </SettingsStateContext.Provider>
          </SettingsSnapshotsContext.Provider>
        </SettingsDraftsContext.Provider>
      </SettingsRuntimeContext.Provider>
    </SettingsCoreContext.Provider>
  );
}

export function useSettingsState(): SettingsState {
  const context = useContext(SettingsStateContext);
  if (!context) throw new Error('useSettingsState must be used within SettingsProvider');
  return context;
}

export function useSettingsActions(): SettingsActions {
  const context = useContext(SettingsActionsContext);
  if (!context) throw new Error('useSettingsActions must be used within SettingsProvider');
  return context;
}

export { SettingsCoreContext, SettingsRuntimeContext, SettingsDraftsContext, SettingsSnapshotsContext, SettingsActionsContext };
