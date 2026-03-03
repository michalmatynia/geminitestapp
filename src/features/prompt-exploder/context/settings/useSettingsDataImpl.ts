'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
 
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  useSearchParams 
} from 'next/navigation';
import { 
  useToast 
} from '@/shared/ui';
import { 
  parsePromptEngineSettings, 
  parsePromptValidationRules 
} from '@/shared/lib/prompt-engine/settings';
import { 
  PROMPT_ENGINE_SETTINGS_KEY,
  PromptValidationRule
} from '@/shared/contracts/prompt-engine';
import { 
  PROMPT_EXPLODER_SETTINGS_KEY, 
  parsePromptExploderSettingsResult,
} from '../../settings';
import { 
  VALIDATOR_PATTERN_LISTS_KEY, 
  parseValidatorPatternLists 
} from '@/shared/contracts/validator';
import { 
  DEFAULT_PROMPT_EXPLODER_VALIDATION_RULE_STACK,
  normalizePromptExploderValidationRuleStack,
  promptExploderValidationStackFromBridgeSource
} from '../../validation-stack';
import { 
  readPromptExploderDraftPayload,
  PROMPT_EXPLODER_DRAFT_PROMPT_KEY 
} from '../../bridge';
import { isPromptValidationStrictStackMode } from '../../feature-flags';
import { 
  resolvePromptValidationRuntime,
} from '../../prompt-validation-orchestrator';
import { getPromptExploderRuntimeGuardrailIssue } from '../../runtime-guardrails';
import { 
  PromptExploderParserTuningRuleDraft,
  PromptExploderLearnedTemplate,
  PromptExploderPatternSnapshot,
  PromptExploderRuntimeValidationScope
} from '@/shared/contracts/prompt-exploder';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { 
  LearningDraft 
} from './SettingsDraftsContext';
import { buildPromptExploderParserTuningDrafts } from '../../parser-tuning';

export function useSettingsDataImpl(args: {
  settingsQuery: any;
  settingsMap: Map<string, string>;
}) {
  const { settingsQuery, settingsMap } = args;
  const { toast } = useToast();
  const searchParams = useSearchParams();
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
  const [parserTuningDrafts, setParserTuningDraftsState] = useState<
    PromptExploderParserTuningRuleDraft[]
  >([]);
  const [isParserTuningOpen, setIsParserTuningOpen] = useState(false);
  const [snapshotDraftName, setSnapshotDraftName] = useState('');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState('');
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

  const strictStackMode = useMemo(() => isPromptValidationStrictStackMode(), []);
  const shouldPreferCaseResolverValidationStack =
    incomingBridgeSource === 'case-resolver' || isCaseResolverReturnTarget;
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
    logClientError(error, {
      context: {
        source: 'PromptExploderSettingsContext',
        action: 'parsePromptExploderSettings',
        settingKey: PROMPT_EXPLODER_SETTINGS_KEY,
      },
    });
    toast(error.message, { variant: 'error' });
  }, [promptExploderSettingsResult.error, rawExploderSettings, toast]);

  const validatorPatternListsHydrationSignature = useMemo(
    () => validatorPatternLists.map((list) => `${list.id}:${list.scope}:${list.updatedAt}`).join('|'),
    [validatorPatternLists]
  );

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

  useEffect(() => {
    if (settingsQuery.isLoading) return;

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
      similarityThreshold: promptExploderSettings.learning.similarityThreshold,
      templateMergeThreshold: promptExploderSettings.learning.templateMergeThreshold,
      benchmarkSuggestionUpsertTemplates:
        promptExploderSettings.learning.benchmarkSuggestionUpsertTemplates ?? true,
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
    shouldPreferCaseResolverValidationStack,
    validatorPatternLists,
    validatorPatternListsHydrationSignature,
  ]);

  const runtimeResolution = useMemo((): {
    selection: any;
    warning: Error | null;
    guardrailIssue: string | null;
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

  const runtimeSelection = runtimeResolution.selection;
  const runtimeGuardrailIssue = runtimeResolution.guardrailIssue;

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
    return (promptExploderSettings.patternSnapshots ?? []).map((snapshot: any) => {
      let rules: PromptValidationRule[] = [];
      try {
        if (snapshot.rulesJson) {
          rules = JSON.parse(snapshot.rulesJson) as PromptValidationRule[];
        }
      } catch (e) {
        logClientError(e, {
          context: {
            source: 'PromptExploderSettingsContext',
            action: 'parseSnapshotRules',
            snapshotId: snapshot.id,
          },
        });
      }
      return {
        ...snapshot,
        rules,
      } as PromptExploderPatternSnapshot;
    });
  }, [promptExploderSettings.patternSnapshots]);

  const selectedSnapshot = useMemo(
    () => availableSnapshots.find((s) => s.id === selectedSnapshotId) ?? null,
    [availableSnapshots, selectedSnapshotId]
  );

  useEffect(() => {
    if (settingsQuery.isLoading) return;
    const rulesJson = settingsMap.get(PROMPT_ENGINE_SETTINGS_KEY + '_rules');
    const rules = parsePromptValidationRules(rulesJson ?? '');
    if (rules && 'ok' in rules && rules.ok) {
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
  };
}
