import { type NextRequest, NextResponse } from 'next/server';

import {
  deleteSocialArticle,
  listSocialArticles,
  listSocialArticlesByIds,
} from '@/features/filemaker/social/server/social-article-aggregator-repository';
import { resolveSocialPublishingActor } from '@/features/filemaker/social/server/social-publishing-actor';
import { forbiddenError, notFoundError } from '@/shared/errors/app-error';

export async function getHandler(req: NextRequest): Promise<Response> {
  const actor = await resolveSocialPublishingActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can fetch article records.');
  }
  const params = new URL(req.url).searchParams;
  const rawIds = params.get('ids') ?? '';
  if (rawIds.length > 0) {
    const ids = rawIds.split(',').map((id) => id.trim()).filter(Boolean);
    const articles = await listSocialArticlesByIds(ids);
    return NextResponse.json(articles, { headers: { 'Cache-Control': 'no-store' } });
  }
  const limit = Math.min(Number(params.get('limit') ?? '50'), 200);
  const offset = Number(params.get('offset') ?? '0');
  const search = params.get('search') ?? '';
  const scrapeRunId = params.get('scrapeRunId') ?? '';
  const result = await listSocialArticles({ limit, offset, scrapeRunId, search });
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}

export async function deleteHandler(
  req: NextRequest,
  _ctx: unknown
): Promise<Response> {
  const actor = await resolveSocialPublishingActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can delete article records.');
  }
  const id = new URL(req.url).searchParams.get('id') ?? '';
  const deleted = await deleteSocialArticle(id);
  if (!deleted) throw notFoundError('Article not found.');
  return NextResponse.json(deleted, { headers: { 'Cache-Control': 'no-store' } });
}
