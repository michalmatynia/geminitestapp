'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';

import { PROMPT_ENGINE_SETTINGS_KEY } from '@/shared/contracts/prompt-engine';
import type { LabelValueOptionDto, Toast } from '@/shared/contracts/ui';
import { useToast } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { serializeSetting } from '@/shared/utils/settings-json';

import { promptExploderClampNumber } from '../helpers/formatting';
import {
  promptExploderBuildSegmentSampleText,
  promptExploderCreateApprovalDraftFromSegment,
  type ApprovalDraft,
} from '../helpers/segment-helpers';
import {
  promptExploderInsertSegmentRelative,
  promptExploderMergeSegment,
  promptExploderRemoveSegmentById,
  promptExploderSplitSegmentByRange,
} from '../helpers/segment-transforms';
import { buildManualLearnedRegexRuleDraft } from '../rule-drafts';
import { upsertRegexLearnedRule } from '../rule-learning';
import {
  buildRuntimeRulesForReexplode,
  buildRuntimeTemplatesForReexplode,
  reexplodePromptWithRuntime,
  resolveSegmentIdAfterReexplode,
} from '../runtime-refresh';
import { PROMPT_EXPLODER_SETTINGS_KEY } from '../settings';
import {
  normalizeLearningText,
  templateSimilarityScore,
  upsertLearnedTemplate,
} from '../template-learning';
import {
  useDocumentActions,
  useDocumentState,
  type DocumentActions,
  type DocumentState,
} from './DocumentContext';
import {
  useSettingsActions,
  useSettingsState,
  type PromptExploderSettingsActions,
  type PromptExploderSettingsState,
} from './SettingsContext';

import type { PromptExploderLearnedTemplate, PromptExploderSegment } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SegmentEditorMatchedRuleDetail {
  id: string;
  title: string;
  sequenceLabel?: string;
  segmentType: string | null;
  priority: number;
  confidenceBoost: number;
  treatAsHeading: boolean;
}

export interface SegmentEditorTemplateCandidate {
  id: string;
  title: string;
  segmentType: PromptExploderLearnedTemplate['segmentType'];
  score: number;
  approvals: number;
  state: PromptExploderLearnedTemplate['state'];
  mergeEligible: boolean;
}

export interface SegmentEditorPatternsState {
  approvalDraft: ApprovalDraft;
  matchedRuleDetails: SegmentEditorMatchedRuleDetail[];
  similarTemplateCandidates: SegmentEditorTemplateCandidate[];
  templateTargetOptions: LabelValueOptionDto[];
}

export interface SegmentEditorState extends SegmentEditorPatternsState {}

export interface SegmentEditorActions {
  setApprovalDraft: Dispatch<SetStateAction<ApprovalDraft>>;
  addSegmentRelative: (segmentId: string, position: 'before' | 'after') => void;
  removeSegment: (segmentId: string) => void;
  splitSegment: (segmentId: string, selectionStart: number, selectionEnd: number) => void;
  mergeSegmentWithPrevious: (segmentId: string) => void;
  mergeSegmentWithNext: (segmentId: string) => void;
  handleApproveSelectedSegmentPattern: () => Promise<void>;
}

type SegmentEditorPatternState = Omit<SegmentEditorPatternsState, 'approvalDraft'>;

const useSegmentEditorPatterns = ({
  approvalDraft,
  effectiveRules,
  effectiveLearnedTemplates,
  selectedSegment,
  templateMergeThreshold,
}: {
  approvalDraft: ApprovalDraft;
  effectiveRules: PromptExploderSettingsState['effectiveRules'];
  effectiveLearnedTemplates: PromptExploderSettingsState['effectiveLearnedTemplates'];
  selectedSegment: DocumentState['selectedSegment'];
  templateMergeThreshold: PromptExploderSettingsState['templateMergeThreshold'];
}): SegmentEditorPatternState => {
  const matchedRuleDetails = useMemo<SegmentEditorMatchedRuleDetail[]>(() => {
    if (!selectedSegment) return [];
    const byId = new Map(effectiveRules.map((rule) => [rule.id, rule]));
    return selectedSegment.matchedPatternIds.map((patternId, index) => {
      const rule = byId.get(patternId);
      const storedLabel = selectedSegment.matchedPatternLabels?.[index]?.trim() ?? '';
      const sequenceLabel = rule?.sequenceGroupLabel?.trim() ?? '';
      return {
        id: patternId,
        title: (storedLabel || rule?.title) ?? patternId,
        ...(sequenceLabel ? { sequenceLabel } : {}),
        segmentType: rule?.promptExploderSegmentType ?? null,
        priority: rule?.promptExploderPriority ?? 0,
        confidenceBoost: rule?.promptExploderConfidenceBoost ?? 0,
        treatAsHeading: rule?.promptExploderTreatAsHeading ?? false,
      };
    });
  }, [effectiveRules, selectedSegment]);

  const similarTemplateCandidates = useMemo<SegmentEditorTemplateCandidate[]>(() => {
    if (!selectedSegment) return [];
    const sourceText =
      `${selectedSegment.title || ''} ${promptExploderBuildSegmentSampleText(selectedSegment)}`.trim();
    const normalizedSelectedTitle = normalizeLearningText(selectedSegment.title || '');
    return effectiveLearnedTemplates
      .map((template) => {
        const score = templateSimilarityScore(sourceText, template);
        const sameType = template.segmentType === approvalDraft.ruleSegmentType;
        const mergeEligible = sameType && score >= templateMergeThreshold;
        return {
          id: template.id,
          title: template.title || 'Untitled',
          segmentType: template.segmentType,
          score,
          approvals: typeof template.approvals === 'number' ? template.approvals : 0,
          state: (template.state as string) || 'candidate',
          mergeEligible,
          sameType,
          normalizedTitle: template.normalizedTitle,
        };
      })
      .filter(
        (candidate) =>
          candidate.score >= promptExploderClampNumber(templateMergeThreshold - 0.1, 0.3, 0.95) ||
          candidate.normalizedTitle === normalizedSelectedTitle
      )
      .sort((left, right) => {
        if (Number(right.mergeEligible) !== Number(left.mergeEligible)) {
          return Number(right.mergeEligible) - Number(left.mergeEligible);
        }
        if (right.score !== left.score) return right.score - left.score;
        if (right.approvals !== left.approvals) return right.approvals - left.approvals;
        return right.id.localeCompare(left.id);
      })
      .slice(0, 6)
      .map(({ sameType: _sameType, normalizedTitle: _normalizedTitle, ...candidate }) => candidate);
  }, [
    approvalDraft.ruleSegmentType,
    effectiveLearnedTemplates,
    selectedSegment,
    templateMergeThreshold,
  ]);

  const templateTargetOptions = useMemo<LabelValueOptionDto[]>(() => {
    const normalizeApprovals = (value: unknown): number => {
      if (typeof value === 'number') return value;
      return 0;
    };

    return effectiveLearnedTemplates
      .filter((template) => template.segmentType === approvalDraft.ruleSegmentType)
      .sort((left, right) => {
        const leftApprovals = normalizeApprovals(left.approvals);
        const rightApprovals = normalizeApprovals(right.approvals);
        if (rightApprovals !== leftApprovals) return rightApprovals - leftApprovals;
        return String(right.updatedAt || '').localeCompare(String(left.updatedAt || ''));
      })
      .slice(0, 80)
      .map((template) => ({
        value: template.id,
        label: `${template.title} (${template.state}, ${normalizeApprovals(template.approvals)})`,
      }));
  }, [approvalDraft.ruleSegmentType, effectiveLearnedTemplates]);

  return {
    matchedRuleDetails,
    similarTemplateCandidates,
    templateTargetOptions,
  };
};

const useSegmentPatternApproval = ({
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

// ── Contexts ─────────────────────────────────────────────────────────────────

const PatternsContext = createContext<SegmentEditorPatternsState | null>(null);

const SegmentEditorStateContext = createContext<SegmentEditorState | null>(null);
const SegmentEditorActionsContext = createContext<SegmentEditorActions | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function SegmentEditorProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { toast } = useToast();

  const {
    settingsMap,
    activeValidationScope,
    effectiveRules,
    effectiveLearnedTemplates,
    templateMergeThreshold,
    learningDraft,
    promptSettings,
    promptExploderSettings,
    runtimeValidationRules,
    runtimeLearnedTemplates,
  } = useSettingsState();
  const { setSessionLearnedRules, setSessionLearnedTemplates, updateSetting, updateSettingsBulk } =
    useSettingsActions();
  const { documentState, selectedSegment, promptText } = useDocumentState();
  const { replaceSegments, setDocumentState, setManualBindings, setSelectedSegmentId } =
    useDocumentActions();

  const [approvalDraft, setApprovalDraft] = useState(
    promptExploderCreateApprovalDraftFromSegment(null)
  );

  // ── Sync approval draft ────────────────────────────────────────────────────

  useEffect(() => {
    setApprovalDraft(promptExploderCreateApprovalDraftFromSegment(selectedSegment));
  }, [selectedSegment?.id]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const { matchedRuleDetails, similarTemplateCandidates, templateTargetOptions } =
    useSegmentEditorPatterns({
      approvalDraft,
      effectiveRules,
      effectiveLearnedTemplates,
      selectedSegment,
      templateMergeThreshold,
    });

  // ── Actions ────────────────────────────────────────────────────────────────

  const applySegmentEditResult = useCallback(
    (result: { segments: PromptExploderSegment[]; selectedSegmentId: string | null }) => {
      replaceSegments(result.segments);
      setSelectedSegmentId(result.selectedSegmentId);
    },
    [replaceSegments, setSelectedSegmentId]
  );

  const addSegmentRelative = useCallback(
    (segmentId: string, position: 'before' | 'after') => {
      if (!documentState) return;
      const targetSegment =
        documentState.segments.find((segment: PromptExploderSegment) => segment.id === segmentId) ??
        null;
      const result = promptExploderInsertSegmentRelative({
        segments: documentState.segments,
        targetSegmentId: segmentId,
        position,
        template: targetSegment,
      });
      applySegmentEditResult(result);
      toast('Segment added.', { variant: 'success' });
    },
    [applySegmentEditResult, documentState, toast]
  );

  const removeSegment = useCallback(
    (segmentId: string) => {
      if (!documentState) return;
      const result = promptExploderRemoveSegmentById({
        segments: documentState.segments,
        segmentId,
      });
      applySegmentEditResult(result);
      toast('Segment removed.', { variant: 'success' });
    },
    [applySegmentEditResult, documentState, toast]
  );

  const splitSegment = useCallback(
    (segmentId: string, selectionStart: number, selectionEnd: number) => {
      if (!documentState) return;
      const result = promptExploderSplitSegmentByRange({
        segments: documentState.segments,
        segmentId,
        selectionStart,
        selectionEnd,
      });
      if (result.segments === documentState.segments) {
        toast('Select text (or place caret) in a text segment before splitting.', {
          variant: 'info',
        });
        return;
      }
      applySegmentEditResult(result);
      toast('Segment split.', { variant: 'success' });
    },
    [applySegmentEditResult, documentState, toast]
  );

  const mergeSegmentWithPrevious = useCallback(
    (segmentId: string) => {
      if (!documentState) return;
      const result = promptExploderMergeSegment({
        segments: documentState.segments,
        segmentId,
        direction: 'previous',
      });
      if (result.segments === documentState.segments) {
        toast('No previous segment to merge with.', { variant: 'info' });
        return;
      }
      applySegmentEditResult(result);
      toast('Merged with previous segment.', { variant: 'success' });
    },
    [applySegmentEditResult, documentState, toast]
  );

  const mergeSegmentWithNext = useCallback(
    (segmentId: string) => {
      if (!documentState) return;
      const result = promptExploderMergeSegment({
        segments: documentState.segments,
        segmentId,
        direction: 'next',
      });
      if (result.segments === documentState.segments) {
        toast('No next segment to merge with.', { variant: 'info' });
        return;
      }
      applySegmentEditResult(result);
      toast('Merged with next segment.', { variant: 'success' });
    },
    [applySegmentEditResult, documentState, toast]
  );

  const handleApproveSelectedSegmentPattern = useSegmentPatternApproval({
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
    settingsMap,
    selectedSegment,
    templateMergeThreshold,
    toast,
    setDocumentState,
    setManualBindings,
    setSelectedSegmentId,
    setSessionLearnedRules,
    setSessionLearnedTemplates,
    updateSetting,
    updateSettingsBulk,
  });

  // ── Memoized context values ────────────────────────────────────────────────

  const patternsValue = useMemo<SegmentEditorPatternsState>(
    () => ({
      approvalDraft,
      matchedRuleDetails,
      similarTemplateCandidates,
      templateTargetOptions,
    }),
    [approvalDraft, matchedRuleDetails, similarTemplateCandidates, templateTargetOptions]
  );

  const stateValue = useMemo<SegmentEditorState>(
    () => ({
      ...patternsValue,
    }),
    [patternsValue]
  );

  const actionsValue = useMemo<SegmentEditorActions>(
    () => ({
      setApprovalDraft,
      addSegmentRelative,
      removeSegment,
      splitSegment,
      mergeSegmentWithPrevious,
      mergeSegmentWithNext,
      handleApproveSelectedSegmentPattern,
    }),
    [
      addSegmentRelative,
      removeSegment,
      splitSegment,
      mergeSegmentWithPrevious,
      mergeSegmentWithNext,
      handleApproveSelectedSegmentPattern,
    ]
  );

  return (
    <PatternsContext.Provider value={patternsValue}>
      <SegmentEditorStateContext.Provider value={stateValue}>
        <SegmentEditorActionsContext.Provider value={actionsValue}>
          {children}
        </SegmentEditorActionsContext.Provider>
      </SegmentEditorStateContext.Provider>
    </PatternsContext.Provider>
  );
}

// ── Hook exports ─────────────────────────────────────────────────────────────

export const useSegmentEditorState = (): SegmentEditorState => {
  const ctx = useContext(SegmentEditorStateContext);
  if (!ctx) throw new Error('useSegmentEditorState must be used within SegmentEditorProvider');
  return ctx;
};

export const useSegmentEditorActions = (): SegmentEditorActions => {
  const ctx = useContext(SegmentEditorActionsContext);
  if (!ctx) throw new Error('useSegmentEditorActions must be used within SegmentEditorProvider');
  return ctx;
};

export { SegmentEditorStateContext, SegmentEditorActionsContext };
