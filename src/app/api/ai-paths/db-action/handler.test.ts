import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { aiPathsDbActionRequestSchema } from '@/shared/contracts/ai-paths';

const {
  requireAiPathsAccessOrInternalMock,
  enforceAiPathsActionRateLimitMock,
  isCollectionAllowedMock,
  parseJsonBodyMock,
  getMongoDbMock,
} = vi.hoisted(() => ({
  requireAiPathsAccessOrInternalMock: vi.fn(),
  enforceAiPathsActionRateLimitMock: vi.fn(),
  isCollectionAllowedMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccessOrInternal: requireAiPathsAccessOrInternalMock,
  enforceAiPathsActionRateLimit: enforceAiPathsActionRateLimitMock,
  isCollectionAllowed: isCollectionAllowedMock,
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseJsonBody: parseJsonBodyMock,
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

import { postHandler } from './handler';

describe('ai-paths db-action handler', () => {
  beforeEach(() => {
    requireAiPathsAccessOrInternalMock.mockReset().mockResolvedValue({
      access: { userId: 'user-1', isElevated: false },
      isInternal: false,
    });
    enforceAiPathsActionRateLimitMock.mockReset().mockResolvedValue(undefined);
    isCollectionAllowedMock.mockReset().mockReturnValue(true);
    parseJsonBodyMock.mockReset().mockResolvedValue({
      ok: true,
      data: {
        collection: 'products',
        action: 'find',
        filter: { status: 'active' },
        limit: 5,
      },
    });

    const toArrayMock = vi.fn().mockResolvedValue([{ _id: '1', name: 'Sample' }]);
    const limitMock = vi.fn().mockReturnValue({ toArray: toArrayMock });
    const findMock = vi.fn().mockReturnValue({ limit: limitMock });
    const countDocumentsMock = vi.fn().mockResolvedValue(1);

    getMongoDbMock.mockReset().mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        find: findMock,
        countDocuments: countDocumentsMock,
      }),
    });

    process.env['MONGODB_URI'] = 'mongodb://example.test/app';
  });

  it('parses the shared db-action DTO and executes a find action', async () => {
    const response = await postHandler(
      new NextRequest('http://localhost/api/ai-paths/db-action', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          collection: 'products',
          action: 'find',
          filter: { status: 'active' },
          limit: 5,
        }),
      }),
      {} as Parameters<typeof postHandler>[1]
    );

    expect(response.status).toBe(200);
    expect(parseJsonBodyMock).toHaveBeenCalledWith(
      expect.any(NextRequest),
      aiPathsDbActionRequestSchema,
      expect.objectContaining({ logPrefix: 'ai-paths.db-action' })
    );
    expect(enforceAiPathsActionRateLimitMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
      'db-action'
    );
    await expect(response.json()).resolves.toEqual({
      items: [{ _id: '1', name: 'Sample' }],
      count: 1,
      requestedProvider: 'auto',
      resolvedProvider: 'mongodb',
      collection: 'products',
      requestedCollection: 'products',
    });
  });
});
