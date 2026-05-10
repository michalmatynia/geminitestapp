import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  parseJsonBody,
  CachedProductService,
  productService,
} from '@/features/products/server';
import { deleteProductFromEcommerceExport } from '@/features/integrations/server';
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

const shouldLogTiming = (): boolean => env.DEBUG_API_TIMING;

type TimingEntries = Map<string, number>;

const buildServerTiming = (entries: TimingEntries): string => {
  const parts = Array.from(entries.entries())
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value >= 0)
    .map(([name, value]) => `${name};dur=${Math.round(value)}`);
  return parts.join(', ');
};

const attachTimingHeaders = (
  response: Response,
  entries: TimingEntries
): void => {
  const value = buildServerTiming(entries);
  if (value.length > 0) {
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

type ProductMutationOptions = { userId?: string };
type ProductUpdatePayload = z.infer<typeof productUpdateInputSchema>;
type PutPayloadResult =
  | {
      type: 'payload';
      updatePayload: FormData | ProductUpdatePayload;
      validatedPayload: ProductUpdatePayload;
    }
  | { type: 'response'; response: Response };

const buildMutationOptions = (_ctx: ApiHandlerContext): ProductMutationOptions =>
  typeof _ctx.userId === 'string' && _ctx.userId.trim().length > 0
    ? { userId: _ctx.userId }
    : {};

const logProductTiming = async (
  message: string,
  productId: string,
  timings: TimingEntries
): Promise<void> => {
  if (!shouldLogTiming()) return;
  await logSystemEvent({
    level: 'info',
    message,
    context: { productId, ...Object.fromEntries(timings) },
  });
};

const finishValidationFailure = async (
  response: Response,
  productId: string,
  timings: TimingEntries,
  totalStart: number
): Promise<Response> => {
  timings.set('total', performance.now() - totalStart);
  attachTimingHeaders(response, timings);
  await logProductTiming('[timing] products.[id].PUT validation-failed', productId, timings);
  return response;
};

const resolveJsonPutPayload = async (
  req: NextRequest,
  productId: string,
  timings: TimingEntries,
  totalStart: number
): Promise<PutPayloadResult> => {
  const jsonStart = performance.now();
  const parsed = await parseJsonBody(req, productUpdateInputSchema, {
    logPrefix: 'products.PUT',
  });
  const jsonDuration = performance.now() - jsonStart;
  timings.set('jsonBody', jsonDuration);
  timings.set('validation', jsonDuration);

  if (!parsed.ok) {
    return {
      type: 'response',
      response: await finishValidationFailure(parsed.response, productId, timings, totalStart),
    };
  }

  return { type: 'payload', validatedPayload: parsed.data, updatePayload: parsed.data };
};

const readPutFormData = async (
  req: NextRequest,
  productId: string,
  timings: TimingEntries,
  totalStart: number
): Promise<FormData> => {
  const formDataStart = performance.now();
  try {
    const formData = await req.formData();
    timings.set('formData', performance.now() - formDataStart);
    return formData;
  } catch (error) {
    void ErrorSystem.captureException(error);
    timings.set('formData', performance.now() - formDataStart);
    timings.set('total', performance.now() - totalStart);
    if (isLikelyPayloadTooLarge(error)) {
      throw payloadTooLargeError(
        'Upload payload too large. Reduce image sizes/count or increase proxyClientMaxBodySize.',
        { productId }
      );
    }
    throw badRequestError('Invalid form data payload', {
      productId,
      error,
    });
  }
};

const resolveFormPutPayload = async (
  req: NextRequest,
  productId: string,
  timings: TimingEntries,
  totalStart: number
): Promise<PutPayloadResult> => {
  const formData = await readPutFormData(req, productId, timings, totalStart);
  const validationStart = performance.now();
  const validation = await validateProductUpdateMiddleware(formData);
  timings.set('validation', performance.now() - validationStart);

  if (!validation.success) {
    return {
      type: 'response',
      response: await finishValidationFailure(validation.response, productId, timings, totalStart),
    };
  }

  return {
    type: 'payload',
    validatedPayload: (validation.data ?? {}) as ProductUpdatePayload,
    updatePayload: formData,
  };
};

const updateProductForRoute = async (
  id: string,
  payload: FormData | ProductUpdatePayload | ProductPatchInput,
  options: ProductMutationOptions
): Promise<ProductWithImages | null> => productService.updateProduct(id, payload, options);

const cleanupDeletedProductEcommerceExport = async (productId: string): Promise<void> => {
  try {
    await deleteProductFromEcommerceExport(productId);
  } catch (error) {
    void logSystemEvent({
      level: 'warn',
      message: 'products.DELETE: failed to remove ecommerce export record',
      source: 'products.DELETE',
      context: {
        productId,
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
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
  const timings: TimingEntries = new Map();
  const totalStart = performance.now();
  const id = params.id;
  const updateStart = performance.now();
  const options = buildMutationOptions(_ctx);
  const payloadResult = isJsonRequest(req)
    ? await resolveJsonPutPayload(req, id, timings, totalStart)
    : await resolveFormPutPayload(req, id, timings, totalStart);

  if (payloadResult.type === 'response') return payloadResult.response;

  const product = await updateProductForRoute(id, payloadResult.updatePayload, options);
  timings.set('serviceUpdate', performance.now() - updateStart);
  timings.set('validatedFields', Object.keys(payloadResult.validatedPayload).length);

  if (product === null) {
    throw notFoundError('Product not found', { productId: id });
  }
  CachedProductService.invalidateProduct(id);
  timings.set('total', performance.now() - totalStart);
  await logProductTiming('[timing] products.[id].PUT', id, timings);
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

  const product = await updateProductForRoute(id, updateData, buildMutationOptions(_ctx));

  if (product === null) {
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
  const product: ProductRecord | null = await productService.deleteProduct(
    id,
    buildMutationOptions(_ctx)
  );

  if (product === null) {
    throw notFoundError('Product not found', { productId: id });
  }
  await cleanupDeletedProductEcommerceExport(id);
  CachedProductService.invalidateProduct(id);
  return new Response(null, { status: 204 });
}
