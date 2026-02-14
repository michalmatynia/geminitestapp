import type { PromptValidationRule } from '@/features/prompt-engine/settings';

import { learningTokens, type TemplateMergeMode } from '../template-learning';

import type {
  PromptExploderListItem,
  PromptExploderSegment,
  PromptExploderSubsection,
} from '../types';

// ── ID generation ───────────────────────────────────────────────────────────

export const promptExploderCreateManualBindingId = (): string =>
  `manual_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

// ── Factory functions ───────────────────────────────────────────────────────

export const promptExploderCreateListItem = (text = 'New item'): PromptExploderListItem => ({
  id: `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
  text,
  logicalOperator: null,
  logicalConditions: [],
  referencedParamPath: null,
  referencedComparator: null,
  referencedValue: null,
  children: [],
});

export const promptExploderAddBlankListItem = (items: PromptExploderListItem[]): PromptExploderListItem[] => {
  return [...items, promptExploderCreateListItem()];
};

export const promptExploderCreateSubsection = (): PromptExploderSubsection => ({
  id: `subsection_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
  title: 'New subsection',
  code: null,
  condition: null,
  guidance: null,
  items: [promptExploderCreateListItem()],
});

// ── Label formatting ────────────────────────────────────────────────────────

export const promptExploderFormatSubsectionLabel = (subsection: PromptExploderSubsection): string => {
  const title = subsection.title.trim() || 'Untitled subsection';
  if (subsection.code) {
    return `[${subsection.code}] ${title}`;
  }
  return title;
};

// Backward-compat aliases used by existing callers.
export const createManualBindingId = promptExploderCreateManualBindingId;
export const createListItem = promptExploderCreateListItem;
export const addBlankListItem = promptExploderAddBlankListItem;
export const createSubsection = promptExploderCreateSubsection;
export const formatSubsectionLabel = promptExploderFormatSubsectionLabel;

// ── Segment helpers ─────────────────────────────────────────────────────────

export const promptExploderBuildSegmentSampleText = (segment: PromptExploderSegment): string => {
  if (segment.listItems.length > 0) {
    return segment.listItems.slice(0, 4).map((item) => item.text).join(' ');
  }
  if (segment.subsections.length > 0) {
    return segment.subsections
      .slice(0, 3)
      .map((subsection) => subsection.title)
      .join(' ');
  }
  return segment.text.slice(0, 220);
};

// Backward-compat aliases used by existing callers.
export const buildSegmentSampleText = promptExploderBuildSegmentSampleText;

export const promptExploderBuildLearnedRulePattern = (segment: PromptExploderSegment): string => {
  const tokens = learningTokens(`${segment.title} ${promptExploderBuildSegmentSampleText(segment)}`);
  if (tokens.length === 0) {
    const escaped = segment.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return `^\\s*${escaped}\\s*$`;
  }
  const anchors = tokens.slice(0, 4);
  return anchors.map((token) => `\\b${token}\\b`).join('[\\s\\S]{0,120}');
};

// Backward-compat aliases used by existing callers.
export const buildLearnedRulePattern = promptExploderBuildLearnedRulePattern;

export type ApprovalDraft = {
  ruleTitle: string;
  rulePattern: string;
  ruleSegmentType: PromptExploderSegment['type'];
  rulePriority: number;
  ruleConfidenceBoost: number;
  ruleTreatAsHeading: boolean;
  templateMergeMode: TemplateMergeMode;
  templateTargetId: string;
};

export const promptExploderCreateApprovalDraftFromSegment = (
  segment: PromptExploderSegment | null
): ApprovalDraft => {
  if (!segment) {
    return {
      ruleTitle: 'Learned segment pattern',
      rulePattern: '\\bsegment\\b',
      ruleSegmentType: 'assigned_text',
      rulePriority: 30,
      ruleConfidenceBoost: 0.2,
      ruleTreatAsHeading: false,
      templateMergeMode: 'auto',
      templateTargetId: '',
    };
  }

  return {
    ruleTitle: `Learned ${segment.type} pattern`,
    rulePattern: promptExploderBuildLearnedRulePattern(segment),
    ruleSegmentType: segment.type,
    rulePriority: 30,
    ruleConfidenceBoost: 0.2,
    ruleTreatAsHeading: /^[A-Z0-9 _()[\]\\,:&+.-]{3,}$/.test(
      segment.title.trim()
    ),
    templateMergeMode: 'auto',
    templateTargetId: '',
  };
};

// Backward-compat aliases used by existing callers.
export const createApprovalDraftFromSegment = promptExploderCreateApprovalDraftFromSegment;

// ── Rule detection ──────────────────────────────────────────────────────────

export const promptExploderIsPromptExploderManagedRule = (rule: PromptValidationRule): boolean => {
  const scopes = rule.appliesToScopes ?? [];
  const hasPromptExploderScope = scopes.includes('prompt_exploder');
  if (hasPromptExploderScope) return true;
  if (rule.id.includes('prompt_exploder') || rule.id.includes('exploder') || rule.id.startsWith('segment.')) {
    return true;
  }
  return false;
};

// Backward-compat aliases used by existing callers.
export const isPromptExploderManagedRule = promptExploderIsPromptExploderManagedRule;
