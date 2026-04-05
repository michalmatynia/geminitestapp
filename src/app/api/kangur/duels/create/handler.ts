import { NextRequest, NextResponse } from 'next/server';

import { createKangurDuelSession } from '@/features/kangur/duels/server';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { requireActiveLearner, resolveKangurActor } from '@/features/kangur/server';
import { kangurDuelCreateInputSchema } from '@/shared/contracts/kangur-duels';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

export async function postKangurDuelCreateHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const learner = requireActiveLearner(actor);
  const payload = kangurDuelCreateInputSchema.parse(ctx.body);
  const response = await createKangurDuelSession(learner, payload);

  void logKangurServerEvent({
    source: 'kangur.duels.create',
    message: 'Kangur duel session created',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 201,
    context: {
      sessionId: response.session.id,
      mode: response.session.mode,
    },
  });

  return NextResponse.json(response, { status: 201 });
}
