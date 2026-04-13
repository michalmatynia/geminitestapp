/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useProductListingsDataMock,
  useProductListingsUIStateMock,
  useTraderaLiveExecutionMock,
} = vi.hoisted(() => ({
  useProductListingsDataMock: vi.fn(),
  useProductListingsUIStateMock: vi.fn(),
  useTraderaLiveExecutionMock: vi.fn(),
}));

vi.mock('@/features/integrations/context/ProductListingsContext', () => ({
  useProductListingsData: () => useProductListingsDataMock(),
  useProductListingsUIState: () => useProductListingsUIStateMock(),
}));

vi.mock('@/features/integrations/hooks/useTraderaLiveExecution', () => ({
  useTraderaLiveExecution: (...args: unknown[]) =>
    useTraderaLiveExecutionMock(...args),
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
    useTraderaLiveExecutionMock.mockReturnValue(null);
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
                    categoryFallbackUsed: false,
                    categoryMappingReason: 'mapped',
                    categoryMatchScope: 'catalog_match',
                    categoryInternalCategoryId: 'internal-category-1',
                    categoryMappingRecoveredFromAnotherConnection: true,
                    categoryMappingSourceConnectionId: 'legacy-connection-1',
                    categoryId: '101',
                    categoryPath: 'Collectibles > Pins',
                    shippingCondition: 'Buyer pays shipping',
                    shippingPriceEur: 5,
                    imageInputSource: 'local',
                    imageUploadSource: 'downloaded',
                    imageUploadFallbackUsed: true,
                    failureCode: 'image_duplicate_risk',
                    staleDraftImages: true,
                    duplicateRisk: true,
                    imageRetryCleanupUnsettled: false,
                    imagePreviewMismatch: true,
                    plannedImageCount: 3,
                    expectedImageUploadCount: 3,
                    observedImagePreviewCount: 4,
                    observedImagePreviewDelta: 4,
                    observedImagePreviewDescriptors: [
                      {
                        position: 1,
                        src: 'https://cdn.example.com/preview-1.jpg',
                      },
                    ],
                    localImagePathCount: 2,
                    imageUrlCount: 3,
                    rawResult: {
                      status: 'publish_failed',
                      step: 'verify-active-listing',
                    },
                    executionSteps: [
                      {
                        id: 'auth_check',
                        label: 'Validate Tradera session',
                        status: 'success',
                        message: 'Stored Tradera session was accepted.',
                      },
                      {
                        id: 'publish_verify',
                        label: 'Verify published listing',
                        status: 'error',
                        message: 'FAIL_PUBLISH_VALIDATION: Publish action is disabled.',
                      },
                    ],
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
    expect(screen.getByText('Recovered category mapping:')).toBeInTheDocument();
    expect(screen.getByText('Category mapping source connection:')).toBeInTheDocument();
    expect(screen.getByText('legacy-connection-1')).toBeInTheDocument();
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
    expect(screen.getByText('Image upload fallback used:')).toBeInTheDocument();
    expect(screen.getAllByText('Yes').length).toBeGreaterThan(0);
    expect(screen.getByText('Failure code:')).toBeInTheDocument();
    expect(screen.getByText('image_duplicate_risk')).toBeInTheDocument();
    expect(screen.getByText('Stale draft images:')).toBeInTheDocument();
    expect(screen.getByText('Duplicate risk:')).toBeInTheDocument();
    expect(screen.getByText('Image preview mismatch:')).toBeInTheDocument();
    expect(screen.getAllByText('Yes').length).toBeGreaterThan(1);
    expect(screen.getByText('Expected image uploads:')).toBeInTheDocument();
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    expect(screen.getByText('Planned image count:')).toBeInTheDocument();
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    expect(screen.getByText('Observed new previews:')).toBeInTheDocument();
    expect(screen.getAllByText('4').length).toBeGreaterThan(0);
    expect(screen.getByText('Observed total previews:')).toBeInTheDocument();
    expect(screen.getAllByText('4').length).toBeGreaterThan(0);
    expect(screen.getByText('Local image files:')).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getByText('Image URLs:')).toBeInTheDocument();
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    expect(screen.getByText('Listing URL:')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open listing' })).toHaveAttribute(
      'href',
      'https://www.tradera.com/item/123'
    );
    expect(screen.getByText('Error category:')).toBeInTheDocument();
    expect(screen.getByText('AUTH')).toBeInTheDocument();
    expect(screen.getByText('Execution steps')).toBeInTheDocument();
    expect(screen.getByText('auth_check')).toBeInTheDocument();
    expect(screen.getByText('Validate Tradera session')).toBeInTheDocument();
    expect(screen.getByText('publish_verify')).toBeInTheDocument();
    expect(screen.getByText('Verify published listing')).toBeInTheDocument();
    expect(
      screen.getByText('FAIL_PUBLISH_VALIDATION: Publish action is disabled.')
    ).toBeInTheDocument();
    expect(screen.getByText('Tradera run result')).toBeInTheDocument();
    expect(screen.getByText(/publish_failed/)).toBeInTheDocument();
    expect(screen.getByText('Tradera failure diagnostics')).toBeInTheDocument();
    expect(screen.getByText(/failure\.png/)).toBeInTheDocument();
    expect(screen.getByText(/\[runtime\]\[error\] FAIL_PUBLISH_VALIDATION/)).toBeInTheDocument();
    expect(screen.getAllByText(/image_duplicate_risk/).length).toBeGreaterThan(0);
    expect(screen.getByText(/preview-1\.jpg/)).toBeInTheDocument();
    expect(screen.getByText(/selectedImageFileCount/)).toBeInTheDocument();
    expect(screen.getByText(/continueButtonDisabled/)).toBeInTheDocument();
  });

  it('reconstructs Tradera execution steps from failure metadata when persisted steps are missing', () => {
    render(
      <ProductListingDetails
        listing={
          {
            id: 'listing-tradera-derived-steps',
            productId: 'product-1',
            integrationId: 'integration-tradera',
            connectionId: 'connection-tradera',
            externalListingId: '123',
            inventoryId: null,
            status: 'failed',
            listedAt: null,
            expiresAt: null,
            nextRelistAt: null,
            relistPolicy: null,
            relistAttempts: 0,
            lastRelistedAt: null,
            lastStatusCheckAt: null,
            failureReason: 'Tradera scripted listing failed.',
            exportHistory: null,
            createdAt: '2026-04-13T09:00:00.000Z',
            updatedAt: '2026-04-13T09:05:00.000Z',
            integration: {
              id: 'integration-tradera',
              name: 'Tradera',
              slug: 'tradera',
            },
            connection: {
              id: 'connection-tradera',
              name: 'Main Tradera',
            },
            marketplaceData: {
              tradera: {
                lastExecution: {
                  action: 'list',
                  executedAt: '2026-04-13T09:05:00.000Z',
                  ok: false,
                  error: 'FAIL_CATEGORY_SET: Tradera category could not be selected.',
                  metadata: {
                    scriptMode: 'scripted',
                    rawResult: {
                      stage: 'draft_cleared',
                    },
                    logTail: [
                      '[user] tradera.quicklist.start {"listingAction":"list"}',
                      '[user] tradera.quicklist.auth.initial {"loggedIn":true}',
                      '[user] tradera.quicklist.duplicate.result {"duplicateFound":false}',
                      '[user] tradera.quicklist.image.initial_cleanup {"draftImageRemoveControls":0}',
                    ],
                  },
                },
              },
            } as never,
          } as never
        }
      />
    );

    expect(screen.getByText('Execution steps')).toBeInTheDocument();
    expect(screen.getByText('auth_check')).toBeInTheDocument();
    expect(screen.getByText('duplicate_check')).toBeInTheDocument();
    expect(screen.getByText('image_cleanup')).toBeInTheDocument();
    expect(screen.getByText('category_select')).toBeInTheDocument();
    expect(
      screen.getByText('FAIL_CATEGORY_SET: Tradera category could not be selected.')
    ).toBeInTheDocument();
  });

  it('reconstructs the exact-title-only duplicate rationale from persisted Tradera run data', () => {
    render(
      <ProductListingDetails
        listing={
          {
            id: 'listing-tradera-duplicate-rationale',
            productId: 'product-1',
            integrationId: 'integration-tradera',
            connectionId: 'connection-tradera',
            externalListingId: '123',
            inventoryId: null,
            status: 'active',
            listedAt: null,
            expiresAt: null,
            nextRelistAt: null,
            relistPolicy: null,
            relistAttempts: 0,
            lastRelistedAt: null,
            lastStatusCheckAt: null,
            failureReason: null,
            exportHistory: null,
            createdAt: '2026-04-13T09:00:00.000Z',
            updatedAt: '2026-04-13T09:05:00.000Z',
            integration: {
              id: 'integration-tradera',
              name: 'Tradera',
              slug: 'tradera',
            },
            connection: {
              id: 'connection-tradera',
              name: 'Main Tradera',
            },
            marketplaceData: {
              tradera: {
                lastExecution: {
                  action: 'list',
                  executedAt: '2026-04-13T09:05:00.000Z',
                  ok: true,
                  metadata: {
                    scriptMode: 'scripted',
                    rawResult: {
                      stage: 'duplicate_checked',
                      duplicateIgnoredNonExactCandidateCount: 2,
                      duplicateIgnoredCandidateTitles: ['Katanas', 'Katana Sword'],
                    },
                    logTail: [
                      '[user] tradera.quicklist.start {"listingAction":"list"}',
                      '[user] tradera.quicklist.auth.initial {"loggedIn":true}',
                      '[user] tradera.quicklist.duplicate.result {"duplicateFound":false}',
                    ],
                  },
                },
              },
            } as never,
          } as never
        }
      />
    );

    expect(screen.getByText('Execution steps')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Duplicate search ignored 2 non-exact title match(es); deep inspection only runs on exact title matches. Ignored titles: Katanas, Katana Sword.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Skipped because only non-exact title matches were found.')
    ).toBeInTheDocument();
  });

  it('renders live Tradera execution steps from the active Playwright run while pending', () => {
    useTraderaLiveExecutionMock.mockReturnValue({
      runId: 'run-live-123',
      action: 'relist',
      status: 'running',
      latestStage: 'image_upload',
      latestStageUrl: 'https://www.tradera.com/en/selling/draft/live',
      executionSteps: [
        {
          id: 'image_upload',
          label: 'Upload listing images',
          status: 'running',
          message: 'Uploading listing images.',
        },
      ],
      rawResult: {
        stage: 'image_upload',
      },
      logTail: ['[user] tradera.quicklist.image.upload.start'],
      error: null,
    });

    render(
      <ProductListingDetails
        listing={
          {
            id: 'listing-live-1',
            productId: 'product-1',
            integrationId: 'integration-tradera',
            connectionId: 'connection-tradera',
            externalListingId: null,
            inventoryId: null,
            status: 'queued_relist',
            listedAt: null,
            expiresAt: null,
            nextRelistAt: null,
            relistPolicy: null,
            relistAttempts: 0,
            lastRelistedAt: null,
            lastStatusCheckAt: null,
            failureReason: null,
            exportHistory: null,
            createdAt: '2026-04-13T10:00:00.000Z',
            updatedAt: '2026-04-13T10:00:01.000Z',
            integration: {
              id: 'integration-tradera',
              name: 'Tradera',
              slug: 'tradera',
            },
            connection: {
              id: 'connection-tradera',
              name: 'Main Tradera',
            },
            marketplaceData: {
              tradera: {
                pendingExecution: {
                  action: 'relist',
                  requestId: 'job-live-1',
                  queuedAt: '2026-04-13T10:00:00.000Z',
                  requestedBrowserMode: 'headed',
                  runId: 'run-live-123',
                },
              },
            } as never,
          } as never
        }
      />
    );

    expect(screen.getByText('Run ID:')).toBeInTheDocument();
    expect(screen.getByText('run-live-123')).toBeInTheDocument();
    expect(screen.getByText('Last stage:')).toBeInTheDocument();
    expect(screen.getAllByText('image_upload').length).toBeGreaterThan(0);
    expect(screen.getByText('Execution steps')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText('Upload listing images')).toBeInTheDocument();
    expect(screen.getByText('Uploading listing images.')).toBeInTheDocument();
    expect(screen.getByText('Tradera run result')).toBeInTheDocument();
    expect(screen.getAllByText(/image_upload/).length).toBeGreaterThan(0);
  });

  it('prefers live Tradera duplicate-ignore steps over persisted step history while the run is active', () => {
    useTraderaLiveExecutionMock.mockReturnValue({
      runId: 'run-live-duplicate-1',
      action: 'list',
      status: 'running',
      latestStage: 'duplicate_checked',
      latestStageUrl: 'https://www.tradera.com/en/my/active',
      executionSteps: [
        {
          id: 'duplicate_check',
          label: 'Search for duplicate listings',
          status: 'success',
          message:
            'Duplicate search ignored 5 non-exact title match(es); deep inspection only runs on exact title matches. Ignored titles: Katanas, Katana Sword, Japanese Blades, +2 more.',
        },
        {
          id: 'deep_duplicate_check',
          label: 'Inspect duplicate candidates',
          status: 'skipped',
          message: 'Skipped because only non-exact title matches were found.',
        },
      ],
      rawResult: {
        stage: 'duplicate_checked',
        duplicateIgnoredNonExactCandidateCount: 5,
        duplicateIgnoredCandidateTitles: [
          'Katanas',
          'Katana Sword',
          'Japanese Blades',
          'Wooden Katana',
          'Samurai Replica',
        ],
      },
      logTail: [
        '[user] tradera.quicklist.start {"listingAction":"list"}',
        '[user] tradera.quicklist.auth.initial {"loggedIn":true}',
        '[user] tradera.quicklist.duplicate.result {"duplicateFound":false}',
      ],
      error: null,
    });

    render(
      <ProductListingDetails
        listing={
          {
            id: 'listing-live-duplicate-1',
            productId: 'product-1',
            integrationId: 'integration-tradera',
            connectionId: 'connection-tradera',
            externalListingId: null,
            inventoryId: null,
            status: 'queued',
            listedAt: null,
            expiresAt: null,
            nextRelistAt: null,
            relistPolicy: null,
            relistAttempts: 0,
            lastRelistedAt: null,
            lastStatusCheckAt: null,
            failureReason: null,
            exportHistory: null,
            createdAt: '2026-04-13T10:00:00.000Z',
            updatedAt: '2026-04-13T10:00:01.000Z',
            integration: {
              id: 'integration-tradera',
              name: 'Tradera',
              slug: 'tradera',
            },
            connection: {
              id: 'connection-tradera',
              name: 'Main Tradera',
            },
            marketplaceData: {
              tradera: {
                pendingExecution: {
                  action: 'list',
                  requestId: 'job-live-duplicate-1',
                  queuedAt: '2026-04-13T10:00:00.000Z',
                  requestedBrowserMode: 'headed',
                  runId: 'run-live-duplicate-1',
                },
                lastExecution: {
                  action: 'list',
                  executedAt: '2026-04-13T09:59:00.000Z',
                  metadata: {
                    duplicateIgnoredNonExactCandidateCount: 1,
                    duplicateIgnoredCandidateTitles: ['Old persisted title'],
                    executionSteps: [
                      {
                        id: 'duplicate_check',
                        label: 'Search for duplicate listings',
                        status: 'success',
                        message: 'Old persisted duplicate step.',
                      },
                    ],
                  },
                },
              },
            } as never,
          } as never
        }
      />
    );

    expect(screen.getByText('Execution steps')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Duplicate search ignored 5 non-exact title match(es); deep inspection only runs on exact title matches. Ignored titles: Katanas, Katana Sword, Japanese Blades, +2 more.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Skipped because only non-exact title matches were found.')
    ).toBeInTheDocument();
    expect(screen.getByText('Ignored non-exact duplicate matches:')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Ignored duplicate titles:')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Katanas, Katana Sword, Japanese Blades, Wooden Katana, Samurai Replica'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('Old persisted title')).not.toBeInTheDocument();
    expect(screen.queryByText('Old persisted duplicate step.')).not.toBeInTheDocument();
  });

  it('normalizes the listing integration header to Vinted.pl for Vinted listings', () => {
    render(
      <ProductListingDetails
        listing={
          {
            id: 'listing-vinted-1',
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
              name: 'Vinted',
              slug: 'vinted',
            },
            connection: {
              id: 'connection-vinted-1',
              name: 'Vinted Browser',
            },
            marketplaceData: {},
          } as never
        }
      />
    );

    expect(screen.getByText('Vinted.pl')).toBeInTheDocument();
    expect(screen.queryByText('Vinted')).toBeNull();
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
                    categoryFallbackUsed: true,
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
    expect(screen.getByText('Category fallback used:')).toBeInTheDocument();
    expect(screen.getAllByText('Yes').length).toBeGreaterThan(0);
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
                    duplicateIgnoredNonExactCandidateCount: 3,
                    duplicateIgnoredCandidateTitles: ['Katanas', 'Katana Sword'],
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
    expect(screen.getByText('Exact title + product ID')).toBeInTheDocument();
    expect(screen.getByText('Duplicate Product ID:')).toBeInTheDocument();
    expect(screen.getByText('BASE-1')).toBeInTheDocument();
    expect(screen.getByText('Duplicate title matches:')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Duplicate search title:')).toBeInTheDocument();
    expect(screen.getByText('Example title')).toBeInTheDocument();
    expect(screen.getByText('Ignored non-exact duplicate matches:')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Ignored duplicate titles:')).toBeInTheDocument();
    expect(screen.getByText('Katanas, Katana Sword')).toBeInTheDocument();
  });

  it('shows truncated ignored duplicate titles in Tradera execution steps when many were skipped', () => {
    render(
      <ProductListingDetails
        listing={
          {
            id: 'listing-duplicate-truncated-steps',
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
              listingUrl: 'https://www.tradera.com/item/725447805',
              tradera: {
                lastExecution: {
                  executedAt: '2026-04-02T11:15:00.000Z',
                  action: 'list',
                  metadata: {
                    scriptMode: 'scripted',
                    scriptMarker: 'tradera-quicklist-default:v143',
                    rawResult: {
                      stage: 'duplicate_checked',
                      duplicateIgnoredNonExactCandidateCount: 5,
                      duplicateIgnoredCandidateTitles: [
                        'Katanas',
                        'Katana Sword',
                        'Japanese Blades',
                        'Wooden Katana',
                        'Samurai Replica',
                      ],
                    },
                    logTail: [
                      '[user] tradera.quicklist.start {"listingAction":"list"}',
                      '[user] tradera.quicklist.auth.initial {"loggedIn":true}',
                      '[user] tradera.quicklist.duplicate.result {"duplicateFound":false}',
                    ],
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
        'Duplicate search ignored 5 non-exact title match(es); deep inspection only runs on exact title matches. Ignored titles: Katanas, Katana Sword, Japanese Blades, +2 more.'
      )
    ).toBeInTheDocument();
  });

  it('shows duplicate-linked Tradera metadata when it only exists in rawResult', () => {
    render(
      <ProductListingDetails
        listing={
          {
            id: 'listing-duplicate-linked-raw-result',
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
                    rawResult: {
                      duplicateLinked: true,
                      duplicateMatchStrategy: 'exact-title-single-candidate',
                      duplicateCandidateCount: 1,
                      duplicateSearchTitle: 'Example title',
                    },
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
    expect(screen.getByText('Exact title single candidate')).toBeInTheDocument();
    expect(screen.getByText('Duplicate title matches:')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Duplicate search title:')).toBeInTheDocument();
    expect(screen.getByText('Example title')).toBeInTheDocument();
  });

  it('treats duplicate match strategy as linked state when duplicateLinked is missing', () => {
    render(
      <ProductListingDetails
        listing={
          {
            id: 'listing-duplicate-linked-strategy-only',
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
                    rawResult: {
                      duplicateMatchStrategy: 'exact-title-single-candidate',
                      duplicateCandidateCount: 1,
                      duplicateSearchTitle: 'Example title',
                    },
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
    expect(screen.getByText('Exact title single candidate')).toBeInTheDocument();
    expect(screen.getByText('Duplicate title matches:')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows a linked status badge for duplicate-linked Tradera rows with stale failed status', () => {
    render(
      <ProductListingDetails
        listing={
          {
            id: 'listing-duplicate-linked-stale-status',
            status: 'failed',
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
              tradera: {
                lastExecution: {
                  executedAt: '2026-04-02T11:15:00.000Z',
                  metadata: {
                    latestStage: 'duplicate_linked',
                  },
                },
              },
            },
          } as never
        }
      />
    );

    expect(screen.getByText('linked')).toBeInTheDocument();
    expect(screen.queryByText(/^failed$/i)).toBeNull();
  });

  it('shows a linked status badge from the live Tradera run when persisted status is stale', () => {
    useTraderaLiveExecutionMock.mockReturnValue({
      runId: 'run-live-linked-1',
      action: 'relist',
      status: 'running',
      latestStage: 'duplicate_linked',
      latestStageUrl: 'https://www.tradera.com/item/725447805',
      executionSteps: [
        {
          id: 'duplicate_check',
          label: 'Search for duplicate listings',
          status: 'success',
          message:
            'Relist linked the single exact-title Tradera candidate instead of creating a new listing.',
        },
      ],
      rawResult: {
        stage: 'duplicate_linked',
        duplicateMatchStrategy: 'exact-title-single-candidate',
        duplicateCandidateCount: 1,
        duplicateSearchTitle: 'Example title',
      },
      logTail: [
        '[user] tradera.quicklist.start {"listingAction":"relist"}',
        '[user] tradera.quicklist.duplicate.linked {"listingUrl":"https://www.tradera.com/item/725447805"}',
      ],
      error: null,
    });

    render(
      <ProductListingDetails
        listing={
          {
            id: 'listing-live-duplicate-linked-stale-status',
            productId: 'product-1',
            integrationId: 'integration-tradera',
            connectionId: 'connection-tradera',
            status: 'failed',
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
              id: 'integration-tradera',
              name: 'Tradera',
              slug: 'tradera',
            },
            connection: {
              id: 'connection-tradera',
              name: 'Main Tradera',
            },
            marketplaceData: {
              tradera: {
                pendingExecution: {
                  action: 'relist',
                  requestId: 'job-live-linked-1',
                  queuedAt: '2026-04-13T10:00:00.000Z',
                  requestedBrowserMode: 'headed',
                  runId: 'run-live-linked-1',
                },
              },
            } as never,
          } as never
        }
      />
    );

    expect(screen.getByText('linked')).toBeInTheDocument();
    expect(screen.queryByText(/^failed$/i)).toBeNull();
    expect(screen.getByText('Duplicate match strategy:')).toBeInTheDocument();
    expect(screen.getByText('Exact title single candidate')).toBeInTheDocument();
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
                  action: 'relist',
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

  it('shows pending Tradera status checks with the correct action label', () => {
    render(
      <ProductListingDetails
        listing={
          {
            id: 'listing-tradera-status-check',
            status: 'active',
            externalListingId: null,
            inventoryId: null,
            listedAt: null,
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
                pendingExecution: {
                  action: 'check_status',
                  requestedBrowserMode: 'connection_default',
                  requestId: 'job-tradera-status-check-1',
                  queuedAt: '2026-04-02T11:45:00.000Z',
                },
              },
            },
          } as never
        }
      />
    );

    expect(screen.getByText('Pending status check:')).toBeInTheDocument();
    expect(screen.getByText('Pending browser mode:')).toBeInTheDocument();
    expect(screen.getByText('connection_default')).toBeInTheDocument();
    expect(screen.getByText('Pending queue job:')).toBeInTheDocument();
    expect(screen.getByText('job-tradera-status-check-1')).toBeInTheDocument();
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

  it('shows Vinted execution metadata including Brave/headed runtime details', () => {
    useProductListingsUIStateMock.mockReturnValue({
      historyOpenByListing: { 'listing-vinted-1': true },
      setHistoryOpenByListing: vi.fn(),
    });

    render(
      <ProductListingDetails
        listing={
          {
            id: 'listing-vinted-1',
            status: 'queued',
            externalListingId: null,
            inventoryId: null,
            listedAt: null,
            expiresAt: null,
            nextRelistAt: null,
            relistAttempts: 0,
            createdAt: '2026-04-02T10:00:00.000Z',
            failureReason: 'Vinted publish verification failed.',
            exportHistory: [
              {
                exportedAt: '2026-04-02T11:45:00.000Z',
                status: 'failed',
                requestId: 'job-vinted-1',
                fields: ['browser_mode:headed'],
              },
            ],
            integration: {
              name: 'Vinted',
              slug: 'vinted',
            },
            connection: {
              id: 'connection-1',
              name: 'Vinted Browser',
            },
            marketplaceData: {
              listingUrl: 'https://www.vinted.pl/items/123456-example',
              vinted: {
                pendingExecution: {
                  action: 'list',
                  requestedBrowserMode: 'headed',
                  requestedBrowserPreference: 'brave',
                  requestId: 'job-vinted-queued-1',
                  queuedAt: '2026-04-02T11:30:00.000Z',
                },
                lastExecution: {
                  executedAt: '2026-04-02T11:45:00.000Z',
                  requestId: 'job-vinted-1',
                  errorCategory: 'FORM',
                  metadata: {
                    browserMode: 'headed',
                    requestedBrowserMode: 'headed',
                    browserPreference: 'brave',
                    requestedBrowserPreference: 'brave',
                    browserLabel: 'Brave',
                    publishVerified: false,
                    rawResult: {
                      finalUrl: 'https://www.vinted.pl/items/new',
                      stage: 'publish_verify',
                    },
                  },
                },
              },
            },
          } as never
        }
      />
    );

    expect(screen.getByText('Pending execution:')).toBeInTheDocument();
    expect(screen.getByText('Pending browser mode:')).toBeInTheDocument();
    expect(screen.getByText('Pending browser:')).toBeInTheDocument();
    expect(screen.getByText('Pending queue job:')).toBeInTheDocument();
    expect(screen.getByText('Last execution:')).toBeInTheDocument();
    expect(screen.getAllByText('Browser mode:').length).toBeGreaterThan(1);
    expect(screen.getAllByText('headed').length).toBeGreaterThan(1);
    expect(screen.getByText('Browser:')).toBeInTheDocument();
    expect(screen.getAllByText('Brave').length).toBeGreaterThan(0);
    expect(screen.getByText('Queue job:')).toBeInTheDocument();
    expect(screen.getAllByText('job-vinted-1').length).toBeGreaterThan(0);
    expect(screen.getByText('Publish verified:')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open listing' })).toHaveAttribute(
      'href',
      'https://www.vinted.pl/items/123456-example'
    );
    expect(screen.getByText('Error category:')).toBeInTheDocument();
    expect(screen.getByText('FORM')).toBeInTheDocument();
    expect(screen.getByText('Vinted run result')).toBeInTheDocument();
    expect(screen.getByText(/publish_verify/)).toBeInTheDocument();
    expect(screen.getByText('Request ID:')).toBeInTheDocument();
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
