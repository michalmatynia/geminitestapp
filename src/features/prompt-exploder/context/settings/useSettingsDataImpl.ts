'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useToast } from '@/shared/ui';
import type { useSettingsMap } from '@/shared/hooks/use-settings';
import {
  parsePromptEngineSettings,
  parsePromptValidationRules,
} from '@/shared/lib/prompt-engine/settings';
import { PROMPT_ENGINE_SETTINGS_KEY, PromptValidationRule } from '@/shared/contracts/prompt-engine';
import { PROMPT_EXPLODER_SETTINGS_KEY } from '@/shared/contracts/prompt-exploder';
import { parsePromptExploderSettingsResult } from '../../settings';
import {
  VALIDATOR_PATTERN_LISTS_KEY,
  parseValidatorPatternLists,
} from '@/shared/contracts/validator';
import {
  DEFAULT_PROMPT_EXPLODER_VALIDATION_RULE_STACK,
  normalizePromptExploderValidationRuleStack,
  promptExploderValidationStackFromBridgeSource,
} from '../../validation-stack';
import { readPromptExploderDraftPayload, PROMPT_EXPLODER_DRAFT_PROMPT_KEY } from '../../bridge';
import {
  resolvePromptValidationRuntime,
  type PromptValidationOrchestrationResult,
} from '../../prompt-validation-orchestrator';
import {
  PromptExploderParserTuningRuleDraft,
  PromptExploderLearnedTemplate,
  PromptExploderPatternSnapshot,
  PromptExploderRuntimeValidationScope,
} from '@/shared/contracts/prompt-exploder';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { LearningDraft } from './SettingsDraftsContext';
import { buildPromptExploderParserTuningDrafts } from '../../parser-tuning';

type UseSettingsDataImplArgs = {
  settingsQuery: ReturnType<typeof useSettingsMap>;
  settingsMap: Map<string, string>;
};

export function useSettingsDataImpl(args: UseSettingsDataImplArgs) {
  const { settingsQuery, settingsMap } = args;
  const { toast } = useToast();

  const [learningDraft, setLearningDraftState] = useState<LearningDraft>({
    runtimeRuleProfile: 'all',
    runtimeValidationRuleStack: DEFAULT_PROMPT_EXPLODER_VALIDATION_RULE_STACK,
    enabled: true,
    autoActivate: false,
    similarityThreshold: 0.68,
    templateMergeThreshold: 0.63,
    benchmarkSuggestionUpsertTemplates: true,
    minApprovals: 1,
    minApprovalsForMatching: 1,
    maxTemplates: 1000,
    autoActivateLearnedTemplates: true,
  });
  const [parserTuningDrafts, setParserTuningDraftsState] = useState<
    PromptExploderParserTuningRuleDraft[]
  >([]);
  const [isParserTuningOpen, setIsParserTuningOpen] = useState(false);
  const [snapshotDraftName, setSnapshotDraftName] = useState('');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sessionLearnedRules, setSessionLearnedRules] = useState<PromptValidationRule[]>([]);
  const [sessionLearnedTemplates, setSessionLearnedTemplates] = useState<
    PromptExploderLearnedTemplate[]
  >([]);
  const [hasUnsavedLearningDraft, setHasUnsavedLearningDraft] = useState(false);
  const [hasUnsavedParserTuningDrafts, setHasUnsavedParserTuningDrafts] = useState(false);
  const [incomingBridgeSource, setIncomingBridgeSource] = useState<string | null>(null);
  const [learningDraftHydratedFrom, setLearningDraftHydratedFrom] = useState<string | null>(null);
  const settingsParseErrorRef = useRef<string | null>(null);

  const rawPromptSettings = settingsMap.get(PROMPT_ENGINE_SETTINGS_KEY) ?? null;
  const rawExploderSettings = settingsMap.get(PROMPT_EXPLODER_SETTINGS_KEY) ?? null;
  const rawValidatorPatternLists = settingsMap.get(VALIDATOR_PATTERN_LISTS_KEY) ?? null;
  const hasPersistedPromptExploderSettingsPayload = Boolean(rawExploderSettings?.trim());

  const promptSettings = useMemo(
    () => parsePromptEngineSettings(rawPromptSettings),
    [rawPromptSettings]
  );
  const promptExploderSettingsResult = useMemo(
    () => parsePromptExploderSettingsResult(rawExploderSettings),
    [rawExploderSettings]
  );
  const promptExploderSettings = promptExploderSettingsResult.settings;
  const promptExploderSettingsValidationError = hasPersistedPromptExploderSettingsPayload
    ? promptExploderSettingsResult.error
    : null;
  const validatorPatternLists = useMemo(
    () => parseValidatorPatternLists(rawValidatorPatternLists),
    [rawValidatorPatternLists]
  );

  const shouldPreferCaseResolverValidationStack = incomingBridgeSource === 'case-resolver';
  const preferredValidatorScope = shouldPreferCaseResolverValidationStack
    ? 'case-resolver-prompt-exploder'
    : 'prompt-exploder';

  useEffect(() => {
    const error = promptExploderSettingsResult.error;
    const raw = rawExploderSettings?.trim() ?? '';
    if (!error || !raw) return;
    const signature = `${raw}::${error.code}::${error.message}`;
    if (settingsParseErrorRef.current === signature) return;
    settingsParseErrorRef.current = signature;
    logClientError(new Error(error.message), {
      context: {
        source: 'PromptExploderSettingsContext',
        action: 'parsePromptExploderSettings',
        settingKey: PROMPT_EXPLODER_SETTINGS_KEY,
      },
    });
    toast(error.message, { variant: 'error' });
  }, [promptExploderSettingsResult.error, rawExploderSettings, toast]);

  const validatorPatternListsHydrationSignature = useMemo(
    () =>
      validatorPatternLists.map((list) => `${list.id}:${list.scope}:${list.updatedAt}`).join('|'),
    [validatorPatternLists]
  );

  useEffect(() => {
    const payload = readPromptExploderDraftPayload();
    if (payload?.target === 'prompt-exploder') {
      setIncomingBridgeSource(payload.source);
      return;
    }
    setIncomingBridgeSource(null);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent): void => {
      if (event.key !== PROMPT_EXPLODER_DRAFT_PROMPT_KEY) return;
      const payload = readPromptExploderDraftPayload();
      if (payload?.target === 'prompt-exploder') {
        setIncomingBridgeSource(payload.source);
        return;
      }
      setIncomingBridgeSource(null);
    };
    window.addEventListener('storage', handleStorage);
    return (): void => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (settingsQuery.isLoading) return;
    if (promptExploderSettingsValidationError) return;

    const hydrationSignature = [
      rawExploderSettings ?? '__missing__',
      shouldPreferCaseResolverValidationStack ? 'case-resolver' : 'prompt-exploder',
      validatorPatternListsHydrationSignature || '__no-lists__',
    ].join('::');
    if (learningDraftHydratedFrom === hydrationSignature) return;

    const persistedStack = normalizePromptExploderValidationRuleStack(
      promptExploderSettings.runtime.validationRuleStack,
      validatorPatternLists
    );
    const preferredStack = shouldPreferCaseResolverValidationStack
      ? promptExploderValidationStackFromBridgeSource('case-resolver', validatorPatternLists)
      : persistedStack;

    setLearningDraftState({
      runtimeRuleProfile: promptExploderSettings.runtime.ruleProfile,
      runtimeValidationRuleStack: preferredStack,
      enabled: promptExploderSettings.learning.enabled,
      autoActivate: promptExploderSettings.learning.autoActivate,
      similarityThreshold: promptExploderSettings.learning.similarityThreshold,
      templateMergeThreshold: promptExploderSettings.learning.templateMergeThreshold,
      benchmarkSuggestionUpsertTemplates:
        promptExploderSettings.learning.benchmarkSuggestionUpsertTemplates ?? true,
      minApprovals: promptExploderSettings.learning.minApprovals,
      minApprovalsForMatching: promptExploderSettings.learning.minApprovalsForMatching,
      maxTemplates: promptExploderSettings.learning.maxTemplates,
      autoActivateLearnedTemplates: promptExploderSettings.learning.autoActivateLearnedTemplates,
    });
    setHasUnsavedLearningDraft(false);
    setLearningDraftHydratedFrom(hydrationSignature);
  }, [
    learningDraftHydratedFrom,
    promptExploderSettings,
    rawExploderSettings,
    settingsQuery.isLoading,
    promptExploderSettingsValidationError,
    shouldPreferCaseResolverValidationStack,
    validatorPatternLists,
    validatorPatternListsHydrationSignature,
  ]);

  const runtimeResolution = useMemo((): {
    selection: PromptValidationOrchestrationResult;
    warning: Error | null;
  } => {
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
    });
    return {
      selection,
      warning: null,
    };
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
    validatorPatternLists,
  ]);

  const runtimeSelection = runtimeResolution.selection;
  const runtimeGuardrailIssue: string | null = null;

  const isBusy = settingsQuery.isLoading || settingsQuery.isRefetching;

  const activeValidationScope: PromptExploderRuntimeValidationScope =
    preferredValidatorScope === 'case-resolver-prompt-exploder'
      ? 'case_resolver_prompt_exploder'
      : 'prompt_exploder';
  const activeValidationRuleStack = runtimeSelection.validationRuleStack;

  const scopedRules = useMemo(() => runtimeSelection.scopedRules, [runtimeSelection.scopedRules]);
  const effectiveRules = useMemo(
    () => runtimeSelection.effectiveRules,
    [runtimeSelection.effectiveRules]
  );
  const runtimeValidationRules = useMemo(
    () => runtimeSelection.runtimeValidationRules,
    [runtimeSelection.runtimeValidationRules]
  );
  const effectiveLearnedTemplates = useMemo(
    () => runtimeSelection.effectiveLearnedTemplates,
    [runtimeSelection.effectiveLearnedTemplates]
  );
  const runtimeLearnedTemplates = useMemo(
    () => runtimeSelection.runtimeLearnedTemplates,
    [runtimeSelection.runtimeLearnedTemplates]
  );

  const availableSnapshots = useMemo((): PromptExploderPatternSnapshot[] => {
    return (promptExploderSettings.patternSnapshots ?? []).map((snapshot) => {
      let rules: PromptValidationRule[] = [];
      if (snapshot.rulesJson?.trim()) {
        const parsedRules = parsePromptValidationRules(snapshot.rulesJson);
        if (parsedRules.ok) {
          rules = parsedRules.rules;
        } else {
          logClientError(new Error(parsedRules.error), {
            context: {
              source: 'PromptExploderSettingsContext',
              action: 'parseSnapshotRules',
              snapshotId: snapshot.id,
            },
          });
        }
      }
      return {
        ...snapshot,
        rules,
      };
    });
  }, [promptExploderSettings.patternSnapshots]);

  const selectedSnapshot = useMemo(
    () => availableSnapshots.find((s) => s.id === selectedSnapshotId) ?? null,
    [availableSnapshots, selectedSnapshotId]
  );

  useEffect(() => {
    if (settingsQuery.isLoading) return;
    if (promptExploderSettingsValidationError) return;
    setSessionLearnedRules(promptSettings.promptValidation.learnedRules ?? []);
    setSessionLearnedTemplates(promptExploderSettings.learning.templates);
  }, [
    settingsQuery.isLoading,
    promptSettings.promptValidation.learnedRules,
    promptExploderSettings.learning.templates,
    promptExploderSettingsValidationError,
  ]);

  useEffect(() => {
    const drafts = buildPromptExploderParserTuningDrafts({
      scopedRules,
      patternPackRules: effectiveRules,
      scope: activeValidationScope,
    });
    setParserTuningDraftsState(drafts);
    setHasUnsavedParserTuningDrafts(false);
  }, [activeValidationScope, effectiveRules, scopedRules]);

  return {
    learningDraft,
    setLearningDraftState,
    parserTuningDrafts,
    setParserTuningDraftsState,
    isParserTuningOpen,
    setIsParserTuningOpen,
    snapshotDraftName,
    setSnapshotDraftName,
    selectedSnapshotId,
    setSelectedSnapshotId,
    sessionLearnedRules,
    setSessionLearnedRules,
    sessionLearnedTemplates,
    setSessionLearnedTemplates,
    hasUnsavedLearningDraft,
    setHasUnsavedLearningDraft,
    hasUnsavedParserTuningDrafts,
    setHasUnsavedParserTuningDrafts,
    incomingBridgeSource,
    promptSettings,
    promptExploderSettings,
    promptExploderSettingsValidationError,
    validatorPatternLists,
    activeValidationScope,
    activeValidationRuleStack,
    scopedRules,
    effectiveRules,
    runtimeValidationRules,
    effectiveLearnedTemplates,
    runtimeLearnedTemplates,
    runtimeGuardrailIssue,
    availableSnapshots,
    selectedSnapshot,
    runtimeResolution,
    runtimeSelection,
    isBusy,
    settingsMap,
    templateMergeThreshold: learningDraft.templateMergeThreshold,
    saveError,
    setSaveError,
  };
}
