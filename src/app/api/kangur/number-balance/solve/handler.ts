import { type NextRequest, NextResponse } from 'next/server';

import { submitNumberBalanceSolveAttempt } from '@/features/kangur/number-balance';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { requireActiveLearner, resolveKangurActor } from '@/features/kangur/server';
import { numberBalanceSolveAttemptSchema } from '@/shared/contracts/kangur-multiplayer-number-balance';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export async function postNumberBalanceSolveHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const learner = requireActiveLearner(actor);
  const payload = numberBalanceSolveAttemptSchema.parse(ctx.body);
  const response = await submitNumberBalanceSolveAttempt(learner, payload);

  void logKangurServerEvent({
    source: 'kangur.number-balance.solve',
    message: 'Number balance solve attempt processed',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 200,
    context: {
      matchId: payload.matchId,
      puzzleId: payload.puzzleId,
      accepted: response.events[0]?.type === 'solve_result'
        ? response.events[0].accepted
        : undefined,
    },
  });

  return NextResponse.json(response);
}
