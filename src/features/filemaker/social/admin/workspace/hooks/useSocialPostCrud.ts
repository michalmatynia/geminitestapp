'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  useDeleteSocialPublishingPost,
  usePatchSocialPublishingPost,
  usePublishSocialPublishingPost,
  useSaveSocialPublishingPost,
  useUnpublishSocialPublishingPost,
} from '@/features/filemaker/social/hooks/useSocialPublishingPosts';
import { useToast } from '@/shared/ui';

import {
  recoverRefreshedSocialPost,
  syncSocialPostInCache,
} from './useSocialPostCrud.cache';
import { createSocialPostDraftHandler } from './useSocialPostCrud.create';
import { createSocialPostDeleteHandler } from './useSocialPostCrud.delete';
import { createSocialPostPublishHandler, createSocialPostQuickPublishHandler } from './useSocialPostCrud.publish';
import { buildValidatedPostUpdates as buildValidatedPostUpdatesRuntime } from './useSocialPostCrud.runtime';
import type {
  BuildValidatedPostUpdates,
  SocialPostCrudCache,
  SocialPostCrudDeps,
  SocialPostCrudMutations,
  SocialPostCrudResult,
  SocialPostCrudState,
} from './useSocialPostCrud.types';
import { createSocialPostSaveHandler } from './useSocialPostCrud.save';
import { createSocialPostUnpublishHandler } from './useSocialPostCrud.unpublish';

type SocialPostCrudHandlers = Pick<
  SocialPostCrudResult,
  | 'clearDeleteError'
  | 'handleCreateDraft'
  | 'handleDeletePost'
  | 'handleQuickPublishPost'
  | 'handleUnpublishPost'
  | 'handleSave'
  | 'handlePublish'
>;

const buildSocialPostCrudResult = ({
  mutations,
  state,
  handlers,
}: {
  mutations: SocialPostCrudMutations;
  state: SocialPostCrudState;
  handlers: SocialPostCrudHandlers;
}): SocialPostCrudResult => ({
  ...mutations,
  deleteError: state.deleteError,
  publishingPostId: state.publishingPostId,
  unpublishingPostId: state.unpublishingPostId,
  ...handlers,
});

const useSocialPostCrudMutations = (): SocialPostCrudMutations => ({
  saveMutation: useSaveSocialPublishingPost(),
  patchMutation: usePatchSocialPublishingPost(),
  deleteMutation: useDeleteSocialPublishingPost(),
  publishMutation: usePublishSocialPublishingPost(),
  unpublishMutation: useUnpublishSocialPublishingPost(),
});

const useSocialPostCrudState = (): SocialPostCrudState => {
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [publishingPostId, setPublishingPostId] = useState<string | null>(null);
  const [unpublishingPostId, setUnpublishingPostId] = useState<string | null>(null);

  return {
    deleteError,
    setDeleteError,
    publishingPostId,
    setPublishingPostId,
    unpublishingPostId,
    setUnpublishingPostId,
  };
};

export function useSocialPostCrud(deps: SocialPostCrudDeps): SocialPostCrudResult {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mutations = useSocialPostCrudMutations();
  const state = useSocialPostCrudState();
  const cache: SocialPostCrudCache = {
    queryClient,
    syncPostInCache: (post) => syncSocialPostInCache(queryClient, post),
    recoverRefreshedPost: (postId) => recoverRefreshedSocialPost(queryClient, postId),
  };
  const buildValidatedPostUpdates: BuildValidatedPostUpdates = (nextStatus) =>
    buildValidatedPostUpdatesRuntime({ deps, nextStatus, toast });
  const handlers: SocialPostCrudHandlers = {
    clearDeleteError: () => state.setDeleteError(null),
    handleCreateDraft: createSocialPostDraftHandler({ deps, mutations }),
    handleDeletePost: createSocialPostDeleteHandler({
      deps,
      mutations,
      state,
      toast,
      queryClient,
    }),
    handleQuickPublishPost: createSocialPostQuickPublishHandler({
      deps,
      mutations,
      state,
      cache,
      toast,
    }),
    handleUnpublishPost: createSocialPostUnpublishHandler({
      deps,
      mutations,
      state,
      toast,
      queryClient,
    }),
    handleSave: createSocialPostSaveHandler({
      deps,
      mutations,
      toast,
      buildValidatedPostUpdates,
    }),
    handlePublish: createSocialPostPublishHandler({
      deps,
      mutations,
      cache,
      toast,
      buildValidatedPostUpdates,
    }),
  };

  return buildSocialPostCrudResult({ mutations, state, handlers });
}
