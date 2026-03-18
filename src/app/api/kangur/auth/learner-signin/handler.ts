import { NextRequest, NextResponse } from 'next/server';

import { findAuthUserById } from '@/features/auth/server';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { verifyKangurLearnerPassword } from '@/features/kangur/server';
import { setKangurLearnerSession } from '@/features/kangur/services/kangur-learner-session';
import { ActivityTypes } from '@/shared/constants/observability';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { authError } from '@/shared/errors/app-error';
import { logActivity } from '@/shared/utils/observability/activity-service';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import { parseKangurLearnerSignInPayload } from '@/shared/validations/kangur';
import { getSiteTranslator } from '@/shared/lib/i18n/server-translator';

import { readKangurAuthJsonBody } from '../shared';

export async function postKangurLearnerSignInHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const { t } = await getSiteTranslator({ request: req });
  const payload = parseKangurLearnerSignInPayload(
    await readKangurAuthJsonBody(req, 'learner sign-in', ctx.body)
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
    throw authError(t('KangurAuthApi.invalidLearnerCredentials'));
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
  void logActivity({
    type: ActivityTypes.KANGUR.LEARNER_SIGNIN,
    description: `Kangur learner signed in: ${learner.displayName}`,
    userId: learner.ownerUserId,
    entityId: learner.id,
    entityType: 'kangur_learner',
    metadata: {
      surface: 'kangur',
      actorType: 'learner',
      learnerId: learner.id,
      learnerDisplayName: learner.displayName,
      loginMethod: 'password',
    },
  }).catch((error) => {
    void ErrorSystem.captureException(error);
  });
  return response;
}
