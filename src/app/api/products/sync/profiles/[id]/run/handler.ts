import { NextRequest, NextResponse } from 'next/server';

import { startProductSyncRun } from '@/features/product-sync/services/product-sync-run-starter';
import type { ApiHandlerContext } from '@/shared/types/api/api';

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
