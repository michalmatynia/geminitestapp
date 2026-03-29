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

vi.mock('@/features/kangur/ui/hooks/useKangurSocialPosts', () => ({
  useGenerateKangurSocialPost: () => ({
    mutateAsync: generateMutateAsyncMock,
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: (...args: unknown[]) => logKangurClientErrorMock(...args),
  trackKangurClientEvent: (...args: unknown[]) => trackKangurClientEventMock(...args),
}));

import { useSocialGeneration } from './useSocialGeneration';

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
});
