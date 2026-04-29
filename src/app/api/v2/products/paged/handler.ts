import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { CachedProductService } from '@/features/products/performance';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { env } from '@/shared/lib/env';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { productService } from '@/shared/lib/products/services/productService';
import { productFilterSchema, type ProductFiltersParsed } from '@/shared/lib/products/validations';

import { freshQuerySchema } from '../fresh-query-schema';

const shouldLogTiming = (): boolean => env.DEBUG_API_TIMING;

export const querySchema = z.intersection(
  productFilterSchema,
  z.object({
    fresh: freshQuerySchema,
  })
);

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
  if (value.length > 0) {
    response.headers.set('Server-Timing', value);
  }
};

const resolvePagedProductsQueryInput = (
  req: NextRequest,
  ctx: ApiHandlerContext
): Record<string, unknown> => ({
  ...Object.fromEntries(req.nextUrl.searchParams.entries()),
  ...((ctx.query ?? {}) as Record<string, unknown>),
});

/**
 * GET /api/v2/products/paged
 * Returns { products: ProductWithImages[], total: number } in a single request,
 * using the repository's optimized paged fetch path.
 * MongoDB uses a single $facet aggregation for filtered queries and keeps the
 * unfiltered path on the indexed list query + estimatedDocumentCount fast path.
 */
export async function getHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const timings: Record<string, number | null | undefined> = {};
  const query = querySchema.parse(resolvePagedProductsQueryInput(req, ctx)) as ProductFiltersParsed &
    { fresh?: boolean };
  const { fresh, ...filters } = query;
  const forceFresh = fresh === true;
  const serviceStart = performance.now();
  const result = forceFresh
    ? await productService.getProductsWithCount(filters as ProductFiltersParsed)
    : await CachedProductService.getProductsWithCount(filters as ProductFiltersParsed);
  timings['service'] = performance.now() - serviceStart;
  timings['total'] = ctx.getElapsedMs();

  if (shouldLogTiming()) {
    await logSystemEvent({
      level: 'info',
      message: '[timing] products.paged.GET',
      context: timings,
    });
  }

  const response = NextResponse.json(result);
  attachTimingHeaders(response, timings);
  return response;
}
