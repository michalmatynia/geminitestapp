import { describe, expect, it } from 'vitest';

import { validateRegexSafety } from '@/shared/utils/regex-safety';

describe('validator-regex-safety', () => {
  it('accepts safe regex and normalized flags', () => {
    const result = validateRegexSafety('^KEYCHA\\d{3}$', ' i ');

    expect(result).toEqual({
      ok: true,
      normalizedFlags: 'i',
    });
  });

  it('accepts capture groups that are not themselves repeated', () => {
    const result = validateRegexSafety('^(\\d+)-(\\w+)$', null);

    expect(result).toEqual({
      ok: true,
      normalizedFlags: null,
    });
  });

  it('accepts alternation groups that are not themselves repeated', () => {
    const result = validateRegexSafety('^(foo|bar)$', null);

    expect(result).toEqual({
      ok: true,
      normalizedFlags: null,
    });
  });

  it('rejects duplicate flags', () => {
    const result = validateRegexSafety('^.+$', 'ii');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('duplicate_flag');
  });

  it('rejects likely catastrophic backtracking patterns', () => {
    const result = validateRegexSafety('(a+)+$', null);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('potential_backtracking');
  });
});
