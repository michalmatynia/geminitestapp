import { NextRequest, NextResponse } from 'next/server';

import { getKangurGameLibraryOverviewRepository } from '@/features/kangur/services/kangur-game-library-overview-repository';
import {
  kangurGameEngineCategorySchema,
  kangurGameEngineIdSchema,
  kangurGameEngineImplementationOwnershipSchema,
  kangurGameLibraryOverviewQuerySchema,
  kangurGameMechanicSchema,
  kangurGameStatusSchema,
  kangurGameSurfaceSchema,
  kangurGameVariantSurfaceSchema,
  kangurGamesLibraryOverviewSchema,
} from '@/shared/contracts/kangur-games';
import {
  kangurLessonAgeGroupSchema,
  kangurLessonComponentIdSchema,
  kangurLessonSubjectSchema,
} from '@/shared/contracts/kangur-lesson-constants';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export { kangurGameLibraryOverviewQuerySchema as querySchema };

export async function getKangurGameLibraryOverviewHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = kangurGameLibraryOverviewQuerySchema.parse(ctx.query ?? {});
  const repository = await getKangurGameLibraryOverviewRepository();
  const overview = await repository.getOverview({
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
  });

  return NextResponse.json(kangurGamesLibraryOverviewSchema.parse(overview), {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}
