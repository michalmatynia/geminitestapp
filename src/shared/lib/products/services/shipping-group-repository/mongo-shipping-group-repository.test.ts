/**
 * @vitest-environment node
 */

import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getMongoDb: vi.fn(),
  shippingGroupDeleteOne: vi.fn(),
  shippingGroupFind: vi.fn(),
  shippingGroupFindOne: vi.fn(),
  shippingGroupInsertOne: vi.fn(),
  shippingGroupLimit: vi.fn(),
  shippingGroupSkip: vi.fn(),
  shippingGroupSort: vi.fn(),
  shippingGroupToArray: vi.fn(),
  shippingGroupUpdateOne: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

import { mongoShippingGroupRepository } from './mongo-shipping-group-repository';

type CursorLike = {
  limit: typeof mocks.shippingGroupLimit;
  skip: typeof mocks.shippingGroupSkip;
  sort: typeof mocks.shippingGroupSort;
  toArray: typeof mocks.shippingGroupToArray;
};

describe('mongo-shipping-group-repository', () => {
  beforeEach(() => {
    const cursor: CursorLike = {
      limit: mocks.shippingGroupLimit,
      skip: mocks.shippingGroupSkip,
      sort: mocks.shippingGroupSort,
      toArray: mocks.shippingGroupToArray,
    };

    mocks.shippingGroupDeleteOne.mockReset();
    mocks.shippingGroupDeleteOne.mockResolvedValue({ deletedCount: 1 });
    mocks.shippingGroupFind.mockReset().mockReturnValue(cursor);
    mocks.shippingGroupFindOne.mockReset();
    mocks.shippingGroupInsertOne.mockReset();
    mocks.shippingGroupLimit.mockReset().mockReturnValue(cursor);
    mocks.shippingGroupSkip.mockReset().mockReturnValue(cursor);
    mocks.shippingGroupSort.mockReset().mockReturnValue(cursor);
    mocks.shippingGroupToArray.mockReset();
    mocks.shippingGroupUpdateOne.mockReset();
    mocks.getMongoDb.mockReset().mockResolvedValue({
      collection: (name: string) => {
        if (name !== 'product_shipping_groups') return {};
        return {
          deleteOne: mocks.shippingGroupDeleteOne,
          find: mocks.shippingGroupFind,
          findOne: mocks.shippingGroupFindOne,
          insertOne: mocks.shippingGroupInsertOne,
          updateOne: mocks.shippingGroupUpdateOne,
        };
      },
    });
  });

  it('lists shipping groups with catalog and search filters plus skip and limit', async () => {
    const now = new Date('2026-04-02T18:00:00.000Z');
    mocks.shippingGroupToArray.mockResolvedValueOnce([
      {
        _id: new ObjectId('507f1f77bcf86cd799439041'),
        name: 'Small Items',
        description: 'Small parcel products',
        catalogId: 'catalog-1',
        traderaShippingCondition: 'Buyer pays shipping',
        traderaShippingPriceEur: 5,
        autoAssignCategoryIds: [],
        autoAssignCurrencyCodes: [' eur ', 'SEK'],
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const result = await mongoShippingGroupRepository.listShippingGroups({
      catalogId: 'catalog-1',
      search: 'small',
      skip: 2,
      limit: 5,
    });

    expect(mocks.shippingGroupFind).toHaveBeenCalledWith({
      catalogId: 'catalog-1',
      name: { $regex: 'small', $options: 'i' },
    });
    expect(mocks.shippingGroupSort).toHaveBeenCalledWith({ name: 1 });
    expect(mocks.shippingGroupSkip).toHaveBeenCalledWith(2);
    expect(mocks.shippingGroupLimit).toHaveBeenCalledWith(5);
    expect(result).toEqual([
      expect.objectContaining({
        id: '507f1f77bcf86cd799439041',
        name: 'Small Items',
        catalogId: 'catalog-1',
        traderaShippingCondition: 'Buyer pays shipping',
        traderaShippingPriceEur: 5,
        autoAssignCategoryIds: [],
        autoAssignCurrencyCodes: ['EUR', 'SEK'],
      }),
    ]);
  });

  it('supports get by id, create, update, delete, and find by name', async () => {
    const shippingGroupId = new ObjectId('507f1f77bcf86cd799439042');
    const now = new Date('2026-04-02T18:15:00.000Z');

    mocks.shippingGroupFindOne
      .mockResolvedValueOnce({
        _id: shippingGroupId,
        name: 'Small Items',
        description: null,
        catalogId: 'catalog-1',
        traderaShippingCondition: 'Buyer pays shipping',
        traderaShippingPriceEur: 5,
        autoAssignCategoryIds: [],
        autoAssignCurrencyCodes: [' eur '],
        createdAt: now,
        updatedAt: now,
      })
      .mockResolvedValueOnce({
        _id: shippingGroupId,
        name: 'Large Items',
        description: 'Bigger parcel products',
        catalogId: 'catalog-1',
        traderaShippingCondition: 'Seller pays shipping',
        traderaShippingPriceEur: 20,
        autoAssignCategoryIds: [],
        autoAssignCurrencyCodes: ['SEK'],
        createdAt: now,
        updatedAt: now,
      })
      .mockResolvedValueOnce({
        _id: shippingGroupId,
        name: 'Large Items',
        description: 'Bigger parcel products',
        catalogId: 'catalog-1',
        traderaShippingCondition: 'Seller pays shipping',
        traderaShippingPriceEur: 20,
        autoAssignCategoryIds: [],
        autoAssignCurrencyCodes: ['SEK'],
        createdAt: now,
        updatedAt: now,
      });
    mocks.shippingGroupInsertOne.mockResolvedValueOnce({ insertedId: shippingGroupId });

    vi.useFakeTimers();
    vi.setSystemTime(now);

    const found = await mongoShippingGroupRepository.getShippingGroupById(
      shippingGroupId.toString()
    );
    const created = await mongoShippingGroupRepository.createShippingGroup({
      name: 'Small Items',
      description: null,
      catalogId: 'catalog-1',
      traderaShippingCondition: 'Buyer pays shipping',
      traderaShippingPriceEur: 5,
      autoAssignCategoryIds: [],
      autoAssignCurrencyCodes: [' eur ', 'SEK'],
    });
    const updated = await mongoShippingGroupRepository.updateShippingGroup(
      shippingGroupId.toString(),
      {
        name: 'Large Items',
        description: 'Bigger parcel products',
        traderaShippingCondition: 'Seller pays shipping',
        traderaShippingPriceEur: 20,
        autoAssignCurrencyCodes: [' sek '],
      }
    );
    const byName = await mongoShippingGroupRepository.findByName('catalog-1', 'Large Items');
    await mongoShippingGroupRepository.deleteShippingGroup(shippingGroupId.toString());

    vi.useRealTimers();

    expect(found?.id).toBe(shippingGroupId.toString());
    expect(mocks.shippingGroupInsertOne).toHaveBeenCalledWith({
      name: 'Small Items',
      description: null,
      catalogId: 'catalog-1',
      traderaShippingCondition: 'Buyer pays shipping',
      traderaShippingPriceEur: 5,
      autoAssignCategoryIds: [],
      autoAssignCurrencyCodes: ['EUR', 'SEK'],
      createdAt: now,
      updatedAt: now,
    });
    expect(created.id).toBe(shippingGroupId.toString());
    expect(mocks.shippingGroupUpdateOne).toHaveBeenCalledWith(
      { _id: expect.any(ObjectId) },
      {
        $set: {
          name: 'Large Items',
          description: 'Bigger parcel products',
          traderaShippingCondition: 'Seller pays shipping',
          traderaShippingPriceEur: 20,
          autoAssignCurrencyCodes: ['SEK'],
          updatedAt: now,
        },
      }
    );
    expect(updated.name).toBe('Large Items');
    expect(updated.autoAssignCurrencyCodes).toEqual(['SEK']);
    expect(mocks.shippingGroupFindOne).toHaveBeenLastCalledWith({
      catalogId: 'catalog-1',
      name: 'Large Items',
    });
    expect(byName?.id).toBe(shippingGroupId.toString());
    expect(mocks.shippingGroupDeleteOne).toHaveBeenCalledWith({ _id: expect.any(ObjectId) });
  });

  it('throws an internal error when the updated shipping group cannot be reloaded', async () => {
    const shippingGroupId = new ObjectId('507f1f77bcf86cd799439043');

    mocks.shippingGroupUpdateOne.mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 });
    mocks.shippingGroupFindOne.mockResolvedValueOnce(null);

    await expect(
      mongoShippingGroupRepository.updateShippingGroup(shippingGroupId.toString(), {
        name: 'Missing',
      })
    ).rejects.toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update shipping group',
    });
  });

  it('supports legacy string ids when loading, updating, and deleting shipping groups', async () => {
    const shippingGroupId = 'legacy-shipping-group';
    const now = new Date('2026-04-02T18:30:00.000Z');

    mocks.shippingGroupFindOne
      .mockResolvedValueOnce({
        _id: shippingGroupId,
        name: 'Legacy Group',
        description: null,
        catalogId: 'catalog-1',
        traderaShippingCondition: 'Buyer pays shipping',
        traderaShippingPriceEur: 5,
        autoAssignCategoryIds: [],
        autoAssignCurrencyCodes: [],
        createdAt: now,
        updatedAt: now,
      })
      .mockResolvedValueOnce({
        _id: shippingGroupId,
        name: 'Legacy Group Updated',
        description: null,
        catalogId: 'catalog-1',
        traderaShippingCondition: 'Buyer pays shipping',
        traderaShippingPriceEur: 5,
        autoAssignCategoryIds: [],
        autoAssignCurrencyCodes: [],
        createdAt: now,
        updatedAt: now,
      });

    const found = await mongoShippingGroupRepository.getShippingGroupById(shippingGroupId);
    const updated = await mongoShippingGroupRepository.updateShippingGroup(shippingGroupId, {
      name: 'Legacy Group Updated',
    });
    await mongoShippingGroupRepository.deleteShippingGroup(shippingGroupId);

    expect(found?.id).toBe(shippingGroupId);
    expect(mocks.shippingGroupFindOne).toHaveBeenNthCalledWith(1, { _id: shippingGroupId });
    expect(mocks.shippingGroupUpdateOne).toHaveBeenCalledWith(
      { _id: shippingGroupId },
      {
        $set: expect.objectContaining({
          name: 'Legacy Group Updated',
        }),
      }
    );
    expect(updated.id).toBe(shippingGroupId);
    expect(mocks.shippingGroupDeleteOne).toHaveBeenCalledWith({ _id: shippingGroupId });
  });

  it('throws not found when deleting a shipping group that does not exist', async () => {
    mocks.shippingGroupDeleteOne.mockResolvedValueOnce({ deletedCount: 0 });

    await expect(
      mongoShippingGroupRepository.deleteShippingGroup('missing-shipping-group')
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Shipping group not found',
    });
  });
});
