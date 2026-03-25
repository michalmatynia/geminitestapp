import { NextRequest, NextResponse } from 'next/server';

import { resolveKangurActor } from '@/features/kangur/services/kangur-actor';
import { getKangurGameRepository } from '@/features/kangur/services/kangur-game-repository';
import {
  kangurGameStatusSchema,
  kangurGameSurfaceSchema,
  kangurGamesQuerySchema,
  kangurGamesReplacePayloadSchema,
} from '@/shared/contracts/kangur-games';
import {
  kangurLessonAgeGroupSchema,
  kangurLessonComponentIdSchema,
  kangurLessonSubjectSchema,
} from '@/shared/contracts/kangur-lesson-constants';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { forbiddenError } from '@/shared/errors/app-error';

export { kangurGamesQuerySchema as querySchema };
export { kangurGamesReplacePayloadSchema as bodySchema };

export async function getKangurGamesHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = kangurGamesQuerySchema.parse(ctx.query ?? {});
  const repository = await getKangurGameRepository();
  const games = await repository.listGames({
    subject: query.subject ? kangurLessonSubjectSchema.parse(query.subject) : undefined,
    ageGroup: query.ageGroup ? kangurLessonAgeGroupSchema.parse(query.ageGroup) : undefined,
    status: query.status ? kangurGameStatusSchema.parse(query.status) : undefined,
    surface: query.surface ? kangurGameSurfaceSchema.parse(query.surface) : undefined,
    lessonComponentId: query.lessonComponentId
      ? kangurLessonComponentIdSchema.parse(query.lessonComponentId)
      : undefined,
  });

  return NextResponse.json(games, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}

export async function postKangurGamesHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  if (actor.role !== 'admin') {
    throw forbiddenError('Only admins can update Kangur games.');
  }

  const parsed = kangurGamesReplacePayloadSchema.parse(ctx.body ?? {});
  const repository = await getKangurGameRepository();
  const games = await repository.replaceGames(parsed.games);

  return NextResponse.json(games, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
