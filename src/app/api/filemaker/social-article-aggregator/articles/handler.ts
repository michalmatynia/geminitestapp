import { type NextRequest, NextResponse } from 'next/server';

import {
  deleteSocialArticle,
  listSocialArticles,
  listSocialArticlesByIds,
} from '@/features/filemaker/social/server/social-article-aggregator-repository';
import { resolveSocialPublishingActor } from '@/features/filemaker/social/server/social-publishing-actor';
import { forbiddenError, notFoundError } from '@/shared/errors/app-error';

const requireAdmin = async (req: NextRequest, message: string): Promise<void> => {
  const actor = await resolveSocialPublishingActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError(message);
  }
};

const splitArticleIds = (rawIds: string): string[] =>
  rawIds.split(',').map((id) => id.trim()).filter(Boolean);

const parseArticleListOptions = (
  params: URLSearchParams
): Parameters<typeof listSocialArticles>[0] => ({
  limit: Math.min(Number(params.get('limit') ?? '50'), 200),
  offset: Number(params.get('offset') ?? '0'),
  scrapeRunId: params.get('scrapeRunId') ?? '',
  search: params.get('search') ?? '',
  sourcePresetId: params.get('sourcePresetId') ?? '',
});

export async function getHandler(req: NextRequest): Promise<Response> {
  await requireAdmin(req, 'Only admins can fetch article records.');
  const params = new URL(req.url).searchParams;
  const rawIds = params.get('ids') ?? '';
  if (rawIds.length > 0) {
    const articles = await listSocialArticlesByIds(splitArticleIds(rawIds));
    return NextResponse.json(articles, { headers: { 'Cache-Control': 'no-store' } });
  }
  const result = await listSocialArticles(parseArticleListOptions(params));
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}

export async function deleteHandler(
  req: NextRequest,
  _ctx: unknown
): Promise<Response> {
  await requireAdmin(req, 'Only admins can delete article records.');
  const id = new URL(req.url).searchParams.get('id') ?? '';
  const deleted = await deleteSocialArticle(id);
  if (!deleted) throw notFoundError('Article not found.');
  return NextResponse.json(deleted, { headers: { 'Cache-Control': 'no-store' } });
}
