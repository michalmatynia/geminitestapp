import { describe, expect, it } from 'vitest';

import {
  validateProgrammaticPrompt,
  type PromptValidationRule,
  type PromptValidationSettings,
} from '@/features/prompt-engine/public';

const buildSettings = (rules: PromptValidationRule[]): PromptValidationSettings => ({
  enabled: true,
  rules,
  learnedRules: [],
});

describe('prompt validator invalid regex handling', () => {
  it('surfaces a warning when a regex rule cannot be compiled', () => {
    const invalidRegexRule: PromptValidationRule = {
      kind: 'regex',
      id: 'rule.invalid-regex',
      enabled: true,
      severity: 'error',
      title: 'Broken regex rule',
      description: null,
      pattern: '[',
      flags: 'g',
      message: 'This rule should not execute',
      similar: [],
      autofix: { enabled: false, operations: [] },
      sequence: 1,
      chainMode: 'continue',
      maxExecutions: 1,
      passOutputToNext: true,
      appliesToScopes: ['global'],
      launchEnabled: false,
      launchAppliesToScopes: ['global'],
      launchScopeBehavior: 'gate',
      launchOperator: 'contains',
      launchValue: null,
      launchFlags: null,
    };

    const issues = validateProgrammaticPrompt('prompt text', buildSettings([invalidRegexRule]));

    expect(issues).toEqual([
      expect.objectContaining({
        ruleId: 'rule.invalid-regex',
        severity: 'warning',
        title: 'Broken regex rule',
        message: 'Invalid regex in rule "Broken regex rule".',
      }),
    ]);
  });
});
