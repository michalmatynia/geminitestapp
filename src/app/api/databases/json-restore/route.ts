export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { restorePrismaJsonBackup } from '@/features/database/services/database-json-backup';
import { assertDatabaseEngineManageAccess } from '@/features/database/services/database-engine-access';
import { assertDatabaseEngineOperationEnabled } from '@/features/database/services/database-engine-operation-guards';
import { badRequestError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

async function POST_handler(req: NextRequest): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  await assertDatabaseEngineOperationEnabled('allowManualBackupMaintenance');

  const body = await req.json() as { backupName?: string };
  const backupName = body.backupName;

  if (!backupName) {
    throw badRequestError('Backup name is required');
  }

  const result = await restorePrismaJsonBackup(backupName);
  return NextResponse.json(result);
}

export const POST = apiHandler(
  async (req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> => POST_handler(req),
  { source: 'databases.json-restore.POST' }
);
