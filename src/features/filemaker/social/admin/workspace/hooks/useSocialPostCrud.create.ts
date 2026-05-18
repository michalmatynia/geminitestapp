import {
  logSocialPublishingClientError,
  trackSocialPublishingClientEvent,
} from '@/features/filemaker/social/client-observability';
import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';
import { ErrorSystem } from '@/shared/utils/observability/error-system-client';

import type {
  SocialPostCrudDeps,
  SocialPostCrudMutations,
} from './useSocialPostCrud.types';

export const createSocialPostDraftHandler = ({
  deps,
  mutations,
}: {
  deps: SocialPostCrudDeps;
  mutations: Pick<SocialPostCrudMutations, 'saveMutation'>;
}): (() => Promise<SocialPublishingPost | null>) => {
  const handleCreateDraft = async (): Promise<SocialPublishingPost | null> => {
    trackSocialPublishingClientEvent(
      'social_publishing_post_create_attempt',
      deps.buildSocialContext()
    );

    try {
      const created = await mutations.saveMutation.mutateAsync({});
      deps.setActivePostId(created.id);
      trackSocialPublishingClientEvent(
        'social_publishing_post_create_success',
        deps.buildSocialContext({ postId: created.id })
      );
      return created;
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'social-publishing.admin',
        action: 'createDraft',
      });
      logSocialPublishingClientError(error, {
        ...deps.buildSocialContext(),
      });
      trackSocialPublishingClientEvent(
        'social_publishing_post_create_failed',
        deps.buildSocialContext({ error: true })
      );
      return null;
    }
  };

  return handleCreateDraft;
};
