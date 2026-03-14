import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { NextRequest } from 'next/server';

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn() as Mock,
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

import { GET_products_metadata_handler, POST_products_metadata_handler } from './handler';

const createMongoMock = (collections: Record<string, Record<string, unknown>>) => ({
  collection: vi.fn((name: string) => {
    const collection = collections[name];
    if (!collection) {
      throw new Error(`Unexpected collection lookup: ${name}`);
    }
    return collection;
  }),
});

describe('v2 products metadata handler canonical contract', () => {
  beforeEach(() => {
    getMongoDbMock.mockReset();
  });

  it('returns price-groups with canonical fields', async () => {
    const priceGroupsToArrayMock = vi.fn().mockResolvedValue([
      {
        id: 'pg-1',
        groupId: 'PLN',
        name: 'Polish',
        type: 'standard',
        sourceGroupId: null,
        currencyId: 'PLN',
      },
    ]);
    const currenciesToArrayMock = vi.fn().mockResolvedValue([
      {
        id: 'PLN',
        code: 'PLN',
        name: 'Polish Zloty',
        symbol: 'zł',
      },
    ]);

    getMongoDbMock.mockResolvedValue(
      createMongoMock({
        price_groups: {
          find: vi.fn(() => ({
            sort: vi.fn(() => ({
              skip: vi.fn(() => ({
                limit: vi.fn(() => ({
                  toArray: priceGroupsToArrayMock,
                })),
              })),
            })),
          })),
        },
        currencies: {
          find: vi.fn(() => ({
            toArray: currenciesToArrayMock,
          })),
        },
      })
    );

    const response = await GET_products_metadata_handler(
      new NextRequest('http://localhost/api/v2/products/metadata/price-groups'),
      {} as Parameters<typeof GET_products_metadata_handler>[1],
      { type: 'price-groups' }
    );

    const payload = (await response.json()) as Array<Record<string, unknown>>;
    expect(payload).toHaveLength(1);
    expect(payload[0]).toMatchObject({
      id: 'pg-1',
      currencyCode: 'PLN',
      type: 'standard',
    });
    expect(payload[0]?.['groupType']).toBeUndefined();
  });

  it('creates price-group from direct payload', async () => {
    const currencyFindOneMock = vi.fn().mockResolvedValue({
      id: 'PLN',
      code: 'PLN',
      name: 'Polish Zloty',
      symbol: 'zł',
    });
    const priceGroupsFindOneMock = vi.fn().mockResolvedValue(null);
    const priceGroupsInsertOneMock = vi.fn().mockResolvedValue({
      acknowledged: true,
      insertedId: 'mongo-price-group-1',
    });

    getMongoDbMock.mockResolvedValue(
      createMongoMock({
        currencies: {
          findOne: currencyFindOneMock,
        },
        price_groups: {
          findOne: priceGroupsFindOneMock,
          insertOne: priceGroupsInsertOneMock,
        },
      })
    );

    const request = new NextRequest('http://localhost/api/v2/products/metadata/price-groups', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Standard',
        currencyCode: 'PLN',
        isDefault: true,
      }),
    });

    const response = await POST_products_metadata_handler(
      request,
      {} as Parameters<typeof POST_products_metadata_handler>[1],
      { type: 'price-groups' }
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(currencyFindOneMock).toHaveBeenCalledWith({ code: 'PLN' });
    expect(priceGroupsFindOneMock).toHaveBeenCalledWith({ groupId: 'PLN' });
    expect(priceGroupsInsertOneMock).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: 'PLN',
        name: 'Standard',
        currencyId: 'PLN',
        isDefault: true,
        type: 'standard',
      })
    );
    expect(payload['currencyCode']).toBe('PLN');
    expect(payload['type']).toBe('standard');
    expect(payload['groupType']).toBeUndefined();
  });

  it('ignores legacy groupType alias when deriving type from canonical payload', async () => {
    const currencyFindOneMock = vi.fn().mockResolvedValue({
      id: 'PLN',
      code: 'PLN',
      name: 'Polish Zloty',
      symbol: 'zł',
    });
    const priceGroupsFindOneMock = vi.fn().mockResolvedValue(null);
    const priceGroupsInsertOneMock = vi.fn().mockResolvedValue({
      acknowledged: true,
      insertedId: 'mongo-price-group-2',
    });

    getMongoDbMock.mockResolvedValue(
      createMongoMock({
        currencies: {
          findOne: currencyFindOneMock,
        },
        price_groups: {
          findOne: priceGroupsFindOneMock,
          insertOne: priceGroupsInsertOneMock,
        },
      })
    );

    const request = new NextRequest('http://localhost/api/v2/products/metadata/price-groups', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Dependent Group',
        currencyCode: 'PLN',
        sourceGroupId: 'BASE',
        groupType: 'standard',
      }),
    });

    await POST_products_metadata_handler(
      request,
      {} as Parameters<typeof POST_products_metadata_handler>[1],
      { type: 'price-groups' }
    );

    expect(priceGroupsInsertOneMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceGroupId: 'BASE',
        type: 'dependent',
      })
    );
  });

  it('reads price-groups from mongo collections', async () => {
    const priceGroupsToArrayMock = vi.fn().mockResolvedValue([
      {
        id: 'pg-mongo-1',
        groupId: 'PLN',
        name: 'Polish Group',
        currencyId: 'PLN',
        type: 'standard',
        sourceGroupId: null,
      },
    ]);
    const currenciesToArrayMock = vi.fn().mockResolvedValue([
      {
        id: 'PLN',
        code: 'PLN',
        name: 'Polish Zloty',
        symbol: 'zł',
      },
    ]);

    getMongoDbMock.mockResolvedValue(
      createMongoMock({
        price_groups: {
          find: vi.fn(() => ({
            sort: vi.fn(() => ({
              skip: vi.fn(() => ({
                limit: vi.fn(() => ({
                  toArray: priceGroupsToArrayMock,
                })),
              })),
            })),
          })),
        },
        currencies: {
          find: vi.fn(() => ({
            toArray: currenciesToArrayMock,
          })),
        },
      })
    );

    const response = await GET_products_metadata_handler(
      new NextRequest('http://localhost/api/v2/products/metadata/price-groups'),
      {} as Parameters<typeof GET_products_metadata_handler>[1],
      { type: 'price-groups' }
    );

    const payload = (await response.json()) as Array<Record<string, unknown>>;
    expect(payload).toHaveLength(1);
    expect(payload[0]?.['id']).toBe('pg-mongo-1');
    expect(payload[0]?.['currencyCode']).toBe('PLN');
    expect(payload[0]?.['type']).toBe('standard');
    expect(payload[0]?.['groupType']).toBeUndefined();
  });
});
