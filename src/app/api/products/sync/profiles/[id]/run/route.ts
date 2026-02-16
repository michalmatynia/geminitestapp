export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { startProductSyncRun } from '@/features/integrations/services/product-sync/product-sync-run-starter';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const run = await startProductSyncRun({
    profileId: params.id,
    trigger: 'manual',
  });
  return NextResponse.json(run, { headers: { 'Cache-Control': 'no-store' } });
}

export const POST = apiHandlerWithParams<{ id: string }>(POST_handler, {
  source: 'products.sync.profiles.[id].run.POST',
});
