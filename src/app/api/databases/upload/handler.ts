import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import {
  mongoBackupsDir,
  ensureMongoBackupsDir,
  assertValidMongoBackupName,
} from '@/features/database/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, forbiddenError } from '@/shared/errors/app-error';
import { assertDatabaseEngineManageAccess } from '@/features/database/server';
import { assertDatabaseEngineOperationEnabled } from '@/shared/lib/db/services/database-engine-operation-guards';

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  await assertDatabaseEngineOperationEnabled('allowManualBackupMaintenance');

  if (process.env['NODE_ENV'] === 'production') {
    throw forbiddenError('Database backups are disabled in production.');
  }
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const type = formData.get('type') as string | null;

  if (!file) {
    throw badRequestError('No file provided');
  }

  if (type && type !== 'mongodb') {
    throw badRequestError('Only MongoDB backup uploads are supported.');
  }
  assertValidMongoBackupName(file.name);
  await ensureMongoBackupsDir();

  const backupPath = path.join(mongoBackupsDir, file.name);
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  await fs.writeFile(backupPath, fileBuffer);

  return NextResponse.json({ message: 'Backup uploaded' });
}
