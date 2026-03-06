import { NextRequest, NextResponse } from 'next/server';

import { findAuthUserById } from '@/features/auth/server';
import { verifyKangurLearnerPassword } from '@/features/kangur/server';
import { authError } from '@/shared/errors/app-error';
import { parseKangurLearnerSignInPayload } from '@/shared/validations/kangur';
import { setKangurLearnerSession } from '@/features/kangur/services/kangur-learner-session';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

import { readKangurAuthJsonBody } from '../shared';

export async function postKangurLearnerSignInHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const payload = parseKangurLearnerSignInPayload(
    await readKangurAuthJsonBody(req, 'learner sign-in')
  );
  const learner = await verifyKangurLearnerPassword(payload.loginName, payload.password);
  if (!learner) {
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
  return response;
}
