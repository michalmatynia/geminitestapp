import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Db, Collection } from 'mongodb';

import type {
  CollectionSchema,
  FieldInfo,
  SchemaProvider,
  SchemaResponse,
} from '@/shared/contracts/database';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  normalizeOptionalQueryString,
  optionalBooleanQuerySchema,
} from '@/shared/lib/api/query-schema';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import {
  assertDatabaseEngineManageAccessOrAiPathsInternal,
  isCollectionAllowed,
} from '@/features/database/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const MONGO_SCHEMA_CONCURRENCY = 8;

export const querySchema = z.object({
  provider: z.preprocess(
    (value: unknown) => normalizeOptionalQueryString(value)?.toLowerCase(),
    z.enum(['auto', 'all', 'mongodb']).optional()
  ),
  includeCounts: optionalBooleanQuerySchema(),
});

const toSchemaSource = (schema: SchemaResponse): Record<string, unknown> => ({
  provider: schema.provider,
  collections: schema.collections,
  ...(schema.sources ? { sources: schema.sources } : {}),
});

async function mapWithConcurrency<T, R>(
  items: T[],
  _concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  return Promise.all(items.map(worker));
}

function getFieldType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  if (typeof value === 'object' && (value as { constructor?: { name?: string } }).constructor?.name === 'ObjectId') {
    return 'ObjectId';
  }
  return typeof value;
}

async function getCollectionSchema(coll: Collection, includeCounts: boolean): Promise<CollectionSchema> {
  const sample = await coll.find({}).limit(10).toArray();
  const fieldTypes = new Map<string, Set<string>>();

  for (const doc of sample) {
    for (const [key, value] of Object.entries(doc)) {
      const types = fieldTypes.get(key) ?? new Set();
      types.add(getFieldType(value));
      fieldTypes.set(key, types);
    }
  }

  const fields: FieldInfo[] = Array.from(fieldTypes.entries()).map(([name, types]) => ({
    name,
    type: Array.from(types).length === 1 ? Array.from(types)[0] ?? 'unknown' : Array.from(types).join(' | '),
    isId: name === '_id',
  }));

  fields.sort((a, b) => {
    if (a.name === '_id') return -1;
    if (b.name === '_id') return 1;
    return a.name.localeCompare(b.name);
  });

  const entry: CollectionSchema = { name: coll.collectionName, fields };

  if (includeCounts) {
    try {
      entry.documentCount = await coll.estimatedDocumentCount();
    } catch (error) {
      void ErrorSystem.captureException(error);
    }
  }

  return entry;
}

async function getMongoSchema(includeCounts = false): Promise<SchemaResponse> {
  const db: Db = await getMongoDb();
  const collectionInfos = (await db.listCollections().toArray()).filter(
    (info) => !info.name.startsWith('system.')
  );

  const collections = await mapWithConcurrency(
    collectionInfos,
    MONGO_SCHEMA_CONCURRENCY,
    async (info) => getCollectionSchema(db.collection(info.name), includeCounts)
  );

  collections.sort((a, b) => a.name.localeCompare(b.name));
  return { provider: 'mongodb', collections };
}

const enrichCollections = (
  schema: SchemaResponse,
  provider: SchemaProvider
): Array<CollectionSchema & { provider: SchemaProvider }> => {
  const collections: CollectionSchema[] = Array.isArray(schema.collections)
    ? schema.collections
    : Object.values(schema.collections as Record<string, CollectionSchema>);

  return collections.map((collection: CollectionSchema) => ({
    ...collection,
    provider,
  }));
};

const filterCollectionsToAiPathsAllowlist = (schema: SchemaResponse): SchemaResponse => ({
  ...schema,
  collections: schema.collections.filter((collection: CollectionSchema) => isCollectionAllowed(collection.name)),
});

export async function getDatabasesSchemaHandler(request: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { isInternal } = await assertDatabaseEngineManageAccessOrAiPathsInternal(request);
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const providerParam = query.provider ?? 'auto';
  const includeCounts = Boolean(query.includeCounts);

  if (providerParam === 'all') {
    const mongoSchema = await getMongoSchema(includeCounts);
    const visibleMongoSchema = isInternal ? filterCollectionsToAiPathsAllowlist(mongoSchema) : mongoSchema;
    return NextResponse.json({
      provider: 'multi',
      collections: enrichCollections(visibleMongoSchema, 'mongodb'),
      sources: { mongodb: toSchemaSource(visibleMongoSchema) },
    });
  }

  const schema = await getMongoSchema(includeCounts);
  return NextResponse.json(isInternal ? filterCollectionsToAiPathsAllowlist(schema) : schema);
}
