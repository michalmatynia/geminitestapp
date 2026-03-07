import { NextRequest, NextResponse } from 'next/server';

import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { createKangurLearner, resolveKangurActor } from '@/features/kangur/server';
import { forbiddenError } from '@/shared/errors/app-error';
import { parseKangurLearnerCreatePayload } from '@/shared/validations/kangur';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

import { readKangurAuthJsonBody } from '../auth/shared';

const requireParentActor = async (request: NextRequest) => {
  const actor = await resolveKangurActor(request);
  if (!actor.canManageLearners) {
    throw forbiddenError('Only parent accounts can manage learners.');
  }
  return actor;
};

export async function getKangurLearnersHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await requireParentActor(req);
  return NextResponse.json(actor.learners);
}

export async function postKangurLearnersHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await requireParentActor(req);
  const payload = parseKangurLearnerCreatePayload(await readKangurAuthJsonBody(req, 'learner'));
  const learner = await createKangurLearner({
    ownerUserId: actor.ownerUserId,
    learner: payload,
  });
  void logKangurServerEvent({
    source: 'kangur.learners.create',
    message: 'Kangur learner created',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 201,
    context: {
      learnerId: learner.id,
      learnerStatus: learner.status,
    },
  });
  return NextResponse.json(learner, { status: 201 });
}
