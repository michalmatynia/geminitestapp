import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getListingsByProductIdsMock,
  listIntegrationsMock,
  updateListingMock,
  enqueueTraderaListingJobMock,
  initializeQueuesMock,
} = vi.hoisted(() => ({
  getListingsByProductIdsMock: vi.fn(),
  listIntegrationsMock: vi.fn(),
  updateListingMock: vi.fn(),
  enqueueTraderaListingJobMock: vi.fn(),
  initializeQueuesMock: vi.fn(),
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

import { POST_handler } from './handler';

describe('integrations product-listings tradera-status-check handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listIntegrationsMock.mockResolvedValue([
      {
        id: 'integration-tradera-browser',
        slug: 'tradera',
      },
      {
        id: 'integration-tradera-api',
        slug: 'tradera-api',
      },
    ]);
    getListingsByProductIdsMock.mockResolvedValue([
      {
        id: 'listing-browser-1',
        productId: 'product-1',
        integrationId: 'integration-tradera-browser',
        status: 'ended',
        listedAt: '2026-04-01T10:00:00.000Z',
        marketplaceData: null,
      },
      {
        id: 'listing-api-2',
        productId: 'product-2',
        integrationId: 'integration-tradera-api',
        status: 'active',
        listedAt: '2026-04-02T10:00:00.000Z',
        marketplaceData: null,
      },
      {
        id: 'listing-browser-3',
        productId: 'product-3',
        integrationId: 'integration-tradera-browser',
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
    enqueueTraderaListingJobMock.mockResolvedValue('job-tradera-batch-1');
    updateListingMock.mockResolvedValue(undefined);
  });

  it('queues eligible browser listings and returns skipped and already-queued results', async () => {
    const response = await POST_handler(
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
      results: [
        expect.objectContaining({
          productId: 'product-1',
          listingId: 'listing-browser-1',
          status: 'queued',
          queue: expect.objectContaining({
            name: 'tradera-listings',
            jobId: 'job-tradera-batch-1',
          }),
        }),
        expect.objectContaining({
          productId: 'product-2',
          listingId: null,
          status: 'skipped',
        }),
        expect.objectContaining({
          productId: 'product-3',
          listingId: 'listing-browser-3',
          status: 'already_queued',
        }),
        expect.objectContaining({
          productId: 'product-4',
          listingId: null,
          status: 'skipped',
        }),
      ],
    });
  });

  it('reports queue failures without sending browser overrides', async () => {
    getListingsByProductIdsMock.mockResolvedValue([
      {
        id: 'listing-browser-1',
        productId: 'product-1',
        integrationId: 'integration-tradera-browser',
        status: 'active',
        listedAt: '2026-04-03T10:00:00.000Z',
        marketplaceData: null,
      },
    ]);
    enqueueTraderaListingJobMock.mockRejectedValue(new Error('Queue unavailable'));

    const response = await POST_handler(
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
      results: [
        expect.objectContaining({
          productId: 'product-1',
          listingId: 'listing-browser-1',
          status: 'error',
          message: 'Queue unavailable',
        }),
      ],
    });
  });
});
