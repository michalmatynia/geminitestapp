import { NextRequest, NextResponse } from 'next/server';

import {
  getKangurLearnerById,
  listKangurLearnerSessions,
  resolveKangurActor,
} from '@/features/kangur/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError } from '@/shared/errors/app-error';

export async function getKangurLearnerSessionsHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
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

  const history = await listKangurLearnerSessions({
    ownerUserId: actor.ownerUserId,
    learnerId: params.id,
  });

  return NextResponse.json(history, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
