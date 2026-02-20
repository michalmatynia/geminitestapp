

import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

import { badRequestError, forbiddenError } from '@/shared/errors/app-error';
import { resolveCollectionProviderForRequest } from '@/shared/lib/db/collection-provider-map';
import { getMongoClient } from '@/shared/lib/db/mongo-client';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

// Validate table/collection name to prevent injection
const SAFE_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  if (process.env['NODE_ENV'] === 'production') {
    throw forbiddenError('Database operations are disabled in production.');
  }

  const parsed = await req.json() as {
    table?: string;
    operation?: 'insert' | 'update' | 'delete';
    type?: 'postgresql' | 'mongodb' | 'auto';
    data?: Record<string, unknown>;
    primaryKey?: Record<string, unknown>;
  };

  const { table, operation, data, primaryKey } = parsed;
  const requestedType = parsed.type ?? 'auto';
  if (!['postgresql', 'mongodb', 'auto'].includes(requestedType)) {
    throw badRequestError('Type must be postgresql, mongodb, or auto.');
  }

  if (!table || !SAFE_NAME_RE.test(table)) {
    throw badRequestError('Valid table/collection name is required.');
  }
  if (!operation || !['insert', 'update', 'delete'].includes(operation)) {
    throw badRequestError('Operation must be insert, update, or delete.');
  }

  const provider =
    requestedType === 'postgresql'
      ? 'prisma'
      : requestedType === 'mongodb'
        ? 'mongodb'
        : await resolveCollectionProviderForRequest(table, 'auto');

  if (provider === 'mongodb') {
    return handleMongoCrud(table, operation, data, primaryKey);
  }

  return handlePostgresCrud(table, operation, data, primaryKey);
}

async function handlePostgresCrud(
  table: string,
  operation: 'insert' | 'update' | 'delete',
  data?: Record<string, unknown>,
  primaryKey?: Record<string, unknown>
): Promise<Response> {
  const dbUrl = process.env['DATABASE_URL'] ?? '';
  if (!dbUrl.startsWith('postgres://') && !dbUrl.startsWith('postgresql://')) {
    throw badRequestError('No PostgreSQL database configured.');
  }

  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();

    if (operation === 'insert') {
      if (!data || Object.keys(data).length === 0) {
        throw badRequestError('Data is required for insert.');
      }
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns.map((_: string, i: number) => `$${i + 1}`);
      const quotedColumns = columns.map((c: string) => `"${c}"`);

      const sql = `INSERT INTO "${table}" (${quotedColumns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
      const result = await client.query(sql, values);

      return NextResponse.json({
        success: true,
        rowCount: result.rowCount ?? 0,
        returning: result.rows,
      });
    }

    if (operation === 'update') {
      if (!data || Object.keys(data).length === 0) {
        throw badRequestError('Data is required for update.');
      }
      if (!primaryKey || Object.keys(primaryKey).length === 0) {
        throw badRequestError('Primary key is required for update.');
      }

      const setCols = Object.keys(data);
      const setValues = Object.values(data);
      const whereCols = Object.keys(primaryKey);
      const whereValues = Object.values(primaryKey);

      let paramIndex = 1;
      const setClause = setCols.map((c: string) => `"${c}" = $${paramIndex++}`).join(', ');
      const whereClause = whereCols.map((c: string) => `"${c}" = $${paramIndex++}`).join(' AND ');

      const sql = `UPDATE "${table}" SET ${setClause} WHERE ${whereClause} RETURNING *`;
      const result = await client.query(sql, [...setValues, ...whereValues]);

      return NextResponse.json({
        success: true,
        rowCount: result.rowCount ?? 0,
        returning: result.rows,
      });
    }

    // delete
    if (!primaryKey || Object.keys(primaryKey).length === 0) {
      throw badRequestError('Primary key is required for delete.');
    }

    const whereCols = Object.keys(primaryKey);
    const whereValues = Object.values(primaryKey);
    let paramIndex = 1;
    const whereClause = whereCols.map((c: string) => `"${c}" = $${paramIndex++}`).join(' AND ');

    const sql = `DELETE FROM "${table}" WHERE ${whereClause} RETURNING *`;
    const result = await client.query(sql, whereValues);

    return NextResponse.json({
      success: true,
      rowCount: result.rowCount ?? 0,
      returning: result.rows,
    });
  } finally {
    await client.end().catch(() => {});
  }
}

function toObjectId(value: unknown): ObjectId | unknown {
  if (typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value)) {
    try { return new ObjectId(value); } catch { return value; }
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

