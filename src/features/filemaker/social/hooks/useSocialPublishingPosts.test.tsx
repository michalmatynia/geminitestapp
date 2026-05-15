/**
 * @vitest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useListQueryV2Mock = vi.hoisted(() => vi.fn());
const useUpdateMutationV2Mock = vi.hoisted(() => vi.fn());
const apiPostMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/query-factories-v2', () => ({
  useListQueryV2: useListQueryV2Mock,
  useUpdateMutationV2: useUpdateMutationV2Mock,
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: apiPostMock,
  },
}));

import {
  usePublishSocialPublishingPost,
  useUnpublishSocialPublishingPost,
} from './useSocialPublishingPosts';

describe('useSocialPublishingPosts mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useListQueryV2Mock.mockReturnValue({ kind: 'list-query' });
    useUpdateMutationV2Mock.mockReturnValue({ kind: 'mutation' });
    apiPostMock.mockResolvedValue({ id: 'post-1', status: 'published' });
  });

  it('uses an extended timeout for publish requests', async () => {
    const { result } = renderHook(() => usePublishSocialPublishingPost());
    const config = useUpdateMutationV2Mock.mock.calls[0]?.[0];

    expect(result.current).toEqual({ kind: 'mutation' });

    await config.mutationFn({
      id: 'post-1',
      mode: 'published',
      skipImages: true,
    });

    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/filemaker/social-posts/post-1/publish',
      { mode: 'published', skipImages: true },
      { timeout: 180_000 }
    );
  });

  it('uses a longer timeout for unpublish requests', async () => {
    renderHook(() => useUnpublishSocialPublishingPost());
    const config = useUpdateMutationV2Mock.mock.calls[0]?.[0];

    await config.mutationFn({
      id: 'post-1',
      keepLocal: true,
    });

    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/filemaker/social-posts/post-1/unpublish',
      { keepLocal: true },
      { timeout: 60_000 }
    );
  });
});
