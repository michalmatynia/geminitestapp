import { randomUUID } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import {
  deleteKangurSocialPost,
  getKangurSocialPostById,
  listKangurSocialPosts,
  listPublishedKangurSocialPosts,
  upsertKangurSocialPost,
} from '@/features/kangur/server/social-posts-repository';
import { kangurSocialPostSchema } from '@/shared/contracts/kangur-social-posts';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, forbiddenError, notFoundError } from '@/shared/errors/app-error';
import {
  optionalIntegerQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  scope: optionalTrimmedQueryString(z.enum(['public', 'admin'])),
  limit: optionalIntegerQuerySchema(z.number().int().min(1).max(50)),
});

export const deleteSocialPostsQuerySchema = z.object({
  id: optionalTrimmedQueryString(z.string().min(1)),
});

const bodySchema = z.object({
  post: kangurSocialPostSchema.partial(),
});

export async function getKangurSocialPostsHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = querySchema.parse(ctx.query ?? {});
  const scope = query.scope === 'admin' ? 'admin' : 'public';

  if (scope === 'admin') {
    const actor = await resolveKangurActor(req);
    if (actor.role !== 'admin') {
      throw forbiddenError('Only admins can access all social posts.');
    }
    const posts = await listKangurSocialPosts();
    void logKangurServerEvent({
      source: 'kangur.social-posts.list',
      message: 'Kangur social posts listed',
      request: req,
      requestContext: ctx,
      actor,
      statusCode: 200,
      context: {
        scope,
        count: posts.length,
      },
    });
    return NextResponse.json(posts, { headers: { 'Cache-Control': 'no-store' } });
  }

  const limit = query.limit ?? 8;
  const posts = await listPublishedKangurSocialPosts(limit);
  return NextResponse.json(posts, { headers: { 'Cache-Control': 'no-store' } });
}

export async function postKangurSocialPostsHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can create Kangur social posts.');
  }

  const parsed = bodySchema.parse(ctx.body ?? {});
  const postInput = parsed.post ?? {};
  const id = typeof postInput.id === 'string' && postInput.id.trim() ? postInput.id.trim() : randomUUID();
  const post = kangurSocialPostSchema.parse({
    ...postInput,
    id,
  });
  const saved = await upsertKangurSocialPost(post);

  void logKangurServerEvent({
    source: 'kangur.social-posts.create',
    message: 'Kangur social post saved',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 200,
    context: {
      postId: saved.id,
      status: saved.status,
      scheduledAt: saved.scheduledAt ?? null,
      hasLinkedInConnection: Boolean(saved.linkedinConnectionId),
    },
  });

  return NextResponse.json(saved, { headers: { 'Cache-Control': 'no-store' } });
}

export async function deleteKangurSocialPostsHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = deleteSocialPostsQuerySchema.parse(ctx.query ?? {});
  const id = query.id?.trim();
  if (!id) {
    throw badRequestError('Missing social post id.');
  }
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
