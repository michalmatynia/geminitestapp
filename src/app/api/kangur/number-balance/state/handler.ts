import { NextRequest, NextResponse } from 'next/server';

import { getNumberBalanceMatchState } from '@/features/kangur/number-balance';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { requireActiveLearner, resolveKangurActor } from '@/features/kangur/server';
import { numberBalanceMatchStateInputSchema } from '@/shared/contracts/kangur-multiplayer-number-balance';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function postNumberBalanceStateHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const learner = requireActiveLearner(actor);
  const payload = numberBalanceMatchStateInputSchema.parse(ctx.body);
  const response = await getNumberBalanceMatchState(learner, payload);

  void logKangurServerEvent({
    source: 'kangur.number-balance.state',
    message: 'Number balance match state fetched',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 200,
    context: {
      matchId: payload.matchId,
    },
  });

  return NextResponse.json(response);
}
