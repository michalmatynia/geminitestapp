import { randomUUID } from 'crypto';

import { ObjectId, type Filter } from 'mongodb';

import type { ExternalCategory, ExternalCategoryWithChildren, ExternalCategorySyncInput, BaseCategory } from '@/shared/contracts/integrations/listings';
import type { ExternalCategoryRepository } from '@/shared/contracts/integrations/repositories';
import { getMongoDb } from '@/shared/lib/db/product-mongo-client';
import { INTEGRATION_COLLECTION, INTEGRATION_CONNECTION_COLLECTION } from '@/shared/lib/integration-repository/common';
import { normalizeIntegrationSlug, TRADERA_BROWSER_INTEGRATION_SLUG } from '@/shared/lib/integration-slugs';

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

type MongoIntegrationDoc = {
  _id: ObjectId | string;
  id?: string | null;
  slug?: string | null;
};

type MongoIntegrationConnectionDoc = {
  _id: ObjectId | string;
  id?: string | null;
  integrationId: string;
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

const compareCategoryFreshness = (
  left: MongoExternalCategoryDoc,
  right: MongoExternalCategoryDoc
): number => {
  const leftFetchedAt = left.fetchedAt.getTime();
  const rightFetchedAt = right.fetchedAt.getTime();
  if (leftFetchedAt !== rightFetchedAt) return leftFetchedAt - rightFetchedAt;

  const leftUpdatedAt = left.updatedAt.getTime();
  const rightUpdatedAt = right.updatedAt.getTime();
  return leftUpdatedAt - rightUpdatedAt;
};

const dedupeCategoriesByExternalId = (
  records: MongoExternalCategoryDoc[]
): MongoExternalCategoryDoc[] => {
  const byExternalId = new Map<string, MongoExternalCategoryDoc>();

  for (const record of records) {
    const key = record.externalId.trim();
    if (key.length === 0) continue;

    const current = byExternalId.get(key);
    if (current === undefined || compareCategoryFreshness(record, current) > 0) {
      byExternalId.set(key, record);
    }
  }

  return Array.from(byExternalId.values()).sort((left, right) => {
    if (left.depth !== right.depth) return left.depth - right.depth;
    return left.name.localeCompare(right.name);
  });
};

const buildMongoIdFilter = (id: string): Filter<MongoExternalCategoryDoc> => {
  if (ObjectId.isValid(id)) {
    return { $or: [{ _id: id }, { _id: new ObjectId(id) }] } as Filter<MongoExternalCategoryDoc>;
  }
  return { _id: id } as Filter<MongoExternalCategoryDoc>;
};

const toDocumentIdCandidates = (id: string): Array<string | ObjectId> => {
  if (ObjectId.isValid(id) && id.length === 24) {
    return [id, new ObjectId(id)];
  }
  return [id];
};

export const loadMarketplaceCategoryConnectionIds = async (
  marketplaceSlug: string
): Promise<string[]> => {
  const normalizedSlug = normalizeIntegrationSlug(marketplaceSlug);
  if (normalizedSlug !== TRADERA_BROWSER_INTEGRATION_SLUG) {
    return [];
  }

  const db = await getMongoDb();
  const integrations = await db
    .collection<MongoIntegrationDoc>(INTEGRATION_COLLECTION)
    .find({ slug: normalizedSlug }, { projection: { _id: 1, id: 1 } })
    .toArray();

  const integrationIds = [
    ...new Set(
      integrations.flatMap((integration) => {
        const ids = [integration._id.toString()];
        const explicitId = integration.id?.trim();
        if (explicitId !== null && explicitId !== undefined && explicitId.length > 0) {
          ids.push(explicitId);
        }
        return ids;
      })
    ),
  ];

  if (integrationIds.length === 0) {
    return [];
  }

  const integrationIdCandidates = integrationIds.flatMap(toDocumentIdCandidates);
  const connections = await db
    .collection<MongoIntegrationConnectionDoc>(INTEGRATION_CONNECTION_COLLECTION)
    .find(
      { integrationId: { $in: integrationIdCandidates } } as Filter<MongoIntegrationConnectionDoc>,
      { projection: { _id: 1, id: 1 } }
    )
    .toArray();

  return [
    ...new Set(
      connections.flatMap((connection) => {
        const ids = [connection._id.toString()];
        const explicitId = connection.id?.trim();
        if (explicitId !== null && explicitId !== undefined && explicitId.length > 0) {
          ids.push(explicitId);
        }
        return ids;
      })
    ),
  ];
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

  const listByMarketplace = async (marketplaceSlug: string): Promise<ExternalCategory[]> => {
    await ensureMongoExternalCategoryIndexes();
    const connectionIds = await loadMarketplaceCategoryConnectionIds(marketplaceSlug);
    if (connectionIds.length === 0) {
      return [];
    }

    const db = await getMongoDb();
    const records = await db
      .collection<MongoExternalCategoryDoc>(EXTERNAL_CATEGORY_COLLECTION)
      .find({ connectionId: { $in: connectionIds } } as Filter<MongoExternalCategoryDoc>)
      .sort({ depth: 1, name: 1 })
      .toArray();

    return dedupeCategoriesByExternalId(records).map((record: MongoExternalCategoryDoc) =>
      toMongoRecord(record)
    );
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
        metadata: cat.metadata ?? undefined,
      }));

      await ensureMongoExternalCategoryIndexes();
      const db = await getMongoDb();
      const collection = db.collection<MongoExternalCategoryDoc>(EXTERNAL_CATEGORY_COLLECTION);

      // Use bulkWrite for significantly better performance on large category sets
      const BULK_BATCH_SIZE = 500;
      let count = 0;
      for (let i = 0; i < syncInputs.length; i += BULK_BATCH_SIZE) {
        const batch = syncInputs.slice(i, i + BULK_BATCH_SIZE);
        const operations = batch.map((input) => ({
          updateOne: {
            filter: {
              connectionId: input.connectionId,
              externalId: input.externalId,
            },
            update: {
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
            upsert: true,
          },
        }));
        await collection.bulkWrite(operations, { ordered: false });
        count += batch.length;
      }

      // Remove stale categories that were not part of this fetch
      await collection.deleteMany({
        connectionId,
        fetchedAt: { $lt: now },
      });

      return count;
    },

    listByConnection,

    async getTreeByConnection(connectionId: string): Promise<ExternalCategoryWithChildren[]> {
      const categories = await listByConnection(connectionId);
      return buildTree(categories, null);
    },

    listByMarketplace,

    async getTreeByMarketplace(marketplaceSlug: string): Promise<ExternalCategoryWithChildren[]> {
      const categories = await listByMarketplace(marketplaceSlug);
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

    async getLeafDescendants(connectionId: string, externalId: string): Promise<ExternalCategory[]> {
      await ensureMongoExternalCategoryIndexes();
      const db = await getMongoDb();

      // First find the target category to get its path
      const target = await db
        .collection<MongoExternalCategoryDoc>(EXTERNAL_CATEGORY_COLLECTION)
        .findOne({ connectionId, externalId });
      if (!target) return [];

      const targetPath = target.path ?? target.name;

      // Find all leaf descendants: categories whose path starts with "targetPath > "
      // and are marked as leaves (no children)
      const records = await db
        .collection<MongoExternalCategoryDoc>(EXTERNAL_CATEGORY_COLLECTION)
        .find({
          connectionId,
          isLeaf: true,
          path: { $regex: `^${targetPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} > ` },
        })
        .sort({ path: 1 })
        .toArray();

      return records.map((record) => toMongoRecord(record));
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
