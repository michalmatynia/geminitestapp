import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import type {
  CollectionSchema,
  FieldInfo,
  SchemaProvider,
  SchemaResponse,
} from '@/shared/contracts/database';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import {
  normalizeOptionalQueryString,
  optionalBooleanQuerySchema,
} from '@/shared/lib/api/query-schema';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { assertDatabaseEngineManageAccess } from '@/shared/lib/db/services/database-engine-access';
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
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const safeConcurrency = Math.max(1, Math.min(concurrency, items.length));
  const results: Array<R | null> = Array.from({ length: items.length }, () => null);
  let nextIndex = 0;

  const runWorker = async (): Promise<void> => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= items.length) return;
      const item = items[currentIndex]!;
      results[currentIndex] = await worker(item, currentIndex);
    }
  };

  await Promise.all(Array.from({ length: safeConcurrency }, () => runWorker()));
  return results.map((value: R | null): R => {
    if (value === null) {
      throw new Error('Schema concurrency mapping produced an incomplete result.');
    }
    return value;
  });
}

async function getMongoSchema(includeCounts = false): Promise<SchemaResponse> {
  const db = await getMongoDb();
  const collectionInfos = (await db.listCollections().toArray()).filter(
    (info) => !info.name.startsWith('system.')
  );
  const collections = await mapWithConcurrency(
    collectionInfos,
    MONGO_SCHEMA_CONCURRENCY,
    async (info) => {
      const collName = info.name;
      const coll = db.collection(collName);
      const sample = await coll.find({}).limit(10).toArray();

      const fieldTypes = new Map<string, Set<string>>();

      for (const doc of sample) {
        for (const [key, value] of Object.entries(doc)) {
          if (!fieldTypes.has(key)) {
            fieldTypes.set(key, new Set());
          }
          const typeSet = fieldTypes.get(key)!;
          if (value === null) {
            typeSet.add('null');
          } else if (Array.isArray(value)) {
            typeSet.add('array');
          } else if (value instanceof Date) {
            typeSet.add('date');
          } else if (
            typeof value === 'object' &&
            (value as { constructor?: { name?: string } })?.constructor?.name === 'ObjectId'
          ) {
            typeSet.add('ObjectId');
          } else {
            typeSet.add(typeof value);
          }
        }
      }

      const fields: FieldInfo[] = [];
      for (const [name, types] of fieldTypes) {
        const typeArray = Array.from(types);
        const fieldType =
          typeArray.length === 1 ? (typeArray[0] ?? 'unknown') : typeArray.join(' | ');
        const fieldInfo: FieldInfo = {
          name,
          type: fieldType,
        };
        if (name === '_id') {
          fieldInfo.isId = true;
        }
        fields.push(fieldInfo);
      }

      fields.sort((a: FieldInfo, b: FieldInfo) => {
        if (a.name === '_id') return -1;
        if (b.name === '_id') return 1;
        return a.name.localeCompare(b.name);
      });

      const entry: CollectionSchema = { name: collName, fields };

      if (includeCounts) {
        try {
          entry.documentCount = await coll.estimatedDocumentCount();
        } catch (error) {
          void ErrorSystem.captureException(error);
        
          // Best-effort count only.
        }
      }

      return entry;
    }
  );

  collections.sort((a: CollectionSchema, b: CollectionSchema) => a.name.localeCompare(b.name));
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

export async function getDatabasesSchemaHandler(
  _request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const providerParam = query.provider ?? 'auto';
  const includeCounts = query.includeCounts === true;

  if (providerParam === 'all') {
    const mongoSchema = await getMongoSchema(includeCounts);
    const payload: SchemaResponse = {
      provider: 'multi',
      collections: enrichCollections(mongoSchema, 'mongodb'),
      sources: {
        mongodb: toSchemaSource(mongoSchema),
      },
    };
    return NextResponse.json(payload);
  }

  const schema = await getMongoSchema(includeCounts);
  return NextResponse.json(schema);
}
