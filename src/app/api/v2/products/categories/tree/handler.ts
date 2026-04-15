import { type NextRequest, NextResponse } from 'next/server';
import { type z } from 'zod';

import { CachedProductService } from '@/features/products/server';
import { getCategoryRepository, getProductDataProvider } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { optionalBooleanQuerySchema } from '@/shared/lib/api/query-schema';
import { catalogIdQuerySchema } from '@/shared/validations/product-metadata-api-schemas';

export const querySchema = catalogIdQuerySchema.extend({
  fresh: optionalBooleanQuerySchema().default(false),
});

/**
 * GET /api/v2/products/categories/tree
 * Fetches product categories as a hierarchical tree structure.
 * Query params:
 * - catalogId: Filter by catalog (required)
 */
export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const catalogId = query.catalogId;
  if (!catalogId) {
    throw badRequestError('catalogId query parameter is required');
  }
  const forceFresh = query.fresh;

  const tree = forceFresh
    ? await (async () => {
      const primaryProvider = await getProductDataProvider();
      const repository = await getCategoryRepository(primaryProvider);
      return repository.getCategoryTree(catalogId);
    })()
    : await CachedProductService.getCategoryTree(catalogId);

  return NextResponse.json(tree);
}
