'use client';

import { useMemo } from 'react';

import type { LabelValueOptionDto } from '@/shared/contracts/ui';

import { promptExploderClampNumber } from '../../helpers/formatting';
import {
  promptExploderBuildSegmentSampleText,
  type ApprovalDraft,
} from '../../helpers/segment-helpers';
import {
  normalizeLearningText,
  templateSimilarityScore,
} from '../../template-learning';
import type { DocumentState } from '../DocumentContext';
import type { PromptExploderSettingsState } from '../SettingsContext';
import type {
  SegmentEditorMatchedRuleDetail,
  SegmentEditorTemplateCandidate,
} from '../SegmentEditorContext';

type UseSegmentEditorPatternsArgs = {
  approvalDraft: ApprovalDraft;
  effectiveRules: PromptExploderSettingsState['effectiveRules'];
  effectiveLearnedTemplates: PromptExploderSettingsState['effectiveLearnedTemplates'];
  selectedSegment: DocumentState['selectedSegment'];
  templateMergeThreshold: PromptExploderSettingsState['templateMergeThreshold'];
};

export const useSegmentEditorPatterns = ({
  approvalDraft,
  effectiveRules,
  effectiveLearnedTemplates,
  selectedSegment,
  templateMergeThreshold,
}: UseSegmentEditorPatternsArgs) => {
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
