import { describe, expect, it } from 'vitest';

import {
  buildLocalizedPathname,
  getLocaleFallbackChain,
  getPathLocale,
  resolveLocalizedText,
  resolvePreferredSiteLocale,
  stripSiteLocalePrefix,
} from '@/shared/lib/i18n/site-locale';

describe('site locale helpers', () => {
  it('detects locale prefixes in pathnames', () => {
    expect(getPathLocale('/en/products')).toBe('en');
    expect(getPathLocale('/pl')).toBe('pl');
    expect(getPathLocale('/products')).toBeNull();
  });

  it('builds localized pathnames while keeping the default locale canonical', () => {
    expect(buildLocalizedPathname('/', 'pl')).toBe('/');
    expect(buildLocalizedPathname('/products/123', 'en')).toBe('/en/products/123');
    expect(stripSiteLocalePrefix('/de/products/123')).toBe('/products/123');
  });

  it('resolves localized text with configured fallbacks', () => {
    expect(
      resolveLocalizedText(
        {
          pl: 'Polska tresc',
          en: 'English copy',
        },
        'de'
      )
    ).toBe('Polska tresc');

    expect(getLocaleFallbackChain('de')).toEqual(['de', 'pl']);
  });

  it('prefers explicit and cookie locales before accept-language', () => {
    expect(
      resolvePreferredSiteLocale({
        pathname: '/products',
        cookieLocale: 'de',
        acceptLanguage: 'en-US,en;q=0.9',
      })
    ).toBe('de');

    expect(
      resolvePreferredSiteLocale({
        pathname: '/unknown',
        acceptLanguage: 'en-US,en;q=0.9',
      })
    ).toBe('en');
  });
});
