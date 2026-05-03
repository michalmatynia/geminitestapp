import { type NextRequest, NextResponse } from 'next/server';

import { getCategoryRepository, getProductDataProvider } from '@/features/products/server';
import { toProductCategorySummaryDto } from '@/shared/contracts/products/categories';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { applyCacheLife } from '@/shared/lib/next/cache-life';
import type { CatalogIdQuery } from '@/shared/validations/product-metadata-api-schemas';

/**
 * GET /api/public/products/categories
 * Returns catalog-scoped product category metadata for public automation/runtime usage.
 */
async function listPublicProductCategoriesCached(catalogId: string) {
  'use cache';
  applyCacheLife('swr60');

  const primaryProvider = await getProductDataProvider();
  const repository = await getCategoryRepository(primaryProvider);
  const categories = await repository.listCategories({ catalogId });
  return categories.map(toProductCategorySummaryDto);
}

export async function getHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const query = ctx.query as CatalogIdQuery | undefined;
  const catalogId =
    query?.catalogId ?? new URL(req.url).searchParams.get('catalogId')?.trim() ?? '';

  if (!catalogId) {
    throw badRequestError('catalogId query parameter is required');
  }
  return NextResponse.json(await listPublicProductCategoriesCached(catalogId));
}
