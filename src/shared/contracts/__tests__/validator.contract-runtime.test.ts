import { describe, expect, it } from 'vitest';

import { parseValidatorPatternLists } from '@/shared/contracts/validator';

const DEFAULT_SCOPE_IDS = [
  'products',
  'image-studio',
  'prompt-exploder',
  'case-resolver-prompt-exploder',
  'case-resolver-plain-text',
  'ai-paths',
] as const;

describe('validator contracts runtime parser', () => {
  it('returns default scoped validator stacks when value is missing', () => {
    const lists = parseValidatorPatternLists(null);
    expect(lists.map((list) => list.id)).toEqual(DEFAULT_SCOPE_IDS);
  });

  it('accepts object payloads with a lists array', () => {
    const defaults = parseValidatorPatternLists(null);
    const caseResolverList = defaults.find((entry) => entry.id === 'case-resolver-prompt-exploder');
    expect(caseResolverList).toBeTruthy();

    const parsed = parseValidatorPatternLists({
      lists: [caseResolverList],
    });

    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.id).toBe('case-resolver-prompt-exploder');
    expect(parsed[0]?.scope).toBe('case-resolver-prompt-exploder');
  });

  it('falls back to default scoped validator stacks for malformed or empty payloads', () => {
    const malformed = parseValidatorPatternLists('{not-json');
    const empty = parseValidatorPatternLists([]);

    expect(malformed.map((list) => list.id)).toEqual(DEFAULT_SCOPE_IDS);
    expect(empty.map((list) => list.id)).toEqual(DEFAULT_SCOPE_IDS);
  });
});
