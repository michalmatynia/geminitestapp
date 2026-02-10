export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { productService } from '@/features/products/server';
import { notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

/**
 * GET /api/public/products/[id]
 * Fetches a single product by its ID for public consumption.
 */
async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const { id } = params;
  const product = await productService.getProductById(id);
  if (!product) {
    throw notFoundError('Product not found');
  }
  return NextResponse.json(product);
}

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, { source: 'public.products.[id].GET' });
