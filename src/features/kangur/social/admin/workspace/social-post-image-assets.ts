import type { ImageFileSelection } from '@/shared/contracts/files';
import type { KangurSocialImageAddon } from '@/shared/contracts/kangur-social-image-addons';

import { matchesImageAsset, mergeImageAssets } from './AdminKangurSocialPage.Constants';

type ResolveSocialPostImageStateInput = {
  imageAssets: ImageFileSelection[];
  imageAddonIds: string[];
  recentAddons: KangurSocialImageAddon[];
};

type UpdateSocialPostSelectedAddonsInput = ResolveSocialPostImageStateInput & {
  nextAddons: KangurSocialImageAddon[];
};

type RemoveSocialPostSelectedAddonInput = ResolveSocialPostImageStateInput & {
  addonId: string;
};

export type ResolvedSocialPostImageState = {
  imageAssets: ImageFileSelection[];
  imageAddonIds: string[];
  manualImageAssets: ImageFileSelection[];
  latestSelectedAddons: KangurSocialImageAddon[];
  missingSelectedImageAddonIds: string[];
};

const normalizeImageAsset = (
  asset: ImageFileSelection,
  index: number
): ImageFileSelection => ({
  ...asset,
  id: asset.id || asset.filepath || asset.url || `image-${index}`,
});

const normalizeImageAssets = (assets: ImageFileSelection[]): ImageFileSelection[] =>
  assets.map((asset, index) => normalizeImageAsset(asset, index));

const normalizeImageAddonIds = (imageAddonIds: string[]): string[] =>
  imageAddonIds
    .map((value) => value.trim())
    .filter(Boolean);

const buildRecentAddonMap = (
  recentAddons: KangurSocialImageAddon[]
): Map<string, KangurSocialImageAddon> =>
  new Map(
    recentAddons
      .filter((addon) => Boolean(addon.id?.trim()))
      .map((addon) => [addon.id.trim(), addon])
  );

export const getSocialPostImageAddonCaptureKey = (
  addon: Pick<
    KangurSocialImageAddon,
    'id' | 'playwrightCaptureRouteId' | 'presetId'
  >
): string =>
  addon.playwrightCaptureRouteId?.trim() || addon.presetId?.trim() || addon.id.trim();

export const resolveSocialPostImageState = ({
  imageAssets,
  imageAddonIds,
  recentAddons,
}: ResolveSocialPostImageStateInput): ResolvedSocialPostImageState => {
  const normalizedImageAssets = normalizeImageAssets(imageAssets);
  const normalizedImageAddonIds = normalizeImageAddonIds(imageAddonIds);
  const recentAddonMap = buildRecentAddonMap(recentAddons);
  const selectedImageAddonIdSet = new Set(normalizedImageAddonIds);
  const missingSelectedImageAddonIds = normalizedImageAddonIds.filter(
    (addonId) => !recentAddonMap.has(addonId)
  );
  const latestSelectedAddons: KangurSocialImageAddon[] = [];
  const seenCaptureKeys = new Set<string>();

  recentAddons.forEach((addon) => {
    if (!selectedImageAddonIdSet.has(addon.id)) {
      return;
    }

    const captureKey = getSocialPostImageAddonCaptureKey(addon);
    if (seenCaptureKeys.has(captureKey)) {
      return;
    }

    seenCaptureKeys.add(captureKey);
    latestSelectedAddons.push(addon);
  });

  const selectedCaptureKeys = new Set(
    latestSelectedAddons.map((addon) => getSocialPostImageAddonCaptureKey(addon))
  );
  const selectedCaptureAssets = recentAddons
    .filter((addon) => selectedCaptureKeys.has(getSocialPostImageAddonCaptureKey(addon)))
    .map((addon) => addon.imageAsset)
    .filter((asset): asset is ImageFileSelection => Boolean(asset))
    .map((asset, index) => normalizeImageAsset(asset, index));

  const manualImageAssets = normalizedImageAssets.filter(
    (asset) => !selectedCaptureAssets.some((addonAsset) => matchesImageAsset(asset, addonAsset))
  );
  const latestSelectedAddonAssets = latestSelectedAddons
    .map((addon) => addon.imageAsset)
    .filter((asset): asset is ImageFileSelection => Boolean(asset))
    .map((asset, index) => normalizeImageAsset(asset, index));

  return {
    imageAssets: mergeImageAssets(latestSelectedAddonAssets, manualImageAssets),
    imageAddonIds: [
      ...latestSelectedAddons.map((addon) => addon.id),
      ...missingSelectedImageAddonIds,
    ],
    manualImageAssets,
    latestSelectedAddons,
    missingSelectedImageAddonIds,
  };
};

export const mergeSocialPostSelectedAddons = ({
  imageAssets,
  imageAddonIds,
  recentAddons,
  nextAddons,
}: UpdateSocialPostSelectedAddonsInput): ResolvedSocialPostImageState => {
  if (nextAddons.length === 0) {
    return resolveSocialPostImageState({ imageAssets, imageAddonIds, recentAddons });
  }

  const replacementCaptureKeys = new Set(
    nextAddons.map((addon) => getSocialPostImageAddonCaptureKey(addon))
  );
  const recentAddonMap = buildRecentAddonMap(recentAddons);
  const nextImageAddonIds = normalizeImageAddonIds(imageAddonIds).filter((addonId) => {
    const addon = recentAddonMap.get(addonId);
    if (!addon) {
      return true;
    }
    return !replacementCaptureKeys.has(getSocialPostImageAddonCaptureKey(addon));
  });
  const removableAssets = recentAddons
    .filter((addon) => replacementCaptureKeys.has(getSocialPostImageAddonCaptureKey(addon)))
    .map((addon) => addon.imageAsset)
    .filter((asset): asset is ImageFileSelection => Boolean(asset))
    .map((asset, index) => normalizeImageAsset(asset, index));
  const nextImageAssets = normalizeImageAssets(imageAssets).filter(
    (asset) => !removableAssets.some((candidate) => matchesImageAsset(asset, candidate))
  );

  return resolveSocialPostImageState({
    imageAddonIds: [...nextImageAddonIds, ...nextAddons.map((addon) => addon.id)],
    imageAssets: mergeImageAssets(
      nextImageAssets,
      nextAddons
        .map((addon) => addon.imageAsset)
        .filter((asset): asset is ImageFileSelection => Boolean(asset))
    ),
    recentAddons,
  });
};

export const removeSocialPostSelectedAddon = ({
  imageAssets,
  imageAddonIds,
  recentAddons,
  addonId,
}: RemoveSocialPostSelectedAddonInput): ResolvedSocialPostImageState => {
  const normalizedAddonId = addonId.trim();
  if (!normalizedAddonId) {
    return resolveSocialPostImageState({ imageAssets, imageAddonIds, recentAddons });
  }

  const recentAddonMap = buildRecentAddonMap(recentAddons);
  const addon = recentAddonMap.get(normalizedAddonId);
  if (!addon) {
    return resolveSocialPostImageState({
      imageAssets,
      imageAddonIds: normalizeImageAddonIds(imageAddonIds).filter(
        (currentAddonId) => currentAddonId !== normalizedAddonId
      ),
      recentAddons,
    });
  }

  const targetCaptureKey = getSocialPostImageAddonCaptureKey(addon);
  const removableAddonIds = new Set(
    recentAddons
      .filter((entry) => getSocialPostImageAddonCaptureKey(entry) === targetCaptureKey)
      .map((entry) => entry.id)
  );
  const removableAssets = recentAddons
    .filter((entry) => getSocialPostImageAddonCaptureKey(entry) === targetCaptureKey)
    .map((entry) => entry.imageAsset)
    .filter((asset): asset is ImageFileSelection => Boolean(asset))
    .map((asset, index) => normalizeImageAsset(asset, index));

  return resolveSocialPostImageState({
    imageAddonIds: normalizeImageAddonIds(imageAddonIds).filter(
      (currentAddonId) => !removableAddonIds.has(currentAddonId)
    ),
    imageAssets: normalizeImageAssets(imageAssets).filter(
      (asset) => !removableAssets.some((candidate) => matchesImageAsset(asset, candidate))
    ),
    recentAddons,
  });
};
