import { beforeEach, describe, expect, it, vi } from 'vitest';

import { internalError } from '@/shared/errors/app-error';

const {
  findProductListingByIdAcrossProvidersMock,
  getConnectionByIdMock,
  getIntegrationByIdMock,
  runVintedBrowserListingMock,
  captureExceptionMock,
} = vi.hoisted(() => ({
  findProductListingByIdAcrossProvidersMock: vi.fn(),
  getConnectionByIdMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
  runVintedBrowserListingMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  findProductListingByIdAcrossProviders: (...args: unknown[]) =>
    findProductListingByIdAcrossProvidersMock(...args) as Promise<unknown>,
  getIntegrationRepository: async () => ({
    getConnectionById: (...args: unknown[]) => getConnectionByIdMock(...args),
    getIntegrationById: (...args: unknown[]) => getIntegrationByIdMock(...args),
  }),
}));

vi.mock('./vinted-listing/vinted-browser-listing', () => ({
  runVintedBrowserListing: (...args: unknown[]) =>
    runVintedBrowserListingMock(...args) as Promise<unknown>,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => captureExceptionMock(...args),
  },
}));

import {
  processVintedListingJob,
  runVintedListing,
} from './vinted-listing-service';

describe('vinted-listing-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-1',
      slug: 'vinted',
    });
    getConnectionByIdMock.mockResolvedValue({
      id: 'connection-1',
      integrationId: 'integration-1',
      playwrightBrowser: 'auto',
    });
  });

  it('uses Brave headed defaults for API-triggered Vinted runs', async () => {
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
      },
    });
    runVintedBrowserListingMock.mockResolvedValue({
      externalListingId: 'external-1',
      listingUrl: 'https://www.vinted.pl/items/123456-example',
      metadata: {
        browserMode: 'headed',
        requestedBrowserMode: 'headed',
        browserPreference: 'brave',
        requestedBrowserPreference: 'brave',
        browserLabel: 'Brave',
        publishVerified: true,
      },
    });

    const result = await runVintedListing({
      listingId: 'listing-1',
      action: 'list',
      source: 'api',
    });

    expect(runVintedBrowserListingMock).toHaveBeenCalledWith(
      expect.objectContaining({
        browserMode: 'headed',
        browserPreference: 'brave',
      })
    );
    expect(result).toMatchObject({
      ok: true,
      metadata: expect.objectContaining({
        requestedBrowserMode: 'headed',
        requestedBrowserPreference: 'brave',
      }),
    });
  });

  it('uses canonical resolved Playwright settings for scheduler-triggered Vinted runs', async () => {
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
      },
    });
    getConnectionByIdMock.mockResolvedValue({
      id: 'connection-1',
      integrationId: 'integration-1',
      playwrightBrowser: 'auto',
      playwrightPersonaId: 'persona-1',
    });
    runVintedBrowserListingMock.mockResolvedValue({
      externalListingId: 'external-1',
      listingUrl: 'https://www.vinted.pl/items/123456-example',
      metadata: {
        browserMode: 'headed',
        requestedBrowserMode: 'connection_default',
        browserPreference: 'brave',
        requestedBrowserPreference: null,
        browserLabel: 'Brave',
        publishVerified: true,
      },
    });

    const result = await runVintedListing({
      listingId: 'listing-1',
      action: 'list',
      source: 'scheduler',
    });

    expect(runVintedBrowserListingMock).toHaveBeenCalledWith(
      expect.objectContaining({
        browserMode: 'connection_default',
        browserPreference: undefined,
      })
    );
    expect(result).toMatchObject({
      ok: true,
      metadata: expect.objectContaining({
        requestedBrowserMode: 'connection_default',
      }),
    });
  });

  it('persists Vinted execution metadata and clears pending execution on success', async () => {
    const updateListingStatusMock = vi.fn();
    const updateListingMock = vi.fn();
    const appendExportHistoryMock = vi.fn();
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        externalListingId: null,
        marketplaceData: {
          vinted: {
            pendingExecution: {
              requestedBrowserMode: 'headed',
              requestedBrowserPreference: 'brave',
              requestId: 'old-job',
            },
          },
        },
      },
      repository: {
        updateListingStatus: (...args: unknown[]) => updateListingStatusMock(...args),
        updateListing: (...args: unknown[]) => updateListingMock(...args),
        appendExportHistory: (...args: unknown[]) => appendExportHistoryMock(...args),
      },
    });
    runVintedBrowserListingMock.mockResolvedValue({
      externalListingId: 'external-1',
      listingUrl: 'https://www.vinted.pl/items/123456-example',
      metadata: {
        browserMode: 'headed',
        requestedBrowserMode: 'headed',
        browserPreference: 'brave',
        requestedBrowserPreference: 'brave',
        browserLabel: 'Brave',
        publishVerified: true,
        rawResult: {
          finalUrl: 'https://www.vinted.pl/items/123456-example',
        },
      },
    });

    await processVintedListingJob({
      listingId: 'listing-1',
      action: 'list',
      source: 'api',
      jobId: 'job-vinted-1',
    });

    expect(updateListingStatusMock).toHaveBeenCalledWith('listing-1', 'running');
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        status: 'active',
        externalListingId: 'external-1',
        failureReason: null,
        marketplaceData: expect.objectContaining({
          marketplace: 'vinted',
          listingUrl: 'https://www.vinted.pl/items/123456-example',
          externalListingId: 'external-1',
          vinted: expect.objectContaining({
            pendingExecution: null,
            lastExecution: expect.objectContaining({
              requestId: 'job-vinted-1',
              ok: true,
              action: 'list',
              source: 'api',
              metadata: expect.objectContaining({
                browserMode: 'headed',
                requestedBrowserMode: 'headed',
                browserPreference: 'brave',
                requestedBrowserPreference: 'brave',
                browserLabel: 'Brave',
                publishVerified: true,
              }),
            }),
          }),
        }),
      })
    );
    expect(appendExportHistoryMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        status: 'active',
        requestId: 'job-vinted-1',
        fields: ['browser_mode:headed'],
      })
    );
  });

  it('persists requested Vinted runtime metadata when publish verification fails', async () => {
    const updateListingStatusMock = vi.fn();
    const updateListingMock = vi.fn();
    const appendExportHistoryMock = vi.fn();
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        externalListingId: null,
        marketplaceData: {
          listingUrl: 'https://www.vinted.pl/items/existing',
          vinted: {
            pendingExecution: {
              requestedBrowserMode: 'headed',
              requestedBrowserPreference: 'brave',
              requestId: 'old-job',
            },
          },
        },
      },
      repository: {
        updateListingStatus: (...args: unknown[]) => updateListingStatusMock(...args),
        updateListing: (...args: unknown[]) => updateListingMock(...args),
        appendExportHistory: (...args: unknown[]) => appendExportHistoryMock(...args),
      },
    });
    runVintedBrowserListingMock.mockRejectedValue(
      internalError('Vinted publish verification failed: listing URL was not confirmed after submit.', {
        requestedBrowserMode: 'headed',
        browserMode: 'headed',
        requestedBrowserPreference: 'brave',
        browserPreference: 'brave',
        browserLabel: 'Brave',
        publishVerified: false,
        currentUrl: 'https://www.vinted.pl/items/new',
      })
    );

    await expect(
      processVintedListingJob({
        listingId: 'listing-1',
        action: 'list',
        source: 'api',
        jobId: 'job-vinted-2',
      })
    ).rejects.toThrow(
      'Vinted publish verification failed: listing URL was not confirmed after submit.'
    );

    expect(updateListingStatusMock).toHaveBeenCalledWith('listing-1', 'failed');
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        status: 'failed',
        failureReason:
          'Vinted publish verification failed: listing URL was not confirmed after submit.',
        marketplaceData: expect.objectContaining({
          marketplace: 'vinted',
          listingUrl: 'https://www.vinted.pl/items/existing',
          vinted: expect.objectContaining({
            pendingExecution: null,
            lastErrorCategory: 'FORM',
            lastExecution: expect.objectContaining({
              requestId: 'job-vinted-2',
              ok: false,
              errorCategory: 'FORM',
              metadata: expect.objectContaining({
                requestedBrowserMode: 'headed',
                requestedBrowserPreference: 'brave',
                browserLabel: 'Brave',
                publishVerified: false,
              }),
            }),
          }),
        }),
      })
    );
    expect(appendExportHistoryMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        status: 'failed',
        requestId: 'job-vinted-2',
        fields: ['browser_mode:headed'],
      })
    );
  });

  it('classifies deterministic Vinted mapping failures separately from generic form errors', async () => {
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
      },
    });
    runVintedBrowserListingMock.mockRejectedValue(
      internalError(
        'Vinted category mapping required: set a Vinted Category custom field or parameter, or assign an internal product category.',
        {
          fieldName: 'category',
          diagnostics: {
            availableCustomFields: ['Market Exclusion'],
            availableParameters: ['Condition'],
            productCategoryPath: 'Women > Dresses',
            producerNames: ['COS'],
          },
        }
      )
    );

    const result = await runVintedListing({
      listingId: 'listing-1',
      action: 'list',
      source: 'api',
    });

    expect(result).toMatchObject({
      ok: false,
      errorCategory: 'MAPPING',
      metadata: expect.objectContaining({
        fieldName: 'category',
        diagnostics: expect.objectContaining({
          productCategoryPath: 'Women > Dresses',
        }),
        requestedBrowserMode: 'headed',
        requestedBrowserPreference: 'brave',
      }),
    });
  });
});
