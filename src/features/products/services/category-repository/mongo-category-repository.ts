import { ObjectId } from 'mongodb';

import type { 
  CategoryRepository, 
  CategoryFilters 
} from '@/features/products/types/services/category-repository';
import type { 
  CreateProductCategoryDto, 
  UpdateProductCategoryDto 
} from '@/shared/contracts/products';
import { internalError, notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { 
  ProductCategory, 
  ProductCategoryWithChildren 
} from '@/shared/types/domain/products';

import type { AnyBulkWriteOperation, Filter, UpdateFilter, Document } from 'mongodb';

const COLLECTION = 'product_categories';

interface ProductCategoryDoc extends Document {
  _id: ObjectId | string;
  name?: string;
  name_en?: string | null;
  name_pl?: string | null;
  name_de?: string | null;
  description?: string | null;
  description_en?: string | null;
  description_pl?: string | null;
  description_de?: string | null;
  color: string | null;
  parentId: ObjectId | string | null;
  catalogId: string;
  sortIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

const toMongoId = (id: string | null | undefined): ObjectId | string | null => {
  if (!id) return null;
  return ObjectId.isValid(id) ? new ObjectId(id) : id;
};

const buildIdFilter = (id: string): Filter<ProductCategoryDoc> => {
  const variants: Array<ObjectId | string> = [id];
  if (ObjectId.isValid(id)) {
    variants.push(new ObjectId(id));
  }
  const deduped = Array.from(new Map(variants.map((value) => [value.toString(), value])).values());
  if (deduped.length === 1) {
    return { _id: deduped[0] } as Filter<ProductCategoryDoc>;
  }
  return {
    $or: deduped.map((value) => ({ _id: value })),
  } as Filter<ProductCategoryDoc>;
};

const buildParentFilter = (parentId: string | null): Filter<ProductCategoryDoc> => {
  if (parentId === null) return { parentId: null };
  const variants: Array<ObjectId | string> = [parentId];
  if (ObjectId.isValid(parentId)) {
    variants.push(new ObjectId(parentId));
  }
  const deduped = Array.from(new Map(variants.map((value) => [value.toString(), value])).values());
  if (deduped.length === 1) {
    return { parentId: deduped[0] } as Filter<ProductCategoryDoc>;
  }
  return {
    $or: deduped.map((value) => ({ parentId: value })),
  } as Filter<ProductCategoryDoc>;
};

const resolveParentStorageId = async (
  parentId: string | null | undefined
): Promise<ObjectId | string | null | undefined> => {
  if (parentId === undefined) return undefined;
  if (parentId === null) return null;
  const db = await getMongoDb();
  const parent = await db
    .collection<ProductCategoryDoc>(COLLECTION)
    .findOne(buildIdFilter(parentId), { projection: { _id: 1 } });
  if (parent?._id !== undefined) return parent._id;
  return toMongoId(parentId);
};

const compareBySortIndexThenName = (
  a: { sortIndex: number; name: string },
  b: { sortIndex: number; name: string }
): number => {
  if (a.sortIndex !== b.sortIndex) return a.sortIndex - b.sortIndex;
  return a.name.localeCompare(b.name);
};

const toOptionalTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getPrimaryCategoryName = (doc: ProductCategoryDoc): string =>
  toOptionalTrimmedString(doc.name) ??
  toOptionalTrimmedString(doc.name_en) ??
  toOptionalTrimmedString(doc.name_pl) ??
  toOptionalTrimmedString(doc.name_de) ??
  'Unnamed category';

const normalizeSiblingOrder = async (
  catalogId: string,
  parentId: string | null
): Promise<void> => {
  const db = await getMongoDb();
  const query: Filter<ProductCategoryDoc> = {
    $and: [{ catalogId }, buildParentFilter(parentId)],
  } as Filter<ProductCategoryDoc>;
  const siblings = await db
    .collection<ProductCategoryDoc>(COLLECTION)
    .find(query)
    .sort({ sortIndex: 1, name: 1 })
    .project<{ _id: ObjectId | string; sortIndex: number }>({ _id: 1, sortIndex: 1 })
    .toArray();

  const operations: AnyBulkWriteOperation<ProductCategoryDoc>[] = [];
  siblings.forEach((entry: { _id: ObjectId | string; sortIndex: number }, index: number): void => {
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
  const collection = db.collection<ProductCategoryDoc>(COLLECTION);
  const query: Filter<ProductCategoryDoc> = {
    $and: [{ catalogId }, buildParentFilter(parentId)],
  } as Filter<ProductCategoryDoc>;
  const siblings = await db
    .collection<ProductCategoryDoc>(COLLECTION)
    .find(query)
    .sort({ sortIndex: 1, name: 1 })
    .project<{ _id: ObjectId | string }>({ _id: 1 })
    .toArray();

  const movedExisting =
    siblings.find((entry: { _id: ObjectId | string }): boolean => entry._id.toString() === categoryId)?._id ??
    (await collection.findOne(buildIdFilter(categoryId), { projection: { _id: 1 } }))?._id;
  if (!movedExisting) return;
  const entries = siblings.filter(
    (entry: { _id: ObjectId | string }): boolean => entry._id.toString() !== categoryId
  );
  if (targetIndex === undefined) {
    entries.push({ _id: movedExisting });
  } else {
    const clampedIndex = Math.max(0, Math.min(targetIndex, entries.length));
    entries.splice(clampedIndex, 0, { _id: movedExisting });
  }

  const operations = entries.map((entry: { _id: ObjectId | string }, index: number) => ({
    updateOne: {
      filter: { _id: entry._id },
      update: { $set: { sortIndex: index, updatedAt: new Date() } },
    },
  }));

  if (operations.length > 0) {
    await collection.bulkWrite(operations);
  }
};

const toCategoryDomain = (doc: ProductCategoryDoc): ProductCategory => ({
  id: doc._id.toString(),
  name: getPrimaryCategoryName(doc),
  name_en: toOptionalTrimmedString(doc.name_en) ?? toOptionalTrimmedString(doc.name),
  name_pl: toOptionalTrimmedString(doc.name_pl),
  name_de: toOptionalTrimmedString(doc.name_de),
  description:
    toOptionalTrimmedString(doc.description) ??
    toOptionalTrimmedString(doc.description_en) ??
    toOptionalTrimmedString(doc.description_pl) ??
    toOptionalTrimmedString(doc.description_de),
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
    const clauses: Filter<ProductCategoryDoc>[] = [];

    if (filters.catalogId) {
      clauses.push({ catalogId: filters.catalogId });
    }

    if (filters.parentId !== undefined) {
      clauses.push(buildParentFilter(filters.parentId ?? null));
    }

    if (filters.search) {
      clauses.push({
        $or: [
          { name: { $regex: filters.search, $options: 'i' } },
          { name_en: { $regex: filters.search, $options: 'i' } },
          { name_pl: { $regex: filters.search, $options: 'i' } },
          { name_de: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
          { description_en: { $regex: filters.search, $options: 'i' } },
          { description_pl: { $regex: filters.search, $options: 'i' } },
          { description_de: { $regex: filters.search, $options: 'i' } },
        ],
      } as Filter<ProductCategoryDoc>);
    }
    const query: Filter<ProductCategoryDoc> =
      clauses.length === 0
        ? {}
        : clauses.length === 1
          ? clauses[0]!
          : ({ $and: clauses } as Filter<ProductCategoryDoc>);

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
    const doc = await db.collection<ProductCategoryDoc>(COLLECTION).findOne(buildIdFilter(id));
    return doc ? toCategoryDomain(doc) : null;
  },

  async getCategoryWithChildren(id: string): Promise<ProductCategoryWithChildren | null> {
    const db = await getMongoDb();
    const cat = await this.getCategoryById(id);
    if (!cat) return null;

    const children = await db
      .collection<ProductCategoryDoc>(COLLECTION)
      .find(buildParentFilter(id))
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
      name_en: data.name,
      name_pl: null,
      name_de: null,
      description: data.description ?? null,
      color: data.color ?? null,
      parentId: (await resolveParentStorageId(data.parentId)) ?? null,
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
      data.sortIndex ?? undefined
    );
    return created;
  },

  async updateCategory(id: string, data: UpdateProductCategoryDto): Promise<ProductCategory> {
    const db = await getMongoDb();
    const current = await db
      .collection<ProductCategoryDoc>(COLLECTION)
      .findOne(buildIdFilter(id));
    if (!current) {
      throw notFoundError('Category not found', { categoryId: id });
    }
    
    const set: Partial<ProductCategoryDoc> = {
      updatedAt: new Date(),
    };
    
    if (data.name !== undefined) set.name = data.name;
    if (data.name !== undefined) set.name_en = data.name;
    if (data.description !== undefined) set.description = data.description;
    if (data.color !== undefined) set.color = data.color;
    if (data.parentId !== undefined) {
      set.parentId = (await resolveParentStorageId(data.parentId)) ?? null;
    }
    if (data.catalogId !== undefined) {
      set.catalogId = data.catalogId;
    }
    if (data.sortIndex !== undefined && data.sortIndex !== null) {
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
      buildIdFilter(id),
      { $set: set } as UpdateFilter<ProductCategoryDoc>
    );

    if (movedBucket) {
      await normalizeSiblingOrder(
        current.catalogId,
        current.parentId?.toString() ?? null
      );
    }
    if (data.sortIndex !== undefined || movedBucket) {
      await reorderSiblingsForCategory(id, nextCatalogId, nextParentId, data.sortIndex ?? undefined);
    }
    
    const updated = await this.getCategoryById(id);
    if (!updated) throw internalError('Failed to update category', { categoryId: id });
    return updated;
  },

  async deleteCategory(id: string): Promise<void> {
    const db = await getMongoDb();
    const current = await db
      .collection<ProductCategoryDoc>(COLLECTION)
      .findOne(buildIdFilter(id));
    await db.collection<ProductCategoryDoc>(COLLECTION).deleteOne(buildIdFilter(id));
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
      $and: [{ catalogId }, { name }, buildParentFilter(parentId)],
    } as Filter<ProductCategoryDoc>;
    const doc = await db.collection<ProductCategoryDoc>(COLLECTION).findOne(query);
    return doc ? toCategoryDomain(doc) : null;
  },

  async isDescendant(categoryId: string, targetId: string): Promise<boolean> {
    if (categoryId === targetId) return true;
    const db = await getMongoDb();
    const children = await db
      .collection<ProductCategoryDoc>(COLLECTION)
      .find(buildParentFilter(categoryId))
      .project<{ _id: ObjectId | string }>({ _id: 1 })
      .toArray();
    for (const child of children) {
      if (await this.isDescendant(child._id.toString(), targetId)) {
        return true;
      }
    }
    return false;
  },
};
