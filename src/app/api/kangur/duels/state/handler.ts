import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getKangurDuelState } from '@/features/kangur/duels/server';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { requireActiveLearner, resolveKangurActor } from '@/features/kangur/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { validationError } from '@/shared/errors/app-error';

const querySchema = z.object({
  sessionId: z.string().trim().min(1, 'Session id is required'),
});

export async function getKangurDuelStateHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const parsedQuery = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries())
  );
  if (!parsedQuery.success) {
    throw validationError('Invalid query parameters', {
      issues: parsedQuery.error.flatten(),
    });
  }
  const { sessionId } = parsedQuery.data;

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
