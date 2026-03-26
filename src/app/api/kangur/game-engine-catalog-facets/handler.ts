import { NextRequest, NextResponse } from 'next/server';

import { getKangurGameEngineCatalogRepository } from '@/features/kangur/services/kangur-game-engine-catalog-repository';
import {
  kangurGameEngineCatalogFacetsSchema,
  kangurGameEngineCatalogQuerySchema,
  kangurGameEngineCategorySchema,
  kangurGameEngineIdSchema,
  kangurGameEngineImplementationOwnershipSchema,
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

export { kangurGameEngineCatalogQuerySchema as querySchema };

export async function getKangurGameEngineCatalogFacetsHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = kangurGameEngineCatalogQuerySchema.parse(ctx.query ?? {});
  const repository = await getKangurGameEngineCatalogRepository();
  const facets = await repository.listCatalogFacets({
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

  return NextResponse.json(kangurGameEngineCatalogFacetsSchema.parse(facets), {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}
