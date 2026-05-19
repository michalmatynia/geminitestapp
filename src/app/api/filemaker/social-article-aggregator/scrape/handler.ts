import { type NextRequest, NextResponse } from 'next/server';

import { runSocialArticleAggregatorScrape } from '@/features/filemaker/social/server/social-article-aggregator-scrape';
import { resolveSocialPublishingActor } from '@/features/filemaker/social/server/social-publishing-actor';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { forbiddenError } from '@/shared/errors/app-error';

export async function postHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveSocialPublishingActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can run article aggregation scrapes.');
  }
  const result = await runSocialArticleAggregatorScrape(ctx.body ?? {});
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
