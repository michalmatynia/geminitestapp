import { ObjectId } from 'mongodb';


import type { 
  TagRepository, 
  TagFilters 
} from '@/features/products/types/services/tag-repository';
import { internalError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { 
  ProductTag 
} from '@/shared/contracts/products';

import type { Filter, UpdateFilter, Document } from 'mongodb';

const COLLECTION = 'product_tags';

interface ProductTagDoc extends Document {
  _id: ObjectId;
  name: string;
  color: string | null;
  catalogId: string;
  createdAt: Date;
  updatedAt: Date;
}

const toTagDomain = (doc: ProductTagDoc): ProductTag => ({
  id: doc._id.toString(),
  name: doc.name,
  color: doc.color ?? null,
  catalogId: doc.catalogId?.toString(),
  createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
  updatedAt: doc.updatedAt?.toISOString() ?? new Date().toISOString(),
});

export const mongoTagRepository: TagRepository = {
  async listTags(filters: TagFilters): Promise<ProductTag[]> {
    const db = await getMongoDb();
    const query: Filter<ProductTagDoc> = {};
    if (filters.catalogId) query.catalogId = filters.catalogId;
    if (filters.search) {
      query.name = { $regex: filters.search, $options: 'i' };
    }

    const tags = await db.collection<ProductTagDoc>(COLLECTION).find(query).sort({ name: 1 }).toArray();
    return tags.map(toTagDomain);
  },

  async getTagById(id: string): Promise<ProductTag | null> {
    const db = await getMongoDb();
    const doc = await db.collection<ProductTagDoc>(COLLECTION).findOne({ _id: new ObjectId(id) });
    return doc ? toTagDomain(doc) : null;
  },

  async createTag(data: { name: string; color?: string | null; catalogId: string }): Promise<ProductTag> {
    const db = await getMongoDb();
    const now = new Date();
    const doc: Omit<ProductTagDoc, '_id'> = {
      name: data.name,
      color: data.color ?? null,
      catalogId: data.catalogId,
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection<Omit<ProductTagDoc, '_id'>>(COLLECTION).insertOne(doc);
    return toTagDomain({ ...doc, _id: result.insertedId } as ProductTagDoc);
  },

  async updateTag(id: string, data: { name?: string; color?: string | null }): Promise<ProductTag> {
    const db = await getMongoDb();
    
    const set: Partial<ProductTagDoc> = {
      updatedAt: new Date(),
    };
    
    if (data.name !== undefined) set.name = data.name;
    if (data.color !== undefined) set.color = data.color;

    await db.collection<ProductTagDoc>(COLLECTION).updateOne(
      { _id: new ObjectId(id) }, 
      { $set: set } as UpdateFilter<ProductTagDoc>
    );
    
    const updated = await this.getTagById(id);
    if (!updated) throw internalError('Failed to update tag', { tagId: id });
    return updated;
  },

  async deleteTag(id: string): Promise<void> {
    const db = await getMongoDb();
    await db.collection<ProductTagDoc>(COLLECTION).deleteOne({ _id: new ObjectId(id) });
  },

  async findByName(catalogId: string, name: string): Promise<ProductTag | null> {
    const db = await getMongoDb();
    const doc = await db.collection<ProductTagDoc>(COLLECTION).findOne({ catalogId, name });
    return doc ? toTagDomain(doc) : null;
  },
};