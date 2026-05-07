import { describe, expect, it } from 'vitest';

import {
  mergeSocialPostSelectedAddons,
  removeSocialPostSelectedAddon,
  resolveSocialPostImageState,
} from './social-post-image-assets';

const oldAddon = {
  id: 'addon-old',
  title: 'Old game capture',
  presetId: 'game',
  playwrightCaptureRouteId: 'game',
  imageAsset: {
    id: 'asset-old',
    url: '/captures/game-old.png',
    filepath: '/captures/game-old.png',
  },
};

const latestAddon = {
  id: 'addon-new',
  title: 'Latest game capture',
  presetId: 'game',
  playwrightCaptureRouteId: 'game',
  imageAsset: {
    id: 'asset-new',
    url: '/captures/game-new.png',
    filepath: '/captures/game-new.png',
  },
};

const manualAsset = {
  id: 'manual-1',
  url: '/manual/custom.png',
  filepath: '/manual/custom.png',
};

describe('social-post-image-assets', () => {
  it('resolves only the latest selected addon asset for a capture slot and preserves manual images', () => {
    const result = resolveSocialPostImageState({
      imageAddonIds: ['addon-old', 'addon-new'],
      imageAssets: [oldAddon.imageAsset, manualAsset],
      recentAddons: [latestAddon as never, oldAddon as never],
    });

    expect(result.imageAddonIds).toEqual(['addon-new']);
    expect(result.imageAssets).toEqual([latestAddon.imageAsset, manualAsset]);
    expect(result.manualImageAssets).toEqual([manualAsset]);
  });

  it('replaces older selected add-ons when new captures arrive for the same route', () => {
    const result = mergeSocialPostSelectedAddons({
      imageAddonIds: ['addon-old'],
      imageAssets: [oldAddon.imageAsset, manualAsset],
      recentAddons: [latestAddon as never, oldAddon as never],
      nextAddons: [latestAddon as never],
    });

    expect(result.imageAddonIds).toEqual(['addon-new']);
    expect(result.imageAssets).toEqual([latestAddon.imageAsset, manualAsset]);
  });

  it('removes stale addon-derived assets for a capture slot when that slot is removed', () => {
    const result = removeSocialPostSelectedAddon({
      addonId: 'addon-new',
      imageAddonIds: ['addon-old', 'addon-new'],
      imageAssets: [oldAddon.imageAsset, latestAddon.imageAsset, manualAsset],
      recentAddons: [latestAddon as never, oldAddon as never],
    });

    expect(result.imageAddonIds).toEqual([]);
    expect(result.imageAssets).toEqual([manualAsset]);
  });
});
