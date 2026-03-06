'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { useToast } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { serializeSetting } from '@/shared/utils/settings-json';
import {
  PROMPT_ENGINE_SETTINGS_KEY,
  type PromptEngineSettings,
  type PromptValidationRule,
} from '@/shared/contracts/prompt-engine';
import { PROMPT_EXPLODER_SETTINGS_KEY } from '../../settings';
import {
  PromptExploderPatternSnapshot,
  PromptExploderParserTuningRuleDraft,
  PromptExploderLearnedTemplate,
  PromptExploderRuntimeValidationScope,
  PromptExploderSettings,
} from '@/shared/contracts/prompt-exploder';
import type { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { ensurePromptExploderPatternPack } from '../../pattern-pack';
import {
  validatePromptExploderParserTuningDrafts,
  applyPromptExploderParserTuningDrafts,
  buildPromptExploderParserTuningDrafts,
} from '../../parser-tuning';
import {
  buildPatternSnapshot,
  prependPatternSnapshot,
  mergeRestoredPromptExploderRules,
  removePatternSnapshotById,
} from '../../pattern-snapshots';
import { LearningDraft } from './SettingsDraftsContext';

type UseSettingsActionsImplArgs = {
  settingsMap: Map<string, string>;
  updateSetting: ReturnType<typeof useUpdateSetting>;
  promptSettings: PromptEngineSettings;
  promptExploderSettings: PromptExploderSettings;
  activeValidationScope: PromptExploderRuntimeValidationScope;
  learningDraft: LearningDraft;
  setHasUnsavedLearningDraft: Dispatch<SetStateAction<boolean>>;
  parserTuningDrafts: PromptExploderParserTuningRuleDraft[];
  setParserTuningDrafts: Dispatch<SetStateAction<PromptExploderParserTuningRuleDraft[]>>;
  setParserTuningDraftsState: Dispatch<SetStateAction<PromptExploderParserTuningRuleDraft[]>>;
  setHasUnsavedParserTuningDrafts: Dispatch<SetStateAction<boolean>>;
  effectiveRules: PromptValidationRule[];
  scopedRules: PromptValidationRule[];
  snapshotDraftName: string;
  setSnapshotDraftName: Dispatch<SetStateAction<string>>;
  selectedSnapshot: PromptExploderPatternSnapshot | null;
  setSelectedSnapshotId: Dispatch<SetStateAction<string>>;
  setSessionLearnedTemplates: Dispatch<SetStateAction<PromptExploderLearnedTemplate[]>>;
  resolvedOnSaved?: () => void;
  settingsQuery: ReturnType<typeof useSettingsMap>;
  setSaveError: Dispatch<SetStateAction<string | null>>;
};

export function useSettingsActionsImpl(args: UseSettingsActionsImplArgs) {
  const { toast } = useToast();

  const persistSettingIfChanged = useCallback(
    async (input: { key: string; value: string }): Promise<boolean> => {
      if (args.settingsMap.get(input.key) === input.value) {
        return false;
      }
      await args.updateSetting.mutateAsync(input);
      return true;
    },
    [args.settingsMap, args.updateSetting]
  );

  const patchParserTuningDraft = useCallback(
    (ruleId: string, patch: Partial<PromptExploderParserTuningRuleDraft>) => {
      args.setParserTuningDrafts((previous: PromptExploderParserTuningRuleDraft[]) =>
        previous.map((draft) => (draft.id === ruleId ? { ...draft, ...patch } : draft))
      );
    },
    [args]
  );

  const handleInstallPatternPack = useCallback(async () => {
    try {
      const result = ensurePromptExploderPatternPack(args.promptSettings, {
        scope: args.activeValidationScope,
      });
      if (result.addedRuleIds.length === 0 && result.updatedRuleIds.length === 0) {
        toast('Prompt Exploder pattern pack is already installed.', { variant: 'info' });
        return;
      }
      await args.updateSetting.mutateAsync({
        key: PROMPT_ENGINE_SETTINGS_KEY,
        value: serializeSetting(result.nextSettings),
      });
      toast(
        `Installed pattern pack (${result.addedRuleIds.length} added, ${result.updatedRuleIds.length} updated).`,
        { variant: 'success' }
      );
    } catch (error) {
      logClientError(error, {
        context: { source: 'PromptExploderSettingsContext', action: 'handleInstallPatternPack' },
      });
      toast('Failed to install pattern pack.', { variant: 'error' });
    }
  }, [args, toast]);

  const handleSaveLearningSettings = useCallback(async () => {
    try {
      const nextSettings = {
        ...args.promptExploderSettings,
        learning: {
          ...args.promptExploderSettings.learning,
          enabled: args.learningDraft.enabled,
          similarityThreshold: args.learningDraft.similarityThreshold,
          templateMergeThreshold: args.learningDraft.templateMergeThreshold,
          benchmarkSuggestionUpsertTemplates: args.learningDraft.benchmarkSuggestionUpsertTemplates,
          minApprovalsForMatching: args.learningDraft.minApprovalsForMatching,
          maxTemplates: args.learningDraft.maxTemplates,
          autoActivateLearnedTemplates: args.learningDraft.autoActivateLearnedTemplates,
        },
      };
      await args.updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      args.setHasUnsavedLearningDraft(false);
      toast('Learning settings saved.', { variant: 'success' });
    } catch (error) {
      logClientError(error, {
        context: { source: 'PromptExploderSettingsContext', action: 'handleSaveLearningSettings' },
      });
      toast('Failed to save learning settings.', { variant: 'error' });
    }
  }, [args, toast]);

  const handleSaveParserTuningRules = useCallback(async () => {
    const validation = validatePromptExploderParserTuningDrafts(args.parserTuningDrafts);
    if (!validation.ok) {
      toast(validation.error || 'Invalid parser tuning rules.', { variant: 'error' });
      return;
    }
    try {
      const nextSettings = applyPromptExploderParserTuningDrafts({
        settings: args.promptSettings,
        drafts: args.parserTuningDrafts,
        patternPackRules: args.effectiveRules,
        scope: args.activeValidationScope,
      });
      await args.updateSetting.mutateAsync({
        key: PROMPT_ENGINE_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      args.setHasUnsavedParserTuningDrafts(false);
      toast(`Saved ${args.parserTuningDrafts.length} parser tuning rules.`, { variant: 'success' });
    } catch (error) {
      logClientError(error, {
        context: { source: 'PromptExploderSettingsContext', action: 'handleSaveParserTuningRules' },
      });
      toast('Failed to save parser tuning rules.', { variant: 'error' });
    }
  }, [args, toast]);

  const handleResetParserTuningDrafts = useCallback(() => {
    const drafts = buildPromptExploderParserTuningDrafts({
      scopedRules: args.scopedRules,
      patternPackRules: args.effectiveRules,
      scope: args.activeValidationScope,
    });
    args.setParserTuningDraftsState(drafts);
    args.setHasUnsavedParserTuningDrafts(false);
    toast('Parser tuning rules reset to current settings.', { variant: 'info' });
  }, [args, toast]);

  const handleCapturePatternSnapshot = useCallback(async () => {
    if (!args.snapshotDraftName.trim()) {
      toast('Snapshot name is required.', { variant: 'error' });
      return;
    }
    try {
      const snapshot = buildPatternSnapshot({
        snapshotDraftName: args.snapshotDraftName.trim(),
        rules: args.promptSettings.promptValidation.rules,
        now: new Date().toISOString(),
      });
      const nextSnapshots = prependPatternSnapshot(
        args.promptExploderSettings.patternSnapshots ?? [],
        snapshot
      );
      const nextSettings = {
        ...args.promptExploderSettings,
        patternSnapshots: nextSnapshots,
      };
      await args.updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      args.setSnapshotDraftName('');
      toast(`Captured snapshot "${snapshot.name ?? 'Unnamed snapshot'}".`, { variant: 'success' });
    } catch (error) {
      logClientError(error, {
        context: {
          source: 'PromptExploderSettingsContext',
          action: 'handleCapturePatternSnapshot',
        },
      });
      toast('Failed to capture snapshot.', { variant: 'error' });
    }
  }, [args, toast]);

  const handleRestorePatternSnapshot = useCallback(async () => {
    if (!args.selectedSnapshot) return;
    try {
      const nextRules = mergeRestoredPromptExploderRules({
        existingRules: args.promptSettings.promptValidation.rules,
        restoredRules: args.selectedSnapshot.rules ?? [],
        isPromptExploderManagedRule: (rule) => Boolean(rule.id),
      });
      const nextSettings = {
        ...args.promptSettings,
        promptValidation: {
          ...args.promptSettings.promptValidation,
          rules: nextRules,
        },
      };
      await args.updateSetting.mutateAsync({
        key: PROMPT_ENGINE_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      toast(`Restored rules from snapshot "${args.selectedSnapshot.name ?? 'Unnamed snapshot'}".`, {
        variant: 'success',
      });
    } catch (error) {
      logClientError(error, {
        context: {
          source: 'PromptExploderSettingsContext',
          action: 'handleRestorePatternSnapshot',
        },
      });
      toast('Failed to restore snapshot.', { variant: 'error' });
    }
  }, [args, toast]);

  const handleDeletePatternSnapshot = useCallback(async () => {
    if (!args.selectedSnapshot) return;
    try {
      const nextSnapshots = removePatternSnapshotById(
        args.promptExploderSettings.patternSnapshots ?? [],
        args.selectedSnapshot.id
      );
      const nextSettings = {
        ...args.promptExploderSettings,
        patternSnapshots: nextSnapshots,
      };
      await args.updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      args.setSelectedSnapshotId('');
      toast(`Deleted snapshot "${args.selectedSnapshot.name ?? 'Unnamed snapshot'}".`, {
        variant: 'success',
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to delete snapshot.', {
        variant: 'error',
      });
    }
  }, [args, toast]);

  const handleTemplateStateChange = useCallback(
    async (templateId: string, nextState: PromptExploderLearnedTemplate['state']) => {
      try {
        const now = new Date().toISOString();
        const nextTemplates = args.promptExploderSettings.learning.templates.map((template) =>
          template.id === templateId ? { ...template, state: nextState, updatedAt: now } : template
        );
        const nextSettings: PromptExploderSettings = {
          ...args.promptExploderSettings,
          learning: { ...args.promptExploderSettings.learning, templates: nextTemplates },
        };
        const persisted = await persistSettingIfChanged({
          key: PROMPT_EXPLODER_SETTINGS_KEY,
          value: serializeSetting(nextSettings),
        });
        if (!persisted) {
          toast('Template state is already up to date.', { variant: 'info' });
          return;
        }
        args.setSessionLearnedTemplates((previous: PromptExploderLearnedTemplate[]) =>
          previous.map((template) =>
            template.id === templateId
              ? { ...template, state: nextState, updatedAt: now }
              : template
          )
        );
        toast(`Template state changed to ${nextState}.`, { variant: 'success' });
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Failed to update template state.', {
          variant: 'error',
        });
      }
    },
    [args, persistSettingIfChanged, toast]
  );

  const handleDeleteTemplate = useCallback(
    async (templateId: string) => {
      try {
        const nextTemplates = args.promptExploderSettings.learning.templates.filter(
          (template) => template.id !== templateId
        );
        const nextSettings: PromptExploderSettings = {
          ...args.promptExploderSettings,
          learning: { ...args.promptExploderSettings.learning, templates: nextTemplates },
        };
        const persisted = await persistSettingIfChanged({
          key: PROMPT_EXPLODER_SETTINGS_KEY,
          value: serializeSetting(nextSettings),
        });
        if (!persisted) {
          toast('Template was already removed.', { variant: 'info' });
          return;
        }
        args.setSessionLearnedTemplates((previous: PromptExploderLearnedTemplate[]) =>
          previous.filter((template) => template.id !== templateId)
        );
        toast('Template removed.', { variant: 'success' });
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Failed to delete template.', {
          variant: 'error',
        });
      }
    },
    [args, persistSettingIfChanged, toast]
  );

  const handleRefresh = useCallback(async (): Promise<void> => {
    await args.settingsQuery.refetch();
  }, [args.settingsQuery]);

  return {
    persistSettingIfChanged,
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
    handleRefresh,
  };
}
