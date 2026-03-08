import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  requireAiPathsAccessOrInternalMock,
  enforceAiPathsActionRateLimitMock,
  isCollectionAllowedMock,
  parseJsonBodyMock,
  resolveCollectionProviderForRequestMock,
  getMongoDbMock,
  prismaMock,
} = vi.hoisted(() => ({
  requireAiPathsAccessOrInternalMock: vi.fn() as Mock,
  enforceAiPathsActionRateLimitMock: vi.fn() as Mock,
  isCollectionAllowedMock: vi.fn() as Mock,
  parseJsonBodyMock: vi.fn() as Mock,
  resolveCollectionProviderForRequestMock: vi.fn() as Mock,
  getMongoDbMock: vi.fn() as Mock,
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

const createRequestContext = (): ApiHandlerContext => ({
  requestId: 'request-1',
  traceId: 'trace-request-1',
  correlationId: 'corr-request-1',
  startTime: Date.now(),
  getElapsedMs: () => 1,
});

const createDbActionRequest = (payload: unknown): NextRequest =>
  new NextRequest('http://localhost/api/ai-paths/db-action', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

const invokeDbActionHandler = async (
  payload: unknown,
  context: ApiHandlerContext = createRequestContext()
): Promise<Response> => postAiPathsDbActionHandler(createDbActionRequest(payload), context);

const parseResponseBody = async (response: Response): Promise<Record<string, unknown>> => {
  const bodyText = await response.text();
  const parsed: unknown = bodyText ? JSON.parse(bodyText) : {};
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Expected a JSON object response body.');
  }
  return parsed;
};

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

    parseJsonBodyMock.mockImplementation(async (req: Request) => {
      try {
        const text = await req.text();
        const data: unknown = text ? JSON.parse(text) : {};
        return { ok: true, data };
      } catch {
        return {
          ok: false,
          response: new Response(JSON.stringify({ error: 'Invalid JSON body.' }), { status: 400 }),
        };
      }
    });
  });

  afterEach(() => {
    process.env['DATABASE_URL'] = originalDatabaseUrl;
    process.env['MONGODB_URI'] = originalMongoUrl;
  });

  it('falls back to mongodb in db-action updateOne when primary provider is not configured', async () => {
    const payload = {
      provider: 'auto',
      collection: 'products',
      action: 'updateOne',
      filter: { id: 'product-1' },
      update: { name_en: 'Updated name' },
      idType: 'string',
    };
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

    const response = await invokeDbActionHandler(payload);
    const body = await parseResponseBody(response);

    expect(Object.prototype.hasOwnProperty.call(body, 'provider')).toBe(false);
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
    const updateInvocation = updateOneMock.mock.calls[0];
    expect(updateInvocation).toBeDefined();
    if (!updateInvocation) {
      throw new Error('Expected MongoDB updateOne to be called.');
    }
    expect(updateInvocation[0]).toEqual({ id: 'product-1' });
    expect(updateInvocation[1]).toMatchObject({
      $set: {
        name_en: 'Updated name',
      },
    });
    expect(
      (updateInvocation[1] as { $set?: { updatedAt?: unknown } }).$set?.updatedAt
    ).toBeInstanceOf(Date);
    expect(updateInvocation[2]).toEqual(expect.any(Object));
  });

  it('rejects unmapped collection names that are not allowlisted', async () => {
    const payload = {
      provider: 'auto',
      collection: 'Product',
      action: 'updateOne',
      filter: { id: 'product-1' },
      update: { name_en: 'Updated name' },
      idType: 'string',
    };
    isCollectionAllowedMock.mockImplementation((value: string) => value === 'products');

    await expect(
      invokeDbActionHandler(payload)
    ).rejects.toThrow('Collection not allowlisted');

    expect(isCollectionAllowedMock).toHaveBeenCalledWith('Product');
    expect(resolveCollectionProviderForRequestMock).not.toHaveBeenCalled();
  });

  it('maps collection name only when explicit collectionMap is provided', async () => {
    const payload = {
      provider: 'auto',
      collection: 'Product',
      collectionMap: {
        Product: 'products',
      },
      action: 'updateOne',
      filter: { id: 'product-1' },
      update: { name_en: 'Updated name' },
      idType: 'string',
    };
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

    const response = await invokeDbActionHandler(payload);
    const body = await parseResponseBody(response);

    expect(isCollectionAllowedMock).toHaveBeenCalledWith('products');
    expect(resolveCollectionProviderForRequestMock).toHaveBeenCalledWith('products', 'auto');
    expect(mongoCollectionMock).toHaveBeenCalledWith('products');
    expect(body['collection']).toBe('products');
    expect(body['requestedCollection']).toBe('Product');
    expect(body['collectionMappedFrom']).toBe('Product');
  });

  it('falls back to mongodb in db-action when primary provider does not support action', async () => {
    const payload = {
      provider: 'auto',
      collection: 'products',
      action: 'aggregate',
      pipeline: [{ $match: { id: 'product-1' } }],
    };
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

    const response = await invokeDbActionHandler(payload);
    const body = await parseResponseBody(response);

    expect(Object.prototype.hasOwnProperty.call(body, 'provider')).toBe(false);
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
    const payload = {
      provider: 'auto',
      collection: 'products',
      action: 'updateOne',
      filter: { id: 'product-1' },
      update: { name_en: 'Updated name' },
    };
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

    const response = await invokeDbActionHandler(payload);
    const body = await parseResponseBody(response);

    expect(prismaUpdateMock).toHaveBeenCalledWith({
      where: { id: 'product-1' },
      data: { name_en: 'Updated name' },
    });
    const updateInvocation = updateOneMock.mock.calls[0];
    expect(updateInvocation).toBeDefined();
    if (!updateInvocation) {
      throw new Error('Expected MongoDB updateOne to be called.');
    }
    expect(updateInvocation[0]).toEqual({ id: 'product-1' });
    expect(updateInvocation[1]).toMatchObject({
      $set: {
        name_en: 'Updated name',
      },
    });
    expect(
      (updateInvocation[1] as { $set?: { updatedAt?: unknown } }).$set?.updatedAt
    ).toBeInstanceOf(Date);
    expect(updateInvocation[2]).toEqual({ upsert: false });
    expect(Object.prototype.hasOwnProperty.call(body, 'provider')).toBe(false);
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

  it('stamps updatedAt on mongodb findOneAndUpdate for products', async () => {
    const payload = {
      provider: 'mongodb',
      collection: 'products',
      action: 'findOneAndUpdate',
      filter: { id: 'product-1' },
      update: { $set: { name_en: 'Updated name' } },
      returnDocument: 'after',
    };
    resolveCollectionProviderForRequestMock.mockResolvedValueOnce('mongodb');

    const findOneAndUpdateMock = vi.fn().mockResolvedValue({
      value: { id: 'product-1', name_en: 'Updated name' },
      ok: 1,
    });
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        findOneAndUpdate: findOneAndUpdateMock,
      }),
    });

    process.env['MONGODB_URI'] = 'mongodb://localhost/test';

    const response = await invokeDbActionHandler(payload);
    const body = await parseResponseBody(response);

    const findOneAndUpdateInvocation = findOneAndUpdateMock.mock.calls[0];
    expect(findOneAndUpdateInvocation).toBeDefined();
    if (!findOneAndUpdateInvocation) {
      throw new Error('Expected MongoDB findOneAndUpdate to be called.');
    }
    expect(findOneAndUpdateInvocation[0]).toEqual({ id: 'product-1' });
    expect(findOneAndUpdateInvocation[1]).toMatchObject({
      $set: {
        name_en: 'Updated name',
      },
    });
    expect(
      (findOneAndUpdateInvocation[1] as { $set?: { updatedAt?: unknown } }).$set?.updatedAt
    ).toBeInstanceOf(Date);
    expect(findOneAndUpdateInvocation[2]).toEqual(
      expect.objectContaining({
        returnDocument: 'after',
      })
    );
    expect(body['resolvedProvider']).toBe('mongodb');
    expect(body['value']).toEqual({ id: 'product-1', name_en: 'Updated name' });
  });
});
