/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  generateMutateAsyncMock,
  previewMutateAsyncMock,
  applyMutateAsyncMock,
  toastMock,
  logKangurClientErrorMock,
  trackKangurClientEventMock,
} = vi.hoisted(() => ({
  generateMutateAsyncMock: vi.fn(),
  previewMutateAsyncMock: vi.fn(),
  applyMutateAsyncMock: vi.fn(),
  toastMock: vi.fn(),
  logKangurClientErrorMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
}));

vi.mock('@/features/kangur/shared/ui', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurSocialPosts', () => ({
  useGenerateKangurSocialPost: () => ({
    mutateAsync: generateMutateAsyncMock,
  }),
  usePreviewKangurSocialDocUpdates: () => ({
    mutateAsync: previewMutateAsyncMock,
  }),
  useApplyKangurSocialDocUpdates: () => ({
    mutateAsync: applyMutateAsyncMock,
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: (...args: unknown[]) => logKangurClientErrorMock(...args),
  trackKangurClientEvent: (...args: unknown[]) => trackKangurClientEventMock(...args),
}));

import { useSocialGeneration } from './useSocialGeneration';

describe('useSocialGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateMutateAsyncMock.mockResolvedValue({
      id: 'post-1',
      titlePl: 'Generated PL',
      titleEn: 'Generated EN',
      bodyPl: 'Body PL',
      bodyEn: 'Body EN',
    });
  });

  it('sends selected brain and vision model ids with the generation request', async () => {
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
        buildSocialContext: () => ({ postId: 'post-1' }),
      })
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
  });
});
