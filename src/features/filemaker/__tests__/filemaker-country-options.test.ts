import { describe, expect, it } from 'vitest';

import {
  buildFilemakerCountryList,
  buildFilemakerCountryLookup,
  resolveFilemakerCountryId,
  resolveFilemakerCountryName,
} from '../settings/filemaker-country-options';

describe('FileMaker country options', () => {
  it('falls back to the full internationalization country list', () => {
    const countries = buildFilemakerCountryList([]);

    expect(countries).toHaveLength(249);
    expect(countries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'DE', id: 'DE', name: 'Germany' }),
        expect.objectContaining({ code: 'PL', id: 'PL', name: 'Poland' }),
        expect.objectContaining({ code: 'US', id: 'US', name: 'United States' }),
      ])
    );
  });

  it('uses internationalization records over static country defaults', () => {
    const countries = buildFilemakerCountryList([
      {
        code: 'PL',
        currencies: [],
        id: 'country-pl',
        isActive: true,
        name: 'Polska',
      },
    ]);
    const lookup = buildFilemakerCountryLookup(countries);

    expect(resolveFilemakerCountryId('PL', '', countries, lookup)).toBe('country-pl');
    expect(resolveFilemakerCountryId('country-pl', '', countries, lookup)).toBe('country-pl');
    expect(resolveFilemakerCountryName('', 'polska', countries, lookup)).toBe('Polska');
  });

  it('resolves legacy country-id tokens to ISO-backed countries', () => {
    const countries = buildFilemakerCountryList([]);
    const lookup = buildFilemakerCountryLookup(countries);

    expect(resolveFilemakerCountryId('country-pl', '', countries, lookup)).toBe('PL');
    expect(resolveFilemakerCountryName('', 'poland', countries, lookup)).toBe('Poland');
  });
});
