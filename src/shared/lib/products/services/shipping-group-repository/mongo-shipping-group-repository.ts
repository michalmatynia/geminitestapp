import { ObjectId } from 'mongodb';

import type {
  ProductShippingGroup,
  ProductShippingGroupCreateInput,
  ProductShippingGroupUpdateInput,
  ShippingGroupFilters,
  ShippingGroupRepository,
} from '@/shared/contracts/products';
import { internalError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { Document, Filter, UpdateFilter } from 'mongodb';

const COLLECTION = 'product_shipping_groups';

interface ProductShippingGroupDoc extends Document {
  _id: ObjectId;
  name: string;
  description: string | null;
  catalogId: string;
  traderaShippingCondition: string | null;
  traderaShippingPriceEur: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const toShippingGroupDomain = (doc: ProductShippingGroupDoc): ProductShippingGroup => ({
  id: doc._id.toString(),
  name: doc.name,
  description: doc.description ?? null,
  catalogId: doc.catalogId?.toString(),
  traderaShippingCondition: doc.traderaShippingCondition ?? null,
  traderaShippingPriceEur:
    typeof doc.traderaShippingPriceEur === 'number' &&
    Number.isFinite(doc.traderaShippingPriceEur)
      ? doc.traderaShippingPriceEur
      : null,
  createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
  updatedAt: doc.updatedAt?.toISOString() ?? new Date().toISOString(),
});

export const mongoShippingGroupRepository: ShippingGroupRepository = {
  async listShippingGroups(filters: ShippingGroupFilters): Promise<ProductShippingGroup[]> {
    const db = await getMongoDb();
    const query: Filter<ProductShippingGroupDoc> = {};
    if (filters.catalogId) query.catalogId = filters.catalogId;
    if (filters.search) {
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
    const doc = await db
      .collection<ProductShippingGroupDoc>(COLLECTION)
      .findOne({ _id: new ObjectId(id) });
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
      createdAt: now,
      updatedAt: now,
    };
    const result = await db
      .collection<Omit<ProductShippingGroupDoc, '_id'>>(COLLECTION)
      .insertOne(doc);
    return toShippingGroupDomain({ ...doc, _id: result.insertedId } as ProductShippingGroupDoc);
  },

  async updateShippingGroup(
    id: string,
    data: ProductShippingGroupUpdateInput
  ): Promise<ProductShippingGroup> {
    const db = await getMongoDb();

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

    await db
      .collection<ProductShippingGroupDoc>(COLLECTION)
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: set } as UpdateFilter<ProductShippingGroupDoc>
      );

    const updated = await this.getShippingGroupById(id);
    if (!updated) throw internalError('Failed to update shipping group', { shippingGroupId: id });
    return updated;
  },

  async deleteShippingGroup(id: string): Promise<void> {
    const db = await getMongoDb();
    await db.collection<ProductShippingGroupDoc>(COLLECTION).deleteOne({ _id: new ObjectId(id) });
  },

  async findByName(catalogId: string, name: string): Promise<ProductShippingGroup | null> {
    const db = await getMongoDb();
    const doc = await db
      .collection<ProductShippingGroupDoc>(COLLECTION)
      .findOne({ catalogId, name });
    return doc ? toShippingGroupDomain(doc) : null;
  },
};
