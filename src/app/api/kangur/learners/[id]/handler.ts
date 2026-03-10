import { NextRequest, NextResponse } from 'next/server';

import { logKangurServerEvent } from '@/features/kangur/observability/server';
import {
  getKangurLearnerById,
  resolveKangurActor,
  updateKangurLearner,
} from '@/features/kangur/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError } from '@/shared/errors/app-error';
import { parseKangurLearnerUpdatePayload } from '@/shared/validations/kangur';


import { readKangurAuthJsonBody } from '../../auth/shared';

export async function patchKangurLearnerHandler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (!actor.canManageLearners) {
    throw forbiddenError('Only parent accounts can manage learners.');
  }

  const learner = await getKangurLearnerById(params.id);
  if (learner?.ownerUserId !== actor.ownerUserId) {
    throw forbiddenError('This learner does not belong to the current parent account.', {
      learnerId: params.id,
    });
  }
  const payload = parseKangurLearnerUpdatePayload(
    await readKangurAuthJsonBody(req, 'learner update', ctx.body)
  );
  const updatedLearner = await updateKangurLearner(params.id, payload);
  void logKangurServerEvent({
    source: 'kangur.learners.update',
    message: 'Kangur learner updated',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 200,
    context: {
      learnerId: updatedLearner.id,
      learnerStatus: updatedLearner.status,
      updatedFields: Object.keys(payload),
    },
  });
  return NextResponse.json(updatedLearner);
}
