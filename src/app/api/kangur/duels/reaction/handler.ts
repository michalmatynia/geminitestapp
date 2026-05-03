import { type NextRequest, NextResponse } from 'next/server';

import { sendKangurDuelReaction } from '@/features/kangur/duels/server';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { requireActiveLearner, resolveKangurActor } from '@/features/kangur/server';
import { kangurDuelReactionInputSchema } from '@/shared/contracts/kangur-duels';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export async function postKangurDuelReactionHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const learner = requireActiveLearner(actor);
  const payload = kangurDuelReactionInputSchema.parse(ctx.body);
  const response = await sendKangurDuelReaction(learner, payload);

  void logKangurServerEvent({
    source: 'kangur.duels.reaction',
    message: 'Kangur duel reaction recorded',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 201,
    context: {
      sessionId: payload.sessionId,
      type: payload.type,
      reactionId: response.reaction.id,
    },
  });

  return NextResponse.json(response, { status: 201 });
}
