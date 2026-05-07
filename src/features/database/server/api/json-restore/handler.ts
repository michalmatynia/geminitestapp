import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { parseObjectJsonBody } from '@/shared/lib/api/parse-json';
import { assertDatabaseEngineManageAccess } from '@/features/database/server';
import { assertDatabaseEngineOperationEnabled } from '@/shared/lib/db/services/database-engine-operation-guards';
import { restoreDatabaseJsonBackup } from '@/shared/lib/db/services/database-json-backup';

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  await assertDatabaseEngineOperationEnabled('allowManualBackupMaintenance');

  const parsed = await parseObjectJsonBody(req, {
    logPrefix: 'databases.json-restore',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const body = parsed.data as { backupName?: string };
  z.unknown().parse(body);
  const backupName = body.backupName;

  if (!backupName) {
    throw badRequestError('Backup name is required');
  }

  const result = await restoreDatabaseJsonBackup(backupName);
  return NextResponse.json(result);
}
