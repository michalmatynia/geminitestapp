import 'server-only';

import {
  configurationError,
  invalidStateError,
  notFoundError,
} from '@/shared/errors/app-error';
import type {
  SocialPublishingPost,
  SocialPublishingPublishMode,
} from '@/shared/contracts/social-publishing-posts';
import {
  hasSocialPublishingPublication,
  hasSocialPublishingPublicationTarget,
} from '@/shared/contracts/social-publishing-posts';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  publishLinkedInPersonalPost,
  deleteLinkedInPersonalPost,
} from './social-posts-publish.linkedin';
import {
  deleteSocialPublishingPost,
  listDueScheduledSocialPublishingPosts,
  updateSocialPublishingPost,
} from './social-posts-repository';

const truncatePublishError = (message: string): string =>
  message.length > 1000 ? `${message.slice(0, 997).trimEnd()}...` : message;

export async function publishSocialPublishingPost(
  post: SocialPublishingPost,
  options?: { mode?: SocialPublishingPublishMode; skipImages?: boolean }
): Promise<SocialPublishingPost> {
  if (hasSocialPublishingPublication(post)) {
    throw invalidStateError('Social post is already published.');
  }

  const now = new Date().toISOString();
  const startedAt = Date.now();
  const bodyLength = post.combinedBody ? post.combinedBody.trim().length : 0;
  const imageCount = post.imageAssets?.length ?? 0;
  const publishMode: SocialPublishingPublishMode = options?.mode ?? 'published';
  const nextStatus = publishMode === 'draft' ? 'draft' : 'published';
  const baseContext = {
    service: 'social-publishing.posts.publish',
    postId: post.id,
    status: post.status,
    scheduledAt: post.scheduledAt ?? null,
    publishingConnectionId: post.publishingConnectionId ?? null,
    bodyLength,
    imageCount,
    publishMode,
  };

  try {
    const result = await publishLinkedInPersonalPost(post, { mode: publishMode, skipImages: options?.skipImages });
    const updated = await updateSocialPublishingPost(post.id, {
      status: nextStatus,
      publishedAt: publishMode === 'published' ? now : null,
      publishingProvider: result.provider,
      publishedPostId: result?.postId ?? null,
      publishedUrl: result?.url ?? null,
      publishError: null,
    });
    if (!updated) {
      throw notFoundError('Social post not found.');
    }
    void ErrorSystem.logInfo('Social publishing post published', {
      ...baseContext,
      durationMs: Date.now() - startedAt,
      publishedPostId: result?.postId ?? null,
    });
    return updated;
  } catch (error) {
    void ErrorSystem.captureException(error, {
      ...baseContext,
      action: 'publish',
      durationMs: Date.now() - startedAt,
    });
    const message = error instanceof Error ? error.message : 'Failed to publish social post.';
    const publishError = truncatePublishError(message);
    await updateSocialPublishingPost(post.id, {
      status: 'failed',
      publishError,
    }).catch((updateError) => {
      void ErrorSystem.captureException(updateError, {
        ...baseContext,
        action: 'markFailed',
      });
      return null;
    });
    if (error instanceof Error) {
      throw error;
    }
    throw configurationError('Failed to publish social post.');
  }
}

export async function unpublishSocialPublishingPost(
  post: SocialPublishingPost,
  options?: { keepLocal?: boolean }
): Promise<SocialPublishingPost> {
  const startedAt = Date.now();
  const keepLocal = options?.keepLocal ?? false;
  const baseContext = {
    service: 'social-publishing.posts.unpublish',
    postId: post.id,
    status: post.status,
    publishingConnectionId: post.publishingConnectionId ?? null,
    publishedPostId: post.publishedPostId ?? null,
    keepLocal,
  };

  if (!hasSocialPublishingPublicationTarget(post)) {
    throw configurationError('Publication details are missing.');
  }

  try {
    await deleteLinkedInPersonalPost(post);

    if (keepLocal) {
      const updated = await updateSocialPublishingPost(post.id, {
        status: 'draft',
        publishingProvider: null,
        publishedPostId: null,
        publishedUrl: null,
        publishedAt: null,
        publishError: null,
      });
      if (!updated) {
        throw notFoundError('Social post not found.');
      }
      void ErrorSystem.logInfo('Social publishing post unpublished (kept locally)', {
        ...baseContext,
        durationMs: Date.now() - startedAt,
      });
      return updated;
    }

    const deleted = await deleteSocialPublishingPost(post.id);
    if (!deleted) {
      throw notFoundError('Social post not found.');
    }
    void ErrorSystem.logInfo('Social publishing post unpublished', {
      ...baseContext,
      durationMs: Date.now() - startedAt,
    });
    return deleted;
  } catch (error) {
    void ErrorSystem.captureException(error, {
      ...baseContext,
      action: 'unpublish',
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}

export async function publishDueScheduledSocialPublishingPosts(
  now: Date = new Date()
): Promise<SocialPublishingPost[]> {
  const startedAt = Date.now();
  const duePosts = await listDueScheduledSocialPublishingPosts(now);
  if (duePosts.length === 0) return [];

  const results: SocialPublishingPost[] = [];
  let publishedCount = 0;
  const failedPostIds: string[] = [];
  for (const post of duePosts) {
    try {
      results.push(await publishSocialPublishingPost(post));
      publishedCount += 1;
    } catch (_error) {
      failedPostIds.push(post.id);
      void ErrorSystem.captureException(_error, {
        service: 'social-publishing.posts.publish-scheduled',
        action: 'publishScheduledPost',
        postId: post.id,
        scheduledAt: post.scheduledAt ?? null,
        publishingConnectionId: post.publishingConnectionId ?? null,
      });
      const message = _error instanceof Error ? _error.message : null;
      const publishError = message ? truncatePublishError(message) : null;
      const failed = await updateSocialPublishingPost(post.id, {
        status: 'failed',
        ...(publishError ? { publishError } : {}),
      });
      if (failed) {
        results.push(failed);
      }
    }
  }

  const failedCount = duePosts.length - publishedCount;
  const summaryContext = {
    service: 'social-publishing.posts.publish-scheduled',
    durationMs: Date.now() - startedAt,
    dueCount: duePosts.length,
    publishedCount,
    failedCount,
    publishedPostIds: results.filter((post) => post.status === 'published').map((post) => post.id),
    failedPostIds,
  };
  if (failedCount > 0) {
    void ErrorSystem.logWarning('Social publishing scheduled posts publish completed with failures', summaryContext);
  } else {
    void ErrorSystem.logInfo('Social publishing scheduled posts published', summaryContext);
  }

  return results;
}
