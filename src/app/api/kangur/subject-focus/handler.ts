import { type NextRequest, NextResponse } from 'next/server';

import {
  getKangurSubjectFocusRepository,
  resolveKangurActiveLearner,
} from '@/features/kangur/server';
import { DEFAULT_KANGUR_SUBJECT } from '@/features/kangur/lessons/lesson-catalog';
import { kangurSubjectFocusSchema } from '@kangur/contracts/kangur-lesson-constants';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { validationError } from '@/shared/errors/app-error';

const DEFAULT_SUBJECT = DEFAULT_KANGUR_SUBJECT;

export async function getKangurSubjectFocusHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const activeLearner = await resolveKangurActiveLearner(req);
  const repository = await getKangurSubjectFocusRepository();
  const subject = (await repository.getSubjectFocus(activeLearner.id)) ?? DEFAULT_SUBJECT;

  return NextResponse.json({ subject });
}

export async function patchKangurSubjectFocusHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const activeLearner = await resolveKangurActiveLearner(req);
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
