'use client';

import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useToast } from '@/shared/ui';

import {
  promptExploderCreateApprovalDraftFromSegment,
} from '../helpers/segment-helpers';
import {
  promptExploderInsertSegmentRelative,
  promptExploderMergeSegment,
  promptExploderRemoveSegmentById,
  promptExploderSplitSegmentByRange,
} from '../helpers/segment-transforms';
import { useDocumentState, useDocumentActions } from './hooks/useDocument';
import { useSettingsState, useSettingsActions } from './hooks/useSettings';
import { useSegmentEditorPatterns } from './hooks/useSegmentEditorPatterns';
import { useSegmentPatternApproval } from './hooks/useSegmentPatternApproval';

import type { PromptExploderSegment } from '../types';
import type { ApprovalDraft } from '../helpers/segment-helpers';
import type {
  SegmentEditorActions,
  SegmentEditorPatternsState,
  SegmentEditorState,
} from './SegmentEditorContext.types';

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

export { SegmentEditorStateContext, SegmentEditorActionsContext };
