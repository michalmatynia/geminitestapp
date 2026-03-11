import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import type {
  DatabaseBrowseParams as BrowseParams,
  DatabaseBrowse as BrowseResponse,
} from '@/shared/contracts/database';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import {
  optionalIntegerQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { assertDatabaseEngineManageAccess } from '@/shared/lib/db/services/database-engine-access';

export const querySchema = z.object({
  collection: optionalTrimmedQueryString(),
  limit: optionalIntegerQuerySchema(z.number().int().min(1)).default(20),
  skip: optionalIntegerQuerySchema(z.number().int().min(0)).default(0),
  query: optionalTrimmedQueryString(),
  provider: optionalTrimmedQueryString(),
});

async function browseMongoCollection(params: BrowseParams): Promise<BrowseResponse> {
  const db = await getMongoDb();
  const { collection, limit = 20, skip = 0, query } = params;

  const coll = db.collection(collection);

  // Parse query filter if provided
  let filter: Record<string, unknown> = {};
  if (query) {
    try {
      filter = JSON.parse(query) as Record<string, unknown>;
    } catch {
      // If not valid JSON, try text search on common fields
      filter = {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { title: { $regex: query, $options: 'i' } },
          { _id: query },
        ],
      };
    }
  }

  const [documents, total] = await Promise.all([
    coll.find(filter).skip(skip).limit(limit).toArray(),
    coll.countDocuments(filter),
  ]);

  // Convert ObjectId and Date to strings for JSON serialization
  const serializedDocs = (documents as Record<string, unknown>[]).map(
    (doc: Record<string, unknown>) => {
      const serialized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(doc)) {
        if (value instanceof ObjectId) {
          serialized[key] = value.toString();
        } else if (value instanceof Date) {
          serialized[key] = value.toISOString();
        } else if (Array.isArray(value)) {
          serialized[key] = (value as unknown[]).map((item: unknown) => {
            if (item instanceof ObjectId) {
              return item.toString();
            }
            return item;
          });
        } else {
          serialized[key] = value;
        }
      }
      return serialized;
    }
  );

  return {
    provider: 'mongodb',
    collection,
    documents: serializedDocs,
    total,
    limit,
    skip,
  };
}

export async function GET_handler(
  _request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const collection = query.collection ?? null;
  const providerParam = query.provider?.toLowerCase() ?? '';

  if (!collection) {
    throw badRequestError('Collection parameter is required');
  }

  if (providerParam && providerParam !== 'mongodb' && providerParam !== 'auto') {
    throw badRequestError('Only MongoDB browsing is supported.');
  }

  const params: BrowseParams = { collection, limit: query.limit, skip: query.skip };
  if (query.query !== undefined) {
    params.query = query.query;
  }

  const result = await browseMongoCollection(params);
  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
