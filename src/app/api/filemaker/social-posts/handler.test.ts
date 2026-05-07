import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const mocks = vi.hoisted(() => ({
  resolveSocialPublishingActorMock: vi.fn(),
  listSocialPublishingPostsMock: vi.fn(),
  listPublishedSocialPublishingPostsMock: vi.fn(),
  logSocialPublishingServerEventMock: vi.fn(),
}));

vi.mock('@/features/filemaker/social/server/social-publishing-actor', () => ({
  resolveSocialPublishingActor: (...args: unknown[]) => mocks.resolveSocialPublishingActorMock(...args),
}));

vi.mock('@/features/filemaker/social/server/social-publishing-observability', () => ({
  logSocialPublishingServerEvent: (...args: unknown[]) => mocks.logSocialPublishingServerEventMock(...args),
}));

vi.mock('@/features/filemaker/social/server/social-posts-repository', () => ({
  deleteSocialPublishingPost: vi.fn(),
  getSocialPublishingPostById: vi.fn(),
  listSocialPublishingPosts: (...args: unknown[]) => mocks.listSocialPublishingPostsMock(...args),
  listPublishedSocialPublishingPosts: (...args: unknown[]) =>
    mocks.listPublishedSocialPublishingPostsMock(...args),
  upsertSocialPublishingPost: vi.fn(),
}));

import { getSocialPublishingPostsHandler } from './handler';

const createRequestContext = (query: Record<string, unknown>): ApiHandlerContext =>
  ({
    requestId: 'request-social-posts-1',
    traceId: 'trace-social-posts-1',
    correlationId: 'corr-social-posts-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    query,
  }) as ApiHandlerContext;

describe('getSocialPublishingPostsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveSocialPublishingActorMock.mockResolvedValue({ role: 'admin' });
  });

  it('returns public posts from the published list even when a stored post drifted back to draft locally', async () => {
    mocks.listPublishedSocialPublishingPostsMock.mockResolvedValue([
      {
        id: 'drifted-draft',
        status: 'draft',
        publishedAt: null,
        publishedPostId: 'urn:li:share:drifted',
        publishedUrl: 'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3Adrifted',
      },
    ]);

    const response = await getSocialPublishingPostsHandler(
      new NextRequest('http://localhost/api/filemaker/social-posts'),
      createRequestContext({})
    );

    expect(mocks.listPublishedSocialPublishingPostsMock).toHaveBeenCalledWith(8);
    expect(mocks.resolveSocialPublishingActorMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({
        id: 'drifted-draft',
        status: 'draft',
        publishedPostId: 'urn:li:share:drifted',
      }),
    ]);
  });
});
