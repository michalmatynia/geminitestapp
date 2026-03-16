import { NextRequest, NextResponse } from 'next/server';

import {
  getKangurSubjectFocusRepository,
  requireActiveLearner,
  resolveKangurActor,
} from '@/features/kangur/server';
import { kangurSubjectFocusSchema } from '@/shared/contracts/kangur';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const DEFAULT_SUBJECT = 'maths' as const;

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
  _ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const activeLearner = requireActiveLearner(actor);
  const parsed = await parseJsonBody(req, kangurSubjectFocusSchema, {
    logPrefix: 'kangur.subject-focus.PATCH',
  });
  if (!parsed.ok) return parsed.response;
  const payload = parsed.data;
  const repository = await getKangurSubjectFocusRepository();
  const subject = await repository.saveSubjectFocus(activeLearner.id, payload.subject);

  return NextResponse.json({ subject });
}
