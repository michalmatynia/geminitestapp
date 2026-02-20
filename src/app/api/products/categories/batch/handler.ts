import { NextRequest, NextResponse } from 'next/server';

import { getCategoryRepository, getProductDataProvider } from '@/features/products/server';
import { badRequestError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import type { ProductCategory } from '@/shared/contracts/products';

const MAX_CATALOG_IDS = 25;

/**
 * GET /api/products/categories/batch?catalogIds=id1,id2,id3
 * Returns categories grouped by catalogId in a single request,
 * eliminating the N parallel requests previously made by useQueries.
 */
export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const rawParam = new URL(req.url).searchParams.get('catalogIds')?.trim() ?? '';
  if (!rawParam) {
    throw badRequestError('catalogIds query parameter is required');
  }

  const catalogIds = rawParam
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (catalogIds.length === 0) {
    throw badRequestError('catalogIds must contain at least one ID');
  }
  if (catalogIds.length > MAX_CATALOG_IDS) {
    throw badRequestError(`catalogIds may contain at most ${MAX_CATALOG_IDS} IDs`);
  }

  const primaryProvider = await getProductDataProvider();
  const repository = await getCategoryRepository(primaryProvider);

  const results = await Promise.all(
    catalogIds.map(async (catalogId) => {
      const categories = await repository.listCategories({ catalogId });
      return [catalogId, categories] as [string, ProductCategory[]];
    })
  );

  const grouped: Record<string, ProductCategory[]> = Object.fromEntries(results);
  return NextResponse.json(grouped);
}
