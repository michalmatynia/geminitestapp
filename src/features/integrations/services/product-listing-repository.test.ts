import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAppDbProviderMock, getMongoDbMock } = vi.hoisted(() => ({
  getAppDbProviderMock: vi.fn(),
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/app-db-provider', () => ({
  getAppDbProvider: (...args: unknown[]) => getAppDbProviderMock(...args),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: (...args: unknown[]) => getMongoDbMock(...args),
}));

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {},
}));

import { getProductListingRepository } from './product-listing-repository';

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

    getAppDbProviderMock.mockResolvedValue('mongodb');
    getMongoDbMock.mockResolvedValue({
      collection: collectionFactory,
    });

    const repository = await getProductListingRepository();
    await repository.getListingsByProductIds(['p1']);
    await repository.getListingsByProductIds(['p2']);

    expect(createIndexMock).toHaveBeenCalledTimes(5);
    expect(findMock).toHaveBeenCalledTimes(2);
  });
});
