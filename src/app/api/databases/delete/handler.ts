import { promises as fs } from 'fs';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import {
  pgBackupsDir,
  assertValidPgBackupName,
  mongoBackupsDir,
  assertValidMongoBackupName,
} from '@/features/database/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { parseObjectJsonBody } from '@/shared/lib/api/parse-json';
import { assertDatabaseEngineManageAccess } from '@/shared/lib/db/services/database-engine-access';
import { assertDatabaseEngineOperationEnabled } from '@/shared/lib/db/services/database-engine-operation-guards';

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  await assertDatabaseEngineOperationEnabled('allowManualBackupMaintenance');

  const parsed = await parseObjectJsonBody(req, {
    logPrefix: 'databases.delete',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const { backupName, type } = parsed.data as {
    backupName: string;
    type?: 'postgresql' | 'mongodb';
  };
  if (!backupName) {
    throw badRequestError('Backup name is required');
  }

  const dbType = type === 'mongodb' ? 'mongodb' : 'postgresql';
  if (dbType === 'mongodb') {
    assertValidMongoBackupName(backupName);
  } else {
    assertValidPgBackupName(backupName);
  }

  const backupsDir = dbType === 'mongodb' ? mongoBackupsDir : pgBackupsDir;
  const backupPath = path.join(backupsDir, backupName);
  await fs.unlink(backupPath);

  return NextResponse.json({ message: 'Backup deleted' });
}
