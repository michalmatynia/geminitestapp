import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { getKangurScoreRepository, resolveKangurActor } from '@/features/kangur/server';
import { badRequestError } from '@/shared/errors/app-error';
import {
  normalizeKangurSort,
  parseKangurScoreCreatePayload,
} from '@/shared/validations/kangur';
import {
  kangurScoreLimitSchema,
  kangurScoreSortSchema,
} from '@/shared/contracts/kangur';
import {
  optionalIntegerQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

export const querySchema = z.object({
  sort: optionalTrimmedQueryString(kangurScoreSortSchema),
  limit: optionalIntegerQuerySchema(kangurScoreLimitSchema),
  player_name: optionalTrimmedQueryString(),
  operation: optionalTrimmedQueryString(),
  created_by: optionalTrimmedQueryString(),
  learner_id: optionalTrimmedQueryString(),
});

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
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = (ctx.query ?? {}) as z.infer<typeof querySchema>;

  const repository = await getKangurScoreRepository();
  const rows = await repository.listScores({
    sort: normalizeKangurSort(query.sort),
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
  ctx: ApiHandlerContext
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

  void logKangurServerEvent({
    source: 'kangur.scores.create',
    message: 'Kangur score created',
    request: req,
    requestContext: ctx,
    actor,
    statusCode: 201,
    context: {
      operation: row.operation,
      score: row.score,
      totalQuestions: row.total_questions,
      correctAnswers: row.correct_answers,
      timeTaken: row.time_taken,
    },
  });
  return NextResponse.json(row, { status: 201 });
}
