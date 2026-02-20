import { NextRequest, NextResponse } from 'next/server';

import { getDatabaseEngineStatus } from '@/features/database/services/database-engine-status';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const payload = await getDatabaseEngineStatus();
  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
