import { promises as fs } from 'fs';
import path from 'path';

import { type NextRequest, NextResponse } from 'next/server';

import {
  mongoBackupsDir,
  assertValidMongoBackupName,
} from '@/features/database/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { parseObjectJsonBody } from '@/shared/lib/api/parse-json';
import { assertDatabaseEngineManageAccess } from '@/features/database/server';
import { assertDatabaseEngineOperationEnabled } from '@/shared/lib/db/services/database-engine-operation-guards';

const isMissingFileError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === 'ENOENT';

const unlinkIfPresent = async (filePath: string): Promise<void> => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (isMissingFileError(error)) return;
    throw error;
  }
};

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  await assertDatabaseEngineOperationEnabled('allowManualBackupMaintenance');

  const parsed = await parseObjectJsonBody(req, {
    logPrefix: 'databases.delete',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const body = parsed.data;
  const backupName = typeof body['backupName'] === 'string' ? body['backupName'] : '';
  const type = body['type'];

  if (backupName.length === 0) {
    throw badRequestError('Backup name is required');
  }
  if (type !== undefined && type !== 'mongodb') {
    throw badRequestError('Only MongoDB backup deletion is supported.');
  }

  assertValidMongoBackupName(backupName);

  const backupPath = path.join(mongoBackupsDir, backupName);
  await fs.unlink(backupPath);
  await Promise.all([
    unlinkIfPresent(`${backupPath}.log`),
    unlinkIfPresent(`${backupPath}.restore.log`),
  ]);

  return NextResponse.json({ success: true, backupName, message: 'Backup deleted' });
}
