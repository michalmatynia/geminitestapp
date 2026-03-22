import { ObjectId } from 'mongodb';

import type { ProducerRepository, ProducerFilters } from '@/shared/contracts/products';
import type { Producer } from '@/shared/contracts/products';
import { internalError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { Filter, UpdateFilter, Document } from 'mongodb';

const COLLECTION = 'product_producers';

interface ProducerDoc extends Document {
  _id: ObjectId;
  name: string;
  website: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const toProducerDomain = (doc: ProducerDoc): Producer => ({
  id: doc._id.toString(),
  name: doc.name,
  website: doc.website ?? null,
  createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
  updatedAt: doc.updatedAt?.toISOString() ?? new Date().toISOString(),
});

export const mongoProducerRepository: ProducerRepository = {
  async listProducers(filters: ProducerFilters): Promise<Producer[]> {
    const db = await getMongoDb();
    const query: Filter<ProducerDoc> = {};
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { website: { $regex: filters.search, $options: 'i' } },
      ] as Filter<ProducerDoc>[];
    }

    const cursor = db.collection<ProducerDoc>(COLLECTION).find(query).sort({ name: 1 });

    if (typeof filters.skip === 'number') cursor.skip(filters.skip);
    if (typeof filters.limit === 'number') cursor.limit(filters.limit);

    const producers = await cursor.toArray();
    return producers.map(toProducerDomain);
  },

  async getProducerById(id: string): Promise<Producer | null> {
    if (!ObjectId.isValid(id)) return null;
    const db = await getMongoDb();
    const doc = await db.collection<ProducerDoc>(COLLECTION).findOne({ _id: new ObjectId(id) });
    return doc ? toProducerDomain(doc) : null;
  },

  async createProducer(data: { name: string; website?: string | null }): Promise<Producer> {
    const db = await getMongoDb();
    const now = new Date();
    const doc: Omit<ProducerDoc, '_id'> = {
      name: data.name,
      website: data.website ?? null,
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection<Omit<ProducerDoc, '_id'>>(COLLECTION).insertOne(doc);
    return toProducerDomain({ ...doc, _id: result.insertedId } as ProducerDoc);
  },

  async updateProducer(
    id: string,
    data: { name?: string; website?: string | null }
  ): Promise<Producer> {
    const db = await getMongoDb();

    const set: Partial<ProducerDoc> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) set.name = data.name;
    if (data.website !== undefined) set.website = data.website;

    await db
      .collection<ProducerDoc>(COLLECTION)
      .updateOne({ _id: new ObjectId(id) }, { $set: set } as UpdateFilter<ProducerDoc>);

    const updated = await this.getProducerById(id);
    if (!updated) throw internalError('Failed to update producer', { producerId: id });
    return updated;
  },

  async deleteProducer(id: string): Promise<void> {
    const db = await getMongoDb();
    await db.collection<ProducerDoc>(COLLECTION).deleteOne({ _id: new ObjectId(id) });
  },

  async findByName(name: string): Promise<Producer | null> {
    const db = await getMongoDb();
    const doc = await db.collection<ProducerDoc>(COLLECTION).findOne({ name });
    return doc ? toProducerDomain(doc) : null;
  },
};
