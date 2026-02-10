export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { getTagRepository } from '@/features/products/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

/**
 * GET /api/products/tags/all
 * Fetches all product tags across catalogs.
 */
async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const repository = await getTagRepository();
  const tags = await repository.listTags({});
  return NextResponse.json(tags);
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'products.tags.all.GET' }
);
