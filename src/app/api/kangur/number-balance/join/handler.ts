import { NextRequest, NextResponse } from 'next/server';

import { joinNumberBalanceMatch } from '@/features/kangur/number-balance';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { requireActiveLearner, resolveKangurActor } from '@/features/kangur/server';
import { numberBalanceMatchJoinInputSchema } from '@/shared/contracts/kangur-multiplayer-number-balance';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function postNumberBalanceJoinHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const learner = requireActiveLearner(actor);
  const payload = numberBalanceMatchJoinInputSchema.parse(ctx.body);
  const response = await joinNumberBalanceMatch(learner, payload);

  void logKangurServerEvent({
    source: 'kangur.number-balance.join',
    message: 'Number balance match joined',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 200,
    context: {
      matchId: response.match.matchId,
    },
  });

  return NextResponse.json(response);
}
