import { describe, expect, it } from 'vitest';

import { parseValidatorScope } from '@/features/admin/pages/validator-scope';

describe('parseValidatorScope', () => {
  it('falls back to products for null or unknown values', () => {
    expect(parseValidatorScope(null)).toBe('products');
    expect(parseValidatorScope('unknown')).toBe('products');
  });

  it('parses image studio scope', () => {
    expect(parseValidatorScope('image-studio')).toBe('image-studio');
  });

  it('parses prompt exploder scope', () => {
    expect(parseValidatorScope('prompt-exploder')).toBe('prompt-exploder');
  });
});
