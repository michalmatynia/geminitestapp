'use client';

import { useCallback } from 'react';

import { PROMPT_ENGINE_SETTINGS_KEY } from '@/shared/contracts/prompt-engine';
import type { Toast } from '@/shared/contracts/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  promptExploderBuildSegmentSampleText,
  type ApprovalDraft,
} from '../../helpers/segment-helpers';
import { buildManualLearnedRegexRuleDraft } from '../../rule-drafts';
import { upsertRegexLearnedRule } from '../../rule-learning';
import {
  buildRuntimeRulesForReexplode,
  buildRuntimeTemplatesForReexplode,
  reexplodePromptWithRuntime,
  resolveSegmentIdAfterReexplode,
} from '../../runtime-refresh';
import { PROMPT_EXPLODER_SETTINGS_KEY } from '../../settings';
import { upsertLearnedTemplate } from '../../template-learning';
import type { DocumentActions, DocumentState } from '../DocumentContext';
import type { PromptExploderSettingsActions, PromptExploderSettingsState } from '../SettingsContext';

export const useSegmentPatternApproval = ({
  approvalDraft,
  activeValidationScope,
  documentState,
  effectiveLearnedTemplates,
  learningDraft,
  promptExploderSettings,
  promptSettings,
  promptText,
  runtimeLearnedTemplates,
  runtimeValidationRules,
  selectedSegment,
  settingsMap,
  templateMergeThreshold,
  toast,
  setDocumentState,
  setManualBindings,
  setSelectedSegmentId,
  setSessionLearnedRules,
  setSessionLearnedTemplates,
  updateSetting,
  updateSettingsBulk,
}: {
  approvalDraft: ApprovalDraft;
  activeValidationScope: PromptExploderSettingsState['activeValidationScope'];
  documentState: DocumentState['documentState'];
  effectiveLearnedTemplates: PromptExploderSettingsState['effectiveLearnedTemplates'];
  learningDraft: PromptExploderSettingsState['learningDraft'];
  promptExploderSettings: PromptExploderSettingsState['promptExploderSettings'];
  promptSettings: PromptExploderSettingsState['promptSettings'];
  promptText: DocumentState['promptText'];
  runtimeLearnedTemplates: PromptExploderSettingsState['runtimeLearnedTemplates'];
  runtimeValidationRules: PromptExploderSettingsState['runtimeValidationRules'];
  selectedSegment: DocumentState['selectedSegment'];
  settingsMap: PromptExploderSettingsState['settingsMap'];
  templateMergeThreshold: PromptExploderSettingsState['templateMergeThreshold'];
  toast: Toast;
  setDocumentState: DocumentActions['setDocumentState'];
  setManualBindings: DocumentActions['setManualBindings'];
  setSelectedSegmentId: DocumentActions['setSelectedSegmentId'];
  setSessionLearnedRules: PromptExploderSettingsActions['setSessionLearnedRules'];
  setSessionLearnedTemplates: PromptExploderSettingsActions['setSessionLearnedTemplates'];
  updateSetting: PromptExploderSettingsActions['updateSetting'];
  updateSettingsBulk: PromptExploderSettingsActions['updateSettingsBulk'];
}) =>
  useCallback(async () => {
    if (!selectedSegment) {
      toast('Select a segment before approving a pattern.', { variant: 'info' });
      return;
    }

    if (!approvalDraft.rulePattern.trim()) {
      toast('Rule pattern cannot be empty.', { variant: 'error' });
      return;
    }

    try {
      void new RegExp(approvalDraft.rulePattern, 'mi');
    } catch (error) {
      logClientError(error);
      toast(
        error instanceof Error
          ? `Invalid regex pattern: ${error.message}`
          : 'Invalid regex pattern.',
        { variant: 'error' }
      );
      return;
    }

    try {
      const now = new Date().toISOString();
      const segmentSampleText = promptExploderBuildSegmentSampleText(selectedSegment);
      const segmentLearningSource = `${selectedSegment.title || ''} ${segmentSampleText}`.trim();
      const templateUpsert = upsertLearnedTemplate({
        templates: effectiveLearnedTemplates,
        segmentType: approvalDraft.ruleSegmentType,
        title: selectedSegment.title || '',
        sourceText: segmentLearningSource,
        sampleText: segmentSampleText,
        similarityThreshold: templateMergeThreshold,
        minApprovalsForMatching: learningDraft.minApprovalsForMatching,
        autoActivateLearnedTemplates: learningDraft.autoActivateLearnedTemplates,
        mergeMode: approvalDraft.templateMergeMode,
        targetTemplateId: approvalDraft.templateTargetId,
        now,
        createTemplateId: ({ segmentType, existingTemplateIds }) => {
          let nextId = `template_${segmentType}_${Date.now().toString(36)}`;
          while (existingTemplateIds.has(nextId)) {
            nextId = `${nextId}_x`;
          }
          return nextId;
        },
      });
      if (!templateUpsert.ok) {
        toast(templateUpsert.errorMessage, { variant: 'error' });
        return;
      }

      const { nextTemplate, nextTemplates, mergeMessage } = templateUpsert;
      const learnedRuleId = `segment.learned.${approvalDraft.ruleSegmentType}.${nextTemplate.id}`;
      const learnedRuleDraft = buildManualLearnedRegexRuleDraft({
        id: learnedRuleId,
        segmentTitle: selectedSegment.title || '',
        segmentType: approvalDraft.ruleSegmentType,
        sequence: 1000 + nextTemplates.length,
        ruleTitle: approvalDraft.ruleTitle,
        rulePattern: approvalDraft.rulePattern,
        priority: approvalDraft.rulePriority,
        confidenceBoost: approvalDraft.ruleConfidenceBoost,
        treatAsHeading: approvalDraft.ruleTreatAsHeading,
      });

      const learnedRules = promptSettings.promptValidation.learnedRules ?? [];
      const learnedRuleUpsert = upsertRegexLearnedRule({
        rules: learnedRules,
        incomingRule: learnedRuleDraft,
      });
      const nextPromptSettings = {
        ...promptSettings,
        promptValidation: {
          ...promptSettings.promptValidation,
          learnedRules: learnedRuleUpsert.nextRules,
        },
      };
      const nextExploderSettings = {
        ...promptExploderSettings,
        learning: {
          ...promptExploderSettings.learning,
          templates: nextTemplates,
        },
      };
      const writePayloads = [
        {
          key: PROMPT_ENGINE_SETTINGS_KEY,
          value: serializeSetting(nextPromptSettings),
        },
        {
          key: PROMPT_EXPLODER_SETTINGS_KEY,
          value: serializeSetting(nextExploderSettings),
        },
      ];
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
        byId.set(learnedRuleUpsert.nextRule.id, learnedRuleUpsert.nextRule);
        return [...byId.values()];
      });
      setSessionLearnedTemplates((previous) => {
        const byId = new Map(previous.map((template) => [template.id, template]));
        byId.set(nextTemplate.id, nextTemplate);
        return [...byId.values()];
      });

      const runtimeTemplatesAfterApproval = buildRuntimeTemplatesForReexplode({
        useUpdatedTemplates: true,
        runtimeLearnedTemplates,
        nextTemplates,
        learningEnabled: nextExploderSettings.learning.enabled,
        minApprovalsForMatching: nextExploderSettings.learning.minApprovalsForMatching,
        maxTemplates: nextExploderSettings.learning.maxTemplates,
      });
      const runtimeRulesAfterApproval = buildRuntimeRulesForReexplode({
        runtimeValidationRules,
        runtimeRuleProfile: learningDraft.runtimeRuleProfile,
        appliedRules: [learnedRuleUpsert.nextRule],
      });
      const sourcePrompt = promptText.trim() || documentState?.sourcePrompt || '';
      if (sourcePrompt) {
        const refreshed = reexplodePromptWithRuntime({
          prompt: sourcePrompt,
          validationRules: runtimeRulesAfterApproval,
          learnedTemplates: runtimeTemplatesAfterApproval,
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

      const messageParts = [
        `Pattern approved: ${learnedRuleUpsert.nextRule.title}.`,
        mergeMessage ? `Template: ${mergeMessage}.` : null,
      ].filter(Boolean);
      toast(messageParts.join(' '), { variant: 'success' });
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to approve segment pattern.', {
        variant: 'error',
      });
    }
  }, [
    approvalDraft,
    activeValidationScope,
    documentState?.sourcePrompt,
    effectiveLearnedTemplates,
    learningDraft,
    promptExploderSettings,
    promptSettings,
    promptText,
    runtimeLearnedTemplates,
    runtimeValidationRules,
    selectedSegment,
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
  ]);
