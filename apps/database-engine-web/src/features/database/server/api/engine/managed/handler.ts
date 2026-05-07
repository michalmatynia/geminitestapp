import { type NextRequest, NextResponse } from 'next/server';

import { assertDatabaseEngineManageAccess } from '@/features/database/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { getManagedMongoDatabasesStatus } from '@/shared/lib/db/services/managed-mongo-databases';

export async function getHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  const payload = await getManagedMongoDatabasesStatus();
  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
