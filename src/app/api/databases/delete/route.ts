export const runtime = 'nodejs';

import { promises as fs } from 'fs';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import {
  pgBackupsDir,
  assertValidPgBackupName,
  mongoBackupsDir,
  assertValidMongoBackupName,
} from '@/features/database/server';
import { assertDatabaseEngineManageAccess } from '@/features/database/services/database-engine-access';
import { assertDatabaseEngineOperationEnabled } from '@/features/database/services/database-engine-operation-guards';
import { badRequestError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  await assertDatabaseEngineOperationEnabled('allowManualBackupMaintenance');

  const { backupName, type } = (await req.json()) as {
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

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'databases.delete.POST' });
