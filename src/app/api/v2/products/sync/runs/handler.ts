import { NextRequest, NextResponse } from 'next/server';

import { listProductSyncRuns } from '@/features/product-sync/services/product-sync-repository';
import type { ProductSyncRunListQuery, ProductSyncRunsResponse } from '@/shared/contracts/product-sync';
import { productSyncRunListQuerySchema } from '@/shared/contracts/product-sync';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export const querySchema = productSyncRunListQuerySchema;

export async function GET_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const query = (ctx.query ?? {}) as ProductSyncRunListQuery;
  const runs = await listProductSyncRuns({
    ...(query.profileId ? { profileId: query.profileId } : {}),
    ...(query.limit ? { limit: query.limit } : {}),
  });

  const response: ProductSyncRunsResponse = { runs };
  return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
}
