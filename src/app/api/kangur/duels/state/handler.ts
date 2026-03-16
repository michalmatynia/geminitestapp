import { NextRequest, NextResponse } from 'next/server';

import { getKangurDuelState } from '@/features/kangur/duels/server';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { requireActiveLearner, resolveKangurActor } from '@/features/kangur/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

export async function getKangurDuelStateHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const sessionId = req.nextUrl.searchParams.get('sessionId')?.trim();
  if (!sessionId) {
    throw badRequestError('sessionId query param is required.');
  }

  const actor = await resolveKangurActor(req);
  const learner = requireActiveLearner(actor);
  const response = await getKangurDuelState(learner, sessionId);

  void logKangurServerEvent({
    source: 'kangur.duels.state',
    message: 'Kangur duel state requested',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 200,
    context: {
      sessionId: response.session.id,
      status: response.session.status,
    },
  });

  return NextResponse.json(response);
}
