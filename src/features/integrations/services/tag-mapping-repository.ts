import { Prisma } from '@prisma/client';

import type {
  TagMapping,
  TagMappingCreateInput,
  TagMappingUpdateInput,
  TagMappingWithDetails,
} from '@/features/integrations/types/tag-mapping';
import prisma from '@/shared/lib/db/prisma';

export type TagMappingRepository = {
  create: (input: TagMappingCreateInput) => Promise<TagMapping>;
  update: (id: string, input: TagMappingUpdateInput) => Promise<TagMapping>;
  delete: (id: string) => Promise<void>;
  getById: (id: string) => Promise<TagMapping | null>;
  listByConnection: (connectionId: string) => Promise<TagMappingWithDetails[]>;
  getByInternalTag: (
    connectionId: string,
    internalTagId: string
  ) => Promise<TagMapping | null>;
  listByInternalTagIds: (
    connectionId: string,
    internalTagIds: string[]
  ) => Promise<TagMappingWithDetails[]>;
  listByExternalTagIds: (
    connectionId: string,
    externalTagIds: string[]
  ) => Promise<TagMappingWithDetails[]>;
  bulkUpsert: (
    connectionId: string,
    mappings: { internalTagId: string; externalTagId: string | null }[]
  ) => Promise<number>;
  deleteByConnection: (connectionId: string) => Promise<number>;
};

function mapToRecord(record: {
  id: string;
  connectionId: string;
  externalTagId: string;
  internalTagId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): TagMapping {
  return {
    id: record.id,
    connectionId: record.connectionId,
    externalTagId: record.externalTagId,
    internalTagId: record.internalTagId,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

type EnrichedTagMapping = Prisma.TagMappingGetPayload<{
  include: {
    externalTag: true;
    internalTag: true;
  };
}>;

const toDetails = (record: EnrichedTagMapping): TagMappingWithDetails => ({
  id: record.id,
  connectionId: record.connectionId,
  externalTagId: record.externalTagId,
  internalTagId: record.internalTagId,
  isActive: record.isActive,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
  externalTag: {
    id: record.externalTag.id,
    connectionId: record.externalTag.connectionId,
    externalId: record.externalTag.externalId,
    name: record.externalTag.name,
    metadata: record.externalTag.metadata as Record<string, unknown> | null,
    fetchedAt: record.externalTag.fetchedAt,
    createdAt: record.externalTag.createdAt,
    updatedAt: record.externalTag.updatedAt,
  },
  internalTag: {
    id: record.internalTag.id,
    name: record.internalTag.name,
    color: record.internalTag.color ?? null,
    catalogId: record.internalTag.catalogId,
    createdAt: record.internalTag.createdAt.toISOString(),
    updatedAt: record.internalTag.updatedAt.toISOString(),
  },
});

export function getTagMappingRepository(): TagMappingRepository {
  return {
    async create(input: TagMappingCreateInput): Promise<TagMapping> {
      const record = await prisma.tagMapping.create({
        data: {
          connectionId: input.connectionId,
          externalTagId: input.externalTagId,
          internalTagId: input.internalTagId,
        },
      });
      return mapToRecord(record);
    },

    async update(id: string, input: TagMappingUpdateInput): Promise<TagMapping> {
      const record = await prisma.tagMapping.update({
        where: { id },
        data: {
          ...(input.externalTagId !== undefined && {
            externalTagId: input.externalTagId,
          }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
      });
      return mapToRecord(record);
    },

    async delete(id: string): Promise<void> {
      await prisma.tagMapping.delete({
        where: { id },
      });
    },

    async getById(id: string): Promise<TagMapping | null> {
      const record = await prisma.tagMapping.findUnique({
        where: { id },
      });
      return record ? mapToRecord(record) : null;
    },

    async listByConnection(connectionId: string): Promise<TagMappingWithDetails[]> {
      const records = await prisma.tagMapping.findMany({
        where: { connectionId },
        include: {
          externalTag: true,
          internalTag: true,
        },
        orderBy: [{ internalTag: { name: 'asc' } }],
      });

      return records.map((record: EnrichedTagMapping) => toDetails(record));
    },

    async getByInternalTag(
      connectionId: string,
      internalTagId: string
    ): Promise<TagMapping | null> {
      const record = await prisma.tagMapping.findUnique({
        where: {
          connectionId_internalTagId: {
            connectionId,
            internalTagId,
          },
        },
      });
      return record ? mapToRecord(record) : null;
    },

    async listByInternalTagIds(
      connectionId: string,
      internalTagIds: string[]
    ): Promise<TagMappingWithDetails[]> {
      if (internalTagIds.length === 0) return [];

      const records = await prisma.tagMapping.findMany({
        where: {
          connectionId,
          internalTagId: { in: internalTagIds },
          isActive: true,
        },
        include: {
          externalTag: true,
          internalTag: true,
        },
      });

      return records.map((record: EnrichedTagMapping) => toDetails(record));
    },

    async listByExternalTagIds(
      connectionId: string,
      externalTagIds: string[]
    ): Promise<TagMappingWithDetails[]> {
      if (externalTagIds.length === 0) return [];

      const records = await prisma.tagMapping.findMany({
        where: {
          connectionId,
          isActive: true,
          externalTag: {
            externalId: {
              in: externalTagIds,
            },
          },
        },
        include: {
          externalTag: true,
          internalTag: true,
        },
      });

      return records.map((record: EnrichedTagMapping) => toDetails(record));
    },

    async bulkUpsert(
      connectionId: string,
      mappings: { internalTagId: string; externalTagId: string | null }[]
    ): Promise<number> {
      let count = 0;
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        for (const mapping of mappings) {
          if (mapping.externalTagId === null) {
            const deactivated = await tx.tagMapping.updateMany({
              where: {
                connectionId,
                internalTagId: mapping.internalTagId,
                isActive: true,
              },
              data: { isActive: false },
            });
            count += deactivated.count;
            continue;
          }

          await tx.tagMapping.upsert({
            where: {
              connectionId_internalTagId: {
                connectionId,
                internalTagId: mapping.internalTagId,
              },
            },
            create: {
              connectionId,
              internalTagId: mapping.internalTagId,
              externalTagId: mapping.externalTagId,
            },
            update: {
              externalTagId: mapping.externalTagId,
              isActive: true,
            },
          });
          count++;
        }
      });
      return count;
    },

    async deleteByConnection(connectionId: string): Promise<number> {
      const result = await prisma.tagMapping.deleteMany({
        where: { connectionId },
      });
      return result.count;
    },
  };
}
