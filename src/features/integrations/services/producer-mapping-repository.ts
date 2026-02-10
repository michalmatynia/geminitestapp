import { Prisma } from '@prisma/client';

import type {
  ProducerMapping,
  ProducerMappingCreateInput,
  ProducerMappingUpdateInput,
  ProducerMappingWithDetails,
} from '@/features/integrations/types/producer-mapping';
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

export function getProducerMappingRepository(): ProducerMappingRepository {
  return {
    async create(input: ProducerMappingCreateInput): Promise<ProducerMapping> {
      const record = await prisma.producerMapping.create({
        data: {
          connectionId: input.connectionId,
          externalProducerId: input.externalProducerId,
          internalProducerId: input.internalProducerId,
        },
      });
      return mapToRecord(record);
    },

    async update(id: string, input: ProducerMappingUpdateInput): Promise<ProducerMapping> {
      const record = await prisma.producerMapping.update({
        where: { id },
        data: {
          ...(input.externalProducerId !== undefined && {
            externalProducerId: input.externalProducerId,
          }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
      });
      return mapToRecord(record);
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
              externalProducerId: mapping.externalProducerId,
            },
            update: {
              externalProducerId: mapping.externalProducerId,
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
