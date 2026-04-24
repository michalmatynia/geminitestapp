import { describe, expect, it } from 'vitest';

import {
  resolveDisplayedTraderaFailureReason,
  resolvePreferredTraderaListing,
  resolveTraderaRowStatusPresentation,
} from './TraderaStatusCheckModal.utils';

const makeListing = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'listing-1',
    productId: 'product-1',
    integrationId: 'integration-tradera-browser',
    connectionId: 'connection-1',
    externalListingId: '721891408',
    inventoryId: null,
    status: 'failed',
    listedAt: '2026-04-01T10:00:00.000Z',
    expiresAt: null,
    nextRelistAt: null,
    relistPolicy: null,
    relistAttempts: 0,
    lastRelistedAt: null,
    lastStatusCheckAt: '2026-04-01T11:00:00.000Z',
    marketplaceData: {
      tradera: {},
    },
    failureReason: 'Persisted failure reason.',
    exportHistory: [],
    createdAt: '2026-04-01T09:00:00.000Z',
    updatedAt: '2026-04-01T11:00:00.000Z',
    integration: {
      id: 'integration-tradera-browser',
      name: 'Tradera',
      slug: 'tradera',
    },
    connection: {
      id: 'connection-1',
      name: 'Primary Tradera',
    },
    ...overrides,
  }) as never;

describe('TraderaStatusCheckModal.utils', () => {
  it('suppresses stale failure reasons when a live Tradera run has already duplicate-linked the listing', () => {
    const listing = makeListing();

    expect(
      resolveDisplayedTraderaFailureReason(listing, {
        liveRawResult: {
          duplicateMatchStrategy: 'exact-title-single-candidate',
        },
        liveLatestStage: 'duplicate_linked',
      })
    ).toBeNull();
  });

  it('returns a linked presentation when a live Tradera run is duplicate-linked', () => {
    const listing = makeListing();

    expect(
      resolveTraderaRowStatusPresentation({
        listing,
        liveRawResult: {
          duplicateMatchStrategy: 'exact-title-single-candidate',
        },
        liveLatestStage: 'duplicate_linked',
      })
    ).toEqual({
      status: 'active',
      label: 'linked',
      variant: 'active',
    });
  });

  it('falls back to the persisted row status when no duplicate-linked signals exist', () => {
    const listing = makeListing({
      status: 'failed',
      marketplaceData: {
        tradera: {
          lastExecution: {
            action: 'check_status',
            error: 'AUTH_REQUIRED: Stored Tradera session expired.',
          },
        },
      },
    });

    expect(resolveDisplayedTraderaFailureReason(listing)).toBe(
      'AUTH_REQUIRED: Stored Tradera session expired.'
    );
    expect(
      resolveTraderaRowStatusPresentation({
        listing,
      })
    ).toEqual({
      status: 'failed',
      label: 'Failed',
      variant: 'error',
    });
  });

  it('renders unknown status as a neutral row state', () => {
    const listing = makeListing({
      status: 'unknown',
    });

    expect(
      resolveTraderaRowStatusPresentation({
        listing,
      })
    ).toEqual({
      status: 'unknown',
      label: 'Unknown',
      variant: 'neutral',
    });
  });

  it('prefers the linked active Tradera listing when multiple Tradera rows exist', () => {
    const selected = resolvePreferredTraderaListing([
      makeListing({
        id: 'listing-unlinked',
        externalListingId: null,
        marketplaceData: {
          tradera: {},
        },
      }),
      makeListing({
        id: 'listing-linked',
        externalListingId: '721891408',
        marketplaceData: {
          tradera: {
            listingUrl: 'https://www.tradera.com/item/721891408',
          },
        },
      }),
    ]);

    expect(selected?.id).toBe('listing-linked');
  });
});
