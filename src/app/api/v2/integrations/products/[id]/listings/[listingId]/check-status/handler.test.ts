import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findProductListingByIdAcrossProvidersMock,
  getIntegrationByIdMock,
  enqueueTraderaListingJobMock,
  initializeQueuesMock,
  updateListingMock,
} = vi.hoisted(() => ({
  findProductListingByIdAcrossProvidersMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
  enqueueTraderaListingJobMock: vi.fn(),
  initializeQueuesMock: vi.fn(),
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

import { POST_handler } from './handler';

describe('integration listing check-status handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-tradera-1',
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
    enqueueTraderaListingJobMock.mockResolvedValue('job-tradera-check-1');
    updateListingMock.mockResolvedValue(undefined);
  });

  it('queues a Tradera live check and persists pending execution metadata', async () => {
    const response = await POST_handler(
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

  it('treats a pending Tradera check-status execution as already queued', async () => {
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-tradera-1',
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

    const response = await POST_handler(
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
    expect(enqueueTraderaListingJobMock).not.toHaveBeenCalled();
    expect(updateListingMock).not.toHaveBeenCalled();
  });
});
