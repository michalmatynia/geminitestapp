import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getDatabaseEngineProviderPreview } from '@/shared/lib/db/services/database-engine-provider-preview';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { optionalCsvQueryStringArray } from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  collections: optionalCsvQueryStringArray(),
});

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const collections = query.collections;
  const payload = await getDatabaseEngineProviderPreview(collections ? { collections } : {});
  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
