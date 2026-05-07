import { randomUUID } from 'crypto';

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveSocialPublishingActor } from '@/features/filemaker/social/server/social-publishing-actor';
import { logSocialPublishingServerEvent } from '@/features/filemaker/social/server/social-publishing-observability';
import {
  deleteSocialPublishingPost,
  getSocialPublishingPostById,
  type SocialPublishingPostListStatus,
  listSocialPublishingPosts,
  listSocialPublishingPostsPage,
  listPublishedSocialPublishingPosts,
  upsertSocialPublishingPost,
} from '@/features/filemaker/social/server/social-posts-repository';
import { socialPublishingPostSchema } from '@/shared/contracts/social-publishing-posts';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, forbiddenError, notFoundError } from '@/shared/errors/app-error';
import {
  optionalIntegerQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  scope: optionalTrimmedQueryString(z.enum(['public', 'admin'])),
  limit: optionalIntegerQuerySchema(z.number().int().min(1).max(50)),
  page: optionalIntegerQuerySchema(z.number().int().min(1).max(10_000)),
  pageSize: optionalIntegerQuerySchema(z.number().int().min(1).max(50)),
  search: optionalTrimmedQueryString(z.string().max(200)),
  status: optionalTrimmedQueryString(
    z.enum(['all', 'draft', 'scheduled', 'published', 'failed'])
  ),
});

export const deleteSocialPostsQuerySchema = z.object({
  id: optionalTrimmedQueryString(z.string().min(1)),
});

const bodySchema = z.object({
  post: socialPublishingPostSchema.partial(),
});

export async function getSocialPublishingPostsHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = querySchema.parse(ctx.query ?? {});
  const scope = query.scope === 'admin' ? 'admin' : 'public';

  if (scope === 'admin') {
    const actor = await resolveSocialPublishingActor(req);
    if (actor.role !== 'admin') {
      throw forbiddenError('Only admins can access all social posts.');
    }
    const shouldReturnPagedPayload =
      query.page !== undefined ||
      query.pageSize !== undefined ||
      query.search !== undefined ||
      query.status !== undefined;
    const posts = shouldReturnPagedPayload
      ? await listSocialPublishingPostsPage({
          page: query.page,
          pageSize: query.pageSize,
          search: query.search,
          status: query.status as SocialPublishingPostListStatus | undefined,
        })
      : await listSocialPublishingPosts();
    void logSocialPublishingServerEvent({
      source: 'social-publishing.posts.list',
      message: 'Social publishing posts listed',
      request: req,
      requestContext: ctx,
      actor,
      statusCode: 200,
      context: {
        scope,
        count: Array.isArray(posts) ? posts.length : posts.total,
        page: Array.isArray(posts) ? null : posts.page,
        pageSize: Array.isArray(posts) ? null : posts.pageSize,
        search: query.search ?? null,
        status: (query.status as SocialPublishingPostListStatus | undefined) ?? null,
      },
    });
    return NextResponse.json(posts, { headers: { 'Cache-Control': 'no-store' } });
  }

  const limit = query.limit ?? 8;
  const posts = await listPublishedSocialPublishingPosts(limit);
  return NextResponse.json(posts, { headers: { 'Cache-Control': 'no-store' } });
}

export async function postSocialPublishingPostsHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveSocialPublishingActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can create Social publishing posts.');
  }

  const parsed = bodySchema.parse(ctx.body ?? {});
  const postInput = parsed.post ?? {};
  const id = typeof postInput.id === 'string' && postInput.id.trim() ? postInput.id.trim() : randomUUID();
  const post = socialPublishingPostSchema.parse({
    ...postInput,
    id,
  });
  const saved = await upsertSocialPublishingPost(post);

  void logSocialPublishingServerEvent({
    source: 'social-publishing.posts.create',
    message: 'Social publishing post saved',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 200,
    context: {
      postId: saved.id,
      status: saved.status,
      scheduledAt: saved.scheduledAt ?? null,
      hasPublishingConnection: Boolean(saved.publishingConnectionId),
    },
  });

  return NextResponse.json(saved, { headers: { 'Cache-Control': 'no-store' } });
}

export async function deleteSocialPublishingPostsHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = deleteSocialPostsQuerySchema.parse(ctx.query ?? {});
  const id = query.id?.trim();
  if (!id) {
    throw badRequestError('Missing social post id.');
  }
  const actor = await resolveSocialPublishingActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can delete social posts.');
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
