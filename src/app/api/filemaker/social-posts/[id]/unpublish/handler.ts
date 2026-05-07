import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveSocialPublishingActor } from '@/features/filemaker/social/server/social-publishing-actor';
import { logSocialPublishingServerEvent } from '@/features/filemaker/social/server/social-publishing-observability';
import { getSocialPublishingPostById } from '@/features/filemaker/social/server/social-posts-repository';
import { unpublishSocialPublishingPost } from '@/features/filemaker/social/server/social-posts-publish';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { forbiddenError, notFoundError } from '@/shared/errors/app-error';

const bodySchema = z.object({
  keepLocal: z.boolean().optional(),
});

export async function postSocialPublishingPostUnpublishHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const id = String(ctx.params?.['id'] ?? '');
  const actor = await resolveSocialPublishingActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can unpublish social posts.');
  }

  const post = await getSocialPublishingPostById(id);
  if (!post) {
    throw notFoundError('Social post not found.');
  }

  const parsed = bodySchema.parse(ctx.body ?? {});
  const startedAt = Date.now();
  try {
    const result = await unpublishSocialPublishingPost(post, { keepLocal: parsed.keepLocal });
    void logSocialPublishingServerEvent({
      source: 'social-publishing.posts.unpublish',
      message: parsed.keepLocal
        ? 'Social publishing post unpublished (kept locally)'
        : 'Social publishing post unpublished',
      request: req,
      requestContext: ctx,
      actor,
      statusCode: 200,
      context: {
        postId: result.id,
        status: result.status,
        publishingProvider: result.publishingProvider ?? null,
        publishedPostId: result.publishedPostId ?? null,
        keepLocal: parsed.keepLocal ?? false,
        durationMs: Date.now() - startedAt,
      },
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'social-publishing.posts.unpublish',
      action: 'apiUnpublish',
      postId: post.id,
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}
