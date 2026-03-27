import { NextRequest, NextResponse } from 'next/server';

import { canAccessKangurPage } from '@/features/kangur/config/page-access';
import {
  createKangurGameLibraryPageDataFromGames,
} from '@/features/kangur/games';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import { listKangurGames } from '@/features/kangur/services/kangur-game-repository/mongo-kangur-game-repository';
import {
  kangurGameEngineCategorySchema,
  kangurGameEngineIdSchema,
  kangurGameEngineImplementationOwnershipSchema,
  kangurGameIdSchema,
  kangurGameLibraryPageDataSchema,
  kangurGameLibraryPageQuerySchema,
  kangurGameMechanicSchema,
  kangurGameStatusSchema,
  kangurGameSurfaceSchema,
  kangurGameVariantSurfaceSchema,
} from '@/shared/contracts/kangur-games';
import {
  kangurLessonAgeGroupSchema,
  kangurLessonComponentIdSchema,
  kangurLessonSubjectSchema,
} from '@/shared/contracts/kangur-lesson-constants';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { readOptionalServerAuthSession } from '@/shared/lib/auth/optional-server-auth';

export { kangurGameLibraryPageQuerySchema as querySchema };

const SERVICE = 'kangur.game-library-page-handler';
const GAMES_LIBRARY_DENIED_HEADERS = Object.freeze({
  'Cache-Control': 'private, no-store',
});

export async function getKangurGameLibraryPageHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const session = await readOptionalServerAuthSession();
  if (!canAccessKangurPage('GamesLibrary', session)) {
    return NextResponse.json(
      {
        error: 'Not Found',
      },
      {
        headers: GAMES_LIBRARY_DENIED_HEADERS,
        status: 404,
      }
    );
  }

  const query = kangurGameLibraryPageQuerySchema.parse(ctx.query ?? {});
  const filter = {
    gameId: query.gameId ? kangurGameIdSchema.parse(query.gameId) : undefined,
    subject: query.subject ? kangurLessonSubjectSchema.parse(query.subject) : undefined,
    ageGroup: query.ageGroup ? kangurLessonAgeGroupSchema.parse(query.ageGroup) : undefined,
    gameStatus: query.gameStatus ? kangurGameStatusSchema.parse(query.gameStatus) : undefined,
    surface: query.surface ? kangurGameSurfaceSchema.parse(query.surface) : undefined,
    lessonComponentId: query.lessonComponentId
      ? kangurLessonComponentIdSchema.parse(query.lessonComponentId)
      : undefined,
    mechanic: query.mechanic ? kangurGameMechanicSchema.parse(query.mechanic) : undefined,
    engineId: query.engineId ? kangurGameEngineIdSchema.parse(query.engineId) : undefined,
    engineCategory: query.engineCategory
      ? kangurGameEngineCategorySchema.parse(query.engineCategory)
      : undefined,
    implementationOwnership: query.implementationOwnership
      ? kangurGameEngineImplementationOwnershipSchema.parse(query.implementationOwnership)
      : undefined,
    variantSurface: query.variantSurface
      ? kangurGameVariantSurfaceSchema.parse(query.variantSurface)
      : undefined,
    variantStatus: query.variantStatus
      ? kangurGameStatusSchema.parse(query.variantStatus)
      : undefined,
    launchableOnly: query.launchableOnly,
  };

  try {
    const games = await listKangurGames();
    const pageData = createKangurGameLibraryPageDataFromGames({
      filter,
      games,
    });

    return NextResponse.json(kangurGameLibraryPageDataSchema.parse(pageData), {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: SERVICE,
      action: 'getPageData',
      provider: 'composite',
      gameId: filter.gameId ?? null,
      subject: filter.subject ?? null,
      ageGroup: filter.ageGroup ?? null,
      gameStatus: filter.gameStatus ?? null,
      surface: filter.surface ?? null,
      lessonComponentId: filter.lessonComponentId ?? null,
      mechanic: filter.mechanic ?? null,
      engineId: filter.engineId ?? null,
      engineCategory: filter.engineCategory ?? null,
      implementationOwnership: filter.implementationOwnership ?? null,
      variantSurface: filter.variantSurface ?? null,
      variantStatus: filter.variantStatus ?? null,
      launchableOnly: filter.launchableOnly ?? false,
    });
    throw error;
  }
}
