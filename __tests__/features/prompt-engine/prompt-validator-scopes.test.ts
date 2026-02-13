import { describe, expect, it } from 'vitest';

import { formatProgrammaticPrompt } from '@/features/prompt-engine/prompt-formatter';
import { validateProgrammaticPrompt } from '@/features/prompt-engine/prompt-validator';
import type { PromptValidationRule, PromptValidationSettings } from '@/features/prompt-engine/settings';

const buildRegexRule = (overrides: Partial<PromptValidationRule> = {}): PromptValidationRule => ({
  kind: 'regex',
  id: 'rule.regex',
  enabled: true,
  severity: 'warning',
  title: 'Regex rule',
  description: null,
  pattern: '^ALLOW$',
  flags: 'm',
  message: 'Prompt must equal ALLOW',
  similar: [],
  autofix: { enabled: true, operations: [] },
  sequence: 10,
  chainMode: 'continue',
  maxExecutions: 1,
  passOutputToNext: true,
  appliesToScopes: ['image_studio_prompt', 'prompt_exploder', 'global'],
  launchEnabled: false,
  launchAppliesToScopes: ['image_studio_prompt', 'prompt_exploder', 'global'],
  launchScopeBehavior: 'gate',
  launchOperator: 'contains',
  launchValue: null,
  launchFlags: null,
  ...overrides,
});

const buildSettings = (rules: PromptValidationRule[]): PromptValidationSettings => ({
  enabled: true,
  rules,
  learnedRules: [],
});

describe('prompt validator scope behavior', () => {
  it('filters rules by appliesToScopes', () => {
    const rule = buildRegexRule({
      id: 'scope.only.prompt-exploder',
      appliesToScopes: ['prompt_exploder'],
    });
    const settings = buildSettings([rule]);

    const imageStudioIssues = validateProgrammaticPrompt(
      'anything',
      settings,
      { scope: 'image_studio_prompt' }
    );
    const promptExploderIssues = validateProgrammaticPrompt(
      'anything',
      settings,
      { scope: 'prompt_exploder' }
    );

    expect(imageStudioIssues).toHaveLength(0);
    expect(promptExploderIssues).toHaveLength(1);
    expect(promptExploderIssues[0]?.ruleId).toBe(rule.id);
  });

  it('honors launchScopeBehavior for out-of-scope launch gating', () => {
    const base = buildRegexRule({
      id: 'launch.scope.behavior',
      pattern: '^SHOULD_NOT_MATCH$',
      launchEnabled: true,
      launchOperator: 'contains',
      launchValue: 'ALLOW',
      launchAppliesToScopes: ['prompt_exploder'],
    });
    const gateRule = buildRegexRule({
      ...base,
      id: 'launch.gate',
      launchScopeBehavior: 'gate',
    });
    const bypassRule = buildRegexRule({
      ...base,
      id: 'launch.bypass',
      launchScopeBehavior: 'bypass',
    });

    const gateIssues = validateProgrammaticPrompt(
      'this does not include the launch token',
      buildSettings([gateRule]),
      { scope: 'image_studio_prompt' }
    );
    const bypassIssues = validateProgrammaticPrompt(
      'this does not include the launch token',
      buildSettings([bypassRule]),
      { scope: 'image_studio_prompt' }
    );

    expect(gateIssues).toHaveLength(0);
    expect(bypassIssues).toHaveLength(1);
    expect(bypassIssues[0]?.ruleId).toBe('launch.bypass');
  });

  it('formats prompts only with rules active in current scope', () => {
    const exploderOnlyRule = buildRegexRule({
      id: 'autofix.scope.only.exploder',
      pattern: 'DOG',
      flags: 'g',
      message: 'DOG token is required',
      appliesToScopes: ['prompt_exploder'],
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
    });

    const settings = buildSettings([exploderOnlyRule]);
    const unchanged = formatProgrammaticPrompt(
      'CAT',
      settings,
      { scope: 'image_studio_prompt' }
    );
    const changed = formatProgrammaticPrompt(
      'CAT',
      settings,
      { scope: 'prompt_exploder' }
    );

    expect(unchanged.changed).toBe(false);
    expect(unchanged.prompt).toBe('CAT');
    expect(changed.changed).toBe(true);
    expect(changed.prompt).toBe('DOG');
  });
});
