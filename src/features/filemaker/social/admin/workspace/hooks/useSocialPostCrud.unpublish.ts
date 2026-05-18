import type { QueryClient } from '@tanstack/react-query';

import { logSocialPublishingClientError } from '@/features/filemaker/social/client-observability';
import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { ErrorSystem } from '@/shared/utils/observability/error-system-client';

import type {
  SocialPostCrudDeps,
  SocialPostCrudMutations,
  SocialPostCrudState,
  SocialPostCrudToast,
} from './useSocialPostCrud.types';

const syncKeptDraft = ({
  queryClient,
  result,
}: {
  queryClient: QueryClient;
  result: SocialPublishingPost;
}): void => {
  const queryKey = QUERY_KEYS.socialPublishing.posts({ scope: 'admin', limit: null });
  queryClient.setQueryData<SocialPublishingPost[]>(queryKey, (current) => {
    const entries = current ?? [];
    return entries.map((entry) => (entry.id === result.id ? result : entry));
  });
};

const removeUnpublishedPost = ({
  deps,
  queryClient,
  postId,
  result,
}: {
  deps: SocialPostCrudDeps;
  queryClient: QueryClient;
  postId: string;
  result: SocialPublishingPost;
}): void => {
  const queryKey = QUERY_KEYS.socialPublishing.posts({ scope: 'admin', limit: null });
  let nextEntries: SocialPublishingPost[] = [];
  queryClient.setQueryData<SocialPublishingPost[]>(queryKey, (current) => {
    const entries = current ?? [];
    nextEntries = entries.filter((entry) => entry.id !== result.id);
    return nextEntries;
  });
  deps.setActivePostId((current) => (current === postId ? nextEntries[0]?.id ?? null : current));
};

const shouldSkipUnpublish = ({
  postId,
  mutations,
  state,
}: {
  postId: string;
  mutations: Pick<SocialPostCrudMutations, 'unpublishMutation'>;
  state: Pick<SocialPostCrudState, 'unpublishingPostId'>;
}): boolean =>
  postId.length === 0 || mutations.unpublishMutation.isPending || state.unpublishingPostId !== null;

const applyUnpublishSuccess = ({
  deps,
  queryClient,
  postId,
  result,
  keepLocal,
  toast,
}: {
  deps: SocialPostCrudDeps;
  queryClient: QueryClient;
  postId: string;
  result: SocialPublishingPost;
  keepLocal: boolean;
  toast: SocialPostCrudToast;
}): void => {
  if (keepLocal) {
    syncKeptDraft({ queryClient, result });
    toast('Unpublished. Post kept as draft.', { variant: 'success' });
    return;
  }

  removeUnpublishedPost({ deps, queryClient, postId, result });
  toast('Post unpublished and removed.', { variant: 'success' });
};

export const createSocialPostUnpublishHandler = ({
  deps,
  mutations,
  state,
  toast,
  queryClient,
}: {
  deps: SocialPostCrudDeps;
  mutations: Pick<SocialPostCrudMutations, 'unpublishMutation'>;
  state: Pick<SocialPostCrudState, 'unpublishingPostId' | 'setUnpublishingPostId'>;
  toast: SocialPostCrudToast;
  queryClient: QueryClient;
}): ((postId: string, options?: { keepLocal?: boolean }) => Promise<void>) => {
  const handleUnpublishPost = async (
    postId: string,
    options?: { keepLocal?: boolean }
  ): Promise<void> => {
    if (shouldSkipUnpublish({ postId, mutations, state })) {
      return;
    }

    const keepLocal = options?.keepLocal ?? false;
    state.setUnpublishingPostId(postId);
    try {
      const result = await mutations.unpublishMutation.mutateAsync({ id: postId, keepLocal });
      applyUnpublishSuccess({ deps, queryClient, postId, result, keepLocal, toast });
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'social-publishing.admin',
        action: 'unpublishPost',
        postId,
        keepLocal,
      });
      logSocialPublishingClientError(error, {
        ...deps.buildSocialContext({ postId }),
      });
      const message = error instanceof Error ? error.message : 'Failed to unpublish post.';
      toast(message, { variant: 'error' });
      throw error;
    } finally {
      state.setUnpublishingPostId(null);
    }
  };

  return handleUnpublishPost;
};
