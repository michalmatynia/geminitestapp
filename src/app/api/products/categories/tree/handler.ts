import { NextRequest, NextResponse } from 'next/server';

import { getCategoryRepository, getProductDataProvider } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

/**
 * GET /api/products/categories/tree
 * Fetches product categories as a hierarchical tree structure.
 * Query params:
 * - catalogId: Filter by catalog (required)
 */
export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const catalogId = searchParams.get('catalogId');

  if (!catalogId) {
    throw badRequestError('catalogId query parameter is required');
  }

  const primaryProvider = await getProductDataProvider();
  const repository = await getCategoryRepository(primaryProvider);
  const tree = await repository.getCategoryTree(catalogId);
  
  return NextResponse.json(tree);
}
