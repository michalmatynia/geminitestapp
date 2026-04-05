import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import {
  deleteKangurSocialPost,
  getKangurSocialPostById,
} from '@/features/kangur/social/server/social-posts-repository';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { badRequestError, forbiddenError, notFoundError } from '@/shared/errors/app-error';

const bodySchema = z.object({
  id: z.string().trim().min(1),
});

export async function postKangurSocialPostsDeleteHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can delete social posts.');
  }

  const parsed = bodySchema.parse(ctx.body ?? {});
  const id = parsed.id.trim();
  if (!id) {
    throw badRequestError('Missing social post id.');
  }

  const post = await getKangurSocialPostById(id);
  if (!post) {
    throw notFoundError('Social post not found.');
  }
  const deleted = await deleteKangurSocialPost(id);
  if (!deleted) {
    throw notFoundError('Social post not found.');
  }

  void logKangurServerEvent({
    source: 'kangur.social-posts.delete',
    message: 'Kangur social post deleted',
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
