import type { PromptValidationRule } from '@/shared/contracts/prompt-engine';

import { benchmarkSuggestionRuleId } from './benchmark-suggestions';
import { buildBenchmarkLearnedRegexRuleDraft } from './rule-drafts';
import { mergeRegexLearnedRule } from './rule-learning';
import { upsertLearnedTemplate } from './template-learning';

import type {
  PromptExploderBenchmarkSuggestion,
  PromptExploderLearnedTemplate,
} from './types';

const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'case';

export type ApplyBenchmarkSuggestionsResult = {
  nextLearnedRules: PromptValidationRule[];
  appliedRules: PromptValidationRule[];
  addedCount: number;
  updatedCount: number;
  nextTemplates: PromptExploderLearnedTemplate[];
  touchedTemplateIds: string[];
  invalidSegmentTitles: string[];
};

export const applyBenchmarkSuggestions = (args: {
  suggestions: PromptExploderBenchmarkSuggestion[];
  initialRules: PromptValidationRule[];
  initialTemplates: PromptExploderLearnedTemplate[];
  shouldUpsertTemplates: boolean;
  templateMergeThreshold: number;
  minApprovalsForMatching: number;
  autoActivateLearnedTemplates: boolean;
  nowFactory?: () => string;
}): ApplyBenchmarkSuggestionsResult => {
  const learnedById = new Map<string, PromptValidationRule>();
  args.initialRules.forEach((rule) => {
    learnedById.set(rule.id, rule);
  });

  let addedCount = 0;
  let updatedCount = 0;
  const appliedRules: PromptValidationRule[] = [];
  const invalidSegmentTitles: string[] = [];
  const templateById = args.shouldUpsertTemplates
    ? new Map<string, PromptExploderLearnedTemplate>(
      args.initialTemplates.map((template) => [template.id, template])
    )
    : null;
  const touchedTemplateIds = new Set<string>();

  args.suggestions.forEach((suggestion, index) => {
    const ruleId = benchmarkSuggestionRuleId(suggestion);
    if (learnedById.has(ruleId)) {
      updatedCount += 1;
    } else {
      addedCount += 1;
    }
    const nextSequence = 1200 + learnedById.size + index;
    const suggestedRuleDraft = buildBenchmarkLearnedRegexRuleDraft({
      id: ruleId,
      caseId: suggestion.caseId,
      segmentTitle: suggestion.segmentTitle ?? '',
      segmentType: suggestion.suggestedSegmentType ?? 'static',
      sequence: nextSequence,
      suggestedRuleTitle: suggestion.suggestedRuleTitle ?? '',
      suggestedRulePattern: suggestion.suggestedRulePattern ?? '',
      suggestedPriority: suggestion.suggestedPriority ?? 0,
      suggestedConfidenceBoost: suggestion.suggestedConfidenceBoost ?? 0,
      suggestedTreatAsHeading: suggestion.suggestedTreatAsHeading ?? false,
    });
    const existingRule = learnedById.get(ruleId);
    const suggestedRule = mergeRegexLearnedRule({
      existingRule,
      incomingRule: suggestedRuleDraft,
    }).nextRule;
    learnedById.set(ruleId, suggestedRule);
    appliedRules.push(suggestedRule);

    if (args.shouldUpsertTemplates && templateById) {
      const sourceText = `${suggestion.segmentTitle} ${suggestion.sampleText}`.trim();
      const now = args.nowFactory?.() ?? new Date().toISOString();
      const templateUpsert = upsertLearnedTemplate({
        templates: [...templateById.values()],
        segmentType: suggestion.suggestedSegmentType ?? 'static',
        title: suggestion.segmentTitle ?? '',
        sourceText,
        sampleText: suggestion.sampleText ?? '',
        similarityThreshold: args.templateMergeThreshold,
        minApprovalsForMatching: args.minApprovalsForMatching,
        autoActivateLearnedTemplates: args.autoActivateLearnedTemplates,
        mergeMode: 'auto',
        now,
        createTemplateId: ({ existingTemplateIds }) => {
          const baseId = `template_benchmark_${suggestion.suggestedSegmentType}_${toSlug(
            suggestion.segmentTitle ?? ''
          )}_${Date.now().toString(36)}_${index + 1}`;
          let nextId = baseId;
          while (existingTemplateIds.has(nextId)) {
            nextId = `${nextId}_x`;
          }
          return nextId;
        },
      });
      if (!templateUpsert.ok) {
        invalidSegmentTitles.push(suggestion.segmentTitle ?? '');
        return;
      }
      templateById.set(templateUpsert.nextTemplate.id, templateUpsert.nextTemplate);
      touchedTemplateIds.add(templateUpsert.nextTemplate.id);
    }
  });

  return {
    nextLearnedRules: [...learnedById.values()],
    appliedRules,
    addedCount,
    updatedCount,
    nextTemplates: templateById ? [...templateById.values()] : args.initialTemplates,
    touchedTemplateIds: [...touchedTemplateIds],
    invalidSegmentTitles,
  };
};
