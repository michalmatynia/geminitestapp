export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { getCategoryRepository } from '@/features/products/server';
import { badRequestError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

/**
 * GET /api/products/categories/tree
 * Fetches product categories as a hierarchical tree structure.
 * Query params:
 * - catalogId: Filter by catalog (required)
 */
async function getHandlerInternal(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const catalogId = searchParams.get('catalogId');

  if (!catalogId) {
    throw badRequestError('catalogId query parameter is required');
  }

  const repository = await getCategoryRepository();
  const tree = await repository.getCategoryTree(catalogId);
  
  return NextResponse.json(tree);
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => getHandlerInternal(req, ctx),
  { source: 'products.categories.tree.GET' });
