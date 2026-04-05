import { randomUUID } from 'crypto';

import { ObjectId, type Filter } from 'mongodb';

import type { ExternalProducer, ExternalProducerSyncInput } from '@/shared/contracts/integrations/producers';
import type { BaseProducer } from '@/shared/contracts/integrations';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

type ExternalProducerRepository = {
  syncFromBase: (connectionId: string, producers: BaseProducer[]) => Promise<number>;
  listByConnection: (connectionId: string) => Promise<ExternalProducer[]>;
  getById: (id: string) => Promise<ExternalProducer | null>;
  getByExternalId: (connectionId: string, externalId: string) => Promise<ExternalProducer | null>;
  deleteByConnection: (connectionId: string) => Promise<number>;
};

type MongoExternalProducerDoc = {
  _id: ObjectId | string;
  connectionId: string;
  externalId: string;
  name: string;
  metadata?: Record<string, unknown> | null;
  fetchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

const EXTERNAL_PRODUCER_COLLECTION = 'external_producers';

let mongoExternalProducerIndexesReady: Promise<void> | null = null;

const ensureMongoExternalProducerIndexes = async (): Promise<void> => {
  if (!mongoExternalProducerIndexesReady) {
    mongoExternalProducerIndexesReady = (async () => {
      const db = await getMongoDb();
      const collection = db.collection<MongoExternalProducerDoc>(EXTERNAL_PRODUCER_COLLECTION);
      await Promise.all([
        collection.createIndex(
          { connectionId: 1, externalId: 1 },
          {
            unique: true,
            name: 'external_producers_connection_external_unique',
          }
        ),
        collection.createIndex(
          { connectionId: 1, name: 1 },
          { name: 'external_producers_connection_name' }
        ),
      ]);
    })();
  }

  await mongoExternalProducerIndexesReady;
};

const toMongoRecord = (doc: MongoExternalProducerDoc): ExternalProducer => ({
  id: doc._id.toString(),
  connectionId: doc.connectionId,
  externalId: doc.externalId,
  name: doc.name,
  metadata: doc.metadata ?? null,
  fetchedAt: doc.fetchedAt.toISOString(),
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

const buildMongoIdFilter = (id: string): Filter<MongoExternalProducerDoc> => {
  if (ObjectId.isValid(id)) {
    return { $or: [{ _id: id }, { _id: new ObjectId(id) }] } as Filter<MongoExternalProducerDoc>;
  }
  return { _id: id } as Filter<MongoExternalProducerDoc>;
};

export function getExternalProducerRepository(): ExternalProducerRepository {
  return {
    async syncFromBase(connectionId: string, producers: BaseProducer[]): Promise<number> {
      await ensureMongoExternalProducerIndexes();
      const db = await getMongoDb();
      const collection = db.collection<MongoExternalProducerDoc>(EXTERNAL_PRODUCER_COLLECTION);
      const now = new Date();
      const syncInputs: ExternalProducerSyncInput[] = producers.map((producer: BaseProducer) => ({
        connectionId,
        externalId: producer.id,
        name: producer.name,
      }));

      let count = 0;
      for (const input of syncInputs) {
        await collection.updateOne(
          {
            connectionId: input.connectionId,
            externalId: input.externalId,
          },
          {
            $set: {
              name: input.name,
              metadata: input.metadata ?? null,
              fetchedAt: now,
              updatedAt: now,
            },
            $setOnInsert: {
              _id: randomUUID(),
              createdAt: now,
            },
          },
          { upsert: true }
        );
        count++;
      }

      return count;
    },

    async listByConnection(connectionId: string): Promise<ExternalProducer[]> {
      await ensureMongoExternalProducerIndexes();
      const db = await getMongoDb();
      const records = await db
        .collection<MongoExternalProducerDoc>(EXTERNAL_PRODUCER_COLLECTION)
        .find({ connectionId })
        .sort({ name: 1 })
        .toArray();

      return records.map((record: MongoExternalProducerDoc) => toMongoRecord(record));
    },

    async getById(id: string): Promise<ExternalProducer | null> {
      await ensureMongoExternalProducerIndexes();
      const db = await getMongoDb();
      const record = await db
        .collection<MongoExternalProducerDoc>(EXTERNAL_PRODUCER_COLLECTION)
        .findOne(buildMongoIdFilter(id));
      return record ? toMongoRecord(record) : null;
    },

    async getByExternalId(
      connectionId: string,
      externalId: string
    ): Promise<ExternalProducer | null> {
      await ensureMongoExternalProducerIndexes();
      const db = await getMongoDb();
      const record = await db
        .collection<MongoExternalProducerDoc>(EXTERNAL_PRODUCER_COLLECTION)
        .findOne({ connectionId, externalId });
      return record ? toMongoRecord(record) : null;
    },

    async deleteByConnection(connectionId: string): Promise<number> {
      await ensureMongoExternalProducerIndexes();
      const db = await getMongoDb();
      const result = await db
        .collection<MongoExternalProducerDoc>(EXTERNAL_PRODUCER_COLLECTION)
        .deleteMany({ connectionId });
      return result.deletedCount ?? 0;
    },
  };
}
