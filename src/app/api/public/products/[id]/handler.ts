import { NextRequest, NextResponse } from 'next/server';

import { productService } from '@/features/products/server';
import { notFoundError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

/**
 * GET /api/public/products/[id]
 * Fetches a single product by its ID for public consumption.
 */
export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const { id } = params;
  const product = await productService.getProductById(id);
  if (!product) {
    throw notFoundError('Product not found');
  }
  return NextResponse.json(product);
}
