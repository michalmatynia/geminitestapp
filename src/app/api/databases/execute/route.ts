export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

import { badRequestError, forbiddenError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import { getMongoClient } from '@/shared/lib/db/mongo-client';
import type { ApiHandlerContext } from '@/shared/types/api';

const QUERY_TIMEOUT_MS = 30_000;

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  if (process.env['NODE_ENV'] === 'production') {
    throw forbiddenError('Database operations are disabled in production.');
  }

  const parsed = await req.json() as {
    sql?: string;
    type?: 'postgresql' | 'mongodb';
    // MongoDB fields
    collection?: string;
    operation?: 'find' | 'insertOne' | 'updateOne' | 'deleteOne' | 'deleteMany' | 'aggregate' | 'countDocuments';
    filter?: Record<string, unknown>;
    document?: Record<string, unknown>;
    update?: Record<string, unknown>;
    pipeline?: Record<string, unknown>[];
  };

  const dbType = parsed.type ?? 'postgresql';

  if (dbType === 'mongodb') {
    return handleMongoOperation(parsed);
  }

  return handlePostgresQuery(parsed.sql);

}

async function handlePostgresQuery(sql: string | undefined): Promise<Response> {
  if (!sql?.trim()) {
    throw badRequestError('SQL query is required.');
  }

  const dbUrl = process.env['DATABASE_URL'] ?? '';
  if (!dbUrl.startsWith('postgres://') && !dbUrl.startsWith('postgresql://')) {
    throw badRequestError('No PostgreSQL database configured.');
  }

  const client = new Client({ connectionString: dbUrl });
  const startTime = Date.now();

  try {
    await client.connect();
    await client.query(`SET statement_timeout = ${QUERY_TIMEOUT_MS}`);

    const result = await client.query(sql);
    const duration = Date.now() - startTime;

    return NextResponse.json({
      rows: result.rows ?? [],
      rowCount: result.rowCount ?? 0,
      fields: (result.fields ?? []).map((f: { name: string; dataTypeID: number }) => ({
        name: f.name,
        dataTypeID: f.dataTypeID,
      })),
      command: result.command ?? '',
      duration,
    });
  } finally {
    await client.end().catch(() => {});
  }
}

async function handleMongoOperation(
  parsed: {
    collection?: string;
    operation?: string;
    filter?: Record<string, unknown>;
    document?: Record<string, unknown>;
    update?: Record<string, unknown>;
    pipeline?: Record<string, unknown>[];
  }
): Promise<Response> {
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
  let rowCount = 0;

  switch (operation) {
    case 'find': {
      const docs = await collection.find(filter ?? {}).limit(200).toArray();
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
      result = [{ matchedCount: updateResult.matchedCount, modifiedCount: updateResult.modifiedCount }];
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
    duration,
  });
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'databases.execute.POST' }
);
