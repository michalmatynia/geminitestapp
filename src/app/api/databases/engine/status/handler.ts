import { NextRequest, NextResponse } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { assertDatabaseEngineManageAccess } from '@/features/database/server';
import { getDatabaseEngineStatus } from '@/shared/lib/db/services/database-engine-status';

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  const payload = await getDatabaseEngineStatus();
  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
