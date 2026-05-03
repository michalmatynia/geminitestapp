/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const {
  toastMock,
  saveMutateAsyncMock,
  patchMutateAsyncMock,
  deleteMutateAsyncMock,
  publishMutateAsyncMock,
  unpublishMutateAsyncMock,
  fetchKangurSocialPostsMock,
  logKangurClientErrorMock,
  trackKangurClientEventMock,
  captureExceptionMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  saveMutateAsyncMock: vi.fn(),
  patchMutateAsyncMock: vi.fn(),
  deleteMutateAsyncMock: vi.fn(),
  publishMutateAsyncMock: vi.fn(),
  unpublishMutateAsyncMock: vi.fn(),
  fetchKangurSocialPostsMock: vi.fn(),
  logKangurClientErrorMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/features/kangur/shared/ui', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/features/kangur/social/hooks/useKangurSocialPosts', () => ({
  fetchKangurSocialPosts: (...args: unknown[]) => fetchKangurSocialPostsMock(...args),
  useSaveKangurSocialPost: () => ({
    mutateAsync: saveMutateAsyncMock,
  }),
  usePatchKangurSocialPost: () => ({
    mutateAsync: patchMutateAsyncMock,
  }),
  useDeleteKangurSocialPost: () => ({
    mutateAsync: deleteMutateAsyncMock,
  }),
  usePublishKangurSocialPost: () => ({
    mutateAsync: publishMutateAsyncMock,
    isPending: false,
  }),
  useUnpublishKangurSocialPost: () => ({
    mutateAsync: unpublishMutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: (...args: unknown[]) => logKangurClientErrorMock(...args),
  trackKangurClientEvent: (...args: unknown[]) => trackKangurClientEventMock(...args),

  isRecoverableKangurClientFetchError: vi.fn().mockReturnValue(false),}));

vi.mock('@/features/kangur/shared/utils/observability/error-system-client', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => captureExceptionMock(...args),
  },
}));

import { useSocialPostCrud } from './useSocialPostCrud';

const activePost = {
  id: 'post-1',
  titlePl: 'Draft title',
  titleEn: 'Draft title',
  bodyPl: 'Polish body',
  bodyEn: 'English body',
  status: 'draft' as const,
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return {
    queryClient,
    Wrapper,
  };
};

const createDeps = () => ({
  activePost: activePost as never,
  activePostId: 'post-1',
  setActivePostId: vi.fn(),
  editorState: {
    titlePl: 'Draft title',
    titleEn: 'Draft title',
    bodyPl: 'Polish body',
    bodyEn: 'English body',
  },
  scheduledAt: '2026-03-27T12:30',
  imageAssets: [{ id: 'asset-1', url: '/asset-1.png' }],
  imageAddonIds: ['addon-1'],
  recentAddons: [],
  resolveDocReferences: () => ['docs/intro.mdx'],
  linkedinConnectionId: 'conn-1',
  brainModelId: 'brain-1',
  visionModelId: 'vision-1',
  buildSocialContext: (overrides?: Record<string, unknown>) => ({
    postId: 'post-1',
    ...overrides,
  }),
});

describe('useSocialPostCrud', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveMutateAsyncMock.mockResolvedValue({ id: 'draft-1' });
    patchMutateAsyncMock.mockResolvedValue({});
    deleteMutateAsyncMock.mockResolvedValue(undefined);
    publishMutateAsyncMock.mockResolvedValue({ id: 'post-1' });
    unpublishMutateAsyncMock.mockResolvedValue({ id: 'post-1' });
    fetchKangurSocialPostsMock.mockResolvedValue([]);
  });

  it('creates a draft and selects it on success', async () => {
    const deps = createDeps();
    const { result } = renderHook(() => useSocialPostCrud(deps), {
      wrapper: createWrapper().Wrapper,
    });

    let created: Awaited<ReturnType<typeof result.current.handleCreateDraft>> | undefined;
    await act(async () => {
      created = await result.current.handleCreateDraft();
    });

    expect(created).toEqual({ id: 'draft-1' });
    expect(saveMutateAsyncMock).toHaveBeenCalledWith({});
    expect(deps.setActivePostId).toHaveBeenCalledWith('draft-1');
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_social_post_create_success',
      { postId: 'draft-1' }
    );
  });

  it('saves scheduled post data with resolved scheduling and media metadata', async () => {
    const deps = createDeps();
    const { result } = renderHook(() => useSocialPostCrud(deps), {
      wrapper: createWrapper().Wrapper,
    });

    await act(async () => {
      await result.current.handleSave('scheduled');
    });

    expect(patchMutateAsyncMock).toHaveBeenCalledWith({
      id: 'post-1',
      updates: expect.objectContaining({
        status: 'scheduled',
        scheduledAt: new Date('2026-03-27T12:30').toISOString(),
        imageAssets: [{ id: 'asset-1', url: '/asset-1.png' }],
        imageAddonIds: ['addon-1'],
        docReferences: ['docs/intro.mdx'],
        linkedinConnectionId: 'conn-1',
        brainModelId: 'brain-1',
        visionModelId: 'vision-1',
        publishError: null,
      }),
    });
  });

  it('canonicalizes stale selected capture assets to the latest loaded addon before saving', async () => {
    const deps = createDeps();
    deps.imageAssets = [
      { id: 'asset-old', url: '/captures/game-old.png', filepath: '/captures/game-old.png' },
      { id: 'manual-1', url: '/manual/custom.png', filepath: '/manual/custom.png' },
    ];
    deps.imageAddonIds = ['addon-old', 'addon-new'];
    deps.recentAddons = [
      {
        id: 'addon-new',
        presetId: 'game',
        playwrightCaptureRouteId: 'game',
        imageAsset: {
          id: 'asset-new',
          url: '/captures/game-new.png',
          filepath: '/captures/game-new.png',
        },
      },
      {
        id: 'addon-old',
        presetId: 'game',
        playwrightCaptureRouteId: 'game',
        imageAsset: {
          id: 'asset-old',
          url: '/captures/game-old.png',
          filepath: '/captures/game-old.png',
        },
      },
    ] as never;

    const { result } = renderHook(() => useSocialPostCrud(deps), {
      wrapper: createWrapper().Wrapper,
    });

    await act(async () => {
      await result.current.handleSave('draft');
    });

    expect(patchMutateAsyncMock).toHaveBeenCalledWith({
      id: 'post-1',
      updates: expect.objectContaining({
        status: 'draft',
        imageAddonIds: ['addon-new'],
        imageAssets: [
          {
            id: 'asset-new',
            url: '/captures/game-new.png',
            filepath: '/captures/game-new.png',
          },
          { id: 'manual-1', url: '/manual/custom.png', filepath: '/manual/custom.png' },
        ],
      }),
    });
  });

  it('keeps a LinkedIn-published post in published status when saving local draft edits', async () => {
    const deps = createDeps();
    deps.activePost = {
      ...activePost,
      status: 'draft' as const,
      publishedAt: '2026-03-27T12:31:00.000Z',
      linkedinPostId: 'urn:li:share:still-published',
      linkedinUrl: 'https://www.linkedin.com/feed/update/urn:li:share:still-published/',
    } as never;

    const { result } = renderHook(() => useSocialPostCrud(deps), {
      wrapper: createWrapper().Wrapper,
    });

    await act(async () => {
      await result.current.handleSave('draft');
    });

    expect(patchMutateAsyncMock).toHaveBeenCalledWith({
      id: 'post-1',
      updates: expect.objectContaining({
        status: 'published',
      }),
    });
  });

  it('publishes after saving the prepared post payload and syncs the published post into cache', async () => {
    const deps = createDeps();
    const { queryClient, Wrapper } = createWrapper();
    const queryKey = QUERY_KEYS.kangur.socialPosts({ scope: 'admin', limit: null });
    const publishedPost = {
      ...activePost,
      status: 'published' as const,
      publishedAt: '2026-03-27T12:31:00.000Z',
      linkedinPostId: 'urn:li:share:published',
      linkedinUrl: 'https://www.linkedin.com/feed/update/urn:li:share:published/',
      publishError: null,
    };
    queryClient.setQueryData(queryKey, [activePost]);
    publishMutateAsyncMock.mockResolvedValueOnce(publishedPost);

    const { result } = renderHook(() => useSocialPostCrud(deps), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.handlePublish();
    });

    expect(patchMutateAsyncMock).toHaveBeenCalled();
    expect(publishMutateAsyncMock).toHaveBeenCalledWith({
      id: 'post-1',
      mode: 'published',
    });
    expect(queryClient.getQueryData(queryKey)).toEqual([publishedPost]);
    expect(toastMock).toHaveBeenCalledWith('Published to LinkedIn.', { variant: 'success' });
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_social_post_publish_success',
      { postId: 'post-1' }
    );
  });

  it('skips duplicate publish attempts when the active post is already published on LinkedIn', async () => {
    const deps = createDeps();
    deps.activePost = {
      ...activePost,
      status: 'draft' as const,
      publishedAt: '2026-03-27T12:31:00.000Z',
      linkedinPostId: 'urn:li:share:already-published',
      linkedinUrl: 'https://www.linkedin.com/feed/update/urn:li:share:already-published/',
    } as never;

    const { result } = renderHook(() => useSocialPostCrud(deps), {
      wrapper: createWrapper().Wrapper,
    });

    await act(async () => {
      await result.current.handlePublish();
    });

    expect(patchMutateAsyncMock).not.toHaveBeenCalled();
    expect(publishMutateAsyncMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      'This post is already published on LinkedIn. Unpublish it before publishing again.',
      { variant: 'info' }
    );
  });

  it('skips scheduling attempts when the active post is already published on LinkedIn', async () => {
    const deps = createDeps();
    deps.activePost = {
      ...activePost,
      status: 'draft' as const,
      publishedAt: '2026-03-27T12:31:00.000Z',
      linkedinPostId: 'urn:li:share:already-published',
      linkedinUrl: 'https://www.linkedin.com/feed/update/urn:li:share:already-published/',
    } as never;

    const { result } = renderHook(() => useSocialPostCrud(deps), {
      wrapper: createWrapper().Wrapper,
    });

    await act(async () => {
      await result.current.handleSave('scheduled');
    });

    expect(patchMutateAsyncMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      'This post is already published on LinkedIn. Unpublish it before scheduling again.',
      { variant: 'info' }
    );
  });

  it('shows the saved publishError after LinkedIn publish fails and skips noisy client exception reporting', async () => {
    const deps = createDeps();
    const publishedFailurePost = {
      ...activePost,
      status: 'failed' as const,
      publishError: 'LinkedIn post failed: duplicate content detected by LinkedIn.',
    };
    publishMutateAsyncMock.mockRejectedValueOnce(new Error('The operation failed. Please try again.'));
    fetchKangurSocialPostsMock.mockResolvedValueOnce([publishedFailurePost]);

    const { result } = renderHook(() => useSocialPostCrud(deps), {
      wrapper: createWrapper().Wrapper,
    });

    await act(async () => {
      await result.current.handlePublish();
    });

    expect(fetchKangurSocialPostsMock).toHaveBeenCalledWith({ scope: 'admin' });
    expect(toastMock).toHaveBeenCalledWith(
      'LinkedIn post failed: duplicate content detected by LinkedIn.',
      { variant: 'error' }
    );
    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(logKangurClientErrorMock).not.toHaveBeenCalled();
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_social_post_publish_failed',
      expect.objectContaining({
        postId: 'post-1',
        stage: 'publish',
        error: true,
        recoveredPublishError: true,
      })
    );
  });

  it('recovers publish success when the client times out but the refreshed post is already published', async () => {
    const deps = createDeps();
    const { queryClient, Wrapper } = createWrapper();
    const queryKey = QUERY_KEYS.kangur.socialPosts({ scope: 'admin', limit: null });
    const publishedPost = {
      ...activePost,
      status: 'published' as const,
      publishedAt: '2026-03-27T12:31:00.000Z',
      linkedinPostId: 'urn:li:share:123',
      linkedinUrl: 'https://www.linkedin.com/feed/update/urn:li:share:123/',
      publishError: null,
    };
    queryClient.setQueryData(queryKey, [activePost]);
    publishMutateAsyncMock.mockRejectedValueOnce(new Error('Request timeout after 15000ms'));
    fetchKangurSocialPostsMock.mockResolvedValueOnce([publishedPost]);

    const { result } = renderHook(() => useSocialPostCrud(deps), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.handlePublish();
    });

    expect(fetchKangurSocialPostsMock).toHaveBeenCalledWith({ scope: 'admin' });
    expect(queryClient.getQueryData(queryKey)).toEqual([publishedPost]);
    expect(toastMock).toHaveBeenCalledWith('Published to LinkedIn.', { variant: 'success' });
    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(logKangurClientErrorMock).not.toHaveBeenCalled();
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_social_post_publish_success',
      expect.objectContaining({
        postId: 'post-1',
        recoveredPublishState: true,
      })
    );
  });

  it('shows the saved publishError after quick publish fails and skips noisy client exception reporting', async () => {
    const deps = createDeps();
    const publishedFailurePost = {
      ...activePost,
      status: 'failed' as const,
      publishError: 'LinkedIn post failed: selected connection is missing publish permissions.',
    };
    publishMutateAsyncMock.mockRejectedValueOnce(new Error('The operation failed. Please try again.'));
    fetchKangurSocialPostsMock.mockResolvedValueOnce([publishedFailurePost]);

    const { result } = renderHook(() => useSocialPostCrud(deps), {
      wrapper: createWrapper().Wrapper,
    });

    await act(async () => {
      await expect(result.current.handleQuickPublishPost('post-1')).rejects.toThrow(
        'The operation failed. Please try again.'
      );
    });

    expect(fetchKangurSocialPostsMock).toHaveBeenCalledWith({ scope: 'admin' });
    expect(toastMock).toHaveBeenCalledWith(
      'LinkedIn post failed: selected connection is missing publish permissions.',
      { variant: 'error' }
    );
    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(logKangurClientErrorMock).not.toHaveBeenCalled();
  });

  it('syncs the published post into cache after quick publish succeeds', async () => {
    const deps = createDeps();
    const { queryClient, Wrapper } = createWrapper();
    const queryKey = QUERY_KEYS.kangur.socialPosts({ scope: 'admin', limit: null });
    const publishedPost = {
      ...activePost,
      status: 'published' as const,
      publishedAt: '2026-03-27T12:31:00.000Z',
      linkedinPostId: 'urn:li:share:quick-published',
      linkedinUrl: 'https://www.linkedin.com/feed/update/urn:li:share:quick-published/',
      publishError: null,
    };
    queryClient.setQueryData(queryKey, [activePost]);
    publishMutateAsyncMock.mockResolvedValueOnce(publishedPost);

    const { result } = renderHook(() => useSocialPostCrud(deps), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await expect(result.current.handleQuickPublishPost('post-1')).resolves.toBeUndefined();
    });

    expect(publishMutateAsyncMock).toHaveBeenCalledWith({
      id: 'post-1',
      mode: 'published',
      skipImages: undefined,
    });
    expect(queryClient.getQueryData(queryKey)).toEqual([publishedPost]);
    expect(toastMock).toHaveBeenCalledWith('Published to LinkedIn.', { variant: 'success' });
  });

  it('recovers quick publish success when the client times out but the refreshed post is already published', async () => {
    const deps = createDeps();
    const { queryClient, Wrapper } = createWrapper();
    const queryKey = QUERY_KEYS.kangur.socialPosts({ scope: 'admin', limit: null });
    const publishedPost = {
      ...activePost,
      status: 'published' as const,
      publishedAt: '2026-03-27T12:31:00.000Z',
      linkedinPostId: 'urn:li:share:456',
      linkedinUrl: 'https://www.linkedin.com/feed/update/urn:li:share:456/',
      publishError: null,
    };
    queryClient.setQueryData(queryKey, [activePost]);
    publishMutateAsyncMock.mockRejectedValueOnce(new Error('Request timeout after 15000ms'));
    fetchKangurSocialPostsMock.mockResolvedValueOnce([publishedPost]);

    const { result } = renderHook(() => useSocialPostCrud(deps), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await expect(result.current.handleQuickPublishPost('post-1')).resolves.toBeUndefined();
    });

    expect(fetchKangurSocialPostsMock).toHaveBeenCalledWith({ scope: 'admin' });
    expect(queryClient.getQueryData(queryKey)).toEqual([publishedPost]);
    expect(toastMock).toHaveBeenCalledWith('Published to LinkedIn.', { variant: 'success' });
    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(logKangurClientErrorMock).not.toHaveBeenCalled();
  });

  it('recovers quick publish success when LinkedIn metadata exists even if the refreshed post drifted back to local draft status', async () => {
    const deps = createDeps();
    const { queryClient, Wrapper } = createWrapper();
    const queryKey = QUERY_KEYS.kangur.socialPosts({ scope: 'admin', limit: null });
    const publishedDriftPost = {
      ...activePost,
      status: 'draft' as const,
      publishedAt: '2026-03-27T12:31:00.000Z',
      linkedinPostId: 'urn:li:share:789',
      linkedinUrl: 'https://www.linkedin.com/feed/update/urn:li:share:789/',
      publishError: null,
    };
    queryClient.setQueryData(queryKey, [activePost]);
    publishMutateAsyncMock.mockRejectedValueOnce(new Error('Request timeout after 15000ms'));
    fetchKangurSocialPostsMock.mockResolvedValueOnce([publishedDriftPost]);

    const { result } = renderHook(() => useSocialPostCrud(deps), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await expect(result.current.handleQuickPublishPost('post-1')).resolves.toBeUndefined();
    });

    expect(fetchKangurSocialPostsMock).toHaveBeenCalledWith({ scope: 'admin' });
    expect(queryClient.getQueryData(queryKey)).toEqual([publishedDriftPost]);
    expect(toastMock).toHaveBeenCalledWith('Published to LinkedIn.', { variant: 'success' });
    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(logKangurClientErrorMock).not.toHaveBeenCalled();
  });

  it('allows more than 12 attached images when saving the draft', async () => {
    const deps = createDeps();
    deps.imageAssets = Array.from({ length: 13 }, (_, index) => ({
      id: `asset-${index + 1}`,
      url: `/asset-${index + 1}.png`,
    }));

    const { result } = renderHook(() => useSocialPostCrud(deps), {
      wrapper: createWrapper().Wrapper,
    });

    await act(async () => {
      await result.current.handleSave('draft');
    });

    expect(patchMutateAsyncMock).toHaveBeenCalledWith({
      id: 'post-1',
      updates: expect.objectContaining({
        status: 'draft',
        imageAssets: deps.imageAssets,
      }),
    });
    expect(toastMock).not.toHaveBeenCalledWith(
      expect.stringContaining('Attached images'),
      expect.anything()
    );
  });

  it('blocks invalid save payloads on the client and shows a field-specific toast', async () => {
    const deps = createDeps();
    deps.editorState = {
      ...deps.editorState,
      titlePl: 'x'.repeat(201),
    };

    const { result } = renderHook(() => useSocialPostCrud(deps), {
      wrapper: createWrapper().Wrapper,
    });

    await act(async () => {
      await result.current.handleSave('draft');
    });

    expect(patchMutateAsyncMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      'Polish title: Too big: expected string to have <=200 characters',
      { variant: 'error' }
    );
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_social_post_save_failed',
      { postId: 'post-1', nextStatus: 'draft', error: true, validationError: true }
    );
  });

  it('unpublishes a post and reports a success toast', async () => {
    const deps = createDeps();
    const { result } = renderHook(() => useSocialPostCrud(deps), {
      wrapper: createWrapper().Wrapper,
    });

    await act(async () => {
      await result.current.handleUnpublishPost('post-1', { keepLocal: true });
    });

    expect(unpublishMutateAsyncMock).toHaveBeenCalledWith({
      id: 'post-1',
      keepLocal: true,
    });
    expect(toastMock).toHaveBeenCalledWith(
      'Unpublished from LinkedIn. Post kept as draft.',
      { variant: 'success' }
    );
  });

  it('removes the deleted draft from cache and selects the next cached post after success', async () => {
    const deps = createDeps();
    const { queryClient, Wrapper } = createWrapper();
    const nextPost = {
      ...activePost,
      id: 'post-2',
      titlePl: 'Second draft',
      titleEn: 'Second draft',
    };
    const queryKey = QUERY_KEYS.kangur.socialPosts({ scope: 'admin', limit: null });
    queryClient.setQueryData(queryKey, [activePost, nextPost]);

    const { result } = renderHook(() => useSocialPostCrud(deps), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.handleDeletePost('post-1');
    });

    expect(deleteMutateAsyncMock).toHaveBeenCalledWith('post-1');
    expect(queryClient.getQueryData(queryKey)).toEqual([nextPost]);
    expect(deps.setActivePostId).toHaveBeenCalledWith(expect.any(Function));
    const setActivePostIdUpdater = deps.setActivePostId.mock.calls[0]?.[0] as
      | ((current: string | null) => string | null)
      | undefined;
    expect(setActivePostIdUpdater?.('post-1')).toBe('post-2');
    expect(toastMock).toHaveBeenCalledWith('Draft deleted.', { variant: 'success' });
  });
});
