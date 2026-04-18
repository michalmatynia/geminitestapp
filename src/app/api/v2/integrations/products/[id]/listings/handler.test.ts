import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  parseJsonBodyMock,
  getProductByIdMock,
  getIntegrationByIdMock,
  getConnectionByIdAndIntegrationMock,
  listingExistsAcrossProvidersMock,
  listProductListingsByProductIdAcrossProvidersMock,
  createListingMock,
  enqueueTraderaListingJobMock,
  buildTraderaListingQueueJobIdMock,
  enqueueVintedListingJobMock,
  updateListingMock,
  initializeQueuesMock,
  listCanonicalBaseProductListingsMock,
} = vi.hoisted(() => ({
  parseJsonBodyMock: vi.fn(),
  getProductByIdMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
  getConnectionByIdAndIntegrationMock: vi.fn(),
  listingExistsAcrossProvidersMock: vi.fn(),
  listProductListingsByProductIdAcrossProvidersMock: vi.fn(),
  createListingMock: vi.fn(),
  enqueueTraderaListingJobMock: vi.fn(),
  buildTraderaListingQueueJobIdMock: vi.fn(),
  enqueueVintedListingJobMock: vi.fn(),
  updateListingMock: vi.fn(),
  initializeQueuesMock: vi.fn(),
  listCanonicalBaseProductListingsMock: vi.fn(),
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
    updateListing: (...args: unknown[]) => updateListingMock(...args),
  }),
  listingExistsAcrossProviders: (...args: unknown[]) =>
    listingExistsAcrossProvidersMock(...args),
  listProductListingsByProductIdAcrossProviders: (...args: unknown[]) =>
    listProductListingsByProductIdAcrossProvidersMock(...args),
  getIntegrationRepository: async () => ({
    getIntegrationById: (...args: unknown[]) => getIntegrationByIdMock(...args),
    getConnectionByIdAndIntegration: (...args: unknown[]) =>
      getConnectionByIdAndIntegrationMock(...args),
  }),
}));

vi.mock('@/features/jobs/server', () => ({
  enqueueTraderaListingJob: (...args: unknown[]) =>
    enqueueTraderaListingJobMock(...args),
  buildTraderaListingQueueJobId: (...args: unknown[]) =>
    buildTraderaListingQueueJobIdMock(...args),
  enqueueVintedListingJob: (...args: unknown[]) =>
    enqueueVintedListingJobMock(...args),
  enqueuePlaywrightListingJob: vi.fn(),
  initializeQueues: (...args: unknown[]) => initializeQueuesMock(...args),
}));

vi.mock('@/features/integrations/services/base-listing-canonicalization', () => ({
  listCanonicalBaseProductListings: (...args: unknown[]) =>
    listCanonicalBaseProductListingsMock(...args),
  resolvePersistedTraderaLinkedTarget: vi.fn(),
}));

import { GET_handler, POST_handler } from './handler';

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
    listProductListingsByProductIdAcrossProvidersMock.mockResolvedValue([]);
    createListingMock.mockResolvedValue({
      id: 'listing-1',
      productId: 'product-1',
      integrationId: 'integration-tradera-1',
      connectionId: 'connection-tradera-1',
      status: 'queued',
    });
    buildTraderaListingQueueJobIdMock.mockReturnValue('job-tradera-1');
    enqueueTraderaListingJobMock.mockResolvedValue('job-tradera-1');
    enqueueVintedListingJobMock.mockResolvedValue('job-vinted-1');
    listCanonicalBaseProductListingsMock.mockResolvedValue([]);
  });

  it('serves product listings with no-store cache headers', async () => {
    listCanonicalBaseProductListingsMock.mockResolvedValue([
      {
        id: 'listing-1',
        productId: 'product-1',
        status: 'ended',
      },
    ]);

    const response = await GET_handler(
      new Request('http://localhost/api') as never,
      {} as never,
      { id: 'product-1' }
    );

    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual([
      {
        id: 'listing-1',
        productId: 'product-1',
        status: 'ended',
      },
    ]);
  });

  it('initializes queues before enqueueing a Tradera listing job', async () => {
    const response = await POST_handler(
      new Request('http://localhost/api') as never,
      {} as never,
      { id: 'product-1' }
    );

    const payload = await response.json();

    expect(initializeQueuesMock).toHaveBeenCalledTimes(1);
    expect(buildTraderaListingQueueJobIdMock).toHaveBeenCalledWith({
      listingId: 'listing-1',
      action: 'list',
      source: 'api',
    });
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        marketplaceData: expect.objectContaining({
          tradera: expect.objectContaining({
            pendingExecution: expect.objectContaining({
              requestId: 'job-tradera-1',
            }),
          }),
        }),
      })
    );
    expect(updateListingMock.mock.invocationCallOrder[0]).toBeLessThan(
      enqueueTraderaListingJobMock.mock.invocationCallOrder[0]
    );
    expect(enqueueTraderaListingJobMock).toHaveBeenCalledWith({
      listingId: 'listing-1',
      action: 'list',
      source: 'api',
      jobId: 'job-tradera-1',
    });
    expect(payload.queue).toMatchObject({
      name: 'tradera-listings',
      jobId: 'job-tradera-1',
    });
  });

  it('returns a real conflict response when an active Tradera listing already exists for the connection', async () => {
    listProductListingsByProductIdAcrossProvidersMock.mockResolvedValue([
      {
        id: 'listing-active-1',
        productId: 'product-1',
        connectionId: 'connection-tradera-1',
        status: 'active',
        externalListingId: null,
        marketplaceData: {
          marketplace: 'tradera',
        },
        updatedAt: '2026-04-18T10:00:00.000Z',
      },
    ]);

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
        listingId: 'listing-active-1',
        status: 'active',
      },
    });
    expect(createListingMock).not.toHaveBeenCalled();
    expect(enqueueTraderaListingJobMock).not.toHaveBeenCalled();
  });

  it('returns the existing fresh queued Tradera listing instead of creating a duplicate', async () => {
    const queuedAt = new Date().toISOString();
    listProductListingsByProductIdAcrossProvidersMock.mockResolvedValue([
      {
        id: 'listing-queued-1',
        productId: 'product-1',
        integrationId: 'integration-tradera-1',
        connectionId: 'connection-tradera-1',
        status: 'queued',
        externalListingId: null,
        marketplaceData: {
          marketplace: 'tradera',
          tradera: {
            pendingExecution: {
              action: 'list',
              requestId: 'job-existing-1',
              queuedAt,
            },
          },
        },
        updatedAt: queuedAt,
      },
    ]);

    const response = await POST_handler(
      new Request('http://localhost/api') as never,
      {} as never,
      { id: 'product-1' }
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      id: 'listing-queued-1',
      status: 'queued',
      queued: true,
      queue: {
        name: 'tradera-listings',
        jobId: 'job-existing-1',
        enqueuedAt: queuedAt,
      },
    });
    expect(createListingMock).not.toHaveBeenCalled();
    expect(enqueueTraderaListingJobMock).not.toHaveBeenCalled();
  });

  it('marks a newly created Tradera listing failed when enqueueing the browser job fails', async () => {
    enqueueTraderaListingJobMock.mockRejectedValueOnce(new Error('Queue unavailable'));

    const response = await POST_handler(
      new Request('http://localhost/api') as never,
      {} as never,
      { id: 'product-1' }
    );

    expect(response.status).toBe(500);
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        marketplaceData: expect.objectContaining({
          tradera: expect.objectContaining({
            pendingExecution: expect.objectContaining({
              requestId: 'job-tradera-1',
            }),
          }),
        }),
      })
    );
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        status: 'failed',
        failureReason: 'Queue unavailable',
      })
    );
    expect(updateListingMock.mock.invocationCallOrder[0]).toBeLessThan(
      updateListingMock.mock.invocationCallOrder[1]
    );
  });

  it('fails a stale queued Tradera listing and queues a fresh browser job', async () => {
    listProductListingsByProductIdAcrossProvidersMock.mockResolvedValue([
      {
        id: 'listing-stale-queued-1',
        productId: 'product-1',
        connectionId: 'connection-tradera-1',
        status: 'queued',
        externalListingId: null,
        marketplaceData: {
          marketplace: 'tradera',
        },
        updatedAt: '2020-01-01T00:00:00.000Z',
      },
    ]);

    const response = await POST_handler(
      new Request('http://localhost/api') as never,
      {} as never,
      { id: 'product-1' }
    );

    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-stale-queued-1',
      expect.objectContaining({
        status: 'failed',
        failureReason: expect.stringContaining('expired before the browser worker started'),
      })
    );
    expect(createListingMock).toHaveBeenCalled();
    expect(enqueueTraderaListingJobMock).toHaveBeenCalledWith({
      listingId: 'listing-1',
      action: 'list',
      source: 'api',
      jobId: 'job-tradera-1',
    });
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        marketplaceData: expect.objectContaining({
          marketplace: 'tradera',
          tradera: expect.objectContaining({
            pendingExecution: expect.objectContaining({
              action: 'list',
              requestId: 'job-tradera-1',
            }),
          }),
        }),
      })
    );
    expect(payload).toMatchObject({
      id: 'listing-1',
      queued: true,
      queue: {
        name: 'tradera-listings',
        jobId: 'job-tradera-1',
      },
      marketplaceData: {
        marketplace: 'tradera',
        tradera: {
          pendingExecution: {
            action: 'list',
            requestId: 'job-tradera-1',
          },
        },
      },
    });
  });

  it('returns a conflict when a linked Tradera listing already exists for the connection, even if the old row is terminal', async () => {
    listingExistsAcrossProvidersMock.mockResolvedValue(false);
    listProductListingsByProductIdAcrossProvidersMock.mockResolvedValue([
      {
        id: 'listing-linked-1',
        productId: 'product-1',
        connectionId: 'connection-tradera-1',
        status: 'failed',
        externalListingId: '721891408',
        marketplaceData: {
          listingUrl:
            'https://www.tradera.com/en/item/292901/721891408/the-alien-4-cm-pin-alf',
        },
      },
    ]);

    const response = await POST_handler(
      new Request('http://localhost/api') as never,
      {} as never,
      { id: 'product-1' }
    );

    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({
      error: 'Product is already linked to a Tradera listing on this account',
      code: expect.any(String),
      details: {
        productId: 'product-1',
        connectionId: 'connection-tradera-1',
        listingId: 'listing-linked-1',
        externalListingId: '721891408',
        listingUrl:
          'https://www.tradera.com/en/item/292901/721891408/the-alien-4-cm-pin-alf',
      },
    });
    expect(createListingMock).not.toHaveBeenCalled();
    expect(enqueueTraderaListingJobMock).not.toHaveBeenCalled();
  });

  it('records pending Vinted runtime metadata when queueing a listing job', async () => {
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        integrationId: 'integration-vinted-1',
        connectionId: 'connection-vinted-1',
      },
    });
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-vinted-1',
      slug: 'vinted',
    });
    getConnectionByIdAndIntegrationMock.mockResolvedValue({
      id: 'connection-vinted-1',
      integrationId: 'integration-vinted-1',
      playwrightBrowser: 'auto',
    });
    createListingMock.mockResolvedValue({
      id: 'listing-vinted-1',
      productId: 'product-1',
      integrationId: 'integration-vinted-1',
      connectionId: 'connection-vinted-1',
      status: 'queued',
      marketplaceData: {
        marketplace: 'vinted',
        source: 'manual-listing',
      },
    });

    const response = await POST_handler(
      new Request('http://localhost/api') as never,
      {} as never,
      { id: 'product-1' }
    );

    const payload = await response.json();

    expect(initializeQueuesMock).toHaveBeenCalledTimes(1);
    expect(enqueueVintedListingJobMock).toHaveBeenCalledWith({
      listingId: 'listing-vinted-1',
      action: 'list',
      source: 'api',
      browserMode: 'headed',
      browserPreference: 'brave',
    });
    expect(updateListingMock).toHaveBeenCalledWith(
      'listing-vinted-1',
      expect.objectContaining({
        marketplaceData: expect.objectContaining({
          marketplace: 'vinted',
          vinted: expect.objectContaining({
            pendingExecution: expect.objectContaining({
              action: 'list',
              requestedBrowserMode: 'headed',
              requestedBrowserPreference: 'brave',
              requestId: 'job-vinted-1',
            }),
          }),
        }),
      })
    );
    expect(payload).toMatchObject({
      id: 'listing-vinted-1',
      queued: true,
      marketplaceData: {
        marketplace: 'vinted',
        vinted: {
          pendingExecution: {
            action: 'list',
            requestedBrowserMode: 'headed',
            requestedBrowserPreference: 'brave',
            requestId: 'job-vinted-1',
          },
        },
      },
      queue: {
        name: 'vinted-listings',
        jobId: 'job-vinted-1',
      },
    });
  });
});
