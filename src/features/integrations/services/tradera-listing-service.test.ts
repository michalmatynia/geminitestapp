import { beforeEach, describe, expect, it, vi } from 'vitest';

import { badRequestError, internalError } from '@/shared/errors/app-error';

const {
  findProductListingByIdAcrossProvidersMock,
  listProductListingsByProductIdAcrossProvidersMock,
  getConnectionByIdMock,
  getIntegrationByIdMock,
  loadTraderaSystemSettingsMock,
  runTraderaBrowserListingMock,
  runTraderaBrowserCheckStatusMock,
  runTraderaApiListingMock,
  resolveEffectiveListingSettingsMock,
  buildRelistPolicyMock,
  captureExceptionMock,
  resolveConnectionPlaywrightExplicitPreferencesMock,
} = vi.hoisted(() => ({
  findProductListingByIdAcrossProvidersMock: vi.fn(),
  listProductListingsByProductIdAcrossProvidersMock: vi.fn(),
  getConnectionByIdMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
  loadTraderaSystemSettingsMock: vi.fn(),
  runTraderaBrowserListingMock: vi.fn(),
  runTraderaBrowserCheckStatusMock: vi.fn(),
  runTraderaApiListingMock: vi.fn(),
  resolveEffectiveListingSettingsMock: vi.fn(),
  buildRelistPolicyMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  resolveConnectionPlaywrightExplicitPreferencesMock: vi.fn(),
}));

vi.mock('@/features/integrations/services/product-listing-repository', () => ({
  findProductListingByIdAcrossProviders: (...args: unknown[]) =>
    findProductListingByIdAcrossProvidersMock(...args) as Promise<unknown>,
  listProductListingsByProductIdAcrossProviders: (...args: unknown[]) =>
    listProductListingsByProductIdAcrossProvidersMock(...args) as Promise<unknown>,
}));

vi.mock('@/features/integrations/services/integration-repository', () => ({
  getIntegrationRepository: async () => ({
    getConnectionById: getConnectionByIdMock,
    getIntegrationById: getIntegrationByIdMock,
  }),
}));

vi.mock('@/features/integrations/services/tradera-system-settings', () => ({
  loadTraderaSystemSettings: (...args: unknown[]) =>
    loadTraderaSystemSettingsMock(...args) as Promise<unknown>,
  toTruthyBoolean: (value: unknown, fallback: boolean) =>
    typeof value === 'boolean' ? value : fallback,
}));

vi.mock('./tradera-listing/browser', () => ({
  runTraderaBrowserListing: (...args: unknown[]) =>
    runTraderaBrowserListingMock(...args) as Promise<unknown>,
  runTraderaBrowserCheckStatus: (...args: unknown[]) =>
    runTraderaBrowserCheckStatusMock(...args) as Promise<unknown>,
}));

vi.mock('./tradera-listing/api', () => ({
  runTraderaApiListing: (...args: unknown[]) =>
    runTraderaApiListingMock(...args) as Promise<unknown>,
}));

vi.mock('./tradera-listing/settings', () => ({
  resolveEffectiveListingSettings: (...args: unknown[]) =>
    resolveEffectiveListingSettingsMock(...args),
  buildRelistPolicy: (...args: unknown[]) => buildRelistPolicyMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => captureExceptionMock(...args),
  },
}));

vi.mock('@/features/playwright/server', async () => {
  const actual =
    await vi.importActual<typeof import('@/features/playwright/server')>(
      '@/features/playwright/server'
    );
  return {
    ...actual,
    resolveConnectionPlaywrightExplicitPreferences: (...args: unknown[]) =>
      resolveConnectionPlaywrightExplicitPreferencesMock(...args) as Promise<unknown>,
  };
});

import { processTraderaListingJob } from './tradera-listing-service';

describe('processTraderaListingJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadTraderaSystemSettingsMock.mockResolvedValue({});
    listProductListingsByProductIdAcrossProvidersMock.mockResolvedValue([]);
    resolveEffectiveListingSettingsMock.mockReturnValue({
      durationHours: 48,
      autoRelistEnabled: true,
      autoRelistLeadMinutes: 30,
    });
    buildRelistPolicyMock.mockReturnValue({
      enabled: true,
      durationHours: 48,
      leadMinutes: 30,
    });
    getConnectionByIdMock.mockResolvedValue({
      id: 'connection-1',
      integrationId: 'integration-1',
      traderaBrowserMode: 'scripted',
    });
    resolveConnectionPlaywrightExplicitPreferencesMock.mockResolvedValue({
      connectionHeadless: undefined,
      connectionBrowserPreference: undefined,
      profile: {
        hasExplicitHeadlessPreference: false,
        hasExplicitBrowserPreference: false,
        settings: {
          headless: true,
        },
      },
    });
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-1',
      slug: 'tradera',
    });
  });

  it('short-circuits list jobs when a linked Tradera record already exists for the same product and connection', async () => {
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
        listedAt: null,
        marketplaceData: null,
      },
      repository: {
        updateListingStatus: updateListingStatusMock,
        updateListing: updateListingMock,
        appendExportHistory: appendExportHistoryMock,
      },
    });
    listProductListingsByProductIdAcrossProvidersMock.mockResolvedValue([
      {
        id: 'listing-1',
        productId: 'product-1',
        connectionId: 'connection-1',
        externalListingId: null,
        marketplaceData: null,
      },
      {
        id: 'listing-linked-1',
        productId: 'product-1',
        connectionId: 'connection-1',
        externalListingId: '721891408',
        marketplaceData: {
          listingUrl:
            'https://www.tradera.com/en/item/292901/721891408/the-alien-4-cm-pin-alf',
        },
      },
    ]);

    await processTraderaListingJob({
      listingId: 'listing-1',
      action: 'list',
      source: 'manual',
      jobId: 'job-tradera-existing-link',
    });

    expect(runTraderaBrowserListingMock).not.toHaveBeenCalled();
    expect(updateListingStatusMock).not.toHaveBeenCalled();
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        status: 'active',
        externalListingId: '721891408',
        listedAt: null,
        expiresAt: null,
        nextRelistAt: null,
        failureReason: null,
        marketplaceData: expect.objectContaining({
          marketplace: 'tradera',
          listingUrl:
            'https://www.tradera.com/en/item/292901/721891408/the-alien-4-cm-pin-alf',
          externalListingId: '721891408',
          tradera: expect.objectContaining({
            pendingExecution: null,
            lastExecution: expect.objectContaining({
              requestId: 'job-tradera-existing-link',
              ok: true,
              action: 'list',
              source: 'manual',
              metadata: expect.objectContaining({
                duplicateLinked: true,
                duplicateMatchStrategy: 'existing-linked-record',
                persistedLinkedListingGuard: true,
                linkedListingId: 'listing-linked-1',
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
        externalListingId: '721891408',
        requestId: 'job-tradera-existing-link',
      })
    );
  });

  it('uses headed browser mode for API-triggered Tradera runs when the connection disables headless mode', async () => {
    const updateListingStatusMock = vi.fn();
    const updateListingMock = vi.fn();
    const appendExportHistoryMock = vi.fn();
    const resolvedListing = {
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        marketplaceData: {
          tradera: {
            categoryId: 12345,
          },
        },
      },
      repository: {
        updateListingStatus: updateListingStatusMock,
        updateListing: updateListingMock,
        appendExportHistory: appendExportHistoryMock,
      },
    };

    findProductListingByIdAcrossProvidersMock.mockResolvedValue(resolvedListing);
    getConnectionByIdMock.mockResolvedValue({
      id: 'connection-1',
      integrationId: 'integration-1',
      traderaBrowserMode: 'scripted',
      playwrightHeadless: false,
    });
    resolveConnectionPlaywrightExplicitPreferencesMock.mockResolvedValue({
      connectionHeadless: false,
      connectionBrowserPreference: undefined,
      profile: {
        hasExplicitHeadlessPreference: true,
        hasExplicitBrowserPreference: false,
        settings: {
          headless: false,
        },
      },
    });
    runTraderaBrowserListingMock.mockResolvedValue({
      externalListingId: 'external-1',
      listingUrl: 'https://www.tradera.com/item/1',
      metadata: {
        browserMode: 'headed',
        requestedBrowserMode: 'headed',
      },
    });

    await processTraderaListingJob({
      listingId: 'listing-1',
      action: 'list',
      source: 'api',
      jobId: 'job-tradera-api-1',
    });

    expect(runTraderaBrowserListingMock).toHaveBeenCalledWith(
      expect.objectContaining({
        browserMode: 'headed',
      })
    );
    expect(appendExportHistoryMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        fields: ['browser_mode:headed'],
        requestId: 'job-tradera-api-1',
      })
    );
  });

  it('uses canonical resolved Playwright settings for Tradera browser mode decisions', async () => {
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        marketplaceData: {
          tradera: {
            categoryId: 12345,
          },
        },
      },
      repository: {
        updateListingStatus: vi.fn(),
        updateListing: vi.fn(),
        appendExportHistory: vi.fn(),
      },
    });
    getConnectionByIdMock.mockResolvedValue({
      id: 'connection-1',
      integrationId: 'integration-1',
      traderaBrowserMode: 'scripted',
      playwrightHeadless: true,
      playwrightPersonaId: 'persona-1',
    });
    resolveConnectionPlaywrightExplicitPreferencesMock.mockResolvedValue({
      connectionHeadless: false,
      connectionBrowserPreference: undefined,
      profile: {
        hasExplicitHeadlessPreference: true,
        hasExplicitBrowserPreference: false,
        settings: {
          headless: false,
        },
      },
    });
    runTraderaBrowserListingMock.mockResolvedValue({
      externalListingId: 'external-1',
      listingUrl: 'https://www.tradera.com/item/1',
      metadata: {
        browserMode: 'headed',
        requestedBrowserMode: 'headed',
      },
    });

    await processTraderaListingJob({
      listingId: 'listing-1',
      action: 'list',
      source: 'api',
      jobId: 'job-tradera-api-persona-1',
    });

    expect(runTraderaBrowserListingMock).toHaveBeenCalledWith(
      expect.objectContaining({
        browserMode: 'headed',
      })
    );
  });

  it('persists Tradera execution metadata on success', async () => {
    const updateListingStatusMock = vi.fn();
    const updateListingMock = vi.fn();
    const appendExportHistoryMock = vi.fn();
    const resolvedListing = {
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        marketplaceData: {
          tradera: {
            categoryId: 12345,
          },
        },
      },
      repository: {
        updateListingStatus: updateListingStatusMock,
        updateListing: updateListingMock,
        appendExportHistory: appendExportHistoryMock,
      },
    };

    findProductListingByIdAcrossProvidersMock.mockResolvedValue(resolvedListing);
    runTraderaBrowserListingMock.mockResolvedValue({
      externalListingId: 'external-1',
      listingUrl: 'https://www.tradera.com/item/1',
      metadata: {
        scriptMode: 'scripted',
        scriptSource: 'legacy-default-refresh',
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
        runId: 'run-1',
        browserMode: 'headed',
        requestedBrowserMode: 'headed',
        publishVerified: true,
      },
    });

    await processTraderaListingJob({
      listingId: 'listing-1',
      action: 'list',
      source: 'manual',
      jobId: 'job-tradera-1',
    });

    expect(runTraderaBrowserListingMock).toHaveBeenCalledWith(
      expect.objectContaining({
        browserMode: 'headed',
      })
    );

    expect(updateListingStatusMock).not.toHaveBeenCalled();
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        externalListingId: 'external-1',
        failureReason: null,
        marketplaceData: expect.objectContaining({
          marketplace: 'tradera',
          listingUrl: 'https://www.tradera.com/item/1',
          externalListingId: 'external-1',
          tradera: expect.objectContaining({
            categoryId: 12345,
            pendingExecution: null,
            lastExecution: expect.objectContaining({
              requestId: 'job-tradera-1',
              ok: true,
              action: 'list',
              source: 'manual',
              error: null,
              errorCategory: null,
              metadata: expect.objectContaining({
                scriptMode: 'scripted',
                scriptSource: 'legacy-default-refresh',
                listingFormUrl: 'https://www.tradera.com/en/selling/new',
                runId: 'run-1',
                publishVerified: true,
                relistPolicy: {
                  enabled: true,
                  durationHours: 48,
                  leadMinutes: 30,
                },
                simulated: false,
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
        externalListingId: 'external-1',
        fields: ['browser_mode:headed'],
        requestId: 'job-tradera-1',
      })
    );
  });

  it('persists Tradera fallback category and image diagnostics on scripted success', async () => {
    const updateListingStatusMock = vi.fn();
    const updateListingMock = vi.fn();
    const appendExportHistoryMock = vi.fn();
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-fallback-success',
        productId: 'product-1',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        marketplaceData: null,
      },
      repository: {
        updateListingStatus: updateListingStatusMock,
        updateListing: updateListingMock,
        appendExportHistory: appendExportHistoryMock,
      },
    });
    runTraderaBrowserListingMock.mockResolvedValue({
      externalListingId: 'external-fallback-1',
      listingUrl: 'https://www.tradera.com/item/fallback-1',
      metadata: {
        scriptMode: 'scripted',
        scriptSource: 'connection',
        runId: 'run-fallback-1',
        browserMode: 'headed',
        requestedBrowserMode: 'headed',
        publishVerified: true,
        categorySource: 'fallback',
        categoryPath: 'Other > Other',
        categoryMappingReason: 'stale_external_category',
        categoryMatchScope: 'none',
        categoryInternalCategoryId: 'internal-category-1',
        imageInputSource: 'remote',
        imageUploadSource: 'downloaded',
        imageUrlCount: 3,
        localImagePathCount: 0,
      },
    });

    await processTraderaListingJob({
      listingId: 'listing-fallback-success',
      action: 'list',
      source: 'manual',
      jobId: 'job-tradera-fallback-success',
    });

    expect(updateListingStatusMock).not.toHaveBeenCalled();
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-fallback-success',
      expect.objectContaining({
        externalListingId: 'external-fallback-1',
        failureReason: null,
        marketplaceData: expect.objectContaining({
          marketplace: 'tradera',
          listingUrl: 'https://www.tradera.com/item/fallback-1',
          externalListingId: 'external-fallback-1',
          tradera: expect.objectContaining({
            pendingExecution: null,
            lastExecution: expect.objectContaining({
              requestId: 'job-tradera-fallback-success',
              ok: true,
              action: 'list',
              source: 'manual',
              metadata: expect.objectContaining({
                categorySource: 'fallback',
                categoryPath: 'Other > Other',
                categoryMappingReason: 'stale_external_category',
                categoryMatchScope: 'none',
                categoryInternalCategoryId: 'internal-category-1',
                imageInputSource: 'remote',
                imageUploadSource: 'downloaded',
                imageUrlCount: 3,
                localImagePathCount: 0,
              }),
            }),
          }),
        }),
      })
    );
    expect(appendExportHistoryMock).toHaveBeenCalledWith(
      'listing-fallback-success',
      expect.objectContaining({
        status: 'active',
        externalListingId: 'external-fallback-1',
        requestId: 'job-tradera-fallback-success',
      })
    );
  });

  it('persists the resolved Tradera status after a live status check', async () => {
    const updateListingStatusMock = vi.fn();
    const updateListingMock = vi.fn();
    const appendExportHistoryMock = vi.fn();
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-check-status',
        productId: 'product-1',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        status: 'active',
        externalListingId: 'external-1',
        marketplaceData: {
          marketplace: 'tradera',
          listingUrl: 'https://www.tradera.com/item/1',
          tradera: {
            pendingExecution: {
              action: 'check_status',
              requestId: 'job-check-status',
            },
          },
        },
      },
      repository: {
        updateListingStatus: updateListingStatusMock,
        updateListing: updateListingMock,
        appendExportHistory: appendExportHistoryMock,
      },
    });
    runTraderaBrowserCheckStatusMock.mockResolvedValue({
      externalListingId: 'external-1',
      listingUrl: 'https://www.tradera.com/item/1',
      metadata: {
        checkedStatus: 'ended',
        requestedBrowserMode: 'headless',
        runId: 'run-check-status',
        executionSteps: [
          {
            id: 'open_overview',
            label: 'Open Active listings',
            status: 'success',
            message: 'Tradera Active listings opened successfully.',
          },
          {
            id: 'resolve_status',
            label: 'Resolve final Tradera status',
            status: 'success',
            message: 'Resolved Tradera status as ended from Unsold items with raw tag "ended".',
          },
        ],
      },
    });

    await processTraderaListingJob({
      listingId: 'listing-check-status',
      action: 'check_status',
      source: 'manual',
      jobId: 'job-check-status',
    });

    expect(runTraderaBrowserCheckStatusMock).toHaveBeenCalledWith(
      expect.objectContaining({
        browserMode: 'headless',
      })
    );
    expect(runTraderaBrowserListingMock).not.toHaveBeenCalled();
    expect(updateListingStatusMock).not.toHaveBeenCalled();
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-check-status',
      expect.objectContaining({
        status: 'ended',
        lastStatusCheckAt: expect.any(Date),
        marketplaceData: expect.objectContaining({
          marketplace: 'tradera',
          listingUrl: 'https://www.tradera.com/item/1',
          externalListingId: 'external-1',
          tradera: expect.objectContaining({
            pendingExecution: null,
            lastStatusCheckAt: expect.any(String),
            lastExecution: expect.objectContaining({
              requestId: 'job-check-status',
              action: 'check_status',
              ok: true,
              metadata: expect.objectContaining({
                checkedStatus: 'ended',
                runId: 'run-check-status',
                executionSteps: [
                  expect.objectContaining({
                    id: 'open_overview',
                    status: 'success',
                  }),
                  expect.objectContaining({
                    id: 'resolve_status',
                    status: 'success',
                  }),
                ],
              }),
            }),
          }),
        }),
      })
    );
    expect(appendExportHistoryMock).not.toHaveBeenCalled();
  });

  it('still honors an explicit headed override for a live status check', async () => {
    const updateListingMock = vi.fn();
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-check-status',
        productId: 'product-1',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        status: 'active',
        externalListingId: 'external-1',
        marketplaceData: null,
      },
      repository: {
        updateListingStatus: vi.fn(),
        updateListing: updateListingMock,
        appendExportHistory: vi.fn(),
      },
    });
    runTraderaBrowserCheckStatusMock.mockResolvedValue({
      externalListingId: 'external-1',
      listingUrl: 'https://www.tradera.com/item/1',
      metadata: {
        checkedStatus: 'active',
        requestedBrowserMode: 'headed',
      },
    });

    await processTraderaListingJob({
      listingId: 'listing-check-status',
      action: 'check_status',
      source: 'manual',
      browserMode: 'headed',
    });

    expect(runTraderaBrowserCheckStatusMock).toHaveBeenCalledWith(
      expect.objectContaining({
        browserMode: 'headed',
      })
    );
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-check-status',
      expect.objectContaining({
        status: 'active',
      })
    );
  });

  it('persists AppError metadata on failure', async () => {
    const updateListingStatusMock = vi.fn();
    const updateListingMock = vi.fn();
    const appendExportHistoryMock = vi.fn();
    const resolvedListing = {
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        marketplaceData: {
          listingUrl: 'https://www.tradera.com/item/existing',
          tradera: {
            categoryId: 12345,
          },
        },
      },
      repository: {
        updateListingStatus: updateListingStatusMock,
        updateListing: updateListingMock,
        appendExportHistory: appendExportHistoryMock,
      },
    };

    findProductListingByIdAcrossProvidersMock.mockResolvedValue(resolvedListing);
    runTraderaBrowserListingMock.mockRejectedValue(
      internalError('Tradera scripted listing failed.', {
        requestedBrowserMode: 'headed',
        runId: 'run-2',
        debugArtifacts: 'Screenshot: /tmp/tradera.png',
      })
    );

    await expect(
      processTraderaListingJob({
        listingId: 'listing-1',
        action: 'list',
        source: 'manual',
        jobId: 'job-tradera-2',
      })
    ).rejects.toThrow('Tradera scripted listing failed.');

    expect(updateListingStatusMock).not.toHaveBeenCalled();
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        status: 'failed',
        failureReason: 'Tradera scripted listing failed.',
        marketplaceData: expect.objectContaining({
          marketplace: 'tradera',
          listingUrl: 'https://www.tradera.com/item/existing',
          tradera: expect.objectContaining({
            categoryId: 12345,
            lastErrorCategory: 'UNKNOWN',
            pendingExecution: null,
            lastExecution: expect.objectContaining({
              requestId: 'job-tradera-2',
              ok: false,
              error: 'Tradera scripted listing failed.',
              errorCategory: 'UNKNOWN',
              metadata: expect.objectContaining({
                runId: 'run-2',
                debugArtifacts: 'Screenshot: /tmp/tradera.png',
                requestedBrowserMode: 'headed',
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
        failureReason: 'Tradera scripted listing failed.',
        fields: ['browser_mode:headed'],
        requestId: 'job-tradera-2',
      })
    );
  });

  it('persists auth failures as auth_required so the UI can offer login recovery', async () => {
    const updateListingStatusMock = vi.fn();
    const updateListingMock = vi.fn();
    const appendExportHistoryMock = vi.fn();
    const resolvedListing = {
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        marketplaceData: null,
      },
      repository: {
        updateListingStatus: updateListingStatusMock,
        updateListing: updateListingMock,
        appendExportHistory: appendExportHistoryMock,
      },
    };

    findProductListingByIdAcrossProvidersMock.mockResolvedValue(resolvedListing);
    runTraderaBrowserListingMock.mockRejectedValue(
      new Error('Tradera login requires manual verification. Open login window and retry.')
    );

    await expect(
      processTraderaListingJob({
        listingId: 'listing-1',
        action: 'list',
        source: 'manual',
        jobId: 'job-tradera-auth',
      })
    ).rejects.toThrow('Tradera login requires manual verification. Open login window and retry.');

    expect(updateListingStatusMock).not.toHaveBeenCalled();
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        status: 'auth_required',
        failureReason: 'Tradera login requires manual verification. Open login window and retry.',
        marketplaceData: expect.objectContaining({
          tradera: expect.objectContaining({
            pendingExecution: null,
          }),
        }),
      })
    );
    expect(appendExportHistoryMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        status: 'auth_required',
        failureReason: 'Tradera login requires manual verification. Open login window and retry.',
        requestId: 'job-tradera-auth',
      })
    );
  });

  it('classifies missing Tradera category mapper setup as a form failure', async () => {
    const updateListingStatusMock = vi.fn();
    const updateListingMock = vi.fn();
    const appendExportHistoryMock = vi.fn();
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        marketplaceData: null,
      },
      repository: {
        updateListingStatus: updateListingStatusMock,
        updateListing: updateListingMock,
        appendExportHistory: appendExportHistoryMock,
      },
    });
    runTraderaBrowserListingMock.mockRejectedValue(
      badRequestError(
        'Tradera export requires an active Tradera category mapping for this product category. Fetch Tradera categories in Category Mapper, map the category, and retry.'
      )
    );

    await expect(
      processTraderaListingJob({
        listingId: 'listing-1',
        action: 'list',
        source: 'manual',
        jobId: 'job-tradera-config',
      })
    ).rejects.toThrow(
      'Tradera export requires an active Tradera category mapping for this product category. Fetch Tradera categories in Category Mapper, map the category, and retry.'
    );

    expect(updateListingStatusMock).not.toHaveBeenCalled();
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        failureReason:
          'Tradera export requires an active Tradera category mapping for this product category. Fetch Tradera categories in Category Mapper, map the category, and retry.',
        marketplaceData: expect.objectContaining({
          tradera: expect.objectContaining({
            lastErrorCategory: 'FORM',
            lastExecution: expect.objectContaining({
              errorCategory: 'FORM',
            }),
          }),
        }),
      })
    );
  });

  it('classifies missing Tradera shipping configuration as a form failure', async () => {
    const updateListingStatusMock = vi.fn();
    const updateListingMock = vi.fn();
    const appendExportHistoryMock = vi.fn();
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        marketplaceData: null,
      },
      repository: {
        updateListingStatus: updateListingStatusMock,
        updateListing: updateListingMock,
        appendExportHistory: appendExportHistoryMock,
      },
    });
    runTraderaBrowserListingMock.mockRejectedValue(
      badRequestError(
        'Tradera export requires a shipping group with a Tradera shipping price in EUR. Assign or configure a shipping group with the EUR price and retry.'
      )
    );

    await expect(
      processTraderaListingJob({
        listingId: 'listing-1',
        action: 'list',
        source: 'manual',
        jobId: 'job-tradera-shipping-config',
      })
    ).rejects.toThrow(
      'Tradera export requires a shipping group with a Tradera shipping price in EUR. Assign or configure a shipping group with the EUR price and retry.'
    );

    expect(updateListingStatusMock).not.toHaveBeenCalled();
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        failureReason:
          'Tradera export requires a shipping group with a Tradera shipping price in EUR. Assign or configure a shipping group with the EUR price and retry.',
        marketplaceData: expect.objectContaining({
          tradera: expect.objectContaining({
            lastErrorCategory: 'FORM',
            lastExecution: expect.objectContaining({
              errorCategory: 'FORM',
            }),
          }),
        }),
      })
    );
  });

  it('persists image preview mismatches as form failures with a user-facing retry message', async () => {
    const updateListingStatusMock = vi.fn();
    const updateListingMock = vi.fn();
    const appendExportHistoryMock = vi.fn();
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-image-mismatch',
        productId: 'product-1',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        marketplaceData: null,
      },
      repository: {
        updateListingStatus: updateListingStatusMock,
        updateListing: updateListingMock,
        appendExportHistory: appendExportHistoryMock,
      },
    });
    runTraderaBrowserListingMock.mockRejectedValue(
      internalError(
        'FAIL_IMAGE_SET_INVALID: Tradera uploaded more image previews than expected. Last state: {"expectedUploadCount":3,"observedPreviewDelta":4}'
      )
    );

    await expect(
      processTraderaListingJob({
        listingId: 'listing-image-mismatch',
        action: 'list',
        source: 'manual',
        jobId: 'job-tradera-image-mismatch',
      })
    ).rejects.toThrow(
      'Tradera image upload produced more previews than expected. Review the listing images in Tradera and retry.'
    );

    expect(updateListingStatusMock).not.toHaveBeenCalled();
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-image-mismatch',
      expect.objectContaining({
        status: 'failed',
        failureReason:
          'Tradera image upload produced more previews than expected. Review the listing images in Tradera and retry.',
        marketplaceData: expect.objectContaining({
          tradera: expect.objectContaining({
            lastErrorCategory: 'FORM',
            pendingExecution: null,
            lastExecution: expect.objectContaining({
              requestId: 'job-tradera-image-mismatch',
              ok: false,
              error:
                'Tradera image upload produced more previews than expected. Review the listing images in Tradera and retry.',
              errorCategory: 'FORM',
              metadata: expect.objectContaining({
                failureCode: 'image_preview_mismatch',
                imagePreviewMismatch: true,
                duplicateRisk: false,
                expectedImageUploadCount: 3,
                observedImagePreviewDelta: 4,
              }),
            }),
          }),
        }),
      })
    );
    expect(appendExportHistoryMock).toHaveBeenCalledWith(
      'listing-image-mismatch',
      expect.objectContaining({
        status: 'failed',
        failureReason:
          'Tradera image upload produced more previews than expected. Review the listing images in Tradera and retry.',
        requestId: 'job-tradera-image-mismatch',
      })
    );
  });

  it('persists duplicate-risk image retry blocks as form failures with a user-facing retry message', async () => {
    const updateListingStatusMock = vi.fn();
    const updateListingMock = vi.fn();
    const appendExportHistoryMock = vi.fn();
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-image-duplicate-risk',
        productId: 'product-1',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        marketplaceData: null,
      },
      repository: {
        updateListingStatus: updateListingStatusMock,
        updateListing: updateListingMock,
        appendExportHistory: appendExportHistoryMock,
      },
    });
    runTraderaBrowserListingMock.mockRejectedValue(
      internalError(
        'FAIL_IMAGE_SET_INVALID: Tradera image upload reached a partial state and retrying could duplicate images. Last state: {"expectedUploadCount":3,"observedPreviewDelta":1}'
      )
    );

    await expect(
      processTraderaListingJob({
        listingId: 'listing-image-duplicate-risk',
        action: 'list',
        source: 'manual',
        jobId: 'job-tradera-image-duplicate-risk',
      })
    ).rejects.toThrow(
      'Tradera image upload may have partially succeeded, and retrying could duplicate images. Review the listing images in Tradera and retry.'
    );

    expect(updateListingStatusMock).not.toHaveBeenCalled();
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-image-duplicate-risk',
      expect.objectContaining({
        status: 'failed',
        failureReason:
          'Tradera image upload may have partially succeeded, and retrying could duplicate images. Review the listing images in Tradera and retry.',
        marketplaceData: expect.objectContaining({
          tradera: expect.objectContaining({
            lastErrorCategory: 'FORM',
            pendingExecution: null,
            lastExecution: expect.objectContaining({
              requestId: 'job-tradera-image-duplicate-risk',
              ok: false,
              error:
                'Tradera image upload may have partially succeeded, and retrying could duplicate images. Review the listing images in Tradera and retry.',
              errorCategory: 'FORM',
              metadata: expect.objectContaining({
                failureCode: 'image_duplicate_risk',
                imagePreviewMismatch: false,
                duplicateRisk: true,
                expectedImageUploadCount: 3,
                observedImagePreviewDelta: 1,
              }),
            }),
          }),
        }),
      })
    );
    expect(appendExportHistoryMock).toHaveBeenCalledWith(
      'listing-image-duplicate-risk',
      expect.objectContaining({
        status: 'failed',
        failureReason:
          'Tradera image upload may have partially succeeded, and retrying could duplicate images. Review the listing images in Tradera and retry.',
        requestId: 'job-tradera-image-duplicate-risk',
      })
    );
  });

  it('keeps scheduler-driven scripted Tradera runs on the connection default browser mode', async () => {
    const updateListingStatusMock = vi.fn();
    const updateListingMock = vi.fn();
    const appendExportHistoryMock = vi.fn();
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        marketplaceData: null,
      },
      repository: {
        updateListingStatus: updateListingStatusMock,
        updateListing: updateListingMock,
        appendExportHistory: appendExportHistoryMock,
      },
    });
    getConnectionByIdMock.mockResolvedValue({
      id: 'connection-1',
      integrationId: 'integration-1',
      traderaBrowserMode: 'scripted',
    });
    runTraderaBrowserListingMock.mockResolvedValue({
      externalListingId: 'external-1',
      listingUrl: 'https://www.tradera.com/item/1',
      metadata: {
        scriptMode: 'scripted',
        runId: 'run-scheduler-1',
        publishVerified: true,
      },
    });

    await processTraderaListingJob({
      listingId: 'listing-1',
      action: 'relist',
      source: 'scheduler',
      jobId: 'job-tradera-scheduler',
    });

    expect(runTraderaBrowserListingMock).toHaveBeenCalledWith(
      expect.objectContaining({
        browserMode: 'connection_default',
      })
    );
  });

  it('keeps the existing Tradera external listing id when a verified relist completes without a fresh id', async () => {
    const updateListingStatusMock = vi.fn();
    const updateListingMock = vi.fn();
    const appendExportHistoryMock = vi.fn();
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        externalListingId: 'external-existing',
        marketplaceData: {
          marketplace: 'tradera',
          listingUrl: 'https://www.tradera.com/item/external-existing',
          externalListingId: 'external-existing',
          tradera: {},
        },
      },
      repository: {
        updateListingStatus: updateListingStatusMock,
        updateListing: updateListingMock,
        appendExportHistory: appendExportHistoryMock,
      },
    });
    runTraderaBrowserListingMock.mockResolvedValue({
      externalListingId: null,
      listingUrl: null,
      metadata: {
        scriptMode: 'scripted',
        runId: 'run-no-id-success',
        publishVerified: true,
        latestStage: 'publish_verified',
        latestStageUrl: 'https://www.tradera.com/en/my/listings?tab=active',
      },
    });

    await processTraderaListingJob({
      listingId: 'listing-1',
      action: 'relist',
      source: 'manual',
      jobId: 'job-tradera-no-id-success',
    });

    expect(updateListingStatusMock).not.toHaveBeenCalled();
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        status: 'active',
        externalListingId: 'external-existing',
        marketplaceData: expect.objectContaining({
          listingUrl: 'https://www.tradera.com/item/external-existing',
          externalListingId: 'external-existing',
          tradera: expect.objectContaining({
            lastExecution: expect.objectContaining({
              requestId: 'job-tradera-no-id-success',
              ok: true,
              metadata: expect.objectContaining({
                publishVerified: true,
                latestStage: 'publish_verified',
                latestStageUrl: 'https://www.tradera.com/en/my/listings?tab=active',
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
        externalListingId: 'external-existing',
        requestId: 'job-tradera-no-id-success',
      })
    );
  });

  it('links an existing Tradera duplicate without assigning a synthetic expiry window', async () => {
    const updateListingStatusMock = vi.fn();
    const updateListingMock = vi.fn();
    const appendExportHistoryMock = vi.fn();
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-duplicate-linked',
        productId: 'product-1',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        externalListingId: null,
        listedAt: null,
        marketplaceData: null,
      },
      repository: {
        updateListingStatus: updateListingStatusMock,
        updateListing: updateListingMock,
        appendExportHistory: appendExportHistoryMock,
      },
    });
    runTraderaBrowserListingMock.mockResolvedValue({
      externalListingId: '725447805',
      listingUrl:
        'https://www.tradera.com/en/item/2805/725447805/slave-i-5-cm-metal-movie-keychain-star-wars',
      metadata: {
        scriptMode: 'scripted',
        runId: 'run-duplicate-linked',
        publishVerified: false,
        duplicateLinked: true,
        duplicateMatchStrategy: 'title+product-id',
        duplicateMatchedProductId: 'BASE-1',
        duplicateCandidateCount: 2,
        duplicateSearchTitle: 'Example title',
        browserMode: 'headed',
        requestedBrowserMode: 'headed',
      },
    });

    await processTraderaListingJob({
      listingId: 'listing-duplicate-linked',
      action: 'list',
      source: 'manual',
      jobId: 'job-tradera-duplicate-linked',
    });

    expect(updateListingStatusMock).not.toHaveBeenCalled();
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-duplicate-linked',
      expect.objectContaining({
        status: 'active',
        externalListingId: '725447805',
        listedAt: null,
        expiresAt: null,
        nextRelistAt: null,
        failureReason: null,
        marketplaceData: expect.objectContaining({
          listingUrl:
            'https://www.tradera.com/en/item/2805/725447805/slave-i-5-cm-metal-movie-keychain-star-wars',
          externalListingId: '725447805',
          tradera: expect.objectContaining({
            lastExecution: expect.objectContaining({
              requestId: 'job-tradera-duplicate-linked',
              ok: true,
              metadata: expect.objectContaining({
                duplicateLinked: true,
                duplicateMatchStrategy: 'title+product-id',
                duplicateMatchedProductId: 'BASE-1',
                duplicateCandidateCount: 2,
                duplicateSearchTitle: 'Example title',
                publishVerified: false,
              }),
            }),
          }),
        }),
      })
    );
    expect(appendExportHistoryMock).toHaveBeenCalledWith(
      'listing-duplicate-linked',
      expect.objectContaining({
        status: 'active',
        externalListingId: '725447805',
        expiresAt: null,
        requestId: 'job-tradera-duplicate-linked',
      })
    );
  });

  it('links an existing Tradera duplicate during relist without dropping the original listedAt timestamp', async () => {
    const updateListingStatusMock = vi.fn();
    const updateListingMock = vi.fn();
    const appendExportHistoryMock = vi.fn();
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-relist-duplicate-linked',
        productId: 'product-1',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        externalListingId: 'external-old',
        listedAt: '2026-04-01T09:00:00.000Z',
        marketplaceData: {
          marketplace: 'tradera',
          listingUrl: 'https://www.tradera.com/item/external-old',
          externalListingId: 'external-old',
          tradera: {},
        },
      },
      repository: {
        updateListingStatus: updateListingStatusMock,
        updateListing: updateListingMock,
        appendExportHistory: appendExportHistoryMock,
      },
    });
    runTraderaBrowserListingMock.mockResolvedValue({
      externalListingId: '725447805',
      listingUrl: 'https://www.tradera.com/item/725447805',
      metadata: {
        scriptMode: 'scripted',
        runId: 'run-relist-duplicate-linked',
        publishVerified: false,
        duplicateLinked: true,
        duplicateMatchStrategy: 'exact-title-single-candidate',
        duplicateMatchedProductId: null,
        duplicateCandidateCount: 1,
        duplicateSearchTitle: 'Example title',
        browserMode: 'headed',
        requestedBrowserMode: 'headed',
      },
    });

    await processTraderaListingJob({
      listingId: 'listing-relist-duplicate-linked',
      action: 'relist',
      source: 'manual',
      jobId: 'job-tradera-relist-duplicate-linked',
    });

    expect(updateListingStatusMock).not.toHaveBeenCalled();
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-relist-duplicate-linked',
      expect.objectContaining({
        status: 'active',
        externalListingId: '725447805',
        listedAt: '2026-04-01T09:00:00.000Z',
        expiresAt: null,
        nextRelistAt: null,
        lastRelistedAt: expect.any(Date),
        failureReason: null,
      })
    );
    expect(appendExportHistoryMock).toHaveBeenCalledWith(
      'listing-relist-duplicate-linked',
      expect.objectContaining({
        status: 'active',
        externalListingId: '725447805',
        expiresAt: null,
        relist: true,
        requestId: 'job-tradera-relist-duplicate-linked',
      })
    );
  });

  it('preserves relist timestamps when duplicate linkage is indicated only by duplicate match strategy', async () => {
    const updateListingStatusMock = vi.fn();
    const updateListingMock = vi.fn();
    const appendExportHistoryMock = vi.fn();
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-relist-duplicate-strategy-only',
        productId: 'product-1',
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        externalListingId: 'external-old',
        listedAt: '2026-04-01T09:00:00.000Z',
        expiresAt: '2026-04-30T09:00:00.000Z',
        nextRelistAt: '2026-04-29T09:00:00.000Z',
        marketplaceData: {
          marketplace: 'tradera',
          listingUrl: 'https://www.tradera.com/item/external-old',
          externalListingId: 'external-old',
          tradera: {},
        },
      },
      repository: {
        updateListingStatus: updateListingStatusMock,
        updateListing: updateListingMock,
        appendExportHistory: appendExportHistoryMock,
      },
    });
    runTraderaBrowserListingMock.mockResolvedValue({
      externalListingId: '725447805',
      listingUrl: 'https://www.tradera.com/item/725447805',
      metadata: {
        scriptMode: 'scripted',
        runId: 'run-relist-duplicate-strategy-only',
        publishVerified: false,
        duplicateMatchStrategy: 'exact-title-single-candidate',
        duplicateMatchedProductId: null,
        duplicateCandidateCount: 1,
        duplicateSearchTitle: 'Example title',
        browserMode: 'headed',
        requestedBrowserMode: 'headed',
      },
    });

    await processTraderaListingJob({
      listingId: 'listing-relist-duplicate-strategy-only',
      action: 'relist',
      source: 'manual',
      jobId: 'job-tradera-relist-duplicate-strategy-only',
    });

    expect(updateListingStatusMock).not.toHaveBeenCalled();
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-relist-duplicate-strategy-only',
      expect.objectContaining({
        status: 'active',
        externalListingId: '725447805',
        listedAt: '2026-04-01T09:00:00.000Z',
        expiresAt: null,
        nextRelistAt: null,
        lastRelistedAt: expect.any(Date),
        failureReason: null,
      })
    );
    expect(appendExportHistoryMock).toHaveBeenCalledWith(
      'listing-relist-duplicate-strategy-only',
      expect.objectContaining({
        status: 'active',
        externalListingId: '725447805',
        expiresAt: null,
        relist: true,
        requestId: 'job-tradera-relist-duplicate-strategy-only',
      })
    );
  });
});
