import { describe, expect, it } from 'vitest';

import { createRegexRule } from '@/features/prompt-exploder/rules/base';

describe('prompt exploder regex rule defaults', () => {
  it('does not couple launch scopes to applies scopes by default', () => {
    const rule = createRegexRule({
      id: 'segment.scope.canonical',
      title: 'Canonical Scope',
      description: 'Scope defaults stay independent.',
      pattern: 'SCOPE',
      message: 'scope',
      sequence: 1,
      sequenceGroupId: 'scope_group',
      sequenceGroupLabel: 'Scope Group',
      appliesToScopes: ['case_resolver_prompt_exploder'],
    });

    expect(rule.appliesToScopes).toEqual(['case_resolver_prompt_exploder']);
    expect(rule.launchAppliesToScopes).toEqual(['prompt_exploder']);
  });

  it('uses explicit launch scopes when provided', () => {
    const rule = createRegexRule({
      id: 'segment.scope.launch.explicit',
      title: 'Explicit Launch Scope',
      description: 'Explicit launch scopes win.',
      pattern: 'LAUNCH',
      message: 'launch',
      sequence: 2,
      sequenceGroupId: 'scope_group',
      sequenceGroupLabel: 'Scope Group',
      appliesToScopes: ['prompt_exploder'],
      launchAppliesToScopes: ['case_resolver_prompt_exploder'],
    });

    expect(rule.appliesToScopes).toEqual(['prompt_exploder']);
    expect(rule.launchAppliesToScopes).toEqual(['case_resolver_prompt_exploder']);
  });
});
