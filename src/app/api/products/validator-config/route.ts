export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { getValidationPatternRepository } from '@/features/products/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const includeDisabled = req.nextUrl.searchParams.get('includeDisabled') === 'true';
  const repository = await getValidationPatternRepository();
  const [enabledByDefault, patterns] = await Promise.all([
    repository.getEnabledByDefault(),
    repository.listPatterns(),
  ]);

  return NextResponse.json({
    enabledByDefault,
    patterns: includeDisabled ? patterns : patterns.filter((pattern) => pattern.enabled),
  });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  {
    source: 'products.validator-config.GET',
    cacheControl: 'no-store',
  },
);
