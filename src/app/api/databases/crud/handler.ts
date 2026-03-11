import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, forbiddenError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { getMongoClient } from '@/shared/lib/db/mongo-client';
import { assertDatabaseEngineManageAccess } from '@/shared/lib/db/services/database-engine-access';

// Validate table/collection name to prevent injection
const SAFE_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const nonEmptyRecordSchema = z.record(z.string(), z.unknown()).refine(
  (value) => Object.keys(value).length > 0,
  'Object cannot be empty.'
);
const databaseCrudRequestSchema = z.union([
  z.object({
    table: z.string().trim().regex(SAFE_NAME_RE, 'Valid table/collection name is required.'),
    operation: z.literal('insert'),
    type: z.enum(['mongodb', 'auto']).optional().default('auto'),
    data: nonEmptyRecordSchema,
    primaryKey: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    table: z.string().trim().regex(SAFE_NAME_RE, 'Valid table/collection name is required.'),
    operation: z.literal('update'),
    type: z.enum(['mongodb', 'auto']).optional().default('auto'),
    data: nonEmptyRecordSchema,
    primaryKey: nonEmptyRecordSchema,
  }),
  z.object({
    table: z.string().trim().regex(SAFE_NAME_RE, 'Valid table/collection name is required.'),
    operation: z.literal('delete'),
    type: z.enum(['mongodb', 'auto']).optional().default('auto'),
    data: z.record(z.string(), z.unknown()).optional(),
    primaryKey: nonEmptyRecordSchema,
  }),
]);

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  if (process.env['NODE_ENV'] === 'production') {
    throw forbiddenError('Database operations are disabled in production.');
  }

  const parsedBody = await parseJsonBody(req, databaseCrudRequestSchema, {
    logPrefix: 'databases.crud',
  });
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const parsed = parsedBody.data;
  const { table, operation, data, primaryKey } = parsed;
  return handleMongoCrud(table, operation, data, primaryKey);
}

function toObjectId(value: unknown): ObjectId | unknown {
  if (typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value)) {
    try {
      return new ObjectId(value);
    } catch {
      return value;
    }
  }
  return value;
}

async function handleMongoCrud(
  collectionName: string,
  operation: 'insert' | 'update' | 'delete',
  data?: Record<string, unknown>,
  primaryKey?: Record<string, unknown>
): Promise<Response> {
  const mongoClient = await getMongoClient();
  const dbName = process.env['MONGODB_DB'] ?? 'stardb';
  const db = mongoClient.db(dbName);
  const collection = db.collection(collectionName);

  if (operation === 'insert') {
    if (!data || Object.keys(data).length === 0) {
      throw badRequestError('Data is required for insert.');
    }
    const result = await collection.insertOne(data);
    return NextResponse.json({
      success: result.acknowledged,
      rowCount: result.acknowledged ? 1 : 0,
      returning: [{ _id: result.insertedId, ...data }],
    });
  }

  if (operation === 'update') {
    if (!data || Object.keys(data).length === 0) {
      throw badRequestError('Data is required for update.');
    }
    if (!primaryKey || Object.keys(primaryKey).length === 0) {
      throw badRequestError('Primary key is required for update.');
    }
    const filter: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(primaryKey)) {
      filter[k] = k === '_id' ? toObjectId(v) : v;
    }
    const result = await collection.updateOne(filter, { $set: data });
    return NextResponse.json({
      success: result.acknowledged,
      rowCount: result.modifiedCount,
    });
  }

  // delete
  if (!primaryKey || Object.keys(primaryKey).length === 0) {
    throw badRequestError('Primary key is required for delete.');
  }
  const filter: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(primaryKey)) {
    filter[k] = k === '_id' ? toObjectId(v) : v;
  }
  const result = await collection.deleteOne(filter);
  return NextResponse.json({
    success: result.acknowledged,
    rowCount: result.deletedCount,
  });
}
