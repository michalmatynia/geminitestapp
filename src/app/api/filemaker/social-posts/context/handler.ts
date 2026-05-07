import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveSocialPublishingActor } from '@/features/filemaker/social/server/social-publishing-actor';
import { buildKangurDocContext, resolveKangurDocReferences } from '@/features/filemaker/social/server/social-posts-docs';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { forbiddenError } from '@/shared/errors/app-error';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  refs: optionalTrimmedQueryString(z.string().min(1)),
});

export async function getSocialPublishingPostContextHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveSocialPublishingActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can load social post context.');
  }

  const query = querySchema.parse(ctx.query ?? {});
  const refsParam = query.refs?.trim() ?? '';
  const refs = refsParam
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);

  try {
    const entries = resolveKangurDocReferences(refs);
    const { context, summary } = await buildKangurDocContext(entries);

    return NextResponse.json(
      { context, summary, docCount: entries.length },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'social-publishing.posts.context',
      action: 'load',
    });
    throw error;
  }
}
