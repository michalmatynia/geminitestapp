import { NextRequest, NextResponse } from 'next/server';

import { getCategoryRepository, getProductDataProvider } from '@/features/products/server';
import { badRequestError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/types/api/api';
import type { ProductCategory } from '@/shared/types/domain/products';
import type { CatalogIdQuery } from '@/shared/validations/product-metadata-api-schemas';

type PublicProductCategory = {
  id: string;
  name: string;
  name_en: string | null;
  name_pl: string | null;
  name_de: string | null;
  parentId: string | null;
  sortIndex: number | null;
};

const toPublicProductCategory = (
  category: ProductCategory
): PublicProductCategory => ({
  id: category.id,
  name: category.name,
  name_en: category.name_en ?? null,
  name_pl: category.name_pl ?? null,
  name_de: category.name_de ?? null,
  parentId: category.parentId,
  sortIndex: category.sortIndex ?? null,
});

/**
 * GET /api/public/products/categories
 * Returns catalog-scoped product category metadata for public automation/runtime usage.
 */
export async function GET_handler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = ctx.query as CatalogIdQuery | undefined;
  const catalogId =
    query?.catalogId ??
    new URL(req.url).searchParams.get('catalogId')?.trim() ??
    '';

  if (!catalogId) {
    throw badRequestError('catalogId query parameter is required');
  }

  const primaryProvider = await getProductDataProvider();
  const repository = await getCategoryRepository(primaryProvider);
  const categories = await repository.listCategories({ catalogId });

  return NextResponse.json(categories.map(toPublicProductCategory));
}
