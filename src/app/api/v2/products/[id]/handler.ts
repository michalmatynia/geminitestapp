import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  parseJsonBody,
  CachedProductService,
  productService,
} from '@/features/products/server';
import { validateProductUpdateMiddleware } from '@/features/products/validations/middleware';
import { productPatchInputSchema, productUpdateInputSchema } from '@/shared/contracts/products/io';
import { type ProductPatchInput, type ProductRecord, type ProductWithImages } from '@/shared/contracts/products';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError, payloadTooLargeError } from '@/shared/errors/app-error';
import { optionalBooleanQuerySchema } from '@/shared/lib/api/query-schema';
import { env } from '@/shared/lib/env';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


export const getQuerySchema = z.object({
  fresh: optionalBooleanQuerySchema().default(false),
});

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

const isJsonRequest = (req: NextRequest): boolean => {
  const contentType = req.headers.get('content-type')?.toLowerCase() ?? '';
  return contentType.includes('application/json') || contentType.includes('+json');
};

/**
 * GET /api/v2/products/[id]
 * Fetches a single product by its ID.
 */
export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id;
  const query = (_ctx.query ?? {}) as z.infer<typeof getQuerySchema>;
  const forceFresh = query.fresh;

  const product = forceFresh
    ? await productService.getProductById(id)
    : await CachedProductService.getProductById(id);
  if (!product) {
    throw notFoundError('Product not found', { productId: id });
  }

  return NextResponse.json(product);
}

/**
 * PUT /api/v2/products/[id]
 * Updates an existing product with validation.
 */
export async function putHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const timings: Record<string, number | null | undefined> = {};
  const totalStart = performance.now();
  const id = params.id;
  const updateStart = performance.now();
  const options = _ctx.userId ? { userId: _ctx.userId } : {};
  let validatedPayload: z.infer<typeof productUpdateInputSchema>;
  let updatePayload: FormData | z.infer<typeof productUpdateInputSchema>;

  if (isJsonRequest(req)) {
    const jsonStart = performance.now();
    const parsed = await parseJsonBody(req, productUpdateInputSchema, {
      logPrefix: 'products.PUT',
    });
    timings['jsonBody'] = performance.now() - jsonStart;
    timings['validation'] = timings['jsonBody'];

    if (!parsed.ok) {
      timings['total'] = performance.now() - totalStart;
      attachTimingHeaders(parsed.response, timings);
      if (shouldLogTiming()) {
        await logSystemEvent({
          level: 'info',
          message: '[timing] products.[id].PUT validation-failed',
          context: { productId: id, ...timings },
        });
      }
      return parsed.response;
    }

    validatedPayload = parsed.data;
    updatePayload = parsed.data;
  } else {
    let formData: FormData;
    const formDataStart = performance.now();
    try {
      formData = await req.formData();
      timings['formData'] = performance.now() - formDataStart;
    } catch (error) {
      void ErrorSystem.captureException(error);
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

    validatedPayload = (validation.data ?? {}) as z.infer<typeof productUpdateInputSchema>;
    updatePayload = formData;
  }

  const product: ProductWithImages | null = await productService.updateProduct(id, updatePayload, options);
  timings['serviceUpdate'] = performance.now() - updateStart;
  timings['validatedFields'] = Object.keys(validatedPayload).length;

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

/**
 * PATCH /api/v2/products/[id]
 * Partially updates a product (for quick field edits like price/stock).
 */
export async function patchHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id;

  const parsed = await parseJsonBody(req, productPatchInputSchema, {
    logPrefix: 'products.PATCH',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;

  const updateData: ProductPatchInput = {};
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
 * DELETE /api/v2/products/[id]
 * Deletes a product.
 */
export async function deleteHandler(
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
