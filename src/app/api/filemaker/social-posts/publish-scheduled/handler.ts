import { type NextRequest, NextResponse } from 'next/server';

import { resolveSocialPublishingActor } from '@/features/filemaker/social/server/social-publishing-actor';
import { logSocialPublishingServerEvent } from '@/features/filemaker/social/server/social-publishing-observability';
import { publishDueScheduledSocialPublishingPosts } from '@/features/filemaker/social/server/social-posts-publish';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { forbiddenError } from '@/shared/errors/app-error';

export async function postSocialPublishingPostsPublishScheduledHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveSocialPublishingActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can publish scheduled social posts.');
  }

  const startedAt = Date.now();
  try {
    const published = await publishDueScheduledSocialPublishingPosts();
    void logSocialPublishingServerEvent({
      source: 'social-publishing.posts.publish-scheduled',
      message: 'Social publishing scheduled posts publish triggered',
      request: req,
      requestContext: _ctx,
      actor,
      statusCode: 200,
      context: {
        publishedCount: published.length,
        publishedPostIds: published.map((post) => post.id),
        durationMs: Date.now() - startedAt,
      },
    });
    return NextResponse.json(published, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'social-publishing.posts.publish-scheduled',
      action: 'apiPublishScheduled',
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}
