import type { Dispatch, SetStateAction } from 'react';

import type { ApprovalDraft } from '../helpers/segment-helpers';
import type { PromptExploderLearnedTemplate } from '../types';

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

export interface SegmentEditorTemplateTargetOption {
  value: string;
  label: string;
}

export interface SegmentEditorPatternsState {
  approvalDraft: ApprovalDraft;
  matchedRuleDetails: SegmentEditorMatchedRuleDetail[];
  similarTemplateCandidates: SegmentEditorTemplateCandidate[];
  templateTargetOptions: SegmentEditorTemplateTargetOption[];
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
