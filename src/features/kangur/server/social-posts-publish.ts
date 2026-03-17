import 'server-only';

import { configurationError, notFoundError } from '@/shared/errors/app-error';
import type { KangurSocialPost } from '@/shared/contracts/kangur-social-posts';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

import { publishLinkedInPersonalPost } from './social-posts-publish.linkedin';
import {
  listDueScheduledKangurSocialPosts,
  updateKangurSocialPost,
} from './social-posts-repository';

const truncatePublishError = (message: string): string =>
  message.length > 1000 ? `${message.slice(0, 997).trimEnd()}...` : message;

export async function publishKangurSocialPost(
  post: KangurSocialPost
): Promise<KangurSocialPost> {
  const now = new Date().toISOString();
  const startedAt = Date.now();
  const bodyLength = post.combinedBody ? post.combinedBody.trim().length : 0;
  const imageCount = post.imageAssets?.length ?? 0;
  const baseContext = {
    service: 'kangur.social-posts.publish',
    postId: post.id,
    status: post.status,
    scheduledAt: post.scheduledAt ?? null,
    linkedinConnectionId: post.linkedinConnectionId ?? null,
    bodyLength,
    imageCount,
  };

  try {
    const result = await publishLinkedInPersonalPost(post);
    const updated = await updateKangurSocialPost(post.id, {
      status: 'published',
      publishedAt: now,
      linkedinPostId: result?.postId ?? null,
      linkedinUrl: result?.url ?? null,
      publishError: null,
    });
    if (!updated) {
      throw notFoundError('Social post not found.');
    }
    void ErrorSystem.logInfo('Kangur social post published', {
      ...baseContext,
      durationMs: Date.now() - startedAt,
      linkedinPostId: result?.postId ?? null,
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
    await updateKangurSocialPost(post.id, {
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

export async function publishDueScheduledKangurSocialPosts(
  now: Date = new Date()
): Promise<KangurSocialPost[]> {
  const startedAt = Date.now();
  const duePosts = await listDueScheduledKangurSocialPosts(now);
  if (duePosts.length === 0) return [];

  const results: KangurSocialPost[] = [];
  let publishedCount = 0;
  const failedPostIds: string[] = [];
  for (const post of duePosts) {
    try {
      results.push(await publishKangurSocialPost(post));
      publishedCount += 1;
    } catch (_error) {
      failedPostIds.push(post.id);
      void ErrorSystem.captureException(_error, {
        service: 'kangur.social-posts.publish-scheduled',
        action: 'publishScheduledPost',
        postId: post.id,
        scheduledAt: post.scheduledAt ?? null,
        linkedinConnectionId: post.linkedinConnectionId ?? null,
      });
      const message = _error instanceof Error ? _error.message : null;
      const publishError = message ? truncatePublishError(message) : null;
      const failed = await updateKangurSocialPost(post.id, {
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
    service: 'kangur.social-posts.publish-scheduled',
    durationMs: Date.now() - startedAt,
    dueCount: duePosts.length,
    publishedCount,
    failedCount,
    publishedPostIds: results.filter((post) => post.status === 'published').map((post) => post.id),
    failedPostIds,
  };
  if (failedCount > 0) {
    void ErrorSystem.logWarning('Kangur scheduled social posts publish completed with failures', summaryContext);
  } else {
    void ErrorSystem.logInfo('Kangur scheduled social posts published', summaryContext);
  }

  return results;
}
