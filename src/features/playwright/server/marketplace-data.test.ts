import { describe, expect, it } from 'vitest';

import {
  buildPlaywrightListingLastExecutionRecord,
  buildPlaywrightListingMarketplaceDataRecord,
  buildPlaywrightListingProviderRecord,
} from './marketplace-data';

describe('playwright marketplace data helpers', () => {
  it('builds last-execution records with provider extras', () => {
    expect(
      buildPlaywrightListingLastExecutionRecord({
        executedAt: new Date('2026-04-10T12:00:00.000Z'),
        result: {
          ok: true,
          externalListingId: 'external-1',
          listingUrl: 'https://example.com/item/1',
          error: null,
          errorCategory: null,
          metadata: {
            publishVerified: true,
          },
        },
        requestId: 'job-1',
        metadata: {
          runId: 'run-1',
        },
        extra: {
          action: 'list',
        },
      })
    ).toEqual({
      executedAt: '2026-04-10T12:00:00.000Z',
      requestId: 'job-1',
      ok: true,
      error: null,
      errorCategory: null,
      metadata: {
        runId: 'run-1',
      },
      action: 'list',
    });
  });

  it('can omit shared outcome fields for programmable provider history', () => {
    expect(
      buildPlaywrightListingLastExecutionRecord({
        executedAt: new Date('2026-04-10T12:00:00.000Z'),
        result: {
          ok: false,
          externalListingId: null,
          listingUrl: null,
          error: 'selector missing',
          errorCategory: 'EXECUTION_FAILED',
          metadata: null,
        },
        requestId: 'job-2',
        includeOutcomeFields: false,
        metadata: {
          requestedBrowserMode: 'headless',
        },
      })
    ).toEqual({
      executedAt: '2026-04-10T12:00:00.000Z',
      requestId: 'job-2',
      metadata: {
        requestedBrowserMode: 'headless',
      },
    });
  });

  it('merges provider state and preserves existing root marketplace identity', () => {
    const lastExecution = buildPlaywrightListingLastExecutionRecord({
      executedAt: new Date('2026-04-10T12:00:00.000Z'),
      result: {
        ok: false,
        externalListingId: null,
        listingUrl: null,
        error: 'AUTH_REQUIRED',
        errorCategory: 'AUTH',
        metadata: {
          requestedBrowserMode: 'headed',
        },
      },
      requestId: 'job-3',
      metadata: {
        requestedBrowserMode: 'headed',
      },
    });

    expect(
      buildPlaywrightListingProviderRecord({
        existingMarketplaceData: {
          marketplace: 'tradera',
          listingUrl: 'https://example.com/existing',
          externalListingId: 'external-existing',
          tradera: {
            categoryId: 12345,
            pendingExecution: {
              requestId: 'old-job',
            },
          },
        },
        providerKey: 'tradera',
        result: {
          ok: false,
          externalListingId: null,
          listingUrl: null,
          error: 'AUTH_REQUIRED',
          errorCategory: 'AUTH',
          metadata: {
            requestedBrowserMode: 'headed',
          },
        },
        lastExecution,
        providerState: {
          lastStatusCheckAt: '2026-04-10T12:00:00.000Z',
        },
      })
    ).toEqual({
      categoryId: 12345,
      lastErrorCategory: 'AUTH',
      pendingExecution: null,
      lastStatusCheckAt: '2026-04-10T12:00:00.000Z',
      lastExecution,
    });

    expect(
      buildPlaywrightListingMarketplaceDataRecord({
        existingMarketplaceData: {
          marketplace: 'tradera',
          listingUrl: 'https://example.com/existing',
          externalListingId: 'external-existing',
          tradera: {
            categoryId: 12345,
          },
        },
        marketplace: 'tradera',
        providerKey: 'tradera',
        result: {
          ok: false,
          externalListingId: null,
          listingUrl: null,
          error: 'AUTH_REQUIRED',
          errorCategory: 'AUTH',
          metadata: {
            requestedBrowserMode: 'headed',
          },
        },
        lastExecution,
        providerState: {
          lastStatusCheckAt: '2026-04-10T12:00:00.000Z',
        },
      })
    ).toEqual({
      marketplace: 'tradera',
      listingUrl: 'https://example.com/existing',
      externalListingId: 'external-existing',
      tradera: {
        categoryId: 12345,
        lastErrorCategory: 'AUTH',
        pendingExecution: null,
        lastStatusCheckAt: '2026-04-10T12:00:00.000Z',
        lastExecution,
      },
    });
  });
});
