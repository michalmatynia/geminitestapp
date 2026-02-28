import { describe, expect, it } from 'vitest';

import { validateRegexSafety } from '@/shared/lib/products/utils/validator-regex-safety';

describe('validator-regex-safety', () => {
  it('accepts safe regex and normalized flags', () => {
    const result = validateRegexSafety('^KEYCHA\\d{3}$', ' i ');

    expect(result).toEqual({
      ok: true,
      normalizedFlags: 'i',
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
