import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: (...args: unknown[]) => getMongoDbMock(...args),
}));

import {
  findProductListingByIdAcrossProviders,
  findProductListingByProductAndConnectionAcrossProviders,
  getProductListingRepository,
  listProductListingsByProductIdAcrossProviders,
  listingExistsAcrossProviders,
} from './product-listing-repository';

const createMongoDbMock = () => {
  const createIndexMock = vi.fn().mockResolvedValue('ok');
  const listingDocs = [
    {
      _id: 'listing-1',
      productId: 'product-1',
      integrationId: 'integration-base',
      connectionId: 'connection-1',
      externalListingId: 'base-123',
      inventoryId: 'inv-main',
      status: 'active',
      createdAt: new Date('2026-03-11T10:00:00.000Z'),
      updatedAt: new Date('2026-03-11T10:00:00.000Z'),
    },
  ];
  const listingFindMock = vi.fn((filter?: Record<string, unknown>) => {
    const result =
      filter && '_id' in filter
        ? listingDocs.filter((entry) => entry._id === filter['_id'])
        : listingDocs;
    return {
      sort: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(result),
      }),
      toArray: vi.fn().mockResolvedValue(result),
    };
  });
  const findOneMock = vi.fn().mockImplementation((filter?: Record<string, unknown>) => {
    if (!filter) return Promise.resolve(null);
    if ('_id' in filter) {
      return Promise.resolve(listingDocs.find((entry) => entry._id === filter['_id']) ?? null);
    }
    return Promise.resolve(null);
  });
  const countDocumentsMock = vi.fn().mockResolvedValue(1);
  const integrationFindMock = vi.fn().mockReturnValue({
    toArray: vi.fn().mockResolvedValue([
      {
        _id: 'integration-base',
        name: 'Base.com',
        slug: 'base',
      },
    ]),
  });
  const connectionFindMock = vi.fn().mockReturnValue({
    toArray: vi.fn().mockResolvedValue([
      {
        _id: 'connection-1',
        name: 'Primary Base connection',
      },
    ]),
  });

  const collectionFactory = vi.fn((name: string) => {
    if (name === 'product_listings') {
      return {
        createIndex: createIndexMock,
        find: listingFindMock,
        findOne: findOneMock,
        countDocuments: countDocumentsMock,
      };
    }

    if (name === 'integrations') {
      return {
        find: integrationFindMock,
      };
    }

    if (name === 'integration_connections') {
      return {
        find: connectionFindMock,
      };
    }

    return {
      find: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
    };
  });

  return {
    db: { collection: collectionFactory },
    createIndexMock,
    listingFindMock,
    findOneMock,
    countDocumentsMock,
    integrationFindMock,
    connectionFindMock,
  };
};

describe('product-listing-repository mongodb indexes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ensures listing indexes once and reuses them for subsequent calls', async () => {
    const createIndexMock = vi.fn().mockResolvedValue('ok');
    const findMock = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    });
    const collectionMock = {
      createIndex: createIndexMock,
      find: findMock,
    };
    const collectionFactory = vi.fn().mockReturnValue(collectionMock);

    getMongoDbMock.mockResolvedValue({
      collection: collectionFactory,
    });

    const repository = await getProductListingRepository();
    await repository.getListingsByProductIds(['p1']);
    await repository.getListingsByProductIds(['p2']);

    expect(createIndexMock).toHaveBeenCalledTimes(5);
    expect(findMock).toHaveBeenCalledTimes(2);
  });

  it('resolves existing listings through MongoDB only for one-click export lookups', async () => {
    const { db, listingFindMock } = createMongoDbMock();

    getMongoDbMock.mockResolvedValue(db);

    const resolved = await findProductListingByProductAndConnectionAcrossProviders(
      'product-1',
      'connection-1'
    );

    expect(resolved).not.toBeNull();
    expect(resolved?.listing.id).toBe('listing-1');
    expect(resolved?.listing.externalListingId).toBe('base-123');
    expect(listingFindMock).toHaveBeenCalledTimes(1);
  });

  it('checks listing existence through MongoDB only', async () => {
    const { db, countDocumentsMock } = createMongoDbMock();

    getMongoDbMock.mockResolvedValue(db);

    await expect(listingExistsAcrossProviders('product-1', 'connection-1')).resolves.toBe(true);
    expect(countDocumentsMock).toHaveBeenCalledTimes(1);
  });

  it('loads listing details by id through MongoDB only', async () => {
    const { db, findOneMock } = createMongoDbMock();

    getMongoDbMock.mockResolvedValue(db);

    const resolved = await findProductListingByIdAcrossProviders('listing-1');

    expect(resolved).not.toBeNull();
    expect(resolved?.listing.id).toBe('listing-1');
    expect(findOneMock).toHaveBeenCalledTimes(1);
  });

  it('lists product listing details through MongoDB only', async () => {
    const { db, listingFindMock, integrationFindMock, connectionFindMock } = createMongoDbMock();

    getMongoDbMock.mockResolvedValue(db);

    const listings = await listProductListingsByProductIdAcrossProviders('product-1');

    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({
      id: 'listing-1',
      productId: 'product-1',
      integration: {
        id: 'integration-base',
        name: 'Base.com',
        slug: 'base',
      },
      connection: {
        id: 'connection-1',
        name: 'Primary Base connection',
      },
    });
    expect(listingFindMock).toHaveBeenCalledTimes(1);
    expect(integrationFindMock).toHaveBeenCalledTimes(1);
    expect(connectionFindMock).toHaveBeenCalledTimes(1);
  });
});
