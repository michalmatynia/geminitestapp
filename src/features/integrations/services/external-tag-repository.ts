import { randomUUID } from 'crypto';

import { ObjectId, type Filter } from 'mongodb';

import type { BaseTag, ExternalTag, ExternalTagSyncInput } from '@/shared/contracts/integrations';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

type ExternalTagRepository = {
  syncFromBase: (connectionId: string, tags: BaseTag[]) => Promise<number>;
  listByConnection: (connectionId: string) => Promise<ExternalTag[]>;
  getById: (id: string) => Promise<ExternalTag | null>;
  getByExternalId: (connectionId: string, externalId: string) => Promise<ExternalTag | null>;
  deleteByConnection: (connectionId: string) => Promise<number>;
};

type MongoExternalTagDoc = {
  _id: ObjectId | string;
  connectionId: string;
  externalId: string;
  name: string;
  metadata?: Record<string, unknown> | null;
  fetchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

const EXTERNAL_TAG_COLLECTION = 'external_tags';

let mongoExternalTagIndexesReady: Promise<void> | null = null;

const ensureMongoExternalTagIndexes = async (): Promise<void> => {
  if (!mongoExternalTagIndexesReady) {
    mongoExternalTagIndexesReady = (async () => {
      const db = await getMongoDb();
      const collection = db.collection<MongoExternalTagDoc>(EXTERNAL_TAG_COLLECTION);
      await Promise.all([
        collection.createIndex(
          { connectionId: 1, externalId: 1 },
          {
            unique: true,
            name: 'external_tags_connection_external_unique',
          }
        ),
        collection.createIndex({ connectionId: 1, name: 1 }, { name: 'external_tags_name' }),
      ]);
    })();
  }

  await mongoExternalTagIndexesReady;
};

const toMongoRecord = (doc: MongoExternalTagDoc): ExternalTag => ({
  id: doc._id.toString(),
  connectionId: doc.connectionId,
  externalId: doc.externalId,
  name: doc.name,
  metadata: doc.metadata ?? null,
  fetchedAt: doc.fetchedAt.toISOString(),
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

const buildMongoIdFilter = (id: string): Filter<MongoExternalTagDoc> => {
  if (ObjectId.isValid(id)) {
    return { $or: [{ _id: id }, { _id: new ObjectId(id) }] } as Filter<MongoExternalTagDoc>;
  }
  return { _id: id } as Filter<MongoExternalTagDoc>;
};

export function getExternalTagRepository(): ExternalTagRepository {
  return {
    async syncFromBase(connectionId: string, tags: BaseTag[]): Promise<number> {
      await ensureMongoExternalTagIndexes();
      const db = await getMongoDb();
      const collection = db.collection<MongoExternalTagDoc>(EXTERNAL_TAG_COLLECTION);
      const now = new Date();
      const syncInputs: ExternalTagSyncInput[] = tags.map((tag: BaseTag) => ({
        connectionId,
        externalId: tag.id,
        name: tag.name,
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

    async listByConnection(connectionId: string): Promise<ExternalTag[]> {
      await ensureMongoExternalTagIndexes();
      const db = await getMongoDb();
      const records = await db
        .collection<MongoExternalTagDoc>(EXTERNAL_TAG_COLLECTION)
        .find({ connectionId })
        .sort({ name: 1 })
        .toArray();

      return records.map((record: MongoExternalTagDoc) => toMongoRecord(record));
    },

    async getById(id: string): Promise<ExternalTag | null> {
      await ensureMongoExternalTagIndexes();
      const db = await getMongoDb();
      const record = await db
        .collection<MongoExternalTagDoc>(EXTERNAL_TAG_COLLECTION)
        .findOne(buildMongoIdFilter(id));
      return record ? toMongoRecord(record) : null;
    },

    async getByExternalId(connectionId: string, externalId: string): Promise<ExternalTag | null> {
      await ensureMongoExternalTagIndexes();
      const db = await getMongoDb();
      const record = await db
        .collection<MongoExternalTagDoc>(EXTERNAL_TAG_COLLECTION)
        .findOne({ connectionId, externalId });
      return record ? toMongoRecord(record) : null;
    },

    async deleteByConnection(connectionId: string): Promise<number> {
      await ensureMongoExternalTagIndexes();
      const db = await getMongoDb();
      const result = await db
        .collection<MongoExternalTagDoc>(EXTERNAL_TAG_COLLECTION)
        .deleteMany({ connectionId });
      return result.deletedCount ?? 0;
    },
  };
}
