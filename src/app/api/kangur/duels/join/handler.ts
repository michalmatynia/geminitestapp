import { NextRequest, NextResponse } from 'next/server';

import { joinKangurDuelSession } from '@/features/kangur/duels/server';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { requireActiveLearner, resolveKangurActor } from '@/features/kangur/server';
import { kangurDuelJoinInputSchema } from '@/shared/contracts/kangur-duels';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function postKangurDuelJoinHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const learner = requireActiveLearner(actor);
  const payload = kangurDuelJoinInputSchema.parse(ctx.body);
  const response = await joinKangurDuelSession(learner, payload);

  void logKangurServerEvent({
    source: 'kangur.duels.join',
    message: 'Kangur duel session joined',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 200,
    context: {
      sessionId: response.session.id,
      mode: response.session.mode,
    },
  });

  return NextResponse.json(response);
}
