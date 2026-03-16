import { NextRequest, NextResponse } from 'next/server';

import { listKangurDuelOpponents } from '@/features/kangur/duels/server';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { requireActiveLearner, resolveKangurActor } from '@/features/kangur/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function getKangurDuelOpponentsHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const limitParam = req.nextUrl.searchParams.get('limit');
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
  const actor = await resolveKangurActor(req);
  const learner = requireActiveLearner(actor);
  const response = await listKangurDuelOpponents(learner, {
    ...(Number.isFinite(limit) ? { limit } : {}),
  });

  void logKangurServerEvent({
    source: 'kangur.duels.opponents',
    message: 'Kangur duel opponents requested',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 200,
    context: {
      entries: response.entries.length,
    },
  });

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
