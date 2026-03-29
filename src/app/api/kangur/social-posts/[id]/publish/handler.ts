import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  kangurSocialPublishModeSchema,
  type KangurSocialPublishMode,
} from '@/shared/contracts/kangur-social-posts';
import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { getKangurSocialPostById } from '@/features/kangur/social/server/social-posts-repository';
import { publishKangurSocialPost } from '@/features/kangur/social/server/social-posts-publish';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError, notFoundError } from '@/shared/errors/app-error';

const bodySchema = z.object({
  mode: kangurSocialPublishModeSchema.optional(),
  skipImages: z.boolean().optional(),
});

export async function postKangurSocialPostPublishHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const id = String(ctx.params?.['id'] ?? '');
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can publish social posts.');
  }

  const post = await getKangurSocialPostById(id);
  if (!post) {
    throw notFoundError('Social post not found.');
  }

  const parsed = bodySchema.parse(ctx.body ?? {});
  const mode: KangurSocialPublishMode = parsed.mode === 'draft' ? 'draft' : 'published';

  const startedAt = Date.now();
  try {
    const published = await publishKangurSocialPost(post, { mode, skipImages: parsed.skipImages });
    void logKangurServerEvent({
      source: 'kangur.social-posts.publish',
      message: 'Kangur social post published to LinkedIn',
      request: req,
      requestContext: ctx,
      actor,
      statusCode: 200,
      context: {
        postId: published.id,
        status: published.status,
        linkedinPostId: published.linkedinPostId ?? null,
        publishMode: mode,
        durationMs: Date.now() - startedAt,
      },
    });
    return NextResponse.json(published, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'kangur.social-posts.publish',
      action: 'apiPublish',
      postId: post.id,
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}
