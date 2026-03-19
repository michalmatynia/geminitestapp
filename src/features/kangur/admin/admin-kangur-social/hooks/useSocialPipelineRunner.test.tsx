/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  apiGetMock,
  apiPostMock,
  logKangurClientErrorMock,
  toastMock,
  trackKangurClientEventMock,
} = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  logKangurClientErrorMock: vi.fn(),
  toastMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
    post: (...args: unknown[]) => apiPostMock(...args),
  },
}));

vi.mock('@/features/kangur/shared/ui', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: (...args: unknown[]) => logKangurClientErrorMock(...args),
  trackKangurClientEvent: (...args: unknown[]) => trackKangurClientEventMock(...args),
}));

import { useSocialPipelineRunner } from './useSocialPipelineRunner';

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

describe('useSocialPipelineRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queues the manual server job and syncs the completed result back into the editor state', async () => {
    apiPostMock.mockResolvedValue({
      success: true,
      jobId: 'job-1',
      jobType: 'manual-post-pipeline',
    });
    apiGetMock.mockResolvedValue({
      id: 'job-1',
      status: 'completed',
      failedReason: null,
      result: {
        type: 'manual-post-pipeline',
        postId: 'post-1',
        addonsCreated: 1,
        failures: 0,
        runId: 'run-1',
        contextSummary: 'summary',
        contextDocCount: 1,
        imageAddonIds: ['addon-1'],
        imageAssets: [{ id: 'asset-1', url: '/asset-1.png' }],
        batchCaptureResult: {
          addons: [{ id: 'addon-1', title: 'Addon 1' }],
          failures: [],
          runId: 'run-1',
        },
        generatedPost: {
          id: 'post-1',
          titlePl: 'Generated PL',
          titleEn: 'Generated EN',
          bodyPl: 'Body PL',
          bodyEn: 'Body EN',
        },
        docUpdates: {
          applied: false,
          plan: { items: [], files: [] },
          post: { id: 'post-1' },
        },
      },
    });

    const setActivePostId = vi.fn();
    const setEditorState = vi.fn();
    const setImageAddonIds = vi.fn();
    const setImageAssets = vi.fn();
    const setDocUpdatesResult = vi.fn();
    const setBatchCaptureResult = vi.fn();
    const handleSelectAddons = vi.fn();

    const { result } = renderHook(
      () =>
        useSocialPipelineRunner({
          activePost: {
            id: 'post-1',
            titlePl: 'Draft',
            titleEn: '',
            bodyPl: '',
            bodyEn: '',
            status: 'draft',
          } as never,
          activePostId: 'post-1',
          editorState: {
            titlePl: 'Draft',
            titleEn: '',
            bodyPl: '',
            bodyEn: '',
          },
          imageAssets: [],
          imageAddonIds: [],
          batchCaptureBaseUrl: 'https://example.com',
          batchCapturePresetIds: ['preset-1'],
          linkedinConnectionId: null,
          brainModelId: 'brain-1',
          visionModelId: 'vision-1',
          canRunServerPipeline: true,
          pipelineBlockedReason: null,
          projectUrl: 'https://example.com/project',
          generationNotes: 'Note',
          resolveDocReferences: () => ['docs/kangur/example.mdx'],
          buildSocialContext: () => ({ postId: 'post-1' }),
          handleLoadContext: vi.fn(),
          setActivePostId,
          setEditorState,
          setImageAddonIds,
          setImageAssets,
          setDocUpdatesResult,
          setBatchCaptureResult,
          handleSelectAddons,
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.handleRunFullPipeline();
    });

    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/kangur/social-pipeline/trigger',
      expect.objectContaining({
        jobType: 'manual-post-pipeline',
        input: expect.objectContaining({
          postId: 'post-1',
          batchCaptureBaseUrl: 'https://example.com',
        }),
      }),
      expect.any(Object)
    );
    expect(apiPostMock.mock.calls[0]?.[1]).not.toEqual(
      expect.objectContaining({
        input: expect.objectContaining({
          brainModelId: expect.anything(),
          visionModelId: expect.anything(),
        }),
      })
    );
    expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/social-pipeline/jobs', {
      params: { id: 'job-1' },
      timeout: 30_000,
    });
    expect(setActivePostId).toHaveBeenCalledWith('post-1');
    expect(setEditorState).toHaveBeenCalledWith({
      titlePl: 'Generated PL',
      titleEn: 'Generated EN',
      bodyPl: 'Body PL',
      bodyEn: 'Body EN',
    });
    expect(setImageAddonIds).toHaveBeenCalledWith(['addon-1']);
    expect(setImageAssets).toHaveBeenCalledWith([{ id: 'asset-1', url: '/asset-1.png' }]);
    expect(setBatchCaptureResult).toHaveBeenCalledWith({
      addons: [{ id: 'addon-1', title: 'Addon 1' }],
      failures: [],
      runId: 'run-1',
    });
    expect(handleSelectAddons).toHaveBeenCalledWith([
      { id: 'addon-1', title: 'Addon 1' },
    ]);
    expect(result.current.pipelineStep).toBe('done');
  });

  it('does not queue a server job when AI Brain post generation is not configured', async () => {
    const { result } = renderHook(
      () =>
        useSocialPipelineRunner({
          activePost: {
            id: 'post-1',
            titlePl: 'Draft',
            titleEn: '',
            bodyPl: '',
            bodyEn: '',
            status: 'draft',
          } as never,
          activePostId: 'post-1',
          editorState: {
            titlePl: 'Draft',
            titleEn: '',
            bodyPl: '',
            bodyEn: '',
          },
          imageAssets: [],
          imageAddonIds: [],
          batchCaptureBaseUrl: 'https://example.com',
          batchCapturePresetIds: ['preset-1'],
          linkedinConnectionId: null,
          brainModelId: null,
          visionModelId: null,
          canRunServerPipeline: false,
          pipelineBlockedReason:
            'Assign an AI Brain model for StudiQ Social Post Generation in /admin/brain?tab=routing.',
          projectUrl: 'https://example.com/project',
          generationNotes: 'Note',
          resolveDocReferences: () => [],
          buildSocialContext: () => ({ postId: 'post-1' }),
          handleLoadContext: vi.fn(),
          setActivePostId: vi.fn(),
          setEditorState: vi.fn(),
          setImageAddonIds: vi.fn(),
          setImageAssets: vi.fn(),
          setDocUpdatesResult: vi.fn(),
          setBatchCaptureResult: vi.fn(),
          handleSelectAddons: vi.fn(),
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.handleRunFullPipeline();
    });

    expect(apiPostMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      'Assign an AI Brain model for StudiQ Social Post Generation in /admin/brain?tab=routing.',
      { variant: 'warning' }
    );
  });
});
