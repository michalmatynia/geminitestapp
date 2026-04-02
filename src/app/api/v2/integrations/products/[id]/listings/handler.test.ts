import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  parseJsonBodyMock,
  getProductByIdMock,
  getIntegrationByIdMock,
  getConnectionByIdAndIntegrationMock,
  listingExistsAcrossProvidersMock,
  createListingMock,
  enqueueTraderaListingJobMock,
  initializeQueuesMock,
} = vi.hoisted(() => ({
  parseJsonBodyMock: vi.fn(),
  getProductByIdMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
  getConnectionByIdAndIntegrationMock: vi.fn(),
  listingExistsAcrossProvidersMock: vi.fn(),
  createListingMock: vi.fn(),
  enqueueTraderaListingJobMock: vi.fn(),
  initializeQueuesMock: vi.fn(),
}));

vi.mock('@/features/products/server', () => ({
  parseJsonBody: (...args: unknown[]) => parseJsonBodyMock(...args),
  getProductRepository: async () => ({
    getProductById: (...args: unknown[]) => getProductByIdMock(...args),
  }),
}));

vi.mock('@/features/integrations/server', () => ({
  getProductListingRepository: async () => ({
    createListing: (...args: unknown[]) => createListingMock(...args),
  }),
  listingExistsAcrossProviders: (...args: unknown[]) =>
    listingExistsAcrossProvidersMock(...args),
  getIntegrationRepository: async () => ({
    getIntegrationById: (...args: unknown[]) => getIntegrationByIdMock(...args),
    getConnectionByIdAndIntegration: (...args: unknown[]) =>
      getConnectionByIdAndIntegrationMock(...args),
  }),
}));

vi.mock('@/features/jobs/server', () => ({
  enqueueTraderaListingJob: (...args: unknown[]) =>
    enqueueTraderaListingJobMock(...args),
  enqueuePlaywrightListingJob: vi.fn(),
  initializeQueues: (...args: unknown[]) => initializeQueuesMock(...args),
}));

import { POST_handler } from './handler';

describe('integration product listings handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        integrationId: 'integration-tradera-1',
        connectionId: 'connection-tradera-1',
      },
    });
    getProductByIdMock.mockResolvedValue({ id: 'product-1' });
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-tradera-1',
      slug: 'tradera',
    });
    getConnectionByIdAndIntegrationMock.mockResolvedValue({
      id: 'connection-tradera-1',
      integrationId: 'integration-tradera-1',
      traderaAutoRelistEnabled: true,
      traderaAutoRelistLeadMinutes: 180,
      traderaDefaultDurationHours: 72,
      traderaDefaultTemplateId: null,
    });
    listingExistsAcrossProvidersMock.mockResolvedValue(false);
    createListingMock.mockResolvedValue({
      id: 'listing-1',
      productId: 'product-1',
      integrationId: 'integration-tradera-1',
      connectionId: 'connection-tradera-1',
      status: 'queued',
    });
    enqueueTraderaListingJobMock.mockResolvedValue('job-tradera-1');
  });

  it('initializes queues before enqueueing a Tradera listing job', async () => {
    const response = await POST_handler(
      new Request('http://localhost/api') as never,
      {} as never,
      { id: 'product-1' }
    );

    const payload = await response.json();

    expect(initializeQueuesMock).toHaveBeenCalledTimes(1);
    expect(enqueueTraderaListingJobMock).toHaveBeenCalledWith({
      listingId: 'listing-1',
      action: 'list',
      source: 'api',
    });
    expect(payload.queue).toMatchObject({
      name: 'tradera-listings',
      jobId: 'job-tradera-1',
    });
  });

  it('returns a real conflict response when a listing already exists for the connection', async () => {
    listingExistsAcrossProvidersMock.mockResolvedValue(true);

    const response = await POST_handler(
      new Request('http://localhost/api') as never,
      {} as never,
      { id: 'product-1' }
    );

    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({
      error: 'Product is already listed on this account',
      code: expect.any(String),
      details: {
        productId: 'product-1',
        connectionId: 'connection-tradera-1',
      },
    });
    expect(createListingMock).not.toHaveBeenCalled();
    expect(enqueueTraderaListingJobMock).not.toHaveBeenCalled();
  });
});
