import { NextRequest, NextResponse } from 'next/server';

import {
  getKangurSubjectFocusRepository,
  requireActiveLearner,
  resolveKangurActor,
} from '@/features/kangur/server';
import { DEFAULT_KANGUR_SUBJECT } from '@/features/kangur/lessons/lesson-catalog';
import { kangurSubjectFocusSchema } from '@kangur/contracts';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { validationError } from '@/shared/errors/app-error';

const DEFAULT_SUBJECT = DEFAULT_KANGUR_SUBJECT;

export async function getKangurSubjectFocusHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const activeLearner = requireActiveLearner(actor);
  const repository = await getKangurSubjectFocusRepository();
  const subject = (await repository.getSubjectFocus(activeLearner.id)) ?? DEFAULT_SUBJECT;

  return NextResponse.json({ subject });
}

export async function patchKangurSubjectFocusHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const activeLearner = requireActiveLearner(actor);
  const parsedPayload = kangurSubjectFocusSchema.safeParse(ctx.body);
  if (!parsedPayload.success) {
    throw validationError('Invalid payload', {
      issues: parsedPayload.error.flatten(),
    });
  }
  const payload = parsedPayload.data;
  const repository = await getKangurSubjectFocusRepository();
  const subject = await repository.saveSubjectFocus(activeLearner.id, payload.subject);

  return NextResponse.json({ subject });
}
