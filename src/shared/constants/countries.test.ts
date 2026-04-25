import { describe, expect, it } from 'vitest';

import { countryCodeOptions } from './countries';

describe('countryCodeOptions', () => {
  it('contains a full unique ISO alpha-2 country list', () => {
    const codes = countryCodeOptions.map((country) => country.code);

    expect(countryCodeOptions).toHaveLength(249);
    expect(new Set(codes)).toHaveLength(countryCodeOptions.length);
    expect(codes).toEqual([...codes].sort());
    expect(countryCodeOptions).toEqual(
      expect.arrayContaining([
        { code: 'DE', name: 'Germany' },
        { code: 'GB', name: 'United Kingdom' },
        { code: 'PL', name: 'Poland' },
        { code: 'SE', name: 'Sweden' },
        { code: 'US', name: 'United States' },
      ])
    );
  });
});
