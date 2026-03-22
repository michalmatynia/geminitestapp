import { randomUUID } from 'crypto';

import {
  ObjectId,
  type Filter,
  type Collection,
  type UpdateFilter,
  type AnyBulkWriteOperation,
} from 'mongodb';

import type {
  CategoryMappingAssignment,
  CategoryMapping,
  CategoryMappingWithDetails,
  CategoryMappingCreateInput,
  CategoryMappingUpdateInput,
  ExternalCategory,
} from '@/shared/contracts/integrations';
import { type ProductCategory as InternalCategory } from '@/shared/contracts/products';
import { notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import {
  MongoCategoryMappingDoc,
  CATEGORY_MAPPING_COLLECTION,
  EXTERNAL_CATEGORY_COLLECTION,
  PRODUCT_CATEGORY_COLLECTION,
  buildMongoIdFilter,
  mapMongoCategoryMappingToRecord,
  mapMongoExternalCategory,
  mapMongoInternalCategory,
  MongoExternalCategoryDoc,
  MongoProductCategoryDoc,
  normalizeInternalCategoryId,
  UniqueInternalCategoryScope,
} from './types';

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

const buildMongoUniquenessFilter = (
  scope: UniqueInternalCategoryScope
): Filter<MongoCategoryMappingDoc> | null => {
  const normalizedInternalCategoryId = normalizeInternalCategoryId(scope.internalCategoryId);
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
    notConditions.push({
      externalCategoryId: excludeExternalCategoryId,
    } as Filter<MongoCategoryMappingDoc>);
  }
  const excludeId = scope.excludeId?.trim();
  if (excludeId) {
    notConditions.push(buildMongoIdFilter(excludeId));
  }
  if (notConditions.length > 0) {
    filter['$nor'] = notConditions;
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

type CanonicalExternalCategoryRef = {
  canonicalExternalCategoryId: string;
  aliases: string[];
  category: ExternalCategory;
};

const buildExternalCategoryLookupFilter = (
  connectionId: string,
  externalCategoryIds: string[]
): Filter<MongoExternalCategoryDoc> | null => {
  const uniqueIds = [...new Set(externalCategoryIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return null;
  }

  const objectIds = uniqueIds
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  const orConditions: Filter<MongoExternalCategoryDoc>[] = [
    { externalId: { $in: uniqueIds } } as Filter<MongoExternalCategoryDoc>,
    { _id: { $in: uniqueIds } } as Filter<MongoExternalCategoryDoc>,
  ];

  if (objectIds.length > 0) {
    orConditions.push({ _id: { $in: objectIds } } as Filter<MongoExternalCategoryDoc>);
  }

  return {
    connectionId,
    $or: orConditions,
  } as Filter<MongoExternalCategoryDoc>;
};

const loadCanonicalExternalCategoryRefs = async (
  collection: Collection<MongoExternalCategoryDoc>,
  connectionId: string,
  externalCategoryIds: string[]
): Promise<Map<string, CanonicalExternalCategoryRef>> => {
  const filter = buildExternalCategoryLookupFilter(connectionId, externalCategoryIds);
  if (!filter) {
    return new Map();
  }

  const records = await collection.find(filter).toArray();
  const refs = new Map<string, CanonicalExternalCategoryRef>();

  for (const record of records) {
    const category = mapMongoExternalCategory(record);
    const aliases = [...new Set([category.externalId, category.id].map((id) => id.trim()).filter(Boolean))];
    const ref: CanonicalExternalCategoryRef = {
      canonicalExternalCategoryId: category.externalId,
      aliases,
      category,
    };

    for (const alias of aliases) {
      refs.set(alias, ref);
    }
  }

  return refs;
};

const buildCanonicalExternalCategoryFilter = (
  connectionId: string,
  catalogId: string,
  aliases: string[]
): Filter<MongoCategoryMappingDoc> => {
  const uniqueAliases = [...new Set(aliases.map((alias) => alias.trim()).filter(Boolean))];
  if (uniqueAliases.length <= 1) {
    return {
      connectionId,
      catalogId,
      externalCategoryId: uniqueAliases[0] ?? '',
    };
  }

  return {
    connectionId,
    catalogId,
    externalCategoryId: { $in: uniqueAliases },
  } as Filter<MongoCategoryMappingDoc>;
};

export const mongoCategoryMappingImpl = {
  async create(input: CategoryMappingCreateInput): Promise<CategoryMapping> {
    await ensureMongoCategoryMappingIndexes();
    const db = await getMongoDb();
    const collection = db.collection<MongoCategoryMappingDoc>(CATEGORY_MAPPING_COLLECTION);
    const externalCategoryCollection = db.collection<MongoExternalCategoryDoc>(
      EXTERNAL_CATEGORY_COLLECTION
    );
    const refs = await loadCanonicalExternalCategoryRefs(externalCategoryCollection, input.connectionId, [
      input.externalCategoryId,
    ]);
    const canonicalExternalCategoryId =
      refs.get(input.externalCategoryId)?.canonicalExternalCategoryId ?? input.externalCategoryId;

    await deactivateCompetingMongoMappings(collection, {
      connectionId: input.connectionId,
      catalogId: input.catalogId,
      internalCategoryId: input.internalCategoryId,
      excludeExternalCategoryId: canonicalExternalCategoryId,
    });

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
    return mapMongoCategoryMappingToRecord(doc);
  },

  async update(id: string, input: CategoryMappingUpdateInput): Promise<CategoryMapping> {
    const db = await getMongoDb();
    const collection = db.collection<MongoCategoryMappingDoc>(CATEGORY_MAPPING_COLLECTION);

    const current = await collection.findOne(buildMongoIdFilter(id));
    if (!current) throw notFoundError('Category mapping not found');

    if (input.internalCategoryId !== undefined || input.isActive === true) {
      await deactivateCompetingMongoMappings(collection, {
        connectionId: current.connectionId,
        catalogId: current.catalogId,
        internalCategoryId: input.internalCategoryId ?? current.internalCategoryId,
        excludeExternalCategoryId: current.externalCategoryId,
        excludeId: id,
      });
    }

    const update: UpdateFilter<MongoCategoryMappingDoc> = {
      $set: {
        updatedAt: new Date(),
        ...(input.internalCategoryId !== undefined && {
          internalCategoryId: input.internalCategoryId,
        }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    };

    const result = await collection.findOneAndUpdate(buildMongoIdFilter(id), update, {
      returnDocument: 'after',
    });
    if (!result) throw notFoundError('Category mapping not found');
    return mapMongoCategoryMappingToRecord(result);
  },

  async delete(id: string): Promise<void> {
    const db = await getMongoDb();
    const collection = db.collection<MongoCategoryMappingDoc>(CATEGORY_MAPPING_COLLECTION);
    const result = await collection.deleteOne(buildMongoIdFilter(id));
    if (result.deletedCount === 0) throw notFoundError('Category mapping not found');
  },

  async getById(id: string): Promise<CategoryMapping | null> {
    const db = await getMongoDb();
    const collection = db.collection<MongoCategoryMappingDoc>(CATEGORY_MAPPING_COLLECTION);
    const doc = await collection.findOne(buildMongoIdFilter(id));
    return doc ? mapMongoCategoryMappingToRecord(doc) : null;
  },

  async listByConnection(
    connectionId: string,
    catalogId?: string
  ): Promise<CategoryMappingWithDetails[]> {
    const db = await getMongoDb();
    const collection = db.collection<MongoCategoryMappingDoc>(CATEGORY_MAPPING_COLLECTION);

    const filter: Filter<MongoCategoryMappingDoc> = { connectionId };
    if (catalogId) {
      filter.catalogId = catalogId;
    }

    const mappings = await collection.find(filter).sort({ createdAt: -1 }).toArray();
    if (mappings.length === 0) return [];

    const externalCategoryIds = [
      ...new Set(
        mappings.map((m) => m.externalCategoryId).filter((id): id is string => Boolean(id))
      ),
    ];
    const internalCategoryIds = [
      ...new Set(
        mappings.map((m) => m.internalCategoryId).filter((id): id is string => Boolean(id))
      ),
    ];

    const externalCategoryCollection = db.collection<MongoExternalCategoryDoc>(
      EXTERNAL_CATEGORY_COLLECTION
    );
    const [externalRefs, internalCategories] = await Promise.all([
      loadCanonicalExternalCategoryRefs(externalCategoryCollection, connectionId, externalCategoryIds),
      db
        .collection<MongoProductCategoryDoc>(PRODUCT_CATEGORY_COLLECTION)
        .find({
          _id: {
            $in: internalCategoryIds
              .filter((id) => ObjectId.isValid(id))
              .map((id) => new ObjectId(id)),
          },
        } as Filter<MongoProductCategoryDoc>)
        .toArray(),
    ]);

    const internalMap = new Map<string, InternalCategory>(
      internalCategories.map(
        (c) => [c._id.toString(), mapMongoInternalCategory(c)] as [string, InternalCategory]
      )
    );

    return mappings.map((mapping) => {
      const resolvedExternal = externalRefs.get(mapping.externalCategoryId);
      const externalCategory =
        resolvedExternal?.category ||
        ({
          id: mapping.externalCategoryId,
          connectionId: mapping.connectionId,
          externalId: mapping.externalCategoryId,
          name: `[Missing external category: ${mapping.externalCategoryId}]`,
          parentExternalId: null,
          path: null,
          depth: 0,
          isLeaf: true,
          metadata: null,
          fetchedAt: mapping.updatedAt.toISOString(),
          createdAt: mapping.createdAt.toISOString(),
          updatedAt: mapping.updatedAt.toISOString(),
        } as ExternalCategory);

      return {
        ...mapMongoCategoryMappingToRecord(mapping),
        externalCategoryId:
          resolvedExternal?.canonicalExternalCategoryId ?? mapping.externalCategoryId,
        externalCategory,
        internalCategory:
          internalMap.get(mapping.internalCategoryId || '') ||
          ({
            id: mapping.internalCategoryId || '',
            name: `[Missing internal category: ${mapping.internalCategoryId}]`,
            description: null,
            color: null,
            parentId: null,
            catalogId: mapping.catalogId,
            createdAt: mapping.createdAt.toISOString(),
            updatedAt: mapping.updatedAt.toISOString(),
          } as InternalCategory),
      };
    });
  },

  async getByExternalCategory(
    connectionId: string,
    externalCategoryId: string,
    catalogId: string
  ): Promise<CategoryMapping | null> {
    const db = await getMongoDb();
    const collection = db.collection<MongoCategoryMappingDoc>(CATEGORY_MAPPING_COLLECTION);
    const externalCategoryCollection = db.collection<MongoExternalCategoryDoc>(
      EXTERNAL_CATEGORY_COLLECTION
    );
    const refs = await loadCanonicalExternalCategoryRefs(externalCategoryCollection, connectionId, [
      externalCategoryId,
    ]);
    const resolvedRef = refs.get(externalCategoryId);
    const canonicalExternalCategoryId =
      resolvedRef?.canonicalExternalCategoryId ?? externalCategoryId;
    const aliases = resolvedRef?.aliases ?? [canonicalExternalCategoryId];
    const doc = await collection.findOne(
      buildCanonicalExternalCategoryFilter(connectionId, catalogId, aliases),
      {
        sort: { updatedAt: -1, createdAt: -1 },
      }
    );
    if (!doc) return null;

    if (doc.externalCategoryId !== canonicalExternalCategoryId) {
      const migrated = await collection.findOneAndUpdate(
        buildMongoIdFilter(doc._id.toString()),
        {
          $set: {
            externalCategoryId: canonicalExternalCategoryId,
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      );
      return migrated ? mapMongoCategoryMappingToRecord(migrated) : mapMongoCategoryMappingToRecord(doc);
    }

    return mapMongoCategoryMappingToRecord(doc);
  },

  async bulkUpsert(
    connectionId: string,
    catalogId: string,
    mappings: CategoryMappingAssignment[]
  ): Promise<number> {
    if (mappings.length === 0) return 0;
    await ensureMongoCategoryMappingIndexes();
    const db = await getMongoDb();
    const collection = db.collection<MongoCategoryMappingDoc>(CATEGORY_MAPPING_COLLECTION);
    const externalCategoryCollection = db.collection<MongoExternalCategoryDoc>(
      EXTERNAL_CATEGORY_COLLECTION
    );
    const refs = await loadCanonicalExternalCategoryRefs(
      externalCategoryCollection,
      connectionId,
      mappings.map((mapping) => mapping.externalCategoryId)
    );

    const now = new Date();
    const ops: AnyBulkWriteOperation<MongoCategoryMappingDoc>[] = mappings.map((m) => ({
      updateOne: {
        filter: buildCanonicalExternalCategoryFilter(
          connectionId,
          catalogId,
          refs.get(m.externalCategoryId)?.aliases ?? [m.externalCategoryId]
        ),
        update: {
          $set: {
            externalCategoryId:
              refs.get(m.externalCategoryId)?.canonicalExternalCategoryId ?? m.externalCategoryId,
            internalCategoryId: m.internalCategoryId,
            isActive: true,
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

    const result = await collection.bulkWrite(ops);
    return (result.upsertedCount || 0) + (result.modifiedCount || 0);
  },

  async deleteByConnection(connectionId: string): Promise<number> {
    const db = await getMongoDb();
    const collection = db.collection<MongoCategoryMappingDoc>(CATEGORY_MAPPING_COLLECTION);
    const result = await collection.deleteMany({ connectionId });
    return result.deletedCount || 0;
  },
};
