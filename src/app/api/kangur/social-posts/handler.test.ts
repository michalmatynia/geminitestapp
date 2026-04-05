import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const mocks = vi.hoisted(() => ({
  resolveKangurActorMock: vi.fn(),
  listKangurSocialPostsMock: vi.fn(),
  listPublishedKangurSocialPostsMock: vi.fn(),
  logKangurServerEventMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-actor', () => ({
  resolveKangurActor: (...args: unknown[]) => mocks.resolveKangurActorMock(...args),
}));

vi.mock('@/features/kangur/observability/server', () => ({
  logKangurServerEvent: (...args: unknown[]) => mocks.logKangurServerEventMock(...args),
}));

vi.mock('@/features/kangur/social/server/social-posts-repository', () => ({
  deleteKangurSocialPost: vi.fn(),
  getKangurSocialPostById: vi.fn(),
  listKangurSocialPosts: (...args: unknown[]) => mocks.listKangurSocialPostsMock(...args),
  listPublishedKangurSocialPosts: (...args: unknown[]) =>
    mocks.listPublishedKangurSocialPostsMock(...args),
  upsertKangurSocialPost: vi.fn(),
}));

import { getKangurSocialPostsHandler } from './handler';

const createRequestContext = (query: Record<string, unknown>): ApiHandlerContext =>
  ({
    requestId: 'request-social-posts-1',
    traceId: 'trace-social-posts-1',
    correlationId: 'corr-social-posts-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    query,
  }) as ApiHandlerContext;

describe('getKangurSocialPostsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveKangurActorMock.mockResolvedValue({ role: 'admin' });
  });

  it('returns public posts from the published list even when a stored post drifted back to draft locally', async () => {
    mocks.listPublishedKangurSocialPostsMock.mockResolvedValue([
      {
        id: 'drifted-draft',
        status: 'draft',
        publishedAt: null,
        linkedinPostId: 'urn:li:share:drifted',
        linkedinUrl: 'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3Adrifted',
      },
    ]);

    const response = await getKangurSocialPostsHandler(
      new NextRequest('http://localhost/api/kangur/social-posts'),
      createRequestContext({})
    );

    expect(mocks.listPublishedKangurSocialPostsMock).toHaveBeenCalledWith(8);
    expect(mocks.resolveKangurActorMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({
        id: 'drifted-draft',
        status: 'draft',
        linkedinPostId: 'urn:li:share:drifted',
      }),
    ]);
  });
});
