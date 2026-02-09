import { ObjectId } from 'mongodb';

import type { 
  CategoryRepository, 
  CategoryFilters 
} from '@/features/products/types/services/category-repository';
import type { 
  CreateProductCategoryDto, 
  UpdateProductCategoryDto 
} from '@/shared/dtos';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { 
  ProductCategory, 
  ProductCategoryWithChildren 
} from '@/shared/types/domain/products';

import type { AnyBulkWriteOperation, Filter, UpdateFilter, Document } from 'mongodb';

const COLLECTION = 'product_categories';

interface ProductCategoryDoc extends Document {
  _id: ObjectId;
  name: string;
  description: string | null;
  color: string | null;
  parentId: ObjectId | null;
  catalogId: string;
  sortIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

const toObjectId = (id: string | null | undefined): ObjectId | null =>
  id ? new ObjectId(id) : null;

const compareBySortIndexThenName = (
  a: { sortIndex: number; name: string },
  b: { sortIndex: number; name: string }
): number => {
  if (a.sortIndex !== b.sortIndex) return a.sortIndex - b.sortIndex;
  return a.name.localeCompare(b.name);
};

const normalizeSiblingOrder = async (
  catalogId: string,
  parentId: string | null
): Promise<void> => {
  const db = await getMongoDb();
  const parentObjectId = toObjectId(parentId);
  const siblings = await db
    .collection<ProductCategoryDoc>(COLLECTION)
    .find({ catalogId, parentId: parentObjectId })
    .sort({ sortIndex: 1, name: 1 })
    .project<{ _id: ObjectId; sortIndex: number }>({ _id: 1, sortIndex: 1 })
    .toArray();

  const operations: AnyBulkWriteOperation<ProductCategoryDoc>[] = [];
  siblings.forEach((entry: { _id: ObjectId; sortIndex: number }, index: number): void => {
    if (entry.sortIndex === index) return;
    operations.push({
      updateOne: {
        filter: { _id: entry._id },
        update: { $set: { sortIndex: index, updatedAt: new Date() } },
      },
    });
  });

  if (operations.length > 0) {
    const collection = db.collection<ProductCategoryDoc>(COLLECTION);
    await collection.bulkWrite(operations);
  }
};

const reorderSiblingsForCategory = async (
  categoryId: string,
  catalogId: string,
  parentId: string | null,
  targetIndex?: number
): Promise<void> => {
  const db = await getMongoDb();
  const parentObjectId = toObjectId(parentId);
  const siblings = await db
    .collection<ProductCategoryDoc>(COLLECTION)
    .find({ catalogId, parentId: parentObjectId })
    .sort({ sortIndex: 1, name: 1 })
    .project<{ _id: ObjectId }>({ _id: 1 })
    .toArray();

  const ids = siblings
    .map((entry: { _id: ObjectId }): string => entry._id.toString())
    .filter((id: string): boolean => id !== categoryId);
  if (targetIndex === undefined) {
    ids.push(categoryId);
  } else {
    const clampedIndex = Math.max(0, Math.min(targetIndex, ids.length));
    ids.splice(clampedIndex, 0, categoryId);
  }

  const operations = ids.map((id: string, index: number) => ({
    updateOne: {
      filter: { _id: new ObjectId(id) },
      update: { $set: { sortIndex: index, updatedAt: new Date() } },
    },
  }));

  if (operations.length > 0) {
    const collection = db.collection<ProductCategoryDoc>(COLLECTION);
    await collection.bulkWrite(operations);
  }
};

const toCategoryDomain = (doc: ProductCategoryDoc): ProductCategory => ({
  id: doc._id.toString(),
  name: doc.name,
  description: doc.description ?? null,
  color: doc.color ?? null,
  parentId: doc.parentId?.toString() ?? null,
  catalogId: doc.catalogId?.toString(),
  sortIndex: doc.sortIndex ?? 0,
  createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
  updatedAt: doc.updatedAt?.toISOString() ?? new Date().toISOString(),
});

export const mongoCategoryRepository: CategoryRepository = {
  async listCategories(filters: CategoryFilters): Promise<ProductCategory[]> {
    const db = await getMongoDb();
    const query: Filter<ProductCategoryDoc> = {};
    
    if (filters.catalogId) {
      query.catalogId = filters.catalogId;
    }
    
    if (filters.parentId !== undefined) {
      query.parentId = filters.parentId ? new ObjectId(filters.parentId) : null;
    }
    
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ] as Filter<ProductCategoryDoc>[];
    }

    const categories = await db
      .collection<ProductCategoryDoc>(COLLECTION)
      .find(query)
      .sort({ sortIndex: 1, name: 1 })
      .toArray();
    return categories.map(toCategoryDomain);
  },

  async getCategoryTree(catalogId?: string): Promise<ProductCategoryWithChildren[]> {
    const db = await getMongoDb();
    const query: Filter<ProductCategoryDoc> = catalogId ? { catalogId } : {};
    const allCategories = await db
      .collection<ProductCategoryDoc>(COLLECTION)
      .find(query)
      .sort({ sortIndex: 1, name: 1 })
      .toArray();
    
    const categoryMap = new Map<string, ProductCategoryWithChildren>();
    allCategories.forEach(cat => {
      categoryMap.set(cat._id.toString(), { ...toCategoryDomain(cat), children: [] });
    });

    const roots: ProductCategoryWithChildren[] = [];
    categoryMap.forEach(cat => {
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        categoryMap.get(cat.parentId)!.children.push(cat);
      } else {
        roots.push(cat);
      }
    });

    const sortTree = (
      nodes: ProductCategoryWithChildren[]
    ): ProductCategoryWithChildren[] =>
      nodes
        .sort((a: ProductCategoryWithChildren, b: ProductCategoryWithChildren): number => compareBySortIndexThenName(
          { sortIndex: a.sortIndex ?? 0, name: a.name },
          { sortIndex: b.sortIndex ?? 0, name: b.name }
        ))
        .map((node: ProductCategoryWithChildren): ProductCategoryWithChildren => ({
          ...node,
          children: sortTree(node.children),
        }));

    return sortTree(roots);
  },

  async getCategoryById(id: string): Promise<ProductCategory | null> {
    const db = await getMongoDb();
    const doc = await db.collection<ProductCategoryDoc>(COLLECTION).findOne({ _id: new ObjectId(id) });
    return doc ? toCategoryDomain(doc) : null;
  },

  async getCategoryWithChildren(id: string): Promise<ProductCategoryWithChildren | null> {
    const db = await getMongoDb();
    const cat = await this.getCategoryById(id);
    if (!cat) return null;

    const children = await db
      .collection<ProductCategoryDoc>(COLLECTION)
      .find({ parentId: new ObjectId(id) })
      .sort({ sortIndex: 1, name: 1 })
      .toArray();
    return {
      ...cat,
      children: children.map(toCategoryDomain).map(c => ({ ...c, children: [] })),
    };
  },

  async createCategory(data: CreateProductCategoryDto): Promise<ProductCategory> {
    const db = await getMongoDb();
    const now = new Date();
    const doc: Omit<ProductCategoryDoc, '_id'> = {
      name: data.name,
      description: data.description ?? null,
      color: data.color ?? null,
      parentId: toObjectId(data.parentId),
      catalogId: data.catalogId,
      sortIndex: data.sortIndex ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection<Omit<ProductCategoryDoc, '_id'>>(COLLECTION).insertOne(doc);
    const created = toCategoryDomain({ ...doc, _id: result.insertedId } as ProductCategoryDoc);
    await reorderSiblingsForCategory(
      created.id,
      created.catalogId,
      created.parentId ?? null,
      data.sortIndex
    );
    return created;
  },

  async updateCategory(id: string, data: UpdateProductCategoryDto): Promise<ProductCategory> {
    const db = await getMongoDb();
    const current = await db
      .collection<ProductCategoryDoc>(COLLECTION)
      .findOne({ _id: new ObjectId(id) });
    if (!current) {
      throw new Error('Category not found');
    }
    
    const set: Partial<ProductCategoryDoc> = {
      updatedAt: new Date(),
    };
    
    if (data.name !== undefined) set.name = data.name;
    if (data.description !== undefined) set.description = data.description;
    if (data.color !== undefined) set.color = data.color;
    if (data.parentId !== undefined) {
      set.parentId = toObjectId(data.parentId);
    }
    if (data.catalogId !== undefined) {
      set.catalogId = data.catalogId;
    }
    if (data.sortIndex !== undefined) {
      set.sortIndex = data.sortIndex;
    }

    const nextCatalogId = data.catalogId ?? current.catalogId;
    const nextParentId =
      data.parentId !== undefined
        ? data.parentId
        : current.parentId?.toString() ?? null;
    const movedBucket =
      nextCatalogId !== current.catalogId ||
      nextParentId !== (current.parentId?.toString() ?? null);

    await db.collection<ProductCategoryDoc>(COLLECTION).updateOne(
      { _id: new ObjectId(id) }, 
      { $set: set } as UpdateFilter<ProductCategoryDoc>
    );

    if (movedBucket) {
      await normalizeSiblingOrder(
        current.catalogId,
        current.parentId?.toString() ?? null
      );
    }
    if (data.sortIndex !== undefined || movedBucket) {
      await reorderSiblingsForCategory(id, nextCatalogId, nextParentId, data.sortIndex);
    }
    
    const updated = await this.getCategoryById(id);
    if (!updated) throw new Error('Failed to update category');
    return updated;
  },

  async deleteCategory(id: string): Promise<void> {
    const db = await getMongoDb();
    const current = await db
      .collection<ProductCategoryDoc>(COLLECTION)
      .findOne({ _id: new ObjectId(id) });
    await db.collection<ProductCategoryDoc>(COLLECTION).deleteOne({ _id: new ObjectId(id) });
    if (current) {
      await normalizeSiblingOrder(
        current.catalogId,
        current.parentId?.toString() ?? null
      );
    }
  },

  async findByName(catalogId: string, name: string, parentId: string | null = null): Promise<ProductCategory | null> {
    const db = await getMongoDb();
    const query: Filter<ProductCategoryDoc> = {
      catalogId,
      name,
      parentId: parentId ? new ObjectId(parentId) : null,
    };
    const doc = await db.collection<ProductCategoryDoc>(COLLECTION).findOne(query);
    return doc ? toCategoryDomain(doc) : null;
  },

  async isDescendant(categoryId: string, targetId: string): Promise<boolean> {
    if (categoryId === targetId) return true;
    const db = await getMongoDb();
    const children = await db
      .collection<ProductCategoryDoc>(COLLECTION)
      .find({ parentId: new ObjectId(categoryId) })
      .project<{ _id: ObjectId }>({ _id: 1 })
      .toArray();
    for (const child of children) {
      if (await this.isDescendant(child._id.toString(), targetId)) {
        return true;
      }
    }
    return false;
  },
};
