import { NextRequest, NextResponse } from 'next/server';

import { getKangurGameEngineRepository } from '@/features/kangur/services/kangur-game-engine-repository';
import {
  kangurGameEnginesQuerySchema,
  kangurGameMechanicSchema,
  kangurGameStatusSchema,
  kangurGameSurfaceSchema,
} from '@/shared/contracts/kangur-games';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export { kangurGameEnginesQuerySchema as querySchema };

export async function getKangurGameEnginesHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = kangurGameEnginesQuerySchema.parse(ctx.query ?? {});
  const repository = await getKangurGameEngineRepository();
  const engines = await repository.listEngines({
    status: query.status ? kangurGameStatusSchema.parse(query.status) : undefined,
    surface: query.surface ? kangurGameSurfaceSchema.parse(query.surface) : undefined,
    mechanic: query.mechanic ? kangurGameMechanicSchema.parse(query.mechanic) : undefined,
  });

  return NextResponse.json(engines, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}
