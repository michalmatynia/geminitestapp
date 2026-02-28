import type { PromptValidationRule } from '@/features/prompt-engine/settings';
import {
  mergeRegexLearnedRule,
  upsertRegexLearnedRule,
} from '@/features/prompt-exploder/rule-learning';

type PromptValidationRegexRule = Extract<PromptValidationRule, { kind: 'regex' }>;

const buildRegexRule = (
  id: string,
  overrides: Partial<PromptValidationRegexRule> = {}
): PromptValidationRegexRule => ({
  kind: 'regex',
  id,
  enabled: true,
  severity: 'info',
  title: 'Rule',
  description: 'Rule description',
  pattern: '\\bdefault\\b',
  flags: 'mi',
  message: 'Rule message',
  similar: [],
  autofix: { enabled: false, operations: [] },
  sequenceGroupId: 'exploder_test',
  sequenceGroupLabel: 'Exploder Test',
  sequenceGroupDebounceMs: 0,
  sequence: 1200,
  chainMode: 'continue',
  maxExecutions: 1,
  passOutputToNext: true,
  appliesToScopes: ['prompt_exploder'],
  launchEnabled: false,
  launchAppliesToScopes: ['prompt_exploder'],
  launchScopeBehavior: 'gate',
  launchOperator: 'contains',
  launchValue: null,
  launchFlags: null,
  promptExploderSegmentType: 'list',
  promptExploderPriority: 30,
  promptExploderConfidenceBoost: 0.2,
  promptExploderTreatAsHeading: false,
  ...overrides,
});

describe('prompt exploder rule learning', () => {
  it('merges regex patterns while preserving existing sequence and similar metadata', () => {
    const existing = buildRegexRule('segment.learned.list.template_a', {
      pattern: '(?:\\bfoo\\b)|(?:\\bbar\\b)',
      sequence: 777,
      similar: [
        {
          pattern: '\\blegacy\\b',
          flags: 'mi',
          suggestion: 'Keep legacy hint',
          comment: null,
        },
      ],
    });
    const incoming = buildRegexRule('segment.learned.list.template_a', {
      pattern: '(?:\\bbar\\b)|(?:\\bbaz\\b)',
      sequence: 1400,
      similar: [],
    });

    const merged = mergeRegexLearnedRule({
      existingRule: existing,
      incomingRule: incoming,
    });

    expect(merged.wasUpdate).toBe(true);
    expect(merged.nextRule.kind).toBe('regex');
    if (merged.nextRule.kind !== 'regex') return;
    expect(merged.nextRule.pattern).toBe('(?:\\bfoo\\b)|(?:\\bbar\\b)|(?:\\bbaz\\b)');
    expect(merged.nextRule.sequence).toBe(777);
    expect(merged.nextRule.similar).toEqual(existing.similar);
  });

  it('uses incoming regex rule when existing rule id is missing', () => {
    const incoming = buildRegexRule('segment.learned.list.template_new', {
      pattern: '\\bnew\\b',
      sequence: 1337,
    });

    const merged = mergeRegexLearnedRule({
      existingRule: null,
      incomingRule: incoming,
    });

    expect(merged.wasUpdate).toBe(false);
    expect(merged.nextRule).toEqual(incoming);
  });

  it('replaces non-regex existing rule with incoming regex rule', () => {
    const existing: PromptValidationRule = {
      kind: 'params_object',
      id: 'segment.learned.list.template_a',
      enabled: true,
      severity: 'warning',
      title: 'Legacy',
      description: 'Legacy non-regex',
      message: 'Legacy message',
      similar: [],
    };
    const incoming = buildRegexRule('segment.learned.list.template_a', {
      pattern: '\\bcurrent\\b',
    });

    const merged = mergeRegexLearnedRule({
      existingRule: existing,
      incomingRule: incoming,
    });

    expect(merged.wasUpdate).toBe(true);
    expect(merged.nextRule.kind).toBe('regex');
    if (merged.nextRule.kind !== 'regex') return;
    expect(merged.nextRule.pattern).toBe('\\bcurrent\\b');
  });

  it('upserts into learned-rule collection by id', () => {
    const existing = buildRegexRule('segment.learned.list.template_a', {
      pattern: '\\bold\\b',
    });
    const another = buildRegexRule('segment.learned.list.template_b', {
      pattern: '\\bstable\\b',
    });
    const incoming = buildRegexRule('segment.learned.list.template_a', {
      pattern: '\\bnew\\b',
    });

    const result = upsertRegexLearnedRule({
      rules: [existing, another],
      incomingRule: incoming,
    });

    expect(result.wasUpdate).toBe(true);
    expect(result.nextRules).toHaveLength(2);
    const updated = result.nextRules.find((rule) => rule.id === incoming.id);
    expect(updated?.kind).toBe('regex');
    if (updated?.kind !== 'regex') return;
    expect(updated.pattern).toBe('(?:\\bold\\b)|(?:\\bnew\\b)');
  });
});
