import { type NextRequest, NextResponse } from 'next/server';

import { listSocialArticleScrapeRuns } from '@/features/filemaker/social/server/social-article-aggregator-repository';
import { resolveSocialPublishingActor } from '@/features/filemaker/social/server/social-publishing-actor';
import { forbiddenError } from '@/shared/errors/app-error';

export async function getHandler(req: NextRequest): Promise<Response> {
  const actor = await resolveSocialPublishingActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can list article scrape runs.');
  }
  const limit = Math.min(Number(new URL(req.url).searchParams.get('limit') ?? '20'), 100);
  const runs = await listSocialArticleScrapeRuns({ limit });
  return NextResponse.json(runs, { headers: { 'Cache-Control': 'no-store' } });
}
