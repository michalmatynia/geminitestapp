import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  resolveSocialPublishingActorMock: vi.fn(),
  getSocialPublishingPostByIdMock: vi.fn(),
  unpublishSocialPublishingPostMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/features/filemaker/social/server/social-publishing-actor', () => ({
  resolveSocialPublishingActor: (...args: unknown[]) => mocks.resolveSocialPublishingActorMock(...args),
}));

vi.mock('@/features/filemaker/social/server/social-posts-repository', () => ({
  getSocialPublishingPostById: (...args: unknown[]) => mocks.getSocialPublishingPostByIdMock(...args),
}));

vi.mock('@/features/filemaker/social/server/social-posts-publish', () => ({
  unpublishSocialPublishingPost: (...args: unknown[]) => mocks.unpublishSocialPublishingPostMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => mocks.captureExceptionMock(...args),
  },
}));

import { postSocialPublishingPostUnpublishHandler } from './handler';

const basePost = {
  id: 'post-1',
  status: 'draft',
  publishedAt: '2026-03-21T10:30:00.000Z',
  publishedPostId: 'urn:li:share:1',
  publishedUrl: 'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3A1',
};

describe('postSocialPublishingPostUnpublishHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveSocialPublishingActorMock.mockResolvedValue({ role: 'admin' });
    mocks.getSocialPublishingPostByIdMock.mockResolvedValue(basePost);
    mocks.unpublishSocialPublishingPostMock.mockResolvedValue({
      ...basePost,
      publishedPostId: null,
      publishedUrl: null,
      publishedAt: null,
    });
  });

  it('returns the kept-local draft when a Publication exists even if the local status is draft', async () => {
    const request = new NextRequest('http://localhost/api/filemaker/social-posts/post-1/unpublish', {
      method: 'POST',
    });

    const response = await postSocialPublishingPostUnpublishHandler(request, {
      params: { id: 'post-1' },
      body: { keepLocal: true },
    } as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 'post-1',
      status: 'draft',
      publishedPostId: null,
      publishedAt: null,
    });
    expect(mocks.unpublishSocialPublishingPostMock).toHaveBeenCalledWith(basePost, {
      keepLocal: true,
    });
  });

  it('accepts URL-only Publication metadata at the API boundary', async () => {
    const urlOnlyPost = {
      ...basePost,
      publishedPostId: null,
      publishedUrl: 'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3Aurl-only',
    };
    mocks.getSocialPublishingPostByIdMock.mockResolvedValueOnce(urlOnlyPost);
    mocks.unpublishSocialPublishingPostMock.mockResolvedValueOnce({
      ...urlOnlyPost,
      publishedUrl: null,
      publishedAt: null,
    });

    const request = new NextRequest('http://localhost/api/filemaker/social-posts/post-1/unpublish', {
      method: 'POST',
    });

    const response = await postSocialPublishingPostUnpublishHandler(request, {
      params: { id: 'post-1' },
      body: { keepLocal: true },
    } as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 'post-1',
      status: 'draft',
      publishedUrl: null,
      publishedAt: null,
    });
    expect(mocks.unpublishSocialPublishingPostMock).toHaveBeenCalledWith(urlOnlyPost, {
      keepLocal: true,
    });
  });
});
