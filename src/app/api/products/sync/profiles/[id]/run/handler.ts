import { NextRequest, NextResponse } from 'next/server';

import { startProductSyncRun } from '@/shared/lib/product-sync/services/product-sync-run-starter';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function POST_handler(
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
