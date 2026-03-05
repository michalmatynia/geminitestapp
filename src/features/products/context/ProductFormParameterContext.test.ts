import { describe, expect, it } from 'vitest';

import { resolvePrimaryParameterValue } from './ProductFormParameterContext';

describe('resolvePrimaryParameterValue', () => {
  it('prefers default and then en/pl/de fallbacks', () => {
    expect(
      resolvePrimaryParameterValue({
        en: 'English',
        default: 'Default',
        pl: 'Polski',
      })
    ).toBe('Default');

    expect(
      resolvePrimaryParameterValue({
        en: 'English',
        pl: 'Polski',
      })
    ).toBe('English');
  });

  it('falls back to first non-empty localized value, then explicit fallback', () => {
    expect(
      resolvePrimaryParameterValue({
        fr: 'Francais',
      })
    ).toBe('Francais');

    expect(resolvePrimaryParameterValue({}, 'Fallback')).toBe('Fallback');
  });
});
