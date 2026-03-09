import { NextRequest, NextResponse } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { getDatabaseEngineStatus } from '@/shared/lib/db/services/database-engine-status';

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const payload = await getDatabaseEngineStatus();
  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
