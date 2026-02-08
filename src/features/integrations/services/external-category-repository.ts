import { Prisma } from '@prisma/client';

import type {
  ExternalCategory,
  ExternalCategoryWithChildren,
  ExternalCategorySyncInput,
  BaseCategory,
} from '@/features/integrations/types/category-mapping';
import prisma from '@/shared/lib/db/prisma';

export type ExternalCategoryRepository = {
  syncFromBase: (connectionId: string, categories: BaseCategory[]) => Promise<number>;
  listByConnection: (connectionId: string) => Promise<ExternalCategory[]>;
  getTreeByConnection: (connectionId: string) => Promise<ExternalCategoryWithChildren[]>;
  getById: (id: string) => Promise<ExternalCategory | null>;
  getByExternalId: (connectionId: string, externalId: string) => Promise<ExternalCategory | null>;
  deleteByConnection: (connectionId: string) => Promise<number>;
};

/**
 * Builds a full path string for a category based on its parent chain.
 */
function buildCategoryPath(
  categoryId: string,
  categoriesById: Map<string, BaseCategory>
): string {
  const parts: string[] = [];
  let currentId: string | null = categoryId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const cat = categoriesById.get(currentId);
    if (!cat) break;
    parts.unshift(cat.name);
    currentId = cat.parentId;
  }

  return parts.join(' > ');
}

/**
 * Calculates the depth of a category in the hierarchy.
 */
function calculateDepth(
  categoryId: string,
  categoriesById: Map<string, BaseCategory>
): number {
  let depth = 0;
  let currentId: string | null = categoryId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const cat = categoriesById.get(currentId);
    if (!cat?.parentId) break;
    depth++;
    currentId = cat.parentId;
  }

  return depth;
}

/**
 * Determines if a category is a leaf (has no children).
 */
function isLeafCategory(categoryId: string, categories: BaseCategory[]): boolean {
  return !categories.some((cat: BaseCategory) => cat.parentId === categoryId);
}

function buildTree(
  categories: ExternalCategory[],
  parentExternalId: string | null = null
): ExternalCategoryWithChildren[] {
  return categories
    .filter((cat: ExternalCategory) => cat.parentExternalId === parentExternalId)
    .map((cat: ExternalCategory) => ({
      ...cat,
      children: buildTree(categories, cat.externalId),
    }))
    .sort((a: ExternalCategoryWithChildren, b: ExternalCategoryWithChildren) => a.name.localeCompare(b.name));
}

type ExternalCategoryDoc = Prisma.ExternalCategoryGetPayload<Record<string, never>>;

const toRecord = (doc: ExternalCategoryDoc): ExternalCategory => ({
  id: doc.id,
  connectionId: doc.connectionId,
  externalId: doc.externalId,
  name: doc.name,
  parentExternalId: doc.parentExternalId,
  path: doc.path,
  depth: doc.depth,
  isLeaf: doc.isLeaf,
  metadata: doc.metadata as Record<string, unknown> | null,
  fetchedAt: doc.fetchedAt,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export function getExternalCategoryRepository(): ExternalCategoryRepository {
  return {
    async syncFromBase(connectionId: string, categories: BaseCategory[]): Promise<number> {
      // Build lookup map for path calculation
      const categoriesById = new Map<string, BaseCategory>();
      for (const cat of categories) {
        categoriesById.set(cat.id, cat);
      }

      // Prepare upsert data
      const now = new Date();
      const syncInputs: ExternalCategorySyncInput[] = categories.map((cat: BaseCategory) => ({
        connectionId,
        externalId: cat.id,
        name: cat.name,
        parentExternalId: cat.parentId,
        path: buildCategoryPath(cat.id, categoriesById),
        depth: calculateDepth(cat.id, categoriesById),
        isLeaf: isLeafCategory(cat.id, categories),
      }));

      // Upsert all categories in a transaction
      let count = 0;
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        for (const input of syncInputs) {
          await tx.externalCategory.upsert({
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
              parentExternalId: input.parentExternalId,
              path: input.path,
              depth: input.depth,
              isLeaf: input.isLeaf,
              fetchedAt: now,
            },
            update: {
              name: input.name,
              parentExternalId: input.parentExternalId,
              path: input.path,
              depth: input.depth,
              isLeaf: input.isLeaf,
              fetchedAt: now,
            },
          });
          count++;
        }
      });

      return count;
    },

    async listByConnection(connectionId: string): Promise<ExternalCategory[]> {
      const records = await prisma.externalCategory.findMany({
        where: { connectionId },
        orderBy: [{ depth: 'asc' }, { name: 'asc' }],
      });

      return records.map((r: ExternalCategoryDoc) => toRecord(r));
    },

    async getTreeByConnection(connectionId: string): Promise<ExternalCategoryWithChildren[]> {
      const records = await prisma.externalCategory.findMany({
        where: { connectionId },
        orderBy: [{ depth: 'asc' }, { name: 'asc' }],
      });

      const categories: ExternalCategory[] = records.map((r: ExternalCategoryDoc) => toRecord(r));

      return buildTree(categories, null);
    },

    async getById(id: string): Promise<ExternalCategory | null> {
      const record = await prisma.externalCategory.findUnique({
        where: { id },
      });

      if (!record) return null;

      return toRecord(record);
    },

    async getByExternalId(
      connectionId: string,
      externalId: string
    ): Promise<ExternalCategory | null> {
      const record = await prisma.externalCategory.findUnique({
        where: {
          connectionId_externalId: { connectionId, externalId },
        },
      });

      if (!record) return null;

      return toRecord(record);
    },

    async deleteByConnection(connectionId: string): Promise<number> {
      const result = await prisma.externalCategory.deleteMany({
        where: { connectionId },
      });
      return result.count;
    },
  };
}