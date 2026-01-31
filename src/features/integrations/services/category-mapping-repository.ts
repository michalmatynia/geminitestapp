import prisma from "@/shared/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import type {
  CategoryMapping,
  CategoryMappingWithDetails,
  CategoryMappingCreateInput,
  CategoryMappingUpdateInput,
} from "@/features/integrations/types/category-mapping";

export type CategoryMappingRepository = {
  create: (input: CategoryMappingCreateInput) => Promise<CategoryMapping>;
  update: (id: string, input: CategoryMappingUpdateInput) => Promise<CategoryMapping>;
  delete: (id: string) => Promise<void>;
  getById: (id: string) => Promise<CategoryMapping | null>;
  listByConnection: (connectionId: string, catalogId?: string) => Promise<CategoryMappingWithDetails[]>;
  getByExternalCategory: (
    connectionId: string,
    externalCategoryId: string,
    catalogId: string
  ) => Promise<CategoryMapping | null>;
  bulkUpsert: (
    connectionId: string,
    catalogId: string,
    mappings: { externalCategoryId: string; internalCategoryId: string }[]
  ) => Promise<number>;
  deleteByConnection: (connectionId: string) => Promise<number>;
};

function mapToRecord(record: {
  id: string;
  connectionId: string;
  externalCategoryId: string;
  internalCategoryId: string;
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
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function getCategoryMappingRepository(): CategoryMappingRepository {
  return {
    async create(input: CategoryMappingCreateInput): Promise<CategoryMapping> {
      const record = await prisma.categoryMapping.create({
        data: {
          connectionId: input.connectionId,
          externalCategoryId: input.externalCategoryId,
          internalCategoryId: input.internalCategoryId,
          catalogId: input.catalogId,
        },
      });
      return mapToRecord(record);
    },

    async update(id: string, input: CategoryMappingUpdateInput): Promise<CategoryMapping> {
      const record = await prisma.categoryMapping.update({
        where: { id },
        data: {
          ...(input.internalCategoryId !== undefined && {
            internalCategoryId: input.internalCategoryId,
          }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
      });
      return mapToRecord(record);
    },

    async delete(id: string): Promise<void> {
      await prisma.categoryMapping.delete({
        where: { id },
      });
    },

    async getById(id: string): Promise<CategoryMapping | null> {
      const record = await prisma.categoryMapping.findUnique({
        where: { id },
      });
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
        orderBy: [
          { externalCategory: { depth: "asc" } },
          { externalCategory: { name: "asc" } },
        ],
      });

      return records.map((r: any) => ({
        id: r.id,
        connectionId: r.connectionId,
        externalCategoryId: r.externalCategoryId,
        internalCategoryId: r.internalCategoryId,
        catalogId: r.catalogId,
        isActive: r.isActive,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        externalCategory: {
          id: r.externalCategory.id,
          connectionId: r.externalCategory.connectionId,
          externalId: r.externalCategory.externalId,
          name: r.externalCategory.name,
          parentExternalId: r.externalCategory.parentExternalId,
          path: r.externalCategory.path,
          depth: r.externalCategory.depth,
          isLeaf: r.externalCategory.isLeaf,
          metadata: r.externalCategory.metadata as Record<string, unknown> | null,
          fetchedAt: r.externalCategory.fetchedAt,
          createdAt: r.externalCategory.createdAt,
          updatedAt: r.externalCategory.updatedAt,
        },
        internalCategory: {
          id: r.internalCategory.id,
          name: r.internalCategory.name,
          description: r.internalCategory.description,
          color: r.internalCategory.color,
          parentId: r.internalCategory.parentId,
          catalogId: r.internalCategory.catalogId,
          createdAt: r.internalCategory.createdAt,
          updatedAt: r.internalCategory.updatedAt,
        },
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
      mappings: { externalCategoryId: string; internalCategoryId: string }[]
    ): Promise<number> {
      let count = 0;
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        for (const mapping of mappings) {
          await tx.categoryMapping.upsert({
            where: {
              connectionId_externalCategoryId_catalogId: {
                connectionId,
                externalCategoryId: mapping.externalCategoryId,
                catalogId,
              },
            },
            create: {
              connectionId,
              externalCategoryId: mapping.externalCategoryId,
              internalCategoryId: mapping.internalCategoryId,
              catalogId,
            },
            update: {
              internalCategoryId: mapping.internalCategoryId,
            },
          });
          count++;
        }
      });
      return count;
    },

    async deleteByConnection(connectionId: string): Promise<number> {
      const result = await prisma.categoryMapping.deleteMany({
        where: { connectionId },
      });
      return result.count;
    },
  };
}
