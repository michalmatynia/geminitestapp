import { NextRequest, NextResponse } from 'next/server';

import { getKangurGameLibraryCoverageRepository } from '@/features/kangur/services/kangur-game-library-coverage-repository';
import { kangurGameLibraryCoverageSchema } from '@/shared/contracts/kangur-games';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function getKangurGameLibraryCoverageHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const repository = await getKangurGameLibraryCoverageRepository();
  const coverage = await repository.getCoverage();

  return NextResponse.json(kangurGameLibraryCoverageSchema.parse(coverage), {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}
