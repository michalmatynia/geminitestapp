import { describe, expect, it } from 'vitest';

import type { PromptValidationRule } from '@/shared/contracts/prompt-engine';

import { isPromptExploderRule, ruleSearchText } from './prompt-engine-context-utils';

const buildRule = (overrides: Partial<PromptValidationRule> = {}): PromptValidationRule => ({
  kind: 'regex',
  id: 'rule.base',
  enabled: true,
  severity: 'warning',
  title: 'Base rule',
  description: 'Base description',
  pattern: '^base$',
  flags: 'mi',
  message: 'Base message',
  similar: [],
  autofix: { enabled: true, operations: [] },
  appliesToScopes: ['global'],
  launchAppliesToScopes: ['global'],
  launchScopeBehavior: 'gate',
  ...overrides,
});

describe('prompt-engine context utils', () => {
  it('includes regex, similarity, and autofix fields in rule search text', () => {
    const text = ruleSearchText(
      buildRule({
        id: 'prompt_exploder.rule.example',
        title: 'Prompt Exploder Example',
        similar: [
          {
            pattern: 'foo',
            flags: 'g',
            suggestion: 'Use bar',
            comment: 'Similarity note',
          },
        ],
        autofix: {
          enabled: true,
          operations: [
            {
              kind: 'replace',
              pattern: 'foo',
              replacement: 'bar',
              flags: 'gi',
              comment: 'Autofix note',
            },
          ],
        },
      })
    );

    expect(text).toContain('prompt exploder example');
    expect(text).toContain('foo');
    expect(text).toContain('use bar');
    expect(text).toContain('autofix note');
    expect(text).toContain('replace');
  });

  it('detects prompt exploder rules from prompt-only scopes', () => {
    expect(
      isPromptExploderRule(
        buildRule({
          id: 'rule.scope-only',
          appliesToScopes: ['global', 'prompt_exploder'],
          launchAppliesToScopes: ['global'],
        })
      )
    ).toBe(true);
  });

  it('rejects mixed non-prompt scopes without id hints', () => {
    expect(
      isPromptExploderRule(
        buildRule({
          id: 'rule.mixed',
          appliesToScopes: ['global', 'image_studio_prompt'],
          launchAppliesToScopes: ['global', 'image_studio_generation'],
        })
      )
    ).toBe(false);
  });
});
