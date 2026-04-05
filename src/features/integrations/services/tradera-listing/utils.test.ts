import { describe, expect, it } from 'vitest';

import {
  buildCanonicalTraderaListingUrl,
  classifyTraderaFailure,
  extractExternalListingId,
} from './utils';

describe('buildCanonicalTraderaListingUrl', () => {
  it('builds the canonical Tradera item url from the external listing id', () => {
    expect(buildCanonicalTraderaListingUrl('123456789')).toBe(
      'https://www.tradera.com/item/123456789'
    );
  });
});

describe('extractExternalListingId', () => {
  it('extracts ids only from Tradera item-style listing URLs', () => {
    expect(extractExternalListingId('https://www.tradera.com/item/123456789')).toBe(
      '123456789'
    );
    expect(
      extractExternalListingId('https://www.tradera.com/en/listing/987654321?foo=bar')
    ).toBe('987654321');
  });

  it('does not treat draft URLs as published listing ids', () => {
    expect(
      extractExternalListingId(
        'https://www.tradera.com/en/selling/draft/69cfa5c39050080001c3a2c9'
      )
    ).toBeNull();
  });
});

describe('classifyTraderaFailure', () => {
  it('classifies blocked external-click guard failures as navigation errors', () => {
    expect(
      classifyTraderaFailure(
        'FAIL_SELL_PAGE_INVALID: Refusing to click external link target "https://example.com".'
      )
    ).toBe('NAVIGATION');
  });

  it('classifies category selection failures as form errors', () => {
    expect(
      classifyTraderaFailure(
        'FAIL_CATEGORY_SET: Tradera mapped category "Collectibles > Pins" could not be selected in the listing form.'
      )
    ).toBe('FORM');
  });

  it('classifies missing Tradera shipping-group configuration as a form error', () => {
    expect(
      classifyTraderaFailure(
        'Tradera export requires a shipping group with a Tradera shipping price in EUR. Assign or configure a shipping group with the EUR price and retry.'
      )
    ).toBe('FORM');
  });
});
