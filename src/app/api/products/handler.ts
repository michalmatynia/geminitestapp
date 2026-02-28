import { NextRequest, NextResponse } from 'next/server';

import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { CachedProductService, performanceMonitor } from '@/features/products/performance';
import { getProductDataProvider } from '@/features/products/server';
import { productService } from '@/shared/lib/products/services/productService'; // Direct import
import { ProductFiltersParsed, productFilterSchema } from '@/shared/lib/products/validations';
import { validateProductCreateMiddleware } from '@/features/products/validations/middleware';
import type { ProductWithImages } from '@/shared/contracts/products';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, payloadTooLargeError } from '@/shared/errors/app-error';
import { env } from '@/shared/lib/env';

export { productFilterSchema };

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

export async function GET_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const filters = ctx.query as ProductFiltersParsed;
  const timings: Record<string, number | null | undefined> = {};
  const forceFresh = req.nextUrl.searchParams.get('fresh') === '1';

  try {
    const providerStart = performance.now();
    const provider = await getProductDataProvider();
    timings['provider'] = performance.now() - providerStart;

    // Use CachedProductService for better performance, unless fresh data is explicitly requested.
    const products = forceFresh
      ? await productService.getProducts(filters, { timings, provider })
      : await CachedProductService.getProducts(filters);

    timings['total'] = ctx.getElapsedMs();

    if (shouldLogTiming()) {
      await (logSystemEvent as any)({
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
      await (logSystemEvent as any)({
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
export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (error) {
    if (isLikelyPayloadTooLarge(error)) {
      throw payloadTooLargeError(
        'Upload payload too large. Reduce image sizes/count or increase proxyClientMaxBodySize.'
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
      skuField.trim()
    );
    if (existing) {
      return NextResponse.json({
        ...existing,
        idempotent: true,
      });
    }
  }

  const options = _ctx.userId ? { userId: _ctx.userId } : {};

  const product: ProductWithImages | null = await productService.createProduct(formData, options);

  // Invalidate relevant caches
  CachedProductService.invalidateAll();

  return NextResponse.json(product);
}
