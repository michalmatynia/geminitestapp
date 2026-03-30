import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isAppError } from '@/shared/errors/app-error';

const mocks = vi.hoisted(() => ({
  resolveKangurActorMock: vi.fn(),
  getKangurSocialPostByIdMock: vi.fn(),
  publishKangurSocialPostMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-actor', () => ({
  resolveKangurActor: (...args: unknown[]) => mocks.resolveKangurActorMock(...args),
}));

vi.mock('@/features/kangur/social/server/social-posts-repository', () => ({
  getKangurSocialPostById: (...args: unknown[]) => mocks.getKangurSocialPostByIdMock(...args),
}));

vi.mock('@/features/kangur/social/server/social-posts-publish', () => ({
  publishKangurSocialPost: (...args: unknown[]) => mocks.publishKangurSocialPostMock(...args),
}));

vi.mock('@/features/kangur/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => mocks.captureExceptionMock(...args),
  },
}));

import { postKangurSocialPostPublishHandler } from './handler';

const basePost = {
  id: 'post-1',
  status: 'draft',
  publishError: null,
};

describe('postKangurSocialPostPublishHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveKangurActorMock.mockResolvedValue({ role: 'admin' });
    mocks.getKangurSocialPostByIdMock.mockResolvedValue(basePost);
    mocks.publishKangurSocialPostMock.mockResolvedValue({
      ...basePost,
      status: 'published',
      linkedinPostId: 'urn:li:share:1',
    });
  });

  it('returns the published post on success', async () => {
    const request = new NextRequest('http://localhost/api/kangur/social-posts/post-1/publish', {
      method: 'POST',
    });

    const response = await postKangurSocialPostPublishHandler(request, {
      params: { id: 'post-1' },
      body: {},
    } as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 'post-1',
      status: 'published',
    });
  });

  it('rethrows the saved publishError as a user-facing app error after LinkedIn publish failure', async () => {
    mocks.publishKangurSocialPostMock.mockRejectedValueOnce(
      new Error('The operation failed. Please try again.')
    );
    mocks.getKangurSocialPostByIdMock
      .mockResolvedValueOnce(basePost)
      .mockResolvedValueOnce({
        ...basePost,
        status: 'failed',
        publishError: 'LinkedIn post failed: selected connection is missing publish permissions.',
      });

    const request = new NextRequest('http://localhost/api/kangur/social-posts/post-1/publish', {
      method: 'POST',
    });

    let thrown: unknown;
    try {
      await postKangurSocialPostPublishHandler(request, {
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
