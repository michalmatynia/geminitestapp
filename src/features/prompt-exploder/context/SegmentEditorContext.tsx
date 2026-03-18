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

import type { LabelValueOptionDto } from '@/shared/contracts/ui';
import { internalError } from '@/shared/errors/app-error';
import { useToast } from '@/shared/ui';
import {
  promptExploderCreateApprovalDraftFromSegment,
  type ApprovalDraft,
} from '../helpers/segment-helpers';
import {
  promptExploderInsertSegmentRelative,
  promptExploderMergeSegment,
  promptExploderRemoveSegmentById,
  promptExploderSplitSegmentByRange,
} from '../helpers/segment-transforms';
import { useDocumentActions, useDocumentState } from './DocumentContext';
import { useSettingsActions, useSettingsState } from './SettingsContext';
import { useSegmentEditorPatterns } from './segment-editor/useSegmentEditorPatterns';
import { useSegmentPatternApproval } from './segment-editor/useSegmentPatternApproval';

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
  if (!ctx) throw internalError('useSegmentEditorState must be used within SegmentEditorProvider');
  return ctx;
};

export const useSegmentEditorActions = (): SegmentEditorActions => {
  const ctx = useContext(SegmentEditorActionsContext);
  if (!ctx) throw internalError('useSegmentEditorActions must be used within SegmentEditorProvider');
  return ctx;
};

export { SegmentEditorStateContext, SegmentEditorActionsContext };
