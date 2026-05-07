import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, forbiddenError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { getMongoClient } from '@/shared/lib/db/mongo-client';
import { assertDatabaseEngineManageAccess } from '@/features/database/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const databaseExecuteRequestSchema = z.object({
  sql: z.string().trim().min(1).optional(),
  type: z.enum(['mongodb', 'auto']).optional().default('auto'),
  collection: z.string().trim().min(1).optional(),
  operation: z
    .enum(['find', 'insertOne', 'updateOne', 'deleteOne', 'deleteMany', 'aggregate', 'countDocuments'])
    .optional(),
  filter: z.record(z.string(), z.unknown()).optional(),
  document: z.record(z.string(), z.unknown()).optional(),
  update: z.record(z.string(), z.unknown()).optional(),
  pipeline: z.array(z.record(z.string(), z.unknown())).optional(),
});

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  if (process.env['NODE_ENV'] === 'production') {
    throw forbiddenError('Database operations are disabled in production.');
  }

  const parsedBody = await parseJsonBody(req, databaseExecuteRequestSchema, {
    logPrefix: 'databases.execute',
  });
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const parsed = parsedBody.data;
  if (parsed.sql) {
    throw badRequestError('SQL execution is no longer supported. Use MongoDB collection operations.');
  }
  if (!parsed.collection) {
    throw badRequestError('Collection name is required for MongoDB operations.');
  }

  try {
    return await handleMongoOperation(parsed);
  } catch (error) {
    void ErrorSystem.captureException(error);
    try {
      const { ErrorSystem } = await import('@/shared/lib/observability/system-logger');
      void ErrorSystem.captureException(error, {
        service: 'api/databases/execute',
        provider: 'mongodb',
        collection: parsed.collection,
      });
    } catch (error) {
      void ErrorSystem.captureException(error);
    
      // Ignore error capture failures
    }
    throw error;
  }
}

async function handleMongoOperation(parsed: {
  collection?: string;
  operation?: string;
  filter?: Record<string, unknown>;
  document?: Record<string, unknown>;
  update?: Record<string, unknown>;
  pipeline?: Record<string, unknown>[];
}): Promise<Response> {
  const { collection: collName, operation, filter, document, update, pipeline } = parsed;

  if (!collName) {
    throw badRequestError('Collection name is required for MongoDB operations.');
  }
  if (!operation) {
    throw badRequestError('Operation is required for MongoDB operations.');
  }

  const mongoClient = await getMongoClient();
  const dbName = process.env['MONGODB_DB'] ?? 'stardb';
  const db = mongoClient.db(dbName);
  const collection = db.collection(collName);
  const startTime = Date.now();

  let result: unknown;
  let rowCount: number;

  switch (operation) {
    case 'find': {
      const docs = await collection
        .find(filter ?? {})
        .limit(200)
        .toArray();
      result = docs;
      rowCount = docs.length;
      break;
    }
    case 'insertOne': {
      if (!document) {
        throw badRequestError('Document is required for insertOne.');
      }
      const insertResult = await collection.insertOne(document);
      result = [{ insertedId: insertResult.insertedId }];
      rowCount = insertResult.acknowledged ? 1 : 0;
      break;
    }
    case 'updateOne': {
      if (!update) {
        throw badRequestError('Update object is required for updateOne.');
      }
      const updateResult = await collection.updateOne(filter ?? {}, update);
      result = [
        { matchedCount: updateResult.matchedCount, modifiedCount: updateResult.modifiedCount },
      ];
      rowCount = updateResult.modifiedCount;
      break;
    }
    case 'deleteOne': {
      const deleteResult = await collection.deleteOne(filter ?? {});
      result = [{ deletedCount: deleteResult.deletedCount }];
      rowCount = deleteResult.deletedCount;
      break;
    }
    case 'deleteMany': {
      const deleteManyResult = await collection.deleteMany(filter ?? {});
      result = [{ deletedCount: deleteManyResult.deletedCount }];
      rowCount = deleteManyResult.deletedCount;
      break;
    }
    case 'countDocuments': {
      const count = await collection.countDocuments(filter ?? {});
      result = [{ count }];
      rowCount = 1;
      break;
    }
    case 'aggregate': {
      if (!pipeline) {
        throw badRequestError('Pipeline is required for aggregate.');
      }
      const aggDocs = await collection.aggregate(pipeline).toArray();
      result = aggDocs;
      rowCount = aggDocs.length;
      break;
    }
    default:
      throw badRequestError(`Unsupported operation: ${operation}`);
  }

  const duration = Date.now() - startTime;
  return NextResponse.json({
    rows: Array.isArray(result) ? result : [],
    rowCount,
    fields: [],
    command: operation,
    executionTimeMs: duration,
  });
}
