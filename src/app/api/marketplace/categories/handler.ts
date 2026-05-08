import { type NextRequest, NextResponse } from 'next/server';

import { getExternalCategoryRepository } from '@/features/integrations/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { listMarketplaceCategories, parseMarketplaceCategoriesQuery } from './handler.helpers';

/**
 * GET /api/marketplace/categories
 * Lists external categories for a given connection or supported marketplace.
 * Query params:
 *   - connectionId: The integration connection ID
 *   - marketplace: Supported marketplace scope. Tradera is connection agnostic.
 *   - tree (optional): If "true", returns categories as a hierarchical tree
 */
export async function getHandler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const query = parseMarketplaceCategoriesQuery(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  );
  const repo = getExternalCategoryRepository();
  const categories = await listMarketplaceCategories(repo, query);
  return NextResponse.json(categories);
}
