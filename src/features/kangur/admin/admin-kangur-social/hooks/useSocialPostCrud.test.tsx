/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  toastMock,
  saveMutateAsyncMock,
  patchMutateAsyncMock,
  deleteMutateAsyncMock,
  publishMutateAsyncMock,
  unpublishMutateAsyncMock,
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
  logKangurClientErrorMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/features/kangur/shared/ui', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurSocialPosts', () => ({
  fetchKangurSocialPosts: vi.fn(),
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
}));

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

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
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
  });

  it('creates a draft and selects it on success', async () => {
    const deps = createDeps();
    const { result } = renderHook(() => useSocialPostCrud(deps), {
      wrapper: createWrapper(),
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
      wrapper: createWrapper(),
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

  it('publishes after saving the prepared post payload', async () => {
    const deps = createDeps();
    const { result } = renderHook(() => useSocialPostCrud(deps), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.handlePublish();
    });

    expect(patchMutateAsyncMock).toHaveBeenCalled();
    expect(publishMutateAsyncMock).toHaveBeenCalledWith({
      id: 'post-1',
      mode: 'published',
    });
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_social_post_publish_success',
      { postId: 'post-1' }
    );
  });

  it('unpublishes a post and reports a success toast', async () => {
    const deps = createDeps();
    const { result } = renderHook(() => useSocialPostCrud(deps), {
      wrapper: createWrapper(),
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
});
