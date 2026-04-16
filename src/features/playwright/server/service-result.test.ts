import { describe, expect, it } from 'vitest';
import { badRequestError } from '@/shared/errors/app-error';

import {
  buildPlaywrightServiceListingCaughtFailure,
  buildPlaywrightServiceListingMissingContextFailure,
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

  it('builds shared not-found envelopes from listing run context failures', () => {
    expect(
      buildPlaywrightServiceListingMissingContextFailure({
        context: {
          ok: false,
          reason: 'connection_not_found',
          listing: {
            id: 'listing-1',
          } as never,
          repository: {} as never,
          connectionId: 'connection-1',
        },
        extra: {
          expiresAt: null,
        },
      })
    ).toEqual({
      ok: false,
      externalListingId: null,
      listingUrl: null,
      error: 'Connection not found: connection-1',
      errorCategory: 'NOT_FOUND',
      expiresAt: null,
    });
  });

  it('builds caught failure envelopes and merges AppError metadata', () => {
    expect(
      buildPlaywrightServiceListingCaughtFailure({
        error: badRequestError('Invalid category', {
          source: 'app-error',
          requestedBrowserMode: 'headless',
        }),
        errorMessage: 'Invalid category',
        errorCategory: 'FORM',
        metadata: {
          requestedBrowserMode: 'headed',
          requestedBrowserPreference: 'brave',
        },
        extra: {
          expiresAt: null,
        },
      })
    ).toEqual({
      ok: false,
      externalListingId: null,
      listingUrl: null,
      error: 'Invalid category',
      errorCategory: 'FORM',
      metadata: {
        source: 'app-error',
        requestedBrowserMode: 'headed',
        requestedBrowserPreference: 'brave',
      },
      expiresAt: null,
    });
  });

  it('can skip AppError metadata merging for providers that do not expose it', () => {
    expect(
      buildPlaywrightServiceListingCaughtFailure({
        error: badRequestError('Do not leak app meta', {
          source: 'app-error',
        }),
        errorMessage: 'Do not leak app meta',
        errorCategory: 'EXECUTION_FAILED',
        metadata: {
          requestedBrowserMode: 'headed',
        },
        includeAppErrorMetadata: false,
      })
    ).toEqual({
      ok: false,
      externalListingId: null,
      listingUrl: null,
      error: 'Do not leak app meta',
      errorCategory: 'EXECUTION_FAILED',
      metadata: {
        requestedBrowserMode: 'headed',
      },
    });
  });
});
