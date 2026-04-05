import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  requireAiPathsAccessOrInternalMock,
  enforceAiPathsActionRateLimitMock,
  isCollectionAllowedMock,
  getMongoDbMock,
} = vi.hoisted(() => ({
  requireAiPathsAccessOrInternalMock: vi.fn() as Mock,
  enforceAiPathsActionRateLimitMock: vi.fn() as Mock,
  isCollectionAllowedMock: vi.fn() as Mock,
  getMongoDbMock: vi.fn() as Mock,
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccessOrInternal: requireAiPathsAccessOrInternalMock,
  enforceAiPathsActionRateLimit: enforceAiPathsActionRateLimitMock,
  isCollectionAllowed: isCollectionAllowedMock,
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
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

describe('AI Paths DB action handler', () => {
  const originalMongoUrl = process.env['MONGODB_URI'];

  beforeEach(() => {
    requireAiPathsAccessOrInternalMock.mockReset();
    enforceAiPathsActionRateLimitMock.mockReset();
    isCollectionAllowedMock.mockReset();
    getMongoDbMock.mockReset();

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
    process.env['MONGODB_URI'] = originalMongoUrl;
  });

  it('fails when mongodb is not configured', async () => {
    delete process.env['MONGODB_URI'];

    await expect(
      invokeDbActionHandler({
        provider: 'auto',
        collection: 'products',
        action: 'find',
      })
    ).rejects.toThrow('MongoDB is not configured');

    expect(getMongoDbMock).not.toHaveBeenCalled();
  });

  it('rejects unmapped collection names that are not allowlisted', async () => {
    isCollectionAllowedMock.mockImplementation((value: string) => value === 'products');

    await expect(
      invokeDbActionHandler({
        provider: 'auto',
        collection: 'Product',
        action: 'updateOne',
        filter: { id: 'product-1' },
        update: { name_en: 'Updated name' },
        idType: 'string',
      })
    ).rejects.toThrow('Collection not allowlisted');

    expect(isCollectionAllowedMock).toHaveBeenCalledWith('Product');
    expect(getMongoDbMock).not.toHaveBeenCalled();
  });

  it('maps collection name only when explicit collectionMap is provided', async () => {
    const updateOneMock = vi.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    const mongoCollectionMock = vi.fn().mockReturnValue({
      updateOne: updateOneMock,
      updateMany: vi.fn(),
    });
    getMongoDbMock.mockResolvedValue({
      collection: mongoCollectionMock,
    });
    isCollectionAllowedMock.mockImplementation((value: string) => value === 'products');
    process.env['MONGODB_URI'] = 'mongodb://localhost/test';

    const response = await invokeDbActionHandler({
      provider: 'auto',
      collection: 'Product',
      collectionMap: {
        Product: 'products',
      },
      action: 'updateOne',
      filter: { id: 'product-1' },
      update: { name_en: 'Updated name' },
      idType: 'string',
    });
    const body = await parseResponseBody(response);

    expect(isCollectionAllowedMock).toHaveBeenCalledWith('products');
    expect(mongoCollectionMock).toHaveBeenCalledWith('products');
    expect(body['collection']).toBe('products');
    expect(body['requestedCollection']).toBe('Product');
    expect(body['collectionMappedFrom']).toBe('Product');
    expect(body['resolvedProvider']).toBe('mongodb');
    expect(body['requestedProvider']).toBe('auto');
  });

  it('runs aggregate actions against mongodb', async () => {
    const aggregateToArrayMock = vi.fn().mockResolvedValue([{ id: 'product-1' }]);
    const aggregateMock = vi.fn().mockReturnValue({ toArray: aggregateToArrayMock });
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        aggregate: aggregateMock,
      }),
    });
    process.env['MONGODB_URI'] = 'mongodb://localhost/test';

    const response = await invokeDbActionHandler({
      provider: 'auto',
      collection: 'products',
      action: 'aggregate',
      pipeline: [{ $match: { id: 'product-1' } }],
    });
    const body = await parseResponseBody(response);

    expect(aggregateMock).toHaveBeenCalledWith([{ $match: { id: 'product-1' } }]);
    expect(aggregateToArrayMock).toHaveBeenCalledTimes(1);
    expect(body['resolvedProvider']).toBe('mongodb');
    expect(body['requestedProvider']).toBe('auto');
    expect(body['count']).toBe(1);
    expect(body['items']).toEqual([{ id: 'product-1' }]);
  });

  it('stamps updatedAt on mongodb findOneAndUpdate for products', async () => {
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

    const response = await invokeDbActionHandler({
      provider: 'mongodb',
      collection: 'products',
      action: 'findOneAndUpdate',
      filter: { id: 'product-1' },
      update: { $set: { name_en: 'Updated name' } },
      returnDocument: 'after',
    });
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
    expect(body['requestedProvider']).toBe('mongodb');
    expect(body['value']).toEqual({ id: 'product-1', name_en: 'Updated name' });
  });
});
