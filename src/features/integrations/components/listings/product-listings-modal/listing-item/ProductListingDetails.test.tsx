/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useProductListingsDataMock, useProductListingsUIStateMock } = vi.hoisted(() => ({
  useProductListingsDataMock: vi.fn(),
  useProductListingsUIStateMock: vi.fn(),
}));

vi.mock('@/features/integrations/context/ProductListingsContext', () => ({
  useProductListingsData: () => useProductListingsDataMock(),
  useProductListingsUIState: () => useProductListingsUIStateMock(),
}));

import { ProductListingDetails } from './ProductListingDetails';

describe('ProductListingDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProductListingsDataMock.mockReturnValue({
      product: {
        sku: 'SKU-1',
        ean: 'EAN-1',
        weight: 1,
        name_en: 'Example product',
        description_en: 'Example description',
        price: 123,
        stock: 5,
      },
    });
    useProductListingsUIStateMock.mockReturnValue({
      historyOpenByListing: {},
      setHistoryOpenByListing: vi.fn(),
    });
  });

  it('shows Tradera last execution metadata when available', () => {
    useProductListingsUIStateMock.mockReturnValue({
      historyOpenByListing: { 'listing-1': true },
      setHistoryOpenByListing: vi.fn(),
    });

    render(
      <ProductListingDetails
        listing={
          {
            id: 'listing-1',
            status: 'failed',
            externalListingId: null,
            inventoryId: null,
            listedAt: null,
            expiresAt: null,
            nextRelistAt: null,
            relistAttempts: 0,
            createdAt: '2026-04-02T10:00:00.000Z',
            failureReason: 'Tradera scripted listing failed.',
            exportHistory: [
              {
                exportedAt: '2026-04-02T11:15:00.000Z',
                status: 'failed',
                requestId: 'job-tradera-1',
                externalListingId: 'ext-1',
                fields: ['browser_mode:headed'],
              },
            ],
            integration: {
              name: 'Tradera',
              slug: 'tradera',
            },
            connection: {
              id: 'connection-1',
              name: 'Tradera Browser',
            },
            marketplaceData: {
              tradera: {
                lastExecution: {
                  executedAt: '2026-04-02T11:15:00.000Z',
                  requestId: 'job-tradera-1',
                  errorCategory: 'AUTH',
                  metadata: {
                    scriptMode: 'scripted',
                    browserMode: 'headed',
                    requestedBrowserMode: 'headed',
                    scriptSource: 'legacy-default-refresh',
                    listingFormUrl: 'https://www.tradera.com/en/selling/new',
                    runId: 'run-123',
                    publishVerified: false,
                    categorySource: 'categoryMapper',
                    categoryMappingReason: 'mapped',
                    categoryMatchScope: 'catalog_match',
                    categoryInternalCategoryId: 'internal-category-1',
                    categoryId: '101',
                    categoryPath: 'Collectibles > Pins',
                    rawResult: {
                      status: 'publish_failed',
                      step: 'verify-active-listing',
                    },
                  },
                },
              },
              listingUrl: 'https://www.tradera.com/item/123',
            },
          } as never
        }
      />
    );

    expect(screen.getByText('Last execution:')).toBeInTheDocument();
    expect(screen.getAllByText(/2026/).length).toBeGreaterThan(0);
    expect(screen.getByText('Run mode:')).toBeInTheDocument();
    expect(screen.getByText('scripted')).toBeInTheDocument();
    expect(screen.getAllByText('Browser mode:').length).toBeGreaterThan(1);
    expect(screen.getAllByText('headed').length).toBeGreaterThan(1);
    expect(screen.getByText('Script source:')).toBeInTheDocument();
    expect(screen.getByText('legacy-default-refresh')).toBeInTheDocument();
    expect(screen.getByText('Start URL:')).toBeInTheDocument();
    expect(screen.getByText('https://www.tradera.com/en/selling/new')).toBeInTheDocument();
    expect(screen.getByText('Run ID:')).toBeInTheDocument();
    expect(screen.getByText('run-123')).toBeInTheDocument();
    expect(screen.getByText('Queue job:')).toBeInTheDocument();
    expect(screen.getAllByText('job-tradera-1').length).toBeGreaterThan(1);
    expect(screen.getByText('Publish verified:')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByText('Category source:')).toBeInTheDocument();
    expect(screen.getByText('categoryMapper')).toBeInTheDocument();
    expect(screen.getByText('Category mapping reason:')).toBeInTheDocument();
    expect(screen.getByText('mapped')).toBeInTheDocument();
    expect(screen.getByText('Category match scope:')).toBeInTheDocument();
    expect(screen.getByText('catalog_match')).toBeInTheDocument();
    expect(screen.getByText('Internal category:')).toBeInTheDocument();
    expect(screen.getByText('internal-category-1')).toBeInTheDocument();
    expect(screen.getByText('Category ID:')).toBeInTheDocument();
    expect(screen.getByText('101')).toBeInTheDocument();
    expect(screen.getByText('Category path:')).toBeInTheDocument();
    expect(screen.getByText('Collectibles > Pins')).toBeInTheDocument();
    expect(screen.getByText('Listing URL:')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open listing' })).toHaveAttribute(
      'href',
      'https://www.tradera.com/item/123'
    );
    expect(screen.getByText('Error category:')).toBeInTheDocument();
    expect(screen.getByText('AUTH')).toBeInTheDocument();
    expect(screen.getByText('Tradera run result')).toBeInTheDocument();
    expect(screen.getByText(/publish_failed/)).toBeInTheDocument();
  });

  it('falls back to Tradera lastErrorCategory when lastExecution has no category', () => {
    render(
      <ProductListingDetails
        listing={
          {
            id: 'listing-1',
            status: 'failed',
            externalListingId: null,
            inventoryId: null,
            listedAt: null,
            expiresAt: null,
            nextRelistAt: null,
            relistAttempts: 0,
            createdAt: '2026-04-02T10:00:00.000Z',
            failureReason: 'Timeout during publish.',
            exportHistory: [],
            integration: {
              name: 'Tradera',
              slug: 'tradera',
            },
            connection: {
              id: 'connection-1',
              name: 'Tradera Browser',
            },
            marketplaceData: {
              tradera: {
                lastErrorCategory: 'NAVIGATION',
                lastExecution: {
                  executedAt: '2026-04-02T11:15:00.000Z',
                  metadata: {
                    mode: 'builtin',
                  },
                },
              },
            },
          } as never
        }
      />
    );

    expect(screen.getByText('Run mode:')).toBeInTheDocument();
    expect(screen.getByText('builtin')).toBeInTheDocument();
    expect(screen.getByText('Error category:')).toBeInTheDocument();
    expect(screen.getByText('NAVIGATION')).toBeInTheDocument();
  });

  it('shows Tradera category mapper fallback diagnostics when no mapped category was applied', () => {
    render(
      <ProductListingDetails
        listing={
          {
            id: 'listing-1',
            status: 'failed',
            externalListingId: null,
            inventoryId: null,
            listedAt: null,
            expiresAt: null,
            nextRelistAt: null,
            relistAttempts: 0,
            createdAt: '2026-04-02T10:00:00.000Z',
            failureReason: 'Category fallback used.',
            exportHistory: [],
            integration: {
              name: 'Tradera',
              slug: 'tradera',
            },
            connection: {
              id: 'connection-1',
              name: 'Tradera Browser',
            },
            marketplaceData: {
              tradera: {
                lastExecution: {
                  executedAt: '2026-04-02T11:15:00.000Z',
                  metadata: {
                    scriptMode: 'scripted',
                    categorySource: 'fallback',
                    categoryMappingReason: 'ambiguous_external_category',
                    categoryMatchScope: 'cross_catalog',
                    categoryInternalCategoryId: 'internal-category-1',
                  },
                },
              },
            },
          } as never
        }
      />
    );

    expect(screen.getByText('Category source:')).toBeInTheDocument();
    expect(screen.getByText('fallback')).toBeInTheDocument();
    expect(screen.getByText('Category mapping reason:')).toBeInTheDocument();
    expect(screen.getByText('ambiguous_external_category')).toBeInTheDocument();
    expect(screen.getByText('Category match scope:')).toBeInTheDocument();
    expect(screen.getByText('cross_catalog')).toBeInTheDocument();
    expect(screen.getByText('Internal category:')).toBeInTheDocument();
    expect(screen.getByText('internal-category-1')).toBeInTheDocument();
  });

  it('shows pending Tradera relist metadata while a recovery relist is queued', () => {
    render(
      <ProductListingDetails
        listing={
          {
            id: 'listing-1',
            status: 'queued_relist',
            externalListingId: null,
            inventoryId: null,
            listedAt: null,
            expiresAt: null,
            nextRelistAt: null,
            relistAttempts: 1,
            createdAt: '2026-04-02T10:00:00.000Z',
            failureReason: null,
            exportHistory: [],
            integration: {
              name: 'Tradera',
              slug: 'tradera',
            },
            connection: {
              id: 'connection-1',
              name: 'Tradera Browser',
            },
            marketplaceData: {
              tradera: {
                pendingExecution: {
                  requestedBrowserMode: 'headed',
                  requestId: 'job-tradera-queued-1',
                  queuedAt: '2026-04-02T11:30:00.000Z',
                },
              },
            },
          } as never
        }
      />
    );

    expect(screen.getByText('Pending relist:')).toBeInTheDocument();
    expect(screen.getAllByText(/2026/).length).toBeGreaterThan(0);
    expect(screen.getByText('Pending browser mode:')).toBeInTheDocument();
    expect(screen.getByText('headed')).toBeInTheDocument();
    expect(screen.getByText('Pending queue job:')).toBeInTheDocument();
    expect(screen.getByText('job-tradera-queued-1')).toBeInTheDocument();
  });

  it('shows Playwright execution metadata including browser mode for troubleshooting relists', () => {
    useProductListingsUIStateMock.mockReturnValue({
      historyOpenByListing: { 'listing-1': true },
      setHistoryOpenByListing: vi.fn(),
    });

    render(
      <ProductListingDetails
        listing={
          {
            id: 'listing-1',
            status: 'failed',
            externalListingId: null,
            inventoryId: null,
            listedAt: null,
            expiresAt: null,
            nextRelistAt: null,
            relistAttempts: 1,
            createdAt: '2026-04-02T10:00:00.000Z',
            failureReason: 'Programmable Playwright listing failed.',
            exportHistory: [
              {
                exportedAt: '2026-04-02T11:15:00.000Z',
                status: 'failed',
                requestId: 'job-playwright-1',
                externalListingId: 'ext-playwright-1',
                fields: ['browser_mode:headed', 'title', 'description'],
              },
            ],
            integration: {
              name: 'Playwright',
              slug: 'playwright-programmable',
            },
            connection: {
              id: 'connection-1',
              name: 'Playwright Browser',
            },
            marketplaceData: {
              playwright: {
                lastExecution: {
                  executedAt: '2026-04-02T11:15:00.000Z',
                  requestId: 'job-playwright-1',
                  errorCategory: 'EXECUTION_FAILED',
                  metadata: {
                    runId: 'run-playwright-1',
                    browserMode: 'headed',
                    requestedBrowserMode: 'headed',
                    publishVerified: false,
                    rawResult: {
                      stage: 'publish',
                      reason: 'selector_timeout',
                    },
                  },
                },
              },
              listingUrl: 'https://example.com/listing/123',
            },
          } as never
        }
      />
    );

    expect(screen.getByText('Last execution:')).toBeInTheDocument();
    expect(screen.getAllByText('Browser mode:').length).toBeGreaterThan(1);
    expect(screen.getAllByText('headed').length).toBeGreaterThan(1);
    expect(screen.getByText('Run ID:')).toBeInTheDocument();
    expect(screen.getByText('run-playwright-1')).toBeInTheDocument();
    expect(screen.getByText('Queue job:')).toBeInTheDocument();
    expect(screen.getAllByText('job-playwright-1').length).toBeGreaterThan(1);
    expect(screen.getByText('Publish verified:')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open listing' })).toHaveAttribute(
      'href',
      'https://example.com/listing/123'
    );
    expect(screen.getByText('Error category:')).toBeInTheDocument();
    expect(screen.getByText('EXECUTION_FAILED')).toBeInTheDocument();
    expect(screen.getByText('Playwright run result')).toBeInTheDocument();
    expect(screen.getByText(/selector_timeout/)).toBeInTheDocument();
    expect(screen.getByText('Request ID:')).toBeInTheDocument();
    expect(screen.getByText('Fields:')).toBeInTheDocument();
    expect(screen.getByText('title, description')).toBeInTheDocument();
  });

  it('falls back to requested Playwright browser mode when the run never reports an effective mode', () => {
    useProductListingsUIStateMock.mockReturnValue({
      historyOpenByListing: { 'listing-1': true },
      setHistoryOpenByListing: vi.fn(),
    });

    render(
      <ProductListingDetails
        listing={
          {
            id: 'listing-1',
            status: 'failed',
            externalListingId: null,
            inventoryId: null,
            listedAt: null,
            expiresAt: null,
            nextRelistAt: null,
            relistAttempts: 1,
            createdAt: '2026-04-02T10:00:00.000Z',
            failureReason: 'Programmable Playwright listing failed.',
            exportHistory: [
              {
                exportedAt: '2026-04-02T11:25:00.000Z',
                status: 'failed',
                requestId: 'job-playwright-2',
                externalListingId: null,
                fields: ['browser_mode:headless'],
              },
            ],
            integration: {
              name: 'Playwright',
              slug: 'playwright-programmable',
            },
            connection: {
              id: 'connection-1',
              name: 'Playwright Browser',
            },
            marketplaceData: {
              playwright: {
                pendingExecution: {
                  requestedBrowserMode: 'headless',
                  requestId: 'job-playwright-2',
                  queuedAt: '2026-04-02T11:25:00.000Z',
                },
                lastExecution: {
                  executedAt: '2026-04-02T11:25:00.000Z',
                  requestId: 'job-playwright-2',
                  errorCategory: 'EXECUTION_FAILED',
                  metadata: {
                    requestedBrowserMode: 'headless',
                  },
                },
              },
            },
          } as never
        }
      />
    );

    expect(screen.getAllByText('Browser mode:').length).toBeGreaterThan(1);
    expect(screen.getAllByText('headless').length).toBeGreaterThan(1);
    expect(screen.getByText('Pending relist:')).toBeInTheDocument();
    expect(screen.getByText('Pending browser mode:')).toBeInTheDocument();
    expect(screen.getByText('Pending queue job:')).toBeInTheDocument();
    expect(screen.getByText('Request ID:')).toBeInTheDocument();
    expect(screen.getByText('Fields:')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});
