import {
  dedupeBenchmarkSuggestionsById,
  prepareBenchmarkSuggestionsForApply,
} from '@/features/prompt-exploder/benchmark-suggestions';
import type { PromptExploderBenchmarkSuggestion } from '@/shared/contracts/prompt-exploder';

const buildSuggestion = (
  id: string,
  overrides: Partial<PromptExploderBenchmarkSuggestion> = {}
): PromptExploderBenchmarkSuggestion => ({
  id,
  caseId: 'case_1',
  segmentId: `segment_${id}`,
  segmentTitle: `Segment ${id}`,
  segmentType: 'list',
  confidence: 0.4,
  sampleText: 'sample text',
  matchedPatternIds: [],
  suggestedRuleTitle: 'Suggested rule',
  suggestedRulePattern: '\\bsegment\\b',
  suggestedSegmentType: 'list',
  suggestedPriority: 20,
  suggestedConfidenceBoost: 0.15,
  suggestedTreatAsHeading: false,
  ...overrides,
});

describe('prompt exploder benchmark suggestions', () => {
  it('dedupes suggestions by id while keeping first occurrence order', () => {
    const suggestions = [
      buildSuggestion('a', { segmentTitle: 'First A' }),
      buildSuggestion('b', { segmentTitle: 'Only B' }),
      buildSuggestion('a', { segmentTitle: 'Second A' }),
    ];

    const unique = dedupeBenchmarkSuggestionsById(suggestions);

    expect(unique).toHaveLength(2);
    expect(unique[0]?.id).toBe('a');
    expect(unique[0]?.segmentTitle).toBe('First A');
    expect(unique[1]?.id).toBe('b');
  });

  it('prepares valid and invalid suggestion lists based on regex pattern validity', () => {
    const suggestions = [
      buildSuggestion('valid', { segmentTitle: 'Valid', suggestedRulePattern: '  \\bqa\\b  ' }),
      buildSuggestion('empty', { segmentTitle: 'Empty', suggestedRulePattern: '   ' }),
      buildSuggestion('invalid', { segmentTitle: 'Invalid', suggestedRulePattern: '(' }),
      buildSuggestion('valid', {
        segmentTitle: 'Duplicate Valid',
        suggestedRulePattern: '\\bother\\b',
      }),
    ];

    const prepared = prepareBenchmarkSuggestionsForApply(suggestions);

    expect(prepared.uniqueSuggestions).toHaveLength(3);
    expect(prepared.validSuggestions).toHaveLength(1);
    expect(prepared.validSuggestions[0]?.id).toBe('valid');
    expect(prepared.invalidSegmentTitles).toEqual(['Empty', 'Invalid']);
  });
});
