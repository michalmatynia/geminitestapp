import { NextRequest, NextResponse } from 'next/server';

import { CachedProductService } from '@/features/products/performance';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { ProductFiltersParsed } from '@/shared/lib/products/validations';

/**
 * GET /api/v2/products/count
 * Returns the total number of products based on filters.
 */
export async function GET_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const filters = ctx.query as ProductFiltersParsed;

  const count = await CachedProductService.getProductCount(filters);
  return NextResponse.json({ count });
}
