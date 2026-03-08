import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type {
  DatabaseBrowseParams as BrowseParams,
  DatabaseBrowse as BrowseResponse,
} from '@/shared/contracts/database';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { resolveCollectionProviderForRequest } from '@/shared/lib/db/collection-provider-map';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

type PrismaBrowseModel = {
  findMany: (args: unknown) => Promise<unknown[]>;
  count: (args: unknown) => Promise<number>;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const isPrismaBrowseModel = (value: unknown): value is PrismaBrowseModel => {
  const record = asRecord(value);
  return (
    record !== null &&
    typeof record['findMany'] === 'function' &&
    typeof record['count'] === 'function'
  );
};

const toBrowseDocument = (value: unknown): Record<string, unknown> => asRecord(value) ?? { value };

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

async function browsePrismaCollection(params: BrowseParams): Promise<BrowseResponse> {
  const { collection, limit = 20, skip = 0, query } = params;

  // Get the Prisma model dynamically
  const modelName = collection.charAt(0).toLowerCase() + collection.slice(1);
  const model = Reflect.get(prisma, modelName);

  if (!isPrismaBrowseModel(model)) {
    return {
      provider: 'prisma',
      collection,
      documents: [],
      total: 0,
      limit,
      skip,
    };
  }

  // Build where clause if query provided
  let where: Record<string, unknown> = {};
  if (query) {
    try {
      where = JSON.parse(query) as Record<string, unknown>;
    } catch {
      // Try to search by common fields
      where = {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { title: { contains: query, mode: 'insensitive' } },
          { id: query },
        ],
      };
    }
  }

  try {
    const [documents, total] = await Promise.all([
      model.findMany({
        where,
        skip,
        take: limit,
      }),
      model.count({ where }),
    ]);

    return {
      provider: 'prisma',
      collection,
      documents: documents.map(toBrowseDocument),
      total,
      limit,
      skip,
    };
  } catch (error) {
    void ErrorSystem.captureException(error, { service: 'api/databases/browse', collection });
    return {
      provider: 'prisma',
      collection,
      documents: [],
      total: 0,
      limit,
      skip,
    };
  }
}

export async function GET_handler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const collection = searchParams.get('collection');
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);
  const skip = parseInt(searchParams.get('skip') ?? '0', 10);
  const query = searchParams.get('query') ?? undefined;
  const providerParam = (searchParams.get('provider') ?? '').toLowerCase();

  if (!collection) {
    throw badRequestError('Collection parameter is required');
  }

  const provider = await resolveCollectionProviderForRequest(
    collection,
    providerParam === 'mongodb' || providerParam === 'prisma' ? providerParam : 'auto'
  );

  const params: BrowseParams = { collection, limit, skip };
  if (query !== undefined) {
    params.query = query;
  }

  if (provider === 'mongodb') {
    const result = await browseMongoCollection(params);
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } else {
    const result = await browsePrismaCollection(params);
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }
}
