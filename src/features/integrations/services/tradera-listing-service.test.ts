import { beforeEach, describe, expect, it, vi } from 'vitest';

import { badRequestError, internalError } from '@/shared/errors/app-error';

const {
  findProductListingByIdAcrossProvidersMock,
  getConnectionByIdMock,
  getIntegrationByIdMock,
  loadTraderaSystemSettingsMock,
  runTraderaBrowserListingMock,
  runTraderaApiListingMock,
  resolveEffectiveListingSettingsMock,
  buildRelistPolicyMock,
  captureExceptionMock,
} = vi.hoisted(() => ({
  findProductListingByIdAcrossProvidersMock: vi.fn(),
  getConnectionByIdMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
  loadTraderaSystemSettingsMock: vi.fn(),
  runTraderaBrowserListingMock: vi.fn(),
  runTraderaApiListingMock: vi.fn(),
  resolveEffectiveListingSettingsMock: vi.fn(),
  buildRelistPolicyMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  findProductListingByIdAcrossProviders: (...args: unknown[]) =>
    findProductListingByIdAcrossProvidersMock(...args) as Promise<unknown>,
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

import { processTraderaListingJob } from './tradera-listing-service';

describe('processTraderaListingJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadTraderaSystemSettingsMock.mockResolvedValue({});
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
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-1',
      slug: 'tradera',
    });
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

    expect(updateListingStatusMock).toHaveBeenCalledWith('listing-1', 'active');
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

    expect(updateListingStatusMock).toHaveBeenCalledWith('listing-1', 'failed');
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

    expect(updateListingStatusMock).toHaveBeenCalledWith('listing-1', 'auth_required');
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

    expect(updateListingStatusMock).toHaveBeenCalledWith('listing-1', 'failed');
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
});
