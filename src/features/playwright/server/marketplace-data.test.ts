import { describe, expect, it } from 'vitest';

import {
  buildPlaywrightListingLastExecutionRecord,
  buildPlaywrightListingMarketplaceDataRecord,
  buildPlaywrightMarketplaceListingProcessArtifacts,
  buildPlaywrightProgrammableListingProcessArtifacts,
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

  it('builds combined provider-backed process artifacts', () => {
    expect(
      buildPlaywrightMarketplaceListingProcessArtifacts({
        executedAt: new Date('2026-04-10T12:00:00.000Z'),
        existingMarketplaceData: {
          marketplace: 'vinted',
          listingUrl: 'https://example.com/existing',
          externalListingId: 'external-existing',
          vinted: {
            pendingExecution: {
              requestId: 'old-job',
            },
          },
        },
        existingExternalListingId: 'external-existing',
        marketplace: 'vinted',
        providerKey: 'vinted',
        result: {
          ok: true,
          externalListingId: 'external-2',
          listingUrl: 'https://example.com/item/2',
          error: null,
          errorCategory: null,
          metadata: {
            browserMode: 'headed',
          },
        },
        requestId: 'job-4',
        lastExecutionExtra: {
          action: 'sync',
        },
        providerState: {
          lastSyncedAt: '2026-04-10T12:00:00.000Z',
        },
      })
    ).toEqual({
      lastExecution: {
        executedAt: '2026-04-10T12:00:00.000Z',
        requestId: 'job-4',
        ok: true,
        error: null,
        errorCategory: null,
        metadata: {
          browserMode: 'headed',
        },
        action: 'sync',
      },
      marketplaceData: {
        marketplace: 'vinted',
        listingUrl: 'https://example.com/item/2',
        externalListingId: 'external-2',
        vinted: {
          lastErrorCategory: null,
          pendingExecution: null,
          lastSyncedAt: '2026-04-10T12:00:00.000Z',
          lastExecution: {
            executedAt: '2026-04-10T12:00:00.000Z',
            requestId: 'job-4',
            ok: true,
            error: null,
            errorCategory: null,
            metadata: {
              browserMode: 'headed',
            },
            action: 'sync',
          },
        },
      },
      historyBrowserMode: 'headed',
      persistedExternalListingId: 'external-2',
    });
  });

  it('builds programmable listing process artifacts with browser-mode history fallback', () => {
    expect(
      buildPlaywrightProgrammableListingProcessArtifacts({
        executedAt: new Date('2026-04-10T12:00:00.000Z'),
        existingMarketplaceData: {
          playwright: {
            previous: true,
            pendingExecution: {
              requestId: 'old-job',
            },
          },
        },
        result: {
          ok: false,
          externalListingId: null,
          listingUrl: null,
          error: 'selector missing',
          errorCategory: 'EXECUTION_FAILED',
          metadata: {
            requestedBrowserMode: 'headed',
          },
        },
        requestId: 'job-5',
        requestedBrowserMode: 'headed',
      })
    ).toEqual({
      effectiveBrowserMode: null,
      historyFields: ['browser_mode:headed'],
      lastExecution: {
        executedAt: '2026-04-10T12:00:00.000Z',
        requestId: 'job-5',
        metadata: {
          runId: null,
          browserMode: null,
          requestedBrowserMode: 'headed',
          publishVerified: null,
          rawResult: null,
        },
        errorCategory: 'EXECUTION_FAILED',
      },
      marketplaceData: {
        marketplace: 'playwright-programmable',
        listingUrl: null,
        playwright: {
          previous: true,
          lastErrorCategory: 'EXECUTION_FAILED',
          pendingExecution: null,
          lastExecution: {
            executedAt: '2026-04-10T12:00:00.000Z',
            requestId: 'job-5',
            metadata: {
              runId: null,
              browserMode: null,
              requestedBrowserMode: 'headed',
              publishVerified: null,
              rawResult: null,
            },
            errorCategory: 'EXECUTION_FAILED',
          },
        },
      },
    });
  });
});
