import { readFileSync } from 'node:fs';
import path from 'node:path';

import { NextRequest, NextResponse } from 'next/server';

import type { 
  FieldInfoDto as FieldInfo, 
  CollectionSchemaDto as CollectionSchema, 
  SchemaProviderDto as SchemaProvider,
  SchemaResponseDto as SchemaResponse,
  SchemaResponsePayloadDto as SchemaResponsePayload
} from '@/shared/contracts/database';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

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

const PRISMA_SCHEMA_ENV_PATH = process.env['PRISMA_SCHEMA_PATH'];
const PRISMA_SCHEMA_DEFAULT_PATH = path.join(process.cwd(), 'prisma', 'schema.prisma');

const readPrismaSchemaFile = (): string | null => {
  const schemaPath = PRISMA_SCHEMA_ENV_PATH
    ? path.isAbsolute(PRISMA_SCHEMA_ENV_PATH)
      ? PRISMA_SCHEMA_ENV_PATH
      : path.join(process.cwd(), PRISMA_SCHEMA_ENV_PATH)
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

const normalizePrismaFieldType = (
  rawType: string
): { type: string; isRequired: boolean } => {
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
    return (prisma as unknown as { _dmmf?: { datamodel?: DmmfDatamodel } })._dmmf?.datamodel ?? null;
  } catch {
    return null;
  }
};

async function getMongoSchema(includeCounts = false): Promise<SchemaResponse> {
  const db = await getMongoDb();
  const collectionInfos = await db.listCollections().toArray();
  const collections: CollectionSchema[] = [];

  for (const info of collectionInfos) {
    const collName = info.name;
    if (collName.startsWith('system.')) continue;

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

    collections.push(entry);
  }

  collections.sort((a: CollectionSchema, b: CollectionSchema) => a.name.localeCompare(b.name));
  return { provider: 'mongodb', collections };
}

async function getPrismaSchema(includeCounts = false): Promise<SchemaResponse> {
  // Accessing internal DMMF for schema introspection
  const dmmf = getPrismaDmmf();
  const collections: CollectionSchema[] = [];

  if (dmmf?.models) {
    for (const model of dmmf.models) {
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
        const prismaModel = (prisma as unknown as Record<string, { count?: (args?: unknown) => Promise<number> }>)[key];
        if (prismaModel?.count) {
          try {
            entry.documentCount = await prismaModel.count();
          } catch {
            // Best-effort count
          }
        }
      }

      collections.push(entry);
    }
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
    ? (schema.collections)
    : Object.values(schema.collections as Record<string, CollectionSchema>);

  return collections.map((collection: CollectionSchema) => ({
    ...collection,
    provider,
  }));
};

export async function getDatabasesSchemaHandler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const providerParam = (searchParams.get('provider') ?? 'auto').toLowerCase();
  const includeCounts = searchParams.get('includeCounts') === 'true';

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

    try {
      const mongoSchema = await getMongoSchema(includeCounts);
      sources['mongodb'] = mongoSchema as unknown as Record<string, unknown>;
      collections.push(...enrichCollections(mongoSchema, 'mongodb'));
    } catch (error) {
      const { ErrorSystem } = await import('@/features/observability/server');
      void ErrorSystem.logWarning('Failed to fetch MongoDB schema', { error, service: 'api/databases/schema' });
    }

    try {
      const prismaSchema = await getPrismaSchema(includeCounts);
      sources['prisma'] = prismaSchema as unknown as Record<string, unknown>;
      collections.push(...enrichCollections(prismaSchema, 'prisma'));
    } catch (error) {
      const { ErrorSystem } = await import('@/features/observability/server');
      void ErrorSystem.logWarning('Failed to fetch Prisma schema', { error, service: 'api/databases/schema' });
    }

    const payload: SchemaResponsePayload = {
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
