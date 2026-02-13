import { describe, expect, it } from 'vitest';

import { mergeRegexPatternsForRule } from '@/features/prompt-exploder/rule-merge';

describe('prompt exploder rule merge', () => {
  it('returns incoming when existing is empty', () => {
    expect(mergeRegexPatternsForRule('', '\\bnew\\b')).toBe('\\bnew\\b');
  });

  it('returns existing when incoming is empty', () => {
    expect(mergeRegexPatternsForRule('\\bold\\b', '')).toBe('\\bold\\b');
  });

  it('dedupes identical patterns', () => {
    expect(mergeRegexPatternsForRule('\\bfoo\\b', '\\bfoo\\b')).toBe('\\bfoo\\b');
  });

  it('dedupes merged variants and flattens top-level alternations', () => {
    const merged = mergeRegexPatternsForRule('(?:\\bfoo\\b)|(?:\\bbar\\b)', '(?:\\bbar\\b)|(?:\\bbaz\\b)');
    expect(merged).toBe('(?:\\bfoo\\b)|(?:\\bbar\\b)|(?:\\bbaz\\b)');
  });

  it('does not split alternation symbols inside escaped literals or char classes', () => {
    const merged = mergeRegexPatternsForRule('\\bfoo\\|bar\\b', '\\bbaz[|]qux\\b');
    expect(merged).toBe('(?:\\bfoo\\|bar\\b)|(?:\\bbaz[|]qux\\b)');
  });
});

