/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  toastMock,
  patchMutateAsyncMock,
  logKangurClientErrorMock,
  apiPatchMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  patchMutateAsyncMock: vi.fn(),
  logKangurClientErrorMock: vi.fn(),
  apiPatchMock: vi.fn(),
}));

vi.mock('@/features/kangur/shared/ui', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/features/kangur/social/hooks/useKangurSocialPosts', () => ({
  usePatchKangurSocialPost: () => ({
    mutateAsync: patchMutateAsyncMock,
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: (...args: unknown[]) => logKangurClientErrorMock(...args),

  isRecoverableKangurClientFetchError: vi.fn().mockReturnValue(false),}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    patch: (...args: unknown[]) => apiPatchMock(...args),
  },
}));

import { useSocialContext } from './useSocialContext';

describe('useSocialContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    patchMutateAsyncMock.mockResolvedValue({});
    apiPatchMock.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('warns when no active post is selected', async () => {
    const { result } = renderHook(() =>
      useSocialContext({
        activePost: null,
        resolveDocReferences: () => [],
        setContextSummary: vi.fn(),
        buildSocialContext: () => ({ source: 'test' }),
      })
    );

    await expect(result.current.handleLoadContext()).resolves.toEqual({
      summary: null,
      docCount: null,
      error: true,
    });
    expect(toastMock).toHaveBeenCalledWith('Create or select a post first', {
      variant: 'warning',
    });
  });

  it('loads context and persists it via the patch mutation by default', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        context: 'Loaded summary',
        docCount: 2,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const setContextSummary = vi.fn();

    const { result } = renderHook(() =>
      useSocialContext({
        activePost: { id: 'post-1' } as never,
        resolveDocReferences: () => ['docs/alpha.mdx', 'docs/beta.mdx'],
        setContextSummary,
        buildSocialContext: () => ({ postId: 'post-1' }),
      })
    );

    let response: Awaited<ReturnType<typeof result.current.handleLoadContext>> | undefined;
    await act(async () => {
      response = await result.current.handleLoadContext();
    });

    expect(response).toEqual({
      summary: 'Loaded summary',
      docCount: 2,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kangur/social-posts/context?refs=docs%2Falpha.mdx%2Cdocs%2Fbeta.mdx',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
    expect(setContextSummary).toHaveBeenCalledWith('Loaded summary');
    expect(patchMutateAsyncMock).toHaveBeenCalledWith({
      id: 'post-1',
      updates: { contextSummary: 'Loaded summary' },
    });
    expect(toastMock).toHaveBeenCalledWith('Loaded context from 2 documents', {
      variant: 'success',
    });
  });

  it('supports direct persistence without using the post patch mutation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          summary: 'Direct summary',
          docCount: 1,
        }),
      })
    );

    const { result } = renderHook(() =>
      useSocialContext({
        activePost: { id: 'post-2' } as never,
        resolveDocReferences: () => [],
        setContextSummary: vi.fn(),
        buildSocialContext: () => ({ postId: 'post-2' }),
      })
    );

    await act(async () => {
      await result.current.handleLoadContext({ useDirect: true, notify: false });
    });

    expect(apiPatchMock).toHaveBeenCalledWith('/api/kangur/social-posts/post-2', {
      updates: { contextSummary: 'Direct summary' },
    });
    expect(patchMutateAsyncMock).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('prefers the summarized context payload when both summary and raw context are returned', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          context: 'Very long raw documentation context that should not be persisted directly.',
          summary: 'Concise summary for the selected docs',
          docCount: 3,
        }),
      })
    );
    const setContextSummary = vi.fn();

    const { result } = renderHook(() =>
      useSocialContext({
        activePost: { id: 'post-3' } as never,
        resolveDocReferences: () => ['docs/overview.mdx'],
        setContextSummary,
        buildSocialContext: () => ({ postId: 'post-3' }),
      })
    );

    await act(async () => {
      await result.current.handleLoadContext({ notify: false });
    });

    expect(setContextSummary).toHaveBeenCalledWith('Concise summary for the selected docs');
    expect(patchMutateAsyncMock).toHaveBeenCalledWith({
      id: 'post-3',
      updates: { contextSummary: 'Concise summary for the selected docs' },
    });
  });

  it('truncates oversized fallback context before persisting it on the draft', async () => {
    const oversizedContext = 'A'.repeat(8105);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          context: oversizedContext,
          docCount: 1,
        }),
      })
    );
    const setContextSummary = vi.fn();

    const { result } = renderHook(() =>
      useSocialContext({
        activePost: { id: 'post-4' } as never,
        resolveDocReferences: () => ['docs/overview.mdx'],
        setContextSummary,
        buildSocialContext: () => ({ postId: 'post-4' }),
      })
    );

    await act(async () => {
      await result.current.handleLoadContext({ notify: false });
    });

    const persistedSummary = setContextSummary.mock.calls[0]?.[0];
    expect(typeof persistedSummary).toBe('string');
    expect((persistedSummary as string).length).toBe(8000);
    expect(patchMutateAsyncMock).toHaveBeenCalledWith({
      id: 'post-4',
      updates: { contextSummary: persistedSummary },
    });
  });
});
