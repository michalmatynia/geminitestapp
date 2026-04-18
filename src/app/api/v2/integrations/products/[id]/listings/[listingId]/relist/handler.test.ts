import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findProductListingByIdAcrossProvidersMock,
  enqueuePlaywrightListingJobMock,
  getIntegrationByIdMock,
  enqueueTraderaListingJobMock,
  initializeQueuesMock,
  updateListingStatusMock,
  updateListingMock,
} = vi.hoisted(() => ({
  findProductListingByIdAcrossProvidersMock: vi.fn(),
  enqueuePlaywrightListingJobMock: vi.fn(),
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
  enqueuePlaywrightListingJob: (...args: unknown[]) =>
    enqueuePlaywrightListingJobMock(...args),
  enqueueTraderaListingJob: (...args: unknown[]) =>
    enqueueTraderaListingJobMock(...args),
  initializeQueues: (...args: unknown[]) => initializeQueuesMock(...args),
}));

import { POST_handler } from './handler';

describe('integration listing relist handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-tradera-1',
        status: 'active',
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
    enqueuePlaywrightListingJobMock.mockResolvedValue('job-playwright-relist-1');
    enqueueTraderaListingJobMock.mockResolvedValue('job-tradera-relist-1');
    updateListingStatusMock.mockResolvedValue(undefined);
    updateListingMock.mockResolvedValue(undefined);
  });

  it('initializes queues before enqueueing a Tradera relist job', async () => {
    const response = await POST_handler(
      new Request('http://localhost/api') as never,
      {} as never,
      { id: 'product-1', listingId: 'listing-1' }
    );

    const payload = await response.json();

    expect(initializeQueuesMock).toHaveBeenCalledTimes(1);
    expect(enqueueTraderaListingJobMock).toHaveBeenCalledWith({
      listingId: 'listing-1',
      action: 'relist',
      source: 'manual',
    });
    expect(payload.queue).toMatchObject({
      name: 'tradera-listings',
      jobId: 'job-tradera-relist-1',
    });
  });

  it('passes headed/headless overrides through for Tradera browser relists', async () => {
    const response = await POST_handler(
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

    const payload = await response.json();

    expect(initializeQueuesMock).toHaveBeenCalledTimes(1);
    expect(enqueueTraderaListingJobMock).toHaveBeenCalledWith({
      listingId: 'listing-1',
      action: 'relist',
      source: 'manual',
      browserMode: 'headed',
    });
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        marketplaceData: expect.objectContaining({
          marketplace: 'tradera',
          tradera: expect.objectContaining({
            pendingExecution: expect.objectContaining({
              requestedBrowserMode: 'headed',
              requestId: 'job-tradera-relist-1',
            }),
          }),
        }),
      })
    );
    expect(payload.queue).toMatchObject({
      name: 'tradera-listings',
      jobId: 'job-tradera-relist-1',
    });
  });

  it('forwards selectorProfile overrides through for Tradera browser relists', async () => {
    const response = await POST_handler(
      new Request('http://localhost/api', {
        method: 'POST',
        body: JSON.stringify({ selectorProfile: 'profile-market-a' }),
        headers: {
          'content-type': 'application/json',
        },
      }) as never,
      {} as never,
      { id: 'product-1', listingId: 'listing-1' }
    );

    await response.json();

    expect(enqueueTraderaListingJobMock).toHaveBeenCalledWith({
      listingId: 'listing-1',
      action: 'relist',
      source: 'manual',
      selectorProfile: 'profile-market-a',
    });
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        marketplaceData: expect.objectContaining({
          tradera: expect.objectContaining({
            pendingExecution: expect.objectContaining({
              action: 'relist',
              requestedSelectorProfile: 'profile-market-a',
            }),
          }),
        }),
      })
    );
  });

  it('returns already queued for fresh queued relist records', async () => {
    const queuedAt = new Date().toISOString();
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-tradera-1',
        status: 'queued_relist',
        updatedAt: queuedAt,
        marketplaceData: {
          tradera: {
            pendingExecution: {
              action: 'relist',
              requestedBrowserMode: 'headed',
              requestId: 'job-existing',
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

    const response = await POST_handler(
      new Request('http://localhost/api') as never,
      {} as never,
      { id: 'product-1', listingId: 'listing-1' }
    );

    await expect(response.json()).resolves.toMatchObject({
      queued: true,
      alreadyQueued: true,
      listingId: 'listing-1',
      status: 'queued_relist',
    });
    expect(enqueueTraderaListingJobMock).not.toHaveBeenCalled();
  });

  it.each(['queued_relist', 'running'])(
    'requeues stale %s relist records instead of blocking forever',
    async (status) => {
      const queuedAt = new Date(Date.now() - 16 * 60 * 1000).toISOString();
      findProductListingByIdAcrossProvidersMock.mockResolvedValue({
        listing: {
          id: 'listing-1',
          productId: 'product-1',
          integrationId: 'integration-tradera-1',
          status,
          updatedAt: queuedAt,
          marketplaceData: {
            tradera: {
              pendingExecution: {
                action: 'relist',
                requestedBrowserMode: 'headed',
                requestId: 'job-stale',
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

      const response = await POST_handler(
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

      const payload = await response.json();

      expect(payload.alreadyQueued).toBeUndefined();
      expect(enqueueTraderaListingJobMock).toHaveBeenCalledWith({
        listingId: 'listing-1',
        action: 'relist',
        source: 'manual',
        browserMode: 'headed',
      });
      expect(updateListingStatusMock).toHaveBeenCalledWith('listing-1', 'queued_relist');
    }
  );

  it('passes headed/headless overrides through for Playwright programmable relists', async () => {
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-playwright-1',
        status: 'active',
      },
      repository: {
        updateListingStatus: (...args: unknown[]) => updateListingStatusMock(...args),
        updateListing: (...args: unknown[]) => updateListingMock(...args),
      },
    });
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-playwright-1',
      slug: 'playwright-programmable',
    });

    const response = await POST_handler(
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

    const payload = await response.json();

    expect(initializeQueuesMock).toHaveBeenCalledTimes(1);
    expect(enqueuePlaywrightListingJobMock).toHaveBeenCalledWith({
      listingId: 'listing-1',
      action: 'relist',
      source: 'manual',
      browserMode: 'headed',
    });
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        marketplaceData: expect.objectContaining({
          marketplace: 'playwright-programmable',
          playwright: expect.objectContaining({
            pendingExecution: expect.objectContaining({
              requestedBrowserMode: 'headed',
              requestId: 'job-playwright-relist-1',
            }),
          }),
        }),
      })
    );
    expect(payload.queue).toMatchObject({
      name: 'playwright-programmable-listings',
      jobId: 'job-playwright-relist-1',
    });
  });

  it('rejects browser mode overrides for relists that are not Playwright or Tradera browser', async () => {
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-tradera-api-1',
      slug: 'tradera-api',
    });

    await expect(
      POST_handler(
        new Request('http://localhost/api', {
          method: 'POST',
          body: JSON.stringify({ browserMode: 'headed' }),
          headers: {
            'content-type': 'application/json',
          },
        }) as never,
        {} as never,
        { id: 'product-1', listingId: 'listing-1' }
      )
    ).rejects.toThrow(
      'Browser mode override is only supported for Playwright and Tradera browser relists'
    );

    expect(enqueueTraderaListingJobMock).not.toHaveBeenCalled();
    expect(enqueuePlaywrightListingJobMock).not.toHaveBeenCalled();
  });

  it('rejects selectorProfile overrides for relists that are not Tradera browser', async () => {
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-playwright-1',
      slug: 'playwright-programmable',
    });

    await expect(
      POST_handler(
        new Request('http://localhost/api', {
          method: 'POST',
          body: JSON.stringify({ selectorProfile: 'profile-market-a' }),
          headers: {
            'content-type': 'application/json',
          },
        }) as never,
        {} as never,
        { id: 'product-1', listingId: 'listing-1' }
      )
    ).rejects.toThrow(
      'Selector profile override is only supported for Tradera browser relists'
    );

    expect(enqueueTraderaListingJobMock).not.toHaveBeenCalled();
    expect(enqueuePlaywrightListingJobMock).not.toHaveBeenCalled();
  });
});
