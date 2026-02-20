import { NextRequest, NextResponse } from 'next/server';

import { productService } from '@/features/products/services/productService';
import type { ProductFiltersParsed } from '@/features/products/validations';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

/**
 * GET /api/products/paged
 * Returns { products: ProductWithImages[], total: number } in a single request,
 * using a $facet aggregation on MongoDB so the DB is queried only once.
 */
export async function GET_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const filters = ctx.query as ProductFiltersParsed;
  const result = await productService.getProductsWithCount(filters);
  return NextResponse.json(result);
}
