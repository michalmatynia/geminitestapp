import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findProductListingByIdAcrossProvidersMock,
  getConnectionByIdMock,
  getIntegrationByIdMock,
  getProductByIdMock,
  runPlaywrightProgrammableListingForConnectionMock,
  captureExceptionMock,
} = vi.hoisted(() => ({
  findProductListingByIdAcrossProvidersMock: vi.fn(),
  getConnectionByIdMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
  getProductByIdMock: vi.fn(),
  runPlaywrightProgrammableListingForConnectionMock: vi.fn(),
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

vi.mock('@/shared/lib/products/services/product-repository', () => ({
  getProductRepository: async () => ({
    getProductById: (...args: unknown[]) => getProductByIdMock(...args),
  }),
}));

vi.mock('@/features/playwright/server', async () => {
  const actual =
    await vi.importActual<typeof import('@/features/playwright/server')>(
      '@/features/playwright/server'
    );
  return {
    ...actual,
    runPlaywrightProgrammableListingForConnection: (...args: unknown[]) =>
      runPlaywrightProgrammableListingForConnectionMock(...args) as Promise<unknown>,
  };
});

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => captureExceptionMock(...args),
  },
}));

import {
  buildPlaywrightListingInput,
  processPlaywrightListingJob,
  runPlaywrightListing,
} from './playwright-listing-service';

describe('playwright-listing-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConnectionByIdMock.mockResolvedValue({
      id: 'connection-1',
      integrationId: 'integration-1',
      playwrightListingScript: 'export default async function run() {}',
    });
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-1',
      slug: 'playwright-programmable',
    });
    getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      sku: 'SKU-1',
      name_en: 'Example product',
      description_en: 'Example description',
      price: 99,
      imageLinks: ['https://example.com/image-1.jpg'],
      images: [],
    });
  });

  it('applies marketplace-specific alternate copy when building Playwright listing input', () => {
    const input = buildPlaywrightListingInput({
      product: {
        id: 'product-1',
        sku: 'SKU-1',
        name_en: 'Example product',
        description_en: 'Example description',
        marketplaceContentOverrides: [
          {
            integrationIds: ['integration-1'],
            title: 'Marketplace title',
            description: 'Marketplace description',
          },
        ],
        imageLinks: [],
        images: [],
      } as never,
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
      } as never,
      connection: {
        id: 'connection-1',
        username: null,
        password: null,
      } as never,
    });

    expect(input).toEqual(
      expect.objectContaining({
        title: 'Marketplace title',
        description: 'Marketplace description',
      })
    );
  });

  it('passes headed relist overrides into the Playwright runner', async () => {
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
      },
    });
    runPlaywrightProgrammableListingForConnectionMock.mockResolvedValue({
      runId: 'run-1',
      externalListingId: 'external-1',
      listingUrl: 'https://example.com/listing/1',
      expiresAt: null,
      publishVerified: true,
      effectiveBrowserMode: 'headed',
      rawResult: {
        ok: true,
      },
    });

    const result = await runPlaywrightListing({
      listingId: 'listing-1',
      action: 'relist',
      browserMode: 'headed',
    });

    expect(runPlaywrightProgrammableListingForConnectionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connection: expect.objectContaining({ id: 'connection-1' }),
        browserMode: 'headed',
      })
    );
    expect(result).toMatchObject({
      ok: true,
      metadata: expect.objectContaining({
        browserMode: 'headed',
        requestedBrowserMode: 'headed',
      }),
    });
  });

  it('persists Playwright execution browser mode metadata for troubleshooting', async () => {
    const updateListingStatusMock = vi.fn();
    const updateListingMock = vi.fn();
    const appendExportHistoryMock = vi.fn();
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        marketplaceData: {
          playwright: {
            previous: true,
            pendingExecution: {
              requestedBrowserMode: 'headed',
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
    runPlaywrightProgrammableListingForConnectionMock.mockResolvedValue({
      runId: 'run-1',
      externalListingId: 'external-1',
      listingUrl: 'https://example.com/listing/1',
      expiresAt: null,
      publishVerified: false,
      effectiveBrowserMode: 'headed',
      rawResult: {
        stage: 'publish',
      },
    });

    await processPlaywrightListingJob({
      listingId: 'listing-1',
      action: 'relist',
      source: 'manual',
      jobId: 'job-playwright-1',
      browserMode: 'headed',
    });

    expect(updateListingStatusMock).toHaveBeenCalledWith('listing-1', 'active');
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        marketplaceData: expect.objectContaining({
          marketplace: 'playwright-programmable',
          listingUrl: 'https://example.com/listing/1',
          playwright: expect.objectContaining({
            previous: true,
            pendingExecution: null,
            lastExecution: expect.objectContaining({
              requestId: 'job-playwright-1',
              metadata: expect.objectContaining({
                runId: 'run-1',
                browserMode: 'headed',
                requestedBrowserMode: 'headed',
                publishVerified: false,
                rawResult: {
                  stage: 'publish',
                },
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
        relist: true,
        requestId: 'job-playwright-1',
        fields: ['browser_mode:headed'],
      })
    );
  });

  it('preserves the requested browser mode when a Playwright relist fails before reporting an effective mode', async () => {
    const updateListingStatusMock = vi.fn();
    const updateListingMock = vi.fn();
    const appendExportHistoryMock = vi.fn();
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        marketplaceData: {
          playwright: {
            previous: true,
            pendingExecution: {
              requestedBrowserMode: 'headless',
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
    runPlaywrightProgrammableListingForConnectionMock.mockRejectedValue(new Error('selector missing'));

    await expect(
      processPlaywrightListingJob({
        listingId: 'listing-1',
        action: 'relist',
        source: 'manual',
        jobId: 'job-playwright-2',
        browserMode: 'headless',
      })
    ).rejects.toThrow('selector missing');

    expect(updateListingStatusMock).toHaveBeenCalledWith('listing-1', 'failed');
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        failureReason: 'selector missing',
        marketplaceData: expect.objectContaining({
          playwright: expect.objectContaining({
            previous: true,
            pendingExecution: null,
            lastErrorCategory: 'EXECUTION_FAILED',
            lastExecution: expect.objectContaining({
              requestId: 'job-playwright-2',
              errorCategory: 'EXECUTION_FAILED',
              metadata: expect.objectContaining({
                browserMode: null,
                requestedBrowserMode: 'headless',
                rawResult: null,
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
        requestId: 'job-playwright-2',
        fields: ['browser_mode:headless'],
      })
    );
  });
});
