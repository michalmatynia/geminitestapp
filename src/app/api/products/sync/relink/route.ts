export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { enqueueProductSyncBackfillJob } from '@/features/jobs/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const relinkSchema = z.object({
  connectionId: z.string().trim().min(1).optional(),
  inventoryId: z.string().trim().min(1).optional(),
  catalogId: z.string().trim().nullable().optional(),
  limit: z.number().int().min(1).max(100_000).optional(),
});

async function POST_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as z.infer<typeof relinkSchema>;
  const jobId = await enqueueProductSyncBackfillJob({
    ...(body.connectionId ? { connectionId: body.connectionId } : {}),
    ...(body.inventoryId ? { inventoryId: body.inventoryId } : {}),
    ...(body.catalogId !== undefined ? { catalogId: body.catalogId } : {}),
    ...(body.limit !== undefined ? { limit: body.limit } : {}),
    source: 'api-products-sync-relink',
  });

  return NextResponse.json(
    { status: 'queued', jobId },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export const POST = apiHandler(POST_handler, {
  source: 'products.sync.relink.POST',
  parseJsonBody: true,
  bodySchema: relinkSchema,
});
