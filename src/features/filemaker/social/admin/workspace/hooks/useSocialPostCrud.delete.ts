import {
  logSocialPublishingClientError,
  trackSocialPublishingClientEvent,
} from '@/features/filemaker/social/client-observability';
import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';
import { ApiError } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { ErrorSystem } from '@/shared/utils/observability/error-system-client';

import { refetchSocialPostsAfterDelete } from './useSocialPostCrud.cache';
import type {
  SocialPostCrudDeps,
  SocialPostCrudMutations,
  SocialPostCrudState,
  SocialPostCrudToast,
} from './useSocialPostCrud.types';

const selectNextActivePostId = ({
  current,
  deletedPostId,
  posts,
}: {
  current: string | null;
  deletedPostId: string;
  posts: SocialPublishingPost[];
}): string | null => (current === deletedPostId ? posts[0]?.id ?? null : current);

const restoreActivePostAfterFailedDelete = ({
  deps,
  postId,
  wasActive,
  effectivePosts,
}: {
  deps: SocialPostCrudDeps;
  postId: string;
  wasActive: boolean;
  effectivePosts: SocialPublishingPost[];
}): void => {
  deps.setActivePostId((current) => {
    if (wasActive && effectivePosts.some((post) => post.id === postId)) {
      return postId;
    }
    if (current !== null && effectivePosts.some((post) => post.id === current)) {
      return current;
    }
    return effectivePosts[0]?.id ?? null;
  });
};

const handleDeleteNotFound = async ({
  deps,
  state,
  toast,
  queryClient,
  postId,
  previousPosts,
  wasActive,
}: {
  deps: SocialPostCrudDeps;
  state: Pick<SocialPostCrudState, 'setDeleteError'>;
  toast: SocialPostCrudToast;
  queryClient: Parameters<typeof refetchSocialPostsAfterDelete>[0];
  postId: string;
  previousPosts: SocialPublishingPost[];
  wasActive: boolean;
}): Promise<void> => {
  const queryKey = QUERY_KEYS.socialPublishing.posts({ scope: 'admin', limit: null });
  const effectivePosts = (await refetchSocialPostsAfterDelete(queryClient)) ?? previousPosts;
  const stillExists = effectivePosts.some((post) => post.id === postId);

  if (stillExists) {
    restoreActivePostAfterFailedDelete({ deps, postId, wasActive, effectivePosts });
    state.setDeleteError('Failed to delete draft.');
    toast('Failed to delete draft.', { variant: 'error' });
    throw new Error('Failed to delete draft.');
  }

  queryClient.setQueryData(queryKey, effectivePosts);
  deps.setActivePostId((current) =>
    selectNextActivePostId({ current, deletedPostId: postId, posts: effectivePosts })
  );
  trackSocialPublishingClientEvent(
    'social_publishing_post_delete_not_found',
    deps.buildSocialContext({ postId })
  );
};

const handleDeleteFailure = ({
  error,
  deps,
  state,
  toast,
  postId,
}: {
  error: unknown;
  deps: SocialPostCrudDeps;
  state: Pick<SocialPostCrudState, 'setDeleteError'>;
  toast: SocialPostCrudToast;
  postId: string;
}): never => {
  void ErrorSystem.captureException(error, {
    service: 'social-publishing.admin',
    action: 'deletePost',
    postId,
  });
  logSocialPublishingClientError(error, {
    ...deps.buildSocialContext({ postId }),
  });
  const message = error instanceof Error ? error.message : 'Failed to delete draft.';
  state.setDeleteError(message);
  toast(message, { variant: 'error' });
  trackSocialPublishingClientEvent(
    'social_publishing_post_delete_failed',
    deps.buildSocialContext({ postId, error: true })
  );
  throw error;
};

export const createSocialPostDeleteHandler = ({
  deps,
  mutations,
  state,
  toast,
  queryClient,
}: {
  deps: SocialPostCrudDeps;
  mutations: Pick<SocialPostCrudMutations, 'deleteMutation'>;
  state: Pick<SocialPostCrudState, 'setDeleteError'>;
  toast: SocialPostCrudToast;
  queryClient: Parameters<typeof refetchSocialPostsAfterDelete>[0];
}): ((postId: string) => Promise<void>) => {
  const handleDeletePost = async (postId: string): Promise<void> => {
    if (postId.length === 0) {
      return;
    }

    state.setDeleteError(null);
    const queryKey = QUERY_KEYS.socialPublishing.posts({ scope: 'admin', limit: null });
    const wasActive = deps.activePostId === postId;
    const previousPosts = queryClient.getQueryData<SocialPublishingPost[]>(queryKey) ?? [];
    trackSocialPublishingClientEvent(
      'social_publishing_post_delete_attempt',
      deps.buildSocialContext({ postId })
    );

    try {
      await mutations.deleteMutation.mutateAsync(postId);
      const currentPosts = queryClient.getQueryData<SocialPublishingPost[]>(queryKey) ?? previousPosts;
      const nextPosts = currentPosts.filter((post) => post.id !== postId);
      queryClient.setQueryData(queryKey, nextPosts);
      deps.setActivePostId((current) =>
        selectNextActivePostId({ current, deletedPostId: postId, posts: nextPosts })
      );
      toast('Draft deleted.', { variant: 'success' });
      trackSocialPublishingClientEvent(
        'social_publishing_post_delete_success',
        deps.buildSocialContext({ postId })
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        await handleDeleteNotFound({
          deps,
          state,
          toast,
          queryClient,
          postId,
          previousPosts,
          wasActive,
        });
        return;
      }
      handleDeleteFailure({ error, deps, state, toast, postId });
    }
  };

  return handleDeletePost;
};
