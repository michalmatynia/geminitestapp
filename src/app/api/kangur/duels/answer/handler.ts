import { NextRequest, NextResponse } from 'next/server';

import { submitKangurDuelAnswer } from '@/features/kangur/duels/server';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { requireActiveLearner, resolveKangurActor } from '@/features/kangur/server';
import { kangurDuelAnswerInputSchema } from '@/shared/contracts/kangur-duels';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export async function postKangurDuelAnswerHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const learner = requireActiveLearner(actor);
  const payload = kangurDuelAnswerInputSchema.parse(ctx.body);
  const response = await submitKangurDuelAnswer(learner, payload);

  void logKangurServerEvent({
    source: 'kangur.duels.answer',
    message: 'Kangur duel answer recorded',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 200,
    context: {
      sessionId: response.session.id,
      questionIndex: response.session.currentQuestionIndex,
      status: response.session.status,
    },
  });

  return NextResponse.json(response);
}
