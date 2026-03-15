import { NextRequest, NextResponse } from 'next/server';

import {
  getKangurLearnerActivityRepository,
  requireActiveLearner,
  resolveKangurActor,
} from '@/features/kangur/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError } from '@/shared/errors/app-error';
import { parseKangurLearnerActivityUpdatePayload } from '@/shared/validations/kangur';

const ONLINE_WINDOW_MS = 2 * 60 * 1000;

const isRecentActivity = (timestamp: string | null | undefined): boolean => {
  if (!timestamp) {
    return false;
  }
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) {
    return false;
  }
  return Date.now() - parsed <= ONLINE_WINDOW_MS;
};

export async function getKangurLearnerActivityHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const activeLearner = requireActiveLearner(actor);
  const repository = await getKangurLearnerActivityRepository();
  const snapshot = await repository.getActivity(activeLearner.id);

  return NextResponse.json({
    snapshot,
    isOnline: isRecentActivity(snapshot?.updatedAt),
  });
}

export async function postKangurLearnerActivityHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.actorType !== 'learner') {
    throw forbiddenError('Only learner sessions can update activity.');
  }
  const activeLearner = requireActiveLearner(actor);
  const payload = parseKangurLearnerActivityUpdatePayload(ctx.body ?? (await req.json()));
  const repository = await getKangurLearnerActivityRepository();
  const snapshot = await repository.saveActivity(activeLearner.id, payload);

  return NextResponse.json(snapshot);
}
