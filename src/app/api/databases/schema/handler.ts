import { readFileSync } from 'node:fs';
import path from 'node:path';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import type {
  FieldInfo,
  CollectionSchema,
  SchemaProvider,
  SchemaResponse,
} from '@/shared/contracts/database';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import {
  normalizeOptionalQueryString,
  optionalBooleanQuerySchema,
} from '@/shared/lib/api/query-schema';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import { assertDatabaseEngineManageAccess } from '@/shared/lib/db/services/database-engine-access';

// Prisma DMMF types for internal use
type DmmfField = {
  name: string;
  type: string;
  isRequired?: boolean;
  isId?: boolean;
  isUnique?: boolean;
  hasDefaultValue?: boolean;
  relationName?: string;
};

type DmmfModel = {
  name: string;
  fields: DmmfField[];
};

type DmmfDatamodel = {
  models: DmmfModel[];
};

const MONGO_SCHEMA_CONCURRENCY = 8;
const PRISMA_COUNT_CONCURRENCY = 8;

const PROJECT_ROOT = process.cwd();
const PRISMA_ROOT_DIR = path.join(PROJECT_ROOT, 'prisma');
const PRISMA_SCHEMA_ENV_PATH = process.env['PRISMA_SCHEMA_PATH'];
const PRISMA_SCHEMA_DEFAULT_PATH = path.join(PRISMA_ROOT_DIR, 'schema.prisma');

export const querySchema = z.object({
  provider: z.preprocess(
    (value: unknown) => normalizeOptionalQueryString(value)?.toLowerCase(),
    z.enum(['auto', 'all', 'mongodb', 'prisma']).optional()
  ),
  includeCounts: optionalBooleanQuerySchema(),
});

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const isDmmfDatamodel = (value: unknown): value is DmmfDatamodel => {
  const record = asRecord(value);
  return record !== null && Array.isArray(record['models']);
};

const getPrismaCountFn = (value: unknown): ((args?: unknown) => Promise<number>) | null => {
  const record = asRecord(value);
  const count = record?.['count'];
  return typeof count === 'function'
    ? (count as (args?: unknown) => Promise<number>)
    : null;
};

const toSchemaSource = (schema: SchemaResponse): Record<string, unknown> => ({
  provider: schema.provider,
  collections: schema.collections,
  ...(schema.sources ? { sources: schema.sources } : {}),
});

const resolvePrismaSchemaPath = (candidate: string): string => {
  if (path.isAbsolute(candidate)) {
    return candidate;
  }

  const normalized = candidate
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '');
  if (!normalized) {
    return PRISMA_SCHEMA_DEFAULT_PATH;
  }

  if (normalized.startsWith('prisma/')) {
    const relativePath = normalized.slice('prisma/'.length);
    const segments = relativePath.split('/').filter((segment) => segment.length > 0);
    if (segments.some((segment) => segment === '..')) {
      return PRISMA_SCHEMA_DEFAULT_PATH;
    }
    return path.join(PRISMA_ROOT_DIR, ...segments);
  }

  const segments = normalized.split('/').filter((segment) => segment.length > 0);
  if (segments.some((segment) => segment === '..')) {
    return PRISMA_SCHEMA_DEFAULT_PATH;
  }

  return path.join(PRISMA_ROOT_DIR, ...segments);
};

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

const readPrismaSchemaFile = (): string | null => {
  const schemaPath = PRISMA_SCHEMA_ENV_PATH
    ? resolvePrismaSchemaPath(PRISMA_SCHEMA_ENV_PATH)
    : PRISMA_SCHEMA_DEFAULT_PATH;
  try {
    return readFileSync(schemaPath, 'utf8');
  } catch {
    return null;
  }
};

const stripSchemaComments = (schema: string): string => {
  const withoutBlock = schema.replace(/\/\*[\s\S]*?\*\//g, '');
  return withoutBlock
    .split('\n')
    .map((line: string) => line.replace(/\/\/.*$/, ''))
    .join('\n');
};

const normalizePrismaFieldType = (rawType: string): { type: string; isRequired: boolean } => {
  const isList = rawType.endsWith('[]');
  const isOptional = rawType.endsWith('?');
  const baseType = rawType.replace(/\?|\[\]/g, '');
  const type = isList ? `${baseType}[]` : baseType;
  return { type, isRequired: !isOptional };
};

const parsePrismaSchemaModels = (schemaText: string): CollectionSchema[] => {
  const cleaned = stripSchemaComments(schemaText);
  const modelRegex = /model\s+(\w+)\s*\{([\s\S]*?)\n\}/g;
  const collections: CollectionSchema[] = [];
  let match: RegExpExecArray | null;

  while ((match = modelRegex.exec(cleaned)) !== null) {
    const modelName = match[1];
    if (!modelName) continue;
    const body = match[2] ?? '';
    const fields: FieldInfo[] = [];

    body.split('\n').forEach((line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (trimmed.startsWith('@@') || trimmed.startsWith('@')) return;
      const [fieldName, fieldTypeRaw] = trimmed.split(/\s+/);
      if (!fieldName || !fieldTypeRaw) return;
      const { type, isRequired } = normalizePrismaFieldType(fieldTypeRaw);
      const fieldInfo: FieldInfo = {
        name: fieldName,
        type,
        isRequired,
      };
      if (trimmed.includes('@id')) fieldInfo.isId = true;
      if (trimmed.includes('@unique')) fieldInfo.isUnique = true;
      if (trimmed.includes('@default')) fieldInfo.hasDefault = true;
      fields.push(fieldInfo);
    });

    fields.sort((a: FieldInfo, b: FieldInfo) => a.name.localeCompare(b.name));
    collections.push({ name: modelName, fields });
  }

  return collections;
};

const getPrismaDmmf = (): DmmfDatamodel | null => {
  if (!process.env['DATABASE_URL']) return null;
  try {
    const prismaRecord = asRecord(prisma);
    const dmmfRecord = prismaRecord ? asRecord(prismaRecord['_dmmf']) : null;
    const datamodel = dmmfRecord?.['datamodel'];
    return isDmmfDatamodel(datamodel) ? datamodel : null;
  } catch {
    return null;
  }
};

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

      // Sort fields: _id first, then alphabetically
      fields.sort((a: FieldInfo, b: FieldInfo) => {
        if (a.name === '_id') return -1;
        if (b.name === '_id') return 1;
        return a.name.localeCompare(b.name);
      });

      const entry: CollectionSchema = { name: collName, fields };

      if (includeCounts) {
        try {
          entry.documentCount = await coll.estimatedDocumentCount();
        } catch {
          // Best-effort count
        }
      }

      return entry;
    }
  );

  collections.sort((a: CollectionSchema, b: CollectionSchema) => a.name.localeCompare(b.name));
  return { provider: 'mongodb', collections };
}

async function getPrismaSchema(includeCounts = false): Promise<SchemaResponse> {
  // Accessing internal DMMF for schema introspection
  const dmmf = getPrismaDmmf();
  const collections: CollectionSchema[] = [];

  if (dmmf?.models) {
    const modelEntries = await mapWithConcurrency(
      dmmf.models,
      PRISMA_COUNT_CONCURRENCY,
      async (model) => {
        const fields: FieldInfo[] = model.fields.map((field: DmmfField) => ({
          name: field.name,
          type: field.type,
          isRequired: field.isRequired ?? null,
          isId: field.isId ?? null,
          isUnique: field.isUnique ?? null,
          hasDefault: field.hasDefaultValue ?? null,
          relationTo: field.relationName ?? null,
        }));

        const entry: CollectionSchema = { name: model.name, fields };

        if (includeCounts) {
          const key = model.name.charAt(0).toLowerCase() + model.name.slice(1);
          const countFn = getPrismaCountFn(Reflect.get(prisma, key));
          if (countFn) {
            try {
              entry.documentCount = await countFn();
            } catch {
              // Best-effort count
            }
          }
        }

        return entry;
      }
    );
    collections.push(...modelEntries);
  }
  if (collections.length === 0) {
    const schemaText = readPrismaSchemaFile();
    if (schemaText) {
      collections.push(...parsePrismaSchemaModels(schemaText));
    }
  }

  collections.sort((a: CollectionSchema, b: CollectionSchema) => a.name.localeCompare(b.name));
  return { provider: 'prisma', collections };
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

  if (providerParam === 'mongodb') {
    const schema = await getMongoSchema(includeCounts);
    return NextResponse.json(schema);
  }
  if (providerParam === 'prisma') {
    const schema = await getPrismaSchema(includeCounts);
    return NextResponse.json(schema);
  }

  if (providerParam === 'all') {
    const sources: Record<string, Record<string, unknown>> = {};
    const collections: Array<CollectionSchema & { provider: SchemaProvider }> = [];
    const [mongoResult, prismaResult] = await Promise.allSettled([
      getMongoSchema(includeCounts),
      getPrismaSchema(includeCounts),
    ]);

    if (mongoResult.status === 'fulfilled') {
      sources['mongodb'] = toSchemaSource(mongoResult.value);
      collections.push(...enrichCollections(mongoResult.value, 'mongodb'));
    } else {
      const { ErrorSystem } = await import('@/shared/lib/observability/system-logger');
      void ErrorSystem.logWarning('Failed to fetch MongoDB schema', {
        error: mongoResult.reason,
        service: 'api/databases/schema',
      });
    }

    if (prismaResult.status === 'fulfilled') {
      sources['prisma'] = toSchemaSource(prismaResult.value);
      collections.push(...enrichCollections(prismaResult.value, 'prisma'));
    } else {
      const { ErrorSystem } = await import('@/shared/lib/observability/system-logger');
      void ErrorSystem.logWarning('Failed to fetch Prisma schema', {
        error: prismaResult.reason,
        service: 'api/databases/schema',
      });
    }

    const payload: SchemaResponse = {
      provider: 'multi',
      collections,
      sources,
    };
    return NextResponse.json(payload);
  }

  const provider = await getAppDbProvider();
  if (provider === 'mongodb') {
    const schema = await getMongoSchema(includeCounts);
    return NextResponse.json(schema);
  }
  const schema = await getPrismaSchema(includeCounts);
  return NextResponse.json(schema);
}
