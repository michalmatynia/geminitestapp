import { type z } from 'zod';

import {
  buildSocialPublishingPostCombinedBody,
  hasSocialPublishingPublication,
  socialPublishingPostSchema,
  type SocialPublishingPost,
  type SocialPublishingPublishMode,
} from '@/shared/contracts/social-publishing-posts';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { parseDatetimeLocal } from '../SocialPublishingPage.Constants';
import { resolveSocialPostImageState } from '../social-post-image-assets';
import type {
  SocialPostCrudDeps,
  SocialPostCrudToast,
} from './useSocialPostCrud.types';

export const socialPostUpdateSchema = socialPublishingPostSchema.partial();
export const SOCIAL_PUBLISHING_ADMIN_POSTS_QUERY_KEY = QUERY_KEYS.socialPublishing.posts({
  scope: 'admin',
  limit: null,
});

export const ALREADY_PUBLISHED_TOAST =
  'This post is already published. Unpublish it before publishing again.';
export const ALREADY_PUBLISHED_SCHEDULE_TOAST =
  'This post is already published. Unpublish it before scheduling again.';

const SOCIAL_POST_FIELD_LABELS: Record<string, string> = {
  titlePl: 'Polish title',
  titleEn: 'English title',
  bodyPl: 'Polish body',
  bodyEn: 'English body',
  combinedBody: 'Combined body',
  scheduledAt: 'Scheduled publish time',
  imageAssets: 'Attached images',
  imageAddonIds: 'Image add-ons',
  docReferences: 'Documentation references',
  publishingConnectionId: 'Publishing connection',
  brainModelId: 'Post model',
  visionModelId: 'Vision model',
};

const resolveIssueMessage = (issueMessage: string, fallback: string): string =>
  issueMessage.length > 0 ? issueMessage : fallback;

export const formatSocialPostValidationError = (error: z.ZodError): string => {
  const firstIssue = error.issues[0];
  if (firstIssue === undefined) {
    return 'Review the post fields and try again.';
  }

  const firstPathSegment = firstIssue.path[0];
  const fieldKey =
    typeof firstPathSegment === 'string' || typeof firstPathSegment === 'number'
      ? String(firstPathSegment)
      : '';
  const fieldLabel = SOCIAL_POST_FIELD_LABELS[fieldKey];
  const issueMessage = firstIssue.message.trim();

  if (fieldLabel === undefined) {
    return resolveIssueMessage(issueMessage, 'Review the post fields and try again.');
  }

  return issueMessage.length > 0 ? `${fieldLabel}: ${issueMessage}` : `${fieldLabel} is invalid.`;
};

export const resolvePublishSuccessToast = (mode: SocialPublishingPublishMode): string =>
  mode === 'draft' ? 'Draft sent to publishing channel.' : 'Published.';

const hasSavedPublishError = (post: SocialPublishingPost): boolean => {
  const publishError = post.publishError?.trim();
  return publishError !== undefined && publishError.length > 0;
};

const didRecoverDraftPublish = (post: SocialPublishingPost): boolean => {
  const publishedPostId = post.publishedPostId?.trim() ?? '';
  const publishedUrl = post.publishedUrl?.trim() ?? '';
  return post.status === 'draft' && (publishedPostId.length > 0 || publishedUrl.length > 0);
};

export const didRecoverSuccessfulPublish = (
  post: SocialPublishingPost | null,
  mode: SocialPublishingPublishMode
): boolean => {
  if (post === null) {
    return false;
  }
  if (hasSavedPublishError(post)) {
    return false;
  }
  if (mode === 'draft') {
    return didRecoverDraftPublish(post);
  }

  return hasSocialPublishingPublication(post);
};

export const resolveSavedPublishError = (
  post: SocialPublishingPost | null
): string | null => {
  const publishError = post?.publishError?.trim();
  return publishError !== undefined && publishError.length > 0 ? publishError : null;
};

export const resolveUnknownPublishErrorMessage = ({
  error,
  draftMessage,
  fallbackMessage,
  isDraft,
}: {
  error: unknown;
  draftMessage: string;
  fallbackMessage: string;
  isDraft: boolean;
}): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return isDraft ? draftMessage : fallbackMessage;
};

export const buildValidatedPostUpdates = ({
  deps,
  nextStatus,
  toast,
}: {
  deps: SocialPostCrudDeps;
  nextStatus: SocialPublishingPost['status'];
  toast: SocialPostCrudToast;
}): Partial<SocialPublishingPost> | null => {
  const shouldKeepPublishedStatus =
    nextStatus === 'draft' && hasSocialPublishingPublication(deps.activePost);
  const resolvedImageState = resolveSocialPostImageState({
    imageAssets: deps.imageAssets,
    imageAddonIds: deps.imageAddonIds,
    recentAddons: deps.recentAddons,
  });
  const updates: Partial<SocialPublishingPost> = {
    ...deps.editorState,
    combinedBody: buildSocialPublishingPostCombinedBody(
      deps.editorState.bodyPl,
      deps.editorState.bodyEn
    ),
    status: shouldKeepPublishedStatus ? 'published' : nextStatus,
    scheduledAt: nextStatus === 'scheduled' ? parseDatetimeLocal(deps.scheduledAt) : null,
    imageAssets: resolvedImageState.imageAssets,
    imageAddonIds: resolvedImageState.imageAddonIds,
    docReferences: deps.resolveDocReferences(),
    publishingConnectionId: deps.publishingConnectionId,
    brainModelId: deps.brainModelId,
    visionModelId: deps.visionModelId,
    publishError: null,
  };

  const parsed = socialPostUpdateSchema.safeParse(updates);
  if (parsed.success) {
    return parsed.data;
  }

  toast(formatSocialPostValidationError(parsed.error), { variant: 'error' });
  return null;
};
