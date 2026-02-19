import type { PromptValidationRule } from '@/features/prompt-engine/settings';
import { applyBenchmarkSuggestions } from '@/features/prompt-exploder/benchmark-apply';
import { benchmarkSuggestionRuleId } from '@/features/prompt-exploder/benchmark-suggestions';
import type { PromptExploderBenchmarkSuggestion } from '@/features/prompt-exploder/types';
import type { PromptExploderLearnedTemplate } from '@/features/prompt-exploder/types';

const buildRegexRule = (
  id: string,
  pattern: string
): PromptValidationRule => ({
  kind: 'regex',
  id,
  enabled: true,
  severity: 'info',
  title: id,
  description: null,
  pattern,
  flags: 'mi',
  message: id,
  similar: [],
});

const buildSuggestion = (
  id: string,
  overrides: Partial<PromptExploderBenchmarkSuggestion> = {}
): PromptExploderBenchmarkSuggestion => ({
  id,
  caseId: 'case_a',
  segmentId: `segment_${id}`,
  segmentTitle: `Segment ${id}`,
  segmentType: 'list',
  confidence: 0.4,
  sampleText: 'sample text',
  matchedPatternIds: [],
  suggestedRuleTitle: 'Suggested Rule',
  suggestedRulePattern: '\\bsegment\\b',
  suggestedSegmentType: 'list',
  suggestedPriority: 20,
  suggestedConfidenceBoost: 0.2,
  suggestedTreatAsHeading: false,
  ...overrides,
});

const buildTemplate = (
  id: string,
  overrides: Partial<PromptExploderLearnedTemplate> = {}
): PromptExploderLearnedTemplate => ({
  id,
  segmentType: 'list',
  state: 'active',
  title: id,
  normalizedTitle: id,
  anchorTokens: ['seed'],
  sampleText: 'seed sample',
  approvals: 1,
  createdAt: '2026-02-13T00:00:00.000Z',
  updatedAt: '2026-02-13T00:00:00.000Z',
  ...overrides,
});

describe('prompt exploder benchmark apply', () => {
  it('applies suggestions with add/update counts and merged regex coverage', () => {
    const existingSuggestion = buildSuggestion('existing', {
      segmentTitle: 'NON-NEGOTIABLE GOAL',
      suggestedRulePattern: '\\bold\\b',
    });
    const existingRuleId = benchmarkSuggestionRuleId(existingSuggestion);
    const initialRules = [buildRegexRule(existingRuleId, '\\blegacy\\b')];

    const nextSuggestion = buildSuggestion('new', {
      segmentTitle: 'FINAL QA CHECKS',
      suggestedRulePattern: '\\bqa\\b',
    });

    const result = applyBenchmarkSuggestions({
      suggestions: [existingSuggestion, nextSuggestion],
      initialRules,
      initialTemplates: [],
      shouldUpsertTemplates: false,
      templateMergeThreshold: 0.63,
      minApprovalsForMatching: 1,
      autoActivateLearnedTemplates: true,
    });

    expect(result.addedCount).toBe(1);
    expect(result.updatedCount).toBe(1);
    expect(result.appliedRules).toHaveLength(2);
    expect(result.nextLearnedRules).toHaveLength(2);
    const updatedRule = result.nextLearnedRules.find(
      (rule) => rule.id === existingRuleId
    );
    expect(updatedRule?.kind).toBe('regex');
    if (updatedRule?.kind !== 'regex') return;
    expect(updatedRule.pattern).toBe('(?:\\blegacy\\b)|(?:\\bold\\b)');
    expect(result.nextTemplates).toEqual([]);
    expect(result.touchedTemplateIds).toEqual([]);
  });

  it('upserts templates when enabled and tracks touched template ids', () => {
    const suggestion = buildSuggestion('templated', {
      segmentTitle: 'REQUIREMENTS',
      sampleText: 'A) BG B) SHADOW C) COMPOSITION',
    });
    const initialTemplates = [buildTemplate('existing_other', { segmentType: 'metadata' })];

    const result = applyBenchmarkSuggestions({
      suggestions: [suggestion],
      initialRules: [],
      initialTemplates,
      shouldUpsertTemplates: true,
      templateMergeThreshold: 0.63,
      minApprovalsForMatching: 1,
      autoActivateLearnedTemplates: true,
      nowFactory: () => '2026-02-13T12:00:00.000Z',
    });

    expect(result.appliedRules).toHaveLength(1);
    expect(result.nextTemplates.length > initialTemplates.length).toBe(true);
    expect(result.touchedTemplateIds.length).toBe(1);
    const touchedTemplate = result.nextTemplates.find((template) =>
      result.touchedTemplateIds.includes(template.id)
    );
    expect(touchedTemplate?.segmentType).toBe('list');
    expect(touchedTemplate?.approvals).toBe(1);
  });
});
