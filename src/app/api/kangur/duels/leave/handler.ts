import { type NextRequest, NextResponse } from 'next/server';

import { leaveKangurDuelSession } from '@/features/kangur/duels/server';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { requireActiveLearner, resolveKangurActor } from '@/features/kangur/server';
import { kangurDuelLeaveInputSchema } from '@/shared/contracts/kangur-duels';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export async function postKangurDuelLeaveHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const learner = requireActiveLearner(actor);
  const payload = kangurDuelLeaveInputSchema.parse(ctx.body);
  const response = await leaveKangurDuelSession(learner, payload);

  void logKangurServerEvent({
    source: 'kangur.duels.leave',
    message: 'Kangur duel session left',
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
