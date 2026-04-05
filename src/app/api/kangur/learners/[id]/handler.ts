import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logKangurServerEvent } from '@/features/kangur/observability/server';
import {
  deleteKangurLearner,
  getKangurLearnerById,
  resolveKangurActor,
  updateKangurLearner,
} from '@/features/kangur/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { forbiddenError, validationError } from '@/shared/errors/app-error';
import { parseKangurLearnerUpdatePayload } from '@/shared/validations/kangur';


import { readKangurAuthJsonBody } from '../../auth/shared';

const paramsSchema = z.object({
  id: z.string().trim().min(1, 'Learner id is required'),
});

const parseLearnerId = (params: { id: string }): string => {
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) {
    throw validationError('Invalid route parameters', {
      issues: parsed.error.flatten(),
    });
  }
  return parsed.data.id;
};

export async function deleteKangurLearnerHandler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (!actor.canManageLearners) {
    throw forbiddenError('Only parent accounts can manage learners.');
  }
  const learnerId = parseLearnerId(params);

  const learner = await getKangurLearnerById(learnerId);
  if (learner?.ownerUserId !== actor.ownerUserId) {
    throw forbiddenError('This learner does not belong to the current parent account.', {
      learnerId,
    });
  }

  const deletedLearner = await deleteKangurLearner(learnerId);
  void logKangurServerEvent({
    source: 'kangur.learners.delete',
    message: 'Kangur learner deleted',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 200,
    context: {
      learnerId: deletedLearner.id,
      learnerStatus: deletedLearner.status,
    },
  });
  return NextResponse.json(deletedLearner);
}

export async function patchKangurLearnerHandler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const learnerId = parseLearnerId(params);
  const actor = await resolveKangurActor(req);
  const payload = parseKangurLearnerUpdatePayload(
    await readKangurAuthJsonBody(req, 'learner update', ctx.body)
  );
  if (!actor.canManageLearners) {
    if (actor.actorType !== 'learner' || actor.activeLearner?.id !== learnerId) {
      throw forbiddenError('Only parent accounts can manage learners.');
    }
    const payloadKeys = Object.keys(payload);
    const allowedKeys = new Set(['avatarId']);
    const hasInvalidKey = payloadKeys.some((key) => !allowedKeys.has(key));
    if (hasInvalidKey) {
      throw forbiddenError('Learners can only update their avatar.', {
        learnerId,
      });
    }
  } else {
    const learner = await getKangurLearnerById(learnerId);
    if (learner?.ownerUserId !== actor.ownerUserId) {
      throw forbiddenError('This learner does not belong to the current parent account.', {
        learnerId,
      });
    }
  }

  const updatedLearner = await updateKangurLearner(learnerId, payload);
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
