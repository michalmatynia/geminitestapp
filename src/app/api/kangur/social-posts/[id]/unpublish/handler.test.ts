import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  resolveKangurActorMock: vi.fn(),
  getKangurSocialPostByIdMock: vi.fn(),
  unpublishKangurSocialPostMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-actor', () => ({
  resolveKangurActor: (...args: unknown[]) => mocks.resolveKangurActorMock(...args),
}));

vi.mock('@/features/kangur/social/server/social-posts-repository', () => ({
  getKangurSocialPostById: (...args: unknown[]) => mocks.getKangurSocialPostByIdMock(...args),
}));

vi.mock('@/features/kangur/social/server/social-posts-publish', () => ({
  unpublishKangurSocialPost: (...args: unknown[]) => mocks.unpublishKangurSocialPostMock(...args),
}));

vi.mock('@/features/kangur/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => mocks.captureExceptionMock(...args),
  },
}));

import { postKangurSocialPostUnpublishHandler } from './handler';

const basePost = {
  id: 'post-1',
  status: 'draft',
  publishedAt: '2026-03-21T10:30:00.000Z',
  linkedinPostId: 'urn:li:share:1',
  linkedinUrl: 'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3A1',
};

describe('postKangurSocialPostUnpublishHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveKangurActorMock.mockResolvedValue({ role: 'admin' });
    mocks.getKangurSocialPostByIdMock.mockResolvedValue(basePost);
    mocks.unpublishKangurSocialPostMock.mockResolvedValue({
      ...basePost,
      linkedinPostId: null,
      linkedinUrl: null,
      publishedAt: null,
    });
  });

  it('returns the kept-local draft when a LinkedIn publication exists even if the local status is draft', async () => {
    const request = new NextRequest('http://localhost/api/kangur/social-posts/post-1/unpublish', {
      method: 'POST',
    });

    const response = await postKangurSocialPostUnpublishHandler(request, {
      params: { id: 'post-1' },
      body: { keepLocal: true },
    } as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 'post-1',
      status: 'draft',
      linkedinPostId: null,
      publishedAt: null,
    });
    expect(mocks.unpublishKangurSocialPostMock).toHaveBeenCalledWith(basePost, {
      keepLocal: true,
    });
  });

  it('accepts URL-only LinkedIn publication metadata at the API boundary', async () => {
    const urlOnlyPost = {
      ...basePost,
      linkedinPostId: null,
      linkedinUrl: 'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3Aurl-only',
    };
    mocks.getKangurSocialPostByIdMock.mockResolvedValueOnce(urlOnlyPost);
    mocks.unpublishKangurSocialPostMock.mockResolvedValueOnce({
      ...urlOnlyPost,
      linkedinUrl: null,
      publishedAt: null,
    });

    const request = new NextRequest('http://localhost/api/kangur/social-posts/post-1/unpublish', {
      method: 'POST',
    });

    const response = await postKangurSocialPostUnpublishHandler(request, {
      params: { id: 'post-1' },
      body: { keepLocal: true },
    } as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 'post-1',
      status: 'draft',
      linkedinUrl: null,
      publishedAt: null,
    });
    expect(mocks.unpublishKangurSocialPostMock).toHaveBeenCalledWith(urlOnlyPost, {
      keepLocal: true,
    });
  });
});
