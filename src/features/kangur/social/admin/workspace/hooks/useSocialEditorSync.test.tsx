/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useKangurSocialPostMock,
  useKangurSocialImageAddonsMock,
  trackKangurClientEventMock,
  refetchImageAddonsMock,
} = vi.hoisted(() => ({
  useKangurSocialPostMock: vi.fn(),
  useKangurSocialImageAddonsMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
  refetchImageAddonsMock: vi.fn(),
}));

vi.mock('@/features/kangur/social/hooks/useKangurSocialPosts', () => ({
  useKangurSocialPost: (...args: unknown[]) => useKangurSocialPostMock(...args),
}));

vi.mock('@/features/kangur/social/hooks/useKangurSocialImageAddons', () => ({
  useKangurSocialImageAddons: (...args: unknown[]) => useKangurSocialImageAddonsMock(...args),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  trackKangurClientEvent: (...args: unknown[]) => trackKangurClientEventMock(...args),

  isRecoverableKangurClientFetchError: vi.fn().mockReturnValue(false),}));

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
    useKangurSocialPostMock.mockImplementation((id: string | null) => ({
      ...(id === postFixture.id ? selectedResult : emptyResult),
    }));
    useKangurSocialImageAddonsMock.mockReturnValue({
      data: [addonFixture],
      isFetching: false,
      refetch: refetchImageAddonsMock,
    });
  });

  it('loads the selected post detail and syncs editor state from it', async () => {
    const { result } = renderHook(() =>
      useSocialEditorSync({
        linkedinConnections: [{ id: 'conn-1' }],
        linkedinConnectionId: 'conn-1',
        brainModelId: 'brain-1',
        visionModelId: 'vision-1',
      })
    );

    act(() => {
      result.current.setActivePostId('post-1');
    });

    await waitFor(() => expect(result.current.activePostId).toBe('post-1'));
    expect(useKangurSocialImageAddonsMock).toHaveBeenNthCalledWith(1, {
      ids: [],
      enabled: false,
    });
    expect(useKangurSocialImageAddonsMock).toHaveBeenLastCalledWith({
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
    expect(trackKangurClientEventMock).toHaveBeenCalledWith('kangur_social_page_view', {
      hasActivePostSelection: false,
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
        linkedinConnectionId: null,
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
    useKangurSocialPostMock.mockImplementation((id: string | null) => ({
      ...(id === postFixture.id ? selectedResult : emptyResult),
    }));
    useKangurSocialImageAddonsMock.mockReturnValue({
      data: [latestAddonFixture, staleAddonFixture],
    });

    const { result } = renderHook(() =>
      useSocialEditorSync({
        linkedinConnections: [],
        linkedinConnectionId: null,
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
    useKangurSocialPostMock.mockImplementation((id: string | null) => ({
      ...(id === postFixture.id ? selectedResult : emptyResult),
    }));
    useKangurSocialImageAddonsMock.mockReturnValue({
      data: [],
      isFetching: false,
      refetch: refetchImageAddonsMock,
    });

    const { result } = renderHook(() =>
      useSocialEditorSync({
        linkedinConnections: [],
        linkedinConnectionId: null,
        brainModelId: null,
        visionModelId: null,
      })
    );

    act(() => {
      result.current.setActivePostId('post-1');
    });

    await waitFor(() => expect(result.current.activePostId).toBe('post-1'));

    expect(useKangurSocialImageAddonsMock).toHaveBeenLastCalledWith({
      ids: ['addon-missing'],
      enabled: true,
    });
    expect(result.current.missingSelectedImageAddonIds).toEqual(['addon-missing']);

    act(() => {
      result.current.handleRemoveMissingAddons();
    });

    expect(result.current.imageAddonIds).toEqual([]);
    expect(result.current.missingSelectedImageAddonIds).toEqual([]);
    expect(useKangurSocialImageAddonsMock).toHaveBeenLastCalledWith({
      ids: [],
      enabled: false,
    });
  });
});
