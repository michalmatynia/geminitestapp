import type { ImageFileSelection } from '@/shared/contracts/files';
import type { SocialPublishingImageAddon } from '@/shared/contracts/social-publishing-image-addons';
import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';

import {
  buildImageSelection,
  formatDatetimeLocal,
  mergeImageAssets,
  type EditorState,
} from '../SocialPublishingPage.Constants';
import {
  mergeSocialPostSelectedAddons,
  removeSocialPostSelectedAddon,
  resolveSocialPostImageState,
  type ResolvedSocialPostImageState,
} from '../social-post-image-assets';

export type SocialEditorImageStateUpdate = {
  imageAssets: ImageFileSelection[];
  imageAddonIds: string[];
};

type ResolveRequestedAddonIdsInput = {
  activePost: SocialPublishingPost | null;
  draftImageAddonIds: string[];
  hydratedDraftPostId: string | null;
};

type ResolveUnsavedChangesInput = {
  activePost: SocialPublishingPost | null;
  activePostImageState: ResolvedSocialPostImageState;
  editorState: EditorState;
  imageAddonIds: string[];
  imageAssets: ImageFileSelection[];
  scheduledAt: string;
};

const isNonEmptyString = (value: string): boolean => value.trim().length > 0;

const resolveFirstPresentString = (
  values: Array<string | null | undefined>
): string | null => {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return null;
};

const normalizeHydratedImageAsset = (
  asset: ImageFileSelection,
  index: number
): ImageFileSelection => ({
  ...asset,
  id: resolveFirstPresentString([asset.id, asset.filepath, asset.url]) ?? `image-${index}`,
});

const buildImageAssetSignature = (
  assets: Array<Partial<ImageFileSelection> | null | undefined>
): string =>
  assets
    .map((asset, index) =>
      asset === null || asset === undefined
        ? `image-${index}`
        : resolveFirstPresentString([asset.id, asset.filepath, asset.url]) ?? `image-${index}`
    )
    .sort()
    .join('|');

const buildStringArraySignature = (values: string[] | null | undefined): string =>
  (values ?? [])
    .filter((value) => isNonEmptyString(value))
    .slice()
    .sort()
    .join('|');

const toImageStateUpdate = (
  state: ResolvedSocialPostImageState
): SocialEditorImageStateUpdate => ({
  imageAssets: state.imageAssets,
  imageAddonIds: state.imageAddonIds,
});

const doesImageAssetMatchId = (asset: ImageFileSelection, id: string): boolean =>
  asset.id === id || asset.filepath === id || asset.url === id;

const doesAddonImageMatchId = (addon: SocialPublishingImageAddon, id: string): boolean =>
  doesImageAssetMatchId(addon.imageAsset, id);

export const resolveDocReferencesFromInput = (docReferenceInput: string): string[] =>
  docReferenceInput
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

export const resolvePosts = (
  activePost: SocialPublishingPost | null
): SocialPublishingPost[] => (activePost === null ? [] : [activePost]);

export const resolveRequestedAddonIds = ({
  activePost,
  draftImageAddonIds,
  hydratedDraftPostId,
}: ResolveRequestedAddonIdsInput): string[] => {
  const candidateIds =
    activePost !== null && hydratedDraftPostId === activePost.id
      ? draftImageAddonIds
      : activePost?.imageAddonIds ?? [];
  return Array.from(new Set(candidateIds.map((value) => value.trim()).filter(isNonEmptyString)));
};

export const resolvePostEditorState = (activePost: SocialPublishingPost): EditorState => ({
  titlePl: activePost.titlePl,
  titleEn: activePost.titleEn,
  bodyPl: activePost.bodyPl,
  bodyEn: activePost.bodyEn,
});

export const resolvePostImageAssets = (
  activePost: SocialPublishingPost
): ImageFileSelection[] =>
  activePost.imageAssets.map((asset, index) => normalizeHydratedImageAsset(asset, index));

export const resolveAddImagesUpdate = ({
  draftImageAddonIds,
  draftImageAssets,
  filepaths,
}: {
  draftImageAddonIds: string[];
  draftImageAssets: ImageFileSelection[];
  filepaths: string[];
}): SocialEditorImageStateUpdate | null => {
  const nextAssets = filepaths
    .filter((filepath) => isNonEmptyString(filepath))
    .map((filepath) => buildImageSelection(filepath));
  if (nextAssets.length === 0) {
    return null;
  }
  return {
    imageAddonIds: draftImageAddonIds,
    imageAssets: mergeImageAssets(draftImageAssets, nextAssets),
  };
};

export const resolveRemoveImageUpdate = ({
  draftImageAddonIds,
  draftImageAssets,
  id,
  recentAddons,
  resolvedImageState,
}: {
  draftImageAddonIds: string[];
  draftImageAssets: ImageFileSelection[];
  id: string;
  recentAddons: SocialPublishingImageAddon[];
  resolvedImageState: ResolvedSocialPostImageState;
}): SocialEditorImageStateUpdate => {
  const matchedAddon = resolvedImageState.latestSelectedAddons.find((addon) =>
    doesAddonImageMatchId(addon, id)
  );
  if (matchedAddon !== undefined) {
    return toImageStateUpdate(
      removeSocialPostSelectedAddon({
        imageAssets: draftImageAssets,
        imageAddonIds: draftImageAddonIds,
        recentAddons,
        addonId: matchedAddon.id,
      })
    );
  }
  return {
    imageAddonIds: draftImageAddonIds,
    imageAssets: draftImageAssets.filter((asset) => !doesImageAssetMatchId(asset, id)),
  };
};

export const resolveSelectAddonsUpdate = ({
  draftImageAddonIds,
  draftImageAssets,
  nextAddons,
  recentAddons,
}: {
  draftImageAddonIds: string[];
  draftImageAssets: ImageFileSelection[];
  nextAddons: SocialPublishingImageAddon[];
  recentAddons: SocialPublishingImageAddon[];
}): SocialEditorImageStateUpdate | null => {
  if (nextAddons.length === 0) {
    return null;
  }
  return toImageStateUpdate(
    mergeSocialPostSelectedAddons({
      imageAssets: draftImageAssets,
      imageAddonIds: draftImageAddonIds,
      recentAddons,
      nextAddons,
    })
  );
};

export const resolveRemoveAddonUpdate = ({
  addonId,
  draftImageAddonIds,
  draftImageAssets,
  recentAddons,
}: {
  addonId: string;
  draftImageAddonIds: string[];
  draftImageAssets: ImageFileSelection[];
  recentAddons: SocialPublishingImageAddon[];
}): SocialEditorImageStateUpdate =>
  toImageStateUpdate(
    removeSocialPostSelectedAddon({
      imageAssets: draftImageAssets,
      imageAddonIds: draftImageAddonIds,
      recentAddons,
      addonId,
    })
  );

export const resolveRemoveMissingAddonsUpdate = ({
  draftImageAddonIds,
  draftImageAssets,
  missingSelectedImageAddonIds,
  recentAddons,
}: {
  draftImageAddonIds: string[];
  draftImageAssets: ImageFileSelection[];
  missingSelectedImageAddonIds: string[];
  recentAddons: SocialPublishingImageAddon[];
}): SocialEditorImageStateUpdate | null => {
  if (missingSelectedImageAddonIds.length === 0) {
    return null;
  }

  const missingAddonIdSet = new Set(missingSelectedImageAddonIds);
  return toImageStateUpdate(
    resolveSocialPostImageState({
      imageAssets: draftImageAssets,
      imageAddonIds: draftImageAddonIds.filter((addonId) => !missingAddonIdSet.has(addonId)),
      recentAddons,
    })
  );
};

const isEditorContentDirty = ({
  activePost,
  editorState,
}: ResolveUnsavedChangesInput & {
  activePost: SocialPublishingPost;
}): boolean =>
  editorState.titlePl !== activePost.titlePl ||
  editorState.titleEn !== activePost.titleEn ||
  editorState.bodyPl !== activePost.bodyPl ||
  editorState.bodyEn !== activePost.bodyEn;

const isEditorVisualStateDirty = ({
  activePostImageState,
  imageAddonIds,
  imageAssets,
}: ResolveUnsavedChangesInput): boolean =>
  buildStringArraySignature(imageAddonIds) !==
    buildStringArraySignature(activePostImageState.imageAddonIds) ||
  buildImageAssetSignature(imageAssets) !==
    buildImageAssetSignature(activePostImageState.imageAssets);

export const resolveEditorHasUnsavedChanges = (
  input: ResolveUnsavedChangesInput
): boolean => {
  if (input.activePost === null) {
    return false;
  }
  return (
    isEditorContentDirty({ ...input, activePost: input.activePost }) ||
    input.scheduledAt !== formatDatetimeLocal(input.activePost.scheduledAt) ||
    isEditorVisualStateDirty(input)
  );
};
