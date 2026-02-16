export const runtime = 'nodejs';
export const revalidate = 30;

import { NextRequest, NextResponse } from 'next/server';

import { productService } from '@/features/products/server';
import {
  ProductFiltersParsed,
  productFilterSchema,
} from '@/features/products/validations';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

/**
 * GET /api/products/count
 * Returns the total number of products based on filters.
 */
async function GET_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const filters = ctx.query as ProductFiltersParsed;

  const count = await productService.countProducts(filters);
  return NextResponse.json({ count });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  {
    source: 'products.count.GET',
    querySchema: productFilterSchema,
  }
);
