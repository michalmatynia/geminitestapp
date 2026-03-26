import { NextRequest, NextResponse } from 'next/server';

import { getKangurGameEngineImplementationRepository } from '@/features/kangur/services/kangur-game-engine-implementation-repository';
import {
  kangurGameEngineIdSchema,
  kangurGameEngineImplementationOwnershipSchema,
  kangurGameEngineImplementationsQuerySchema,
} from '@/shared/contracts/kangur-games';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export { kangurGameEngineImplementationsQuerySchema as querySchema };

export async function getKangurGameEngineImplementationsHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = kangurGameEngineImplementationsQuerySchema.parse(ctx.query ?? {});
  const repository = await getKangurGameEngineImplementationRepository();
  const implementations = await repository.listImplementations({
    engineId: query.engineId ? kangurGameEngineIdSchema.parse(query.engineId) : undefined,
    ownership: query.ownership
      ? kangurGameEngineImplementationOwnershipSchema.parse(query.ownership)
      : undefined,
  });

  return NextResponse.json(implementations, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}
