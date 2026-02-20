

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ActivityTypes, logActivity } from '@/features/observability/services/activityService';
import { parseJsonBody } from '@/features/products/server';
import { getProductRepository } from '@/features/products/services/product-repository';
import { productService } from '@/features/products/services/productService'; // Direct import
import type { ProductRecord, ProductWithImages } from '@/shared/contracts/products';
import { validateProductUpdateMiddleware } from '@/features/products/validations/middleware';
import { badRequestError, notFoundError, payloadTooLargeError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/contracts/ui';


const isLikelyPayloadTooLarge = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();
  return (
    normalized.includes('exceeded') ||
    normalized.includes('too large') ||
    normalized.includes('body limit') ||
    normalized.includes('request entity too large')
  );
};

/**
 * GET /api/products/[id]
 * Fetches a single product by its ID.
 */
export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id;

  const product = await productService.getProductById(id);
  if (!product) {
    throw notFoundError('Product not found', { productId: id });
  }

  return NextResponse.json(product);
}

/**
 * PUT /api/products/[id]
 * Updates an existing product with validation.
 */
export async function PUT_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id;
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (error) {
    if (isLikelyPayloadTooLarge(error)) {
      throw payloadTooLargeError(
        'Upload payload too large. Reduce image sizes/count or increase proxyClientMaxBodySize.',
        { productId: id }
      );
    }
    throw badRequestError('Invalid form data payload', {
      productId: id,
      error,
    });
  }

  // Validate the form data
  const validation = await validateProductUpdateMiddleware(formData);
  if (!validation.success) {
    return validation.response;
  }

  const options = _ctx.userId ? { userId: _ctx.userId } : undefined;
  const product: ProductWithImages | null = await productService.updateProduct(id, formData, options);
  if (!product) {
    throw notFoundError('Product not found', { productId: id });
  }
  return NextResponse.json(product);
}

const patchProductSchema = z.object({
  price: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
});

/**
 * PATCH /api/products/[id]
 * Partially updates a product (for quick field edits like price/stock).
 */
export async function PATCH_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id;

  const parsed = await parseJsonBody(req, patchProductSchema, {
    logPrefix: 'products.PATCH',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;

  const updateData: { price?: number; stock?: number } = {};
  if (data.price !== undefined) updateData.price = data.price;
  if (data.stock !== undefined) updateData.stock = data.stock;

  const productRepository = await getProductRepository();
  const product: ProductRecord | null = await productRepository.updateProduct(id, updateData);
  if (!product) {
    throw notFoundError('Product not found', { productId: id });
  }

  // Manually log activity for PATCH as it uses repository directly for now
  void (logActivity({
    type: ActivityTypes.PRODUCT.UPDATED,
    description: `Quick updated product ${id}`,
    userId: _ctx.userId ?? null,
    entityId: id,
    entityType: 'product',
    metadata: { changes: updateData }
  })).catch(() => {});

  return NextResponse.json(product);
}

/**
 * DELETE /api/products/[id]
 * Deletes a product.
 */
export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id;
  const options = _ctx.userId ? { userId: _ctx.userId } : undefined;
  const product: ProductRecord | null = await productService.deleteProduct(id, options);
  if (!product) {
    throw notFoundError('Product not found', { productId: id });
  }
  return new Response(null, { status: 204 });
}

