'use client';

 
 
 
 
 

import React, { createContext, useCallback, useEffect, useMemo, useState, useContext } from 'react';

import { PROMPT_ENGINE_SETTINGS_KEY } from '@/features/prompt-engine/settings';
import { useToast } from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  reorderListItemsForDrop,
  reorderSegmentsForDrop,
  resolveDropPosition,
} from '../helpers/drag-reorder';
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
import { useDocumentState, useDocumentActions } from './hooks/useDocument';
import { useSettingsState, useSettingsActions } from './hooks/useSettings';

import type {
  PromptExploderLearnedTemplate,
  PromptExploderSegment,
} from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

// --- Granular State Interfaces ---

export interface SegmentEditorReorderState {
  draggingSegmentId: string | null;
  segmentDropTargetId: string | null;
  segmentDropPosition: 'before' | 'after' | null;
  draggingListItemIndex: number | null;
  listItemDropTargetIndex: number | null;
  listItemDropPosition: 'before' | 'after' | null;
}

export interface SegmentEditorPatternsState {
  approvalDraft: ApprovalDraft;
  matchedRuleDetails: Array<{
    id: string;
    title: string;
    sequenceLabel?: string;
    segmentType: string | null;
    priority: number;
    confidenceBoost: number;
    treatAsHeading: boolean;
  }>;
  similarTemplateCandidates: Array<{
    id: string;
    title: string;
    segmentType: PromptExploderLearnedTemplate['segmentType'];
    score: number;
    approvals: number;
    state: PromptExploderLearnedTemplate['state'];
    mergeEligible: boolean;
  }>;
  templateTargetOptions: Array<{ value: string; label: string }>;
}

export interface SegmentEditorState extends SegmentEditorReorderState, SegmentEditorPatternsState {}

export interface SegmentEditorActions {
  setDraggingSegmentId: React.Dispatch<React.SetStateAction<string | null>>;
  setSegmentDropTargetId: React.Dispatch<React.SetStateAction<string | null>>;
  setSegmentDropPosition: React.Dispatch<React.SetStateAction<'before' | 'after' | null>>;
  setDraggingListItemIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setListItemDropTargetIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setListItemDropPosition: React.Dispatch<React.SetStateAction<'before' | 'after' | null>>;
  setApprovalDraft: React.Dispatch<React.SetStateAction<ApprovalDraft>>;
  handleSegmentDragStart: (segmentId: string) => void;
  handleSegmentDragEnd: () => void;
  handleSegmentDragOver: (event: React.DragEvent, targetSegmentId: string) => void;
  handleSegmentDrop: (event: React.DragEvent, targetSegmentId: string) => void;
  handleListItemDragStart: (index: number) => void;
  handleListItemDragEnd: () => void;
  handleListItemDragOver: (event: React.DragEvent, targetIndex: number) => void;
  handleListItemDrop: (event: React.DragEvent, targetIndex: number) => void;
  addSegmentRelative: (segmentId: string, position: 'before' | 'after') => void;
  removeSegment: (segmentId: string) => void;
  splitSegment: (segmentId: string, selectionStart: number, selectionEnd: number) => void;
  mergeSegmentWithPrevious: (segmentId: string) => void;
  mergeSegmentWithNext: (segmentId: string) => void;
  handleApproveSelectedSegmentPattern: () => Promise<void>;
}

// ── Contexts ─────────────────────────────────────────────────────────────────

const ReorderContext = createContext<SegmentEditorReorderState | null>(null);
const PatternsContext = createContext<SegmentEditorPatternsState | null>(null);

const SegmentEditorStateContext = createContext<SegmentEditorState | null>(null);
const SegmentEditorActionsContext = createContext<SegmentEditorActions | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function SegmentEditorProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
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
  const {
    setSessionLearnedRules,
    setSessionLearnedTemplates,
    updateSetting,
    updateSettingsBulk,
  } = useSettingsActions();
  const {
    documentState,
    selectedSegment,
    promptText,
  } = useDocumentState();
  const {
    replaceSegments,
    updateSegment,
    setDocumentState,
    setManualBindings,
    setSelectedSegmentId,
  } = useDocumentActions();

  const [draggingSegmentId, setDraggingSegmentId] = useState<string | null>(null);
  const [segmentDropTargetId, setSegmentDropTargetId] = useState<string | null>(null);
  const [segmentDropPosition, setSegmentDropPosition] = useState<'before' | 'after' | null>(null);
  const [draggingListItemIndex, setDraggingListItemIndex] = useState<number | null>(null);
  const [listItemDropTargetIndex, setListItemDropTargetIndex] = useState<number | null>(null);
  const [listItemDropPosition, setListItemDropPosition] = useState<'before' | 'after' | null>(null);
  const [approvalDraft, setApprovalDraft] = useState(promptExploderCreateApprovalDraftFromSegment(null));

  // ── Sync approval draft ────────────────────────────────────────────────────

  useEffect(() => {
    setApprovalDraft(promptExploderCreateApprovalDraftFromSegment(selectedSegment));
  }, [selectedSegment?.id]);

  // ── Sync drag state ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!draggingSegmentId) return;
    const segmentIds = new Set((documentState?.segments ?? []).map((s: PromptExploderSegment) => s.id));
    if (segmentIds.has(draggingSegmentId)) return;
    setDraggingSegmentId(null);
    setSegmentDropTargetId(null);
    setSegmentDropPosition(null);
  }, [documentState?.segments, draggingSegmentId]);

  useEffect(() => {
    if (!selectedSegment) {
      setDraggingListItemIndex(null);
      setListItemDropTargetIndex(null);
      setListItemDropPosition(null);
      return;
    }
    if (draggingListItemIndex === null) return;
    if (draggingListItemIndex < selectedSegment.listItems.length) return;
    setDraggingListItemIndex(null);
    setListItemDropTargetIndex(null);
    setListItemDropPosition(null);
  }, [selectedSegment, draggingListItemIndex]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const matchedRuleDetails = useMemo(() => {
    if (!selectedSegment) return [];
    const byId = new Map(effectiveRules.map((rule) => [rule.id, rule]));
    return selectedSegment.matchedPatternIds.map((patternId: string, index: number) => {
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

  const similarTemplateCandidates = useMemo(() => {
    if (!selectedSegment)
      return [] as Array<{
                  id: string;
                  title: string;
                  segmentType: PromptExploderLearnedTemplate['segmentType'];
                  score: number;
                  approvals: number;
                  state: PromptExploderLearnedTemplate['state'];
                  mergeEligible: boolean;
                  sameType: boolean;
                                normalizedTitle?: string;
                              }>;
    const sourceText = `${selectedSegment.title || ''} ${promptExploderBuildSegmentSampleText(selectedSegment)}`.trim();
    const normalizedSelectedTitle = normalizeLearningText(selectedSegment.title || '');    return effectiveLearnedTemplates
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
      })      .filter(
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
  }, [approvalDraft.ruleSegmentType, effectiveLearnedTemplates, selectedSegment, templateMergeThreshold]);

  const templateTargetOptions = useMemo(
    () => {
      const normalizeApprovals = (val: unknown): number => {
        if (typeof val === 'number') return val;
        return 0;
      };

      return effectiveLearnedTemplates
        .filter((template) => template.segmentType === approvalDraft.ruleSegmentType)
        .sort((left, right) => {
          const leftApprovals = normalizeApprovals(left.approvals);
          const rightApprovals = normalizeApprovals(right.approvals);
          if (rightApprovals !== leftApprovals) return rightApprovals - leftApprovals;
          return (String(right.updatedAt || '')).localeCompare(String(left.updatedAt || ''));
        })
        .slice(0, 80)
        .map((template) => ({
          value: template.id,
          label: `${template.title} (${template.state}, ${normalizeApprovals(template.approvals)})`,
        }));
    },
    [approvalDraft.ruleSegmentType, effectiveLearnedTemplates]
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleSegmentDragStart = useCallback((segmentId: string) => {
    setDraggingSegmentId(segmentId);
    setSegmentDropTargetId(null);
    setSegmentDropPosition(null);
  }, []);

  const handleSegmentDragEnd = useCallback(() => {
    setDraggingSegmentId(null);
    setSegmentDropTargetId(null);
    setSegmentDropPosition(null);
  }, []);

  const handleSegmentDragOver = useCallback(
    (event: React.DragEvent, targetSegmentId: string) => {
      event.preventDefault();
      const target = event.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const pos = resolveDropPosition(event.clientY, rect.top, rect.height);
      setSegmentDropTargetId(targetSegmentId);
      setSegmentDropPosition(pos);
    },
    []
  );

  const handleSegmentDrop = useCallback(
    (event: React.DragEvent, targetSegmentId: string) => {
      event.preventDefault();
      if (!draggingSegmentId || !documentState) return;
      const target = event.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const pos = resolveDropPosition(event.clientY, rect.top, rect.height);
      const reordered = reorderSegmentsForDrop(
        documentState.segments,
        draggingSegmentId,
        targetSegmentId,
        pos
      );
      replaceSegments(reordered);
      setDraggingSegmentId(null);
      setSegmentDropTargetId(null);
      setSegmentDropPosition(null);
    },
    [documentState, draggingSegmentId, replaceSegments]
  );

  const handleListItemDragStart = useCallback((index: number) => {
    setDraggingListItemIndex(index);
    setListItemDropTargetIndex(null);
    setListItemDropPosition(null);
  }, []);

  const handleListItemDragEnd = useCallback(() => {
    setDraggingListItemIndex(null);
    setListItemDropTargetIndex(null);
    setListItemDropPosition(null);
  }, []);

  const handleListItemDragOver = useCallback(
    (event: React.DragEvent, targetIndex: number) => {
      event.preventDefault();
      const target = event.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const pos = resolveDropPosition(event.clientY, rect.top, rect.height);
      setListItemDropTargetIndex(targetIndex);
      setListItemDropPosition(pos);
    },
    []
  );

  const handleListItemDrop = useCallback(
    (event: React.DragEvent, targetIndex: number) => {
      event.preventDefault();
      if (draggingListItemIndex === null || !selectedSegment) return;
      const target = event.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const pos = resolveDropPosition(event.clientY, rect.top, rect.height);
      const reordered = reorderListItemsForDrop(
        selectedSegment.listItems,
        draggingListItemIndex,
        targetIndex,
        pos
      );
      updateSegment(selectedSegment.id, (current) => ({
        ...current,
        listItems: reordered,
      }));
      setDraggingListItemIndex(null);
      setListItemDropTargetIndex(null);
      setListItemDropPosition(null);
    },
    [draggingListItemIndex, selectedSegment, updateSegment]
  );

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

  const handleApproveSelectedSegmentPattern = useCallback(async () => {
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
        title: selectedSegment.title || '',        sourceText: segmentLearningSource,
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
        segmentType: approvalDraft.ruleSegmentType,        sequence: 1000 + nextTemplates.length,
        ruleTitle: approvalDraft.ruleTitle,
        rulePattern: approvalDraft.rulePattern,
        priority: approvalDraft.rulePriority,
        confidenceBoost: approvalDraft.ruleConfidenceBoost,
        treatAsHeading: approvalDraft.ruleTreatAsHeading,
      });

      const basePromptSettings = promptSettings;
      const learnedRules = basePromptSettings.promptValidation.learnedRules ?? [];
      const learnedRuleUpsert = upsertRegexLearnedRule({
        rules: learnedRules,
        incomingRule: learnedRuleDraft,
      });
      const nextLearnedRules = learnedRuleUpsert.nextRules;

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
      toast(
        error instanceof Error ? error.message : 'Failed to approve segment pattern.',
        { variant: 'error' }
      );
    }
  }, [
    approvalDraft,
    documentState?.sourcePrompt,
    activeValidationScope,
    effectiveLearnedTemplates,
    learningDraft,
    promptExploderSettings,
    promptSettings,
    promptText,
    runtimeLearnedTemplates,
    runtimeValidationRules,
    settingsMap,
    selectedSegment,
    setDocumentState,
    setManualBindings,
    setSelectedSegmentId,
    setSessionLearnedRules,
    setSessionLearnedTemplates,
    templateMergeThreshold,
    toast,
    updateSetting,
    updateSettingsBulk,
  ]);

  // ── Memoized context values ────────────────────────────────────────────────

  const reorderValue = useMemo<SegmentEditorReorderState>(() => ({
    draggingSegmentId,
    segmentDropTargetId,
    segmentDropPosition,
    draggingListItemIndex,
    listItemDropTargetIndex,
    listItemDropPosition,
  }), [draggingSegmentId, segmentDropTargetId, segmentDropPosition, draggingListItemIndex, listItemDropTargetIndex, listItemDropPosition]);

  const patternsValue = useMemo<SegmentEditorPatternsState>(() => ({
    approvalDraft,
    matchedRuleDetails,
    similarTemplateCandidates,
    templateTargetOptions,
  }), [approvalDraft, matchedRuleDetails, similarTemplateCandidates, templateTargetOptions]);

  const stateValue = useMemo<SegmentEditorState>(
    () => ({
      ...reorderValue,
      ...patternsValue,
    }),
    [reorderValue, patternsValue]
  );

  const actionsValue = useMemo<SegmentEditorActions>(
    () => ({
      setDraggingSegmentId,
      setSegmentDropTargetId,
      setSegmentDropPosition,
      setDraggingListItemIndex,
      setListItemDropTargetIndex,
      setListItemDropPosition,
      setApprovalDraft,
      handleSegmentDragStart,
      handleSegmentDragEnd,
      handleSegmentDragOver,
      handleSegmentDrop,
      handleListItemDragStart,
      handleListItemDragEnd,
      handleListItemDragOver,
      handleListItemDrop,
      addSegmentRelative,
      removeSegment,
      splitSegment,
      mergeSegmentWithPrevious,
      mergeSegmentWithNext,
      handleApproveSelectedSegmentPattern,
    }),
    [
      handleSegmentDragStart,
      handleSegmentDragEnd,
      handleSegmentDragOver,
      handleSegmentDrop,
      handleListItemDragStart,
      handleListItemDragEnd,
      handleListItemDragOver,
      handleListItemDrop,
      addSegmentRelative,
      removeSegment,
      splitSegment,
      mergeSegmentWithPrevious,
      mergeSegmentWithNext,
      handleApproveSelectedSegmentPattern,
    ]
  );

  return (
    <ReorderContext.Provider value={reorderValue}>
      <PatternsContext.Provider value={patternsValue}>
        <SegmentEditorStateContext.Provider value={stateValue}>
          <SegmentEditorActionsContext.Provider value={actionsValue}>
            {children}
          </SegmentEditorActionsContext.Provider>
        </SegmentEditorStateContext.Provider>
      </PatternsContext.Provider>
    </ReorderContext.Provider>
  );
}

export function useSegmentEditorReorder(): SegmentEditorReorderState {
  const context = useContext(ReorderContext);
  if (!context) throw new Error('useSegmentEditorReorder must be used within SegmentEditorProvider');
  return context;
}

export function useSegmentEditorPatterns(): SegmentEditorPatternsState {
  const context = useContext(PatternsContext);
  if (!context) throw new Error('useSegmentEditorPatterns must be used within SegmentEditorProvider');
  return context;
}

export { SegmentEditorStateContext, SegmentEditorActionsContext };
