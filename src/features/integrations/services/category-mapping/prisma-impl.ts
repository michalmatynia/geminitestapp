/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Prisma } from '@prisma/client';
import prisma from '@/shared/lib/db/prisma';
import {
  CategoryMapping,
  CategoryMappingWithDetails,
  CategoryMappingCreateInput,
  CategoryMappingUpdateInput,
} from '@/shared/contracts/integrations';
import { notFoundError } from '@/shared/errors/app-error';
import { normalizeInternalCategoryId, UniqueInternalCategoryScope } from './types';

function mapToRecord(record: {
  id: string;
  connectionId: string;
  externalCategoryId: string;
  internalCategoryId: string | null;
  catalogId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CategoryMapping {
  return {
    id: record.id,
    connectionId: record.connectionId,
    externalCategoryId: record.externalCategoryId,
    internalCategoryId: record.internalCategoryId,
    catalogId: record.catalogId,
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt?.toISOString() ?? null,
  };
}

const buildPrismaUniquenessWhere = (
  scope: UniqueInternalCategoryScope
): Prisma.CategoryMappingWhereInput | null => {
  const normalizedInternalCategoryId = normalizeInternalCategoryId(scope.internalCategoryId);
  if (!normalizedInternalCategoryId) return null;

  const where: Prisma.CategoryMappingWhereInput = {
    connectionId: scope.connectionId,
    catalogId: scope.catalogId,
    internalCategoryId: normalizedInternalCategoryId,
    isActive: true,
  };

  const notConditions: Prisma.CategoryMappingWhereInput[] = [];
  const excludeExternalCategoryId = scope.excludeExternalCategoryId?.trim();
  if (excludeExternalCategoryId) {
    notConditions.push({ externalCategoryId: excludeExternalCategoryId });
  }
  const excludeId = scope.excludeId?.trim();
  if (excludeId) {
    notConditions.push({ id: excludeId });
  }
  if (notConditions.length > 0) {
    where.NOT = notConditions;
  }

  return where;
};

const deactivateCompetingPrismaMappings = async (
  tx: Prisma.TransactionClient,
  scope: UniqueInternalCategoryScope
): Promise<number> => {
  const where = buildPrismaUniquenessWhere(scope);
  if (!where) return 0;
  const result = await tx.categoryMapping.updateMany({
    where,
    data: { isActive: false, updatedAt: new Date() },
  });
  return result.count;
};

export const prismaCategoryMappingImpl = {
  async create(input: CategoryMappingCreateInput): Promise<CategoryMapping> {
    return prisma.$transaction(async (tx) => {
      await deactivateCompetingPrismaMappings(tx, {
        connectionId: input.connectionId,
        catalogId: input.catalogId,
        internalCategoryId: input.internalCategoryId,
        excludeExternalCategoryId: input.externalCategoryId,
      });

      const record = await tx.categoryMapping.create({
        data: {
          connectionId: input.connectionId,
          externalCategoryId: input.externalCategoryId,
          internalCategoryId: input.internalCategoryId,
          catalogId: input.catalogId,
          isActive: true,
        },
      });
      return mapToRecord(record);
    });
  },

  async update(id: string, input: CategoryMappingUpdateInput): Promise<CategoryMapping> {
    return prisma.$transaction(async (tx) => {
      const current = await tx.categoryMapping.findUnique({ where: { id } });
      if (!current) throw notFoundError('Category mapping not found');

      if (input.internalCategoryId !== undefined || input.isActive === true) {
        await deactivateCompetingPrismaMappings(tx, {
          connectionId: current.connectionId,
          catalogId: current.catalogId,
          internalCategoryId: input.internalCategoryId ?? current.internalCategoryId,
          excludeExternalCategoryId: current.externalCategoryId,
          excludeId: id,
        });
      }

      const record = await tx.categoryMapping.update({
        where: { id },
        data: {
          ...(input.internalCategoryId !== undefined && {
            internalCategoryId: input.internalCategoryId,
          }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
      });
      return mapToRecord(record);
    });
  },

  async delete(id: string): Promise<void> {
    try {
      await prisma.categoryMapping.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw notFoundError('Category mapping not found');
      }
      throw error;
    }
  },

  async getById(id: string): Promise<CategoryMapping | null> {
    const record = await prisma.categoryMapping.findUnique({ where: { id } });
    return record ? mapToRecord(record) : null;
  },

  async listByConnection(
    connectionId: string,
    catalogId?: string
  ): Promise<CategoryMappingWithDetails[]> {
    const records = await prisma.categoryMapping.findMany({
      where: {
        connectionId,
        ...(catalogId && { catalogId }),
      },
      include: {
        externalCategory: true,
        internalCategory: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => ({
      ...mapToRecord(record),
      externalCategory: record.externalCategory
        ? {
          ...record.externalCategory,
          fetchedAt: record.externalCategory.fetchedAt.toISOString(),
          createdAt: record.externalCategory.createdAt.toISOString(),
          updatedAt: record.externalCategory.updatedAt.toISOString(),
        }
        : ({
          id: record.externalCategoryId,
          connectionId: record.connectionId,
          externalId: record.externalCategoryId,
          name: `[Missing external category: ${record.externalCategoryId}]`,
          parentExternalId: null,
          path: null,
          depth: 0,
          isLeaf: true,
          metadata: null,
          fetchedAt: record.updatedAt.toISOString(),
          createdAt: record.createdAt.toISOString(),
          updatedAt: record.updatedAt.toISOString(),
        } as any),
      internalCategory: record.internalCategory
        ? {
          ...record.internalCategory,
          createdAt: record.internalCategory.createdAt.toISOString(),
          updatedAt: record.internalCategory.updatedAt.toISOString(),
        }
        : ({
          id: record.internalCategoryId || '',
          name: `[Missing internal category: ${record.internalCategoryId}]`,
          description: null,
          color: null,
          parentId: null,
          catalogId: record.catalogId,
          createdAt: record.createdAt.toISOString(),
          updatedAt: record.updatedAt.toISOString(),
        } as any),
    }));
  },

  async getByExternalCategory(
    connectionId: string,
    externalCategoryId: string,
    catalogId: string
  ): Promise<CategoryMapping | null> {
    const record = await prisma.categoryMapping.findUnique({
      where: {
        connectionId_externalCategoryId_catalogId: {
          connectionId,
          externalCategoryId,
          catalogId,
        },
      },
    });
    return record ? mapToRecord(record) : null;
  },

  async bulkUpsert(
    connectionId: string,
    catalogId: string,
    mappings: { externalCategoryId: string; internalCategoryId: string | null }[]
  ): Promise<number> {
    if (mappings.length === 0) return 0;

    let count = 0;
    await prisma.$transaction(
      async (tx) => {
        for (const m of mappings) {
          await tx.categoryMapping.upsert({
            where: {
              connectionId_externalCategoryId_catalogId: {
                connectionId,
                externalCategoryId: m.externalCategoryId,
                catalogId,
              },
            },
            create: {
              connectionId,
              externalCategoryId: m.externalCategoryId,
              internalCategoryId: m.internalCategoryId,
              catalogId,
              isActive: true,
            },
            update: {
              internalCategoryId: m.internalCategoryId,
              isActive: true,
              updatedAt: new Date(),
            },
          });
          count += 1;
        }
      },
      { timeout: 30000 }
    );

    return count;
  },

  async deleteByConnection(connectionId: string): Promise<number> {
    const result = await prisma.categoryMapping.deleteMany({
      where: { connectionId },
    });
    return result.count;
  },
};
