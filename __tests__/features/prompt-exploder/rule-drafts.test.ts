import {
  buildBenchmarkLearnedRegexRuleDraft,
  buildManualLearnedRegexRuleDraft,
} from '@/features/prompt-exploder/rule-drafts';

describe('prompt exploder rule drafts', () => {
  it('builds manual learned rule drafts with clamped numeric values and fallback title', () => {
    const draft = buildManualLearnedRegexRuleDraft({
      id: 'segment.learned.list.template_demo',
      segmentTitle: 'NON-NEGOTIABLE GOAL',
      segmentType: 'list',
      sequence: 1005,
      ruleTitle: '   ',
      rulePattern: '  \\bgoal\\b  ',
      priority: 99,
      confidenceBoost: 0.9,
      treatAsHeading: true,
    });

    expect(draft.id).toBe('segment.learned.list.template_demo');
    expect(draft.title).toBe('Learned list pattern');
    expect(draft.pattern).toBe('\\bgoal\\b');
    expect(draft.promptExploderPriority).toBe(50);
    expect(draft.promptExploderConfidenceBoost).toBe(0.5);
    expect(draft.sequenceGroupId).toBe('exploder_learned');
    expect(draft.promptExploderTreatAsHeading).toBe(true);
  });

  it('builds benchmark learned rule drafts with benchmark grouping defaults', () => {
    const draft = buildBenchmarkLearnedRegexRuleDraft({
      id: 'segment.benchmark.list.qa',
      caseId: 'case_qa',
      segmentTitle: 'QA RULES',
      segmentType: 'list',
      sequence: 1210,
      suggestedRuleTitle: '',
      suggestedRulePattern: '\\bqa\\b',
      suggestedPriority: -99,
      suggestedConfidenceBoost: -1,
      suggestedTreatAsHeading: false,
    });

    expect(draft.title).toBe('Benchmark list pattern');
    expect(draft.description).toContain('case "case_qa"');
    expect(draft.message).toBe('Benchmark learned pattern matched list.');
    expect(draft.sequenceGroupId).toBe('exploder_benchmark_suggestions');
    expect(draft.promptExploderPriority).toBe(-50);
    expect(draft.promptExploderConfidenceBoost).toBe(0);
    expect(draft.appliesToScopes).toEqual(['prompt_exploder']);
  });
});
