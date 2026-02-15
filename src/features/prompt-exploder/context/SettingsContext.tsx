'use client';

import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import {
  defaultPromptEngineSettings,
  parsePromptEngineSettings,
  parsePromptValidationRules,
  PROMPT_ENGINE_SETTINGS_KEY,
  type PromptValidationRule,
} from '@/features/prompt-engine/settings';
import type { PromptEngineSettings } from '@/features/prompt-engine/settings';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

import { promptExploderClampNumber } from '../helpers/formatting';
import { isPromptExploderManagedRule } from '../helpers/segment-helpers';
import {
  applyPromptExploderParserTuningDrafts,
  buildPromptExploderParserTuningDrafts,
  validatePromptExploderParserTuningDrafts,
  type PromptExploderParserTuningRuleDraft,
} from '../parser-tuning';
import {
  ensurePromptExploderPatternPack,
  getPromptExploderScopedRules,
  PROMPT_EXPLODER_PATTERN_PACK,
  PROMPT_EXPLODER_PATTERN_PACK_IDS,
} from '../pattern-pack';
import {
  buildPatternSnapshot,
  mergeRestoredPromptExploderRules,
  prependPatternSnapshot,
  removePatternSnapshotById,
} from '../pattern-snapshots';
import { filterTemplatesForRuntime } from '../runtime-refresh';
import { parsePromptExploderSettings, PROMPT_EXPLODER_SETTINGS_KEY } from '../settings';
import {
  DEFAULT_PROMPT_EXPLODER_VALIDATION_RULE_STACK,
  promptExploderValidationScopeFromStack,
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
  promptSettings: PromptEngineSettings;
  promptExploderSettings: ReturnType<typeof parsePromptExploderSettings>;
  activeValidationScope: PromptExploderRuntimeValidationScope;
  activeValidationRuleStack: PromptExploderValidationRuleStack;
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
}

// ── Contexts ─────────────────────────────────────────────────────────────────

const SettingsStateContext = createContext<SettingsState | null>(null);
const SettingsActionsContext = createContext<SettingsActions | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function SettingsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap({ scope: 'all' });
  const updateSetting = useUpdateSetting();

  const [learningDraft, setLearningDraft] = useState<LearningDraft>({
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
  const [parserTuningDrafts, setParserTuningDrafts] = useState<PromptExploderParserTuningRuleDraft[]>([]);
  const [isParserTuningOpen, setIsParserTuningOpen] = useState(false);
  const [snapshotDraftName, setSnapshotDraftName] = useState('');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState('');
  const [sessionLearnedRules, setSessionLearnedRules] = useState<PromptValidationRule[]>([]);
  const [sessionLearnedTemplates, setSessionLearnedTemplates] = useState<PromptExploderLearnedTemplate[]>([]);

  // ── Derived state ──────────────────────────────────────────────────────────

  const rawPromptSettings = settingsQuery.data?.get(PROMPT_ENGINE_SETTINGS_KEY) ?? null;
  const rawExploderSettings = settingsQuery.data?.get(PROMPT_EXPLODER_SETTINGS_KEY) ?? null;

  const promptSettings = useMemo(
    () => parsePromptEngineSettings(rawPromptSettings),
    [rawPromptSettings]
  );
  const promptExploderSettings = useMemo(
    () => parsePromptExploderSettings(rawExploderSettings),
    [rawExploderSettings]
  );

  const activeValidationScope = useMemo<PromptExploderRuntimeValidationScope>(
    () => promptExploderValidationScopeFromStack(learningDraft.runtimeValidationRuleStack),
    [learningDraft.runtimeValidationRuleStack]
  );

  const scopedRules = useMemo<PromptValidationRule[]>(
    () => getPromptExploderScopedRules(promptSettings, activeValidationScope),
    [activeValidationScope, promptSettings]
  );

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
    setParserTuningDrafts(parserTuningBaseDrafts);
  }, [parserTuningBaseDrafts]);

  const effectiveRules = useMemo<PromptValidationRule[]>(() => {
    const byId = new Map<string, PromptValidationRule>();
    [...scopedRules, ...sessionLearnedRules].forEach((rule) => {
      byId.set(rule.id, rule);
    });
    return [...byId.values()];
  }, [scopedRules, sessionLearnedRules]);

  const runtimeValidationRules = useMemo<PromptValidationRule[]>(() => {
    if (learningDraft.runtimeRuleProfile === 'learned_only') {
      return effectiveRules.filter((rule) => rule.id.startsWith('segment.learned.'));
    }
    if (learningDraft.runtimeRuleProfile === 'pattern_pack') {
      return effectiveRules.filter((rule) => PROMPT_EXPLODER_PATTERN_PACK_IDS.has(rule.id));
    }
    return effectiveRules;
  }, [effectiveRules, learningDraft.runtimeRuleProfile]);

  const effectiveLearnedTemplates = useMemo<PromptExploderLearnedTemplate[]>(() => {
    const byId = new Map<string, PromptExploderLearnedTemplate>();
    [...promptExploderSettings.learning.templates, ...sessionLearnedTemplates].forEach((template) => {
      byId.set(template.id, template);
    });
    return [...byId.values()];
  }, [promptExploderSettings.learning.templates, sessionLearnedTemplates]);

  const runtimeLearnedTemplates = useMemo<PromptExploderLearnedTemplate[]>(() => {
    if (!learningDraft.enabled) return [];
    return filterTemplatesForRuntime(effectiveLearnedTemplates, {
      minApprovalsForMatching: learningDraft.minApprovalsForMatching,
      maxTemplates: learningDraft.maxTemplates,
    });
  }, [
    effectiveLearnedTemplates,
    learningDraft.enabled,
    learningDraft.maxTemplates,
    learningDraft.minApprovalsForMatching,
  ]);

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
    setLearningDraft({
      runtimeRuleProfile: promptExploderSettings.runtime.ruleProfile,
      runtimeValidationRuleStack: promptExploderSettings.runtime.validationRuleStack,
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
  }, [
    promptExploderSettings.runtime.ruleProfile,
    promptExploderSettings.runtime.validationRuleStack,
    promptExploderSettings.learning.autoActivateLearnedTemplates,
    promptExploderSettings.learning.benchmarkSuggestionUpsertTemplates,
    promptExploderSettings.learning.enabled,
    promptExploderSettings.learning.maxTemplates,
    promptExploderSettings.learning.minApprovalsForMatching,
    promptExploderSettings.learning.templateMergeThreshold,
    promptExploderSettings.learning.similarityThreshold,
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
      await updateSetting.mutateAsync({
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
  }, [activeValidationScope, promptSettings, toast, updateSetting]);

  const handleResetParserTuningDrafts = useCallback(() => {
    setParserTuningDrafts(
      buildPromptExploderParserTuningDrafts({
        scopedRules: PROMPT_EXPLODER_PATTERN_PACK,
        patternPackRules: PROMPT_EXPLODER_PATTERN_PACK,
        scope: activeValidationScope,
      })
    );
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
      await updateSetting.mutateAsync({
        key: PROMPT_ENGINE_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      toast('Prompt Exploder parser tuning rules saved.', { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'Failed to save parser tuning rules.',
        { variant: 'error' }
      );
    }
  }, [activeValidationScope, parserTuningDrafts, promptSettings, toast, updateSetting]);

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
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      toast('Prompt Exploder runtime + learning settings saved.', { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to save Prompt Exploder learning settings.',
        { variant: 'error' }
      );
    }
  }, [learningDraft, promptExploderSettings, toast, updateSetting]);

  const handleCapturePatternSnapshot = useCallback(async () => {
    try {
      const scopedPromptRules = promptSettings.promptValidation.rules.filter((rule) => {
        if (!isPromptExploderManagedRule(rule)) return false;
        const scopes = rule.appliesToScopes ?? [];
        return (
          scopes.length === 0 ||
          scopes.includes(activeValidationScope) ||
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
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
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
  }, [activeValidationScope, promptExploderSettings, promptSettings, snapshotDraftName, toast, updateSetting]);

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
      const basePromptSettings = promptSettings.promptValidation
        ? promptSettings
        : defaultPromptEngineSettings;
      const restoredRules = mergeRestoredPromptExploderRules({
        existingRules: basePromptSettings.promptValidation.rules,
        restoredRules: parsed.rules,
        isPromptExploderManagedRule,
        scope: activeValidationScope,
      });
      const nextPromptSettings = {
        ...basePromptSettings,
        promptValidation: {
          ...basePromptSettings.promptValidation,
          rules: restoredRules,
        },
      };
      await updateSetting.mutateAsync({
        key: PROMPT_ENGINE_SETTINGS_KEY,
        value: serializeSetting(nextPromptSettings),
      });
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
  }, [activeValidationScope, promptSettings, selectedSnapshot, toast, updateSetting]);

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
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      toast(`Deleted snapshot: ${selectedSnapshot.name}`, { variant: 'success' });
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
        const nextSettings = {
          ...promptExploderSettings,
          learning: { ...promptExploderSettings.learning, templates: nextTemplates },
        };
        await updateSetting.mutateAsync({
          key: PROMPT_EXPLODER_SETTINGS_KEY,
          value: serializeSetting(nextSettings),
        });
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
    [promptExploderSettings, toast, updateSetting]
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
        await updateSetting.mutateAsync({
          key: PROMPT_EXPLODER_SETTINGS_KEY,
          value: serializeSetting(nextSettings),
        });
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
    [promptExploderSettings, toast, updateSetting]
  );

  // ── Memoized context values ────────────────────────────────────────────────

  const isBusy = updateSetting.isPending;

  const stateValue = useMemo<SettingsState>(
    () => ({
      promptSettings,
      promptExploderSettings,
      activeValidationScope,
      activeValidationRuleStack: learningDraft.runtimeValidationRuleStack,
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
      isBusy,
    }),
    [
      promptSettings,
      promptExploderSettings,
      activeValidationScope,
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
