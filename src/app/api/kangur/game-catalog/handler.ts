import { NextRequest, NextResponse } from 'next/server';

import { getKangurGameCatalogRepository } from '@/features/kangur/services/kangur-game-catalog-repository';
import {
  kangurGameCatalogEntriesSchema,
  kangurGameCatalogQuerySchema,
  kangurGameEngineIdSchema,
  kangurGameMechanicSchema,
  kangurGameStatusSchema,
  kangurGameSurfaceSchema,
} from '@/shared/contracts/kangur-games';
import {
  kangurLessonAgeGroupSchema,
  kangurLessonComponentIdSchema,
  kangurLessonSubjectSchema,
} from '@/shared/contracts/kangur-lesson-constants';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export { kangurGameCatalogQuerySchema as querySchema };

export async function getKangurGameCatalogHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = kangurGameCatalogQuerySchema.parse(ctx.query ?? {});
  const repository = await getKangurGameCatalogRepository();
  const catalogEntries = await repository.listCatalog({
    subject: query.subject ? kangurLessonSubjectSchema.parse(query.subject) : undefined,
    ageGroup: query.ageGroup ? kangurLessonAgeGroupSchema.parse(query.ageGroup) : undefined,
    gameStatus: query.gameStatus ? kangurGameStatusSchema.parse(query.gameStatus) : undefined,
    surface: query.surface ? kangurGameSurfaceSchema.parse(query.surface) : undefined,
    lessonComponentId: query.lessonComponentId
      ? kangurLessonComponentIdSchema.parse(query.lessonComponentId)
      : undefined,
    mechanic: query.mechanic ? kangurGameMechanicSchema.parse(query.mechanic) : undefined,
    engineId: query.engineId ? kangurGameEngineIdSchema.parse(query.engineId) : undefined,
    launchableOnly: query.launchableOnly,
  });

  return NextResponse.json(kangurGameCatalogEntriesSchema.parse(catalogEntries), {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}
