/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { recordPromptValidationTimingMock, logClientErrorMock, logClientCatchMock } = vi.hoisted(() => ({
  recordPromptValidationTimingMock: vi.fn(),
  logClientErrorMock: vi.fn(),
  logClientCatchMock: vi.fn(),
}));

vi.mock('@/shared/lib/prompt-core/runtime-observability', () => ({
  recordPromptValidationTiming: (...args: unknown[]) => recordPromptValidationTimingMock(...args),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => logClientErrorMock(...args),
  logClientCatch: (...args: unknown[]) => logClientCatchMock(...args),
}));

import type {
  PromptValidationRule,
  PromptValidationSettings,
} from '@/shared/contracts/prompt-engine';

import {
  buildPromptSequenceGroupCounts,
  doesPromptRuleApplyToScope,
  evaluatePromptValidationRule,
  isPromptRuleInSequenceGroup,
  normalizePromptRuleChainMode,
  normalizePromptRuleMaxExecutions,
  normalizePromptRuleSequence,
  normalizePromptValidationScopes,
  preparePromptValidationRuntime,
  shouldLaunchPromptRule,
  sortPromptValidationRules,
  validateProgrammaticPrompt,
  validateProgrammaticPromptWithRuntime,
} from './prompt-validator';

const createRegexRule = (
  overrides: Partial<PromptValidationRule> = {}
): PromptValidationRule =>
  ({
    kind: 'regex',
    id: 'regex-rule',
    enabled: true,
    severity: 'warning',
    title: 'Regex Rule',
    description: null,
    message: 'Regex mismatch',
    pattern: '^expected$',
    flags: '',
    similar: [],
    ...overrides,
  }) as PromptValidationRule;

const createParamsRule = (
  overrides: Partial<PromptValidationRule> = {}
): PromptValidationRule =>
  ({
    kind: 'params_object',
    id: 'params-rule',
    enabled: true,
    severity: 'error',
    title: 'Params Rule',
    description: null,
    message: 'Missing params',
    similar: [],
    ...overrides,
  }) as PromptValidationRule;

describe('prompt-validator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes sequences, chain modes, execution limits, and validation scopes', () => {
    expect(normalizePromptRuleSequence(createRegexRule({ sequence: 8.9 }), 0)).toBe(8);
    expect(normalizePromptRuleSequence(createRegexRule({ sequence: Number.NaN }), 2)).toBe(30);

    expect(normalizePromptRuleChainMode(createRegexRule({ chainMode: 'stop_on_match' }))).toBe(
      'stop_on_match'
    );
    expect(normalizePromptRuleChainMode(createRegexRule({ chainMode: undefined }))).toBe(
      'continue'
    );

    expect(normalizePromptRuleMaxExecutions(createRegexRule({ maxExecutions: 0 }))).toBe(1);
    expect(normalizePromptRuleMaxExecutions(createRegexRule({ maxExecutions: 99 }))).toBe(20);
    expect(normalizePromptRuleMaxExecutions(createRegexRule({ maxExecutions: 3.8 }))).toBe(3);

    expect(normalizePromptValidationScopes(undefined)).toContain('global');
    expect(
      normalizePromptValidationScopes([
        'ai_paths',
        'ai_paths',
        'global',
        'not-a-scope' as never,
      ])
    ).toEqual(['ai_paths', 'global']);
    expect(normalizePromptValidationScopes(['not-a-scope' as never])).toContain('global');
  });

  it('builds and resolves sequence groups and scope applicability', () => {
    const first = createRegexRule({ id: 'a', sequenceGroupId: 'shared' });
    const second = createRegexRule({ id: 'b', sequenceGroupId: 'shared' });
    const disabled = createRegexRule({ id: 'c', sequenceGroupId: 'shared', enabled: false });
    const single = createRegexRule({ id: 'd', sequenceGroupId: 'solo' });
    const counts = buildPromptSequenceGroupCounts([first, second, disabled, single]);

    expect(counts).toEqual({ shared: 2, solo: 1 });
    expect(isPromptRuleInSequenceGroup(first, counts)).toBe(true);
    expect(isPromptRuleInSequenceGroup(single, counts)).toBe(false);
    expect(isPromptRuleInSequenceGroup(createRegexRule({ sequenceGroupId: undefined }), counts)).toBe(
      false
    );

    const scopedRule = createRegexRule({ appliesToScopes: ['ai_paths'] });
    expect(doesPromptRuleApplyToScope(scopedRule, 'ai_paths')).toBe(true);
    expect(doesPromptRuleApplyToScope(scopedRule, 'global')).toBe(false);
    expect(doesPromptRuleApplyToScope(scopedRule, null)).toBe(true);
  });

  it('sorts rules by normalized sequence and id', () => {
    const sorted = sortPromptValidationRules([
      createRegexRule({ id: 'z', sequence: 20 }),
      createRegexRule({ id: 'a', sequence: 20 }),
      createRegexRule({ id: 'm', sequence: undefined }),
    ]);

    expect(sorted.map((rule) => rule.id)).toEqual(['a', 'z', 'm']);
  });

  it('evaluates launch guards across scope behavior and string operators', () => {
    expect(shouldLaunchPromptRule(createRegexRule({ launchEnabled: false }), 'anything')).toBe(
      true
    );

    expect(
      shouldLaunchPromptRule(
        createRegexRule({
          launchEnabled: true,
          launchAppliesToScopes: ['ai_paths'],
          launchScopeBehavior: 'bypass',
        }),
        'value',
        { scope: 'global' }
      )
    ).toBe(true);
    expect(
      shouldLaunchPromptRule(
        createRegexRule({
          launchEnabled: true,
          launchAppliesToScopes: ['ai_paths'],
          launchScopeBehavior: 'gate',
        }),
        'value',
        { scope: 'global' }
      )
    ).toBe(false);

    expect(
      shouldLaunchPromptRule(
        createRegexRule({ launchEnabled: true, launchOperator: 'equals', launchValue: 'x' }),
        'x'
      )
    ).toBe(true);
    expect(
      shouldLaunchPromptRule(
        createRegexRule({ launchEnabled: true, launchOperator: 'not_equals', launchValue: 'x' }),
        'y'
      )
    ).toBe(true);
    expect(
      shouldLaunchPromptRule(
        createRegexRule({ launchEnabled: true, launchOperator: 'contains', launchValue: 'mid' }),
        'prefix mid suffix'
      )
    ).toBe(true);
    expect(
      shouldLaunchPromptRule(
        createRegexRule({ launchEnabled: true, launchOperator: 'starts_with', launchValue: 'pre' }),
        'prefix'
      )
    ).toBe(true);
    expect(
      shouldLaunchPromptRule(
        createRegexRule({ launchEnabled: true, launchOperator: 'ends_with', launchValue: 'fix' }),
        'prefix'
      )
    ).toBe(true);
    expect(
      shouldLaunchPromptRule(
        createRegexRule({
          launchEnabled: true,
          launchOperator: 'regex',
          launchValue: '^pref',
          launchFlags: 'i',
        }),
        'Prefix'
      )
    ).toBe(true);
    expect(
      shouldLaunchPromptRule(
        createRegexRule({
          launchEnabled: true,
          launchOperator: 'regex',
          launchValue: '[',
        }),
        'Prefix'
      )
    ).toBe(false);
    expect(
      shouldLaunchPromptRule(
        createRegexRule({ launchEnabled: true, launchOperator: 'gt', launchValue: '10' }),
        '12'
      )
    ).toBe(true);
    expect(
      shouldLaunchPromptRule(
        createRegexRule({ launchEnabled: true, launchOperator: 'gte', launchValue: '12' }),
        '12'
      )
    ).toBe(true);
    expect(
      shouldLaunchPromptRule(
        createRegexRule({ launchEnabled: true, launchOperator: 'lt', launchValue: '5' }),
        '4'
      )
    ).toBe(true);
    expect(
      shouldLaunchPromptRule(
        createRegexRule({ launchEnabled: true, launchOperator: 'lte', launchValue: '4' }),
        '4'
      )
    ).toBe(true);
    expect(
      shouldLaunchPromptRule(
        createRegexRule({ launchEnabled: true, launchOperator: 'is_empty' }),
        '   '
      )
    ).toBe(true);
    expect(
      shouldLaunchPromptRule(
        createRegexRule({ launchEnabled: true, launchOperator: 'is_not_empty' }),
        ' value '
      )
    ).toBe(true);
  });

  it('evaluates regex rules, invalid patterns, and params-object diagnostics', () => {
    expect(
      evaluatePromptValidationRule(
        'expected',
        createRegexRule({ pattern: '^expected$', flags: '' })
      )
    ).toBeNull();

    const invalidRegexIssue = evaluatePromptValidationRule(
      'value',
      createRegexRule({ pattern: '[', flags: '' })
    );
    expect(invalidRegexIssue).toEqual({
      ruleId: 'regex-rule',
      severity: 'warning',
      title: 'Regex Rule',
      message: 'Invalid regex in rule "Regex Rule".',
      suggestions: [],
    });
    expect(logClientErrorMock).toHaveBeenCalledTimes(1);

    const regexIssue = evaluatePromptValidationRule(
      'teh',
      createRegexRule({
        pattern: '^the$',
        similar: [
          {
            pattern: 'teh',
            flags: 'i',
            suggestion: 'Use `the`.',
            comment: 'common typo',
          },
        ],
      })
    );
    expect(regexIssue).toEqual(
      expect.objectContaining({
        severity: 'warning',
        suggestions: [{ suggestion: 'Use `the`.', found: 'teh', comment: 'common typo' }],
      })
    );

    const missingParams = evaluatePromptValidationRule('plain text', createParamsRule());
    expect(missingParams?.message).toContain('Error: Could not find `params = {');
    expect(missingParams?.suggestions).toContainEqual(
      expect.objectContaining({
        suggestion: 'Add a `params = { ... }` block (JSON-like: double-quoted keys/strings).',
      })
    );

    const unbalancedParams = evaluatePromptValidationRule(
      'params = {"foo": {"bar": 1}',
      createParamsRule()
    );
    expect(unbalancedParams?.message).toContain('unbalanced braces');
    expect(unbalancedParams?.suggestions).toContainEqual(
      expect.objectContaining({
        suggestion: 'Fix the `{}` braces in the params object (they must be balanced).',
      })
    );

    const invalidParams = evaluatePromptValidationRule(
      'params = {"foo": invalid}',
      createParamsRule()
    );
    expect(invalidParams?.message).toContain('Failed to parse params');
    expect(invalidParams?.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          suggestion:
            'Ensure the params object is JSON-parseable: use double quotes for keys/strings and avoid JS-only syntax.',
        }),
        expect.objectContaining({
          suggestion:
            'Example: `"output_profile": "ecommerce_strict"` (not `output_profile: \'ecommerce_strict\'`).',
        }),
      ])
    );
  });

  it('prepares runtime and validates prompts with ordering, subsets, and stop-on-match groups', () => {
    const rules = [
      createRegexRule({
        id: 'second',
        sequence: 20,
        sequenceGroupId: 'group-a',
        chainMode: 'continue',
        pattern: '^second$',
        message: 'Need second',
      }),
      createRegexRule({
        id: 'first',
        sequence: 10,
        sequenceGroupId: 'group-a',
        chainMode: 'stop_on_match',
        pattern: '^first$',
        message: 'Need first',
      }),
      createRegexRule({
        id: 'scoped',
        sequence: 30,
        pattern: '^scoped$',
        appliesToScopes: ['ai_paths'],
        message: 'Need scoped',
      }),
    ];

    const runtime = preparePromptValidationRuntime(
      {
        enabled: true,
        rules,
        learnedRules: [createRegexRule({ id: 'learned', pattern: '^learned$', message: 'Need learned' })],
      },
      { scope: 'global' }
    );

    expect(runtime.orderedRules.map((rule) => rule.id)).toEqual([
      'first',
      'second',
      'scoped',
      'learned',
    ]);
    expect(runtime.sequenceGroupCounts).toEqual({ 'group-a': 2 });

    const subsetIssues = validateProgrammaticPromptWithRuntime('mismatch', runtime, {
      includeRuleIds: ['learned'],
    });
    expect(subsetIssues).toEqual([
      expect.objectContaining({
        ruleId: 'learned',
      }),
    ]);

    const stopIssues = validateProgrammaticPromptWithRuntime('mismatch', runtime);
    expect(stopIssues.map((issue) => issue.ruleId)).toEqual(['first']);
    expect(recordPromptValidationTimingMock).toHaveBeenLastCalledWith(
      'validator_ms',
      expect.any(Number),
      expect.objectContaining({ scope: 'global', mode: 'full' })
    );
  });

  it('returns empty results for disabled or blank validation runs and supports wrapper API', () => {
    const settings: PromptValidationSettings = {
      enabled: false,
      rules: [createRegexRule()],
      learnedRules: [],
    };

    expect(validateProgrammaticPromptWithRuntime('value', preparePromptValidationRuntime(settings))).toEqual(
      []
    );
    expect(validateProgrammaticPromptWithRuntime('   ', preparePromptValidationRuntime({
      ...settings,
      enabled: true,
    }))).toEqual([]);
    expect(
      validateProgrammaticPrompt('mismatch', {
        enabled: true,
        rules: [createRegexRule({ pattern: '^ok$' })],
        learnedRules: [],
      })
    ).toEqual([
      expect.objectContaining({
        ruleId: 'regex-rule',
      }),
    ]);
  });
});
