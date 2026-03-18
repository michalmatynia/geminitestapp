import { NextRequest, NextResponse } from 'next/server';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { buildKangurDocContext, resolveKangurDocReferences } from '@/features/kangur/server/social-posts-docs';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError } from '@/shared/errors/app-error';

export async function getKangurSocialPostContextHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can load social post context.');
  }

  const url = new URL(req.url);
  const refsParam = url.searchParams.get('refs')?.trim() ?? '';
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
      service: 'kangur.social-posts.context',
      action: 'load',
    });
    throw error;
  }
}
