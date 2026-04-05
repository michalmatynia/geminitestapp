import { NextRequest, NextResponse } from 'next/server';

import { getTagRepository } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

/**
 * GET /api/v2/products/tags/all
 * Fetches all product tags across catalogs.
 */
export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const repository = await getTagRepository();
  const tags = await repository.listTags({});
  return NextResponse.json(tags);
}
