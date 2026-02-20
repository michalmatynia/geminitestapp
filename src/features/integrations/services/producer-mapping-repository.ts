import { randomUUID } from 'crypto';

import { Prisma } from '@prisma/client';
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
  ProducerMapping,
  ProducerMappingCreateInput,
  ProducerMappingUpdateInput,
  ProducerMappingWithDetails,
} from '@/shared/contracts/integrations/producer-mapping';
import { getProducerRepository } from '@/features/products/services/producer-repository';
import { internalError, notFoundError } from '@/shared/errors/app-error';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

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
    mappings: { internalProducerId: string; externalProducerId: string | null }[]
  ) => Promise<number>;
  deleteByConnection: (connectionId: string) => Promise<number>;
};

function mapToRecord(record: {
  id: string;
  connectionId: string;
  externalProducerId: string;
  internalProducerId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ProducerMapping {
  return {
    id: record.id,
    connectionId: record.connectionId,
    externalProducerId: record.externalProducerId,
    internalProducerId: record.internalProducerId,
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

type EnrichedProducerMapping = Prisma.ProducerMappingGetPayload<{
  include: {
    externalProducer: true;
    internalProducer: true;
  };
}>;

const toDetails = (record: EnrichedProducerMapping): ProducerMappingWithDetails => ({
  id: record.id,
  connectionId: record.connectionId,
  externalProducerId: record.externalProducerId,
  internalProducerId: record.internalProducerId,
  isActive: record.isActive,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
  externalProducer: {
    id: record.externalProducer.id,
    connectionId: record.externalProducer.connectionId,
    externalId: record.externalProducer.externalId,
    name: record.externalProducer.name,
    metadata: record.externalProducer.metadata as Record<string, unknown> | null,
    fetchedAt: record.externalProducer.fetchedAt.toISOString(),
    createdAt: record.externalProducer.createdAt.toISOString(),
    updatedAt: record.externalProducer.updatedAt.toISOString(),
  },
  internalProducer: {
    id: record.internalProducer.id,
    name: record.internalProducer.name,
    website: record.internalProducer.website,
    createdAt: record.internalProducer.createdAt.toISOString(),
    updatedAt: record.internalProducer.updatedAt.toISOString(),
  },
});

const isPrismaKnownRequestError = (error: unknown): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError;

const buildFallbackProducerName = (internalProducerId: string): string => {
  const suffix = internalProducerId.slice(-6);
  return `Producer ${suffix || 'unknown'}`;
};

const resolveExternalProducerRefPrisma = async (
  tx: Prisma.TransactionClient,
  connectionId: string,
  externalProducerId: string
): Promise<string> => {
  const candidate = externalProducerId.trim();
  if (candidate.length === 0) {
    return candidate;
  }

  const byId = await tx.externalProducer.findUnique({
    where: { id: candidate },
  });
  if (byId) {
    return byId.id;
  }

  const byExternalId = await tx.externalProducer.findUnique({
    where: {
      connectionId_externalId: {
        connectionId,
        externalId: candidate,
      },
    },
  });
  if (byExternalId) {
    return byExternalId.id;
  }

  const now = new Date();
  const created = await tx.externalProducer.create({
    data: {
      connectionId,
      externalId: candidate,
      name: `External Producer ${candidate}`,
      fetchedAt: now,
    },
  });
  return created.id;
};

const resolveExternalProducerRefMongo = async (
  connectionId: string,
  externalProducerId: string
): Promise<string> => {
  await ensureMongoProducerMappingIndexes();
  const db = await getMongoDb();
  const collection = db.collection<MongoExternalProducerDoc>(
    EXTERNAL_PRODUCER_COLLECTION
  );

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

const ensureInternalProducerRefPrisma = async (
  tx: Prisma.TransactionClient,
  internalProducerId: string
): Promise<void> => {
  const candidate = internalProducerId.trim();
  if (candidate.length === 0) {
    return;
  }

  const existingById = await tx.producer.findUnique({
    where: { id: candidate },
    select: { id: true },
  });
  if (existingById) {
    return;
  }

  const producerRepository = await getProducerRepository();
  const sourceProducer = await producerRepository
    .getProducerById(candidate)
    .catch(() => null);

  const baseName =
    sourceProducer?.name?.trim() || buildFallbackProducerName(candidate);
  const website = sourceProducer?.website ?? null;
  const fallbackSuffix = candidate.slice(-6) || 'mapped';

  const candidateNames = [
    baseName,
    `${baseName} (${fallbackSuffix})`,
    `${baseName} (${fallbackSuffix}-2)`,
  ];

  for (const name of candidateNames) {
    try {
      await tx.producer.create({
        data: {
          id: candidate,
          name,
          website,
        },
      });
      return;
    } catch (error: unknown) {
      if (!isPrismaKnownRequestError(error)) {
        throw error;
      }

      if (error.code === 'P2002') {
        continue;
      }

      if (error.code === 'P2003') {
        continue;
      }

      throw error;
    }
  }

  const maybeCreatedByRace = await tx.producer.findUnique({
    where: { id: candidate },
    select: { id: true },
  });
  if (maybeCreatedByRace) {
    return;
  }

  const forcedName = `${buildFallbackProducerName(candidate)} (${Date.now()})`;
  await tx.producer.create({
    data: {
      id: candidate,
      name: forcedName,
      website,
    },
  });
};

const ensureInternalProducerRefMongo = async (
  internalProducerId: string
): Promise<void> => {
  const candidate = internalProducerId.trim();
  if (candidate.length === 0) {
    return;
  }

  const db = await getMongoDb();
  const collection = db.collection<MongoInternalProducerDoc>(
    INTERNAL_PRODUCER_COLLECTION
  );

  const existing = await collection.findOne({
    $or: ObjectId.isValid(candidate)
      ? [{ id: candidate }, { _id: candidate }, { _id: new ObjectId(candidate) }]
      : [{ id: candidate }, { _id: candidate }],
  });
  if (existing) {
    return;
  }

  const producerRepository = await getProducerRepository();
  const sourceProducer = await producerRepository
    .getProducerById(candidate)
    .catch(() => null);

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
        name:
          sourceProducer?.name?.trim() || buildFallbackProducerName(candidate),
        website: sourceProducer?.website ?? null,
        createdAt: now,
      },
    },
    { upsert: true }
  );
};

const mirrorPrismaMappingsToMongo = async (
  records: EnrichedProducerMapping[]
): Promise<void> => {
  if (records.length === 0) return;

  await ensureMongoProducerMappingIndexes();
  const db = await getMongoDb();
  const mappingCollection = db.collection<MongoProducerMappingDoc>(
    PRODUCER_MAPPING_COLLECTION
  );
  const externalCollection = db.collection<MongoExternalProducerDoc>(
    EXTERNAL_PRODUCER_COLLECTION
  );
  const internalCollection = db.collection<MongoInternalProducerDoc>(
    INTERNAL_PRODUCER_COLLECTION
  );

  for (const record of records) {
    await externalCollection.updateOne(
      {
        connectionId: record.externalProducer.connectionId,
        externalId: record.externalProducer.externalId,
      },
      {
        $set: {
          name: record.externalProducer.name,
          metadata:
            (record.externalProducer.metadata as Record<string, unknown> | null) ??
            null,
          fetchedAt: record.externalProducer.fetchedAt,
          updatedAt: record.externalProducer.updatedAt,
        },
        $setOnInsert: {
          _id: record.externalProducer.id,
          createdAt: record.externalProducer.createdAt,
        },
      },
      { upsert: true }
    );

    await internalCollection.updateOne(
      { id: record.internalProducer.id },
      {
        $set: {
          name: record.internalProducer.name,
          website: record.internalProducer.website ?? null,
          updatedAt: record.internalProducer.updatedAt,
        },
        $setOnInsert: {
          _id: record.internalProducer.id,
          createdAt: record.internalProducer.createdAt,
        },
      },
      { upsert: true }
    );

    await mappingCollection.updateOne(
      {
        connectionId: record.connectionId,
        internalProducerId: record.internalProducerId,
      },
      {
        $set: {
          externalProducerId: record.externalProducer.id,
          isActive: record.isActive,
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

export function getProducerMappingRepository(): ProducerMappingRepository {
  return {
    async create(input: ProducerMappingCreateInput): Promise<ProducerMapping> {
      const provider = await getAppDbProvider();
      if (provider === 'mongodb') {
        await ensureMongoProducerMappingIndexes();
        const db = await getMongoDb();
        const collection = db.collection<MongoProducerMappingDoc>(
          PRODUCER_MAPPING_COLLECTION
        );

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
      }

      return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const resolvedExternalProducerId = await resolveExternalProducerRefPrisma(
          tx,
          input.connectionId,
          input.externalProducerId
        );
        await ensureInternalProducerRefPrisma(tx, input.internalProducerId);

        const record = await tx.producerMapping.create({
          data: {
            connectionId: input.connectionId,
            externalProducerId: resolvedExternalProducerId,
            internalProducerId: input.internalProducerId,
          },
        });
        return mapToRecord(record);
      });
    },

    async update(id: string, input: ProducerMappingUpdateInput): Promise<ProducerMapping> {
      const provider = await getAppDbProvider();
      if (provider === 'mongodb') {
        await ensureMongoProducerMappingIndexes();
        const db = await getMongoDb();
        const collection = db.collection<MongoProducerMappingDoc>(
          PRODUCER_MAPPING_COLLECTION
        );

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
      }

      return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const current = await tx.producerMapping.findUnique({
          where: { id },
          select: { connectionId: true },
        });
        if (!current) {
          throw notFoundError('Producer mapping not found', { mappingId: id });
        }

        const resolvedExternalProducerId =
          input.externalProducerId !== undefined
            ? await resolveExternalProducerRefPrisma(
              tx,
              current.connectionId,
              input.externalProducerId
            )
            : undefined;

        const record = await tx.producerMapping.update({
          where: { id },
          data: {
            ...(resolvedExternalProducerId !== undefined && {
              externalProducerId: resolvedExternalProducerId,
            }),
            ...(input.isActive !== undefined && { isActive: input.isActive }),
          },
        });
        return mapToRecord(record);
      });
    },

    async delete(id: string): Promise<void> {
      const provider = await getAppDbProvider();
      if (provider === 'mongodb') {
        await ensureMongoProducerMappingIndexes();
        const db = await getMongoDb();
        await db
          .collection<MongoProducerMappingDoc>(PRODUCER_MAPPING_COLLECTION)
          .deleteOne(buildMongoIdFilter(id));
        return;
      }

      await prisma.producerMapping.delete({
        where: { id },
      });
    },

    async getById(id: string): Promise<ProducerMapping | null> {
      const provider = await getAppDbProvider();
      if (provider === 'mongodb') {
        await ensureMongoProducerMappingIndexes();
        const db = await getMongoDb();
        const record = await db
          .collection<MongoProducerMappingDoc>(PRODUCER_MAPPING_COLLECTION)
          .findOne(buildMongoIdFilter(id));
        if (record) {
          return mapMongoProducerMappingToRecord(record);
        }

        try {
          const prismaRecord = await prisma.producerMapping.findUnique({
            where: { id },
          });
          return prismaRecord ? mapToRecord(prismaRecord) : null;
        } catch {
          return null;
        }
      }

      const record = await prisma.producerMapping.findUnique({
        where: { id },
      });
      return record ? mapToRecord(record) : null;
    },

    async listByConnection(connectionId: string): Promise<ProducerMappingWithDetails[]> {
      const provider = await getAppDbProvider();
      if (provider === 'mongodb') {
        await ensureMongoProducerMappingIndexes();
        const db = await getMongoDb();
        const mongoRecords = await db
          .collection<MongoProducerMappingDoc>(PRODUCER_MAPPING_COLLECTION)
          .find({ connectionId })
          .toArray();

        if (mongoRecords.length > 0) {
          const details = await hydrateMongoProducerMappingDetails(mongoRecords);
          return details.sort((a, b) =>
            a.internalProducer.name.localeCompare(b.internalProducer.name)
          );
        }

        try {
          const prismaRecords = await prisma.producerMapping.findMany({
            where: { connectionId },
            include: {
              externalProducer: true,
              internalProducer: true,
            },
            orderBy: [{ internalProducer: { name: 'asc' } }],
          });
          if (prismaRecords.length > 0) {
            await mirrorPrismaMappingsToMongo(prismaRecords);
          }
          return prismaRecords.map((record: EnrichedProducerMapping) =>
            toDetails(record)
          );
        } catch {
          return [];
        }
      }

      const records = await prisma.producerMapping.findMany({
        where: { connectionId },
        include: {
          externalProducer: true,
          internalProducer: true,
        },
        orderBy: [{ internalProducer: { name: 'asc' } }],
      });

      return records.map((record: EnrichedProducerMapping) => toDetails(record));
    },

    async getByInternalProducer(
      connectionId: string,
      internalProducerId: string
    ): Promise<ProducerMapping | null> {
      const provider = await getAppDbProvider();
      if (provider === 'mongodb') {
        await ensureMongoProducerMappingIndexes();
        const db = await getMongoDb();
        const record = await db
          .collection<MongoProducerMappingDoc>(PRODUCER_MAPPING_COLLECTION)
          .findOne({ connectionId, internalProducerId });
        if (record) {
          return mapMongoProducerMappingToRecord(record);
        }

        try {
          const prismaRecord = await prisma.producerMapping.findUnique({
            where: {
              connectionId_internalProducerId: {
                connectionId,
                internalProducerId,
              },
            },
          });
          return prismaRecord ? mapToRecord(prismaRecord) : null;
        } catch {
          return null;
        }
      }

      const record = await prisma.producerMapping.findUnique({
        where: {
          connectionId_internalProducerId: {
            connectionId,
            internalProducerId,
          },
        },
      });
      return record ? mapToRecord(record) : null;
    },

    async listByInternalProducerIds(
      connectionId: string,
      internalProducerIds: string[]
    ): Promise<ProducerMappingWithDetails[]> {
      if (internalProducerIds.length === 0) return [];

      const provider = await getAppDbProvider();
      if (provider === 'mongodb') {
        await ensureMongoProducerMappingIndexes();
        const db = await getMongoDb();
        const mongoRecords = await db
          .collection<MongoProducerMappingDoc>(PRODUCER_MAPPING_COLLECTION)
          .find({
            connectionId,
            internalProducerId: { $in: internalProducerIds },
            isActive: true,
          })
          .toArray();

        if (mongoRecords.length > 0) {
          return hydrateMongoProducerMappingDetails(mongoRecords);
        }

        try {
          const prismaRecords = await prisma.producerMapping.findMany({
            where: {
              connectionId,
              internalProducerId: { in: internalProducerIds },
              isActive: true,
            },
            include: {
              externalProducer: true,
              internalProducer: true,
            },
          });
          if (prismaRecords.length > 0) {
            await mirrorPrismaMappingsToMongo(prismaRecords);
          }
          return prismaRecords.map((record: EnrichedProducerMapping) =>
            toDetails(record)
          );
        } catch {
          return [];
        }
      }

      const records = await prisma.producerMapping.findMany({
        where: {
          connectionId,
          internalProducerId: { in: internalProducerIds },
          isActive: true,
        },
        include: {
          externalProducer: true,
          internalProducer: true,
        },
      });

      return records.map((record: EnrichedProducerMapping) => toDetails(record));
    },

    async bulkUpsert(
      connectionId: string,
      mappings: { internalProducerId: string; externalProducerId: string | null }[]
    ): Promise<number> {
      const provider = await getAppDbProvider();
      if (provider === 'mongodb') {
        await ensureMongoProducerMappingIndexes();
        const db = await getMongoDb();
        const collection = db.collection<MongoProducerMappingDoc>(
          PRODUCER_MAPPING_COLLECTION
        );

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
      }

      let count = 0;
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        for (const mapping of mappings) {
          if (mapping.externalProducerId === null) {
            const deactivated = await tx.producerMapping.updateMany({
              where: {
                connectionId,
                internalProducerId: mapping.internalProducerId,
                isActive: true,
              },
              data: { isActive: false },
            });
            count += deactivated.count;
            continue;
          }

          const resolvedExternalProducerId = await resolveExternalProducerRefPrisma(
            tx,
            connectionId,
            mapping.externalProducerId
          );
          await ensureInternalProducerRefPrisma(tx, mapping.internalProducerId);

          await tx.producerMapping.upsert({
            where: {
              connectionId_internalProducerId: {
                connectionId,
                internalProducerId: mapping.internalProducerId,
              },
            },
            create: {
              connectionId,
              internalProducerId: mapping.internalProducerId,
              externalProducerId: resolvedExternalProducerId,
            },
            update: {
              externalProducerId: resolvedExternalProducerId,
              isActive: true,
            },
          });
          count++;
        }
      });
      return count;
    },

    async deleteByConnection(connectionId: string): Promise<number> {
      const provider = await getAppDbProvider();
      if (provider === 'mongodb') {
        await ensureMongoProducerMappingIndexes();
        const db = await getMongoDb();
        const result = await db
          .collection<MongoProducerMappingDoc>(PRODUCER_MAPPING_COLLECTION)
          .deleteMany({ connectionId });
        return result.deletedCount ?? 0;
      }

      const result = await prisma.producerMapping.deleteMany({
        where: { connectionId },
      });
      return result.count;
    },
  };
}
