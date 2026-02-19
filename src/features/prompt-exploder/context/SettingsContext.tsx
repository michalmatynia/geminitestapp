'use client';

import { useSearchParams } from 'next/navigation';
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import {
  parseValidatorPatternLists,
  VALIDATOR_PATTERN_LISTS_KEY,
  type ValidatorPatternList,
} from '@/features/admin/pages/validator-scope';
import { getPromptValidationObservabilitySnapshot } from '@/features/prompt-core/runtime-observability';
import {
  parsePromptEngineSettings,
  parsePromptValidationRules,
  PROMPT_ENGINE_SETTINGS_KEY,
  type PromptValidationRule,
} from '@/features/prompt-engine/settings';
import type { PromptEngineSettings } from '@/features/prompt-engine/settings';
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
  type PromptExploderBridgeSource,
} from '../bridge';
import { isPromptValidationStrictStackMode } from '../feature-flags';
import { promptExploderClampNumber } from '../helpers/formatting';
import { promptExploderIsPromptExploderManagedRule } from '../helpers/segment-helpers';
import {
  applyPromptExploderParserTuningDrafts,
  buildPromptExploderParserTuningDrafts,
  validatePromptExploderParserTuningDrafts,
  type PromptExploderParserTuningRuleDraft,
} from '../parser-tuning';
import {
  ensurePromptExploderPatternPack,
  PROMPT_EXPLODER_PATTERN_PACK,
} from '../pattern-pack';
import {
  buildPatternSnapshot,
  mergeRestoredPromptExploderRules,
  prependPatternSnapshot,
  removePatternSnapshotById,
} from '../pattern-snapshots';
import {
  resolvePromptValidationRuntime,
  type PromptValidationOrchestrationResult,
} from '../prompt-validation-orchestrator';
import { getPromptExploderRuntimeGuardrailIssue } from '../runtime-guardrails';
import { parsePromptExploderSettings, PROMPT_EXPLODER_SETTINGS_KEY } from '../settings';
import {
  DEFAULT_PROMPT_EXPLODER_VALIDATION_RULE_STACK,
  normalizePromptExploderValidationRuleStack,
  promptExploderValidationStackFromBridgeSource,
  type PromptExploderRuntimeValidationScope,
  type PromptExploderValidationRuleStack,
} from '../validation-stack';

import type {
  PromptExploderLearnedTemplate,
  PromptExploderPatternSnapshot,
} from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

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

export interface SettingsState {
  settingsMap: Map<string, string>;
  validatorPatternLists: ValidatorPatternList[];
  promptSettings: PromptEngineSettings;
  promptExploderSettings: ReturnType<typeof parsePromptExploderSettings>;
  activeValidationScope: PromptExploderRuntimeValidationScope;
  activeValidationRuleStack: PromptExploderValidationRuleStack;
  runtimeSelection: PromptValidationOrchestrationResult;
  runtimeGuardrailIssue: string | null;
  scopedRules: PromptValidationRule[];
  effectiveRules: PromptValidationRule[];
  runtimeValidationRules: PromptValidationRule[];
  effectiveLearnedTemplates: PromptExploderLearnedTemplate[];
  runtimeLearnedTemplates: PromptExploderLearnedTemplate[];
  templateMergeThreshold: number;
  learningDraft: LearningDraft;
  parserTuningDrafts: PromptExploderParserTuningRuleDraft[];
  isParserTuningOpen: boolean;
  snapshotDraftName: string;
  selectedSnapshotId: string;
  availableSnapshots: PromptExploderPatternSnapshot[];
  selectedSnapshot: PromptExploderPatternSnapshot | null;
  sessionLearnedRules: PromptValidationRule[];
  sessionLearnedTemplates: PromptExploderLearnedTemplate[];
  hasUnsavedLearningDraft: boolean;
  hasUnsavedParserTuningDrafts: boolean;
  isBusy: boolean;
}

export interface SettingsActions {
  setLearningDraft: React.Dispatch<React.SetStateAction<LearningDraft>>;
  setParserTuningDrafts: React.Dispatch<React.SetStateAction<PromptExploderParserTuningRuleDraft[]>>;
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
  updateSetting: ReturnType<typeof useUpdateSetting>;
  updateSettingsBulk: ReturnType<typeof useUpdateSettingsBulk>;
}

// ── Contexts ─────────────────────────────────────────────────────────────────

const SettingsStateContext = createContext<SettingsState | null>(null);
const SettingsActionsContext = createContext<SettingsActions | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function SettingsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const settingsQuery = useSettingsMap({ scope: 'all' });
  const updateSetting = useUpdateSetting();
  const updateSettingsBulk = useUpdateSettingsBulk();
  const settingsMap = settingsQuery.data ?? new Map<string, string>();
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
    useState<PromptExploderBridgeSource | null>(null);

  const setLearningDraft = useCallback<React.Dispatch<React.SetStateAction<LearningDraft>>>(
    (value) => {
      setHasUnsavedLearningDraft(true);
      setLearningDraftState(value);
    },
    []
  );

  const setParserTuningDrafts = useCallback<
    React.Dispatch<React.SetStateAction<PromptExploderParserTuningRuleDraft[]>>
  >((value) => {
    setHasUnsavedParserTuningDrafts(true);
    setParserTuningDraftsState(value);
  }, []);

  // ── Derived state ──────────────────────────────────────────────────────────

  const rawPromptSettings = settingsQuery.data?.get(PROMPT_ENGINE_SETTINGS_KEY) ?? null;
  const rawExploderSettings = settingsQuery.data?.get(PROMPT_EXPLODER_SETTINGS_KEY) ?? null;
  const rawValidatorPatternLists =
    settingsQuery.data?.get(VALIDATOR_PATTERN_LISTS_KEY) ?? null;

  const promptSettings = useMemo(
    () => parsePromptEngineSettings(rawPromptSettings),
    [rawPromptSettings]
  );
  const promptExploderSettings = useMemo(
    () => parsePromptExploderSettings(rawExploderSettings),
    [rawExploderSettings]
  );
  const validatorPatternLists = useMemo(
    () => parseValidatorPatternLists(rawValidatorPatternLists),
    [rawValidatorPatternLists]
  );
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

  const runtimeResolution = useMemo<{
    selection: PromptValidationOrchestrationResult;
    warning: Error | null;
    guardrailIssue: string | null;
  }>(() => {
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
          allowValidationStackFallback,
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
            allowValidationStackFallback,
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
          stack: learningDraft.runtimeValidationRuleStack,
          correlationId: runtimeResolution.selection.correlationId,
          level: 'warn',
        },
      });
    }
    const message = runtimeResolution.guardrailIssue ?? warning?.message ?? '';
    if (message.trim()) {
      toast(message, {
        variant: runtimeResolution.guardrailIssue ? 'error' : 'warning',
      });
    }
  }, [
    learningDraft.runtimeValidationRuleStack,
    runtimeResolution.guardrailIssue,
    runtimeResolution.selection.correlationId,
    runtimeResolution.warning,
    toast,
  ]);

  useEffect(() => {
    const checkHealth = (): void => {
      const snapshot = getPromptValidationObservabilitySnapshot();
      if (snapshot.health.status === 'ok') return;
      logClientError(
        new Error(`Prompt runtime health ${snapshot.health.status}`),
        {
          context: {
            source: 'PromptExploderSettingsContext',
            action: 'runtimeHealthCheck',
            status: snapshot.health.status,
            checks: snapshot.health.checks,
            counters: snapshot.counters,
            errors: snapshot.errors,
            level: snapshot.health.status === 'critical' ? 'error' : 'warn',
          },
        }
      );
    };
    checkHealth();
    const timer = window.setInterval(checkHealth, 20_000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const runtimeSelection = runtimeResolution.selection;
  const activeValidationScope = runtimeSelection.identity.scope;
  const scopedRules = runtimeSelection.scopedRules;
  const effectiveRules = runtimeSelection.effectiveRules;
  const runtimeValidationRules = runtimeSelection.runtimeValidationRules;
  const effectiveLearnedTemplates = runtimeSelection.effectiveLearnedTemplates;
  const runtimeLearnedTemplates = runtimeSelection.runtimeLearnedTemplates;
  const activeValidationRuleStack = runtimeSelection.identity.stack;
  const runtimeGuardrailIssue = runtimeResolution.guardrailIssue;

  const parserTuningBaseDrafts = useMemo(
    () =>
      buildPromptExploderParserTuningDrafts({
        scopedRules,
        patternPackRules: PROMPT_EXPLODER_PATTERN_PACK,
        scope: activeValidationScope,
      }),
    [activeValidationScope, scopedRules]
  );

  useEffect(() => {
    if (hasUnsavedParserTuningDrafts) return;
    setParserTuningDraftsState(parserTuningBaseDrafts);
  }, [hasUnsavedParserTuningDrafts, parserTuningBaseDrafts]);

  const templateMergeThreshold = promptExploderClampNumber(
    learningDraft.templateMergeThreshold,
    0.3,
    0.95
  );

  const availableSnapshots = useMemo<PromptExploderPatternSnapshot[]>(
    () =>
      [...promptExploderSettings.patternSnapshots].sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt)
      ),
    [promptExploderSettings.patternSnapshots]
  );

  const selectedSnapshot = useMemo(() => {
    if (!selectedSnapshotId) return null;
    return availableSnapshots.find((snapshot) => snapshot.id === selectedSnapshotId) ?? null;
  }, [availableSnapshots, selectedSnapshotId]);

  // ── Sync learning draft from persisted settings ────────────────────────────

  useEffect(() => {
    if (hasUnsavedLearningDraft) return;
    setLearningDraftState({
      runtimeRuleProfile: promptExploderSettings.runtime.ruleProfile,
      runtimeValidationRuleStack: normalizePromptExploderValidationRuleStack(
        promptExploderSettings.runtime.validationRuleStack,
        validatorPatternLists
      ),
      enabled: promptExploderSettings.learning.enabled,
      similarityThreshold: promptExploderSettings.learning.similarityThreshold,
      templateMergeThreshold: promptExploderSettings.learning.templateMergeThreshold,
      benchmarkSuggestionUpsertTemplates:
        promptExploderSettings.learning.benchmarkSuggestionUpsertTemplates,
      minApprovalsForMatching: promptExploderSettings.learning.minApprovalsForMatching,
      maxTemplates: promptExploderSettings.learning.maxTemplates,
      autoActivateLearnedTemplates:
        promptExploderSettings.learning.autoActivateLearnedTemplates,
    });
    setHasUnsavedLearningDraft(false);
  }, [
    hasUnsavedLearningDraft,
    promptExploderSettings.runtime.ruleProfile,
    promptExploderSettings.runtime.validationRuleStack,
    promptExploderSettings.learning.autoActivateLearnedTemplates,
    promptExploderSettings.learning.benchmarkSuggestionUpsertTemplates,
    promptExploderSettings.learning.enabled,
    promptExploderSettings.learning.maxTemplates,
    promptExploderSettings.learning.minApprovalsForMatching,
    promptExploderSettings.learning.templateMergeThreshold,
    promptExploderSettings.learning.similarityThreshold,
    validatorPatternLists,
  ]);

  useEffect(() => {
    if (hasUnsavedLearningDraft) return;
    if (!shouldPreferCaseResolverValidationStack) return;
    const caseResolverStack = promptExploderValidationStackFromBridgeSource(
      'case-resolver',
      validatorPatternLists
    );
    setLearningDraftState((current) => {
      if (current.runtimeValidationRuleStack === caseResolverStack) return current;
      return {
        ...current,
        runtimeValidationRuleStack: caseResolverStack,
      };
    });
    setHasUnsavedLearningDraft(false);
  }, [
    hasUnsavedLearningDraft,
    shouldPreferCaseResolverValidationStack,
    validatorPatternLists,
  ]);

  // ── Sync snapshot selection ────────────────────────────────────────────────

  useEffect(() => {
    if (availableSnapshots.length === 0) {
      setSelectedSnapshotId('');
      return;
    }
    if (availableSnapshots.some((snapshot) => snapshot.id === selectedSnapshotId)) return;
    setSelectedSnapshotId(availableSnapshots[0]?.id ?? '');
  }, [availableSnapshots, selectedSnapshotId]);

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

  // ── Actions ────────────────────────────────────────────────────────────────

  const patchParserTuningDraft = useCallback(
    (ruleId: PromptExploderParserTuningRuleDraft['id'], patch: Partial<PromptExploderParserTuningRuleDraft>) => {
      setParserTuningDrafts((previous) =>
        previous.map((draft) => (draft.id === ruleId ? { ...draft, ...patch } : draft))
      );
    },
    []
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
      await persistSettingIfChanged({
        key: PROMPT_ENGINE_SETTINGS_KEY,
        value: serializeSetting(result.nextSettings),
      });
      toast(
        `Pattern pack synced. Added ${result.addedRuleIds.length}, updated ${result.updatedRuleIds.length}.`,
        { variant: 'success' }
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to install pattern pack.', {
        variant: 'error',
      });
    }
  }, [activeValidationScope, persistSettingIfChanged, promptSettings, toast]);

  const handleResetParserTuningDrafts = useCallback(() => {
    setParserTuningDraftsState(
      buildPromptExploderParserTuningDrafts({
        scopedRules: PROMPT_EXPLODER_PATTERN_PACK,
        patternPackRules: PROMPT_EXPLODER_PATTERN_PACK,
        scope: activeValidationScope,
      })
    );
    setHasUnsavedParserTuningDrafts(false);
    toast('Parser tuning drafts reset to pattern-pack defaults.', { variant: 'info' });
  }, [activeValidationScope, toast]);

  const handleSaveParserTuningRules = useCallback(async () => {
    const validation = validatePromptExploderParserTuningDrafts(parserTuningDrafts);
    if (!validation.ok) {
      toast(validation.error, { variant: 'error' });
      return;
    }
    try {
      const nextSettings = applyPromptExploderParserTuningDrafts({
        settings: promptSettings,
        drafts: parserTuningDrafts,
        patternPackRules: PROMPT_EXPLODER_PATTERN_PACK,
        scope: activeValidationScope,
      });
      const persisted = await persistSettingIfChanged({
        key: PROMPT_ENGINE_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      if (persisted) {
        setHasUnsavedParserTuningDrafts(false);
        toast('Prompt Exploder parser tuning rules saved.', { variant: 'success' });
      } else {
        toast('No parser tuning changes to save.', { variant: 'info' });
      }
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'Failed to save parser tuning rules.',
        { variant: 'error' }
      );
    }
  }, [activeValidationScope, parserTuningDrafts, persistSettingIfChanged, promptSettings, toast]);

  const handleSaveLearningSettings = useCallback(async () => {
    try {
      const nextSettings = {
        ...promptExploderSettings,
        runtime: {
          ...promptExploderSettings.runtime,
          ruleProfile: learningDraft.runtimeRuleProfile,
          validationRuleStack: learningDraft.runtimeValidationRuleStack,
          benchmarkLowConfidenceThreshold: promptExploderClampNumber(
            promptExploderSettings.runtime.benchmarkLowConfidenceThreshold,
            0.3,
            0.9
          ),
          benchmarkSuggestionLimit: promptExploderClampNumber(
            Math.floor(promptExploderSettings.runtime.benchmarkSuggestionLimit),
            1,
            20
          ),
        },
        learning: {
          ...promptExploderSettings.learning,
          enabled: learningDraft.enabled,
          similarityThreshold: promptExploderClampNumber(learningDraft.similarityThreshold, 0.3, 0.95),
          templateMergeThreshold: promptExploderClampNumber(
            learningDraft.templateMergeThreshold,
            0.3,
            0.95
          ),
          benchmarkSuggestionUpsertTemplates: learningDraft.benchmarkSuggestionUpsertTemplates,
          minApprovalsForMatching: promptExploderClampNumber(
            Math.floor(learningDraft.minApprovalsForMatching),
            1,
            20
          ),
          maxTemplates: promptExploderClampNumber(Math.floor(learningDraft.maxTemplates), 50, 5000),
          autoActivateLearnedTemplates: learningDraft.autoActivateLearnedTemplates,
        },
      };
      const persisted = await persistSettingIfChanged({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      if (persisted) {
        setHasUnsavedLearningDraft(false);
        toast('Prompt Exploder runtime + learning settings saved.', { variant: 'success' });
      } else {
        toast('No runtime/learning setting changes to save.', { variant: 'info' });
      }
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to save Prompt Exploder learning settings.',
        { variant: 'error' }
      );
    }
  }, [learningDraft, persistSettingIfChanged, promptExploderSettings, toast]);

  const handleCapturePatternSnapshot = useCallback(async () => {
    try {
      const activeRuleScope: string =
        activeValidationScope === 'case-resolver-prompt-exploder'
          ? 'case_resolver_prompt_exploder'
          : 'prompt_exploder';

      const scopedPromptRules = promptSettings.promptValidation.rules.filter((rule) => {
        if (!promptExploderIsPromptExploderManagedRule(rule)) return false;
        const scopes = (rule.appliesToScopes || []) as string[];
        return (
          scopes.length === 0 ||
          scopes.includes(activeRuleScope) ||
          scopes.includes('global')
        );
      });
      const now = new Date().toISOString();
      const snapshot = buildPatternSnapshot({
        rules: scopedPromptRules,
        snapshotDraftName,
        now,
      });
      const nextSettings = {
        ...promptExploderSettings,
        patternSnapshots: prependPatternSnapshot(
          promptExploderSettings.patternSnapshots,
          snapshot,
          40
        ),
      };
      const persisted = await persistSettingIfChanged({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      if (!persisted) {
        toast('Snapshot is identical to current state.', { variant: 'info' });
        return;
      }
      setSnapshotDraftName('');
      setSelectedSnapshotId(snapshot.id);
      toast(`Snapshot saved (${snapshot.ruleCount} rules).`, { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to capture Prompt Exploder snapshot.',
        { variant: 'error' }
      );
    }
  }, [
    activeValidationScope,
    persistSettingIfChanged,
    promptExploderSettings,
    promptSettings,
    snapshotDraftName,
    toast,
  ]);

  const handleRestorePatternSnapshot = useCallback(async () => {
    if (!selectedSnapshot) {
      toast('Select a snapshot to restore.', { variant: 'info' });
      return;
    }
    const parsed = parsePromptValidationRules(selectedSnapshot.rulesJson);
    if (!parsed.ok) {
      toast(`Snapshot is invalid: ${parsed.error}`, { variant: 'error' });
      return;
    }
    try {
      const basePromptSettings = promptSettings;
      const restoredRules = mergeRestoredPromptExploderRules({
        existingRules: basePromptSettings.promptValidation.rules,
        restoredRules: parsed.rules,
        isPromptExploderManagedRule: promptExploderIsPromptExploderManagedRule,
        scope: activeValidationScope,
      });
      const nextPromptSettings = {
        ...basePromptSettings,
        promptValidation: {
          ...basePromptSettings.promptValidation,
          rules: restoredRules,
        },
      };
      const persisted = await persistSettingIfChanged({
        key: PROMPT_ENGINE_SETTINGS_KEY,
        value: serializeSetting(nextPromptSettings),
      });
      if (!persisted) {
        toast('Snapshot restore produced no rule changes.', { variant: 'info' });
        return;
      }
      toast(
        `Snapshot restored: ${selectedSnapshot.name} (${parsed.rules.length} rules).`,
        { variant: 'success' }
      );
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to restore Prompt Exploder snapshot.',
        { variant: 'error' }
      );
    }
  }, [activeValidationScope, persistSettingIfChanged, promptSettings, selectedSnapshot, toast]);

  const handleDeletePatternSnapshot = useCallback(async () => {
    if (!selectedSnapshot) {
      toast('Select a snapshot to delete.', { variant: 'info' });
      return;
    }
    try {
      const nextSettings = {
        ...promptExploderSettings,
        patternSnapshots: removePatternSnapshotById(
          promptExploderSettings.patternSnapshots,
          selectedSnapshot.id
        ),
      };
      const persisted = await persistSettingIfChanged({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      if (!persisted) {
        toast('Snapshot was already deleted.', { variant: 'info' });
        return;
      }
      toast(`Deleted snapshot: ${selectedSnapshot.name}`, { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'Failed to delete snapshot.',
        { variant: 'error' }
      );
    }
  }, [persistSettingIfChanged, promptExploderSettings, selectedSnapshot, toast]);

  const handleTemplateStateChange = useCallback(
    async (templateId: string, nextState: PromptExploderLearnedTemplate['state']) => {
      try {
        const nextTemplates = promptExploderSettings.learning.templates.map((template) =>
          template.id === templateId
            ? { ...template, state: nextState, updatedAt: new Date().toISOString() }
            : template
        );
        const nextSettings = {
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
        const nextSettings = {
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

  // ── Memoized context values ────────────────────────────────────────────────

  const isBusy = updateSetting.isPending || updateSettingsBulk.isPending;

  const stateValue = useMemo<SettingsState>(
    () => ({
      settingsMap,
      validatorPatternLists,
      promptSettings,
      promptExploderSettings,
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
      learningDraft,
      parserTuningDrafts,
      isParserTuningOpen,
      snapshotDraftName,
      selectedSnapshotId,
      availableSnapshots,
      selectedSnapshot,
      sessionLearnedRules,
      sessionLearnedTemplates,
      hasUnsavedLearningDraft,
      hasUnsavedParserTuningDrafts,
      isBusy,
    }),
    [
      settingsMap,
      validatorPatternLists,
      promptSettings,
      promptExploderSettings,
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
      learningDraft,
      parserTuningDrafts,
      isParserTuningOpen,
      snapshotDraftName,
      selectedSnapshotId,
      availableSnapshots,
      selectedSnapshot,
      sessionLearnedRules,
      sessionLearnedTemplates,
      hasUnsavedLearningDraft,
      hasUnsavedParserTuningDrafts,
      isBusy,
    ]
  );

  const actionsValue = useMemo<SettingsActions>(
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
    <SettingsStateContext.Provider value={stateValue}>
      <SettingsActionsContext.Provider value={actionsValue}>
        {children}
      </SettingsActionsContext.Provider>
    </SettingsStateContext.Provider>
  );
}

// ── Hook exports ─────────────────────────────────────────────────────────────

export { SettingsStateContext, SettingsActionsContext };
