import { promises as fs } from 'fs';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  mongoBackupsDir,
  ensureMongoBackupsDir,
  assertValidMongoBackupName,
  getMongoConnectionUrl,
  getMongoDatabaseName,
  getMongoRestoreCommand,
  mongoExecFileAsync,
} from '@/features/database/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, internalError } from '@/shared/errors/app-error';
import { parseObjectJsonBody } from '@/shared/lib/api/parse-json';
import { normalizeOptionalQueryString } from '@/shared/lib/api/query-schema';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { assertDatabaseEngineManageAccess } from '@/features/database/server';
import { assertDatabaseEngineOperationEnabled } from '@/shared/lib/db/services/database-engine-operation-guards';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


type ExecOutputishError = {
  stdout?: string;
  stderr?: string;
  cause?: {
    stdout?: string;
    stderr?: string;
  };
};

export const querySchema = z.object({
  type: z.preprocess(
    (value: unknown) => normalizeOptionalQueryString(value),
    z.enum(['mongodb']).optional()
  ),
});

export async function postDatabasesRestoreHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  await assertDatabaseEngineOperationEnabled('allowManualBackupMaintenance');

  let stage = 'validate';

  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const type = query.type ?? 'mongodb';
  if (type !== 'mongodb') {
    throw badRequestError('Only MongoDB restores are supported.');
  }

  const parsed = await parseObjectJsonBody(req, {
    logPrefix: 'databases.restore',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const body = z
    .object({
      backupName: z.string(),
      truncateBeforeRestore: z.boolean().optional(),
    })
    .parse(parsed.data);

  const backupName = body.backupName;
  const truncateBeforeRestore = Boolean(body.truncateBeforeRestore);
  if (!backupName) {
    throw badRequestError('Backup name is required');
  }

  assertValidMongoBackupName(backupName);
  await ensureMongoBackupsDir();

  const backupPath = path.join(mongoBackupsDir, backupName);
  const mongoUri = getMongoConnectionUrl();
  const databaseName = getMongoDatabaseName();

  if (truncateBeforeRestore) {
    const db = await getMongoDb();
    const collections = await db.listCollections().toArray();

    for (const collection of collections) {
      await db.collection(collection.name).drop();
    }
  }

  stage = 'mongorestore';
  const logPath = path.join(mongoBackupsDir, `${backupName}.restore.log`);
  const command = getMongoRestoreCommand();
  const args = [
    '--uri',
    mongoUri,
    '--db',
    databaseName,
    '--archive=' + backupPath,
    '--gzip',
    '--drop',
  ];
  const commandString = `${command} ${args.join(' ')}`;

  let stdout = '';
  let stderr = '';

  try {
    const result = await mongoExecFileAsync(command, args);
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (error) {
    void ErrorSystem.captureException(error);
    const err = error as ExecOutputishError;
    stdout = err.stdout ?? err.cause?.stdout ?? '';
    stderr = err.stderr ?? err.cause?.stderr ?? '';

    const logContent = `command:\n${commandString}\n\nstdout:\n${stdout}\n\nstderr:\n${stderr}`;
    await fs.writeFile(logPath, logContent);
    throw internalError('Failed to restore backup', {
      stage,
      backupName,
      log: logContent,
    });
  }

  const logContent = `command:\n${commandString}\n\nstdout:\n${stdout}\n\nstderr:\n${stderr}`;
  await fs.writeFile(logPath, logContent);

  stage = 'log';
  const restoreLogPath = path.join(mongoBackupsDir, 'restore-log.json');
  let logData: Record<string, { date: string; logFile: string }> = {};

  try {
    const logFile = await fs.readFile(restoreLogPath, 'utf-8');
    logData = JSON.parse(logFile) as Record<string, { date: string; logFile: string }>;
  } catch (error) {
    void ErrorSystem.captureException(error);
    const { ErrorSystem: SystemLogger } = await import('@/shared/lib/observability/system-logger');
    void SystemLogger.logWarning('Failed to load restore-log.json', { error, stage, backupName });
  }

  logData[backupName] = {
    date: new Date().toISOString(),
    logFile: `${backupName}.restore.log`,
  };

  await fs.writeFile(restoreLogPath, JSON.stringify(logData, null, 2));

  return NextResponse.json({
    message: 'Backup restored',
    log: logContent,
  });
}
