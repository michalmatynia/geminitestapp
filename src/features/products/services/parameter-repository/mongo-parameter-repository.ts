import { ObjectId } from 'mongodb';


import type { 
  ParameterRepository, 
  ParameterFilters 
} from '@/features/products/types/services/parameter-repository';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { 
  ProductParameter 
} from '@/shared/types/domain/products';

import type { Filter, UpdateFilter, Document } from 'mongodb';

const COLLECTION = 'product_parameters';

interface ProductParameterDoc extends Document {
  _id: ObjectId;
  name_en: string;
  name_pl: string | null;
  name_de: string | null;
  catalogId: string;
  createdAt: Date;
  updatedAt: Date;
}

const toParameterDomain = (doc: ProductParameterDoc): ProductParameter => ({
  id: doc._id.toString(),
  name_en: doc.name_en,
  name_pl: doc.name_pl ?? null,
  name_de: doc.name_de ?? null,
  catalogId: doc.catalogId?.toString(),
  createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
  updatedAt: doc.updatedAt?.toISOString() ?? new Date().toISOString(),
});

export const mongoParameterRepository: ParameterRepository = {
  async listParameters(filters: ParameterFilters): Promise<ProductParameter[]> {
    const db = await getMongoDb();
    const query: Filter<ProductParameterDoc> = {};
    if (filters.catalogId) query.catalogId = filters.catalogId;
    if (filters.search) {
      query.$or = [
        { name_en: { $regex: filters.search, $options: 'i' } },
        { name_pl: { $regex: filters.search, $options: 'i' } },
        { name_de: { $regex: filters.search, $options: 'i' } },
      ] as Filter<ProductParameterDoc>[];
    }

    const params = await db.collection<ProductParameterDoc>(COLLECTION).find(query).sort({ name_en: 1 }).toArray();
    return params.map(toParameterDomain);
  },

  async getParameterById(id: string): Promise<ProductParameter | null> {
    const db = await getMongoDb();
    const doc = await db.collection<ProductParameterDoc>(COLLECTION).findOne({ _id: new ObjectId(id) });
    return doc ? toParameterDomain(doc) : null;
  },

  async createParameter(data: { name_en: string; name_pl?: string | null; name_de?: string | null; catalogId: string }): Promise<ProductParameter> {
    const db = await getMongoDb();
    const now = new Date();
    const doc: Omit<ProductParameterDoc, '_id'> = {
      name_en: data.name_en,
      name_pl: data.name_pl ?? null,
      name_de: data.name_de ?? null,
      catalogId: data.catalogId,
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection<Omit<ProductParameterDoc, '_id'>>(COLLECTION).insertOne(doc);
    return toParameterDomain({ ...doc, _id: result.insertedId } as ProductParameterDoc);
  },

  async updateParameter(id: string, data: { name_en?: string; name_pl?: string | null; name_de?: string | null }): Promise<ProductParameter> {
    const db = await getMongoDb();
    
    const set: Partial<ProductParameterDoc> = {
      updatedAt: new Date(),
    };
    
    if (data.name_en !== undefined) set.name_en = data.name_en;
    if (data.name_pl !== undefined) set.name_pl = data.name_pl;
    if (data.name_de !== undefined) set.name_de = data.name_de;

    await db.collection<ProductParameterDoc>(COLLECTION).updateOne(
      { _id: new ObjectId(id) }, 
      { $set: set } as UpdateFilter<ProductParameterDoc>
    );
    
    const updated = await this.getParameterById(id);
    if (!updated) throw new Error('Failed to update parameter');
    return updated;
  },

  async deleteParameter(id: string): Promise<void> {
    const db = await getMongoDb();
    await db.collection<ProductParameterDoc>(COLLECTION).deleteOne({ _id: new ObjectId(id) });
  },

  async findByName(catalogId: string, name_en: string): Promise<ProductParameter | null> {
    const db = await getMongoDb();
    const doc = await db.collection<ProductParameterDoc>(COLLECTION).findOne({ catalogId, name_en });
    return doc ? toParameterDomain(doc) : null;
  },
};