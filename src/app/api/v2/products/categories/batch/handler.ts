import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { CachedProductService } from '@/features/products/server';
import { getCategoryRepository, getProductDataProvider } from '@/features/products/server';
import type { ProductCategory } from '@/shared/contracts/products';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import {
  optionalBooleanQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

const MAX_CATALOG_IDS = 25;

export const querySchema = z.object({
  catalogIds: optionalTrimmedQueryString(),
  fresh: optionalBooleanQuerySchema().default(false),
});

/**
 * GET /api/v2/products/categories/batch?catalogIds=id1,id2,id3
 * Returns categories grouped by catalogId in a single request,
 * eliminating the N parallel requests previously made by useQueries.
 */
export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const rawParam = query.catalogIds ?? '';
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

  const forceFresh = query.fresh;
  const primaryProvider = await getProductDataProvider();
  const repository = await getCategoryRepository(primaryProvider);

  const results = await Promise.all(
    catalogIds.map(async (catalogId) => {
      const categories = forceFresh
        ? await repository.listCategories({ catalogId })
        : await CachedProductService.listCategories({ catalogId });
      return [catalogId, categories] as [string, ProductCategory[]];
    })
  );

  const grouped: Record<string, ProductCategory[]> = Object.fromEntries(results);
  return NextResponse.json(grouped);
}
