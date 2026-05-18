import { useMemo } from 'react';

import { useSocialPublishingImageAddons } from '@/features/filemaker/social/hooks/useSocialPublishingImageAddons';
import type { SocialPublishingImageAddon } from '@/shared/contracts/social-publishing-image-addons';
import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';

import { resolveSocialPostImageState } from '../social-post-image-assets';
import {
  resolveAddImagesUpdate,
  resolveRemoveAddonUpdate,
  resolveRemoveImageUpdate,
  resolveRemoveMissingAddonsUpdate,
  resolveRequestedAddonIds,
  resolveSelectAddonsUpdate,
  type SocialEditorImageStateUpdate,
} from './useSocialEditorSync.runtime';
import type { SocialEditorLocalState } from './useSocialEditorSync.state';
import type { SocialEditorImageHandlers } from './useSocialEditorSync.types';

type SocialEditorImagesParams = Pick<
  SocialEditorLocalState,
  | 'draftImageAddonIds'
  | 'draftImageAssets'
  | 'hydratedDraftPostId'
  | 'setDraftImageAddonIds'
  | 'setDraftImageAssets'
> & {
  activePost: SocialPublishingPost | null;
};

type ResolvedImageStates = {
  activePostImageState: ReturnType<typeof resolveSocialPostImageState>;
  resolvedImageState: ReturnType<typeof resolveSocialPostImageState>;
};

export type SocialEditorImagesState = SocialEditorImageHandlers & {
  activePostImageState: ReturnType<typeof resolveSocialPostImageState>;
  addonsQuery: ReturnType<typeof useSocialPublishingImageAddons>;
  imageAddonIds: string[];
  imageAssets: ReturnType<typeof resolveSocialPostImageState>['imageAssets'];
  missingSelectedImageAddonIds: string[];
  recentAddons: SocialPublishingImageAddon[];
};

const applyImageStateUpdate = ({
  setDraftImageAddonIds,
  setDraftImageAssets,
  update,
}: Pick<SocialEditorImagesParams, 'setDraftImageAddonIds' | 'setDraftImageAssets'> & {
  update: SocialEditorImageStateUpdate;
}): void => {
  setDraftImageAddonIds(update.imageAddonIds);
  setDraftImageAssets(update.imageAssets);
};

const useRequestedImageAddons = (
  params: SocialEditorImagesParams
): {
  addonsQuery: ReturnType<typeof useSocialPublishingImageAddons>;
  recentAddons: SocialPublishingImageAddon[];
} => {
  const requestedAddonIds = useMemo(
    () =>
      resolveRequestedAddonIds({
        activePost: params.activePost,
        draftImageAddonIds: params.draftImageAddonIds,
        hydratedDraftPostId: params.hydratedDraftPostId,
      }),
    [params.activePost, params.draftImageAddonIds, params.hydratedDraftPostId]
  );
  const addonsQuery = useSocialPublishingImageAddons({
    ids: requestedAddonIds,
    enabled: requestedAddonIds.length > 0,
  });

  return {
    addonsQuery,
    recentAddons: addonsQuery.data ?? [],
  };
};

const useResolvedImageStates = ({
  params,
  recentAddons,
}: {
  params: SocialEditorImagesParams;
  recentAddons: SocialPublishingImageAddon[];
}): ResolvedImageStates => {
  const resolvedImageState = useMemo(
    () =>
      resolveSocialPostImageState({
        imageAssets: params.draftImageAssets,
        imageAddonIds: params.draftImageAddonIds,
        recentAddons,
      }),
    [params.draftImageAddonIds, params.draftImageAssets, recentAddons]
  );
  const activePostImageState = useMemo(
    () =>
      resolveSocialPostImageState({
        imageAssets: params.activePost?.imageAssets ?? [],
        imageAddonIds: params.activePost?.imageAddonIds ?? [],
        recentAddons,
      }),
    [params.activePost, recentAddons]
  );

  return { activePostImageState, resolvedImageState };
};

const createSocialEditorImageHandlers = ({
  params,
  recentAddons,
  resolvedImageState,
}: {
  params: SocialEditorImagesParams;
  recentAddons: SocialPublishingImageAddon[];
  resolvedImageState: ReturnType<typeof resolveSocialPostImageState>;
}): SocialEditorImageHandlers => {
  const applyUpdate = (update: SocialEditorImageStateUpdate | null): void => {
    if (update === null) {
      return;
    }
    applyImageStateUpdate({ ...params, update });
  };

  return {
    handleAddImages: (filepaths) =>
      applyUpdate(resolveAddImagesUpdate({ ...params, filepaths })),
    handleRemoveImage: (id) =>
      applyUpdate(resolveRemoveImageUpdate({ ...params, id, recentAddons, resolvedImageState })),
    handleSelectAddon: (addon) =>
      applyUpdate(resolveSelectAddonsUpdate({ ...params, nextAddons: [addon], recentAddons })),
    handleSelectAddons: (addons) =>
      applyUpdate(resolveSelectAddonsUpdate({ ...params, nextAddons: addons, recentAddons })),
    handleRemoveAddon: (addonId) =>
      applyUpdate(resolveRemoveAddonUpdate({ ...params, addonId, recentAddons })),
    handleRemoveMissingAddons: () =>
      applyUpdate(
        resolveRemoveMissingAddonsUpdate({
          ...params,
          missingSelectedImageAddonIds: resolvedImageState.missingSelectedImageAddonIds,
          recentAddons,
        })
      ),
  };
};

export const useSocialEditorImages = (
  params: SocialEditorImagesParams
): SocialEditorImagesState => {
  const { addonsQuery, recentAddons } = useRequestedImageAddons(params);
  const { activePostImageState, resolvedImageState } = useResolvedImageStates({
    params,
    recentAddons,
  });
  const handlers = createSocialEditorImageHandlers({
    params,
    recentAddons,
    resolvedImageState,
  });

  return {
    activePostImageState,
    addonsQuery,
    imageAddonIds: resolvedImageState.imageAddonIds,
    imageAssets: resolvedImageState.imageAssets,
    missingSelectedImageAddonIds: resolvedImageState.missingSelectedImageAddonIds,
    recentAddons,
    ...handlers,
  };
};
