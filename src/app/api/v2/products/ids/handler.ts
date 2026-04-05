import { NextRequest, NextResponse } from 'next/server';

import { CachedProductService } from '@/features/products/performance';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { ProductFiltersParsed } from '@/shared/lib/products/validations';

/**
 * GET /api/v2/products/ids
 * Returns matching product ids without hydrating full product payloads.
 */
export async function GET_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const { page: _page, pageSize: _pageSize, ...filters } = ctx.query as ProductFiltersParsed;

  const ids = await CachedProductService.getProductIds(filters);
  return NextResponse.json({ ids });
}
