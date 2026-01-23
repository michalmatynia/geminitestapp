import prisma from "@/lib/prisma";
import type {
  ExternalCategory,
  ExternalCategoryWithChildren,
  ExternalCategorySyncInput,
  BaseCategory,
} from "@/types/category-mapping";

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

  return parts.join(" > ");
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
    if (!cat || !cat.parentId) break;
    depth++;
    currentId = cat.parentId;
  }

  return depth;
}

/**
 * Determines if a category is a leaf (has no children).
 */
function isLeafCategory(categoryId: string, categories: BaseCategory[]): boolean {
  return !categories.some((cat) => cat.parentId === categoryId);
}

function buildTree(
  categories: ExternalCategory[],
  parentExternalId: string | null = null
): ExternalCategoryWithChildren[] {
  return categories
    .filter((cat) => cat.parentExternalId === parentExternalId)
    .map((cat) => ({
      ...cat,
      children: buildTree(categories, cat.externalId),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getExternalCategoryRepository(): Promise<ExternalCategoryRepository> {
  return {
    async syncFromBase(connectionId: string, categories: BaseCategory[]): Promise<number> {
      // Build lookup map for path calculation
      const categoriesById = new Map<string, BaseCategory>();
      for (const cat of categories) {
        categoriesById.set(cat.id, cat);
      }

      // Prepare upsert data
      const now = new Date();
      const syncInputs: ExternalCategorySyncInput[] = categories.map((cat) => ({
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
      await prisma.$transaction(async (tx) => {
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
        orderBy: [{ depth: "asc" }, { name: "asc" }],
      });

      return records.map((r) => ({
        id: r.id,
        connectionId: r.connectionId,
        externalId: r.externalId,
        name: r.name,
        parentExternalId: r.parentExternalId,
        path: r.path,
        depth: r.depth,
        isLeaf: r.isLeaf,
        metadata: r.metadata as Record<string, unknown> | null,
        fetchedAt: r.fetchedAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));
    },

    async getTreeByConnection(connectionId: string): Promise<ExternalCategoryWithChildren[]> {
      const categories = await this.listByConnection(connectionId);
      return buildTree(categories, null);
    },

    async getById(id: string): Promise<ExternalCategory | null> {
      const record = await prisma.externalCategory.findUnique({
        where: { id },
      });

      if (!record) return null;

      return {
        id: record.id,
        connectionId: record.connectionId,
        externalId: record.externalId,
        name: record.name,
        parentExternalId: record.parentExternalId,
        path: record.path,
        depth: record.depth,
        isLeaf: record.isLeaf,
        metadata: record.metadata as Record<string, unknown> | null,
        fetchedAt: record.fetchedAt,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
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

      return {
        id: record.id,
        connectionId: record.connectionId,
        externalId: record.externalId,
        name: record.name,
        parentExternalId: record.parentExternalId,
        path: record.path,
        depth: record.depth,
        isLeaf: record.isLeaf,
        metadata: record.metadata as Record<string, unknown> | null,
        fetchedAt: record.fetchedAt,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    },

    async deleteByConnection(connectionId: string): Promise<number> {
      const result = await prisma.externalCategory.deleteMany({
        where: { connectionId },
      });
      return result.count;
    },
  };
}
