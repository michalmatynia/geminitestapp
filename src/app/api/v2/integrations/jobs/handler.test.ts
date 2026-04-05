import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getProductListingRepositoryMock,
  getMongoDbMock,
} = vi.hoisted(() => ({
  getProductListingRepositoryMock: vi.fn(),
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  getProductListingRepository: getProductListingRepositoryMock,
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

import { GET_handler } from './handler';

describe('v2 integrations jobs handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds grouped product jobs from bulk listing and lookup queries', async () => {
    const listAllListingsMock = vi.fn().mockResolvedValue([
      {
        productId: 'product-1',
        status: 'active',
        integrationId: 'integration-1',
        marketplaceData: null,
      },
      {
        productId: 'product-2',
        status: 'failed',
        integrationId: 'integration-2',
        marketplaceData: null,
      },
    ]);
    const getListingsByProductIdsMock = vi.fn().mockResolvedValue([
      {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
        status: 'active',
        externalListingId: 'ext-1',
        inventoryId: null,
        listedAt: null,
        expiresAt: null,
        nextRelistAt: null,
        relistAttempts: 0,
        lastRelistedAt: null,
        lastStatusCheckAt: null,
        relistPolicy: null,
        marketplaceData: null,
        failureReason: null,
        exportHistory: null,
        createdAt: '2026-04-02T10:00:00.000Z',
        updatedAt: '2026-04-02T10:00:01.000Z',
      },
      {
        id: 'listing-2',
        productId: 'product-2',
        integrationId: 'integration-2',
        connectionId: 'connection-2',
        status: 'failed',
        externalListingId: null,
        inventoryId: 'inv-2',
        listedAt: null,
        expiresAt: null,
        nextRelistAt: null,
        relistAttempts: 1,
        lastRelistedAt: null,
        lastStatusCheckAt: null,
        relistPolicy: null,
        marketplaceData: null,
        failureReason: 'boom',
        exportHistory: null,
        createdAt: '2026-04-02T10:05:00.000Z',
        updatedAt: '2026-04-02T10:05:01.000Z',
      },
    ]);

    getProductListingRepositoryMock.mockResolvedValue({
      listAllListings: listAllListingsMock,
      getListingsByProductIds: getListingsByProductIdsMock,
    });

    const productFindMock = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        {
          _id: 'product-1',
          id: 'product-1',
          name_en: 'Product One',
          sku: 'SKU-1',
        },
        {
          _id: 'product-2',
          id: 'product-2',
          name_pl: 'Produkt Dwa',
          sku: null,
        },
      ]),
    });

    const integrationFindMock = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { _id: 'integration-1', id: 'integration-1', name: 'Base', slug: 'base' },
        { _id: 'integration-2', id: 'integration-2', name: 'Allegro', slug: 'allegro' },
      ]),
    });

    const connectionFindMock = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { _id: 'connection-1', id: 'connection-1', name: 'Primary Base' },
        { _id: 'connection-2', id: 'connection-2', name: 'Primary Allegro' },
      ]),
    });

    getMongoDbMock.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'products') {
          return { find: productFindMock };
        }
        if (name === 'integrations') {
          return { find: integrationFindMock };
        }
        if (name === 'integration_connections') {
          return { find: connectionFindMock };
        }
        return { find: vi.fn() };
      },
    });

    const response = await GET_handler({} as never, {} as never);
    const body = await response.json();

    expect(listAllListingsMock).toHaveBeenCalledTimes(1);
    expect(getListingsByProductIdsMock).toHaveBeenCalledTimes(1);
    expect(getListingsByProductIdsMock).toHaveBeenCalledWith(['product-1', 'product-2']);
    expect(body).toEqual([
      expect.objectContaining({
        productId: 'product-1',
        productName: 'Product One',
        productSku: 'SKU-1',
        listings: [
          expect.objectContaining({
            id: 'listing-1',
            integrationName: 'Base',
            integrationSlug: 'base',
            connectionName: 'Primary Base',
          }),
        ],
      }),
      expect.objectContaining({
        productId: 'product-2',
        productName: 'Produkt Dwa',
        productSku: null,
        listings: [
          expect.objectContaining({
            id: 'listing-2',
            integrationName: 'Allegro',
            integrationSlug: 'allegro',
            connectionName: 'Primary Allegro',
            failureReason: 'boom',
          }),
        ],
      }),
    ]);
  });
});
