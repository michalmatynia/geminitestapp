import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getExternalCategoryRepository } from '@/features/integrations/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import {
  optionalBooleanQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

const querySchema = z.object({
  connectionId: optionalTrimmedQueryString(),
  tree: optionalBooleanQuerySchema().default(false),
});

/**
 * GET /api/marketplace/categories
 * Lists external categories for a given connection.
 * Query params:
 *   - connectionId (required): The integration connection ID
 *   - tree (optional): If "true", returns categories as a hierarchical tree
 */
export async function GET_handler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const query = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!query.success) {
    throw badRequestError('Invalid marketplace categories query.', {
      errors: query.error.flatten(),
    });
  }

  const { connectionId, tree } = query.data;

  if (!connectionId) {
    throw badRequestError('connectionId is required');
  }

  const repo = getExternalCategoryRepository();

  if (tree) {
    const categories = await repo.getTreeByConnection(connectionId);
    return NextResponse.json(categories);
  }

  const categories = await repo.listByConnection(connectionId);
  return NextResponse.json(categories);
}
