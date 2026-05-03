import { type NextRequest, NextResponse } from 'next/server';

import { runProductBaseSyncBulk } from '@/features/product-sync/services/product-sync-service';
import type {
  ProductSyncBulkRequest,
  ProductSyncBulkResponse,
} from '@/shared/contracts/product-sync';
import { productSyncBulkRequestSchema } from '@/shared/contracts/product-sync';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export const bulkSchema = productSyncBulkRequestSchema;

export async function postHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as ProductSyncBulkRequest;
  const response: ProductSyncBulkResponse = await runProductBaseSyncBulk(body.productIds, {
    ...(body.profileId ? { profileId: body.profileId } : {}),
  });
  return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
}
