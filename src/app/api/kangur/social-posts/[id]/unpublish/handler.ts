import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { getKangurSocialPostById } from '@/features/kangur/social/server/social-posts-repository';
import { unpublishKangurSocialPost } from '@/features/kangur/social/server/social-posts-publish';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError, notFoundError } from '@/shared/errors/app-error';

const bodySchema = z.object({
  keepLocal: z.boolean().optional(),
});

export async function postKangurSocialPostUnpublishHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const id = String(ctx.params?.['id'] ?? '');
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can unpublish social posts.');
  }

  const post = await getKangurSocialPostById(id);
  if (!post) {
    throw notFoundError('Social post not found.');
  }

  const parsed = bodySchema.parse(ctx.body ?? {});
  const startedAt = Date.now();
  try {
    const result = await unpublishKangurSocialPost(post, { keepLocal: parsed.keepLocal });
    void logKangurServerEvent({
      source: 'kangur.social-posts.unpublish',
      message: parsed.keepLocal
        ? 'Kangur social post unpublished from LinkedIn (kept locally)'
        : 'Kangur social post unpublished from LinkedIn',
      request: req,
      requestContext: ctx,
      actor,
      statusCode: 200,
      context: {
        postId: result.id,
        status: result.status,
        linkedinPostId: result.linkedinPostId ?? null,
        keepLocal: parsed.keepLocal ?? false,
        durationMs: Date.now() - startedAt,
      },
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'kangur.social-posts.unpublish',
      action: 'apiUnpublish',
      postId: post.id,
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}
