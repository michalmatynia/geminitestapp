import { randomUUID } from 'crypto';

import { Prisma } from '@prisma/client';
import { ObjectId, type Filter } from 'mongodb';

import type {
  ExternalCategory,
  ExternalCategoryWithChildren,
  ExternalCategorySyncInput,
  BaseCategory,
} from '@/shared/contracts/integrations';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
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
  fetchedAt: doc.fetchedAt.toISOString(),
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

type MongoExternalCategoryDoc = {
  _id: ObjectId | string;
  connectionId: string;
  externalId: string;
  name: string;
  parentExternalId: string | null;
  path: string | null;
  depth: number;
  isLeaf: boolean;
  metadata?: Record<string, unknown> | null;
  fetchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

const EXTERNAL_CATEGORY_COLLECTION = 'external_categories';
let mongoExternalCategoryIndexesReady: Promise<void> | null = null;

const ensureMongoExternalCategoryIndexes = async (): Promise<void> => {
  if (!mongoExternalCategoryIndexesReady) {
    mongoExternalCategoryIndexesReady = (async () => {
      const db = await getMongoDb();
      const collection = db.collection<MongoExternalCategoryDoc>(EXTERNAL_CATEGORY_COLLECTION);
      await Promise.all([
        collection.createIndex(
          { connectionId: 1, externalId: 1 },
          { unique: true, name: 'external_categories_connection_external_unique' }
        ),
        collection.createIndex(
          { connectionId: 1, depth: 1, name: 1 },
          { name: 'external_categories_connection_depth_name' }
        ),
        collection.createIndex(
          { connectionId: 1, parentExternalId: 1 },
          { name: 'external_categories_connection_parent' }
        ),
      ]);
    })();
  }
  await mongoExternalCategoryIndexesReady;
};

const toMongoRecord = (doc: MongoExternalCategoryDoc): ExternalCategory => ({
  id: doc._id.toString(),
  connectionId: doc.connectionId,
  externalId: doc.externalId,
  name: doc.name,
  parentExternalId: doc.parentExternalId ?? null,
  path: doc.path ?? null,
  depth: doc.depth ?? 0,
  isLeaf: Boolean(doc.isLeaf),
  metadata: doc.metadata ?? null,
  fetchedAt: doc.fetchedAt.toISOString(),
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

const buildMongoIdFilter = (id: string): Filter<MongoExternalCategoryDoc> => {
  if (ObjectId.isValid(id)) {
    return { $or: [{ _id: id }, { _id: new ObjectId(id) }] } as Filter<MongoExternalCategoryDoc>;
  }
  return { _id: id } as Filter<MongoExternalCategoryDoc>;
};

const mirrorPrismaRecordsToMongo = async (records: ExternalCategoryDoc[]): Promise<void> => {
  if (records.length === 0) return;
  await ensureMongoExternalCategoryIndexes();
  const db = await getMongoDb();
  const collection = db.collection<MongoExternalCategoryDoc>(EXTERNAL_CATEGORY_COLLECTION);
  for (const record of records) {
    await collection.updateOne(
      {
        connectionId: record.connectionId,
        externalId: record.externalId,
      },
      {
        $set: {
          name: record.name,
          parentExternalId: record.parentExternalId ?? null,
          path: record.path ?? null,
          depth: record.depth,
          isLeaf: record.isLeaf,
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

      const provider = await getAppDbProvider();
      let count = 0;

      if (provider === 'mongodb') {
        await ensureMongoExternalCategoryIndexes();
        const db = await getMongoDb();
        const collection = db.collection<MongoExternalCategoryDoc>(EXTERNAL_CATEGORY_COLLECTION);

        for (const input of syncInputs) {
          await collection.updateOne(
            {
              connectionId: input.connectionId,
              externalId: input.externalId,
            },
            {
              $set: {
                name: input.name,
                parentExternalId: input.parentExternalId ?? null,
                path: input.path ?? null,
                depth: input.depth,
                isLeaf: input.isLeaf,
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

      // Upsert all categories in a transaction
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
      const provider = await getAppDbProvider();
      if (provider === 'mongodb') {
        await ensureMongoExternalCategoryIndexes();
        const db = await getMongoDb();
        const mongoRecords = await db
          .collection<MongoExternalCategoryDoc>(EXTERNAL_CATEGORY_COLLECTION)
          .find({ connectionId })
          .sort({ depth: 1, name: 1 })
          .toArray();
        if (mongoRecords.length > 0) {
          return mongoRecords.map((r: MongoExternalCategoryDoc) => toMongoRecord(r));
        }

        try {
          const prismaRecords = await prisma.externalCategory.findMany({
            where: { connectionId },
            orderBy: [{ depth: 'asc' }, { name: 'asc' }],
          });
          if (prismaRecords.length > 0) {
            await mirrorPrismaRecordsToMongo(prismaRecords);
          }
          return prismaRecords.map((r: ExternalCategoryDoc) => toRecord(r));
        } catch {
          return [];
        }
      }

      const records = await prisma.externalCategory.findMany({
        where: { connectionId },
        orderBy: [{ depth: 'asc' }, { name: 'asc' }],
      });

      return records.map((r: ExternalCategoryDoc) => toRecord(r));
    },

    async getTreeByConnection(connectionId: string): Promise<ExternalCategoryWithChildren[]> {
      const categories = await this.listByConnection(connectionId);

      return buildTree(categories, null);
    },

    async getById(id: string): Promise<ExternalCategory | null> {
      const provider = await getAppDbProvider();
      if (provider === 'mongodb') {
        await ensureMongoExternalCategoryIndexes();
        const db = await getMongoDb();
        const mongoRecord = await db
          .collection<MongoExternalCategoryDoc>(EXTERNAL_CATEGORY_COLLECTION)
          .findOne(buildMongoIdFilter(id));

        if (mongoRecord) return toMongoRecord(mongoRecord);

        try {
          const prismaRecord = await prisma.externalCategory.findUnique({
            where: { id },
          });
          if (!prismaRecord) return null;
          await mirrorPrismaRecordsToMongo([prismaRecord]);
          return toRecord(prismaRecord);
        } catch {
          return null;
        }
      }

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
      const provider = await getAppDbProvider();
      if (provider === 'mongodb') {
        await ensureMongoExternalCategoryIndexes();
        const db = await getMongoDb();
        const mongoRecord = await db
          .collection<MongoExternalCategoryDoc>(EXTERNAL_CATEGORY_COLLECTION)
          .findOne({
            connectionId,
            externalId,
          });

        if (mongoRecord) return toMongoRecord(mongoRecord);

        try {
          const prismaRecord = await prisma.externalCategory.findUnique({
            where: {
              connectionId_externalId: { connectionId, externalId },
            },
          });
          if (!prismaRecord) return null;
          await mirrorPrismaRecordsToMongo([prismaRecord]);
          return toRecord(prismaRecord);
        } catch {
          return null;
        }
      }

      const record = await prisma.externalCategory.findUnique({
        where: {
          connectionId_externalId: { connectionId, externalId },
        },
      });

      if (!record) return null;

      return toRecord(record);
    },

    async deleteByConnection(connectionId: string): Promise<number> {
      const provider = await getAppDbProvider();
      if (provider === 'mongodb') {
        await ensureMongoExternalCategoryIndexes();
        const db = await getMongoDb();
        const result = await db
          .collection<MongoExternalCategoryDoc>(EXTERNAL_CATEGORY_COLLECTION)
          .deleteMany({ connectionId });
        return result.deletedCount ?? 0;
      }

      const result = await prisma.externalCategory.deleteMany({
        where: { connectionId },
      });
      return result.count;
    },
  };
}
