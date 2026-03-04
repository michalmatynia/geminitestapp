/**
 * @vitest-environment node
 */

import { ObjectId } from 'mongodb';
import { NextRequest } from 'next/server';
import { vi } from 'vitest';

import { POST as POST_DB_ACTION } from '@/app/api/ai-paths/db-action/route';
import { isCollectionAllowed, requireAiPathsAccessOrInternal } from '@/features/ai/ai-paths/server';
import { parseJsonBody } from '@/features/products/server';
import { resolveCollectionProviderForRequest } from '@/shared/lib/db/collection-provider-map';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

const hoistedPrisma = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  count: vi.fn(),
}));

const hoistedResolver = vi.hoisted(() => ({
  resolveCollectionProviderForRequest: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn(),
}));

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    product: {
      findMany: hoistedPrisma.findMany,
      findFirst: hoistedPrisma.findFirst,
      count: hoistedPrisma.count,
    },
  },
}));

vi.mock('@/shared/lib/db/collection-provider-map', () => ({
  resolveCollectionProviderForRequest: hoistedResolver.resolveCollectionProviderForRequest,
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccessOrInternal: vi.fn(),
  enforceAiPathsActionRateLimit: vi.fn(),
  isCollectionAllowed: vi.fn(),
}));

vi.mock('@/features/products/server', () => ({
  parseJsonBody: vi.fn(),
}));

describe('AI Paths db-action API', () => {
  const findOne = vi.fn();
  const toArray = vi.fn();
  const limit = vi.fn();
  const sort = vi.fn();
  const find = vi.fn();
  const countDocuments = vi.fn();
  const collection = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();

    const cursor = { sort, limit, toArray };
    sort.mockReturnValue(cursor);
    limit.mockReturnValue(cursor);
    find.mockReturnValue(cursor);

    collection.mockReturnValue({
      findOne,
      find,
      countDocuments,
    });

    vi.mocked(getMongoDb).mockResolvedValue({
      collection,
    } as unknown as Awaited<ReturnType<typeof getMongoDb>>);
    hoistedPrisma.findMany.mockResolvedValue([]);
    hoistedPrisma.findFirst.mockResolvedValue(null);
    hoistedPrisma.count.mockResolvedValue(0);
    vi.mocked(resolveCollectionProviderForRequest).mockImplementation(
      async (_collection, requestedProvider) => {
        if (requestedProvider === 'mongodb' || requestedProvider === 'prisma') {
          return requestedProvider;
        }
        return 'mongodb';
      }
    );
    vi.mocked(requireAiPathsAccessOrInternal).mockResolvedValue({
      access: { userId: 'u1', permissions: ['ai_paths.manage'], isElevated: true },
      isInternal: true,
    } as Awaited<ReturnType<typeof requireAiPathsAccessOrInternal>>);
    vi.mocked(isCollectionAllowed).mockReturnValue(true);
    vi.mocked(parseJsonBody).mockImplementation(async (req: Request) => {
      const raw = await req.text();
      const data = raw ? JSON.parse(raw) : {};
      return { ok: true, data };
    });
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    process.env['DATABASE_URL'] = 'postgres://localhost:5432/test';
  });

  afterAll(() => {
    delete process.env['MONGODB_URI'];
    delete process.env['DATABASE_URL'];
  });

  it('returns single Mongo document in "item" shape and retries _id as ObjectId when needed', async () => {
    findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: new ObjectId('507f1f77bcf86cd799439011'), sku: 'SKU-1' });

    const res = await POST_DB_ACTION(
      new NextRequest('http://localhost/api/ai-paths/db-action', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'mongodb',
          collection: 'products',
          action: 'findOne',
          filter: { _id: '507f1f77bcf86cd799439011' },
          idType: 'string',
        }),
      })
    );

    const payload = await res.json();
    expect(res.status).toBe(200);
    expect(payload).toMatchObject({
      item: { sku: 'SKU-1' },
      count: 1,
      requestedProvider: 'mongodb',
      resolvedProvider: 'mongodb',
    });
    expect(findOne).toHaveBeenCalledTimes(2);
    const firstFilter = findOne.mock.calls[0]?.[0] as Record<string, unknown>;
    const secondFilter = findOne.mock.calls[1]?.[0] as Record<string, unknown>;
    expect(firstFilter['_id']).toBe('507f1f77bcf86cd799439011');
    expect(secondFilter['_id']).toBeInstanceOf(ObjectId);
  });

  it('returns Mongo list count from countDocuments (not limited item length)', async () => {
    toArray.mockResolvedValue([{ sku: 'A' }, { sku: 'B' }]);
    countDocuments.mockResolvedValue(12);

    const res = await POST_DB_ACTION(
      new NextRequest('http://localhost/api/ai-paths/db-action', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'mongodb',
          collection: 'products',
          action: 'find',
          filter: { status: 'active' },
          limit: 2,
        }),
      })
    );

    const payload = await res.json();
    expect(res.status).toBe(200);
    expect(payload).toMatchObject({
      items: [{ sku: 'A' }, { sku: 'B' }],
      count: 12,
      requestedProvider: 'mongodb',
      resolvedProvider: 'mongodb',
    });
    expect(countDocuments).toHaveBeenCalledWith({ status: 'active' });
  });

  it('returns Prisma single result with resolved provider metadata', async () => {
    hoistedPrisma.findFirst.mockResolvedValue({
      id: 'p-1',
      sku: 'SKU-P-1',
      name: 'Product Prisma',
    });

    const res = await POST_DB_ACTION(
      new NextRequest('http://localhost/api/ai-paths/db-action', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'prisma',
          collection: 'products',
          action: 'findOne',
          filter: { id: 'p-1' },
        }),
      })
    );

    const payload = await res.json();
    expect(res.status).toBe(200);
    expect(payload).toMatchObject({
      item: {
        id: 'p-1',
        sku: 'SKU-P-1',
      },
      count: 1,
      requestedProvider: 'prisma',
      resolvedProvider: 'prisma',
    });
    expect(Object.prototype.hasOwnProperty.call(payload, 'provider')).toBe(false);
    expect(hoistedPrisma.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p-1' },
      })
    );
  });

  it('retries with alternate provider for safe auto query when primary provider fails', async () => {
    vi.mocked(resolveCollectionProviderForRequest).mockResolvedValue('prisma');
    const originalDatabaseUrl = process.env['DATABASE_URL'];
    delete process.env['DATABASE_URL'];
    toArray.mockResolvedValue([{ id: 'mongo-1', sku: 'SKU-MONGO' }]);
    countDocuments.mockResolvedValue(1);

    const res = await POST_DB_ACTION(
      new NextRequest('http://localhost/api/ai-paths/db-action', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'auto',
          collection: 'products',
          action: 'find',
          filter: { id: 'mongo-1' },
          limit: 5,
        }),
      })
    );

    if (originalDatabaseUrl === undefined) {
      delete process.env['DATABASE_URL'];
    } else {
      process.env['DATABASE_URL'] = originalDatabaseUrl;
    }

    const payload = await res.json();
    expect(res.status).toBe(200);
    expect(payload).toMatchObject({
      items: [{ id: 'mongo-1', sku: 'SKU-MONGO' }],
      count: 1,
      requestedProvider: 'auto',
      resolvedProvider: 'mongodb',
      fallback: expect.objectContaining({
        used: true,
        requestedProvider: 'auto',
        attemptedProvider: 'prisma',
        resolvedProvider: 'mongodb',
      }),
    });
    expect(Object.prototype.hasOwnProperty.call(payload, 'provider')).toBe(false);
    expect(find).toHaveBeenCalled();
  });
});
