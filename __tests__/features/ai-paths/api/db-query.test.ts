/**
 * @vitest-environment node
 */

import { ObjectId } from 'mongodb';
import { NextRequest } from 'next/server';
import { Mock, vi } from 'vitest';

import { POST as POST_DB_QUERY } from '@/app/api/ai-paths/db-query/route';
import { isCollectionAllowed, requireAiPathsAccessOrInternal } from '@/features/ai/ai-paths/server';
import { parseJsonBody } from '@/features/products/server';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn(),
}));

vi.mock('@/shared/lib/db/app-db-provider', () => ({
  getAppDbProvider: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccessOrInternal: vi.fn(),
  enforceAiPathsActionRateLimit: vi.fn(),
  isCollectionAllowed: vi.fn(),
}));

vi.mock('@/features/products/server', () => ({
  parseJsonBody: vi.fn(),
}));

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {},
}));

describe('AI Paths db-query API', () => {
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
    vi.mocked(getAppDbProvider).mockResolvedValue('mongodb');
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
  });

  afterAll(() => {
    delete process.env['MONGODB_URI'];
  });

  it('returns single Mongo document in "item" shape and retries _id as ObjectId when needed', async () => {
    findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: new ObjectId('507f1f77bcf86cd799439011'), sku: 'SKU-1' });

    const res = await POST_DB_QUERY(
      new NextRequest('http://localhost/api/ai-paths/db-query', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'mongodb',
          collection: 'products',
          query: { _id: '507f1f77bcf86cd799439011' },
          single: true,
          idType: 'string',
        }),
      }),
    );

    const payload = await res.json();
    expect(res.status).toBe(200);
    expect(payload).toMatchObject({
      item: { sku: 'SKU-1' },
      count: 1,
    });
    expect(findOne).toHaveBeenCalledTimes(2);
    const firstFilter = (findOne).mock.calls[0]?.[0] as Record<string, unknown>;
    const secondFilter = (findOne).mock.calls[1]?.[0] as Record<string, unknown>;
    expect(firstFilter['_id']).toBe('507f1f77bcf86cd799439011');
    expect(secondFilter['_id']).toBeInstanceOf(ObjectId);
  });

  it('returns Mongo list count from countDocuments (not limited item length)', async () => {
    toArray.mockResolvedValue([{ sku: 'A' }, { sku: 'B' }]);
    countDocuments.mockResolvedValue(12);

    const res = await POST_DB_QUERY(
      new NextRequest('http://localhost/api/ai-paths/db-query', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'mongodb',
          collection: 'products',
          query: { status: 'active' },
          limit: 2,
          single: false,
        }),
      }),
    );

    const payload = await res.json();
    expect(res.status).toBe(200);
    expect(payload).toMatchObject({
      items: [{ sku: 'A' }, { sku: 'B' }],
      count: 12,
    });
    expect(countDocuments).toHaveBeenCalledWith({ status: 'active' });
  });
});
