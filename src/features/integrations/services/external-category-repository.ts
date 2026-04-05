import { randomUUID } from 'crypto';

import { ObjectId, type Filter } from 'mongodb';

import type { ExternalCategory, ExternalCategoryWithChildren, ExternalCategorySyncInput, BaseCategory } from '@/shared/contracts/integrations/listings';
import type { ExternalCategoryRepository } from '@/shared/contracts/integrations/repositories';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

function buildCategoryPath(categoryId: string, categoriesById: Map<string, BaseCategory>): string {
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

function calculateDepth(categoryId: string, categoriesById: Map<string, BaseCategory>): number {
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
    .sort((a: ExternalCategoryWithChildren, b: ExternalCategoryWithChildren) =>
      a.name.localeCompare(b.name)
    );
}

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

export function getExternalCategoryRepository(): ExternalCategoryRepository {
  const listByConnection = async (connectionId: string): Promise<ExternalCategory[]> => {
    await ensureMongoExternalCategoryIndexes();
    const db = await getMongoDb();
    const records = await db
      .collection<MongoExternalCategoryDoc>(EXTERNAL_CATEGORY_COLLECTION)
      .find({ connectionId })
      .sort({ depth: 1, name: 1 })
      .toArray();

    return records.map((record: MongoExternalCategoryDoc) => toMongoRecord(record));
  };

  return {
    async syncFromBase(connectionId: string, categories: BaseCategory[]): Promise<number> {
      const categoriesById = new Map<string, BaseCategory>();
      for (const cat of categories) {
        categoriesById.set(cat.id, cat);
      }

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

      await ensureMongoExternalCategoryIndexes();
      const db = await getMongoDb();
      const collection = db.collection<MongoExternalCategoryDoc>(EXTERNAL_CATEGORY_COLLECTION);

      let count = 0;
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
    },

    listByConnection,

    async getTreeByConnection(connectionId: string): Promise<ExternalCategoryWithChildren[]> {
      const categories = await listByConnection(connectionId);
      return buildTree(categories, null);
    },

    async getById(id: string): Promise<ExternalCategory | null> {
      await ensureMongoExternalCategoryIndexes();
      const db = await getMongoDb();
      const record = await db
        .collection<MongoExternalCategoryDoc>(EXTERNAL_CATEGORY_COLLECTION)
        .findOne(buildMongoIdFilter(id));
      return record ? toMongoRecord(record) : null;
    },

    async getByExternalId(
      connectionId: string,
      externalId: string
    ): Promise<ExternalCategory | null> {
      await ensureMongoExternalCategoryIndexes();
      const db = await getMongoDb();
      const record = await db
        .collection<MongoExternalCategoryDoc>(EXTERNAL_CATEGORY_COLLECTION)
        .findOne({ connectionId, externalId });
      return record ? toMongoRecord(record) : null;
    },

    async deleteByConnection(connectionId: string): Promise<number> {
      await ensureMongoExternalCategoryIndexes();
      const db = await getMongoDb();
      const result = await db
        .collection<MongoExternalCategoryDoc>(EXTERNAL_CATEGORY_COLLECTION)
        .deleteMany({ connectionId });
      return result.deletedCount ?? 0;
    },
  };
}
