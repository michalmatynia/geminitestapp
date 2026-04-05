import { NextRequest, NextResponse } from 'next/server';

import { createNumberBalanceMatch } from '@/features/kangur/number-balance';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { requireActiveLearner, resolveKangurActor } from '@/features/kangur/server';
import { numberBalanceMatchCreateInputSchema } from '@/shared/contracts/kangur-multiplayer-number-balance';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

export async function postNumberBalanceCreateHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const learner = requireActiveLearner(actor);
  const payload = numberBalanceMatchCreateInputSchema.parse(ctx.body);
  const response = await createNumberBalanceMatch(learner, payload);

  void logKangurServerEvent({
    source: 'kangur.number-balance.create',
    message: 'Number balance match created',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 201,
    context: {
      matchId: response.match.matchId,
    },
  });

  return NextResponse.json(response, { status: 201 });
}
