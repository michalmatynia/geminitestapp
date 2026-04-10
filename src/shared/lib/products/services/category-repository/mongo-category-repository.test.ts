/**
 * @vitest-environment node
 */

import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  categoryBulkWrite: vi.fn(),
  categoryDeleteMany: vi.fn(),
  categoryDeleteOne: vi.fn(),
  categoryFind: vi.fn(),
  categoryFindOne: vi.fn(),
  categoryInsertOne: vi.fn(),
  categoryProject: vi.fn(),
  categorySort: vi.fn(),
  categoryToArray: vi.fn(),
  categoryUpdateOne: vi.fn(),
  getMongoDb: vi.fn(),
  productFindOne: vi.fn(),
  shippingGroupFindOne: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

import { mongoCategoryRepository } from './mongo-category-repository';

type CursorLike = {
  project: typeof mocks.categoryProject;
  sort: typeof mocks.categorySort;
  toArray: typeof mocks.categoryToArray;
};

describe('mongo-category-repository shared-lib', () => {
  beforeEach(() => {
    const cursor: CursorLike = {
      project: mocks.categoryProject,
      sort: mocks.categorySort,
      toArray: mocks.categoryToArray,
    };

    mocks.categoryBulkWrite.mockReset();
    mocks.categoryDeleteMany.mockReset();
    mocks.categoryDeleteOne.mockReset();
    mocks.categoryFind.mockReset().mockReturnValue(cursor);
    mocks.categoryFindOne.mockReset();
    mocks.categoryInsertOne.mockReset();
    mocks.categoryProject.mockReset().mockReturnValue(cursor);
    mocks.categorySort.mockReset().mockReturnValue(cursor);
    mocks.categoryToArray.mockReset();
    mocks.categoryUpdateOne.mockReset();
    mocks.productFindOne.mockReset().mockResolvedValue(null);
    mocks.shippingGroupFindOne.mockReset().mockResolvedValue(null);
    mocks.getMongoDb.mockReset().mockResolvedValue({
      collection: (name: string) => {
        if (name === 'products') {
          return {
            findOne: mocks.productFindOne,
          };
        }
        if (name === 'product_shipping_groups') {
          return {
            findOne: mocks.shippingGroupFindOne,
          };
        }
        if (name !== 'product_categories') return {};
        return {
          bulkWrite: mocks.categoryBulkWrite,
          deleteMany: mocks.categoryDeleteMany,
          deleteOne: mocks.categoryDeleteOne,
          find: mocks.categoryFind,
          findOne: mocks.categoryFindOne,
          insertOne: mocks.categoryInsertOne,
          updateOne: mocks.categoryUpdateOne,
        };
      },
    });
  });

  it('lists categories with filters and normalizes localized names', async () => {
    const now = new Date('2026-03-25T18:30:00.000Z');
    mocks.categoryToArray.mockResolvedValueOnce([
      {
        _id: 'category-root',
        name: '  ',
        name_en: 'Alpha',
        name_pl: 'Alfa',
        name_de: null,
        description: '',
        description_en: 'Root description',
        description_pl: null,
        description_de: null,
        color: '#fff',
        parentId: 'parent-1',
        catalogId: 'catalog-1',
        sortIndex: 2,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const result = await mongoCategoryRepository.listCategories({
      catalogId: 'catalog-1',
      parentId: 'parent-1',
      search: 'alp',
    });

    expect(mocks.categoryFind).toHaveBeenCalledWith({
      $and: [
        { catalogId: 'catalog-1' },
        { parentId: 'parent-1' },
        {
          $or: [
            { name: { $regex: 'alp', $options: 'i' } },
            { name_en: { $regex: 'alp', $options: 'i' } },
            { name_pl: { $regex: 'alp', $options: 'i' } },
            { name_de: { $regex: 'alp', $options: 'i' } },
            { description: { $regex: 'alp', $options: 'i' } },
            { description_en: { $regex: 'alp', $options: 'i' } },
            { description_pl: { $regex: 'alp', $options: 'i' } },
            { description_de: { $regex: 'alp', $options: 'i' } },
          ],
        },
      ],
    });
    expect(mocks.categorySort).toHaveBeenCalledWith({ sortIndex: 1, name: 1 });
    expect(result).toEqual([
      expect.objectContaining({
        id: 'category-root',
        name: 'Alpha',
        name_en: 'Alpha',
        name_pl: 'Alfa',
        description: 'Root description',
        parentId: 'parent-1',
      }),
    ]);
  });

  it('builds sorted trees and category-with-children responses', async () => {
    const now = new Date('2026-03-25T18:45:00.000Z');
    const rootA = new ObjectId('507f1f77bcf86cd799439041');
    const rootB = new ObjectId('507f1f77bcf86cd799439042');
    const childA1 = new ObjectId('507f1f77bcf86cd799439043');
    const childA2 = new ObjectId('507f1f77bcf86cd799439044');

    mocks.categoryToArray
      .mockResolvedValueOnce([
        {
          _id: rootB,
          name: 'Bravo',
          name_en: 'Bravo',
          name_pl: null,
          name_de: null,
          description: null,
          description_en: null,
          description_pl: null,
          description_de: null,
          color: null,
          parentId: null,
          catalogId: 'catalog-1',
          sortIndex: 1,
          createdAt: now,
          updatedAt: now,
        },
        {
          _id: childA2,
          name: 'Child B',
          name_en: 'Child B',
          name_pl: null,
          name_de: null,
          description: null,
          description_en: null,
          description_pl: null,
          description_de: null,
          color: null,
          parentId: rootA,
          catalogId: 'catalog-1',
          sortIndex: 1,
          createdAt: now,
          updatedAt: now,
        },
        {
          _id: rootA,
          name: 'Alpha',
          name_en: 'Alpha',
          name_pl: null,
          name_de: null,
          description: null,
          description_en: null,
          description_pl: null,
          description_de: null,
          color: null,
          parentId: null,
          catalogId: 'catalog-1',
          sortIndex: 0,
          createdAt: now,
          updatedAt: now,
        },
        {
          _id: childA1,
          name: 'Child A',
          name_en: 'Child A',
          name_pl: null,
          name_de: null,
          description: null,
          description_en: null,
          description_pl: null,
          description_de: null,
          color: null,
          parentId: rootA,
          catalogId: 'catalog-1',
          sortIndex: 0,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .mockResolvedValueOnce([
        {
          _id: childA1,
          name: 'Child A',
          name_en: 'Child A',
          name_pl: null,
          name_de: null,
          description: null,
          description_en: null,
          description_pl: null,
          description_de: null,
          color: null,
          parentId: rootA,
          catalogId: 'catalog-1',
          sortIndex: 0,
          createdAt: now,
          updatedAt: now,
        },
      ]);
    mocks.categoryFindOne.mockResolvedValueOnce({
      _id: rootA,
      name: 'Alpha',
      name_en: 'Alpha',
      name_pl: null,
      name_de: null,
      description: null,
      description_en: null,
      description_pl: null,
      description_de: null,
      color: null,
      parentId: null,
      catalogId: 'catalog-1',
      sortIndex: 0,
      createdAt: now,
      updatedAt: now,
    });

    const tree = await mongoCategoryRepository.getCategoryTree('catalog-1');
    const withChildren = await mongoCategoryRepository.getCategoryWithChildren(rootA.toString());

    expect(tree.map((node) => node.name)).toEqual(['Alpha', 'Bravo']);
    expect(tree[0]?.children.map((node) => node.name)).toEqual(['Child A', 'Child B']);
    expect(withChildren?.children).toEqual([
      expect.objectContaining({
        id: childA1.toString(),
        children: [],
      }),
    ]);
  });

  it('creates categories with resolved parents and reorders sibling positions', async () => {
    const now = new Date('2026-03-25T19:00:00.000Z');
    const parentId = new ObjectId('507f1f77bcf86cd799439045');
    const createdId = new ObjectId('507f1f77bcf86cd799439046');
    const siblingId = new ObjectId('507f1f77bcf86cd799439047');

    mocks.categoryFindOne.mockResolvedValueOnce({ _id: parentId });
    mocks.categoryInsertOne.mockResolvedValueOnce({ insertedId: createdId });
    mocks.categoryToArray.mockResolvedValueOnce([
      { _id: siblingId, sortIndex: 0 },
      { _id: createdId, sortIndex: 0 },
    ]);

    vi.useFakeTimers();
    vi.setSystemTime(now);

    const created = await mongoCategoryRepository.createCategory({
      name: 'Created',
      description: 'Description',
      color: '#0f0',
      parentId: parentId.toString(),
      catalogId: 'catalog-1',
      sortIndex: 0,
    });

    vi.useRealTimers();

    expect(mocks.categoryInsertOne).toHaveBeenCalledWith({
      name: 'Created',
      name_en: 'Created',
      name_pl: null,
      name_de: null,
      description: 'Description',
      color: '#0f0',
      parentId,
      catalogId: 'catalog-1',
      sortIndex: 0,
      createdAt: now,
      updatedAt: now,
    });
    expect(mocks.categoryBulkWrite).toHaveBeenCalledWith([
      {
        updateOne: {
          filter: { _id: createdId },
          update: { $set: { sortIndex: 0, updatedAt: expect.any(Date) } },
        },
      },
      {
        updateOne: {
          filter: { _id: siblingId },
          update: { $set: { sortIndex: 1, updatedAt: expect.any(Date) } },
        },
      },
    ]);
    expect(created).toEqual(
      expect.objectContaining({
        id: createdId.toString(),
        name: 'Created',
        parentId: parentId.toString(),
      })
    );
  });

  it('updates categories, reorders siblings, and rejects missing categories', async () => {
    const now = new Date('2026-03-25T19:15:00.000Z');
    const categoryId = new ObjectId('507f1f77bcf86cd799439048');
    const siblingId = new ObjectId('507f1f77bcf86cd799439049');

    mocks.categoryFindOne
      .mockResolvedValueOnce({
        _id: categoryId,
        name: 'Original',
        name_en: 'Original',
        name_pl: null,
        name_de: null,
        description: null,
        description_en: null,
        description_pl: null,
        description_de: null,
        color: '#111',
        parentId: null,
        catalogId: 'catalog-1',
        sortIndex: 1,
        createdAt: now,
        updatedAt: now,
      })
      .mockResolvedValueOnce({
        _id: categoryId,
        name: 'Updated',
        name_en: 'Updated',
        name_pl: null,
        name_de: null,
        description: null,
        description_en: null,
        description_pl: null,
        description_de: null,
        color: null,
        parentId: null,
        catalogId: 'catalog-1',
        sortIndex: 0,
        createdAt: now,
        updatedAt: now,
      })
      .mockResolvedValueOnce(null);
    mocks.categoryUpdateOne.mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 });
    mocks.categoryToArray.mockResolvedValueOnce([
      { _id: siblingId, sortIndex: 0 },
      { _id: categoryId, sortIndex: 1 },
    ]);

    const updated = await mongoCategoryRepository.updateCategory(categoryId.toString(), {
      name: 'Updated',
      color: null,
      sortIndex: 0,
    });

    const [updateFilter, updateDoc] = mocks.categoryUpdateOne.mock.calls[0] as [
      { _id: ObjectId | string },
      { $set: Record<string, unknown> },
    ];
    expect(updateFilter._id.toString()).toBe(categoryId.toString());
    expect(updateDoc).toEqual({
      $set: expect.objectContaining({
        name: 'Updated',
        name_en: 'Updated',
        color: null,
        sortIndex: 0,
        updatedAt: expect.any(Date),
      }),
    });
    expect(mocks.categoryBulkWrite).toHaveBeenCalledWith([
      {
        updateOne: {
          filter: { _id: categoryId },
          update: { $set: { sortIndex: 0, updatedAt: expect.any(Date) } },
        },
      },
      {
        updateOne: {
          filter: { _id: siblingId },
          update: { $set: { sortIndex: 1, updatedAt: expect.any(Date) } },
        },
      },
    ]);
    expect(updated.name).toBe('Updated');

    await expect(
      mongoCategoryRepository.updateCategory(categoryId.toString(), {
        name: 'Missing',
      })
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Category not found',
    });
  });

  it('deletes categories, finds by name, and walks descendants recursively', async () => {
    const now = new Date('2026-03-25T19:30:00.000Z');
    const categoryId = new ObjectId('507f1f77bcf86cd799439050');
    const siblingA = new ObjectId('507f1f77bcf86cd799439051');
    const siblingB = new ObjectId('507f1f77bcf86cd799439052');
    const childId = new ObjectId('507f1f77bcf86cd799439053');
    const targetId = new ObjectId('507f1f77bcf86cd799439054');

    mocks.categoryFindOne
      .mockResolvedValueOnce({
        _id: categoryId,
        name: 'Delete Me',
        name_en: 'Delete Me',
        name_pl: null,
        name_de: null,
        description: null,
        description_en: null,
        description_pl: null,
        description_de: null,
        color: null,
        parentId: null,
        catalogId: 'catalog-1',
        sortIndex: 0,
        createdAt: now,
        updatedAt: now,
      })
      .mockResolvedValueOnce({
        _id: categoryId,
        name: 'Named',
        name_en: 'Named',
        name_pl: null,
        name_de: null,
        description: null,
        description_en: null,
        description_pl: null,
        description_de: null,
        color: null,
        parentId: null,
        catalogId: 'catalog-1',
        sortIndex: 0,
        createdAt: now,
        updatedAt: now,
      });
    mocks.categoryToArray
      .mockResolvedValueOnce([
        {
          _id: categoryId,
          name: 'Delete Me',
          name_en: 'Delete Me',
          name_pl: null,
          name_de: null,
          description: null,
          description_en: null,
          description_pl: null,
          description_de: null,
          color: null,
          parentId: null,
          catalogId: 'catalog-1',
          sortIndex: 0,
          createdAt: now,
          updatedAt: now,
        },
        {
          _id: childId,
          name: 'Delete Child',
          name_en: 'Delete Child',
          name_pl: null,
          name_de: null,
          description: null,
          description_en: null,
          description_pl: null,
          description_de: null,
          color: null,
          parentId: categoryId,
          catalogId: 'catalog-1',
          sortIndex: 0,
          createdAt: now,
          updatedAt: now,
        },
        {
          _id: siblingA,
          name: 'Sibling A',
          name_en: 'Sibling A',
          name_pl: null,
          name_de: null,
          description: null,
          description_en: null,
          description_pl: null,
          description_de: null,
          color: null,
          parentId: null,
          catalogId: 'catalog-1',
          sortIndex: 1,
          createdAt: now,
          updatedAt: now,
        },
        {
          _id: siblingB,
          name: 'Sibling B',
          name_en: 'Sibling B',
          name_pl: null,
          name_de: null,
          description: null,
          description_en: null,
          description_pl: null,
          description_de: null,
          color: null,
          parentId: null,
          catalogId: 'catalog-1',
          sortIndex: 3,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .mockResolvedValueOnce([
        { _id: siblingA, sortIndex: 1 },
        { _id: siblingB, sortIndex: 3 },
      ])
      .mockResolvedValueOnce([{ _id: childId }])
      .mockResolvedValueOnce([{ _id: targetId }]);

    await mongoCategoryRepository.deleteCategory(categoryId.toString());
    const byName = await mongoCategoryRepository.findByName('catalog-1', 'Named', null);
    const descendant = await mongoCategoryRepository.isDescendant(
      categoryId.toString(),
      targetId.toString()
    );

    const [deleteFilter] = mocks.categoryDeleteMany.mock.calls[0] as [
      { _id: { $in: Array<ObjectId | string> } },
    ];
    expect(deleteFilter._id.$in.map((entry) => entry.toString())).toEqual([
      categoryId.toString(),
      childId.toString(),
    ]);
    expect(mocks.categoryBulkWrite).toHaveBeenCalledWith([
      {
        updateOne: {
          filter: { _id: siblingA },
          update: { $set: { sortIndex: 0, updatedAt: expect.any(Date) } },
        },
      },
      {
        updateOne: {
          filter: { _id: siblingB },
          update: { $set: { sortIndex: 1, updatedAt: expect.any(Date) } },
        },
      },
    ]);
    expect(mocks.categoryFindOne).toHaveBeenLastCalledWith({
      $and: [{ catalogId: 'catalog-1' }, { name: 'Named' }, { parentId: null }],
    });
    expect(byName?.name).toBe('Named');
    expect(descendant).toBe(true);
    expect(await mongoCategoryRepository.isDescendant('same-id', 'same-id')).toBe(true);
  });

  it('blocks deleting category subtrees that are still referenced by products', async () => {
    const now = new Date('2026-03-25T19:45:00.000Z');
    const categoryId = new ObjectId('507f1f77bcf86cd799439055');
    const childId = new ObjectId('507f1f77bcf86cd799439056');

    mocks.categoryFindOne.mockResolvedValueOnce({
      _id: categoryId,
      name: 'In Use',
      name_en: 'In Use',
      name_pl: null,
      name_de: null,
      description: null,
      description_en: null,
      description_pl: null,
      description_de: null,
      color: null,
      parentId: null,
      catalogId: 'catalog-1',
      sortIndex: 0,
      createdAt: now,
      updatedAt: now,
    });
    mocks.categoryToArray.mockResolvedValueOnce([
      {
        _id: categoryId,
        name: 'In Use',
        name_en: 'In Use',
        name_pl: null,
        name_de: null,
        description: null,
        description_en: null,
        description_pl: null,
        description_de: null,
        color: null,
        parentId: null,
        catalogId: 'catalog-1',
        sortIndex: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: childId,
        name: 'In Use Child',
        name_en: 'In Use Child',
        name_pl: null,
        name_de: null,
        description: null,
        description_en: null,
        description_pl: null,
        description_de: null,
        color: null,
        parentId: categoryId,
        catalogId: 'catalog-1',
        sortIndex: 0,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    mocks.productFindOne.mockResolvedValueOnce({
      _id: 'product-1',
      id: 'product-1',
      sku: 'SKU-1',
      categoryId: childId,
    });

    await expect(mongoCategoryRepository.deleteCategory(categoryId.toString())).rejects.toMatchObject(
      {
        code: 'CONFLICT',
        message: 'Cannot delete category because it is still used by products or shipping groups.',
        meta: expect.objectContaining({
          referencedProductId: 'product-1',
          referencedProductCategoryId: childId,
          subtreeCategoryIds: [categoryId.toString(), childId.toString()],
        }),
      }
    );
    expect(mocks.productFindOne).toHaveBeenCalledWith(
      {
        categoryId: {
          $in: [categoryId.toString(), categoryId, childId.toString(), childId],
        },
      },
      expect.any(Object)
    );
    expect(mocks.categoryDeleteMany).not.toHaveBeenCalled();
  });

  it('blocks deleting category subtrees that are still referenced by shipping group rules', async () => {
    const now = new Date('2026-03-25T20:00:00.000Z');
    const categoryId = new ObjectId('507f1f77bcf86cd799439057');

    mocks.categoryFindOne.mockResolvedValueOnce({
      _id: categoryId,
      name: 'Shipping Rule Category',
      name_en: 'Shipping Rule Category',
      name_pl: null,
      name_de: null,
      description: null,
      description_en: null,
      description_pl: null,
      description_de: null,
      color: null,
      parentId: null,
      catalogId: 'catalog-1',
      sortIndex: 0,
      createdAt: now,
      updatedAt: now,
    });
    mocks.categoryToArray.mockResolvedValueOnce([
      {
        _id: categoryId,
        name: 'Shipping Rule Category',
        name_en: 'Shipping Rule Category',
        name_pl: null,
        name_de: null,
        description: null,
        description_en: null,
        description_pl: null,
        description_de: null,
        color: null,
        parentId: null,
        catalogId: 'catalog-1',
        sortIndex: 0,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    mocks.shippingGroupFindOne.mockResolvedValueOnce({
      _id: 'shipping-group-1',
      name: 'Default shipping',
      autoAssignCategoryIds: [categoryId.toString()],
    });

    await expect(mongoCategoryRepository.deleteCategory(categoryId.toString())).rejects.toMatchObject(
      {
        code: 'CONFLICT',
        message: 'Cannot delete category because it is still used by products or shipping groups.',
        meta: expect.objectContaining({
          referencedShippingGroupId: 'shipping-group-1',
          referencedShippingGroupName: 'Default shipping',
          subtreeCategoryIds: [categoryId.toString()],
        }),
      }
    );
    expect(mocks.shippingGroupFindOne).toHaveBeenCalledWith(
      {
        autoAssignCategoryIds: {
          $in: [categoryId.toString(), categoryId],
        },
      },
      expect.any(Object)
    );
    expect(mocks.categoryDeleteMany).not.toHaveBeenCalled();
  });
});
