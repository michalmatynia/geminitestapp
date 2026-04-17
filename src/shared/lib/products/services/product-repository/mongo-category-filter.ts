import type { Document, Filter, ObjectId } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { ProductDocument } from './mongo-product-repository-mappers';
import { buildLookupValues, normalizeLookupId } from './mongo-product-repository.helpers';

const PRODUCT_CATEGORY_COLLECTION = 'product_categories';

type ProductCategoryFilterDocument = Document & {
  _id: ObjectId | string;
  parentId?: ObjectId | string | null;
  catalogId?: ObjectId | string | null;
};

const resolveCategoryDescendantIdsFromDocs = (
  rootId: string,
  docs: ProductCategoryFilterDocument[]
): string[] => {
  const childrenByParentId = new Map<string, string[]>();
  docs.forEach((doc): void => {
    const id = normalizeLookupId(doc._id);
    const parentId = normalizeLookupId(doc.parentId);
    if (id.length === 0 || parentId.length === 0 || id === parentId) return;
    childrenByParentId.set(parentId, [...(childrenByParentId.get(parentId) ?? []), id]);
  });

  const ids: string[] = [];
  const queue = [rootId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (currentId === undefined || currentId.length === 0 || visited.has(currentId)) continue;
    visited.add(currentId);
    ids.push(currentId);
    queue.push(...(childrenByParentId.get(currentId) ?? []));
  }

  return ids;
};

export const resolveCategoryFilterIds = async (categoryId: string): Promise<string[]> => {
  const normalizedCategoryId = categoryId.trim();
  if (normalizedCategoryId.length === 0) return [];

  const db = await getMongoDb();
  const collection = db.collection<ProductCategoryFilterDocument>(PRODUCT_CATEGORY_COLLECTION);
  const root = await collection.findOne(
    { _id: { $in: buildLookupValues([normalizedCategoryId]) } },
    { projection: { _id: 1, catalogId: 1 } }
  );

  if (root === null) return [normalizedCategoryId];

  const normalizedRootId = normalizeLookupId(root._id);
  const rootId = normalizedRootId.length > 0 ? normalizedRootId : normalizedCategoryId;
  const catalogFilter =
    root.catalogId !== undefined && root.catalogId !== null
      ? { catalogId: root.catalogId }
      : {};
  const docs = await collection
    .find(catalogFilter, { projection: { _id: 1, parentId: 1, catalogId: 1 } })
    .toArray();
  const descendantIds = resolveCategoryDescendantIdsFromDocs(rootId, docs);

  return descendantIds.length > 0 ? descendantIds : [rootId];
};

const buildMongoCategoryIdFilter = (categoryIds: string[]): Filter<ProductDocument> | null => {
  if (categoryIds.length === 0) return null;
  const lookupValues = buildLookupValues(categoryIds);
  if (lookupValues.length === 0) return null;
  if (lookupValues.length === 1) {
    return { categoryId: lookupValues[0] } as unknown as Filter<ProductDocument>;
  }
  return { categoryId: { $in: lookupValues } } as unknown as Filter<ProductDocument>;
};

export const buildMongoExpandedCategoryFilter = async (
  categoryId: string
): Promise<Filter<ProductDocument> | null> =>
  buildMongoCategoryIdFilter(await resolveCategoryFilterIds(categoryId));
