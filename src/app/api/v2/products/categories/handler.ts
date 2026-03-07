import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { CachedProductService } from '@/features/products/server';
import { getCategoryRepository, getProductDataProvider } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, conflictError } from '@/shared/errors/app-error';
import type { CatalogIdQuery } from '@/shared/validations/product-metadata-api-schemas';

const shouldLogTiming = () => process.env['DEBUG_API_TIMING'] === 'true';

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

export const productCategoryCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  catalogId: z.string().min(1, 'Catalog ID is required'),
  sortIndex: z.number().int().min(0).optional(),
});

/**
 * GET /api/v2/products/categories
 * Fetches all product categories (flat list).
 * Query params:
 * - catalogId: Filter by catalog (required)
 */
export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const timings: Record<string, number | null | undefined> = {};
  const requestStart = performance.now();
  const query = _ctx.query as CatalogIdQuery | undefined;
  const catalogId =
    query?.catalogId ?? new URL(req.url).searchParams.get('catalogId')?.trim() ?? '';

  if (!catalogId) {
    throw badRequestError('catalogId query parameter is required');
  }

  const forceFresh = req.nextUrl.searchParams.get('fresh') === '1';
  const repositoryStart = performance.now();

  const categories = forceFresh
    ? await (async () => {
      const primaryProvider = await getProductDataProvider();
      const repository = await getCategoryRepository(primaryProvider);
      return repository.listCategories({ catalogId });
    })()
    : await CachedProductService.listCategories({ catalogId });

  timings['repository'] = performance.now() - repositoryStart;

  timings['total'] = performance.now() - requestStart;
  if (shouldLogTiming()) {
    await logSystemEvent({
      level: 'info',
      message: '[timing] products.categories.GET',
      context: { timings },
    });
  }

  const response = NextResponse.json(categories);
  attachTimingHeaders(response, timings);
  return response;
}

/**
 * POST /api/v2/products/categories
 * Creates a new product category.
 */
export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const data = ctx.body as z.infer<typeof productCategoryCreateSchema>;
  const { name, parentId, catalogId } = data;
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw badRequestError('Category name is required');
  }

  const repository = await getCategoryRepository();

  // Check for duplicate name under the same parent within the same catalog
  const existing = await repository.findByName(catalogId, normalizedName, parentId ?? null);

  if (existing) {
    throw conflictError('A category with this name already exists at this level', {
      name: normalizedName,
      parentId: parentId ?? null,
      catalogId,
    });
  }

  const category = await repository.createCategory({
    name: normalizedName,
    catalogId,
    color: data.color ?? null,
    parentId: data.parentId ?? null,
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.sortIndex !== undefined ? { sortIndex: data.sortIndex } : {}),
  });

  CachedProductService.invalidateAll();

  return NextResponse.json(category, { status: 201 });
}
