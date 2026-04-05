import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { CachedProductService, performanceMonitor } from '@/features/products/performance';
import { getProductDataProvider } from '@/features/products/server';
import { validateProductCreateMiddleware } from '@/features/products/validations/middleware';
import { productCreateInputSchema } from '@/shared/contracts/products/io';
import { type ProductWithImages } from '@/shared/contracts/products';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, payloadTooLargeError } from '@/shared/errors/app-error';
import { env } from '@/shared/lib/env';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import {
  formDataToObject,
  productService,
  productFilterSchema,
  type ProductFiltersParsed,
} from '@/features/products/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const freshQuerySchema = z.preprocess(
  (value: unknown) => {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
      return true;
    }
    if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
      return false;
    }
    return value;
  },
  z.boolean().optional()
);

export const querySchema = productFilterSchema.extend({
  fresh: freshQuerySchema,
});

/** GET /api/v2/products: list products with caching + performance monitoring. */
const shouldLogTiming = () => env.DEBUG_API_TIMING;

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

const buildProductPayload = (
  formData: FormData
): Record<string, unknown> => {
  const payload = formDataToObject(formData);
  delete payload['images'];
  return payload;
};

const readProductCreateFormData = async (req: NextRequest): Promise<FormData> => {
  try {
    return await req.formData();
  } catch (error) {
    void ErrorSystem.captureException(error);
    if (isLikelyPayloadTooLarge(error)) {
      throw payloadTooLargeError(
        'Upload payload too large. Reduce image sizes/count or increase proxyClientMaxBodySize.'
      );
    }
    throw badRequestError('Invalid form data payload', { error });
  }
};

const resolveProductCreateOptions = (userId: string | null | undefined): { userId: string } | {} =>
  userId ? { userId } : {};

const findIdempotentProductResponse = async (
  req: NextRequest,
  payload: z.infer<typeof productCreateInputSchema>
): Promise<Response | null> => {
  const idempotencyKey = req.headers.get('idempotency-key') ?? req.headers.get('x-idempotency-key');
  const normalizedSku = payload.sku.trim();
  if (!idempotencyKey || !normalizedSku) {
    return null;
  }

  const existing: ProductWithImages | null = await CachedProductService.getProductBySku(normalizedSku);
  if (!existing) {
    return null;
  }

  return NextResponse.json({
    ...existing,
    idempotent: true,
  });
};

export async function GET_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const query = ctx.query as ProductFiltersParsed & { fresh?: boolean };
  const { fresh, ...filters } = query;
  const timings: Record<string, number | null | undefined> = {};
  const forceFresh = fresh === true;

  try {
    // Use CachedProductService to improve performance unless fresh data is requested.
    let provider: Awaited<ReturnType<typeof getProductDataProvider>> | null = null;
    const products = forceFresh
      ? await (async () => {
        const providerStart = performance.now();
        const freshProvider = await getProductDataProvider();
        provider = freshProvider;
        timings['provider'] = performance.now() - providerStart;
        return productService.getProducts(filters as ProductFiltersParsed, {
          timings,
          provider: freshProvider,
        });
      })()
      : await CachedProductService.getProducts(filters as ProductFiltersParsed);

    timings['total'] = ctx.getElapsedMs();

    if (shouldLogTiming()) {
      await logSystemEvent({
        level: 'info',
        message: '[timing] products.GET',
        context: { ...(provider ? { provider } : {}), ...timings },
      });
    }

    const response = NextResponse.json(products);
    attachTimingHeaders(response, timings);
    return response;
  } catch (error) {
    void ErrorSystem.captureException(error);
    timings['total'] = ctx.getElapsedMs();
    if (shouldLogTiming()) {
      await logSystemEvent({
        level: 'info',
        message: '[timing] products.GET error',
        context: timings,
      });
    }
    performanceMonitor.record('db.error', 1, { operation: 'getProducts' });
    throw error; // Let apiHandler handle logging and response
  }
}

/** POST /api/v2/products: create product with validation + cache invalidation. */
export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const formData = await readProductCreateFormData(req);

  // Validate the form data
  const validation = await validateProductCreateMiddleware(formData);
  if (!validation.success) {
    return validation.response;
  }
  const payload = buildProductPayload(formData);
  const validatedPayload = productCreateInputSchema.parse(payload);

  const idempotentResponse = await findIdempotentProductResponse(req, validatedPayload);
  if (idempotentResponse) {
    return idempotentResponse;
  }

  const product: ProductWithImages | null = await productService.createProduct(
    formData,
    resolveProductCreateOptions(_ctx.userId)
  );

  // Invalidate relevant caches
  CachedProductService.invalidateAll();

  return NextResponse.json(product);
}
