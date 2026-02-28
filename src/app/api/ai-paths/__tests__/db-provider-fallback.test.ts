import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireAiPathsAccessOrInternalMock,
  enforceAiPathsActionRateLimitMock,
  isCollectionAllowedMock,
  parseJsonBodyMock,
  resolveCollectionProviderForRequestMock,
  getMongoDbMock,
  prismaMock,
} = vi.hoisted(() => ({
  requireAiPathsAccessOrInternalMock: vi.fn(),
  enforceAiPathsActionRateLimitMock: vi.fn(),
  isCollectionAllowedMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
  resolveCollectionProviderForRequestMock: vi.fn(),
  getMongoDbMock: vi.fn(),
  prismaMock: {} as Record<string, unknown>,
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccessOrInternal: requireAiPathsAccessOrInternalMock,
  enforceAiPathsActionRateLimit: enforceAiPathsActionRateLimitMock,
  isCollectionAllowed: isCollectionAllowedMock,
}));

vi.mock('@/features/products/server', () => ({
  parseJsonBody: parseJsonBodyMock,
}));

vi.mock('@/shared/lib/db/collection-provider-map', () => ({
  resolveCollectionProviderForRequest: resolveCollectionProviderForRequestMock,
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/shared/lib/db/prisma', () => ({
  default: prismaMock,
}));

import { postAiPathsDbActionHandler } from '@/app/api/ai-paths/db-action/handler';
import { POST_handler as postAiPathsDbUpdateHandler } from '@/app/api/ai-paths/db-update/handler';

const createRequest = (path: string): Request =>
  new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
  });

describe('AI Paths DB provider fallback', () => {
  const originalDatabaseUrl = process.env['DATABASE_URL'];
  const originalMongoUrl = process.env['MONGODB_URI'];

  beforeEach(() => {
    requireAiPathsAccessOrInternalMock.mockReset();
    enforceAiPathsActionRateLimitMock.mockReset();
    isCollectionAllowedMock.mockReset();
    parseJsonBodyMock.mockReset();
    resolveCollectionProviderForRequestMock.mockReset();
    getMongoDbMock.mockReset();
    Object.keys(prismaMock).forEach((key) => {
      delete prismaMock[key];
    });

    requireAiPathsAccessOrInternalMock.mockResolvedValue({
      access: {
        userId: 'system',
        permissions: ['ai_paths.manage'],
        isElevated: true,
      },
      isInternal: true,
    });
    isCollectionAllowedMock.mockReturnValue(true);
  });

  afterEach(() => {
    process.env['DATABASE_URL'] = originalDatabaseUrl;
    process.env['MONGODB_URI'] = originalMongoUrl;
  });

  it('falls back to mongodb in db-update when primary provider is not configured', async () => {
    parseJsonBodyMock.mockResolvedValueOnce({
      ok: true,
      data: {
        provider: 'auto',
        collection: 'products',
        query: { id: 'product-1' },
        updates: { name_en: 'Updated name' },
        single: true,
        idType: 'string',
      },
    });
    resolveCollectionProviderForRequestMock.mockResolvedValueOnce('prisma');

    const updateOneMock = vi.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        updateOne: updateOneMock,
        updateMany: vi.fn(),
      }),
    });

    delete process.env['DATABASE_URL'];
    process.env['MONGODB_URI'] = 'mongodb://localhost/test';

    const response = await postAiPathsDbUpdateHandler(
      createRequest('/api/ai-paths/db-update') as Parameters<typeof postAiPathsDbUpdateHandler>[0],
      {} as Parameters<typeof postAiPathsDbUpdateHandler>[1]
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(body['provider']).toBe('mongodb');
    expect(body['resolvedProvider']).toBe('mongodb');
    expect(body['matchedCount']).toBe(1);
    expect(body['modifiedCount']).toBe(1);
    expect(body['fallback']).toEqual(
      expect.objectContaining({
        used: true,
        attemptedProvider: 'prisma',
        resolvedProvider: 'mongodb',
      })
    );
    expect(updateOneMock).toHaveBeenCalledWith(
      { id: 'product-1' },
      { $set: { name_en: 'Updated name' } }
    );
  });

  it('rejects unmapped collection names that are not allowlisted', async () => {
    parseJsonBodyMock.mockResolvedValueOnce({
      ok: true,
      data: {
        provider: 'auto',
        collection: 'Product',
        query: { id: 'product-1' },
        updates: { name_en: 'Updated name' },
        single: true,
        idType: 'string',
      },
    });
    isCollectionAllowedMock.mockImplementation((value: string) => value === 'products');

    await expect(
      postAiPathsDbUpdateHandler(
        createRequest('/api/ai-paths/db-update') as Parameters<
          typeof postAiPathsDbUpdateHandler
        >[0],
        {} as Parameters<typeof postAiPathsDbUpdateHandler>[1]
      )
    ).rejects.toThrow('Collection not allowlisted');

    expect(isCollectionAllowedMock).toHaveBeenCalledWith('Product');
    expect(resolveCollectionProviderForRequestMock).not.toHaveBeenCalled();
  });

  it('maps collection name only when explicit collectionMap is provided', async () => {
    parseJsonBodyMock.mockResolvedValueOnce({
      ok: true,
      data: {
        provider: 'auto',
        collection: 'Product',
        collectionMap: {
          Product: 'products',
        },
        query: { id: 'product-1' },
        updates: { name_en: 'Updated name' },
        single: true,
        idType: 'string',
      },
    });
    isCollectionAllowedMock.mockImplementation((value: string) => value === 'products');
    resolveCollectionProviderForRequestMock.mockResolvedValueOnce('mongodb');

    const updateOneMock = vi.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    const mongoCollectionMock = vi.fn().mockReturnValue({
      updateOne: updateOneMock,
      updateMany: vi.fn(),
    });
    getMongoDbMock.mockResolvedValue({
      collection: mongoCollectionMock,
    });

    process.env['MONGODB_URI'] = 'mongodb://localhost/test';

    const response = await postAiPathsDbUpdateHandler(
      createRequest('/api/ai-paths/db-update') as Parameters<typeof postAiPathsDbUpdateHandler>[0],
      {} as Parameters<typeof postAiPathsDbUpdateHandler>[1]
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(isCollectionAllowedMock).toHaveBeenCalledWith('products');
    expect(resolveCollectionProviderForRequestMock).toHaveBeenCalledWith('products', 'auto');
    expect(mongoCollectionMock).toHaveBeenCalledWith('products');
    expect(body['collection']).toBe('products');
    expect(body['requestedCollection']).toBe('Product');
    expect(body['collectionMappedFrom']).toBe('Product');
  });

  it('falls back to mongodb in db-action when primary provider does not support action', async () => {
    parseJsonBodyMock.mockResolvedValueOnce({
      ok: true,
      data: {
        provider: 'auto',
        collection: 'products',
        action: 'aggregate',
        pipeline: [{ $match: { id: 'product-1' } }],
      },
    });
    resolveCollectionProviderForRequestMock.mockResolvedValueOnce('prisma');

    const aggregateToArrayMock = vi.fn().mockResolvedValue([{ id: 'product-1' }]);
    const aggregateMock = vi.fn().mockReturnValue({ toArray: aggregateToArrayMock });
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        aggregate: aggregateMock,
      }),
    });

    delete process.env['DATABASE_URL'];
    process.env['MONGODB_URI'] = 'mongodb://localhost/test';

    const response = await postAiPathsDbActionHandler(
      createRequest('/api/ai-paths/db-action') as Parameters<typeof postAiPathsDbActionHandler>[0],
      {} as Parameters<typeof postAiPathsDbActionHandler>[1]
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(body['provider']).toBe('mongodb');
    expect(body['resolvedProvider']).toBe('mongodb');
    expect(body['count']).toBe(1);
    expect(body['items']).toEqual([{ id: 'product-1' }]);
    expect(body['fallback']).toEqual(
      expect.objectContaining({
        used: true,
        attemptedProvider: 'prisma',
        resolvedProvider: 'mongodb',
        code: 'action_not_supported',
      })
    );
    expect(aggregateMock).toHaveBeenCalledWith([{ $match: { id: 'product-1' } }]);
    expect(aggregateToArrayMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to mongodb in db-action when prisma returns record-not-found on updateOne', async () => {
    parseJsonBodyMock.mockResolvedValueOnce({
      ok: true,
      data: {
        provider: 'auto',
        collection: 'products',
        action: 'updateOne',
        filter: { id: 'product-1' },
        update: { name_en: 'Updated name' },
      },
    });
    resolveCollectionProviderForRequestMock.mockResolvedValueOnce('prisma');

    const prismaUpdateMock = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('Record not found'), { code: 'P2025' }));
    prismaMock['product'] = {
      update: prismaUpdateMock,
    };

    const updateOneMock = vi.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        updateOne: updateOneMock,
      }),
    });

    process.env['DATABASE_URL'] = 'postgresql://localhost/test';
    process.env['MONGODB_URI'] = 'mongodb://localhost/test';

    const response = await postAiPathsDbActionHandler(
      createRequest('/api/ai-paths/db-action') as Parameters<typeof postAiPathsDbActionHandler>[0],
      {} as Parameters<typeof postAiPathsDbActionHandler>[1]
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(prismaUpdateMock).toHaveBeenCalledWith({
      where: { id: 'product-1' },
      data: { name_en: 'Updated name' },
    });
    expect(updateOneMock).toHaveBeenCalledWith(
      { id: 'product-1' },
      { $set: { name_en: 'Updated name' } },
      { upsert: false }
    );
    expect(body['provider']).toBe('mongodb');
    expect(body['resolvedProvider']).toBe('mongodb');
    expect(body['fallback']).toEqual(
      expect.objectContaining({
        used: true,
        attemptedProvider: 'prisma',
        resolvedProvider: 'mongodb',
        code: 'record_not_found',
      })
    );
  });
});
