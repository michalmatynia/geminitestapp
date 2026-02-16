export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { listProductSyncRuns } from '@/features/integrations/services/product-sync/product-sync-repository';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const querySchema = z.object({
  profileId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

async function GET_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const query = (ctx.query ?? {}) as z.infer<typeof querySchema>;
  const runs = await listProductSyncRuns({
    ...(query.profileId ? { profileId: query.profileId } : {}),
    ...(query.limit ? { limit: query.limit } : {}),
  });

  return NextResponse.json(
    { runs },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export const GET = apiHandler(GET_handler, {
  source: 'products.sync.runs.GET',
  requireCsrf: false,
  querySchema,
  cacheControl: 'no-store',
});
