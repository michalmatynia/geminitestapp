import { type NextRequest, NextResponse } from 'next/server';

import { assertDatabaseEngineManageAccess } from '@/features/database/server';
import { databaseEngineManagedMongoBackupRequestSchema } from '@/shared/contracts/database';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { parseObjectJsonBody } from '@/shared/lib/api/parse-json';
import { assertDatabaseEngineOperationEnabled } from '@/shared/lib/db/services/database-engine-operation-guards';
import { createMongoManagedBackup } from '@/shared/lib/db/services/database-backup';

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  await assertDatabaseEngineOperationEnabled('allowManualBackupRunNow');

  const parsed = await parseObjectJsonBody(req, {
    logPrefix: 'database-engine-web.databases.engine.managed.backup.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const body = databaseEngineManagedMongoBackupRequestSchema.parse(parsed.data);
  const payload = await createMongoManagedBackup(body.application);

  return NextResponse.json(
    {
      success: true,
      ...payload,
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
