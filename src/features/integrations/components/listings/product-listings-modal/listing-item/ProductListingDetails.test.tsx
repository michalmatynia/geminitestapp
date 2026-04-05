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
                    scriptKind: 'managed',
                    scriptMarker: 'tradera-quicklist-default:v94',
                    listingFormUrl: 'https://www.tradera.com/en/selling/new',
                    runId: 'run-123',
                    playwrightPersonaId: 'persona-natural',
                    playwrightSettings: {
                      slowMo: 85,
                      timeout: 30000,
                      navigationTimeout: 45000,
                      humanizeMouse: true,
                      clickDelayMin: 40,
                      clickDelayMax: 140,
                      inputDelayMin: 30,
                      inputDelayMax: 110,
                      actionDelayMin: 220,
                      actionDelayMax: 800,
                    },
                    publishVerified: false,
                    latestStage: 'fields_filled',
                    latestStageUrl: 'https://www.tradera.com/en/selling/draft/69cfa5c39050080001c3a2c9',
                    failureArtifacts: [
                      {
                        name: 'failure',
                        path: 'ai-paths-playwright-runs/run-123/failure.png',
                        kind: 'screenshot',
                        mimeType: 'image/png',
                      },
                    ],
                    logTail: [
                      '[user] tradera.quicklist.start',
                      '[runtime][error] FAIL_PUBLISH_VALIDATION',
                    ],
                    imageSettleState: {
                      selectedImageFileCount: 1,
                      draftImageRemoveControls: 0,
                      imageUploadPromptVisible: true,
                      imageUploadPending: false,
                      continueButtonVisible: true,
                      continueButtonDisabled: true,
                    },
                    categorySource: 'categoryMapper',
                    categoryMappingReason: 'mapped',
                    categoryMatchScope: 'catalog_match',
                    categoryInternalCategoryId: 'internal-category-1',
                    categoryId: '101',
                    categoryPath: 'Collectibles > Pins',
                    shippingCondition: 'Buyer pays shipping',
                    shippingPriceEur: 5,
                    imageInputSource: 'local',
                    imageUploadSource: 'downloaded',
                    localImagePathCount: 2,
                    imageUrlCount: 3,
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
    expect(screen.getByText('Tradera scripted listing failed.')).toHaveClass(
      'break-words',
      'whitespace-normal'
    );
    expect(screen.getAllByText('Browser mode:').length).toBeGreaterThan(1);
    expect(screen.getAllByText('headed').length).toBeGreaterThan(1);
    expect(screen.getByText('Script source:')).toBeInTheDocument();
    expect(screen.getByText('legacy-default-refresh')).toBeInTheDocument();
    expect(screen.getByText('Script type:')).toBeInTheDocument();
    expect(screen.getByText('managed')).toBeInTheDocument();
    expect(screen.getByText('Script marker:')).toBeInTheDocument();
    expect(screen.getByText('tradera-quicklist-default:v94')).toBeInTheDocument();
    expect(screen.getByText('Start URL:')).toBeInTheDocument();
    expect(screen.getByText('https://www.tradera.com/en/selling/new')).toBeInTheDocument();
    expect(screen.getByText('Run ID:')).toBeInTheDocument();
    expect(screen.getByText('run-123')).toBeInTheDocument();
    expect(screen.getByText('Persona:')).toBeInTheDocument();
    expect(screen.getByText('persona-natural')).toBeInTheDocument();
    expect(screen.getByText('Queue job:')).toBeInTheDocument();
    expect(screen.getAllByText('job-tradera-1').length).toBeGreaterThan(1);
    expect(screen.getByText('SlowMo:')).toBeInTheDocument();
    expect(screen.getByText('85 ms')).toBeInTheDocument();
    expect(screen.getByText('Timeouts:')).toBeInTheDocument();
    expect(screen.getByText('30000 / 45000 ms')).toBeInTheDocument();
    expect(screen.getByText('Humanized input:')).toBeInTheDocument();
    expect(screen.getByText('On')).toBeInTheDocument();
    expect(screen.getByText('Click delay:')).toBeInTheDocument();
    expect(screen.getByText('40-140 ms')).toBeInTheDocument();
    expect(screen.getByText('Input delay:')).toBeInTheDocument();
    expect(screen.getByText('30-110 ms')).toBeInTheDocument();
    expect(screen.getByText('Action delay:')).toBeInTheDocument();
    expect(screen.getByText('220-800 ms')).toBeInTheDocument();
    expect(screen.getByText('Publish verified:')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByText('Last stage:')).toBeInTheDocument();
    expect(screen.getByText('fields_filled')).toBeInTheDocument();
    expect(screen.getByText('Stage URL:')).toBeInTheDocument();
    expect(
      screen.getByText('https://www.tradera.com/en/selling/draft/69cfa5c39050080001c3a2c9')
    ).toBeInTheDocument();
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
    expect(screen.getByText('Shipping condition:')).toBeInTheDocument();
    expect(screen.getByText('Buyer pays shipping')).toBeInTheDocument();
    expect(screen.getByText('Shipping EUR:')).toBeInTheDocument();
    expect(screen.getByText('5.00')).toBeInTheDocument();
    expect(screen.getByText('Image input source:')).toBeInTheDocument();
    expect(screen.getByText('local')).toBeInTheDocument();
    expect(screen.getByText('Actual image upload source:')).toBeInTheDocument();
    expect(screen.getByText('downloaded')).toBeInTheDocument();
    expect(screen.getByText('Local image files:')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Image URLs:')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Listing URL:')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open listing' })).toHaveAttribute(
      'href',
      'https://www.tradera.com/item/123'
    );
    expect(screen.getByText('Error category:')).toBeInTheDocument();
    expect(screen.getByText('AUTH')).toBeInTheDocument();
    expect(screen.getByText('Tradera run result')).toBeInTheDocument();
    expect(screen.getByText(/publish_failed/)).toBeInTheDocument();
    expect(screen.getByText('Tradera failure diagnostics')).toBeInTheDocument();
    expect(screen.getByText(/failure\.png/)).toBeInTheDocument();
    expect(screen.getByText(/\[runtime\]\[error\] FAIL_PUBLISH_VALIDATION/)).toBeInTheDocument();
    expect(screen.getByText(/selectedImageFileCount/)).toBeInTheDocument();
    expect(screen.getByText(/continueButtonDisabled/)).toBeInTheDocument();
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

  it('shows a warning when a Tradera run used a custom saved connection script', () => {
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
            failureReason: 'Custom script failed.',
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
                    scriptSource: 'connection',
                    scriptKind: 'custom',
                    runId: 'run-custom-1',
                  },
                },
              },
            },
          } as never
        }
      />
    );

    expect(
      screen.getByText(
        'This run used a custom saved connection script. Managed Tradera fixes will not apply until the connection listing script is reset to the managed default.'
      )
    ).toBeInTheDocument();
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

  it('shows preserved Tradera autofill category metadata when no mapping was applied', () => {
    render(
      <ProductListingDetails
        listing={
          {
            id: 'listing-1',
            status: 'listed',
            externalListingId: '123456789',
            inventoryId: null,
            listedAt: '2026-04-02T11:30:00.000Z',
            expiresAt: null,
            nextRelistAt: null,
            relistAttempts: 0,
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
                lastExecution: {
                  executedAt: '2026-04-02T11:15:00.000Z',
                  metadata: {
                    scriptMode: 'scripted',
                    categorySource: 'autofill',
                    categoryMappingReason: 'no_active_mapping',
                    categoryMatchScope: 'none',
                    categoryInternalCategoryId: 'internal-category-1',
                    categoryPath: 'Accessories > Patches & pins > Pins',
                  },
                },
              },
            },
          } as never
        }
      />
    );

    expect(screen.getByText('Category source:')).toBeInTheDocument();
    expect(screen.getByText('autofill')).toBeInTheDocument();
    expect(screen.getByText('Category mapping reason:')).toBeInTheDocument();
    expect(screen.getByText('no_active_mapping')).toBeInTheDocument();
    expect(screen.getByText('Category match scope:')).toBeInTheDocument();
    expect(screen.getByText('none')).toBeInTheDocument();
  });

  it('shows duplicate-linked Tradera metadata when an existing listing was linked', () => {
    render(
      <ProductListingDetails
        listing={
          {
            id: 'listing-duplicate-linked',
            status: 'active',
            externalListingId: '725447805',
            inventoryId: null,
            listedAt: '2026-04-02T11:30:00.000Z',
            expiresAt: null,
            nextRelistAt: null,
            relistAttempts: 0,
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
              listingUrl:
                'https://www.tradera.com/en/item/2805/725447805/slave-i-5-cm-metal-movie-keychain-star-wars',
              tradera: {
                lastExecution: {
                  executedAt: '2026-04-02T11:15:00.000Z',
                  metadata: {
                    scriptMode: 'scripted',
                    scriptMarker: 'tradera-quicklist-default:v94',
                    duplicateLinked: true,
                    duplicateMatchStrategy: 'title+product-id',
                    duplicateMatchedProductId: 'BASE-1',
                    duplicateCandidateCount: 2,
                    duplicateSearchTitle: 'Example title',
                  },
                },
              },
            },
          } as never
        }
      />
    );

    expect(screen.getByText('Existing listing linked:')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('Duplicate match strategy:')).toBeInTheDocument();
    expect(screen.getByText('title+product-id')).toBeInTheDocument();
    expect(screen.getByText('Duplicate Product ID:')).toBeInTheDocument();
    expect(screen.getByText('BASE-1')).toBeInTheDocument();
    expect(screen.getByText('Duplicate title matches:')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Duplicate search title:')).toBeInTheDocument();
    expect(screen.getByText('Example title')).toBeInTheDocument();
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
