import {
  logSocialPublishingClientError,
  trackSocialPublishingClientEvent,
} from '@/features/filemaker/social/client-observability';
import {
  hasSocialPublishingPublication,
  type SocialPublishingPost,
} from '@/shared/contracts/social-publishing-posts';
import { ErrorSystem } from '@/shared/utils/observability/error-system-client';

import {
  ALREADY_PUBLISHED_SCHEDULE_TOAST,
} from './useSocialPostCrud.runtime';
import type {
  BuildValidatedPostUpdates,
  SocialPostCrudDeps,
  SocialPostCrudMutations,
  SocialPostCrudToast,
} from './useSocialPostCrud.types';

const trackSaveValidationFailure = (
  deps: SocialPostCrudDeps,
  nextStatus: SocialPublishingPost['status']
): void => {
  trackSocialPublishingClientEvent(
    'social_publishing_post_save_failed',
    deps.buildSocialContext({ nextStatus, error: true, validationError: true })
  );
};

export const createSocialPostSaveHandler = ({
  deps,
  mutations,
  toast,
  buildValidatedPostUpdates,
}: {
  deps: SocialPostCrudDeps;
  mutations: Pick<SocialPostCrudMutations, 'patchMutation'>;
  toast: SocialPostCrudToast;
  buildValidatedPostUpdates: BuildValidatedPostUpdates;
}): ((nextStatus: SocialPublishingPost['status']) => Promise<void>) => {
  const handleSave = async (nextStatus: SocialPublishingPost['status']): Promise<void> => {
    if (deps.activePost === null) {
      return;
    }
    if (nextStatus === 'scheduled' && hasSocialPublishingPublication(deps.activePost)) {
      toast(ALREADY_PUBLISHED_SCHEDULE_TOAST, { variant: 'info' });
      return;
    }

    const updates = buildValidatedPostUpdates(nextStatus);
    if (updates === null) {
      trackSaveValidationFailure(deps, nextStatus);
      return;
    }

    trackSocialPublishingClientEvent(
      'social_publishing_post_save_attempt',
      deps.buildSocialContext({ nextStatus })
    );
    try {
      await mutations.patchMutation.mutateAsync({ id: deps.activePost.id, updates });
      trackSocialPublishingClientEvent(
        'social_publishing_post_save_success',
        deps.buildSocialContext({ nextStatus })
      );
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'social-publishing.admin',
        action: 'savePost',
        postId: deps.activePost.id,
        nextStatus,
      });
      logSocialPublishingClientError(error, {
        ...deps.buildSocialContext({ nextStatus }),
      });
      toast(error instanceof Error ? error.message : 'Failed to save draft.', {
        variant: 'error',
      });
      trackSocialPublishingClientEvent(
        'social_publishing_post_save_failed',
        deps.buildSocialContext({ nextStatus, error: true })
      );
    }
  };

  return handleSave;
};
