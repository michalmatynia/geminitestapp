import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  bulkWriteCloudCurrencies: vi.fn(),
  bulkWriteCloudPriceGroups: vi.fn(),
  bulkWriteLocalCurrencies: vi.fn(),
  bulkWriteLocalPriceGroups: vi.fn(),
  currencyToArray: vi.fn(),
  deleteManyCloudCurrencies: vi.fn(),
  deleteManyCloudPriceGroups: vi.fn(),
  deleteManyLocalCurrencies: vi.fn(),
  deleteManyLocalPriceGroups: vi.fn(),
  findCurrencies: vi.fn(),
  findPriceGroups: vi.fn(),
  getAllEcommerceExportDbTargetsForWrite: vi.fn(),
  getProductsMongoDb: vi.fn(),
  priceGroupToArray: vi.fn(),
  sourcePriceGroupBulkWrite: vi.fn(),
}));

vi.mock('@/shared/lib/db/product-mongo-client', () => ({
  getMongoDb: mocks.getProductsMongoDb,
}));

vi.mock('./ecommerce-product-export.config', () => ({
  getAllEcommerceExportDbTargetsForWrite: mocks.getAllEcommerceExportDbTargetsForWrite,
}));

import { syncEcommercePricingFromProductsLocalMongo } from './ecommerce-pricing-sync';

type CollectionMocks = {
  bulkWrite: typeof mocks.bulkWriteLocalCurrencies;
  deleteMany: typeof mocks.deleteManyLocalCurrencies;
};

const buildTargetDb = (collections: Record<string, CollectionMocks>) => ({
  collection: vi.fn((name: string) => collections[name]),
});

describe('syncEcommercePricingFromProductsLocalMongo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currencyToArray.mockResolvedValue([
      {
        _id: 'currency-pln',
        code: 'PLN',
        exchangeRate: 1,
        isDefault: true,
        name: 'Polish zloty',
        symbol: 'zł',
        updatedAt: new Date('2026-05-13T08:00:00.000Z'),
      },
    ]);
    mocks.priceGroupToArray.mockResolvedValue([
      {
        _id: 'price-group-pln',
        addToPrice: 7,
        basePriceField: 'sourcePrice',
        currencyCode: 'PLN',
        id: 'pln-default',
        isDefault: true,
        name: 'PLN default',
        priceMultiplier: 1.23,
        sourceGroupId: 'source-pln',
        type: 'retail',
      },
    ]);
    mocks.findCurrencies.mockReturnValue({ toArray: mocks.currencyToArray });
    mocks.findPriceGroups.mockReturnValue({ toArray: mocks.priceGroupToArray });
    mocks.getProductsMongoDb.mockResolvedValue({
      collection: vi.fn((name: string) => {
        if (name === 'currencies') return { find: mocks.findCurrencies };
        return { bulkWrite: mocks.sourcePriceGroupBulkWrite, find: mocks.findPriceGroups };
      }),
    });
    mocks.sourcePriceGroupBulkWrite.mockResolvedValue({ matchedCount: 0, modifiedCount: 0, upsertedCount: 0 });
    mocks.bulkWriteLocalCurrencies.mockResolvedValue({ matchedCount: 0, modifiedCount: 0, upsertedCount: 1 });
    mocks.bulkWriteLocalPriceGroups.mockResolvedValue({ matchedCount: 1, modifiedCount: 1, upsertedCount: 0 });
    mocks.bulkWriteCloudCurrencies.mockResolvedValue({ matchedCount: 1, modifiedCount: 0, upsertedCount: 0 });
    mocks.bulkWriteCloudPriceGroups.mockResolvedValue({ matchedCount: 1, modifiedCount: 0, upsertedCount: 0 });
    mocks.deleteManyLocalCurrencies.mockResolvedValue({ deletedCount: 1 });
    mocks.deleteManyLocalPriceGroups.mockResolvedValue({ deletedCount: 2 });
    mocks.deleteManyCloudCurrencies.mockResolvedValue({ deletedCount: 0 });
    mocks.deleteManyCloudPriceGroups.mockResolvedValue({ deletedCount: 0 });
    mocks.getAllEcommerceExportDbTargetsForWrite.mockResolvedValue([
      {
        db: buildTargetDb({
          currencies: {
            bulkWrite: mocks.bulkWriteLocalCurrencies,
            deleteMany: mocks.deleteManyLocalCurrencies,
          },
          price_groups: {
            bulkWrite: mocks.bulkWriteLocalPriceGroups,
            deleteMany: mocks.deleteManyLocalPriceGroups,
          },
        }),
        dbName: 'ecom_local',
        key: 'local',
        source: 'local',
      },
      {
        db: buildTargetDb({
          currencies: {
            bulkWrite: mocks.bulkWriteCloudCurrencies,
            deleteMany: mocks.deleteManyCloudCurrencies,
          },
          price_groups: {
            bulkWrite: mocks.bulkWriteCloudPriceGroups,
            deleteMany: mocks.deleteManyCloudPriceGroups,
          },
        }),
        dbName: 'ecom_cloud',
        key: 'cloud',
        source: 'cloud',
      },
    ]);
  });

  it('pushes local Products pricing into local and cloud ecommerce databases', async () => {
    const result = await syncEcommercePricingFromProductsLocalMongo();

    expect(mocks.getProductsMongoDb).toHaveBeenCalledWith('local');
    expect(mocks.findCurrencies).toHaveBeenCalledWith({});
    expect(mocks.findPriceGroups).toHaveBeenCalledWith({});
    const currencyOperations = mocks.bulkWriteLocalCurrencies.mock.calls[0]?.[0] as Array<{
      updateOne: { filter: { _id: string }; update: { $set: Record<string, unknown> } };
    }>;
    const priceGroupOperations = mocks.bulkWriteLocalPriceGroups.mock.calls[0]?.[0] as Array<{
      updateOne: { filter: { _id: string }; update: { $set: Record<string, unknown> } };
    }>;
    expect(currencyOperations[0]?.updateOne).toMatchObject({
      filter: { _id: 'PLN' },
      update: { $set: { code: 'PLN', source: 'geminitestapp-products', sourceCurrencyId: 'PLN' } },
    });
    expect(priceGroupOperations[0]?.updateOne).toMatchObject({
      filter: { _id: 'pln-default' },
      update: {
        $set: {
          addToPrice: 7,
          currencyCode: 'PLN',
          priceMultiplier: 1.23,
          source: 'geminitestapp-products',
          sourcePriceGroupId: 'pln-default',
        },
      },
    });
    expect(priceGroupOperations[0]?.updateOne.update.$set).not.toHaveProperty('currencyId');
    expect(priceGroupOperations[0]?.updateOne.update.$set).not.toHaveProperty('groupId');
    expect(mocks.deleteManyLocalCurrencies).toHaveBeenCalledWith({
      source: 'geminitestapp-products',
      _id: { $nin: ['PLN'] },
    });
    expect(mocks.deleteManyLocalPriceGroups).toHaveBeenCalledWith({
      source: 'geminitestapp-products',
      _id: { $nin: ['pln-default'] },
    });
    expect(result).toMatchObject({
      sourceCurrencyCount: 1,
      sourcePriceGroupCount: 1,
      targets: [
        {
          currencyCount: 1,
          dbName: 'ecom_local',
          deletedCurrencyCount: 1,
          deletedPriceGroupCount: 2,
          priceGroupCount: 1,
          source: 'local',
        },
        {
          currencyCount: 1,
          dbName: 'ecom_cloud',
          priceGroupCount: 1,
          source: 'cloud',
        },
      ],
    });
    expect(new Date(result.syncedAt).toString()).not.toBe('Invalid Date');
  });

  it('does not wipe ecommerce pricing when local Products pricing is missing', async () => {
    mocks.priceGroupToArray.mockResolvedValueOnce([]);

    await expect(syncEcommercePricingFromProductsLocalMongo()).rejects.toThrow(
      'No local Products pricing system was found to sync.'
    );
    expect(mocks.getAllEcommerceExportDbTargetsForWrite).not.toHaveBeenCalled();
    expect(mocks.deleteManyLocalCurrencies).not.toHaveBeenCalled();
    expect(mocks.deleteManyLocalPriceGroups).not.toHaveBeenCalled();
  });

  it('migrates dependent source identifiers to canonical ids before pushing', async () => {
    mocks.priceGroupToArray.mockResolvedValueOnce([
      {
        _id: 'previous-pln-object-id',
        basePriceField: 'sourcePrice',
        currencyCode: 'PLN',
        groupId: 'PLN_STANDARD',
        id: 'group-pln',
        isDefault: true,
        name: 'PLN base',
        priceMultiplier: 1,
        sourceGroupId: null,
        type: 'standard',
      },
      {
        _id: 'previous-eur-object-id',
        basePriceField: 'price',
        currencyCode: 'EUR',
        groupId: 'EUR_RETAIL',
        id: 'group-eur',
        isDefault: false,
        name: 'EUR retail',
        priceMultiplier: 0.25,
        sourceGroupId: 'PLN_STANDARD',
        type: 'dependent',
      },
    ]);

    await syncEcommercePricingFromProductsLocalMongo();

    expect(mocks.sourcePriceGroupBulkWrite).toHaveBeenCalledWith([
      {
        updateOne: {
          filter: { id: 'group-eur' },
          update: { $set: { sourceGroupId: 'group-pln' } },
        },
      },
    ], { ordered: false });
    const priceGroupOperations = mocks.bulkWriteLocalPriceGroups.mock.calls[0]?.[0] as Array<{
      updateOne: { filter: { _id: string }; update: { $set: Record<string, unknown> } };
    }>;
    const dependentOperation = priceGroupOperations.find(
      (operation) => operation.updateOne.filter._id === 'group-eur'
    );
    expect(dependentOperation?.updateOne.update.$set).toEqual(
      expect.objectContaining({
        sourceGroupId: 'group-pln',
        sourcePriceGroupId: 'group-eur',
      })
    );
    expect(dependentOperation?.updateOne.update.$set).not.toHaveProperty('currencyId');
    expect(dependentOperation?.updateOne.update.$set).not.toHaveProperty('groupId');
  });
});
