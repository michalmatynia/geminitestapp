import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getListingsByProductIdsMock,
  listIntegrationsMock,
  updateListingMock,
  enqueueTraderaListingJobMock,
  initializeQueuesMock,
  assertTraderaBrowserSessionReadyMock,
} = vi.hoisted(() => ({
  getListingsByProductIdsMock: vi.fn(),
  listIntegrationsMock: vi.fn(),
  updateListingMock: vi.fn(),
  enqueueTraderaListingJobMock: vi.fn(),
  initializeQueuesMock: vi.fn(),
  assertTraderaBrowserSessionReadyMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  getProductListingRepository: async () => ({
    getListingsByProductIds: (...args: unknown[]) => getListingsByProductIdsMock(...args),
    updateListing: (...args: unknown[]) => updateListingMock(...args),
  }),
  getIntegrationRepository: async () => ({
    listIntegrations: (...args: unknown[]) => listIntegrationsMock(...args),
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

describe('integrations product-listings tradera-status-check handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listIntegrationsMock.mockResolvedValue([
      {
        id: 'integration-tradera-browser',
        slug: 'tradera',
      },
      {
        id: 'integration-base',
        slug: 'baselinker',
      },
    ]);
    getListingsByProductIdsMock.mockResolvedValue([
      {
        id: 'listing-browser-1',
        productId: 'product-1',
        integrationId: 'integration-tradera-browser',
        connectionId: 'connection-tradera-1',
        status: 'ended',
        listedAt: '2026-04-01T10:00:00.000Z',
        marketplaceData: null,
      },
      {
        id: 'listing-base-2',
        productId: 'product-2',
        integrationId: 'integration-base',
        connectionId: 'connection-base-1',
        status: 'active',
        listedAt: '2026-04-02T10:00:00.000Z',
        marketplaceData: null,
      },
      {
        id: 'listing-browser-3',
        productId: 'product-3',
        integrationId: 'integration-tradera-browser',
        connectionId: 'connection-tradera-1',
        status: 'active',
        listedAt: '2026-04-03T10:00:00.000Z',
        marketplaceData: {
          tradera: {
            pendingExecution: {
              action: 'check_status',
              requestId: 'job-existing',
            },
          },
        },
      },
    ]);
    assertTraderaBrowserSessionReadyMock.mockResolvedValue(undefined);
    enqueueTraderaListingJobMock.mockResolvedValue('job-tradera-batch-1');
    updateListingMock.mockResolvedValue(undefined);
  });

  it('queues eligible browser listings and returns skipped and already-queued results', async () => {
    const response = await postHandler(
      new Request('http://localhost/api', {
        method: 'POST',
        body: JSON.stringify({
          productIds: ['product-1', 'product-2', 'product-3', 'product-4'],
        }),
        headers: {
          'content-type': 'application/json',
        },
      }) as never,
      {} as never
    );

    const payload = await response.json();

    expect(initializeQueuesMock).toHaveBeenCalledTimes(1);
    expect(assertTraderaBrowserSessionReadyMock).toHaveBeenCalledWith({
      integrationRepository: expect.any(Object),
      integrationId: 'integration-tradera-browser',
      connectionId: 'connection-tradera-1',
    });
    expect(enqueueTraderaListingJobMock).toHaveBeenCalledWith({
      listingId: 'listing-browser-1',
      action: 'check_status',
      source: 'manual',
    });
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-browser-1',
      expect.objectContaining({
        marketplaceData: expect.objectContaining({
          marketplace: 'tradera',
          tradera: expect.objectContaining({
            pendingExecution: expect.objectContaining({
              action: 'check_status',
              requestedBrowserMode: 'connection_default',
              requestId: 'job-tradera-batch-1',
            }),
          }),
        }),
      })
    );
    expect(payload).toMatchObject({
      total: 4,
      queued: 1,
      alreadyQueued: 1,
      skipped: 2,
      failed: 0,
      reasonCounts: {
        queued: 1,
        already_queued: 1,
        no_tradera_browser_listing: 2,
      },
      results: [
        expect.objectContaining({
          productId: 'product-1',
          listingId: 'listing-browser-1',
          status: 'queued',
          reason: 'queued',
          queue: expect.objectContaining({
            name: 'tradera-listings',
            jobId: 'job-tradera-batch-1',
          }),
        }),
        expect.objectContaining({
          productId: 'product-2',
          listingId: null,
          status: 'skipped',
          reason: 'no_tradera_browser_listing',
        }),
        expect.objectContaining({
          productId: 'product-3',
          listingId: 'listing-browser-3',
          status: 'already_queued',
          reason: 'already_queued',
        }),
        expect.objectContaining({
          productId: 'product-4',
          listingId: null,
          status: 'skipped',
          reason: 'no_tradera_browser_listing',
        }),
      ],
    });
  });

  it('queues the explicitly targeted listing when batch targets include listing ids', async () => {
    getListingsByProductIdsMock.mockResolvedValue([
      {
        id: 'listing-browser-old',
        productId: 'product-1',
        integrationId: 'integration-tradera-browser',
        connectionId: 'connection-tradera-1',
        status: 'active',
        listedAt: '2026-04-01T10:00:00.000Z',
        marketplaceData: null,
      },
      {
        id: 'listing-browser-target',
        productId: 'product-1',
        integrationId: 'integration-tradera-browser',
        connectionId: 'connection-tradera-1',
        status: 'ended',
        listedAt: '2026-04-03T10:00:00.000Z',
        marketplaceData: null,
      },
    ]);

    const response = await postHandler(
      new Request('http://localhost/api', {
        method: 'POST',
        body: JSON.stringify({
          targets: [
            {
              productId: 'product-1',
              listingId: 'listing-browser-target',
            },
          ],
        }),
        headers: {
          'content-type': 'application/json',
        },
      }) as never,
      {} as never
    );

    const payload = await response.json();

    expect(enqueueTraderaListingJobMock).toHaveBeenCalledWith({
      listingId: 'listing-browser-target',
      action: 'check_status',
      source: 'manual',
    });
    expect(payload).toMatchObject({
      total: 1,
      queued: 1,
      alreadyQueued: 0,
      skipped: 0,
      failed: 0,
      reasonCounts: {
        queued: 1,
      },
      results: [
        expect.objectContaining({
          productId: 'product-1',
          listingId: 'listing-browser-target',
          status: 'queued',
          reason: 'queued',
        }),
      ],
    });
  });

  it('reports when an explicitly targeted listing is no longer available', async () => {
    getListingsByProductIdsMock.mockResolvedValue([
      {
        id: 'listing-browser-old',
        productId: 'product-1',
        integrationId: 'integration-tradera-browser',
        connectionId: 'connection-tradera-1',
        status: 'active',
        listedAt: '2026-04-01T10:00:00.000Z',
        marketplaceData: null,
      },
    ]);

    const response = await postHandler(
      new Request('http://localhost/api', {
        method: 'POST',
        body: JSON.stringify({
          targets: [
            {
              productId: 'product-1',
              listingId: 'listing-browser-missing',
            },
          ],
        }),
        headers: {
          'content-type': 'application/json',
        },
      }) as never,
      {} as never
    );

    const payload = await response.json();

    expect(initializeQueuesMock).not.toHaveBeenCalled();
    expect(enqueueTraderaListingJobMock).not.toHaveBeenCalled();
    expect(payload).toMatchObject({
      total: 1,
      queued: 0,
      alreadyQueued: 0,
      skipped: 1,
      failed: 0,
      reasonCounts: {
        selected_listing_unavailable: 1,
      },
      results: [
        expect.objectContaining({
          productId: 'product-1',
          listingId: 'listing-browser-missing',
          status: 'skipped',
          reason: 'selected_listing_unavailable',
        }),
      ],
    });
  });

  it('forwards selectorProfile overrides into queued batch live checks', async () => {
    const response = await postHandler(
      new Request('http://localhost/api', {
        method: 'POST',
        body: JSON.stringify({
          productIds: ['product-1'],
          selectorProfile: 'profile-market-a',
        }),
        headers: {
          'content-type': 'application/json',
        },
      }) as never,
      {} as never
    );

    await response.json();

    expect(enqueueTraderaListingJobMock).toHaveBeenCalledWith({
      listingId: 'listing-browser-1',
      action: 'check_status',
      source: 'manual',
      selectorProfile: 'profile-market-a',
    });
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-browser-1',
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

  it('reports queue failures without sending browser overrides', async () => {
    getListingsByProductIdsMock.mockResolvedValue([
      {
        id: 'listing-browser-1',
        productId: 'product-1',
        integrationId: 'integration-tradera-browser',
        connectionId: 'connection-tradera-1',
        status: 'active',
        listedAt: '2026-04-03T10:00:00.000Z',
        marketplaceData: null,
      },
    ]);
    enqueueTraderaListingJobMock.mockRejectedValue(new Error('Queue unavailable'));

    const response = await postHandler(
      new Request('http://localhost/api', {
        method: 'POST',
        body: JSON.stringify({
          productIds: ['product-1'],
        }),
        headers: {
          'content-type': 'application/json',
        },
      }) as never,
      {} as never
    );

    const payload = await response.json();

    expect(enqueueTraderaListingJobMock).toHaveBeenCalledWith({
      listingId: 'listing-browser-1',
      action: 'check_status',
      source: 'manual',
    });
    expect(updateListingMock).not.toHaveBeenCalled();
    expect(payload).toMatchObject({
      total: 1,
      queued: 0,
      alreadyQueued: 0,
      skipped: 0,
      failed: 1,
      reasonCounts: {
        queue_failed: 1,
      },
      results: [
        expect.objectContaining({
          productId: 'product-1',
          listingId: 'listing-browser-1',
          status: 'error',
          reason: 'queue_failed',
          message: 'Queue unavailable',
        }),
      ],
    });
  });

  it('marks listings as failed when the Tradera browser session preflight rejects', async () => {
    getListingsByProductIdsMock.mockResolvedValue([
      {
        id: 'listing-browser-1',
        productId: 'product-1',
        integrationId: 'integration-tradera-browser',
        connectionId: 'connection-tradera-1',
        status: 'active',
        listedAt: '2026-04-03T10:00:00.000Z',
        marketplaceData: null,
      },
    ]);
    assertTraderaBrowserSessionReadyMock.mockRejectedValue(
      new Error(
        'AUTH_REQUIRED: Stored Tradera session expired or is missing. Open Tradera recovery options and refresh the session.'
      )
    );

    const response = await postHandler(
      new Request('http://localhost/api', {
        method: 'POST',
        body: JSON.stringify({
          productIds: ['product-1'],
        }),
        headers: {
          'content-type': 'application/json',
        },
      }) as never,
      {} as never
    );

    const payload = await response.json();

    expect(initializeQueuesMock).not.toHaveBeenCalled();
    expect(enqueueTraderaListingJobMock).not.toHaveBeenCalled();
    expect(updateListingMock).not.toHaveBeenCalled();
    expect(payload).toMatchObject({
      total: 1,
      queued: 0,
      alreadyQueued: 0,
      skipped: 0,
      failed: 1,
      reasonCounts: {
        auth_required: 1,
      },
      results: [
        expect.objectContaining({
          productId: 'product-1',
          listingId: 'listing-browser-1',
          status: 'error',
          reason: 'auth_required',
          message:
            'AUTH_REQUIRED: Stored Tradera session expired or is missing. Open Tradera recovery options and refresh the session.',
        }),
      ],
    });
  });
});
