import { Prisma } from '@prisma/client';

import type {
  ProducerMapping,
  ProducerMappingCreateInput,
  ProducerMappingUpdateInput,
  ProducerMappingWithDetails,
} from '@/features/integrations/types/producer-mapping';
import { getProducerRepository } from '@/features/products/services/producer-repository';
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
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
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
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
  externalProducer: {
    id: record.externalProducer.id,
    connectionId: record.externalProducer.connectionId,
    externalId: record.externalProducer.externalId,
    name: record.externalProducer.name,
    metadata: record.externalProducer.metadata as Record<string, unknown> | null,
    fetchedAt: record.externalProducer.fetchedAt,
    createdAt: record.externalProducer.createdAt,
    updatedAt: record.externalProducer.updatedAt,
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

const resolveExternalProducerRef = async (
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

const ensureInternalProducerRef = async (
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

export function getProducerMappingRepository(): ProducerMappingRepository {
  return {
    async create(input: ProducerMappingCreateInput): Promise<ProducerMapping> {
      return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const resolvedExternalProducerId = await resolveExternalProducerRef(
          tx,
          input.connectionId,
          input.externalProducerId
        );
        await ensureInternalProducerRef(tx, input.internalProducerId);

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
      return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const current = await tx.producerMapping.findUnique({
          where: { id },
          select: { connectionId: true },
        });
        if (!current) {
          throw new Error('Producer mapping not found');
        }

        const resolvedExternalProducerId =
          input.externalProducerId !== undefined
            ? await resolveExternalProducerRef(
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
      await prisma.producerMapping.delete({
        where: { id },
      });
    },

    async getById(id: string): Promise<ProducerMapping | null> {
      const record = await prisma.producerMapping.findUnique({
        where: { id },
      });
      return record ? mapToRecord(record) : null;
    },

    async listByConnection(connectionId: string): Promise<ProducerMappingWithDetails[]> {
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

          const resolvedExternalProducerId = await resolveExternalProducerRef(
            tx,
            connectionId,
            mapping.externalProducerId
          );
          await ensureInternalProducerRef(tx, mapping.internalProducerId);

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
      const result = await prisma.producerMapping.deleteMany({
        where: { connectionId },
      });
      return result.count;
    },
  };
}
