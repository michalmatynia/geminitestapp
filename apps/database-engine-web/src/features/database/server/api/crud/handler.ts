import { ObjectId } from 'mongodb';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  databaseEngineManagedMongoApplicationSchema,
  mongoSourceSchema,
} from '@/shared/contracts/database';
import { badRequestError, forbiddenError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { getMongoClient } from '@/shared/lib/db/mongo-client';
import { createManagedMongoClient } from '@/shared/lib/db/services/managed-mongo-databases';
import { assertDatabaseEngineManageAccess } from '@/features/database/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const MONGO_COLLECTION_NAME_MAX_LENGTH = 255;
const isValidMongoCollectionName = (value: string): boolean => {
  if (value.length === 0 || value.length > MONGO_COLLECTION_NAME_MAX_LENGTH) return false;
  if (value.includes('\0') || value.includes('$')) return false;
  return !value.startsWith('system.');
};
const collectionNameSchema = z
  .string()
  .trim()
  .min(1, 'Collection name is required.')
  .max(MONGO_COLLECTION_NAME_MAX_LENGTH, 'Collection name is too long.')
  .refine(isValidMongoCollectionName, 'Valid MongoDB collection name is required.');
const nonEmptyRecordSchema = z.record(z.string(), z.unknown()).refine(
  (value) => Object.keys(value).length > 0,
  'Object cannot be empty.'
);
const databaseCrudRequestSchema = z.union([
  z.object({
    table: collectionNameSchema,
    operation: z.literal('insert'),
    type: z.enum(['mongodb', 'auto']).optional().default('auto'),
    application: databaseEngineManagedMongoApplicationSchema.optional(),
    source: mongoSourceSchema.optional(),
    data: nonEmptyRecordSchema,
    primaryKey: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    table: collectionNameSchema,
    operation: z.literal('update'),
    type: z.enum(['mongodb', 'auto']).optional().default('auto'),
    application: databaseEngineManagedMongoApplicationSchema.optional(),
    source: mongoSourceSchema.optional(),
    data: nonEmptyRecordSchema,
    primaryKey: nonEmptyRecordSchema,
  }),
  z.object({
    table: collectionNameSchema,
    operation: z.literal('delete'),
    type: z.enum(['mongodb', 'auto']).optional().default('auto'),
    application: databaseEngineManagedMongoApplicationSchema.optional(),
    source: mongoSourceSchema.optional(),
    data: z.record(z.string(), z.unknown()).optional(),
    primaryKey: nonEmptyRecordSchema,
  }),
]);

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  if (process.env['NODE_ENV'] === 'production') {
    throw forbiddenError('Database operations are disabled in production.');
  }

  const parsedBody = await parseJsonBody(req, databaseCrudRequestSchema, {
    logPrefix: 'database-engine-web.databases.crud',
  });
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const parsed = parsedBody.data;
  const { table, operation, data, primaryKey, application, source } = parsed;
  return handleMongoCrud(table, operation, data, primaryKey, application, source);
}

function toObjectId(value: unknown): ObjectId | unknown {
  if (typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value)) {
    try {
      return new ObjectId(value);
    } catch (error) {
      void ErrorSystem.captureException(error);
      return value;
    }
  }
  return value;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toDate = (value: unknown): Date | unknown => {
  if (typeof value !== 'string') return value;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? value : new Date(timestamp);
};

const normalizeMongoCrudValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalizeMongoCrudValue);
  }
  if (!isRecord(value)) {
    return value;
  }

  const entries = Object.entries(value);
  if (entries.length === 1 && typeof value['$oid'] === 'string') {
    return toObjectId(value['$oid']);
  }
  if (entries.length === 1 && typeof value['$date'] === 'string') {
    return toDate(value['$date']);
  }

  return Object.fromEntries(
    entries.map(([key, nestedValue]) => [key, normalizeMongoCrudValue(nestedValue)])
  );
};

const normalizeMongoCrudDocument = (
  data: Record<string, unknown>
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, normalizeMongoCrudValue(value)])
  );

const buildPrimaryKeyFilter = (primaryKey: Record<string, unknown>): Record<string, unknown> => {
  const filter: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(primaryKey)) {
    filter[key] = key === '_id' ? toObjectId(value) : normalizeMongoCrudValue(value);
  }
  return filter;
};

const stripImmutableMongoFields = (
  data: Record<string, unknown>,
  primaryKey: Record<string, unknown>
): Record<string, unknown> => {
  const sanitized = { ...data };
  delete sanitized['_id'];
  for (const key of Object.keys(primaryKey)) {
    delete sanitized[key];
  }
  return sanitized;
};

async function handleMongoCrud(
  collectionName: string,
  operation: 'insert' | 'update' | 'delete',
  data?: Record<string, unknown>,
  primaryKey?: Record<string, unknown>,
  application?: z.infer<typeof databaseEngineManagedMongoApplicationSchema>,
  source?: z.infer<typeof mongoSourceSchema>
): Promise<Response> {
  const managedMongo = application
    ? await createManagedMongoClient(application, source ?? 'local')
    : null;
  const mongoClient = managedMongo?.client ?? (await getMongoClient());
  const dbName = managedMongo?.dbName ?? process.env['MONGODB_DB'] ?? 'stardb';
  const db = managedMongo?.db ?? mongoClient.db(dbName);
  const collection = db.collection(collectionName);

  try {
    if (operation === 'insert') {
      if (!data || Object.keys(data).length === 0) {
        throw badRequestError('Data is required for insert.');
      }
      const insertData = normalizeMongoCrudDocument(data);
      const result = await collection.insertOne(insertData);
      return NextResponse.json({
        success: result.acknowledged,
        rowCount: result.acknowledged ? 1 : 0,
        returning: [{ _id: result.insertedId, ...insertData }],
      });
    }

    if (operation === 'update') {
      if (!data || Object.keys(data).length === 0) {
        throw badRequestError('Data is required for update.');
      }
      if (!primaryKey || Object.keys(primaryKey).length === 0) {
        throw badRequestError('Primary key is required for update.');
      }
      const updateData = stripImmutableMongoFields(data, primaryKey);
      if (Object.keys(updateData).length === 0) {
        throw badRequestError('At least one non-primary-key field is required for update.');
      }
      const result = await collection.updateOne(buildPrimaryKeyFilter(primaryKey), {
        $set: normalizeMongoCrudDocument(updateData),
      });
      return NextResponse.json({
        success: result.acknowledged,
        rowCount: result.modifiedCount,
      });
    }

    if (!primaryKey || Object.keys(primaryKey).length === 0) {
      throw badRequestError('Primary key is required for delete.');
    }
    const result = await collection.deleteOne(buildPrimaryKeyFilter(primaryKey));
    return NextResponse.json({
      success: result.acknowledged,
      rowCount: result.deletedCount,
    });
  } finally {
    if (managedMongo !== null) {
      await managedMongo.client.close().catch(() => undefined);
    }
  }
}
