'use client';

import { useCallback } from 'react';

import {
  PROMPT_ENGINE_SETTINGS_KEY,
  type PromptValidationRule,
} from '@/shared/contracts/prompt-engine';
import type { Toast } from '@/shared/contracts/ui/base';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { serializeSetting } from '@/shared/utils/settings-json';

import { applyBenchmarkSuggestions } from '../../benchmark-apply';
import { prepareBenchmarkSuggestionsForApply } from '../../benchmark-suggestions';
import {
  buildRuntimeRulesForReexplode,
  buildRuntimeTemplatesForReexplode,
  reexplodePromptWithRuntime,
  resolveSegmentIdAfterReexplode,
} from '../../runtime-refresh';
import { PROMPT_EXPLODER_SETTINGS_KEY } from '../../settings';
import type { PromptExploderBenchmarkSuggestion } from '../../types';
import type { DocumentActions, DocumentState } from '../DocumentContext';
import type {
  PromptExploderSettingsActions,
  PromptExploderSettingsState,
} from '../SettingsContext';

type BenchmarkSuggestionActionDependencies = Pick<
  PromptExploderSettingsState,
  | 'activeValidationScope'
  | 'effectiveLearnedTemplates'
  | 'learningDraft'
  | 'promptExploderSettings'
  | 'promptSettings'
  | 'runtimeLearnedTemplates'
  | 'runtimeValidationRules'
  | 'settingsMap'
  | 'templateMergeThreshold'
> &
  Pick<
    PromptExploderSettingsActions,
    'setSessionLearnedRules' | 'setSessionLearnedTemplates' | 'updateSetting' | 'updateSettingsBulk'
  > &
  Pick<DocumentState, 'documentState' | 'promptText'> &
  Pick<DocumentActions, 'setDocumentState' | 'setManualBindings' | 'setSelectedSegmentId'> & {
    sessionLearnedRules: PromptValidationRule[];
    setDismissedBenchmarkSuggestionIds: React.Dispatch<React.SetStateAction<string[]>>;
    toast: Toast;
  };

export const useBenchmarkSuggestionActions = ({
  activeValidationScope,
  documentState,
  effectiveLearnedTemplates,
  learningDraft,
  promptExploderSettings,
  promptSettings,
  promptText,
  runtimeLearnedTemplates,
  runtimeValidationRules,
  sessionLearnedRules,
  setDismissedBenchmarkSuggestionIds,
  setDocumentState,
  setManualBindings,
  setSelectedSegmentId,
  setSessionLearnedRules,
  setSessionLearnedTemplates,
  settingsMap,
  templateMergeThreshold,
  toast,
  updateSetting,
  updateSettingsBulk,
}: BenchmarkSuggestionActionDependencies): {
  handleAddBenchmarkSuggestionRules: (
    suggestions: PromptExploderBenchmarkSuggestion[]
  ) => Promise<void>;
  handleAddBenchmarkSuggestionRule: (
    suggestion: PromptExploderBenchmarkSuggestion
  ) => Promise<void>;
} => {
  const handleAddBenchmarkSuggestionRules = useCallback(
    async (suggestions: PromptExploderBenchmarkSuggestion[]) => {
      const preparedSuggestions = prepareBenchmarkSuggestionsForApply(suggestions);
      const uniqueSuggestions = preparedSuggestions.uniqueSuggestions;
      if (uniqueSuggestions.length === 0) {
        toast('No benchmark suggestions selected.', { variant: 'info' });
        return;
      }
      const invalidSuggestions = [...preparedSuggestions.invalidSegmentTitles];
      const validSuggestions = preparedSuggestions.validSuggestions;
      if (validSuggestions.length === 0) {
        toast('No valid benchmark suggestions to add.', { variant: 'error' });
        return;
      }

      try {
        const basePromptSettings = promptSettings;
        const shouldUpsertTemplates = learningDraft.benchmarkSuggestionUpsertTemplates;
        const initialLearnedRules: PromptValidationRule[] = [
          ...(basePromptSettings.promptValidation.learnedRules ?? []),
          ...sessionLearnedRules,
        ];
        const benchmarkApply = applyBenchmarkSuggestions({
          suggestions: validSuggestions,
          initialRules: initialLearnedRules,
          initialTemplates: effectiveLearnedTemplates,
          shouldUpsertTemplates,
          templateMergeThreshold,
          minApprovalsForMatching: learningDraft.minApprovalsForMatching,
          autoActivateLearnedTemplates: learningDraft.autoActivateLearnedTemplates,
        });
        invalidSuggestions.push(...benchmarkApply.invalidSegmentTitles);

        const nextLearnedRules = benchmarkApply.nextLearnedRules;
        const nextTemplates = benchmarkApply.nextTemplates;
        const nextPromptSettings = {
          ...basePromptSettings,
          promptValidation: {
            ...basePromptSettings.promptValidation,
            learnedRules: nextLearnedRules,
          },
        };
        const nextExploderSettings = {
          ...promptExploderSettings,
          learning: {
            ...promptExploderSettings.learning,
            templates: nextTemplates,
          },
        };

        const writePayloads: Array<{ key: string; value: string }> = [
          {
            key: PROMPT_ENGINE_SETTINGS_KEY,
            value: serializeSetting(nextPromptSettings),
          },
        ];
        if (shouldUpsertTemplates) {
          writePayloads.push({
            key: PROMPT_EXPLODER_SETTINGS_KEY,
            value: serializeSetting(nextExploderSettings),
          });
        }
        const changedPayloads = writePayloads.filter(
          (payload) => settingsMap.get(payload.key) !== payload.value
        );
        if (changedPayloads.length === 1) {
          await updateSetting.mutateAsync(changedPayloads[0]!);
        } else if (changedPayloads.length > 1) {
          await updateSettingsBulk.mutateAsync(changedPayloads);
        }

        setSessionLearnedRules((previous) => {
          const byId = new Map(previous.map((rule) => [rule.id, rule]));
          benchmarkApply.appliedRules.forEach((rule) => {
            byId.set(rule.id, rule);
          });
          return [...byId.values()];
        });

        if (shouldUpsertTemplates) {
          setSessionLearnedTemplates((previous) => {
            const byId = new Map(previous.map((template) => [template.id, template]));
            nextTemplates.forEach((template) => {
              if (
                !benchmarkApply.touchedTemplateIds.includes(template.id) &&
                !byId.has(template.id)
              ) {
                return;
              }
              byId.set(template.id, template);
            });
            return [...byId.values()];
          });
        }

        setDismissedBenchmarkSuggestionIds((previous) => [
          ...new Set([
            ...previous,
            ...validSuggestions
              .map((suggestion) => suggestion.id)
              .filter((id): id is string => Boolean(id)),
          ]),
        ]);

        const sourcePrompt = promptText.trim() || documentState?.sourcePrompt || '';
        if (sourcePrompt) {
          const nextRuntimeRules = buildRuntimeRulesForReexplode({
            runtimeValidationRules,
            runtimeRuleProfile: learningDraft.runtimeRuleProfile,
            appliedRules: benchmarkApply.appliedRules,
          });
          const nextRuntimeTemplates = buildRuntimeTemplatesForReexplode({
            useUpdatedTemplates: shouldUpsertTemplates,
            runtimeLearnedTemplates,
            nextTemplates,
            learningEnabled: nextExploderSettings.learning.enabled,
            minApprovalsForMatching: nextExploderSettings.learning.minApprovalsForMatching,
            maxTemplates: nextExploderSettings.learning.maxTemplates,
          });
          const refreshed = reexplodePromptWithRuntime({
            prompt: sourcePrompt,
            validationRules: nextRuntimeRules,
            learnedTemplates: nextRuntimeTemplates,
            similarityThreshold: nextExploderSettings.learning.similarityThreshold,
            validationScope: activeValidationScope,
          });
          setManualBindings([]);
          setDocumentState(refreshed);
          setSelectedSegmentId((previous) =>
            resolveSegmentIdAfterReexplode({
              document: refreshed,
              strategy: { kind: 'preserve_id', previousId: previous ?? null },
            })
          );
        }

        const summary = `Benchmark suggestions applied: added ${benchmarkApply.addedCount}, updated ${benchmarkApply.updatedCount}.`;
        const templateSummary = shouldUpsertTemplates
          ? `learned templates touched ${benchmarkApply.touchedTemplateIds.length}.`
          : 'learned-template upsert is disabled.';
        if (invalidSuggestions.length > 0) {
          toast(`${summary} ${templateSummary} Skipped invalid ${invalidSuggestions.length}.`, {
            variant: 'warning',
          });
        } else {
          toast(`${summary} ${templateSummary}`, { variant: 'success' });
        }
      } catch (error) {
        logClientError(error);
        toast(
          error instanceof Error ? error.message : 'Failed to add benchmark suggestion rule(s).',
          { variant: 'error' }
        );
      }
    },
    [
      activeValidationScope,
      documentState,
      effectiveLearnedTemplates,
      learningDraft,
      promptExploderSettings,
      promptSettings,
      promptText,
      runtimeLearnedTemplates,
      runtimeValidationRules,
      sessionLearnedRules,
      setDismissedBenchmarkSuggestionIds,
      setDocumentState,
      setManualBindings,
      setSelectedSegmentId,
      setSessionLearnedRules,
      setSessionLearnedTemplates,
      settingsMap,
      templateMergeThreshold,
      toast,
      updateSetting,
      updateSettingsBulk,
    ]
  );

  const handleAddBenchmarkSuggestionRule = useCallback(
    async (suggestion: PromptExploderBenchmarkSuggestion) => {
      await handleAddBenchmarkSuggestionRules([suggestion]);
    },
    [handleAddBenchmarkSuggestionRules]
  );

  return {
    handleAddBenchmarkSuggestionRules,
    handleAddBenchmarkSuggestionRule,
  };
};
