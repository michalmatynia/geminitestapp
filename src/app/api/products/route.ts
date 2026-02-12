import { NextRequest, NextResponse } from 'next/server';

import { logSystemEvent } from '@/features/observability/server';
import {
  CachedProductService,
  performanceMonitor,
} from '@/features/products/performance';
import { getProductDataProvider } from '@/features/products/server';
import { productService } from '@/features/products/services/productService'; // Direct import
import type { ProductWithImages } from '@/features/products/types';
import {
  ProductFiltersParsed,
  productFilterSchema,
} from '@/features/products/validations';
import { validateProductCreateMiddleware } from '@/features/products/validations/middleware';
import {
  badRequestError,
  payloadTooLargeError,
} from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import { env } from '@/shared/lib/env';
import type { ApiHandlerContext } from '@/shared/types/api/api';

export const revalidate = 60;

/**
 * GET /api/products
 * Fetches a list of products with caching and performance monitoring.
 */
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

const buildServerTiming = (
  entries: Record<string, number | null | undefined>,
): string => {
  const parts = Object.entries(entries)
    .filter(
      ([, value]) =>
        typeof value === 'number' && Number.isFinite(value) && value >= 0,
    )
    .map(([name, value]) => `${name};dur=${Math.round(value as number)}`);
  return parts.join(', ');
};

const attachTimingHeaders = (
  response: Response,
  entries: Record<string, number | null | undefined>,
): void => {
  const value = buildServerTiming(entries);
  if (value) {
    response.headers.set('Server-Timing', value);
  }
};

async function GET_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
): Promise<Response> {
  const filters = ctx.query as ProductFiltersParsed;
  const timings: Record<string, number | null | undefined> = {};

  try {
    const providerStart = performance.now();
    const provider = await getProductDataProvider();
    timings['provider'] = performance.now() - providerStart;

    // Read directly from the product service.
    const products = await productService.getProducts(filters, {
      timings,
      provider,
    });
    timings['total'] = ctx.getElapsedMs();

    if (shouldLogTiming()) {
      await logSystemEvent({
        level: 'info',
        message: '[timing] products.GET',
        context: { provider, ...timings },
      });
    }

    const response = NextResponse.json(products);
    attachTimingHeaders(response, timings);
    return response;
  } catch (error) {
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

/**
 * POST /api/products
 * Creates a new product with validation and cache invalidation.
 */
async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
): Promise<Response> {
  let formData: FormData;
  try {
     
    formData = await req.formData();
  } catch (error) {
    if (isLikelyPayloadTooLarge(error)) {
      throw payloadTooLargeError(
        'Upload payload too large. Reduce image sizes/count or increase proxyClientMaxBodySize.',
      );
    }
    throw badRequestError('Invalid form data payload', { error });
  }

  // Validate the form data
  const validation = await validateProductCreateMiddleware(formData);
  if (!validation.success) {
    return validation.response;
  }

   
  const idempotencyKey = req.headers.get('idempotency-key') ?? req.headers.get('x-idempotency-key');
  const skuField = formData.get('sku');
  if (idempotencyKey && typeof skuField === 'string' && skuField.trim()) {
    const existing: ProductWithImages | null = await CachedProductService.getProductBySku(
      skuField.trim(),
    );
    if (existing) {
       
      return NextResponse.json({
        ...existing,
        idempotent: true,
      });
    }
  }
  
  const options = _ctx.userId ? { userId: _ctx.userId } : undefined;
   
  const product: ProductWithImages | null = await productService.createProduct(formData, options);
  // Invalidate relevant caches
  CachedProductService.invalidateAll();

  return NextResponse.json(product);
}

export const GET = apiHandler(GET_handler, {
  source: 'products.GET',
  querySchema: productFilterSchema,
});

export const POST = apiHandler(POST_handler, { source: 'products.POST', logSuccess: true });
