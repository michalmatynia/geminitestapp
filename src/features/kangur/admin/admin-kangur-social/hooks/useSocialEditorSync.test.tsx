/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useKangurSocialPostsMock,
  useKangurSocialImageAddonsMock,
  trackKangurClientEventMock,
} = vi.hoisted(() => ({
  useKangurSocialPostsMock: vi.fn(),
  useKangurSocialImageAddonsMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurSocialPosts', () => ({
  useKangurSocialPosts: (...args: unknown[]) => useKangurSocialPostsMock(...args),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurSocialImageAddons', () => ({
  useKangurSocialImageAddons: (...args: unknown[]) => useKangurSocialImageAddonsMock(...args),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  trackKangurClientEvent: (...args: unknown[]) => trackKangurClientEventMock(...args),
}));

import { useSocialEditorSync } from './useSocialEditorSync';

const postFixture = {
  id: 'post-1',
  titlePl: 'Polish title',
  titleEn: 'English title',
  bodyPl: 'Polish body',
  bodyEn: 'English body',
  status: 'draft' as const,
  scheduledAt: '2026-03-27T12:30:00.000Z',
  docReferences: ['docs/intro.mdx', 'docs/launch.mdx'],
  imageAddonIds: ['addon-1'],
  imageAssets: [{ id: 'asset-1', filepath: '/assets/one.png', url: '/assets/one.png' }],
  contextSummary: 'Existing context',
};

const addonFixture = {
  id: 'addon-1',
  title: 'Addon 1',
  imageAsset: { id: 'asset-1', filepath: '/assets/one.png', url: '/assets/one.png' },
};

describe('useSocialEditorSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKangurSocialPostsMock.mockReturnValue({
      data: [postFixture],
      isLoading: false,
    });
    useKangurSocialImageAddonsMock.mockReturnValue({
      data: [addonFixture],
    });
  });

  it('auto-selects the first post and syncs editor state from it', async () => {
    const { result } = renderHook(() =>
      useSocialEditorSync({
        linkedinConnections: [{ id: 'conn-1' }],
        linkedinConnectionId: 'conn-1',
        brainModelId: 'brain-1',
        visionModelId: 'vision-1',
      })
    );

    await waitFor(() => expect(result.current.activePostId).toBe('post-1'));

    expect(result.current.activePost).toEqual(postFixture);
    expect(result.current.editorState).toEqual({
      titlePl: 'Polish title',
      titleEn: 'English title',
      bodyPl: 'Polish body',
      bodyEn: 'English body',
    });
    expect(result.current.docReferenceInput).toBe('docs/intro.mdx, docs/launch.mdx');
    expect(result.current.imageAddonIds).toEqual(['addon-1']);
    expect(result.current.contextSummary).toBe('Existing context');
    expect(trackKangurClientEventMock).toHaveBeenCalledWith('kangur_social_page_view', {
      postCount: 1,
      hasLinkedInIntegration: true,
      connectionCount: 1,
      brainModelId: 'brain-1',
      visionModelId: 'vision-1',
    });
  });

  it('merges images and add-ons through the local editor handlers', async () => {
    const { result } = renderHook(() =>
      useSocialEditorSync({
        linkedinConnections: [],
        linkedinConnectionId: null,
        brainModelId: null,
        visionModelId: null,
      })
    );

    await waitFor(() => expect(result.current.activePostId).toBe('post-1'));

    act(() => {
      result.current.handleAddImages(['/assets/two.png', '/assets/one.png']);
      result.current.handleSelectAddon({
        id: 'addon-2',
        title: 'Addon 2',
        imageAsset: { id: 'asset-2', filepath: '/assets/two.png', url: '/assets/two.png' },
      } as never);
    });

    expect(result.current.imageAddonIds).toEqual(['addon-1', 'addon-2']);
    expect(result.current.imageAssets).toEqual([
      { id: 'asset-1', filepath: '/assets/one.png', url: '/assets/one.png' },
      { id: '/assets/two.png', filepath: '/assets/two.png', url: '/assets/two.png', filename: 'two.png' },
      { id: '/assets/one.png', filepath: '/assets/one.png', url: '/assets/one.png', filename: 'one.png' },
      { id: 'asset-2', filepath: '/assets/two.png', url: '/assets/two.png' },
    ]);

    act(() => {
      result.current.handleRemoveAddon('addon-1');
    });

    expect(result.current.imageAddonIds).toEqual(['addon-2']);
    expect(result.current.imageAssets).toEqual([
      { id: '/assets/two.png', filepath: '/assets/two.png', url: '/assets/two.png', filename: 'two.png' },
      { id: 'asset-2', filepath: '/assets/two.png', url: '/assets/two.png' },
    ]);
  });
});
