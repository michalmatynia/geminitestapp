import { NextRequest, NextResponse } from 'next/server';

import { productService } from '@/features/products/server';
import { ProductFiltersParsed } from '@/features/products/validations';
import type { ApiHandlerContext } from '@/shared/types/api/api';

/**
 * GET /api/products/count
 * Returns the total number of products based on filters.
 */
export async function GET_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const filters = ctx.query as ProductFiltersParsed;

  const count = await productService.countProducts(filters);
  return NextResponse.json({ count });
}
