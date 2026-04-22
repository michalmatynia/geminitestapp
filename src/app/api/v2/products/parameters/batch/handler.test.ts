import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  getMongoDbMock,
  deleteManyMock,
  productsUpdateManyMock,
  productDraftsUpdateManyMock,
  toArrayMock,
} = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
  deleteManyMock: vi.fn(),
  productsUpdateManyMock: vi.fn(),
  productDraftsUpdateManyMock: vi.fn(),
  toArrayMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: (...args: unknown[]) => getMongoDbMock(...args),
}));

import { postHandler } from './handler';

describe('products parameters batch handler', () => {
  beforeEach(() => {
    getMongoDbMock.mockReset();
    deleteManyMock.mockReset();
    productsUpdateManyMock.mockReset();
    productDraftsUpdateManyMock.mockReset();
    toArrayMock.mockReset();

    deleteManyMock.mockResolvedValue({ deletedCount: 2 });
    productsUpdateManyMock.mockResolvedValue({ modifiedCount: 1 });
    productDraftsUpdateManyMock.mockResolvedValue({ modifiedCount: 2 });
    toArrayMock.mockResolvedValue([
      { id: 'param-1', _id: 'mongo-1' },
      { id: 'param-2', _id: 'mongo-2' },
    ]);

    getMongoDbMock.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'product_parameters') {
          return {
            find: () => ({
              project: () => ({
                toArray: toArrayMock,
              }),
            }),
            deleteMany: deleteManyMock,
          };
        }
        if (name === 'products') {
          return { updateMany: productsUpdateManyMock };
        }
        if (name === 'product_drafts') {
          return { updateMany: productDraftsUpdateManyMock };
        }
        throw new Error(`Unexpected collection: ${name}`);
      },
    });
  });

  it('deletes canonical ids and removes parameters from products and drafts', async () => {
    const response = await postHandler(
      new NextRequest('http://localhost/api/v2/products/parameters/batch'),
      {
        body: {
          parameterIds: ['param-1', 'param-2'],
        },
      } as ApiHandlerContext
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'ok',
      requested: 2,
      found: 2,
      deleted: 2,
      removedProducts: 1,
      removedProductDrafts: 2,
      invalidIds: [],
    });
    expect(deleteManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([
          { _id: 'param-1' },
          { id: 'param-1' },
          { _id: 'param-2' },
          { id: 'param-2' },
        ]),
      })
    );
    expect(productsUpdateManyMock).toHaveBeenCalledWith(
      { 'parameters.parameterId': { $in: ['param-1', 'param-2'] } },
      {
        $pull: {
          parameters: {
            parameterId: { $in: ['param-1', 'param-2'] },
          },
        },
      }
    );
    expect(productDraftsUpdateManyMock).toHaveBeenCalledWith(
      { 'parameters.parameterId': { $in: ['param-1', 'param-2'] } },
      {
        $pull: {
          parameters: {
            parameterId: { $in: ['param-1', 'param-2'] },
          },
        },
      }
    );
  });

  it('removes string and ObjectId matches from products when parameter ids are ObjectId-like', async () => {
    toArrayMock.mockResolvedValueOnce([
      { id: 'param-object', _id: 'mongo-object-id' },
      { id: undefined, _id: new ObjectId('0000000000000000000000ff') },
    ]);

    await postHandler(
      new NextRequest('http://localhost/api/v2/products/parameters/batch'),
      {
        body: {
          parameterIds: ['param-object', '0000000000000000000000ff'],
        },
      } as ApiHandlerContext
    );

    expect(deleteManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([
          { _id: 'param-object' },
          { id: 'param-object' },
          { _id: new ObjectId('0000000000000000000000ff') },
          { id: '0000000000000000000000ff' },
        ]),
      })
    );
    expect(productsUpdateManyMock).toHaveBeenCalledWith(
      {
        'parameters.parameterId': {
          $in: ['param-object', '0000000000000000000000ff', new ObjectId('0000000000000000000000ff')],
        },
      },
      {
        $pull: {
          parameters: {
            parameterId: {
              $in: ['param-object', '0000000000000000000000ff', new ObjectId('0000000000000000000000ff')],
            },
          },
        },
      }
    );
    expect(productDraftsUpdateManyMock).toHaveBeenCalledWith(
      {
        'parameters.parameterId': {
          $in: ['param-object', '0000000000000000000000ff', new ObjectId('0000000000000000000000ff')],
        },
      },
      {
        $pull: {
          parameters: {
            parameterId: {
              $in: ['param-object', '0000000000000000000000ff', new ObjectId('0000000000000000000000ff')],
            },
          },
        },
      }
    );
  });

  it('returns invalidIds when some parameterIds are not found', async () => {
    toArrayMock.mockResolvedValueOnce([{ id: 'param-1', _id: 'mongo-1' }]);
    deleteManyMock.mockResolvedValueOnce({ deletedCount: 1 });

    const response = await postHandler(
      new NextRequest('http://localhost/api/v2/products/parameters/batch'),
      {
        body: {
          parameterIds: ['param-1', 'missing-1'],
        },
      } as ApiHandlerContext
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        requested: 2,
        found: 1,
        deleted: 1,
        invalidIds: ['missing-1'],
      })
    );
  });

  it('throws when no matching parameters are found', async () => {
    toArrayMock.mockResolvedValueOnce([]);

    await expect(
      postHandler(
        new NextRequest('http://localhost/api/v2/products/parameters/batch'),
        {
          body: {
            parameterIds: ['missing-1'],
          },
        } as ApiHandlerContext
      )
    ).rejects.toThrow('No matching parameters found');
    expect(deleteManyMock).not.toHaveBeenCalled();
  });
});
