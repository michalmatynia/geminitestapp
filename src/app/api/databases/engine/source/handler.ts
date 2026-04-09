import { NextRequest, NextResponse } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { assertDatabaseEngineManageAccess } from '@/features/database/server';
import { applyActiveMongoSourceEnv, getMongoSourceState } from '@/shared/lib/db/mongo-source';

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  await applyActiveMongoSourceEnv();
  const payload = await getMongoSourceState();
  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
