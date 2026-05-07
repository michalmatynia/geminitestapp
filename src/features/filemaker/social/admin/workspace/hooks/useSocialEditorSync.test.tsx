/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useSocialPublishingPostMock,
  useSocialPublishingImageAddonsMock,
  trackSocialPublishingClientEventMock,
  refetchImageAddonsMock,
} = vi.hoisted(() => ({
  useSocialPublishingPostMock: vi.fn(),
  useSocialPublishingImageAddonsMock: vi.fn(),
  trackSocialPublishingClientEventMock: vi.fn(),
  refetchImageAddonsMock: vi.fn(),
}));

vi.mock('@/features/filemaker/social/hooks/useSocialPublishingPosts', () => ({
  useSocialPublishingPost: (...args: unknown[]) => useSocialPublishingPostMock(...args),
}));

vi.mock('@/features/filemaker/social/hooks/useSocialPublishingImageAddons', () => ({
  useSocialPublishingImageAddons: (...args: unknown[]) => useSocialPublishingImageAddonsMock(...args),
}));

vi.mock('@/features/filemaker/social/client-observability', () => ({
  trackSocialPublishingClientEvent: (...args: unknown[]) => trackSocialPublishingClientEventMock(...args),

  isRecoverableSocialPublishingClientFetchError: vi.fn().mockReturnValue(false),}));

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

const latestAddonFixture = {
  id: 'addon-new',
  title: 'Latest game capture',
  presetId: 'game',
  playwrightCaptureRouteId: 'game',
  imageAsset: { id: 'asset-new', filepath: '/captures/game-new.png', url: '/captures/game-new.png' },
};

const staleAddonFixture = {
  id: 'addon-old',
  title: 'Old game capture',
  presetId: 'game',
  playwrightCaptureRouteId: 'game',
  imageAsset: { id: 'asset-old', filepath: '/captures/game-old.png', url: '/captures/game-old.png' },
};

describe('useSocialEditorSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const emptyResult = {
      data: null,
      isLoading: false,
      refetch: vi.fn(),
    };
    const selectedResult = {
      data: postFixture,
      isLoading: false,
      refetch: vi.fn(),
    };
    useSocialPublishingPostMock.mockImplementation((id: string | null) => ({
      ...(id === postFixture.id ? selectedResult : emptyResult),
    }));
    useSocialPublishingImageAddonsMock.mockReturnValue({
      data: [addonFixture],
      isFetching: false,
      refetch: refetchImageAddonsMock,
    });
  });

  it('loads the selected post detail and syncs editor state from it', async () => {
    const { result } = renderHook(() =>
      useSocialEditorSync({
        linkedinConnections: [{ id: 'conn-1' }],
        publishingConnectionId: 'conn-1',
        brainModelId: 'brain-1',
        visionModelId: 'vision-1',
      })
    );

    act(() => {
      result.current.setActivePostId('post-1');
    });

    await waitFor(() => expect(result.current.activePostId).toBe('post-1'));
    expect(useSocialPublishingImageAddonsMock).toHaveBeenNthCalledWith(1, {
      ids: [],
      enabled: false,
    });
    expect(useSocialPublishingImageAddonsMock).toHaveBeenLastCalledWith({
      ids: ['addon-1'],
      enabled: true,
    });

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
    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(trackSocialPublishingClientEventMock).toHaveBeenCalledWith('social_publishing_page_view', {
      hasActivePostSelection: false,
      hasPublishingIntegration: true,
      connectionCount: 1,
      brainModelId: 'brain-1',
      visionModelId: 'vision-1',
    });
  });

  it('merges images and add-ons through the local editor handlers', async () => {
    const { result } = renderHook(() =>
      useSocialEditorSync({
        linkedinConnections: [],
        publishingConnectionId: null,
        brainModelId: null,
        visionModelId: null,
      })
    );

    act(() => {
      result.current.setActivePostId('post-1');
    });

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
      { id: 'asset-2', filepath: '/assets/two.png', url: '/assets/two.png' },
    ]);

    act(() => {
      result.current.handleRemoveAddon('addon-1');
    });

    expect(result.current.imageAddonIds).toEqual(['addon-2']);
    expect(result.current.imageAssets).toEqual([
      { id: 'asset-2', filepath: '/assets/two.png', url: '/assets/two.png' },
    ]);
  });

  it('tracks unsaved changes for edited post fields and visuals', async () => {
    const { result } = renderHook(() =>
      useSocialEditorSync({
        linkedinConnections: [],
        publishingConnectionId: null,
        brainModelId: null,
        visionModelId: null,
      })
    );

    act(() => {
      result.current.setActivePostId('post-1');
    });

    await waitFor(() => expect(result.current.activePostId).toBe('post-1'));

    expect(result.current.hasUnsavedChanges).toBe(false);

    act(() => {
      result.current.setEditorState((prev) => ({
        ...prev,
        titlePl: 'Updated Polish title',
      }));
    });

    expect(result.current.hasUnsavedChanges).toBe(true);

    act(() => {
      result.current.setEditorState((prev) => ({
        ...prev,
        titlePl: postFixture.titlePl,
      }));
    });

    expect(result.current.hasUnsavedChanges).toBe(false);

    act(() => {
      result.current.handleAddImages(['/assets/two.png']);
    });

    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('resolves stale standalone addon assets to the latest selected capture without marking the draft dirty', async () => {
    const staleSelectedPost = {
      ...postFixture,
      imageAddonIds: ['addon-old', 'addon-new'],
      imageAssets: [
        staleAddonFixture.imageAsset,
        { id: 'manual-1', filepath: '/manual/custom.png', url: '/manual/custom.png' },
      ],
    };
    const emptyResult = {
      data: null,
      isLoading: false,
      refetch: vi.fn(),
    };
    const selectedResult = {
      data: staleSelectedPost,
      isLoading: false,
      refetch: vi.fn(),
    };
    useSocialPublishingPostMock.mockImplementation((id: string | null) => ({
      ...(id === postFixture.id ? selectedResult : emptyResult),
    }));
    useSocialPublishingImageAddonsMock.mockReturnValue({
      data: [latestAddonFixture, staleAddonFixture],
    });

    const { result } = renderHook(() =>
      useSocialEditorSync({
        linkedinConnections: [],
        publishingConnectionId: null,
        brainModelId: null,
        visionModelId: null,
      })
    );

    act(() => {
      result.current.setActivePostId('post-1');
    });

    await waitFor(() => expect(result.current.activePostId).toBe('post-1'));

    expect(result.current.imageAddonIds).toEqual(['addon-new']);
    expect(result.current.imageAssets).toEqual([
      latestAddonFixture.imageAsset,
      { id: 'manual-1', filepath: '/manual/custom.png', url: '/manual/custom.png' },
    ]);
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('keeps missing selected add-ons requested and lets the editor clear them', async () => {
    const missingAddonPost = {
      ...postFixture,
      imageAddonIds: ['addon-missing'],
    };
    const emptyResult = {
      data: null,
      isLoading: false,
      refetch: vi.fn(),
    };
    const selectedResult = {
      data: missingAddonPost,
      isLoading: false,
      refetch: vi.fn(),
    };
    useSocialPublishingPostMock.mockImplementation((id: string | null) => ({
      ...(id === postFixture.id ? selectedResult : emptyResult),
    }));
    useSocialPublishingImageAddonsMock.mockReturnValue({
      data: [],
      isFetching: false,
      refetch: refetchImageAddonsMock,
    });

    const { result } = renderHook(() =>
      useSocialEditorSync({
        linkedinConnections: [],
        publishingConnectionId: null,
        brainModelId: null,
        visionModelId: null,
      })
    );

    act(() => {
      result.current.setActivePostId('post-1');
    });

    await waitFor(() => expect(result.current.activePostId).toBe('post-1'));

    expect(useSocialPublishingImageAddonsMock).toHaveBeenLastCalledWith({
      ids: ['addon-missing'],
      enabled: true,
    });
    expect(result.current.missingSelectedImageAddonIds).toEqual(['addon-missing']);

    act(() => {
      result.current.handleRemoveMissingAddons();
    });

    expect(result.current.imageAddonIds).toEqual([]);
    expect(result.current.missingSelectedImageAddonIds).toEqual([]);
    expect(useSocialPublishingImageAddonsMock).toHaveBeenLastCalledWith({
      ids: [],
      enabled: false,
    });
  });
});
