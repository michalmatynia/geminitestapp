import { NextRequest, NextResponse } from 'next/server';

import { assertDatabaseEngineManageAccess } from '@/shared/lib/db/services/database-engine-access';
import { assertDatabaseEngineOperationEnabled } from '@/shared/lib/db/services/database-engine-operation-guards';
import { restorePrismaJsonBackup } from '@/shared/lib/db/services/database-json-backup';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  await assertDatabaseEngineOperationEnabled('allowManualBackupMaintenance');

  const body = (await req.json()) as { backupName?: string };
  const backupName = body.backupName;

  if (!backupName) {
    throw badRequestError('Backup name is required');
  }

  const result = await restorePrismaJsonBackup(backupName);
  return NextResponse.json(result);
}
