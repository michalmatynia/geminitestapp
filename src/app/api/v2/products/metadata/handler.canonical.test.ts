import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { NextRequest } from 'next/server';

const {
  getProducerRepositoryMock,
  getTagRepositoryMock,
  getParameterRepositoryMock,
  getProductDataProviderMock,
  getMongoDbMock,
  listSimpleParametersMock,
  prismaMock,
} = vi.hoisted(() => ({
  getProducerRepositoryMock: vi.fn() as Mock,
  getTagRepositoryMock: vi.fn() as Mock,
  getParameterRepositoryMock: vi.fn() as Mock,
  getProductDataProviderMock: vi.fn() as Mock,
  getMongoDbMock: vi.fn() as Mock,
  listSimpleParametersMock: vi.fn() as Mock,
  prismaMock: {} as Record<string, unknown>,
}));

vi.mock('@/features/products/server', () => ({
  getProducerRepository: getProducerRepositoryMock,
  getTagRepository: getTagRepositoryMock,
  getParameterRepository: getParameterRepositoryMock,
  getProductDataProvider: getProductDataProviderMock,
}));

vi.mock('@/shared/lib/products/services/simple-parameter-service', () => ({
  listSimpleParameters: listSimpleParametersMock,
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/shared/lib/db/prisma', () => ({
  default: prismaMock,
}));

import { GET_products_metadata_handler, POST_products_metadata_handler } from './handler';

describe('v2 products metadata handler canonical contract', () => {
  beforeEach(() => {
    getProducerRepositoryMock.mockReset();
    getTagRepositoryMock.mockReset();
    getParameterRepositoryMock.mockReset();
    getProductDataProviderMock.mockReset();
    getMongoDbMock.mockReset();
    listSimpleParametersMock.mockReset();
    getProductDataProviderMock.mockResolvedValue('prisma');
    Object.keys(prismaMock).forEach((key) => {
      delete prismaMock[key];
    });
  });

  it('returns price-groups with canonical fields', async () => {
    prismaMock.priceGroup = {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'pg-1',
          groupId: 'PLN',
          name: 'Polish',
          type: 'standard',
          sourceGroupId: null,
          currencyId: 'PLN',
          currency: { code: 'PLN' },
        },
      ]),
    };

    const response = await GET_products_metadata_handler(
      new NextRequest('http://localhost/api/v2/products/metadata/price-groups'),
      {} as Parameters<typeof GET_products_metadata_handler>[1],
      { type: 'price-groups' }
    );

    const payload = (await response.json()) as Array<Record<string, unknown>>;
    expect(payload).toHaveLength(1);
    expect(payload[0]?.['currencyCode']).toBe('PLN');
    expect(payload[0]?.['type']).toBe('standard');
    expect(payload[0]?.['groupType']).toBeUndefined();
  });

  it('creates price-group from direct payload', async () => {
    const currencyFindUniqueMock = vi.fn().mockResolvedValueOnce({ id: 'PLN' });
    const priceGroupFindUniqueMock = vi.fn().mockResolvedValue(null);
    const priceGroupCreateMock = vi.fn().mockResolvedValue({
      id: 'pg-1',
      groupId: 'PLN',
      name: 'Standard',
      type: 'standard',
      sourceGroupId: null,
      currencyId: 'PLN',
      currency: { code: 'PLN' },
    });

    prismaMock.currency = {
      findUnique: currencyFindUniqueMock,
    };
    prismaMock.priceGroup = {
      findUnique: priceGroupFindUniqueMock,
      create: priceGroupCreateMock,
    };

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

    expect(priceGroupCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          groupId: 'PLN',
          name: 'Standard',
          currencyId: 'PLN',
          isDefault: true,
          type: 'standard',
        }),
      })
    );
    expect(payload['currencyCode']).toBe('PLN');
    expect(payload['type']).toBe('standard');
    expect(payload['groupType']).toBeUndefined();
  });

  it('reads price-groups from mongo provider when product provider is mongodb', async () => {
    getProductDataProviderMock.mockResolvedValue('mongodb');

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

    getMongoDbMock.mockResolvedValue({
      collection: vi.fn((name: string) => {
        if (name === 'price_groups') {
          return {
            find: vi.fn(() => ({
              sort: vi.fn(() => ({
                toArray: priceGroupsToArrayMock,
              })),
            })),
          };
        }
        if (name === 'currencies') {
          return {
            find: vi.fn(() => ({
              toArray: currenciesToArrayMock,
            })),
          };
        }
        return {
          find: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
        };
      }),
    });

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
