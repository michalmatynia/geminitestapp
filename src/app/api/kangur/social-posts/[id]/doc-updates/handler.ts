import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import {
  getKangurSocialPostById,
  updateKangurSocialPost,
} from '@/features/kangur/server/social-posts-repository';
import { planKangurSocialDocUpdates } from '@/features/kangur/server/social-posts-doc-updates';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError, notFoundError } from '@/shared/errors/app-error';

const bodySchema = z.object({
  mode: z.enum(['preview', 'apply']).optional(),
});

export async function postKangurSocialPostDocUpdatesHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const id = String(ctx.params?.['id'] ?? '');
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can apply documentation updates.');
  }

  const post = await getKangurSocialPostById(id);
  if (!post) {
    throw notFoundError('Social post not found.');
  }

  const parsed = bodySchema.parse(ctx.body ?? {});
  const apply = parsed.mode === 'apply';
  const startedAt = Date.now();

  try {
    const plan = await planKangurSocialDocUpdates(post, { apply });
    const appliedFiles = plan.files.filter((file) => file.applied);
    const shouldMarkApplied = apply && appliedFiles.length > 0;
    const updatedPost = shouldMarkApplied
      ? await updateKangurSocialPost(post.id, {
        docUpdatesAppliedAt: new Date().toISOString(),
        docUpdatesAppliedBy: actor.actorId,
      })
      : post;

    void logKangurServerEvent({
      source: 'kangur.social-posts.doc-updates',
      message: apply
        ? 'Kangur social post doc updates applied'
        : 'Kangur social post doc updates previewed',
      request: req,
      requestContext: ctx,
      actor,
      statusCode: 200,
      context: {
        postId: post.id,
        mode: apply ? 'apply' : 'preview',
        fileCount: plan.files.length,
        appliedFileCount: appliedFiles.length,
        updateCount: plan.items.length,
        durationMs: Date.now() - startedAt,
      },
    });

    return NextResponse.json(
      {
        applied: apply,
        plan,
        post: updatedPost,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'kangur.social-posts.doc-updates',
      action: apply ? 'apply' : 'preview',
      postId: post.id,
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}
