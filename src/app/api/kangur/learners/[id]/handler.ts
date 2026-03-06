import { NextRequest, NextResponse } from 'next/server';

import {
  getKangurLearnerById,
  resolveKangurActor,
  updateKangurLearner,
} from '@/features/kangur/server';
import { forbiddenError } from '@/shared/errors/app-error';
import { parseKangurLearnerUpdatePayload } from '@/shared/validations/kangur';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

import { readKangurAuthJsonBody } from '../../auth/shared';

const requireOwnedLearner = async (request: NextRequest, learnerId: string) => {
  const actor = await resolveKangurActor(request);
  if (!actor.canManageLearners) {
    throw forbiddenError('Only parent accounts can manage learners.');
  }

  const learner = await getKangurLearnerById(learnerId);
  if (learner?.ownerUserId !== actor.ownerUserId) {
    throw forbiddenError('This learner does not belong to the current parent account.', {
      learnerId,
    });
  }

  return learner;
};

export async function patchKangurLearnerHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  await requireOwnedLearner(req, params.id);
  const payload = parseKangurLearnerUpdatePayload(
    await readKangurAuthJsonBody(req, 'learner update')
  );
  const learner = await updateKangurLearner(params.id, payload);
  return NextResponse.json(learner);
}
