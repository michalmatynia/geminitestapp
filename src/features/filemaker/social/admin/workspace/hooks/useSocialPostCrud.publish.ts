import {
  isExpectedSocialPublishingClientError,
  logSocialPublishingClientError,
  trackSocialPublishingClientEvent,
} from '@/features/filemaker/social/client-observability';
import {
  hasSocialPublishingPublication,
  type SocialPublishingPost,
  type SocialPublishingPublishMode,
} from '@/shared/contracts/social-publishing-posts';
import { ErrorSystem } from '@/shared/utils/observability/error-system-client';

import {
  ALREADY_PUBLISHED_TOAST,
  didRecoverSuccessfulPublish,
  resolvePublishSuccessToast,
  resolveSavedPublishError,
  resolveUnknownPublishErrorMessage,
} from './useSocialPostCrud.runtime';
import type {
  BuildValidatedPostUpdates,
  SocialPostCrudCache,
  SocialPostCrudDeps,
  SocialPostCrudMutations,
  SocialPostCrudState,
  SocialPostCrudToast,
} from './useSocialPostCrud.types';

type PublishStage = 'prepare' | 'publish';

const reportPublishClientError = ({
  error,
  deps,
  postId,
  mode,
}: {
  error: unknown;
  deps: SocialPostCrudDeps;
  postId: string;
  mode: SocialPublishingPublishMode;
}): void => {
  void ErrorSystem.captureException(error, {
    service: 'social-publishing.admin',
    action: 'quickPublish',
    postId,
    mode,
  });
  logSocialPublishingClientError(error, {
    source: 'AdminSocialPublishingPage',
    action: 'quickPublish',
    ...deps.buildSocialContext({ postId, publishMode: mode }),
  });
};

const handleQuickPublishFailure = async ({
  error,
  deps,
  cache,
  toast,
  postId,
  mode,
}: {
  error: unknown;
  deps: SocialPostCrudDeps;
  cache: Pick<SocialPostCrudCache, 'recoverRefreshedPost' | 'syncPostInCache'>;
  toast: SocialPostCrudToast;
  postId: string;
  mode: SocialPublishingPublishMode;
}): Promise<void> => {
  const recoveredPost = await cache.recoverRefreshedPost(postId);
  if (recoveredPost !== null && didRecoverSuccessfulPublish(recoveredPost, mode)) {
    cache.syncPostInCache(recoveredPost);
    toast(resolvePublishSuccessToast(mode), { variant: 'success' });
    return;
  }

  const savedPublishError = resolveSavedPublishError(recoveredPost);
  const message =
    savedPublishError ??
    resolveUnknownPublishErrorMessage({
      error,
      draftMessage: 'Failed to publish draft.',
      fallbackMessage: 'Failed to publish post.',
      isDraft: mode === 'draft',
    });
  if (savedPublishError === null && !isExpectedSocialPublishingClientError(error)) {
    reportPublishClientError({ error, deps, postId, mode });
  }
  toast(message, { variant: 'error' });
  throw error;
};

export const createSocialPostQuickPublishHandler = ({
  deps,
  mutations,
  state,
  cache,
  toast,
}: {
  deps: SocialPostCrudDeps;
  mutations: Pick<SocialPostCrudMutations, 'publishMutation'>;
  state: Pick<SocialPostCrudState, 'publishingPostId' | 'setPublishingPostId'>;
  cache: Pick<SocialPostCrudCache, 'recoverRefreshedPost' | 'syncPostInCache'>;
  toast: SocialPostCrudToast;
}): ((
  postId: string,
  mode?: SocialPublishingPublishMode,
  options?: { skipImages?: boolean }
) => Promise<void>) => {
  const handleQuickPublishPost = async (
    postId: string,
    mode: SocialPublishingPublishMode = 'published',
    options?: { skipImages?: boolean }
  ): Promise<void> => {
    if (postId.length === 0) {
      return;
    }
    if (mutations.publishMutation.isPending || state.publishingPostId !== null) {
      return;
    }

    state.setPublishingPostId(postId);
    try {
      const published = await mutations.publishMutation.mutateAsync({
        id: postId,
        mode,
        skipImages: options?.skipImages,
      });
      cache.syncPostInCache(published);
      toast(resolvePublishSuccessToast(mode), { variant: 'success' });
    } catch (error) {
      await handleQuickPublishFailure({ error, deps, cache, toast, postId, mode });
    } finally {
      state.setPublishingPostId(null);
    }
  };

  return handleQuickPublishPost;
};

const reportFullPublishClientError = ({
  error,
  deps,
  stage,
}: {
  error: unknown;
  deps: SocialPostCrudDeps;
  stage: PublishStage;
}): void => {
  void ErrorSystem.captureException(error);
  logSocialPublishingClientError(error, {
    source: 'AdminSocialPublishingPage',
    action: 'publishPost',
    stage,
    ...deps.buildSocialContext(),
  });
};

const recoverFullPublishPost = async ({
  cache,
  activePost,
  stage,
}: {
  cache: Pick<SocialPostCrudCache, 'recoverRefreshedPost'>;
  activePost: SocialPublishingPost | null;
  stage: PublishStage;
}): Promise<SocialPublishingPost | null> => {
  if (stage !== 'publish' || activePost === null) {
    return null;
  }

  return await cache.recoverRefreshedPost(activePost.id);
};

const didRecoverFullPublish = (
  stage: PublishStage,
  recoveredPost: SocialPublishingPost | null
): recoveredPost is SocialPublishingPost =>
  stage === 'publish' && recoveredPost !== null && didRecoverSuccessfulPublish(recoveredPost, 'published');

const handleFullPublishFailure = async ({
  error,
  deps,
  cache,
  toast,
  stage,
}: {
  error: unknown;
  deps: SocialPostCrudDeps;
  cache: Pick<SocialPostCrudCache, 'recoverRefreshedPost' | 'syncPostInCache'>;
  toast: SocialPostCrudToast;
  stage: PublishStage;
}): Promise<void> => {
  const recoveredPost = await recoverFullPublishPost({
    cache,
    activePost: deps.activePost,
    stage,
  });
  if (didRecoverFullPublish(stage, recoveredPost)) {
    cache.syncPostInCache(recoveredPost);
    toast(resolvePublishSuccessToast('published'), { variant: 'success' });
    trackSocialPublishingClientEvent(
      'social_publishing_post_publish_success',
      deps.buildSocialContext({ recoveredPublishState: true })
    );
    return;
  }

  const savedPublishError = resolveSavedPublishError(recoveredPost);
  const message =
    savedPublishError ??
    resolveUnknownPublishErrorMessage({
      error,
      draftMessage: 'Failed to prepare the post for publishing.',
      fallbackMessage: 'Failed to publish post.',
      isDraft: stage === 'prepare',
    });
  if (savedPublishError === null && !isExpectedSocialPublishingClientError(error)) {
    reportFullPublishClientError({ error, deps, stage });
  }
  toast(message, { variant: 'error' });
  trackSocialPublishingClientEvent(
    'social_publishing_post_publish_failed',
    deps.buildSocialContext({
      stage,
      error: true,
      ...(savedPublishError !== null ? { recoveredPublishError: true } : {}),
    })
  );
};

export const createSocialPostPublishHandler = ({
  deps,
  mutations,
  cache,
  toast,
  buildValidatedPostUpdates,
}: {
  deps: SocialPostCrudDeps;
  mutations: Pick<SocialPostCrudMutations, 'patchMutation' | 'publishMutation'>;
  cache: Pick<SocialPostCrudCache, 'recoverRefreshedPost' | 'syncPostInCache'>;
  toast: SocialPostCrudToast;
  buildValidatedPostUpdates: BuildValidatedPostUpdates;
}): (() => Promise<void>) => {
  const handlePublish = async (): Promise<void> => {
    if (deps.activePost === null) {
      return;
    }
    if (hasSocialPublishingPublication(deps.activePost)) {
      toast(ALREADY_PUBLISHED_TOAST, { variant: 'info' });
      return;
    }

    const updates = buildValidatedPostUpdates('scheduled');
    if (updates === null) {
      trackSocialPublishingClientEvent(
        'social_publishing_post_publish_failed',
        deps.buildSocialContext({ stage: 'prepare', error: true, validationError: true })
      );
      return;
    }

    trackSocialPublishingClientEvent('social_publishing_post_publish_attempt', deps.buildSocialContext());
    let stage: PublishStage = 'prepare';
    try {
      await mutations.patchMutation.mutateAsync({ id: deps.activePost.id, updates });
      stage = 'publish';
      const published = await mutations.publishMutation.mutateAsync({
        id: deps.activePost.id,
        mode: 'published',
      });
      cache.syncPostInCache(published);
      toast(resolvePublishSuccessToast('published'), { variant: 'success' });
      trackSocialPublishingClientEvent(
        'social_publishing_post_publish_success',
        deps.buildSocialContext()
      );
    } catch (error) {
      await handleFullPublishFailure({ error, deps, cache, toast, stage });
    }
  };

  return handlePublish;
};
