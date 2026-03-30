/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useKangurSocialPostsMock,
  useKangurSocialImageAddonsMock,
  trackKangurClientEventMock,
  refetchImageAddonsMock,
} = vi.hoisted(() => ({
  useKangurSocialPostsMock: vi.fn(),
  useKangurSocialImageAddonsMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
  refetchImageAddonsMock: vi.fn(),
}));

vi.mock('@/features/kangur/social/hooks/useKangurSocialPosts', () => ({
  useKangurSocialPosts: (...args: unknown[]) => useKangurSocialPostsMock(...args),
}));

vi.mock('@/features/kangur/social/hooks/useKangurSocialImageAddons', () => ({
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
    useKangurSocialPostsMock.mockReturnValue({
      data: [postFixture],
      isLoading: false,
    });
    useKangurSocialImageAddonsMock.mockReturnValue({
      data: [addonFixture],
      isFetching: false,
      refetch: refetchImageAddonsMock,
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
    expect(useKangurSocialImageAddonsMock).toHaveBeenLastCalledWith({ ids: ['addon-1'] });

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
    useKangurSocialPostsMock.mockReturnValue({
      data: [
        {
          ...postFixture,
          imageAddonIds: ['addon-old', 'addon-new'],
          imageAssets: [
            staleAddonFixture.imageAsset,
            { id: 'manual-1', filepath: '/manual/custom.png', url: '/manual/custom.png' },
          ],
        },
      ],
      isLoading: false,
    });
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

    await waitFor(() => expect(result.current.activePostId).toBe('post-1'));

    expect(result.current.imageAddonIds).toEqual(['addon-new']);
    expect(result.current.imageAssets).toEqual([
      latestAddonFixture.imageAsset,
      { id: 'manual-1', filepath: '/manual/custom.png', url: '/manual/custom.png' },
    ]);
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('keeps missing selected add-ons requested and lets the editor clear them', async () => {
    useKangurSocialPostsMock.mockReturnValue({
      data: [
        {
          ...postFixture,
          imageAddonIds: ['addon-missing'],
        },
      ],
      isLoading: false,
    });
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

    await waitFor(() => expect(result.current.activePostId).toBe('post-1'));

    expect(useKangurSocialImageAddonsMock).toHaveBeenLastCalledWith({ ids: ['addon-missing'] });
    expect(result.current.missingSelectedImageAddonIds).toEqual(['addon-missing']);

    act(() => {
      result.current.handleRemoveMissingAddons();
    });

    expect(result.current.imageAddonIds).toEqual([]);
    expect(result.current.missingSelectedImageAddonIds).toEqual([]);
    expect(useKangurSocialImageAddonsMock).toHaveBeenLastCalledWith({ ids: [] });
  });
});
