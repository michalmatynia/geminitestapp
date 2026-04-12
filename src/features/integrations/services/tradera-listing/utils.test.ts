import { describe, expect, it } from 'vitest';

import {
  buildCanonicalTraderaListingUrl,
  classifyTraderaFailure,
  extractExternalListingId,
  toUserFacingTraderaFailure,
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
      extractExternalListingId(
        'https://www.tradera.com/en/item/2805/725447805/slave-i-5-cm-metal-movie-keychain-star-wars'
      )
    ).toBe('725447805');
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

  it('keeps category picker stateful fallback failures classified as form errors', () => {
    expect(
      classifyTraderaFailure(
        'FAIL_CATEGORY_SET: Fallback category path "Other > Other" not found. Last state: {"selectedPath":"Accessories > Patches & pins > Pins","breadcrumbs":["Accessories","Patches & pins"],"visibleOptions":["Patches","Pins"]}'
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

  it('classifies image mismatch failures as form errors', () => {
    expect(
      classifyTraderaFailure(
        'FAIL_IMAGE_SET_INVALID: Tradera uploaded more image previews than expected. Last state: {"expectedUploadCount":3,"observedPreviewDelta":4}'
      )
    ).toBe('FORM');
  });

  it('classifies auth-state timeout failures as auth errors', () => {
    expect(
      classifyTraderaFailure(
        'AUTH_STATE_TIMEOUT: Tradera session validation did not resolve.'
      )
    ).toBe('AUTH');
  });
});

describe('toUserFacingTraderaFailure', () => {
  it('maps image preview mismatch failures to a user-facing retry message', () => {
    expect(
      toUserFacingTraderaFailure(
        'FORM',
        'FAIL_IMAGE_SET_INVALID: Tradera uploaded more image previews than expected. Last state: {"expectedUploadCount":3,"observedPreviewDelta":4}'
      )
    ).toBe(
      'Tradera image upload produced more previews than expected. Review the listing images in Tradera and retry.'
    );
  });

  it('maps duplicate-risk retry blocks to a user-facing retry message', () => {
    expect(
      toUserFacingTraderaFailure(
        'FORM',
        'FAIL_IMAGE_SET_INVALID: Tradera image upload reached a partial state and retrying could duplicate images. Last state: {"expectedUploadCount":3,"observedPreviewDelta":1}'
      )
    ).toBe(
      'Tradera image upload may have partially succeeded, and retrying could duplicate images. Review the listing images in Tradera and retry.'
    );
  });

  it('maps auth-state timeout failures to a session-refresh message', () => {
    expect(
      toUserFacingTraderaFailure(
        'AUTH',
        'AUTH_STATE_TIMEOUT: Tradera session validation did not resolve.'
      )
    ).toBe(
      'Tradera session validation did not resolve. Refresh the saved browser session and retry.'
    );
  });
});
