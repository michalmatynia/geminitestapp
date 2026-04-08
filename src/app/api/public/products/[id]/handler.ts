import { NextRequest, NextResponse } from 'next/server';

import { productService } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError } from '@/shared/errors/app-error';
import { applyCacheLife } from '@/shared/lib/next/cache-life';

/**
 * GET /api/public/products/[id]
 * Fetches a single product by its ID for public consumption.
 */
async function getPublicProductByIdCached(id: string) {
  'use cache';
  applyCacheLife('swr60');

  return productService.getProductById(id);
}

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const { id } = params;
  const product = await getPublicProductByIdCached(id);
  if (!product) {
    throw notFoundError('Product not found');
  }
  return NextResponse.json(product);
}
