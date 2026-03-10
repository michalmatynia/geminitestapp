import { NextRequest, NextResponse } from 'next/server';

import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { resolveKangurActor, toKangurAuthUser } from '@/features/kangur/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function getKangurAuthMeHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const authUser = toKangurAuthUser(actor);

  void logKangurServerEvent({
    source: 'kangur.auth.me',
    message: 'Kangur auth user resolved',
    service: 'kangur.auth',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 200,
    context: {
      role: authUser.role,
      actorType: authUser.actorType,
      learnerCount: authUser.learners.length,
      hasActiveLearner: Boolean(authUser.activeLearner),
    },
  });

  return NextResponse.json(authUser, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
