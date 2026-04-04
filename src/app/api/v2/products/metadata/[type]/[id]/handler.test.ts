import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/features/products/server', () => ({
  getProducerRepository: vi.fn(),
  getTagRepository: vi.fn(),
  getParameterRepository: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: (...args: unknown[]) => getMongoDbMock(...args),
}));

import {
  GET_products_metadata_id_handler,
  DELETE_products_metadata_id_handler,
  PUT_products_metadata_id_handler,
} from './handler';

describe('product metadata by-type and id handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates a price group and returns canonical currency fields', async () => {
    const priceGroupDoc = {
      id: 'pg-1',
      groupId: 'PLN',
      name: 'Polish Group',
      currencyId: 'PLN',
      type: 'standard',
      sourceGroupId: null,
      basePriceField: 'price',
      isDefault: false,
      priceMultiplier: 1,
      addToPrice: 0,
      createdAt: new Date('2026-04-04T00:00:00.000Z'),
      updatedAt: new Date('2026-04-04T00:00:00.000Z'),
    };
    const updatedPriceGroupDoc = {
      ...priceGroupDoc,
      groupId: 'EUR_RETAIL',
      name: 'Euro Group',
      currencyId: 'EUR',
      type: 'dependent',
      sourceGroupId: 'base-group',
      basePriceField: 'retailPrice',
      isDefault: true,
      priceMultiplier: 1.5,
      addToPrice: 9,
      updatedAt: new Date('2026-04-04T00:00:05.000Z'),
    };

    const priceGroupsFindOneMock = vi
      .fn()
      .mockResolvedValueOnce(priceGroupDoc)
      .mockResolvedValueOnce({
        id: 'base-group',
        groupId: 'PLN_BASE',
        sourceGroupId: null,
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(updatedPriceGroupDoc);
    const priceGroupsUpdateOneMock = vi.fn().mockResolvedValue({ acknowledged: true });
    const currenciesFindOneMock = vi
      .fn()
      .mockResolvedValueOnce({
        id: 'EUR',
        code: 'EUR',
        name: 'Euro',
        symbol: 'EUR',
      })
      .mockResolvedValueOnce({
        id: 'EUR',
        code: 'EUR',
        name: 'Euro',
        symbol: 'EUR',
      });

    getMongoDbMock.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'price_groups') {
          return {
            findOne: priceGroupsFindOneMock,
            updateOne: priceGroupsUpdateOneMock,
          };
        }
        if (name === 'currencies') {
          return {
            findOne: currenciesFindOneMock,
          };
        }
        throw new Error(`Unexpected collection: ${name}`);
      },
    });

    const response = await PUT_products_metadata_id_handler(
      new NextRequest('http://localhost/api/v2/products/metadata/price-groups/pg-1', {
        method: 'PUT',
        body: JSON.stringify({
          currencyCode: ' eur ',
          groupId: 'EUR_RETAIL',
          name: 'Euro Group',
          description: 'Retail euro group',
          isDefault: true,
          sourceGroupId: 'base-group',
          type: 'dependent',
          basePriceField: 'retailPrice',
          priceMultiplier: '1.5',
          addToPrice: '9.9',
        }),
      }),
      {} as never,
      { type: 'price-groups', id: 'pg-1' }
    );

    expect(priceGroupsUpdateOneMock).toHaveBeenCalledWith(
      {
        $or: [{ id: 'pg-1' }, { groupId: 'pg-1' }],
      },
      {
        $set: expect.objectContaining({
          currencyId: 'EUR',
          groupId: 'EUR_RETAIL',
          name: 'Euro Group',
          description: 'Retail euro group',
          isDefault: true,
          sourceGroupId: 'base-group',
          type: 'dependent',
          basePriceField: 'retailPrice',
          priceMultiplier: 1.5,
          addToPrice: 9,
        }),
      }
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 'pg-1',
      groupId: 'EUR_RETAIL',
      currencyCode: 'EUR',
      type: 'dependent',
      sourceGroupId: 'base-group',
      addToPrice: 9,
    });
  });

  it('canonicalizes legacy sourceGroupId values when reading a price group', async () => {
    const priceGroupsFindOneMock = vi
      .fn()
      .mockResolvedValueOnce({
        id: 'pg-eur',
        groupId: 'EUR_RETAIL',
        name: 'Euro Retail',
        currencyId: 'EUR',
        type: 'dependent',
        sourceGroupId: 'PLN_STANDARD',
        basePriceField: 'price',
        isDefault: false,
        priceMultiplier: 1,
        addToPrice: 0,
      })
      .mockResolvedValueOnce({
        id: 'pg-base',
        groupId: 'PLN_STANDARD',
        sourceGroupId: null,
      });

    getMongoDbMock.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'price_groups') {
          return {
            findOne: priceGroupsFindOneMock,
          };
        }
        if (name === 'currencies') {
          return {
            findOne: vi.fn().mockResolvedValue({
              id: 'EUR',
              code: 'EUR',
              name: 'Euro',
              symbol: 'EUR',
            }),
          };
        }
        throw new Error(`Unexpected collection: ${name}`);
      },
    });

    const response = await GET_products_metadata_id_handler(
      new NextRequest('http://localhost/api/v2/products/metadata/price-groups/pg-eur'),
      {} as never,
      { type: 'price-groups', id: 'pg-eur' }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 'pg-eur',
      sourceGroupId: 'pg-base',
      type: 'dependent',
    });
  });

  it('normalizes a submitted legacy sourceGroupId to the canonical internal id before writing', async () => {
    const priceGroupDoc = {
      id: 'pg-1',
      groupId: 'EUR_STANDARD',
      name: 'Euro Group',
      currencyId: 'EUR',
      type: 'standard',
      sourceGroupId: null,
      basePriceField: 'price',
      isDefault: false,
      priceMultiplier: 1,
      addToPrice: 0,
      createdAt: new Date('2026-04-04T00:00:00.000Z'),
      updatedAt: new Date('2026-04-04T00:00:00.000Z'),
    };
    const updatedPriceGroupDoc = {
      ...priceGroupDoc,
      type: 'dependent',
      sourceGroupId: 'pg-base',
    };

    const priceGroupsFindOneMock = vi
      .fn()
      .mockResolvedValueOnce(priceGroupDoc)
      .mockResolvedValueOnce({
        id: 'pg-base',
        groupId: 'PLN_STANDARD',
        sourceGroupId: null,
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(updatedPriceGroupDoc);
    const priceGroupsUpdateOneMock = vi.fn().mockResolvedValue({ acknowledged: true });

    getMongoDbMock.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'price_groups') {
          return {
            findOne: priceGroupsFindOneMock,
            updateOne: priceGroupsUpdateOneMock,
          };
        }
        if (name === 'currencies') {
          return {
            findOne: vi.fn().mockResolvedValue({
              id: 'EUR',
              code: 'EUR',
              name: 'Euro',
              symbol: 'EUR',
            }),
          };
        }
        throw new Error(`Unexpected collection: ${name}`);
      },
    });

    const response = await PUT_products_metadata_id_handler(
      new NextRequest('http://localhost/api/v2/products/metadata/price-groups/pg-1', {
        method: 'PUT',
        body: JSON.stringify({
          type: 'dependent',
          sourceGroupId: 'PLN_STANDARD',
        }),
      }),
      {} as never,
      { type: 'price-groups', id: 'pg-1' }
    );

    expect(priceGroupsUpdateOneMock).toHaveBeenCalledWith(
      {
        $or: [{ id: 'pg-1' }, { groupId: 'pg-1' }],
      },
      {
        $set: expect.objectContaining({
          sourceGroupId: 'pg-base',
          type: 'dependent',
        }),
      }
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 'pg-1',
      sourceGroupId: 'pg-base',
      type: 'dependent',
    });
  });

  it('rejects cyclic dependent price-group updates before writing', async () => {
    const priceGroupsFindOneMock = vi
      .fn()
      .mockResolvedValueOnce({
        id: 'pg-1',
        groupId: 'PLN',
        sourceGroupId: null,
      })
      .mockResolvedValueOnce({
        id: 'pg-2',
        groupId: 'EUR',
        sourceGroupId: 'pg-1',
      })
      .mockResolvedValueOnce({
        id: 'pg-2',
        groupId: 'EUR',
        sourceGroupId: 'pg-1',
      });
    const priceGroupsUpdateOneMock = vi.fn().mockResolvedValue({ acknowledged: true });

    getMongoDbMock.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'price_groups') {
          return {
            findOne: priceGroupsFindOneMock,
            updateOne: priceGroupsUpdateOneMock,
          };
        }
        if (name === 'currencies') {
          return {
            findOne: vi.fn().mockResolvedValue({
              id: 'PLN',
              code: 'PLN',
              name: 'Polish Zloty',
              symbol: 'zl',
            }),
          };
        }
        throw new Error(`Unexpected collection: ${name}`);
      },
    });

    await expect(
      PUT_products_metadata_id_handler(
        new NextRequest('http://localhost/api/v2/products/metadata/price-groups/pg-1', {
          method: 'PUT',
          body: JSON.stringify({
            type: 'dependent',
            sourceGroupId: 'pg-2',
          }),
        }),
        {} as never,
        { type: 'price-groups', id: 'pg-1' }
      )
    ).rejects.toThrow('Invalid payload. price group dependency cycle detected.');

    expect(priceGroupsUpdateOneMock).not.toHaveBeenCalled();
  });

  it('rejects cyclic dependent updates when the loop points back through groupId', async () => {
    const priceGroupsFindOneMock = vi
      .fn()
      .mockResolvedValueOnce({
        id: 'pg-1',
        groupId: 'PLN_STANDARD',
        sourceGroupId: null,
      })
      .mockResolvedValueOnce({
        id: 'pg-2',
        groupId: 'EUR_RETAIL',
        sourceGroupId: 'PLN_STANDARD',
      })
      .mockResolvedValueOnce({
        id: 'pg-2',
        groupId: 'EUR_RETAIL',
        sourceGroupId: 'PLN_STANDARD',
      });
    const priceGroupsUpdateOneMock = vi.fn().mockResolvedValue({ acknowledged: true });

    getMongoDbMock.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'price_groups') {
          return {
            findOne: priceGroupsFindOneMock,
            updateOne: priceGroupsUpdateOneMock,
          };
        }
        if (name === 'currencies') {
          return {
            findOne: vi.fn().mockResolvedValue({
              id: 'PLN',
              code: 'PLN',
              name: 'Polish Zloty',
              symbol: 'zl',
            }),
          };
        }
        throw new Error(`Unexpected collection: ${name}`);
      },
    });

    await expect(
      PUT_products_metadata_id_handler(
        new NextRequest('http://localhost/api/v2/products/metadata/price-groups/pg-1', {
          method: 'PUT',
          body: JSON.stringify({
            type: 'dependent',
            sourceGroupId: 'pg-2',
          }),
        }),
        {} as never,
        { type: 'price-groups', id: 'pg-1' }
      )
    ).rejects.toThrow('Invalid payload. price group dependency cycle detected.');

    expect(priceGroupsUpdateOneMock).not.toHaveBeenCalled();
  });

  it('deletes a price group and clears catalog/product references', async () => {
    const priceGroupsFindOneMock = vi.fn().mockResolvedValue({
      id: 'pg-1',
      groupId: 'PLN_STANDARD',
    });
    const priceGroupsDeleteOneMock = vi.fn().mockResolvedValue({ acknowledged: true });
    const priceGroupsUpdateManyMock = vi.fn().mockResolvedValue({ acknowledged: true });
    const catalogsUpdateManyMock = vi.fn().mockResolvedValue({ acknowledged: true });
    const productsUpdateManyMock = vi.fn().mockResolvedValue({ acknowledged: true });
    const productDraftsUpdateManyMock = vi.fn().mockResolvedValue({ acknowledged: true });

    getMongoDbMock.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'price_groups') {
          return {
            findOne: priceGroupsFindOneMock,
            deleteOne: priceGroupsDeleteOneMock,
            updateMany: priceGroupsUpdateManyMock,
          };
        }
        if (name === 'catalogs') {
          return {
            updateMany: catalogsUpdateManyMock,
          };
        }
        if (name === 'products') {
          return {
            updateMany: productsUpdateManyMock,
          };
        }
        if (name === 'product_drafts') {
          return {
            updateMany: productDraftsUpdateManyMock,
          };
        }
        throw new Error(`Unexpected collection: ${name}`);
      },
    });

    const response = await DELETE_products_metadata_id_handler(
      new NextRequest('http://localhost/api/v2/products/metadata/price-groups/pg-1', {
        method: 'DELETE',
      }),
      {} as never,
      { type: 'price-groups', id: 'pg-1' }
    );

    expect(priceGroupsDeleteOneMock).toHaveBeenCalledWith({
      $or: [{ id: 'pg-1' }, { groupId: 'pg-1' }],
    });
    expect(priceGroupsUpdateManyMock).toHaveBeenCalledWith(
      { sourceGroupId: { $in: ['pg-1', 'PLN_STANDARD'] } },
      expect.objectContaining({
        $set: expect.objectContaining({ sourceGroupId: null }),
      })
    );
    expect(catalogsUpdateManyMock).toHaveBeenNthCalledWith(
      1,
      { priceGroupIds: { $in: ['pg-1', 'PLN_STANDARD'] } },
      expect.objectContaining({
        $pull: { priceGroupIds: { $in: ['pg-1', 'PLN_STANDARD'] } },
      })
    );
    expect(catalogsUpdateManyMock).toHaveBeenNthCalledWith(
      2,
      { defaultPriceGroupId: { $in: ['pg-1', 'PLN_STANDARD'] } },
      expect.objectContaining({
        $set: expect.objectContaining({ defaultPriceGroupId: null }),
      })
    );
    expect(productsUpdateManyMock).toHaveBeenCalledWith(
      { defaultPriceGroupId: { $in: ['pg-1', 'PLN_STANDARD'] } },
      expect.objectContaining({
        $set: expect.objectContaining({ defaultPriceGroupId: null }),
      })
    );
    expect(productDraftsUpdateManyMock).toHaveBeenCalledWith(
      { defaultPriceGroupId: { $in: ['pg-1', 'PLN_STANDARD'] } },
      expect.objectContaining({
        $set: expect.objectContaining({ defaultPriceGroupId: null }),
      })
    );
    expect(response.status).toBe(204);
  });
});
