import { randomUUID } from 'crypto';

import { Prisma } from '@prisma/client';
import { ObjectId, type Collection, type Filter } from 'mongodb';

import type {
  CategoryMapping,
  CategoryMappingWithDetails,
  CategoryMappingCreateInput,
  CategoryMappingUpdateInput,
} from '@/features/integrations/types/category-mapping';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

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
    mappings: { externalCategoryId: string; internalCategoryId: string | null }[]
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

type EnrichedCategoryMapping = Prisma.CategoryMappingGetPayload<{
  include: {
    externalCategory: true;
    internalCategory: true;
  };
}>;

type MongoCategoryMappingDoc = {
  _id: string | ObjectId;
  connectionId: string;
  externalCategoryId: string;
  internalCategoryId: string;
  catalogId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type MongoExternalCategoryDoc = {
  _id: string | ObjectId;
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

type MongoProductCategoryDoc = {
  _id: string | ObjectId;
  name: string;
  description: string | null;
  color: string | null;
  parentId: string | ObjectId | null;
  catalogId: string;
  createdAt: Date;
  updatedAt: Date;
};

const CATEGORY_MAPPING_COLLECTION = 'category_mappings';
const EXTERNAL_CATEGORY_COLLECTION = 'external_categories';
const PRODUCT_CATEGORY_COLLECTION = 'product_categories';

let mongoCategoryMappingIndexesReady: Promise<void> | null = null;

const ensureMongoCategoryMappingIndexes = async (): Promise<void> => {
  if (!mongoCategoryMappingIndexesReady) {
    mongoCategoryMappingIndexesReady = (async () => {
      const db = await getMongoDb();
      const collection = db.collection<MongoCategoryMappingDoc>(CATEGORY_MAPPING_COLLECTION);
      await Promise.all([
        collection.createIndex(
          { connectionId: 1, externalCategoryId: 1, catalogId: 1 },
          {
            unique: true,
            name: 'category_mappings_connection_external_catalog_unique',
          }
        ),
        collection.createIndex(
          { connectionId: 1, catalogId: 1, isActive: 1 },
          { name: 'category_mappings_connection_catalog_active' }
        ),
        collection.createIndex(
          { connectionId: 1, internalCategoryId: 1, isActive: 1 },
          { name: 'category_mappings_connection_internal_active' }
        ),
      ]);
    })();
  }
  await mongoCategoryMappingIndexesReady;
};

const buildMongoIdFilter = (id: string): Filter<MongoCategoryMappingDoc> => {
  if (ObjectId.isValid(id)) {
    return { $or: [{ _id: id }, { _id: new ObjectId(id) }] } as Filter<MongoCategoryMappingDoc>;
  }
  return { _id: id } as Filter<MongoCategoryMappingDoc>;
};

const mapMongoCategoryMappingToRecord = (record: MongoCategoryMappingDoc): CategoryMapping => ({
  id: record._id.toString(),
  connectionId: record.connectionId,
  externalCategoryId: record.externalCategoryId,
  internalCategoryId: record.internalCategoryId,
  catalogId: record.catalogId,
  isActive: Boolean(record.isActive),
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

const mapMongoExternalCategory = (
  record: MongoExternalCategoryDoc
): CategoryMappingWithDetails['externalCategory'] => ({
  id: record._id.toString(),
  connectionId: record.connectionId,
  externalId: record.externalId,
  name: record.name,
  parentExternalId: record.parentExternalId ?? null,
  path: record.path ?? null,
  depth: record.depth ?? 0,
  isLeaf: Boolean(record.isLeaf),
  metadata: record.metadata ?? null,
  fetchedAt: record.fetchedAt,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

const mapMongoInternalCategory = (
  record: MongoProductCategoryDoc
): CategoryMappingWithDetails['internalCategory'] => ({
  id: record._id.toString(),
  name: record.name,
  description: record.description ?? null,
  color: record.color ?? null,
  parentId: record.parentId?.toString() ?? null,
  catalogId: record.catalogId,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const createMissingExternalCategory = (
  mapping: MongoCategoryMappingDoc
): CategoryMappingWithDetails['externalCategory'] => ({
  id: mapping.externalCategoryId,
  connectionId: mapping.connectionId,
  externalId: mapping.externalCategoryId,
  name: `[Missing external category: ${mapping.externalCategoryId}]`,
  parentExternalId: null,
  path: null,
  depth: 0,
  isLeaf: true,
  metadata: null,
  fetchedAt: mapping.updatedAt,
  createdAt: mapping.createdAt,
  updatedAt: mapping.updatedAt,
});

const createMissingInternalCategory = (
  mapping: MongoCategoryMappingDoc
): CategoryMappingWithDetails['internalCategory'] => ({
  id: mapping.internalCategoryId,
  name: `[Missing internal category: ${mapping.internalCategoryId}]`,
  description: null,
  color: null,
  parentId: null,
  catalogId: mapping.catalogId,
  createdAt: mapping.createdAt.toISOString(),
  updatedAt: mapping.updatedAt.toISOString(),
});

const buildExternalCategoryCanonicalMap = async (
  connectionId: string
): Promise<Map<string, string>> => {
  const db = await getMongoDb();
  const docs = await db
    .collection<MongoExternalCategoryDoc>(EXTERNAL_CATEGORY_COLLECTION)
    .find({ connectionId }, { projection: { _id: 1, externalId: 1 } })
    .toArray();
  const map = new Map<string, string>();
  docs.forEach((doc: MongoExternalCategoryDoc) => {
    const canonicalId = doc._id.toString();
    map.set(canonicalId, canonicalId);
    if (doc.externalId) {
      map.set(doc.externalId, canonicalId);
    }
  });
  return map;
};

type UniqueInternalCategoryScope = {
  connectionId: string;
  catalogId: string;
  internalCategoryId: string | null | undefined;
  excludeExternalCategoryId?: string | null | undefined;
  excludeId?: string | null | undefined;
};

const normalizeInternalCategoryId = (
  value: string | null | undefined
): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const buildMongoUniquenessFilter = (
  scope: UniqueInternalCategoryScope
): Filter<MongoCategoryMappingDoc> | null => {
  const normalizedInternalCategoryId = normalizeInternalCategoryId(
    scope.internalCategoryId
  );
  if (!normalizedInternalCategoryId) return null;

  const filter: Filter<MongoCategoryMappingDoc> = {
    connectionId: scope.connectionId,
    catalogId: scope.catalogId,
    internalCategoryId: normalizedInternalCategoryId,
    isActive: true,
  };

  const notConditions: Filter<MongoCategoryMappingDoc>[] = [];
  const excludeExternalCategoryId = scope.excludeExternalCategoryId?.trim();
  if (excludeExternalCategoryId) {
    notConditions.push({ externalCategoryId: excludeExternalCategoryId });
  }
  const excludeId = scope.excludeId?.trim();
  if (excludeId) {
    notConditions.push(buildMongoIdFilter(excludeId));
  }
  if (notConditions.length > 0) {
    (filter as Record<string, unknown>)['$nor'] = notConditions;
  }

  return filter;
};

const deactivateCompetingMongoMappings = async (
  collection: Collection<MongoCategoryMappingDoc>,
  scope: UniqueInternalCategoryScope
): Promise<number> => {
  const filter = buildMongoUniquenessFilter(scope);
  if (!filter) return 0;
  const result = await collection.updateMany(filter, {
    $set: { isActive: false, updatedAt: new Date() },
  });
  return result.modifiedCount ?? 0;
};

const buildPrismaUniquenessWhere = (
  scope: UniqueInternalCategoryScope
): Prisma.CategoryMappingWhereInput | null => {
  const normalizedInternalCategoryId = normalizeInternalCategoryId(
    scope.internalCategoryId
  );
  if (!normalizedInternalCategoryId) return null;

  const where: Prisma.CategoryMappingWhereInput = {
    connectionId: scope.connectionId,
    catalogId: scope.catalogId,
    internalCategoryId: normalizedInternalCategoryId,
    isActive: true,
  };

  const excludeExternalCategoryId = scope.excludeExternalCategoryId?.trim();
  const excludeId = scope.excludeId?.trim();
  if (excludeExternalCategoryId && excludeId) {
    where.NOT = {
      OR: [
        { externalCategoryId: excludeExternalCategoryId },
        { id: excludeId },
      ],
    };
  } else if (excludeExternalCategoryId) {
    where.NOT = { externalCategoryId: excludeExternalCategoryId };
  } else if (excludeId) {
    where.NOT = { id: excludeId };
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
    data: { isActive: false },
  });
  return result.count;
};

export function getCategoryMappingRepository(): CategoryMappingRepository {
  return {
    async create(input: CategoryMappingCreateInput): Promise<CategoryMapping> {
      const provider = await getAppDbProvider();
      if (provider === 'mongodb') {
        await ensureMongoCategoryMappingIndexes();
        const db = await getMongoDb();
        const externalCanonicalMap = await buildExternalCategoryCanonicalMap(
          input.connectionId
        );
        const canonicalExternalCategoryId =
          externalCanonicalMap.get(input.externalCategoryId) ?? input.externalCategoryId;
        const collection = db.collection<MongoCategoryMappingDoc>(CATEGORY_MAPPING_COLLECTION);
        const now = new Date();
        const doc: MongoCategoryMappingDoc = {
          _id: randomUUID(),
          connectionId: input.connectionId,
          externalCategoryId: canonicalExternalCategoryId,
          internalCategoryId: input.internalCategoryId,
          catalogId: input.catalogId,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };
        await collection.insertOne(doc);
        await deactivateCompetingMongoMappings(collection, {
          connectionId: input.connectionId,
          catalogId: input.catalogId,
          internalCategoryId: input.internalCategoryId,
          excludeExternalCategoryId: canonicalExternalCategoryId,
          excludeId: doc._id.toString(),
        });
        return mapMongoCategoryMappingToRecord(doc);
      }

      const record = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const created = await tx.categoryMapping.create({
          data: {
            connectionId: input.connectionId,
            externalCategoryId: input.externalCategoryId,
            internalCategoryId: input.internalCategoryId,
            catalogId: input.catalogId,
          },
        });
        await deactivateCompetingPrismaMappings(tx, {
          connectionId: created.connectionId,
          catalogId: created.catalogId,
          internalCategoryId: created.internalCategoryId,
          excludeExternalCategoryId: created.externalCategoryId,
          excludeId: created.id,
        });
        return created;
      });
      return mapToRecord(record);
    },

    async update(id: string, input: CategoryMappingUpdateInput): Promise<CategoryMapping> {
      const provider = await getAppDbProvider();
      if (provider === 'mongodb') {
        await ensureMongoCategoryMappingIndexes();
        const db = await getMongoDb();
        const collection = db.collection<MongoCategoryMappingDoc>(CATEGORY_MAPPING_COLLECTION);
        const filter = buildMongoIdFilter(id);
        const updatePayload: Partial<MongoCategoryMappingDoc> = {
          updatedAt: new Date(),
        };

        if (input.internalCategoryId !== undefined) {
          updatePayload.internalCategoryId = input.internalCategoryId;
        }
        if (input.isActive !== undefined) {
          updatePayload.isActive = input.isActive;
        }

        const result = await collection.updateOne(filter, { $set: updatePayload });
        if (result.matchedCount === 0) {
          throw new Error('Category mapping not found');
        }

        const record = await collection.findOne(filter);
        if (!record) {
          throw new Error('Category mapping not found');
        }
        if (record.isActive) {
          await deactivateCompetingMongoMappings(collection, {
            connectionId: record.connectionId,
            catalogId: record.catalogId,
            internalCategoryId: record.internalCategoryId,
            excludeExternalCategoryId: record.externalCategoryId,
            excludeId: record._id.toString(),
          });
        }
        return mapMongoCategoryMappingToRecord(record);
      }

      const record = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const updated = await tx.categoryMapping.update({
          where: { id },
          data: {
            ...(input.internalCategoryId !== undefined && {
              internalCategoryId: input.internalCategoryId,
            }),
            ...(input.isActive !== undefined && { isActive: input.isActive }),
          },
        });
        if (updated.isActive) {
          await deactivateCompetingPrismaMappings(tx, {
            connectionId: updated.connectionId,
            catalogId: updated.catalogId,
            internalCategoryId: updated.internalCategoryId,
            excludeExternalCategoryId: updated.externalCategoryId,
            excludeId: updated.id,
          });
        }
        return updated;
      });
      return mapToRecord(record);
    },

    async delete(id: string): Promise<void> {
      const provider = await getAppDbProvider();
      if (provider === 'mongodb') {
        await ensureMongoCategoryMappingIndexes();
        const db = await getMongoDb();
        await db
          .collection<MongoCategoryMappingDoc>(CATEGORY_MAPPING_COLLECTION)
          .deleteOne(buildMongoIdFilter(id));
        return;
      }

      await prisma.categoryMapping.delete({
        where: { id },
      });
    },

    async getById(id: string): Promise<CategoryMapping | null> {
      const provider = await getAppDbProvider();
      if (provider === 'mongodb') {
        await ensureMongoCategoryMappingIndexes();
        const db = await getMongoDb();
        const record = await db
          .collection<MongoCategoryMappingDoc>(CATEGORY_MAPPING_COLLECTION)
          .findOne(buildMongoIdFilter(id));
        return record ? mapMongoCategoryMappingToRecord(record) : null;
      }

      const record = await prisma.categoryMapping.findUnique({
        where: { id },
      });
      return record ? mapToRecord(record) : null;
    },

    async listByConnection(
      connectionId: string,
      catalogId?: string
    ): Promise<CategoryMappingWithDetails[]> {
      const provider = await getAppDbProvider();
      if (provider === 'mongodb') {
        await ensureMongoCategoryMappingIndexes();
        const db = await getMongoDb();
        const mappingDocs = await db
          .collection<MongoCategoryMappingDoc>(CATEGORY_MAPPING_COLLECTION)
          .find({
            connectionId,
            ...(catalogId ? { catalogId } : {}),
          })
          .toArray();

        if (mappingDocs.length === 0) {
          try {
            const fallbackRecords = await prisma.categoryMapping.findMany({
              where: {
                connectionId,
                ...(catalogId && { catalogId }),
              },
              include: {
                externalCategory: true,
                internalCategory: true,
              },
              orderBy: [
                { externalCategory: { depth: 'asc' } },
                { externalCategory: { name: 'asc' } },
              ],
            });

            if (fallbackRecords.length === 0) return [];

            for (const record of fallbackRecords as EnrichedCategoryMapping[]) {
              await db.collection<MongoCategoryMappingDoc>(CATEGORY_MAPPING_COLLECTION).updateOne(
                {
                  connectionId: record.connectionId,
                  externalCategoryId: record.externalCategoryId,
                  catalogId: record.catalogId,
                },
                {
                  $set: {
                    internalCategoryId: record.internalCategoryId,
                    isActive: record.isActive,
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

            return (fallbackRecords as EnrichedCategoryMapping[]).map((r: EnrichedCategoryMapping) => ({
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
                createdAt: r.internalCategory.createdAt.toISOString(),
                updatedAt: r.internalCategory.updatedAt.toISOString(),
              },
            }));
          } catch {
            return [];
          }
        }

        const externalDocs = await db
          .collection<MongoExternalCategoryDoc>(EXTERNAL_CATEGORY_COLLECTION)
          .find({ connectionId })
          .toArray();
        const externalById = new Map<
          string,
          CategoryMappingWithDetails['externalCategory']
        >(
          externalDocs.map((doc: MongoExternalCategoryDoc) => [
            doc._id.toString(),
            mapMongoExternalCategory(doc),
          ])
        );
        const externalByExternalId = new Map<
          string,
          CategoryMappingWithDetails['externalCategory']
        >(
          externalDocs.map((doc: MongoExternalCategoryDoc) => [
            doc.externalId,
            mapMongoExternalCategory(doc),
          ])
        );

        const missingExternalIds = Array.from(
          new Set(
            mappingDocs
              .map((doc: MongoCategoryMappingDoc) => doc.externalCategoryId)
              .filter(
                (id: string) =>
                  !externalById.has(id) && !externalByExternalId.has(id)
              )
          )
        );
        if (missingExternalIds.length > 0) {
          try {
            const fallbackExternalDocs = await prisma.externalCategory.findMany({
              where: { id: { in: missingExternalIds } },
            });
            fallbackExternalDocs.forEach((doc) => {
              const mapped = {
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
              };
              externalById.set(doc.id, mapped);
              externalByExternalId.set(doc.externalId, mapped);
            });
          } catch {
            // Prisma may be unavailable in Mongo-first deployments.
          }
        }

        const catalogIds = Array.from(
          new Set(mappingDocs.map((doc: MongoCategoryMappingDoc) => doc.catalogId))
        );
        let internalDocs: MongoProductCategoryDoc[] = [];
        if (catalogIds.length > 0) {
          internalDocs = await db
            .collection<MongoProductCategoryDoc>(PRODUCT_CATEGORY_COLLECTION)
            .find({ catalogId: { $in: catalogIds } })
            .toArray();
        }
        const internalById = new Map<
          string,
          CategoryMappingWithDetails['internalCategory']
        >(
          internalDocs.map((doc: MongoProductCategoryDoc) => [
            doc._id.toString(),
            mapMongoInternalCategory(doc),
          ])
        );

        const missingInternalIds = Array.from(
          new Set(
            mappingDocs
              .map((doc: MongoCategoryMappingDoc) => doc.internalCategoryId)
              .filter((id: string) => !internalById.has(id))
          )
        );
        if (missingInternalIds.length > 0) {
          try {
            const fallbackInternalDocs = await prisma.productCategory.findMany({
              where: { id: { in: missingInternalIds } },
            });
            fallbackInternalDocs.forEach((doc) => {
              internalById.set(doc.id, {
                id: doc.id,
                name: doc.name,
                description: doc.description,
                color: doc.color,
                parentId: doc.parentId,
                catalogId: doc.catalogId,
                createdAt: doc.createdAt.toISOString(),
                updatedAt: doc.updatedAt.toISOString(),
              });
            });
          } catch {
            // Prisma may be unavailable in Mongo-first deployments.
          }
        }

        const combined = mappingDocs.map((mapping: MongoCategoryMappingDoc) => {
          const external =
            externalById.get(mapping.externalCategoryId) ??
            externalByExternalId.get(mapping.externalCategoryId) ??
            createMissingExternalCategory(mapping);
          const internal =
            internalById.get(mapping.internalCategoryId) ??
            createMissingInternalCategory(mapping);

          return {
            id: mapping._id.toString(),
            connectionId: mapping.connectionId,
            externalCategoryId: mapping.externalCategoryId,
            internalCategoryId: mapping.internalCategoryId,
            catalogId: mapping.catalogId,
            isActive: Boolean(mapping.isActive),
            createdAt: mapping.createdAt,
            updatedAt: mapping.updatedAt,
            externalCategory: external,
            internalCategory: internal,
          } satisfies CategoryMappingWithDetails;
        });

        combined.sort((a: CategoryMappingWithDetails, b: CategoryMappingWithDetails) => {
          if (a.externalCategory.depth !== b.externalCategory.depth) {
            return a.externalCategory.depth - b.externalCategory.depth;
          }
          return a.externalCategory.name.localeCompare(b.externalCategory.name);
        });
        return combined;
      }

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
          { externalCategory: { depth: 'asc' } },
          { externalCategory: { name: 'asc' } },
        ],
      });

      return (records as EnrichedCategoryMapping[]).map((r: EnrichedCategoryMapping) => ({
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
          createdAt: r.internalCategory.createdAt.toISOString(),
          updatedAt: r.internalCategory.updatedAt.toISOString(),
        },
      }));
    },

    async getByExternalCategory(
      connectionId: string,
      externalCategoryId: string,
      catalogId: string
    ): Promise<CategoryMapping | null> {
      const provider = await getAppDbProvider();
      if (provider === 'mongodb') {
        await ensureMongoCategoryMappingIndexes();
        const db = await getMongoDb();
        const externalCanonicalMap = await buildExternalCategoryCanonicalMap(
          connectionId
        );
        const canonicalExternalCategoryId =
          externalCanonicalMap.get(externalCategoryId) ?? externalCategoryId;
        const lookupExternalCategoryIds = Array.from(
          new Set([externalCategoryId, canonicalExternalCategoryId])
        );
        const mongoRecord = await db
          .collection<MongoCategoryMappingDoc>(CATEGORY_MAPPING_COLLECTION)
          .findOne({
            connectionId,
            externalCategoryId: { $in: lookupExternalCategoryIds },
            catalogId,
          });
        if (mongoRecord) return mapMongoCategoryMappingToRecord(mongoRecord);

        try {
          const prismaRecord = await prisma.categoryMapping.findUnique({
            where: {
              connectionId_externalCategoryId_catalogId: {
                connectionId,
                externalCategoryId,
                catalogId,
              },
            },
          });
          if (!prismaRecord) return null;

          await db.collection<MongoCategoryMappingDoc>(CATEGORY_MAPPING_COLLECTION).updateOne(
            {
              connectionId: prismaRecord.connectionId,
              externalCategoryId: prismaRecord.externalCategoryId,
              catalogId: prismaRecord.catalogId,
            },
            {
              $set: {
                internalCategoryId: prismaRecord.internalCategoryId,
                isActive: prismaRecord.isActive,
                updatedAt: prismaRecord.updatedAt,
              },
              $setOnInsert: {
                _id: prismaRecord.id,
                createdAt: prismaRecord.createdAt,
              },
            },
            { upsert: true }
          );

          return mapToRecord(prismaRecord);
        } catch {
          return null;
        }
      }

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
      const provider = await getAppDbProvider();
      if (provider === 'mongodb') {
        await ensureMongoCategoryMappingIndexes();
        const db = await getMongoDb();
        const externalCanonicalMap = await buildExternalCategoryCanonicalMap(
          connectionId
        );
        const collection = db.collection<MongoCategoryMappingDoc>(CATEGORY_MAPPING_COLLECTION);
        let count = 0;

        for (const mapping of mappings) {
          const canonicalExternalCategoryId =
            externalCanonicalMap.get(mapping.externalCategoryId) ??
            mapping.externalCategoryId;
          if (mapping.internalCategoryId === null) {
            const deactivated = await collection.updateMany(
              {
                connectionId,
                externalCategoryId: canonicalExternalCategoryId,
                catalogId,
                isActive: true,
              },
              {
                $set: { isActive: false, updatedAt: new Date() },
              }
            );
            count += deactivated.modifiedCount;
            continue;
          }

          const now = new Date();
          await collection.updateOne(
            {
              connectionId,
              externalCategoryId: canonicalExternalCategoryId,
              catalogId,
            },
            {
              $set: {
                internalCategoryId: mapping.internalCategoryId,
                isActive: true,
                updatedAt: now,
              },
              $setOnInsert: {
                _id: randomUUID(),
                connectionId,
                catalogId,
                createdAt: now,
              },
            },
            { upsert: true }
          );
          await deactivateCompetingMongoMappings(collection, {
            connectionId,
            catalogId,
            internalCategoryId: mapping.internalCategoryId,
            excludeExternalCategoryId: canonicalExternalCategoryId,
          });
          count++;
        }

        return count;
      }

      let count = 0;
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        for (const mapping of mappings) {
          if (mapping.internalCategoryId === null) {
            const deactivated = await tx.categoryMapping.updateMany({
              where: {
                connectionId,
                externalCategoryId: mapping.externalCategoryId,
                catalogId,
                isActive: true,
              },
              data: { isActive: false },
            });
            count += deactivated.count;
            continue;
          }

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
              isActive: true,
            },
          });
          await deactivateCompetingPrismaMappings(tx, {
            connectionId,
            catalogId,
            internalCategoryId: mapping.internalCategoryId,
            excludeExternalCategoryId: mapping.externalCategoryId,
          });
          count++;
        }
      });
      return count;
    },

    async deleteByConnection(connectionId: string): Promise<number> {
      const provider = await getAppDbProvider();
      if (provider === 'mongodb') {
        await ensureMongoCategoryMappingIndexes();
        const db = await getMongoDb();
        const result = await db
          .collection<MongoCategoryMappingDoc>(CATEGORY_MAPPING_COLLECTION)
          .deleteMany({ connectionId });
        return result.deletedCount ?? 0;
      }

      const result = await prisma.categoryMapping.deleteMany({
        where: { connectionId },
      });
      return result.count;
    },
  };
}
