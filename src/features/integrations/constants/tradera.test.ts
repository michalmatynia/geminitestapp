import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TRADERA_SYSTEM_SETTINGS,
  normalizeTraderaListingFormUrl,
  normalizeTraderaListingPriceCurrencyCode,
  resolveTraderaListingPriceCurrencyCode,
  resolveTraderaSystemSettings,
  TRADERA_DIRECT_LISTING_FORM_URL,
  TRADERA_SETTINGS_KEYS,
} from './tradera';

describe('tradera listing form url normalization', () => {
  it('keeps official Tradera listing urls on the direct create-listing route', () => {
    expect(normalizeTraderaListingFormUrl(TRADERA_DIRECT_LISTING_FORM_URL)).toBe(
      TRADERA_DIRECT_LISTING_FORM_URL
    );
    expect(
      normalizeTraderaListingFormUrl('https://www.tradera.com/en/selling')
    ).toBe(
      TRADERA_DIRECT_LISTING_FORM_URL
    );
    expect(normalizeTraderaListingFormUrl('/en/selling/new')).toBe(
      TRADERA_DIRECT_LISTING_FORM_URL
    );
  });

  it('falls back to the direct Tradera create-listing url for invalid hosts', () => {
    expect(normalizeTraderaListingFormUrl('https://www.facebook.com/Tradera')).toBe(
      TRADERA_DIRECT_LISTING_FORM_URL
    );
    expect(normalizeTraderaListingFormUrl('not-a-url')).toBe(TRADERA_DIRECT_LISTING_FORM_URL);
  });

  it('sanitizes invalid saved listing urls when resolving Tradera system settings', () => {
    const settings = resolveTraderaSystemSettings({
      get: (key) =>
        key === 'tradera_listing_form_url'
          ? 'https://www.facebook.com/Tradera'
          : null,
    });

    expect(settings).toEqual({
      ...DEFAULT_TRADERA_SYSTEM_SETTINGS,
      listingFormUrl: TRADERA_DIRECT_LISTING_FORM_URL,
    });
  });

  it('defaults Tradera listing prices to EUR and accepts normalized overrides', () => {
    expect(normalizeTraderaListingPriceCurrencyCode(null)).toBe('EUR');
    expect(normalizeTraderaListingPriceCurrencyCode(' sek ')).toBe('SEK');

    expect(
      resolveTraderaSystemSettings({
        get: (key) =>
          key === TRADERA_SETTINGS_KEYS.listingPriceCurrencyCode ? 'sek' : null,
      }).listingPriceCurrencyCode
    ).toBe('SEK');

    expect(resolveTraderaListingPriceCurrencyCode({ listingPriceCurrencyCode: 'eur' })).toBe(
      'EUR'
    );
  });
});
