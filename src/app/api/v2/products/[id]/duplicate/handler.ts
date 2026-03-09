import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { parseJsonBody } from '@/features/products/server';
import { CachedProductService } from '@/features/products/server';
import type { ProductWithImages } from '@/shared/contracts/products';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { productService } from '@/shared/lib/products/services/productService'; // Direct import

const duplicateSchema = z.object({
  sku: z.string().trim().optional(),
});

/**
 * POST /api/v2/products/[id]/duplicate
 * Duplicates a product with a new SKU.
 */
export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const { id } = params;
  if (!id) {
    throw badRequestError('Product id is required');
  }
  const parsed = await parseJsonBody(req, duplicateSchema, {
    logPrefix: 'products.DUPLICATE',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const sku = parsed.data.sku ?? '';
  const options = _ctx.userId ? { userId: _ctx.userId } : undefined;
  const product: ProductWithImages | null = await productService.duplicateProduct(id, sku, options);
  if (!product) {
    throw notFoundError('Product not found', { productId: id });
  }
  CachedProductService.invalidateAll();
  return NextResponse.json(product);
}
