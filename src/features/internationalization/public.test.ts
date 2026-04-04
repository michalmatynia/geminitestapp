import { describe, expect, it } from 'vitest';

import * as internationalizationPublic from './public';

describe('internationalization public barrel', () => {
  it('continues exposing the internationalization settings surface', () => {
    expect(internationalizationPublic).toHaveProperty('InternationalizationSettings');
    expect(internationalizationPublic).toHaveProperty('CountryModal');
    expect(internationalizationPublic).toHaveProperty('CurrencyModal');
    expect(internationalizationPublic).toHaveProperty('LanguageModal');
  });

  it('continues exposing the context, hooks, and runtime helpers', () => {
    expect(internationalizationPublic).toHaveProperty('InternationalizationProvider');
    expect(internationalizationPublic).toHaveProperty('useInternationalizationContext');
    expect(internationalizationPublic).toHaveProperty('useCurrencies');
    expect(internationalizationPublic).toHaveProperty('useSaveCountryMutation');
    expect(internationalizationPublic).toHaveProperty('getCountries');
    expect(internationalizationPublic).toHaveProperty('defaultCountries');
    expect(internationalizationPublic).toHaveProperty('fallbackLanguages');
  });
});
