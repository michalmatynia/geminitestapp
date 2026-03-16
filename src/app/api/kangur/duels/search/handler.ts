import { NextRequest, NextResponse } from 'next/server';

import { searchKangurDuelLearners } from '@/features/kangur/duels/server';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { requireActiveLearner, resolveKangurActor } from '@/features/kangur/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function getKangurDuelSearchHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const limitParam = req.nextUrl.searchParams.get('limit');
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
  const actor = await resolveKangurActor(req);
  const learner = requireActiveLearner(actor);
  const response = await searchKangurDuelLearners(learner, query, {
    ...(Number.isFinite(limit) ? { limit } : {}),
  });

  void logKangurServerEvent({
    source: 'kangur.duels.search',
    message: 'Kangur duel search requested',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 200,
    context: {
      entries: response.entries.length,
      queryLength: query.length,
    },
  });

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
