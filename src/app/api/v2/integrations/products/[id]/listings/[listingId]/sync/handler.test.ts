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
        body: JSON.stringify({ selectorProfile: 'profile-market-a' }),
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
    });
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        marketplaceData: expect.objectContaining({
          tradera: expect.objectContaining({
            pendingExecution: expect.objectContaining({
              action: 'sync',
              requestedSelectorProfile: 'profile-market-a',
            }),
          }),
        }),
      })
    );
  });
});
