import { describe, expect, it } from 'vitest';

import {
  buildPlaywrightServiceListingFailure,
  buildPlaywrightServiceListingSuccess,
} from './service-result';

describe('playwright service result helpers', () => {
  it('builds a shared success envelope with provider-specific extras', () => {
    expect(
      buildPlaywrightServiceListingSuccess({
        externalListingId: 'external-1',
        listingUrl: 'https://example.com/item/1',
        metadata: {
          publishVerified: true,
        },
        extra: {
          expiresAt: null,
        },
      })
    ).toEqual({
      ok: true,
      externalListingId: 'external-1',
      listingUrl: 'https://example.com/item/1',
      error: null,
      errorCategory: null,
      metadata: {
        publishVerified: true,
      },
      expiresAt: null,
    });
  });

  it('builds a shared failure envelope with provider-specific extras', () => {
    expect(
      buildPlaywrightServiceListingFailure({
        error: 'AUTH_REQUIRED',
        errorCategory: 'AUTH',
        metadata: {
          requestedBrowserMode: 'headed',
        },
        extra: {
          nextRelistAt: null,
        },
      })
    ).toEqual({
      ok: false,
      externalListingId: null,
      listingUrl: null,
      error: 'AUTH_REQUIRED',
      errorCategory: 'AUTH',
      metadata: {
        requestedBrowserMode: 'headed',
      },
      nextRelistAt: null,
    });
  });
});
