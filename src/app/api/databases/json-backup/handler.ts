import { NextRequest, NextResponse } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { assertDatabaseEngineManageAccess } from '@/features/database/server';
import { assertDatabaseEngineOperationEnabled } from '@/shared/lib/db/services/database-engine-operation-guards';
import {
  createDatabaseJsonBackup,
  listJsonBackups,
} from '@/shared/lib/db/services/database-json-backup';

export async function POST_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  await assertDatabaseEngineOperationEnabled('allowManualBackupRunNow');

  const result = (await createDatabaseJsonBackup()) as unknown;
  return NextResponse.json(result);
}

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();

  const backups = await listJsonBackups();
  return NextResponse.json({ backups });
}
