import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  bulkWriteCloud: vi.fn(),
  bulkWriteLocal: vi.fn(),
  deleteManyCloud: vi.fn(),
  deleteManyLocal: vi.fn(),
  findSourceCategories: vi.fn(),
  getAllEcommerceExportDbTargetsForWrite: vi.fn(),
  getProductsMongoDb: vi.fn(),
  sourceCategoriesSort: vi.fn(),
}));

vi.mock('@/shared/lib/db/product-mongo-client', () => ({
  getMongoDb: mocks.getProductsMongoDb,
}));

vi.mock('./ecommerce-product-export.config', () => ({
  ECOM_CATEGORIES_COLLECTION: 'product_categories',
  getAllEcommerceExportDbTargetsForWrite: mocks.getAllEcommerceExportDbTargetsForWrite,
}));

import { syncEcommerceCategoriesFromProductsLocalMongo } from './ecommerce-category-sync';

const buildTargetDb = (bulkWrite: typeof mocks.bulkWriteLocal, deleteMany: typeof mocks.deleteManyLocal) => ({
  collection: vi.fn(() => ({
    bulkWrite,
    deleteMany,
  })),
});

describe('syncEcommerceCategoriesFromProductsLocalMongo', () => {
  const previousCatalogId = process.env['ECOM_EXPORT_CATALOG_ID'];

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['ECOM_EXPORT_CATALOG_ID'] = 'catalog-mentios';
    mocks.sourceCategoriesSort.mockReturnValue({
      toArray: vi.fn(async () => [
        {
          _id: 'cat-keychains',
          catalogId: 'source-catalog',
          color: '#00ff88',
          createdAt: new Date('2026-05-01T10:00:00.000Z'),
          name: 'Keychains',
          name_en: 'Keychain Mini Dice',
          name_pl: 'Breloki',
          parentId: 'cat-accessories',
          sortIndex: 4,
          updatedAt: new Date('2026-05-02T10:00:00.000Z'),
        },
        {
          _id: 'cat-stickers',
          catalogId: 'source-catalog',
          name: 'Stickers',
          parentId: null,
          sortIndex: 5,
        },
      ]),
    });
    mocks.findSourceCategories.mockReturnValue({
      sort: mocks.sourceCategoriesSort,
    });
    mocks.getProductsMongoDb.mockResolvedValue({
      collection: vi.fn(() => ({
        find: mocks.findSourceCategories,
      })),
    });
    mocks.bulkWriteLocal.mockResolvedValue({
      matchedCount: 1,
      modifiedCount: 1,
      upsertedCount: 1,
    });
    mocks.bulkWriteCloud.mockResolvedValue({
      matchedCount: 2,
      modifiedCount: 0,
      upsertedCount: 0,
    });
    mocks.deleteManyLocal.mockResolvedValue({ deletedCount: 1 });
    mocks.deleteManyCloud.mockResolvedValue({ deletedCount: 0 });
    mocks.getAllEcommerceExportDbTargetsForWrite.mockResolvedValue([
      {
        db: buildTargetDb(mocks.bulkWriteLocal, mocks.deleteManyLocal),
        dbName: 'ecom_local',
        key: 'local',
        source: 'local',
      },
      {
        db: buildTargetDb(mocks.bulkWriteCloud, mocks.deleteManyCloud),
        dbName: 'ecom_cloud',
        key: 'cloud',
        source: 'cloud',
      },
    ]);
  });

  afterEach(() => {
    if (previousCatalogId === undefined) {
      delete process.env['ECOM_EXPORT_CATALOG_ID'];
      return;
    }
    process.env['ECOM_EXPORT_CATALOG_ID'] = previousCatalogId;
  });

  it('syncs local Products categories into local and cloud ecommerce databases', async () => {
    const result = await syncEcommerceCategoriesFromProductsLocalMongo();

    expect(mocks.getProductsMongoDb).toHaveBeenCalledWith('local');
    expect(mocks.findSourceCategories).toHaveBeenCalledWith({});
    expect(mocks.sourceCategoriesSort).toHaveBeenCalledWith({
      catalogId: 1,
      name: 1,
      parentId: 1,
      sortIndex: 1,
    });
    expect(mocks.bulkWriteLocal).toHaveBeenCalledTimes(1);
    expect(mocks.bulkWriteCloud).toHaveBeenCalledTimes(1);
    const localOperations = mocks.bulkWriteLocal.mock.calls[0]?.[0] as Array<{
      updateOne: {
        filter: { _id: string };
        update: { $set: Record<string, unknown>; $setOnInsert: Record<string, unknown> };
        upsert: boolean;
      };
    }>;
    expect(localOperations).toHaveLength(2);
    expect(localOperations[0]?.updateOne).toMatchObject({
      filter: { _id: 'cat-keychains' },
      upsert: true,
      update: {
        $set: {
          catalogId: 'catalog-mentios',
          collectionSlug: 'accessories',
          name: 'Keychain Mini Dice',
          name_pl: 'Breloki',
          parentId: 'cat-accessories',
          source: 'geminitestapp-products',
          sourceCategoryId: 'cat-keychains',
        },
      },
    });
    expect(localOperations[0]?.updateOne.update.$set).not.toHaveProperty('_id');
    expect(mocks.deleteManyLocal).toHaveBeenCalledWith({
      source: 'geminitestapp-products',
      _id: { $nin: ['cat-keychains', 'cat-stickers'] },
    });
    expect(result).toMatchObject({
      sourceCategoryCount: 2,
      targets: [
        {
          categoryCount: 2,
          dbName: 'ecom_local',
          deletedCount: 1,
          matchedCount: 1,
          modifiedCount: 1,
          source: 'local',
          upsertedCount: 1,
        },
        {
          categoryCount: 2,
          dbName: 'ecom_cloud',
          deletedCount: 0,
          matchedCount: 2,
          modifiedCount: 0,
          source: 'cloud',
          upsertedCount: 0,
        },
      ],
    });
    expect(new Date(result.syncedAt).toString()).not.toBe('Invalid Date');
  });

  it('does not wipe ecommerce categories when no local Products categories exist', async () => {
    mocks.sourceCategoriesSort.mockReturnValueOnce({
      toArray: vi.fn(async () => []),
    });

    await expect(syncEcommerceCategoriesFromProductsLocalMongo()).rejects.toThrow(
      'No local Products categories were found to sync.'
    );
    expect(mocks.getAllEcommerceExportDbTargetsForWrite).not.toHaveBeenCalled();
    expect(mocks.deleteManyLocal).not.toHaveBeenCalled();
  });
});
