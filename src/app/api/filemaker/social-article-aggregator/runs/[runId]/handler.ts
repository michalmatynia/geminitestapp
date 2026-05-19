import { type NextRequest, NextResponse } from 'next/server';

import { getSocialArticleScrapeRunById } from '@/features/filemaker/social/server/social-article-aggregator-repository';
import { resolveSocialPublishingActor } from '@/features/filemaker/social/server/social-publishing-actor';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { forbiddenError, notFoundError } from '@/shared/errors/app-error';

const resolveRunId = (params: { runId: string | string[] }): string => {
  const raw = Array.isArray(params.runId) ? (params.runId[0] ?? '') : params.runId;
  return decodeURIComponent(raw);
};

export async function getHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string | string[] }
): Promise<Response> {
  const actor = await resolveSocialPublishingActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can inspect article scrape runs.');
  }
  const run = await getSocialArticleScrapeRunById(resolveRunId(params));
  if (!run) {
    throw notFoundError('Article scrape run not found.');
  }
  return NextResponse.json(run, { headers: { 'Cache-Control': 'no-store' } });
}
