import { NextRequest, NextResponse } from 'next/server';

import {
  getKangurLearnerActivityRepository,
  requireActiveLearner,
  resolveKangurActor,
} from '@/features/kangur/server';
import { publishKangurLearnerActivityUpdate } from '@/features/kangur/services/learner-activity-stream-publisher';
import { kangurLearnerActivityUpdateInputSchema } from '@kangur/contracts';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, forbiddenError, validationError } from '@/shared/errors/app-error';

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
  const body = ctx.body ?? (await req.text().then((rawBody) => {
    if (!rawBody.trim()) {
      throw badRequestError('Kangur learner activity payload is required.');
    }
    try {
      return JSON.parse(rawBody) as unknown;
    } catch (error) {
      throw badRequestError('Invalid JSON payload').withCause(error);
    }
  }));
  const parsedPayload = kangurLearnerActivityUpdateInputSchema.safeParse(body);
  if (!parsedPayload.success) {
    throw validationError('Invalid payload', {
      issues: parsedPayload.error.flatten(),
    });
  }
  const payload = parsedPayload.data;
  const repository = await getKangurLearnerActivityRepository();
  const snapshot = await repository.saveActivity(activeLearner.id, payload);
  publishKangurLearnerActivityUpdate(activeLearner.id, {
    snapshot,
    isOnline: isRecentActivity(snapshot?.updatedAt),
  });

  return NextResponse.json(snapshot);
}
