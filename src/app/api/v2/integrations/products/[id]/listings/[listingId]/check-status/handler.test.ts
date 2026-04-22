import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findProductListingByIdAcrossProvidersMock,
  getIntegrationByIdMock,
  enqueueTraderaListingJobMock,
  initializeQueuesMock,
  assertTraderaBrowserSessionReadyMock,
  updateListingMock,
} = vi.hoisted(() => ({
  findProductListingByIdAcrossProvidersMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
  enqueueTraderaListingJobMock: vi.fn(),
  initializeQueuesMock: vi.fn(),
  assertTraderaBrowserSessionReadyMock: vi.fn(),
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

vi.mock('@/app/api/v2/integrations/_shared/tradera-browser-session-preflight', () => ({
  assertTraderaBrowserSessionReady: (...args: unknown[]) =>
    assertTraderaBrowserSessionReadyMock(...args),
}));

import { postHandler } from './handler';

describe('integration listing check-status handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-tradera-1',
        connectionId: 'connection-tradera-1',
        status: 'active',
        marketplaceData: null,
      },
      repository: {
        updateListing: (...args: unknown[]) => updateListingMock(...args),
      },
    });
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-tradera-1',
      slug: 'tradera',
    });
    assertTraderaBrowserSessionReadyMock.mockResolvedValue(undefined);
    enqueueTraderaListingJobMock.mockResolvedValue('job-tradera-check-1');
    updateListingMock.mockResolvedValue(undefined);
  });

  it('queues a Tradera live check and persists pending execution metadata', async () => {
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

    const payload = await response.json();

    expect(initializeQueuesMock).toHaveBeenCalledTimes(1);
    expect(assertTraderaBrowserSessionReadyMock).toHaveBeenCalledWith({
      integrationRepository: expect.any(Object),
      integrationId: 'integration-tradera-1',
      connectionId: 'connection-tradera-1',
    });
    expect(enqueueTraderaListingJobMock).toHaveBeenCalledWith({
      listingId: 'listing-1',
      action: 'check_status',
      source: 'manual',
    });
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        marketplaceData: expect.objectContaining({
          marketplace: 'tradera',
          tradera: expect.objectContaining({
            pendingExecution: expect.objectContaining({
              action: 'check_status',
              requestedBrowserMode: 'connection_default',
              requestId: 'job-tradera-check-1',
            }),
          }),
        }),
      })
    );
    expect(payload).toMatchObject({
      queued: true,
      listingId: 'listing-1',
      queue: {
        name: 'tradera-listings',
        jobId: 'job-tradera-check-1',
      },
    });
  });

  it('forwards selectorProfile overrides into the queued Tradera live check', async () => {
    const response = await postHandler(
      new Request('http://localhost/api', {
        method: 'POST',
        body: JSON.stringify({
          selectorProfile: 'profile-market-a',
        }),
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
      action: 'check_status',
      source: 'manual',
      selectorProfile: 'profile-market-a',
    });
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        marketplaceData: expect.objectContaining({
          tradera: expect.objectContaining({
            pendingExecution: expect.objectContaining({
              requestedSelectorProfile: 'profile-market-a',
            }),
          }),
        }),
      })
    );
  });

  it('queues a check_status even when the listing status is queued from a prior list/relist job', async () => {
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-tradera-1',
        connectionId: 'connection-tradera-1',
        status: 'queued', // stuck from a previous list job — must NOT block check_status
        marketplaceData: null,
      },
      repository: {
        updateListing: (...args: unknown[]) => updateListingMock(...args),
      },
    });

    const response = await postHandler(
      new Request('http://localhost/api', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' },
      }) as never,
      {} as never,
      { id: 'product-1', listingId: 'listing-1' }
    );

    const payload = await response.json();

    expect(payload).toMatchObject({ queued: true, listingId: 'listing-1' });
    expect(payload.alreadyQueued).toBeUndefined();
    expect(enqueueTraderaListingJobMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'check_status' })
    );
  });

  it('re-queues check_status when the pendingExecution is stale (older than 5 min)', async () => {
    const staleQueuedAt = new Date(Date.now() - 6 * 60 * 1000).toISOString(); // 6 min ago
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-tradera-1',
        connectionId: 'connection-tradera-1',
        status: 'active',
        marketplaceData: {
          tradera: {
            pendingExecution: {
              action: 'check_status',
              requestId: 'job-stale',
              queuedAt: staleQueuedAt,
            },
          },
        },
      },
      repository: {
        updateListing: (...args: unknown[]) => updateListingMock(...args),
      },
    });

    const response = await postHandler(
      new Request('http://localhost/api', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' },
      }) as never,
      {} as never,
      { id: 'product-1', listingId: 'listing-1' }
    );

    const payload = await response.json();

    expect(payload).toMatchObject({ queued: true, listingId: 'listing-1' });
    expect(payload.alreadyQueued).toBeUndefined();
    expect(enqueueTraderaListingJobMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'check_status' })
    );
  });

  it('treats a pending Tradera check-status execution as already queued', async () => {
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-tradera-1',
        connectionId: 'connection-tradera-1',
        status: 'active',
        marketplaceData: {
          tradera: {
            pendingExecution: {
              action: 'check_status',
              requestId: 'job-existing',
            },
          },
        },
      },
      repository: {
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

    const payload = await response.json();

    expect(payload).toMatchObject({
      queued: true,
      alreadyQueued: true,
      listingId: 'listing-1',
      status: 'active',
    });
    expect(initializeQueuesMock).not.toHaveBeenCalled();
    expect(assertTraderaBrowserSessionReadyMock).not.toHaveBeenCalled();
    expect(enqueueTraderaListingJobMock).not.toHaveBeenCalled();
    expect(updateListingMock).not.toHaveBeenCalled();
  });

  it('refuses to queue a live check when the Tradera browser session is stale', async () => {
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-tradera-1',
        connectionId: 'connection-tradera-1',
        status: 'active',
        marketplaceData: null,
      },
      repository: {
        updateListing: (...args: unknown[]) => updateListingMock(...args),
      },
    });
    assertTraderaBrowserSessionReadyMock.mockRejectedValue(
      Object.assign(
        new Error(
          'AUTH_REQUIRED: Stored Tradera session expired or is missing. Open Tradera recovery options and refresh the session.'
        ),
        { httpStatus: 401, code: 'UNAUTHORIZED' }
      )
    );

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
    ).rejects.toMatchObject({
      message:
        'AUTH_REQUIRED: Stored Tradera session expired or is missing. Open Tradera recovery options and refresh the session.',
      httpStatus: 401,
    });

    expect(initializeQueuesMock).not.toHaveBeenCalled();
    expect(enqueueTraderaListingJobMock).not.toHaveBeenCalled();
    expect(updateListingMock).not.toHaveBeenCalled();
  });
});
