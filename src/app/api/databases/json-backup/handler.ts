import { NextRequest, NextResponse } from 'next/server';

import { assertDatabaseEngineManageAccess } from '@/features/database/services/database-engine-access';
import { assertDatabaseEngineOperationEnabled } from '@/features/database/services/database-engine-operation-guards';
import {
  createPrismaJsonBackup,
  listJsonBackups,
} from '@/features/database/services/database-json-backup';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function POST_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  await assertDatabaseEngineOperationEnabled('allowManualBackupRunNow');

  const result = (await createPrismaJsonBackup()) as unknown;
  return NextResponse.json(result);
}

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();

  const backups = await listJsonBackups();
  return NextResponse.json({ backups });
}
