import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveSocialPublishingActor } from '@/features/filemaker/social/server/social-publishing-actor';
import { logSocialPublishingServerEvent } from '@/features/filemaker/social/server/social-publishing-observability';
import {
  deleteSocialPublishingPost,
  getSocialPublishingPostById,
  updateSocialPublishingPost,
} from '@/features/filemaker/social/server/social-posts-repository';
import { socialPublishingPostSchema } from '@/shared/contracts/social-publishing-posts';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { forbiddenError, notFoundError } from '@/shared/errors/app-error';

const updateSchema = z.object({
  updates: socialPublishingPostSchema.partial(),
});

export async function getSocialPublishingPostHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const id = String(ctx.params?.['id'] ?? '');
  const actor = await resolveSocialPublishingActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can access social posts.');
  }
  const post = await getSocialPublishingPostById(id);
  if (!post) {
    throw notFoundError(`Social post "${id}" not found. The post may have been deleted or the id is incorrect.`);
  }
  void logSocialPublishingServerEvent({
    source: 'social-publishing.posts.get',
    message: 'Social publishing post retrieved',
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

export async function patchSocialPublishingPostHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const id = String(ctx.params?.['id'] ?? '');
  const actor = await resolveSocialPublishingActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can update social posts.');
  }

  const parsed = updateSchema.parse(ctx.body ?? {});
  const { id: _id, ...updates } = parsed.updates ?? {};
  const updated = await updateSocialPublishingPost(id, updates);
  if (!updated) {
    throw notFoundError(`Social post "${id}" not found. The post may have been deleted or the id is incorrect.`);
  }

  void logSocialPublishingServerEvent({
    source: 'social-publishing.posts.update',
    message: 'Social publishing post updated',
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

export async function deleteSocialPublishingPostHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const id = String(ctx.params?.['id'] ?? '');
  const actor = await resolveSocialPublishingActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can delete social posts.');
  }
  const post = await getSocialPublishingPostById(id);
  if (!post) {
    throw notFoundError(`Social post "${id}" not found. The post may have been deleted or the id is incorrect.`);
  }
  const deleted = await deleteSocialPublishingPost(id);
  if (!deleted) {
    throw notFoundError(`Social post "${id}" could not be deleted. The post may have already been deleted.`);
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
