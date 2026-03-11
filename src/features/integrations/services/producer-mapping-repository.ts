import { randomUUID } from 'crypto';

import { ObjectId } from 'mongodb';

import {
  EXTERNAL_PRODUCER_COLLECTION,
  INTERNAL_PRODUCER_COLLECTION,
  PRODUCER_MAPPING_COLLECTION,
  buildMongoIdFilter,
  ensureMongoProducerMappingIndexes,
  hydrateMongoProducerMappingDetails,
  mapMongoProducerMappingToRecord,
  type MongoExternalProducerDoc,
  type MongoInternalProducerDoc,
  type MongoProducerMappingDoc,
} from '@/features/integrations/services/producer-mapping-repository-mongo-utils';
import type {
  ProducerMappingAssignment,
  ProducerMapping,
  ProducerMappingCreateInput,
  ProducerMappingUpdateInput,
  ProducerMappingWithDetails,
} from '@/shared/contracts/integrations';
import { internalError, notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { getProducerRepository } from '@/shared/lib/products/services/producer-repository';

export type ProducerMappingRepository = {
  create: (input: ProducerMappingCreateInput) => Promise<ProducerMapping>;
  update: (id: string, input: ProducerMappingUpdateInput) => Promise<ProducerMapping>;
  delete: (id: string) => Promise<void>;
  getById: (id: string) => Promise<ProducerMapping | null>;
  listByConnection: (connectionId: string) => Promise<ProducerMappingWithDetails[]>;
  getByInternalProducer: (
    connectionId: string,
    internalProducerId: string
  ) => Promise<ProducerMapping | null>;
  listByInternalProducerIds: (
    connectionId: string,
    internalProducerIds: string[]
  ) => Promise<ProducerMappingWithDetails[]>;
  bulkUpsert: (
    connectionId: string,
    mappings: ProducerMappingAssignment[]
  ) => Promise<number>;
  deleteByConnection: (connectionId: string) => Promise<number>;
};

const buildFallbackProducerName = (internalProducerId: string): string => {
  const suffix = internalProducerId.slice(-6);
  return `Producer ${suffix || 'unknown'}`;
};

const resolveExternalProducerRefMongo = async (
  connectionId: string,
  externalProducerId: string
): Promise<string> => {
  await ensureMongoProducerMappingIndexes();
  const db = await getMongoDb();
  const collection = db.collection<MongoExternalProducerDoc>(EXTERNAL_PRODUCER_COLLECTION);

  const candidate = externalProducerId.trim();
  if (candidate.length === 0) {
    return candidate;
  }

  const byCandidate = await collection.findOne({
    connectionId,
    $or: ObjectId.isValid(candidate)
      ? [{ _id: candidate }, { _id: new ObjectId(candidate) }, { externalId: candidate }]
      : [{ _id: candidate }, { externalId: candidate }],
  });

  if (byCandidate) {
    return byCandidate._id.toString();
  }

  const now = new Date();
  const doc: MongoExternalProducerDoc = {
    _id: randomUUID(),
    connectionId,
    externalId: candidate,
    name: `External Producer ${candidate}`,
    metadata: null,
    fetchedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await collection.insertOne(doc);
  return doc._id.toString();
};

const ensureInternalProducerRefMongo = async (internalProducerId: string): Promise<void> => {
  const candidate = internalProducerId.trim();
  if (candidate.length === 0) {
    return;
  }

  const db = await getMongoDb();
  const collection = db.collection<MongoInternalProducerDoc>(INTERNAL_PRODUCER_COLLECTION);

  const existing = await collection.findOne({
    $or: ObjectId.isValid(candidate)
      ? [{ id: candidate }, { _id: candidate }, { _id: new ObjectId(candidate) }]
      : [{ id: candidate }, { _id: candidate }],
  });
  if (existing) {
    return;
  }

  const producerRepository = await getProducerRepository();
  const sourceProducer = await producerRepository.getProducerById(candidate).catch(() => null);

  const now = new Date();
  await collection.updateOne(
    { id: candidate },
    {
      $set: {
        updatedAt: now,
      },
      $setOnInsert: {
        _id: randomUUID(),
        id: candidate,
        name: sourceProducer?.name?.trim() || buildFallbackProducerName(candidate),
        website: sourceProducer?.website ?? null,
        createdAt: now,
      },
    },
    { upsert: true }
  );
};

const sortByInternalProducerName = (
  records: ProducerMappingWithDetails[]
): ProducerMappingWithDetails[] =>
  [...records].sort((a, b) => {
    const nameA = a.internalProducer?.name ?? '';
    const nameB = b.internalProducer?.name ?? '';
    return nameA.localeCompare(nameB);
  });

export function getProducerMappingRepository(): ProducerMappingRepository {
  return {
    async create(input: ProducerMappingCreateInput): Promise<ProducerMapping> {
      await ensureMongoProducerMappingIndexes();
      const db = await getMongoDb();
      const collection = db.collection<MongoProducerMappingDoc>(PRODUCER_MAPPING_COLLECTION);

      const resolvedExternalProducerId = await resolveExternalProducerRefMongo(
        input.connectionId,
        input.externalProducerId
      );
      await ensureInternalProducerRefMongo(input.internalProducerId);

      const now = new Date();
      await collection.updateOne(
        {
          connectionId: input.connectionId,
          internalProducerId: input.internalProducerId,
        },
        {
          $set: {
            externalProducerId: resolvedExternalProducerId,
            isActive: true,
            updatedAt: now,
          },
          $setOnInsert: {
            _id: randomUUID(),
            createdAt: now,
          },
        },
        { upsert: true }
      );

      const record = await collection.findOne({
        connectionId: input.connectionId,
        internalProducerId: input.internalProducerId,
      });
      if (!record) {
        throw internalError('Failed to create producer mapping');
      }
      return mapMongoProducerMappingToRecord(record);
    },

    async update(id: string, input: ProducerMappingUpdateInput): Promise<ProducerMapping> {
      await ensureMongoProducerMappingIndexes();
      const db = await getMongoDb();
      const collection = db.collection<MongoProducerMappingDoc>(PRODUCER_MAPPING_COLLECTION);

      const filter = buildMongoIdFilter(id);
      const current = await collection.findOne(filter);
      if (!current) {
        throw notFoundError('Producer mapping not found', { mappingId: id });
      }

      const updatePayload: Partial<MongoProducerMappingDoc> = {
        updatedAt: new Date(),
      };

      if (input.externalProducerId !== undefined) {
        updatePayload.externalProducerId = await resolveExternalProducerRefMongo(
          current.connectionId,
          input.externalProducerId
        );
      }
      if (input.isActive !== undefined) {
        updatePayload.isActive = input.isActive;
      }

      await collection.updateOne(filter, { $set: updatePayload });
      const updated = await collection.findOne(filter);
      if (!updated) {
        throw notFoundError('Producer mapping not found', { mappingId: id });
      }
      return mapMongoProducerMappingToRecord(updated);
    },

    async delete(id: string): Promise<void> {
      await ensureMongoProducerMappingIndexes();
      const db = await getMongoDb();
      await db
        .collection<MongoProducerMappingDoc>(PRODUCER_MAPPING_COLLECTION)
        .deleteOne(buildMongoIdFilter(id));
    },

    async getById(id: string): Promise<ProducerMapping | null> {
      await ensureMongoProducerMappingIndexes();
      const db = await getMongoDb();
      const record = await db
        .collection<MongoProducerMappingDoc>(PRODUCER_MAPPING_COLLECTION)
        .findOne(buildMongoIdFilter(id));
      return record ? mapMongoProducerMappingToRecord(record) : null;
    },

    async listByConnection(connectionId: string): Promise<ProducerMappingWithDetails[]> {
      await ensureMongoProducerMappingIndexes();
      const db = await getMongoDb();
      const records = await db
        .collection<MongoProducerMappingDoc>(PRODUCER_MAPPING_COLLECTION)
        .find({ connectionId })
        .toArray();

      return sortByInternalProducerName(await hydrateMongoProducerMappingDetails(records));
    },

    async getByInternalProducer(
      connectionId: string,
      internalProducerId: string
    ): Promise<ProducerMapping | null> {
      await ensureMongoProducerMappingIndexes();
      const db = await getMongoDb();
      const record = await db
        .collection<MongoProducerMappingDoc>(PRODUCER_MAPPING_COLLECTION)
        .findOne({ connectionId, internalProducerId });
      return record ? mapMongoProducerMappingToRecord(record) : null;
    },

    async listByInternalProducerIds(
      connectionId: string,
      internalProducerIds: string[]
    ): Promise<ProducerMappingWithDetails[]> {
      if (internalProducerIds.length === 0) return [];

      await ensureMongoProducerMappingIndexes();
      const db = await getMongoDb();
      const records = await db
        .collection<MongoProducerMappingDoc>(PRODUCER_MAPPING_COLLECTION)
        .find({
          connectionId,
          internalProducerId: { $in: internalProducerIds },
          isActive: true,
        })
        .toArray();

      return hydrateMongoProducerMappingDetails(records);
    },

    async bulkUpsert(
      connectionId: string,
      mappings: ProducerMappingAssignment[]
    ): Promise<number> {
      await ensureMongoProducerMappingIndexes();
      const db = await getMongoDb();
      const collection = db.collection<MongoProducerMappingDoc>(PRODUCER_MAPPING_COLLECTION);

      let count = 0;
      for (const mapping of mappings) {
        if (mapping.externalProducerId === null) {
          const deactivated = await collection.updateMany(
            {
              connectionId,
              internalProducerId: mapping.internalProducerId,
              isActive: true,
            },
            {
              $set: {
                isActive: false,
                updatedAt: new Date(),
              },
            }
          );
          count += deactivated.modifiedCount ?? 0;
          continue;
        }

        const resolvedExternalProducerId = await resolveExternalProducerRefMongo(
          connectionId,
          mapping.externalProducerId
        );
        await ensureInternalProducerRefMongo(mapping.internalProducerId);

        const now = new Date();
        await collection.updateOne(
          {
            connectionId,
            internalProducerId: mapping.internalProducerId,
          },
          {
            $set: {
              externalProducerId: resolvedExternalProducerId,
              isActive: true,
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

    async deleteByConnection(connectionId: string): Promise<number> {
      await ensureMongoProducerMappingIndexes();
      const db = await getMongoDb();
      const result = await db
        .collection<MongoProducerMappingDoc>(PRODUCER_MAPPING_COLLECTION)
        .deleteMany({ connectionId });
      return result.deletedCount ?? 0;
    },
  };
}
