import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findProductListingByIdAcrossProvidersMock,
  getIntegrationByIdMock,
  enqueueTraderaListingJobMock,
  initializeQueuesMock,
  updateListingStatusMock,
  updateListingMock,
} = vi.hoisted(() => ({
  findProductListingByIdAcrossProvidersMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
  enqueueTraderaListingJobMock: vi.fn(),
  initializeQueuesMock: vi.fn(),
  updateListingStatusMock: vi.fn(),
  updateListingMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  findProductListingByIdAcrossProviders: (...args: unknown[]) =>
    findProductListingByIdAcrossProvidersMock(...args),
  getIntegrationRepository: async () => ({
    getIntegrationById: (...args: unknown[]) => getIntegrationByIdMock(...args),
  }),
}));

vi.mock('@/features/jobs/server', () => ({
  enqueueTraderaListingJob: (...args: unknown[]) =>
    enqueueTraderaListingJobMock(...args),
  initializeQueues: (...args: unknown[]) => initializeQueuesMock(...args),
}));

import { postHandler } from './handler';

describe('integration listing sync handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-tradera-1',
        status: 'active',
        externalListingId: 'external-1',
        marketplaceData: {
          tradera: {
            listingUrl: 'https://www.tradera.com/item/external-1',
          },
        },
      },
      repository: {
        updateListingStatus: (...args: unknown[]) => updateListingStatusMock(...args),
        updateListing: (...args: unknown[]) => updateListingMock(...args),
      },
    });
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-tradera-1',
      slug: 'tradera',
    });
    enqueueTraderaListingJobMock.mockResolvedValue('job-tradera-sync-1');
    updateListingStatusMock.mockResolvedValue(undefined);
    updateListingMock.mockResolvedValue(undefined);
  });

  it('forwards selectorProfile overrides through for Tradera browser sync jobs', async () => {
    const response = await postHandler(
      new Request('http://localhost/api', {
        method: 'POST',
        body: JSON.stringify({
          selectorProfile: 'profile-market-a',
          skipImages: true,
        }),
        headers: {
          'content-type': 'application/json',
        },
      }) as never,
      {} as never,
      { id: 'product-1', listingId: 'listing-1' }
    );

    await response.json();

    expect(initializeQueuesMock).toHaveBeenCalledTimes(1);
    expect(enqueueTraderaListingJobMock).toHaveBeenCalledWith({
      listingId: 'listing-1',
      action: 'sync',
      source: 'manual',
      selectorProfile: 'profile-market-a',
      syncSkipImages: true,
    });
    expect(updateListingStatusMock).toHaveBeenCalledWith('listing-1', 'queued');
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        marketplaceData: expect.objectContaining({
          tradera: expect.objectContaining({
            pendingExecution: expect.objectContaining({
              action: 'sync',
              requestedSelectorProfile: 'profile-market-a',
              skipImages: true,
            }),
          }),
        }),
      })
    );
  });

  it('rejects sync while a different Tradera action is already queued or running', async () => {
    const queuedAt = new Date().toISOString();
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-tradera-1',
        status: 'queued_relist',
        updatedAt: queuedAt,
        externalListingId: 'external-1',
        marketplaceData: {
          tradera: {
            pendingExecution: {
              action: 'relist',
              requestId: 'job-tradera-relist-1',
              queuedAt,
            },
          },
        },
      },
      repository: {
        updateListingStatus: (...args: unknown[]) => updateListingStatusMock(...args),
        updateListing: (...args: unknown[]) => updateListingMock(...args),
      },
    });

    await expect(
      postHandler(
        new Request('http://localhost/api', {
          method: 'POST',
          body: JSON.stringify({}),
          headers: {
            'content-type': 'application/json',
          },
        }) as never,
        {} as never,
        { id: 'product-1', listingId: 'listing-1' }
      )
    ).rejects.toThrow(
      'Sync is not available while a Tradera relist is queued or running.'
    );

    expect(enqueueTraderaListingJobMock).not.toHaveBeenCalled();
  });

  it('returns already queued for fresh queued sync records', async () => {
    const queuedAt = new Date().toISOString();
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-tradera-1',
        status: 'queued',
        updatedAt: queuedAt,
        externalListingId: 'external-1',
        marketplaceData: {
          tradera: {
            pendingExecution: {
              action: 'sync',
              requestId: 'job-tradera-sync-existing',
              queuedAt,
            },
          },
        },
      },
      repository: {
        updateListingStatus: (...args: unknown[]) => updateListingStatusMock(...args),
        updateListing: (...args: unknown[]) => updateListingMock(...args),
      },
    });

    const response = await postHandler(
      new Request('http://localhost/api', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'content-type': 'application/json',
        },
      }) as never,
      {} as never,
      { id: 'product-1', listingId: 'listing-1' }
    );

    await expect(response.json()).resolves.toMatchObject({
      queued: true,
      alreadyQueued: true,
      listingId: 'listing-1',
      status: 'queued',
    });
    expect(enqueueTraderaListingJobMock).not.toHaveBeenCalled();
  });

  it('requeues stale queued Tradera runs instead of blocking sync forever', async () => {
    const queuedAt = new Date(Date.now() - 16 * 60 * 1000).toISOString();
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-tradera-1',
        status: 'queued_relist',
        updatedAt: queuedAt,
        externalListingId: 'external-1',
        marketplaceData: {
          tradera: {
            pendingExecution: {
              action: 'relist',
              requestedBrowserMode: 'headed',
              requestId: 'job-tradera-stale-relist',
              queuedAt,
            },
          },
        },
      },
      repository: {
        updateListingStatus: (...args: unknown[]) => updateListingStatusMock(...args),
        updateListing: (...args: unknown[]) => updateListingMock(...args),
      },
    });

    const response = await postHandler(
      new Request('http://localhost/api', {
        method: 'POST',
        body: JSON.stringify({ browserMode: 'headed' }),
        headers: {
          'content-type': 'application/json',
        },
      }) as never,
      {} as never,
      { id: 'product-1', listingId: 'listing-1' }
    );

    await response.json();

    expect(updateListingStatusMock).toHaveBeenCalledWith('listing-1', 'queued');
    expect(enqueueTraderaListingJobMock).toHaveBeenCalledWith({
      listingId: 'listing-1',
      action: 'sync',
      source: 'manual',
      browserMode: 'headed',
    });
  });

  it('rejects sync when the listing has no persisted Tradera target', async () => {
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-tradera-1',
        status: 'active',
        externalListingId: null,
        marketplaceData: {
          tradera: {},
        },
      },
      repository: {
        updateListingStatus: (...args: unknown[]) => updateListingStatusMock(...args),
        updateListing: (...args: unknown[]) => updateListingMock(...args),
      },
    });

    await expect(
      postHandler(
        new Request('http://localhost/api', {
          method: 'POST',
          body: JSON.stringify({}),
          headers: {
            'content-type': 'application/json',
          },
        }) as never,
        {} as never,
        { id: 'product-1', listingId: 'listing-1' }
      )
    ).rejects.toThrow(
      'Sync requires an existing Tradera listing URL or external listing ID'
    );

    expect(enqueueTraderaListingJobMock).not.toHaveBeenCalled();
  });

  it('rejects sync for listings whose latest verified Tradera status is terminal', async () => {
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-tradera-1',
        status: 'active',
        externalListingId: 'external-1',
        marketplaceData: {
          tradera: {
            lastExecution: {
              action: 'check_status',
              metadata: {
                checkedStatus: 'ended',
              },
            },
          },
        },
      },
      repository: {
        updateListingStatus: (...args: unknown[]) => updateListingStatusMock(...args),
        updateListing: (...args: unknown[]) => updateListingMock(...args),
      },
    });

    await expect(
      postHandler(
        new Request('http://localhost/api', {
          method: 'POST',
          body: JSON.stringify({}),
          headers: {
            'content-type': 'application/json',
          },
        }) as never,
        {} as never,
        { id: 'product-1', listingId: 'listing-1' }
      )
    ).rejects.toThrow(
      'Sync is not available for ended, unsold, sold, or removed Tradera listings. Use relist instead.'
    );

    expect(enqueueTraderaListingJobMock).not.toHaveBeenCalled();
  });
});
