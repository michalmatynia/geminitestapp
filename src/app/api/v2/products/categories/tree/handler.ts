import { type NextRequest, NextResponse } from 'next/server';
import { type z } from 'zod';

import { CachedProductService } from '@/features/products/server';
import { getCategoryRepository, getProductDataProvider } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { optionalCatalogIdWithFreshQuerySchema } from '@/shared/validations/product-metadata-api-schemas';

export const querySchema = optionalCatalogIdWithFreshQuerySchema;

/**
 * GET /api/v2/products/categories/tree
 * Fetches product categories as a hierarchical tree structure.
 * Query params:
 * - catalogId: Filter by catalog (optional)
 */
export async function getHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const catalogId = query.catalogId ?? '';
  const forceFresh = query.fresh;

  const tree = forceFresh || catalogId === ''
    ? await (async () => {
      const primaryProvider = await getProductDataProvider();
      const repository = await getCategoryRepository(primaryProvider);
      return repository.getCategoryTree(catalogId === '' ? undefined : catalogId);
    })()
    : await CachedProductService.getCategoryTree(catalogId);

  return NextResponse.json(tree);
}
