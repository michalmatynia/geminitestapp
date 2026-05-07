import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  hasSocialPublishingPublication,
  socialPublishingPublishModeSchema,
  type SocialPublishingPublishMode,
} from '@/shared/contracts/social-publishing-posts';
import { resolveSocialPublishingActor } from '@/features/filemaker/social/server/social-publishing-actor';
import { logSocialPublishingServerEvent } from '@/features/filemaker/social/server/social-publishing-observability';
import { getSocialPublishingPostById } from '@/features/filemaker/social/server/social-posts-repository';
import { publishSocialPublishingPost } from '@/features/filemaker/social/server/social-posts-publish';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  AppErrorCodes,
  createAppError,
  forbiddenError,
  invalidStateError,
  notFoundError,
} from '@/shared/errors/app-error';

const bodySchema = z.object({
  mode: socialPublishingPublishModeSchema.optional(),
  skipImages: z.boolean().optional(),
});

export async function postSocialPublishingPostPublishHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const id = String(ctx.params?.['id'] ?? '');
  const actor = await resolveSocialPublishingActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can publish social posts.');
  }

  const post = await getSocialPublishingPostById(id);
  if (!post) {
    throw notFoundError('Social post not found.');
  }

  const parsed = bodySchema.parse(ctx.body ?? {});
  const mode: SocialPublishingPublishMode = parsed.mode === 'draft' ? 'draft' : 'published';
  if (hasSocialPublishingPublication(post)) {
    throw invalidStateError('Social post is already published.');
  }

  const startedAt = Date.now();
  try {
    const published = await publishSocialPublishingPost(post, { mode, skipImages: parsed.skipImages });
    void logSocialPublishingServerEvent({
      source: 'social-publishing.posts.publish',
      message: 'Social publishing post published',
      request: req,
      requestContext: ctx,
      actor,
      statusCode: 200,
      context: {
        postId: published.id,
        status: published.status,
        publishingProvider: published.publishingProvider ?? null,
        publishedPostId: published.publishedPostId ?? null,
        publishMode: mode,
        durationMs: Date.now() - startedAt,
      },
    });
    return NextResponse.json(published, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'social-publishing.posts.publish',
      action: 'apiPublish',
      postId: post.id,
      durationMs: Date.now() - startedAt,
    });
    const refreshedPost = await getSocialPublishingPostById(post.id);
    const publishError = refreshedPost?.publishError?.trim();
    if (publishError) {
      throw createAppError(publishError, {
        code: AppErrorCodes.operationFailed,
        httpStatus: 502,
        expected: true,
      });
    }
    throw error;
  }
}
