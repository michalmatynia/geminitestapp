import { NextRequest, NextResponse } from 'next/server';

import { enqueueProductSyncBackfillJob } from '@/features/jobs/server';
import type {
  ProductSyncRelinkPayload,
  ProductSyncRelinkResponse,
} from '@/shared/contracts/product-sync';
import { productSyncRelinkPayloadSchema } from '@/shared/contracts/product-sync';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

export const relinkSchema = productSyncRelinkPayloadSchema;

export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as ProductSyncRelinkPayload;
  const jobId = await enqueueProductSyncBackfillJob({
    ...(body.connectionId ? { connectionId: body.connectionId } : {}),
    ...(body.inventoryId ? { inventoryId: body.inventoryId } : {}),
    ...(body.catalogId !== undefined ? { catalogId: body.catalogId } : {}),
    ...(body.limit !== undefined ? { limit: body.limit } : {}),
    source: 'api-products-sync-relink',
  });

  const response: ProductSyncRelinkResponse = { status: 'queued', jobId };
  return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
}
