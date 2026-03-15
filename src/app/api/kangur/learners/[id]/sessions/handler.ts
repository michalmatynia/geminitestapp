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
  const searchParams = req.nextUrl.searchParams;
  const limitParam = searchParams.get('limit');
  const offsetParam = searchParams.get('offset');
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
  const offset = offsetParam ? Number.parseInt(offsetParam, 10) : undefined;
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
    limit: Number.isFinite(limit) ? limit : undefined,
    offset: Number.isFinite(offset) ? offset : undefined,
  });

  return NextResponse.json(history, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
