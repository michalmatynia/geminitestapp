import { NextRequest, NextResponse } from 'next/server';

import { getKangurGameVariantRepository } from '@/features/kangur/services/kangur-game-variant-repository';
import {
  kangurGameEngineCategorySchema,
  kangurGameEngineIdSchema,
  kangurGameMechanicSchema,
  kangurGameStatusSchema,
  kangurGameSurfaceSchema,
  kangurGameVariantCatalogEntriesSchema,
  kangurGameVariantSurfaceSchema,
  kangurGameVariantsQuerySchema,
} from '@/shared/contracts/kangur-games';
import {
  kangurLessonAgeGroupSchema,
  kangurLessonComponentIdSchema,
  kangurLessonSubjectSchema,
} from '@/shared/contracts/kangur-lesson-constants';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export { kangurGameVariantsQuerySchema as querySchema };

export async function getKangurGameVariantsHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = kangurGameVariantsQuerySchema.parse(ctx.query ?? {});
  const repository = await getKangurGameVariantRepository();
  const variants = await repository.listVariants({
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
    variantSurface: query.variantSurface
      ? kangurGameVariantSurfaceSchema.parse(query.variantSurface)
      : undefined,
    variantStatus: query.variantStatus
      ? kangurGameStatusSchema.parse(query.variantStatus)
      : undefined,
    launchableOnly: query.launchableOnly,
  });

  return NextResponse.json(kangurGameVariantCatalogEntriesSchema.parse(variants), {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}
