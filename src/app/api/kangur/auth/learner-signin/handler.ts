import { NextRequest, NextResponse } from 'next/server';

import { findAuthUserById } from '@/features/auth/server';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { verifyKangurLearnerPassword } from '@/features/kangur/server';
import { authError } from '@/shared/errors/app-error';
import { parseKangurLearnerSignInPayload } from '@/shared/validations/kangur';
import { setKangurLearnerSession } from '@/features/kangur/services/kangur-learner-session';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

import { readKangurAuthJsonBody } from '../shared';

export async function postKangurLearnerSignInHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const payload = parseKangurLearnerSignInPayload(
    await readKangurAuthJsonBody(req, 'learner sign-in')
  );
  const learner = await verifyKangurLearnerPassword(payload.loginName, payload.password);
  if (!learner) {
    void logKangurServerEvent({
      level: 'warn',
      source: 'kangur.auth.learnerSignIn.failed',
      message: 'Kangur learner sign-in failed',
      request: req,
      requestContext: ctx,
      statusCode: 401,
      context: {
        reason: 'invalid_credentials',
      },
    });
    throw authError('Invalid learner login name or password.');
  }

  const owner = await findAuthUserById(learner.ownerUserId);
  const response = NextResponse.json({
    ok: true,
    learnerId: learner.id,
    ownerEmail: owner?.email ?? null,
  });
  setKangurLearnerSession(response, {
    learnerId: learner.id,
    ownerUserId: learner.ownerUserId,
  });
  void logKangurServerEvent({
    source: 'kangur.auth.learnerSignIn.success',
    message: 'Kangur learner sign-in succeeded',
    request: req,
    requestContext: ctx,
    statusCode: 200,
    context: {
      learnerId: learner.id,
      ownerUserId: learner.ownerUserId,
      learnerStatus: learner.status,
    },
  });
  return response;
}
