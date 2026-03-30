/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  apiGetMock,
  generateMutateAsyncMock,
  toastMock,
  logKangurClientErrorMock,
  trackKangurClientEventMock,
} = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  generateMutateAsyncMock: vi.fn(),
  toastMock: vi.fn(),
  logKangurClientErrorMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
}));

vi.mock('@/features/kangur/shared/ui', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
  },
}));

vi.mock('@/features/kangur/social/hooks/useKangurSocialPosts', () => ({
  useGenerateKangurSocialPost: () => ({
    mutateAsync: generateMutateAsyncMock,
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: (...args: unknown[]) => logKangurClientErrorMock(...args),
  trackKangurClientEvent: (...args: unknown[]) => trackKangurClientEventMock(...args),
}));

import { useSocialGeneration } from './useSocialGeneration';

const completedVisualAnalysis = {
  summary: 'The hero now shows a larger student card and clearer CTA.',
  highlights: ['Larger student card', 'Clearer CTA'],
} as const;

const createWrapper = (): React.ComponentType<{ children: ReactNode }> => {
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

describe('useSocialGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateMutateAsyncMock.mockResolvedValue({
      success: true,
      jobId: 'job-generate-1',
      jobType: 'manual-post-generation',
    });
    apiGetMock.mockResolvedValue({
      id: 'job-generate-1',
      status: 'completed',
      failedReason: null,
      result: {
        type: 'manual-post-generation',
        generatedPost: {
          id: 'post-1',
          titlePl: 'Generated PL',
          titleEn: 'Generated EN',
          bodyPl: 'Body PL',
          bodyEn: 'Body EN',
        },
        draft: null,
      },
    });
  });

  it('sends selected brain and vision model ids with the generation request', async () => {
    const setActivePostId = vi.fn();
    const setEditorState = vi.fn();
    const setContextSummary = vi.fn();

    const { result } = renderHook(() =>
      useSocialGeneration({
        activePost: {
          id: 'post-1',
          titlePl: 'Draft',
          titleEn: '',
          bodyPl: '',
          bodyEn: '',
          status: 'draft',
        } as never,
        resolveDocReferences: () => ['docs/overview.mdx'],
        generationNotes: 'Focus on product changes.',
        brainModelId: 'gpt-4.1',
        visionModelId: 'gpt-4.1-mini',
        canGenerateDraft: true,
        generateDraftBlockedReason: null,
        imageAddonIds: ['addon-1'],
        projectUrl: 'https://studiq.example.com/project',
        setActivePostId,
        setEditorState,
        setContextSummary,
        buildSocialContext: () => ({ postId: 'post-1' }),
      }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.handleGenerate();
    });

    expect(generateMutateAsyncMock).toHaveBeenCalledWith({
      postId: 'post-1',
      docReferences: ['docs/overview.mdx'],
      notes: 'Focus on product changes.',
      modelId: 'gpt-4.1',
      visionModelId: 'gpt-4.1-mini',
      imageAddonIds: ['addon-1'],
      projectUrl: 'https://studiq.example.com/project',
    });
    expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/social-pipeline/jobs', {
      params: { id: 'job-generate-1' },
      timeout: 60_000,
    });
    expect(setActivePostId).toHaveBeenCalledWith('post-1');
    expect(setEditorState).toHaveBeenCalledWith({
      titlePl: 'Generated PL',
      titleEn: 'Generated EN',
      bodyPl: 'Body PL',
      bodyEn: 'Body EN',
    });
    expect(setContextSummary).toHaveBeenCalledWith(null);
    expect(toastMock).toHaveBeenCalledWith('Draft updated — review the generated post.', {
      variant: 'success',
    });
  });

  it('sends prefetched visual analysis through the dedicated generation queue path', async () => {
    const setActivePostId = vi.fn();
    const setEditorState = vi.fn();
    const setContextSummary = vi.fn();

    const { result } = renderHook(() =>
      useSocialGeneration({
        activePost: {
          id: 'post-1',
          titlePl: 'Draft',
          titleEn: '',
          bodyPl: '',
          bodyEn: '',
          status: 'draft',
        } as never,
        resolveDocReferences: () => ['docs/overview.mdx'],
        generationNotes: 'Focus on product changes.',
        brainModelId: 'gpt-4.1',
        visionModelId: 'gpt-4.1-mini',
        canGenerateDraft: true,
        generateDraftBlockedReason: null,
        imageAddonIds: ['addon-1'],
        projectUrl: 'https://studiq.example.com/project',
        setActivePostId,
        setEditorState,
        setContextSummary,
        buildSocialContext: () => ({ postId: 'post-1' }),
      }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await expect(
        result.current.handleGenerateWithVisualAnalysis(completedVisualAnalysis)
      ).resolves.toBe(true);
    });

    expect(generateMutateAsyncMock).toHaveBeenCalledWith({
      postId: 'post-1',
      docReferences: ['docs/overview.mdx'],
      notes: 'Focus on product changes.',
      modelId: 'gpt-4.1',
      visionModelId: 'gpt-4.1-mini',
      imageAddonIds: ['addon-1'],
      projectUrl: 'https://studiq.example.com/project',
      prefetchedVisualAnalysis: completedVisualAnalysis,
      requireVisualAnalysisInBody: true,
    });
    expect(setEditorState).toHaveBeenCalledWith({
      titlePl: 'Generated PL',
      titleEn: 'Generated EN',
      bodyPl: 'Body PL',
      bodyEn: 'Body EN',
    });
    expect(toastMock).toHaveBeenCalledWith('Draft updated — review the generated post.', {
      variant: 'success',
    });
  });

  it('blocks generation when Project URL is missing or localhost-only', async () => {
    const createDeps = (projectUrl: string) => ({
      activePost: {
        id: 'post-1',
        titlePl: 'Draft',
        titleEn: '',
        bodyPl: '',
        bodyEn: '',
        status: 'draft',
      } as never,
      resolveDocReferences: () => ['docs/overview.mdx'],
      generationNotes: 'Focus on product changes.',
      brainModelId: 'gpt-4.1',
      visionModelId: 'gpt-4.1-mini',
      canGenerateDraft: true,
      generateDraftBlockedReason: null,
      imageAddonIds: ['addon-1'],
      projectUrl,
      setActivePostId: vi.fn(),
      setEditorState: vi.fn(),
      setContextSummary: vi.fn(),
      buildSocialContext: () => ({ postId: 'post-1' }),
    });

    const { result, rerender } = renderHook(
      (deps: ReturnType<typeof createDeps>) => useSocialGeneration(deps),
      {
        initialProps: createDeps(''),
        wrapper: createWrapper(),
      }
    );

    await act(async () => {
      await expect(result.current.handleGenerate()).resolves.toBe(false);
    });

    expect(generateMutateAsyncMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      'Set Settings Project URL before generating social posts.',
      { variant: 'warning' }
    );

    rerender(createDeps('http://localhost:3000'));

    await act(async () => {
      await expect(result.current.handleGenerate()).resolves.toBe(false);
    });

    expect(generateMutateAsyncMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      'Settings Project URL must be a valid public URL. Localhost, loopback, and private network URLs are not allowed.',
      { variant: 'warning' }
    );
  });

  it('fails instead of reporting success when the generation job returns no post copy', async () => {
    const setActivePostId = vi.fn();
    const setEditorState = vi.fn();
    const setContextSummary = vi.fn();

    apiGetMock.mockResolvedValueOnce({
      id: 'job-generate-1',
      status: 'completed',
      failedReason: null,
      result: {
        type: 'manual-post-generation',
        generatedPost: {
          id: 'post-1',
          titlePl: '',
          titleEn: '',
          bodyPl: '',
          bodyEn: '',
        },
        draft: null,
      },
    });

    const { result } = renderHook(() =>
      useSocialGeneration({
        activePost: {
          id: 'post-1',
          titlePl: 'Draft',
          titleEn: '',
          bodyPl: '',
          bodyEn: '',
          status: 'draft',
        } as never,
        resolveDocReferences: () => ['docs/overview.mdx'],
        generationNotes: 'Focus on product changes.',
        brainModelId: 'gpt-4.1',
        visionModelId: 'gpt-4.1-mini',
        canGenerateDraft: true,
        generateDraftBlockedReason: null,
        imageAddonIds: ['addon-1'],
        projectUrl: 'https://studiq.example.com/project',
        setActivePostId,
        setEditorState,
        setContextSummary,
        buildSocialContext: () => ({ postId: 'post-1' }),
      }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await expect(result.current.handleGenerate()).resolves.toBe(false);
    });

    expect(setActivePostId).not.toHaveBeenCalled();
    expect(setEditorState).not.toHaveBeenCalled();
    expect(setContextSummary).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      'Generation completed, but no post copy was returned. Check the queued result and retry.',
      { variant: 'error' }
    );
  });

  it('repairs serialized JSON draft text returned in generated post fields', async () => {
    const setActivePostId = vi.fn();
    const setEditorState = vi.fn();
    const setContextSummary = vi.fn();

    apiGetMock.mockResolvedValueOnce({
      id: 'job-generate-1',
      status: 'completed',
      failedReason: null,
      result: {
        type: 'manual-post-generation',
        generatedPost: {
          id: 'post-1',
          titlePl: '',
          titleEn: '',
          bodyPl: JSON.stringify({
            titlePl: 'Nowe funkcje w StudiQ',
            titleEn: 'New StudiQ features',
            bodyPl: 'Polski wpis o zmianach.',
            bodyEn: 'English update about the changes.',
          }),
          bodyEn: JSON.stringify({
            titlePl: 'Nowe funkcje w StudiQ',
            titleEn: 'New StudiQ features',
            bodyPl: 'Polski wpis o zmianach.',
            bodyEn: 'English update about the changes.',
          }),
        },
        draft: null,
      },
    });

    const { result } = renderHook(() =>
      useSocialGeneration({
        activePost: {
          id: 'post-1',
          titlePl: 'Draft',
          titleEn: '',
          bodyPl: '',
          bodyEn: '',
          status: 'draft',
        } as never,
        resolveDocReferences: () => ['docs/overview.mdx'],
        generationNotes: 'Focus on product changes.',
        brainModelId: 'gpt-4.1',
        visionModelId: 'gpt-4.1-mini',
        canGenerateDraft: true,
        generateDraftBlockedReason: null,
        imageAddonIds: ['addon-1'],
        projectUrl: 'https://studiq.example.com/project',
        setActivePostId,
        setEditorState,
        setContextSummary,
        buildSocialContext: () => ({ postId: 'post-1' }),
      }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await expect(result.current.handleGenerateWithVisualAnalysis(completedVisualAnalysis)).resolves.toBe(true);
    });

    expect(setEditorState).toHaveBeenCalledWith({
      titlePl: 'Nowe funkcje w StudiQ',
      titleEn: 'New StudiQ features',
      bodyPl: 'Polski wpis o zmianach.',
      bodyEn: 'English update about the changes.',
    });
    expect(toastMock).toHaveBeenCalledWith('Draft updated — review the generated post.', {
      variant: 'success',
    });
  });
});
