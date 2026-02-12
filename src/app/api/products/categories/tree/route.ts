export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { logSystemEvent } from '@/features/observability/server';
import { getCategoryRepository, getProductDataProvider } from '@/features/products/server';
import { badRequestError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

export const revalidate = 300;

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

  const primaryProvider = await getProductDataProvider();
  const repository = await getCategoryRepository(primaryProvider);
  let tree = await repository.getCategoryTree(catalogId);

  if (tree.length === 0) {
    const fallbackProvider = primaryProvider === 'prisma' ? 'mongodb' : 'prisma';
    const canReadFallback =
      fallbackProvider === 'mongodb'
        ? Boolean(process.env['MONGODB_URI'])
        : Boolean(process.env['DATABASE_URL']);
    if (canReadFallback) {
      try {
        const fallbackRepository = await getCategoryRepository(fallbackProvider);
        const fallbackTree = await fallbackRepository.getCategoryTree(catalogId);
        if (fallbackTree.length > 0) {
          tree = fallbackTree;
          await logSystemEvent({
            level: 'warn',
            message:
              '[products.categories.tree.GET] Primary provider returned empty result; using fallback provider.',
            source: 'products.categories.tree.GET',
            request: req,
            context: {
              catalogId,
              primaryProvider,
              fallbackProvider,
              fallbackCount: fallbackTree.length,
            },
          });
        }
      } catch (error: unknown) {
        await logSystemEvent({
          level: 'warn',
          message: '[products.categories.tree.GET] Failed to read fallback provider.',
          source: 'products.categories.tree.GET',
          request: req,
          error,
          context: {
            catalogId,
            primaryProvider,
            fallbackProvider,
          },
        });
      }
    }
  }
  
  return NextResponse.json(tree);
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => getHandlerInternal(req, ctx),
  {
    source: 'products.categories.tree.GET',
  });
