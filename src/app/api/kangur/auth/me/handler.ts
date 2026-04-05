import { NextRequest, NextResponse } from 'next/server';

import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { resolveKangurActor, toKangurAuthUser } from '@/features/kangur/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { AppErrorCodes, isAppError } from '@/shared/errors/app-error';

export async function getKangurAuthMeHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  let actor;
  try {
    actor = await resolveKangurActor(req);
  } catch (error) {
    if (isAppError(error) && error.code === AppErrorCodes.unauthorized) {
      return NextResponse.json(
        {
          error: 'Authentication required.',
          code: AppErrorCodes.unauthorized,
        },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }
    throw error;
  }
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
