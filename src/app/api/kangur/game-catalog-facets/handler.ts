import { NextRequest, NextResponse } from 'next/server';

import { getKangurGameCatalogRepository } from '@/features/kangur/services/kangur-game-catalog-repository';
import { kangurGameCatalogFacetsSchema } from '@/shared/contracts/kangur-games';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function getKangurGameCatalogFacetsHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const repository = await getKangurGameCatalogRepository();
  const facets = await repository.listCatalogFacets();

  return NextResponse.json(kangurGameCatalogFacetsSchema.parse(facets), {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}
