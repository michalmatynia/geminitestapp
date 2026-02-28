import { NextRequest, NextResponse } from 'next/server';

import { productService } from '@/shared/lib/products/services/productService';
import type { ProductFiltersParsed } from '@/shared/lib/products/validations';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

/**
 * GET /api/products/paged
 * Returns { products: ProductWithImages[], total: number } in a single request,
 * using the repository's optimized paged fetch path.
 * MongoDB uses a single $facet aggregation for filtered queries and keeps the
 * unfiltered path on the indexed list query + estimatedDocumentCount fast path.
 * Prisma continues to use parallel findMany + count queries.
 */
export async function GET_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const filters = ctx.query as ProductFiltersParsed;
  const result = await productService.getProductsWithCount(filters);
  return NextResponse.json(result);
}
