import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logKangurServerEvent } from '@/features/kangur/observability/server';
import {
  getKangurScoreRepository,
  requireActiveLearner,
  resolveKangurActor,
} from '@/features/kangur/server';
import {
  kangurLessonSubjectSchema,
  kangurScoreLimitSchema,
  kangurScoreSortSchema,
  resolveKangurScoreSubject,
  type KangurLessonSubject,
} from '@kangur/contracts';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { AppErrorCodes, badRequestError, isAppError } from '@/shared/errors/app-error';
import {
  normalizeOptionalQueryString,
  parseOptionalIntegerQueryValue,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';
import {
  normalizeKangurSort,
  parseKangurScoreCreatePayload,
} from '@/shared/validations/kangur';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


export const querySchema = z.object({
  sort: z.preprocess(normalizeOptionalQueryString, kangurScoreSortSchema.optional()),
  limit: z.preprocess(parseOptionalIntegerQueryValue, kangurScoreLimitSchema.optional()),
  player_name: optionalTrimmedQueryString(),
  operation: optionalTrimmedQueryString(),
  subject: optionalTrimmedQueryString(),
  created_by: optionalTrimmedQueryString(),
  learner_id: optionalTrimmedQueryString(),
});

const resolveOptionalTrimmedString = (value: unknown): string | undefined => {
  const normalized = normalizeOptionalQueryString(value);
  return normalized ?? undefined;
};

const resolveOptionalSubject = (value: unknown): KangurLessonSubject | undefined => {
  const normalized = resolveOptionalTrimmedString(value);
  if (!normalized) {
    return undefined;
  }
  const parsed = kangurLessonSubjectSchema.safeParse(normalized);
  return parsed.success ? parsed.data : undefined;
};

const resolveKangurScoresQuery = (
  req: Request,
  ctx: ApiHandlerContext
): {
  sort?: string;
  limit?: number;
  player_name?: string;
  operation?: string;
  subject?: KangurLessonSubject;
  created_by?: string;
  learner_id?: string;
} => {
  const rawQuery = {
    ...Object.fromEntries(new URL(req.url).searchParams.entries()),
    ...((ctx.query ?? {}) as Record<string, unknown>),
  };

  return {
    sort: normalizeOptionalQueryString(rawQuery['sort']),
    limit: parseOptionalIntegerQueryValue(rawQuery['limit']),
    player_name: resolveOptionalTrimmedString(rawQuery['player_name']),
    operation: resolveOptionalTrimmedString(rawQuery['operation']),
    subject: resolveOptionalSubject(rawQuery['subject']),
    created_by: resolveOptionalTrimmedString(rawQuery['created_by']),
    learner_id: resolveOptionalTrimmedString(rawQuery['learner_id']),
  };
};

const readBodyJson = async (request: NextRequest): Promise<unknown> => {
  const rawBody = await request.text();
  if (!rawBody) {
    throw badRequestError('Kangur score payload is required.');
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch (error) {
    throw badRequestError('Invalid JSON payload.').withCause(error);
  }
};

const resolveBodyJson = async (
  request: NextRequest,
  ctx: ApiHandlerContext
): Promise<unknown> => {
  if (ctx.body !== undefined) {
    return ctx.body;
  }
  return readBodyJson(request);
};

export async function getKangurScoresHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  await resolveKangurActor(req).catch((error) => {
    if (!isAppError(error) || error.code !== AppErrorCodes.unauthorized) {
      void ErrorSystem.captureException(error);
    }
    return null;
  });
  const query = resolveKangurScoresQuery(req, ctx);

  const repository = await getKangurScoreRepository();
  const filters = {
    player_name: query.player_name,
    operation: query.operation,
    subject: query.subject,
    created_by: query.created_by,
    ...(query.learner_id !== undefined || query.player_name || query.operation || query.created_by
      ? { learner_id: query.learner_id }
      : {}),
  };
  const rows = await repository.listScores({
    sort: normalizeKangurSort(query.sort),
    limit: query.limit,
    filters,
  });

  return NextResponse.json(rows);
}

export async function postKangurScoresHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const payload = parseKangurScoreCreatePayload(await resolveBodyJson(req, ctx));
  const actor = await resolveKangurActor(req);
  const activeLearner = requireActiveLearner(actor);

  const repository = await getKangurScoreRepository();
  const resolvedSubject = resolveKangurScoreSubject({
    operation: payload.operation,
    subject: payload.subject,
  });
  const row = await repository.createScore({
    ...payload,
    subject: resolvedSubject,
    created_by: actor.ownerEmail,
    learner_id: activeLearner.id,
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
      xpEarned: row.xp_earned ?? null,
      subject: row.subject,
    },
  });
  return NextResponse.json(row, { status: 201 });
}
