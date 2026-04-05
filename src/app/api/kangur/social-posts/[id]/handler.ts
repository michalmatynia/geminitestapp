import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import {
  deleteKangurSocialPost,
  getKangurSocialPostById,
  updateKangurSocialPost,
} from '@/features/kangur/social/server/social-posts-repository';
import { kangurSocialPostSchema } from '@/shared/contracts/kangur-social-posts';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { forbiddenError, notFoundError } from '@/shared/errors/app-error';

const updateSchema = z.object({
  updates: kangurSocialPostSchema.partial(),
});

export async function getKangurSocialPostHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const id = String(ctx.params?.['id'] ?? '');
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can access social posts.');
  }
  const post = await getKangurSocialPostById(id);
  if (!post) {
    throw notFoundError('Social post not found.');
  }
  void logKangurServerEvent({
    source: 'kangur.social-posts.get',
    message: 'Kangur social post retrieved',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 200,
    context: {
      postId: post.id,
      status: post.status,
    },
  });
  return NextResponse.json(post, { headers: { 'Cache-Control': 'no-store' } });
}

export async function patchKangurSocialPostHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const id = String(ctx.params?.['id'] ?? '');
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can update social posts.');
  }

  const parsed = updateSchema.parse(ctx.body ?? {});
  const { id: _id, ...updates } = parsed.updates ?? {};
  const updated = await updateKangurSocialPost(id, updates);
  if (!updated) {
    throw notFoundError('Social post not found.');
  }

  void logKangurServerEvent({
    source: 'kangur.social-posts.update',
    message: 'Kangur social post updated',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 200,
    context: {
      postId: updated.id,
      status: updated.status,
      updateKeys: Object.keys(updates),
      scheduledAt: updated.scheduledAt ?? null,
    },
  });

  return NextResponse.json(updated, { headers: { 'Cache-Control': 'no-store' } });
}

export async function deleteKangurSocialPostHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const id = String(ctx.params?.['id'] ?? '');
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can delete social posts.');
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
