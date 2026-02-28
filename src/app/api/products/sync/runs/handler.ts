import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { listProductSyncRuns } from '@/shared/lib/product-sync/services/product-sync-repository';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export const querySchema = z.object({
  profileId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export async function GET_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const query = (ctx.query ?? {}) as z.infer<typeof querySchema>;
  const runs = await listProductSyncRuns({
    ...(query.profileId ? { profileId: query.profileId } : {}),
    ...(query.limit ? { limit: query.limit } : {}),
  });

  return NextResponse.json({ runs }, { headers: { 'Cache-Control': 'no-store' } });
}
