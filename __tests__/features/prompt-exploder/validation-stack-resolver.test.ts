import { describe, expect, it } from 'vitest';

import { parseValidatorPatternLists } from '@/features/admin/pages/validator-scope';
import { PromptValidationScopeResolutionError } from '@/shared/lib/prompt-core/errors';
import { resolvePromptExploderValidationStack } from '@/features/prompt-exploder/validation-stack';

describe('prompt exploder validation stack resolver', () => {
  it('resolves exact list match without fallback', () => {
    const lists = parseValidatorPatternLists(null);
    const selectedList = lists.find((entry) => entry.scope === 'case-resolver-prompt-exploder');
    expect(selectedList).toBeTruthy();
    const resolution = resolvePromptExploderValidationStack({
      stack: selectedList?.id,
      patternLists: lists,
      strictUnknownStack: true,
    });
    expect(resolution.reason).toBe('exact_match');
    expect(resolution.usedFallback).toBe(false);
    expect(resolution.scope).toBe('case_resolver_prompt_exploder');
  });

  it('throws explicit scope resolution error for unknown stack in strict mode', () => {
    const lists = parseValidatorPatternLists(null);
    expect(() =>
      resolvePromptExploderValidationStack({
        stack: 'custom-unknown-stack',
        patternLists: lists,
        strictUnknownStack: true,
      })
    ).toThrow(PromptValidationScopeResolutionError);
  });

  it('resolves known case-resolver stack id without fallback when lists are unavailable', () => {
    const resolution = resolvePromptExploderValidationStack({
      stack: 'case-resolver-prompt-exploder',
      patternLists: [],
      preferredScope: 'case-resolver-prompt-exploder',
      strictUnknownStack: true,
    });

    expect(resolution.reason).toBe('exact_match');
    expect(resolution.usedFallback).toBe(false);
    expect(resolution.scope).toBe('case_resolver_prompt_exploder');
    expect(resolution.stack).toBe('case-resolver-prompt-exploder');
  });

  it('resolves legacy image_studio_prompt_exploder alias without fallback', () => {
    const resolution = resolvePromptExploderValidationStack({
      stack: 'image_studio_prompt_exploder',
      patternLists: [],
      strictUnknownStack: true,
    });

    expect(resolution.reason).toBe('exact_match');
    expect(resolution.usedFallback).toBe(false);
    expect(resolution.scope).toBe('prompt_exploder');
    expect(resolution.stack).toBe('prompt-exploder');
  });

  it('falls back with invalid_stack reason in non-strict mode', () => {
    const lists = parseValidatorPatternLists(null);
    const resolution = resolvePromptExploderValidationStack({
      stack: 'custom-unknown-stack',
      patternLists: lists,
      strictUnknownStack: false,
    });
    expect(resolution.reason).toBe('invalid_stack');
    expect(resolution.usedFallback).toBe(true);
    expect(resolution.scope).toBe('prompt_exploder');
  });
});
