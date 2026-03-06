import { NextRequest, NextResponse } from 'next/server';

import { getKangurProgressRepository, resolveKangurActor } from '@/features/kangur/server';
import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';
import { badRequestError } from '@/shared/errors/app-error';
import { parseKangurProgressUpdatePayload } from '@/shared/validations/kangur';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const readBodyJson = async (request: NextRequest): Promise<unknown> => {
  const rawBody = await request.text();
  if (!rawBody) {
    throw badRequestError('Kangur progress payload is required.');
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw badRequestError('Invalid JSON payload.');
  }
};

const resolveProgressKeys = (input: {
  learnerId: string;
  legacyUserKey: string | null;
}): string[] => {
  const keys = [input.learnerId];
  if (input.legacyUserKey) {
    keys.push(input.legacyUserKey);
  }
  return keys;
};

const loadProgressForLearner = async (input: {
  learnerId: string;
  legacyUserKey: string | null;
}) => {
  const repository = await getKangurProgressRepository();
  const [primary, legacy] = await Promise.all(
    resolveProgressKeys(input).map((key) => repository.getProgress(key))
  );
  const defaultProgress = createDefaultKangurProgressState();
  const primaryEmpty = JSON.stringify(primary) === JSON.stringify(defaultProgress);
  if (primaryEmpty && legacy && JSON.stringify(legacy) !== JSON.stringify(defaultProgress)) {
    await repository.saveProgress(input.learnerId, legacy);
    return legacy;
  }
  return primary ?? defaultProgress;
};

export async function getKangurProgressHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const progress = await loadProgressForLearner({
    learnerId: actor.activeLearner.id,
    legacyUserKey: actor.activeLearner.legacyUserKey,
  });

  return NextResponse.json(progress);
}

export async function patchKangurProgressHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const payload = parseKangurProgressUpdatePayload(await readBodyJson(req));
  const actor = await resolveKangurActor(req);
  const repository = await getKangurProgressRepository();
  const progress = await repository.saveProgress(actor.activeLearner.id, payload);

  return NextResponse.json(progress);
}
