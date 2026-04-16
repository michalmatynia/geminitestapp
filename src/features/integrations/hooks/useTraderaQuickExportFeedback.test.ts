import { describe, expect, it } from 'vitest';

import {
  buildTrackedTraderaFeedbackOptions,
  findTrackedTraderaListing,
  isTrackedTraderaListingSuccess,
} from './useTraderaQuickExportFeedback';

describe('findTrackedTraderaListing', () => {
  const listings = [
    {
      id: 'listing-1',
      externalListingId: 'external-1',
      marketplaceData: {
        tradera: {
          lastExecution: {
            requestId: 'request-1',
          },
        },
      },
    },
    {
      id: 'listing-2',
      externalListingId: 'external-2',
      marketplaceData: {
        tradera: {
          pendingExecution: {
            requestId: 'request-2',
          },
        },
      },
    },
  ] as never[];

  it('prefers listing id matches first', () => {
    expect(
      findTrackedTraderaListing(listings, {
        productId: 'product-1',
        status: 'completed',
        expiresAt: Date.now() + 60_000,
        listingId: 'listing-2',
        requestId: 'request-1',
        externalListingId: 'external-1',
      })
    ).toBe(listings[1]);
  });

  it('falls back to request id and then external listing id', () => {
    expect(
      findTrackedTraderaListing(listings, {
        productId: 'product-1',
        status: 'completed',
        expiresAt: Date.now() + 60_000,
        requestId: 'request-2',
      })
    ).toBe(listings[1]);

    expect(
      findTrackedTraderaListing(listings, {
        productId: 'product-1',
        status: 'completed',
        expiresAt: Date.now() + 60_000,
        externalListingId: 'external-1',
      })
    ).toBe(listings[0]);
  });
});

describe('buildTrackedTraderaFeedbackOptions', () => {
  it('preserves duplicate-link metadata from feedback when the synced listing row does not carry it', () => {
    const options = buildTrackedTraderaFeedbackOptions(
      {
        id: 'listing-1',
        status: 'active',
        listedAt: '2026-04-06T09:15:00.000Z',
        externalListingId: '725447805',
        integrationId: 'integration-tradera-1',
        connectionId: 'conn-tradera-1',
        marketplaceData: {
          listingUrl: 'https://www.tradera.com/item/725447805',
          tradera: {
            lastExecution: {
              metadata: {},
            },
          },
        },
      } as never,
      {
        productId: 'product-1',
        status: 'completed',
        expiresAt: Date.now() + 60_000,
        duplicateLinked: true,
        metadata: {
          rawResult: {
            duplicateMatchStrategy: 'exact-title-single-candidate',
          },
        },
      }
    );

    expect(options.duplicateLinked).toBe(true);
    expect(options.duplicateMatchStrategy).toBe('exact-title-single-candidate');
    expect(options.metadata).toMatchObject({
      duplicateMatchStrategy: 'exact-title-single-candidate',
      rawResult: {
        duplicateMatchStrategy: 'exact-title-single-candidate',
      },
    });
  });

  it('prefers the synced listing duplicate strategy over persisted feedback fallback', () => {
    const options = buildTrackedTraderaFeedbackOptions(
      {
        id: 'listing-1',
        status: 'active',
        listedAt: '2026-04-06T09:15:00.000Z',
        externalListingId: '725447805',
        integrationId: 'integration-tradera-1',
        connectionId: 'conn-tradera-1',
        marketplaceData: {
          listingUrl: 'https://www.tradera.com/item/725447805',
          tradera: {
            lastExecution: {
              metadata: {
                duplicateLinked: true,
                duplicateMatchStrategy: 'existing-linked-record',
              },
            },
          },
        },
      } as never,
      {
        productId: 'product-1',
        status: 'completed',
        expiresAt: Date.now() + 60_000,
        duplicateLinked: true,
        metadata: {
          rawResult: {
            duplicateMatchStrategy: 'exact-title-single-candidate',
          },
        },
      }
    );

    expect(options.duplicateLinked).toBe(true);
    expect(options.duplicateMatchStrategy).toBe('existing-linked-record');
    expect(options.metadata).toMatchObject({
      duplicateMatchStrategy: 'existing-linked-record',
      rawResult: {
        duplicateMatchStrategy: 'exact-title-single-candidate',
      },
    });
  });
});

describe('isTrackedTraderaListingSuccess', () => {
  it('treats duplicate-linked Tradera metadata as success even before the listing status is normalized', () => {
    expect(
      isTrackedTraderaListingSuccess(
        {
          id: 'listing-1',
          status: 'failed',
          marketplaceData: {
            tradera: {
              lastExecution: {
                metadata: {
                  latestStage: 'duplicate_linked',
                },
              },
            },
          },
        } as never,
        {
          productId: 'product-1',
          status: 'processing',
          expiresAt: Date.now() + 60_000,
        }
      )
    ).toBe(true);
  });

  it('treats duplicate-linked persisted feedback as success when the synced listing row still looks failed', () => {
    expect(
      isTrackedTraderaListingSuccess(
        {
          id: 'listing-1',
          status: 'failed',
          marketplaceData: {
            tradera: {
              lastExecution: {
                metadata: {},
              },
            },
          },
        } as never,
        {
          productId: 'product-1',
          status: 'processing',
          expiresAt: Date.now() + 60_000,
          metadata: {
            rawResult: {
              duplicateMatchStrategy: 'exact-title-single-candidate',
            },
          },
        }
      )
    ).toBe(true);
  });
});
