import { NextRequest, NextResponse } from 'next/server';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { publishDueScheduledKangurSocialPosts } from '@/features/kangur/social/server/social-posts-publish';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { forbiddenError } from '@/shared/errors/app-error';

export async function postKangurSocialPostsPublishScheduledHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can publish scheduled social posts.');
  }

  const startedAt = Date.now();
  try {
    const published = await publishDueScheduledKangurSocialPosts();
    void logKangurServerEvent({
      source: 'kangur.social-posts.publish-scheduled',
      message: 'Kangur scheduled social posts publish triggered',
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
      service: 'kangur.social-posts.publish-scheduled',
      action: 'apiPublishScheduled',
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}
