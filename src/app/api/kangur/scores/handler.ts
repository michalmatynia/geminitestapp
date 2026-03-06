import { NextRequest, NextResponse } from 'next/server';

import { getKangurScoreRepository, resolveKangurActor } from '@/features/kangur/server';
import { badRequestError } from '@/shared/errors/app-error';
import {
  parseKangurScoreCreatePayload,
  parseKangurScoreListQuery,
} from '@/shared/validations/kangur';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const readBodyJson = async (request: NextRequest): Promise<unknown> => {
  const rawBody = await request.text();
  if (!rawBody) {
    throw badRequestError('Kangur score payload is required.');
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw badRequestError('Invalid JSON payload.');
  }
};

export async function getKangurScoresHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const query = parseKangurScoreListQuery({
    sort: req.nextUrl.searchParams.get('sort') ?? undefined,
    limit: req.nextUrl.searchParams.get('limit') ?? undefined,
    player_name: req.nextUrl.searchParams.get('player_name') ?? undefined,
    operation: req.nextUrl.searchParams.get('operation') ?? undefined,
    created_by: req.nextUrl.searchParams.get('created_by') ?? undefined,
    learner_id: req.nextUrl.searchParams.get('learner_id') ?? undefined,
  });

  const repository = await getKangurScoreRepository();
  const rows = await repository.listScores({
    sort: query.sort,
    limit: query.limit,
    filters: {
      player_name: query.player_name,
      operation: query.operation,
      created_by: query.created_by,
      learner_id: query.learner_id,
    },
  });

  return NextResponse.json(rows);
}

export async function postKangurScoresHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const payload = parseKangurScoreCreatePayload(await readBodyJson(req));
  const actor = await resolveKangurActor(req);

  const repository = await getKangurScoreRepository();
  const row = await repository.createScore({
    ...payload,
    created_by: actor.ownerEmail,
    learner_id: actor.activeLearner.id,
    owner_user_id: actor.ownerUserId,
  });

  return NextResponse.json(row, { status: 201 });
}
