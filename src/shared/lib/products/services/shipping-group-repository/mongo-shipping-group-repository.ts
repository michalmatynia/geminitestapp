import { ObjectId } from 'mongodb';

import type { ProductShippingGroup, ProductShippingGroupCreateInput, ProductShippingGroupUpdateInput } from '@/shared/contracts/products/shipping-groups';
import type { ShippingGroupFilters, ShippingGroupRepository } from '@/shared/contracts/products/drafts';
import { internalError, notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { Document, Filter, UpdateFilter } from 'mongodb';

const COLLECTION = 'product_shipping_groups';

interface ProductShippingGroupDoc extends Document {
  _id: ObjectId | string;
  name: string;
  description: string | null;
  catalogId: string;
  traderaShippingCondition: string | null;
  traderaShippingPriceEur: number | null;
  autoAssignCategoryIds: string[];
  autoAssignCurrencyCodes: string[];
  createdAt: Date;
  updatedAt: Date;
}

const buildIdFilter = (id: string): Filter<ProductShippingGroupDoc> => {
  const variants: Array<ObjectId | string> = [id];
  if (ObjectId.isValid(id)) {
    variants.push(new ObjectId(id));
  }

  const deduped = Array.from(new Map(variants.map((value) => [value.toString(), value])).values());
  if (deduped.length === 1) {
    return { _id: deduped[0] };
  }

  return {
    $or: deduped.map((value) => ({ _id: value })),
  };
};

const normalizeCategoryIdList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  const unique = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (trimmed.length === 0) continue;
    unique.add(trimmed);
  }

  return Array.from(unique);
};

const normalizeCurrencyCodeList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  const unique = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const normalized = item.trim().toUpperCase();
    if (normalized.length === 0) continue;
    unique.add(normalized);
  }

  return Array.from(unique);
};

const toNullableFiniteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const toShippingGroupDomain = (doc: ProductShippingGroupDoc): ProductShippingGroup => ({
  id: doc._id.toString(),
  name: doc.name,
  description: doc.description ?? null,
  catalogId: doc.catalogId,
  traderaShippingCondition: doc.traderaShippingCondition ?? null,
  traderaShippingPriceEur: toNullableFiniteNumber(doc.traderaShippingPriceEur),
  autoAssignCategoryIds: normalizeCategoryIdList(doc.autoAssignCategoryIds),
  autoAssignCurrencyCodes: normalizeCurrencyCodeList(doc.autoAssignCurrencyCodes),
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

const buildShippingGroupUpdateSet = (
  data: ProductShippingGroupUpdateInput
): Partial<ProductShippingGroupDoc> => {
  const set: Partial<ProductShippingGroupDoc> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) set.name = data.name;
  if (data.description !== undefined) set.description = data.description;
  if (data.catalogId !== undefined) set.catalogId = data.catalogId;
  if (data.traderaShippingCondition !== undefined) {
    set.traderaShippingCondition = data.traderaShippingCondition;
  }
  if (data.traderaShippingPriceEur !== undefined) {
    set.traderaShippingPriceEur = data.traderaShippingPriceEur;
  }
  if (data.autoAssignCategoryIds !== undefined) {
    set.autoAssignCategoryIds = normalizeCategoryIdList(data.autoAssignCategoryIds);
  }
  if (data.autoAssignCurrencyCodes !== undefined) {
    set.autoAssignCurrencyCodes = normalizeCurrencyCodeList(data.autoAssignCurrencyCodes);
  }

  return set;
};

export const mongoShippingGroupRepository: ShippingGroupRepository = {
  async listShippingGroups(filters: ShippingGroupFilters): Promise<ProductShippingGroup[]> {
    const db = await getMongoDb();
    const query: Filter<ProductShippingGroupDoc> = {};
    if (typeof filters.catalogId === 'string' && filters.catalogId.length > 0) {
      query.catalogId = filters.catalogId;
    }
    if (typeof filters.search === 'string' && filters.search.length > 0) {
      query.name = { $regex: filters.search, $options: 'i' };
    }

    const cursor = db.collection<ProductShippingGroupDoc>(COLLECTION).find(query).sort({ name: 1 });

    if (typeof filters.skip === 'number') cursor.skip(filters.skip);
    if (typeof filters.limit === 'number') cursor.limit(filters.limit);

    const shippingGroups = await cursor.toArray();
    return shippingGroups.map(toShippingGroupDomain);
  },

  async getShippingGroupById(id: string): Promise<ProductShippingGroup | null> {
    const db = await getMongoDb();
    const doc = await db.collection<ProductShippingGroupDoc>(COLLECTION).findOne(buildIdFilter(id));
    return doc ? toShippingGroupDomain(doc) : null;
  },

  async createShippingGroup(
    data: ProductShippingGroupCreateInput
  ): Promise<ProductShippingGroup> {
    const db = await getMongoDb();
    const now = new Date();
    const doc: Omit<ProductShippingGroupDoc, '_id'> = {
      name: data.name,
      description: data.description ?? null,
      catalogId: data.catalogId,
      traderaShippingCondition: data.traderaShippingCondition ?? null,
      traderaShippingPriceEur: data.traderaShippingPriceEur ?? null,
      autoAssignCategoryIds: normalizeCategoryIdList(data.autoAssignCategoryIds),
      autoAssignCurrencyCodes: normalizeCurrencyCodeList(data.autoAssignCurrencyCodes),
      createdAt: now,
      updatedAt: now,
    };
    const result = await db
      .collection<Omit<ProductShippingGroupDoc, '_id'>>(COLLECTION)
      .insertOne(doc);
    const createdDoc: ProductShippingGroupDoc = { ...doc, _id: result.insertedId };
    return toShippingGroupDomain(createdDoc);
  },

  async updateShippingGroup(
    id: string,
    data: ProductShippingGroupUpdateInput
  ): Promise<ProductShippingGroup> {
    const db = await getMongoDb();
    const set = buildShippingGroupUpdateSet(data);
    const updateDoc: UpdateFilter<ProductShippingGroupDoc> = { $set: set };

    await db
      .collection<ProductShippingGroupDoc>(COLLECTION)
      .updateOne(buildIdFilter(id), updateDoc);

    const updated = await this.getShippingGroupById(id);
    if (!updated) throw internalError('Failed to update shipping group', { shippingGroupId: id });
    return updated;
  },

  async deleteShippingGroup(id: string): Promise<void> {
    const db = await getMongoDb();
    const result = await db.collection<ProductShippingGroupDoc>(COLLECTION).deleteOne(buildIdFilter(id));
    if (result.deletedCount === 0) {
      throw notFoundError('Shipping group not found', { shippingGroupId: id });
    }
  },

  async findByName(catalogId: string, name: string): Promise<ProductShippingGroup | null> {
    const db = await getMongoDb();
    const doc = await db
      .collection<ProductShippingGroupDoc>(COLLECTION)
      .findOne({ catalogId, name });
    return doc ? toShippingGroupDomain(doc) : null;
  },
};
