import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { parseJsonBody } from '@/features/products/server';
import { CachedProductService } from '@/features/products/performance/cached-service';
import { productService } from '@/shared/lib/products/services/productService'; // Direct import
import { validateProductUpdateMiddleware } from '@/features/products/validations/middleware';
import type { ProductRecord, ProductWithImages } from '@/shared/contracts/products';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError, payloadTooLargeError } from '@/shared/errors/app-error';
import { env } from '@/shared/lib/env';

const shouldLogTiming = () => env.DEBUG_API_TIMING;

const buildServerTiming = (entries: Record<string, number | null | undefined>): string => {
  const parts = Object.entries(entries)
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value >= 0)
    .map(([name, value]) => `${name};dur=${Math.round(value as number)}`);
  return parts.join(', ');
};

const attachTimingHeaders = (
  response: Response,
  entries: Record<string, number | null | undefined>
): void => {
  const value = buildServerTiming(entries);
  if (value) {
    response.headers.set('Server-Timing', value);
  }
};

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
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id;
  const forceFresh = req.nextUrl.searchParams.get('fresh') === '1';

  const product = forceFresh
    ? await productService.getProductById(id)
    : await CachedProductService.getProductById(id);
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
  const timings: Record<string, number | null | undefined> = {};
  const totalStart = performance.now();
  const id = params.id;
  let formData: FormData;
  const formDataStart = performance.now();
  try {
    formData = await req.formData();
    timings['formData'] = performance.now() - formDataStart;
  } catch (error) {
    timings['formData'] = performance.now() - formDataStart;
    timings['total'] = performance.now() - totalStart;
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
  const validationStart = performance.now();
  const validation = await validateProductUpdateMiddleware(formData);
  timings['validation'] = performance.now() - validationStart;
  if (!validation.success) {
    timings['total'] = performance.now() - totalStart;
    attachTimingHeaders(validation.response, timings);
    if (shouldLogTiming()) {
      await logSystemEvent({
        level: 'info',
        message: '[timing] products.[id].PUT validation-failed',
        context: { productId: id, ...timings },
      });
    }
    return validation.response;
  }

  const updateStart = performance.now();
  const options = _ctx.userId ? { userId: _ctx.userId } : {};
  const product: ProductWithImages | null = await productService.updateProduct(
    id,
    formData,
    options
  );
  timings['serviceUpdate'] = performance.now() - updateStart;

  if (!product) {
    throw notFoundError('Product not found', { productId: id });
  }
  CachedProductService.invalidateProduct(id);
  timings['total'] = performance.now() - totalStart;
  if (shouldLogTiming()) {
    await logSystemEvent({
      level: 'info',
      message: '[timing] products.[id].PUT',
      context: { productId: id, ...timings },
    });
  }
  const response = NextResponse.json(product);
  attachTimingHeaders(response, timings);
  return response;
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

  const options = _ctx.userId ? { userId: _ctx.userId } : {};
  const product: ProductWithImages | null = await productService.updateProduct(
    id,
    updateData,
    options
  );

  if (!product) {
    throw notFoundError('Product not found', { productId: id });
  }
  CachedProductService.invalidateProduct(id);

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
  const options = _ctx.userId ? { userId: _ctx.userId } : {};
  const product: ProductRecord | null = await productService.deleteProduct(id, options);

  if (!product) {
    throw notFoundError('Product not found', { productId: id });
  }
  CachedProductService.invalidateProduct(id);
  return new Response(null, { status: 204 });
}
