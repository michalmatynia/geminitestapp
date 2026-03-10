import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { optionalCsvQueryStringArray } from '@/shared/lib/api/query-schema';
import { assertDatabaseEngineManageAccess } from '@/shared/lib/db/services/database-engine-access';
import { getDatabaseEngineProviderPreview } from '@/shared/lib/db/services/database-engine-provider-preview';

export const querySchema = z.object({
  collections: optionalCsvQueryStringArray(),
});

const resolveProviderPreviewQueryInput = (
  req: Request,
  ctx: ApiHandlerContext
): Record<string, unknown> => ({
  ...Object.fromEntries(new URL(req.url).searchParams.entries()),
  ...((ctx.query ?? {}) as Record<string, unknown>),
});

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  const query = querySchema.parse(resolveProviderPreviewQueryInput(req, _ctx));
  const collections = query.collections;
  const payload = await getDatabaseEngineProviderPreview(collections ? { collections } : {});
  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
