import { type NextRequest, NextResponse } from 'next/server';
import { type z } from 'zod';

import { CachedProductService } from '@/features/products/server';
import { getCategoryRepository, getProductDataProvider } from '@/features/products/server';
import { createProductCategorySchema } from '@/shared/contracts/products/categories';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, conflictError } from '@/shared/errors/app-error';
import { attachTimingHeaders } from '@/shared/lib/api/timing-utils';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import {
  catalogIdWithFreshQuerySchema,
  type CatalogIdWithFreshQuery,
} from '@/shared/validations/product-metadata-api-schemas';

const shouldLogTiming = () => process.env['DEBUG_API_TIMING'] === 'true';

export const querySchema = catalogIdWithFreshQuerySchema;

export { createProductCategorySchema as productCategoryCreateSchema };

/**
 * GET /api/v2/products/categories
 * Fetches all product categories (flat list).
 * Query params:
 * - catalogId: Filter by catalog (required)
 */
export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const timings: Record<string, number | null | undefined> = {};
  const requestStart = performance.now();
  const query = _ctx.query as CatalogIdWithFreshQuery | undefined;
  const catalogId = query?.catalogId ?? '';

  if (!catalogId) {
    throw badRequestError('catalogId query parameter is required');
  }

  const forceFresh = query?.fresh === true;
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
  const data = ctx.body as z.infer<typeof createProductCategorySchema>;
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
    ...(data.name_pl !== undefined ? { name_pl: data.name_pl } : {}),
    catalogId,
    color: data.color ?? null,
    parentId: data.parentId ?? null,
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.sortIndex !== undefined ? { sortIndex: data.sortIndex } : {}),
  });

  CachedProductService.invalidateAll();

  return NextResponse.json(category, { status: 201 });
}
