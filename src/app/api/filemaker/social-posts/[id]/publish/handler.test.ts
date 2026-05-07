import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isAppError } from '@/shared/errors/app-error';

const mocks = vi.hoisted(() => ({
  resolveSocialPublishingActorMock: vi.fn(),
  getSocialPublishingPostByIdMock: vi.fn(),
  publishSocialPublishingPostMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/features/filemaker/social/server/social-publishing-actor', () => ({
  resolveSocialPublishingActor: (...args: unknown[]) => mocks.resolveSocialPublishingActorMock(...args),
}));

vi.mock('@/features/filemaker/social/server/social-posts-repository', () => ({
  getSocialPublishingPostById: (...args: unknown[]) => mocks.getSocialPublishingPostByIdMock(...args),
}));

vi.mock('@/features/filemaker/social/server/social-posts-publish', () => ({
  publishSocialPublishingPost: (...args: unknown[]) => mocks.publishSocialPublishingPostMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => mocks.captureExceptionMock(...args),
  },
}));

import { postSocialPublishingPostPublishHandler } from './handler';

const basePost = {
  id: 'post-1',
  status: 'draft',
  publishError: null,
};

describe('postSocialPublishingPostPublishHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveSocialPublishingActorMock.mockResolvedValue({ role: 'admin' });
    mocks.getSocialPublishingPostByIdMock.mockResolvedValue(basePost);
    mocks.publishSocialPublishingPostMock.mockResolvedValue({
      ...basePost,
      status: 'published',
      publishedPostId: 'urn:li:share:1',
    });
  });

  it('returns the published post on success', async () => {
    const request = new NextRequest('http://localhost/api/filemaker/social-posts/post-1/publish', {
      method: 'POST',
    });

    const response = await postSocialPublishingPostPublishHandler(request, {
      params: { id: 'post-1' },
      body: {},
    } as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 'post-1',
      status: 'published',
    });
  });

  it('rejects duplicate publish attempts before calling the publish service when the post is already published', async () => {
    mocks.getSocialPublishingPostByIdMock.mockResolvedValueOnce({
      ...basePost,
      status: 'draft',
      publishedAt: '2026-03-21T10:30:00.000Z',
      publishedPostId: 'urn:li:share:existing',
      publishedUrl: 'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3Aexisting',
    });

    const request = new NextRequest('http://localhost/api/filemaker/social-posts/post-1/publish', {
      method: 'POST',
    });

    let thrown: unknown;
    try {
      await postSocialPublishingPostPublishHandler(request, {
        params: { id: 'post-1' },
        body: {},
      } as never);
    } catch (error) {
      thrown = error;
    }

    expect(isAppError(thrown)).toBe(true);
    expect((thrown as Error).message).toBe('Social post is already published.');
    expect(mocks.publishSocialPublishingPostMock).not.toHaveBeenCalled();
  });

  it('rethrows the saved publishError as a user-facing app error after publish failure', async () => {
    mocks.publishSocialPublishingPostMock.mockRejectedValueOnce(
      new Error('The operation failed. Please try again.')
    );
    mocks.getSocialPublishingPostByIdMock
      .mockResolvedValueOnce(basePost)
      .mockResolvedValueOnce({
        ...basePost,
        status: 'failed',
        publishError: 'LinkedIn post failed: selected connection is missing publish permissions.',
      });

    const request = new NextRequest('http://localhost/api/filemaker/social-posts/post-1/publish', {
      method: 'POST',
    });

    let thrown: unknown;
    try {
      await postSocialPublishingPostPublishHandler(request, {
        params: { id: 'post-1' },
        body: {},
      } as never);
    } catch (error) {
      thrown = error;
    }

    expect(isAppError(thrown)).toBe(true);
    expect((thrown as Error).message).toBe(
      'LinkedIn post failed: selected connection is missing publish permissions.'
    );
    expect(mocks.captureExceptionMock).toHaveBeenCalledTimes(1);
  });
});
