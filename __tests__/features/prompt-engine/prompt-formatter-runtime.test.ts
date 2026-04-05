import { describe, expect, it } from 'vitest';

import { formatProgrammaticPrompt } from '@/features/prompt-engine/shared.public';
import {
  preparePromptValidationRuntime,
  validateProgrammaticPrompt,
} from '@/features/prompt-engine/shared.public';
import type {
  PromptValidationRule,
  PromptValidationSettings,
} from '@/features/prompt-engine/settings';

const buildRule = (overrides: Partial<PromptValidationRule> = {}): PromptValidationRule =>
  ({
    kind: 'regex',
    id: 'rule.base',
    enabled: true,
    severity: 'warning',
    title: 'Rule',
    description: null,
    pattern: 'DOG',
    flags: 'g',
    message: 'DOG required',
    similar: [],
    autofix: {
      enabled: true,
      operations: [
        {
          kind: 'replace',
          pattern: 'CAT',
          flags: 'g',
          replacement: 'DOG',
          comment: null,
        },
      ],
    },
    appliesToScopes: ['prompt_exploder'],
    ...overrides,
  }) as PromptValidationRule;

const buildSettings = (rules: PromptValidationRule[]): PromptValidationSettings => ({
  enabled: true,
  rules,
  learnedRules: [],
});

describe('prompt formatter runtime integration', () => {
  it('supports precomputed validation input and incremental issuesAfter calculation', () => {
    const fixableRule = buildRule({
      id: 'rule.fixable',
      pattern: 'DOG',
      message: 'DOG required',
    });
    const unaffectedRule = buildRule({
      id: 'rule.unaffected',
      pattern: 'ALPHA',
      message: 'ALPHA required',
      autofix: { enabled: false, operations: [] },
    });
    const settings = buildSettings([fixableRule, unaffectedRule]);
    const context = { scope: 'prompt_exploder' as const };
    const prompt = 'CAT';

    const issuesBefore = validateProgrammaticPrompt(prompt, settings, context);
    expect(issuesBefore).toHaveLength(2);

    const preparedRuntime = preparePromptValidationRuntime(settings, context);
    const result = formatProgrammaticPrompt(prompt, settings, context, {
      precomputedIssuesBefore: issuesBefore,
      preparedRuntime,
      enableIncrementalValidation: true,
    });

    expect(result.prompt).toBe('DOG');
    expect(result.changed).toBe(true);
    expect(result.issuesBefore).toBe(2);
    expect(result.issuesAfter).toBe(1);
  });
});
