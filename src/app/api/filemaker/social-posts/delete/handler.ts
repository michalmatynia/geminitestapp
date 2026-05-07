import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveSocialPublishingActor } from '@/features/filemaker/social/server/social-publishing-actor';
import { logSocialPublishingServerEvent } from '@/features/filemaker/social/server/social-publishing-observability';
import {
  deleteSocialPublishingPost,
  getSocialPublishingPostById,
} from '@/features/filemaker/social/server/social-posts-repository';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, forbiddenError, notFoundError } from '@/shared/errors/app-error';

const bodySchema = z.object({
  id: z.string().trim().min(1),
});

export async function postSocialPublishingPostsDeleteHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveSocialPublishingActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can delete social posts.');
  }

  const parsed = bodySchema.parse(ctx.body ?? {});
  const id = parsed.id.trim();
  if (!id) {
    throw badRequestError('Missing social post id.');
  }

  const post = await getSocialPublishingPostById(id);
  if (!post) {
    throw notFoundError('Social post not found.');
  }
  const deleted = await deleteSocialPublishingPost(id);
  if (!deleted) {
    throw notFoundError('Social post not found.');
  }

  void logSocialPublishingServerEvent({
    source: 'social-publishing.posts.delete',
    message: 'Social publishing post deleted',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 200,
    context: {
      postId: deleted.id,
      status: deleted.status,
    },
  });

  return NextResponse.json(deleted, { headers: { 'Cache-Control': 'no-store' } });
}
