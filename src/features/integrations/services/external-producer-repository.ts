import { randomUUID } from 'crypto';

import { Prisma } from '@prisma/client';
import { ObjectId, type Filter } from 'mongodb';

import type {
  BaseProducer,
  ExternalProducer,
  ExternalProducerSyncInput,
} from '@/shared/contracts/integrations';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

export type ExternalProducerRepository = {
  syncFromBase: (connectionId: string, producers: BaseProducer[]) => Promise<number>;
  listByConnection: (connectionId: string) => Promise<ExternalProducer[]>;
  getById: (id: string) => Promise<ExternalProducer | null>;
  getByExternalId: (connectionId: string, externalId: string) => Promise<ExternalProducer | null>;
  deleteByConnection: (connectionId: string) => Promise<number>;
};

type ExternalProducerDoc = Prisma.ExternalProducerGetPayload<Record<string, never>>;

const toRecord = (doc: ExternalProducerDoc): ExternalProducer => ({
  id: doc.id,
  connectionId: doc.connectionId,
  externalId: doc.externalId,
  name: doc.name,
  metadata: doc.metadata as Record<string, unknown> | null,
  fetchedAt: doc.fetchedAt.toISOString(),
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

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
      const collection = db.collection<MongoExternalProducerDoc>(
        EXTERNAL_PRODUCER_COLLECTION
      );
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
    return {
      $or: [{ _id: id }, { _id: new ObjectId(id) }],
    } as Filter<MongoExternalProducerDoc>;
  }
  return { _id: id } as Filter<MongoExternalProducerDoc>;
};

const mirrorPrismaRecordsToMongo = async (
  records: ExternalProducerDoc[]
): Promise<void> => {
  if (records.length === 0) return;

  await ensureMongoExternalProducerIndexes();
  const db = await getMongoDb();
  const collection = db.collection<MongoExternalProducerDoc>(
    EXTERNAL_PRODUCER_COLLECTION
  );

  for (const record of records) {
    await collection.updateOne(
      {
        connectionId: record.connectionId,
        externalId: record.externalId,
      },
      {
        $set: {
          name: record.name,
          metadata: (record.metadata as Record<string, unknown> | null) ?? null,
          fetchedAt: record.fetchedAt,
          updatedAt: record.updatedAt,
        },
        $setOnInsert: {
          _id: record.id,
          createdAt: record.createdAt,
        },
      },
      { upsert: true }
    );
  }
};

export function getExternalProducerRepository(): ExternalProducerRepository {
  return {
    async syncFromBase(connectionId: string, producers: BaseProducer[]): Promise<number> {
      const now = new Date();
      const syncInputs: ExternalProducerSyncInput[] = producers.map((producer: BaseProducer) => ({
        connectionId,
        externalId: producer.id,
        name: producer.name,
      }));

      const provider = await getAppDbProvider();
      if (provider === 'mongodb') {
        await ensureMongoExternalProducerIndexes();
        const db = await getMongoDb();
        const collection = db.collection<MongoExternalProducerDoc>(
          EXTERNAL_PRODUCER_COLLECTION
        );

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
      }

      let count = 0;
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        for (const input of syncInputs) {
          await tx.externalProducer.upsert({
            where: {
              connectionId_externalId: {
                connectionId: input.connectionId,
                externalId: input.externalId,
              },
            },
            create: {
              connectionId: input.connectionId,
              externalId: input.externalId,
              name: input.name,
              fetchedAt: now,
            },
            update: {
              name: input.name,
              fetchedAt: now,
            },
          });
          count++;
        }
      });

      return count;
    },

    async listByConnection(connectionId: string): Promise<ExternalProducer[]> {
      const provider = await getAppDbProvider();
      if (provider === 'mongodb') {
        await ensureMongoExternalProducerIndexes();
        const db = await getMongoDb();
        const mongoRecords = await db
          .collection<MongoExternalProducerDoc>(EXTERNAL_PRODUCER_COLLECTION)
          .find({ connectionId })
          .sort({ name: 1 })
          .toArray();

        if (mongoRecords.length > 0) {
          return mongoRecords.map((record: MongoExternalProducerDoc) =>
            toMongoRecord(record)
          );
        }

        try {
          const prismaRecords = await prisma.externalProducer.findMany({
            where: { connectionId },
            orderBy: [{ name: 'asc' }],
          });
          if (prismaRecords.length > 0) {
            await mirrorPrismaRecordsToMongo(prismaRecords);
          }
          return prismaRecords.map((record: ExternalProducerDoc) => toRecord(record));
        } catch {
          return [];
        }
      }

      const records = await prisma.externalProducer.findMany({
        where: { connectionId },
        orderBy: [{ name: 'asc' }],
      });

      return records.map((record: ExternalProducerDoc) => toRecord(record));
    },

    async getById(id: string): Promise<ExternalProducer | null> {
      const provider = await getAppDbProvider();
      if (provider === 'mongodb') {
        await ensureMongoExternalProducerIndexes();
        const db = await getMongoDb();
        const filter = buildMongoIdFilter(id);
        const mongoRecord = await db
          .collection<MongoExternalProducerDoc>(EXTERNAL_PRODUCER_COLLECTION)
          .findOne(filter);
        if (mongoRecord) {
          return toMongoRecord(mongoRecord);
        }

        try {
          const prismaRecord = await prisma.externalProducer.findUnique({
            where: { id },
          });
          if (!prismaRecord) return null;
          await mirrorPrismaRecordsToMongo([prismaRecord]);
          return toRecord(prismaRecord);
        } catch {
          return null;
        }
      }

      const record = await prisma.externalProducer.findUnique({
        where: { id },
      });
      if (!record) return null;
      return toRecord(record);
    },

    async getByExternalId(
      connectionId: string,
      externalId: string
    ): Promise<ExternalProducer | null> {
      const provider = await getAppDbProvider();
      if (provider === 'mongodb') {
        await ensureMongoExternalProducerIndexes();
        const db = await getMongoDb();
        const mongoRecord = await db
          .collection<MongoExternalProducerDoc>(EXTERNAL_PRODUCER_COLLECTION)
          .findOne({ connectionId, externalId });
        if (mongoRecord) {
          return toMongoRecord(mongoRecord);
        }

        try {
          const prismaRecord = await prisma.externalProducer.findUnique({
            where: {
              connectionId_externalId: {
                connectionId,
                externalId,
              },
            },
          });
          if (!prismaRecord) return null;
          await mirrorPrismaRecordsToMongo([prismaRecord]);
          return toRecord(prismaRecord);
        } catch {
          return null;
        }
      }

      const record = await prisma.externalProducer.findUnique({
        where: {
          connectionId_externalId: {
            connectionId,
            externalId,
          },
        },
      });
      if (!record) return null;
      return toRecord(record);
    },

    async deleteByConnection(connectionId: string): Promise<number> {
      const provider = await getAppDbProvider();
      if (provider === 'mongodb') {
        await ensureMongoExternalProducerIndexes();
        const db = await getMongoDb();
        const result = await db
          .collection<MongoExternalProducerDoc>(EXTERNAL_PRODUCER_COLLECTION)
          .deleteMany({ connectionId });
        return result.deletedCount ?? 0;
      }

      const result = await prisma.externalProducer.deleteMany({
        where: { connectionId },
      });
      return result.count;
    },
  };
}
