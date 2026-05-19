import { promises as fs } from 'fs';
import path from 'path';

import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { z } from 'zod';

import {
  ensureMongoBackupsDir,
  assertValidMongoBackupName,
  getMongoBackupApplication,
  getArchMongoConnectionUrl,
  getArchMongoDatabaseName,
  getMongoConnectionUrl,
  getMongoDatabaseName,
  getMongoRestoreCommand,
  getCmsBuilderMongoConnectionUrl,
  getCmsBuilderMongoDatabaseName,
  getProductsMongoConnectionUrl,
  getProductsMongoDatabaseName,
  getStudiqMongoConnectionUrl,
  getStudiqMongoDatabaseName,
  mongoExecFileAsync,
  resolveMongoBackupPath,
} from '@/features/database/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, internalError } from '@/shared/errors/app-error';
import { parseObjectJsonBody } from '@/shared/lib/api/parse-json';
import { normalizeOptionalQueryString } from '@/shared/lib/api/query-schema';
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

const resolveRestoreTarget = (backupName: string): { mongoUri: string; databaseName: string } => {
  const application = getMongoBackupApplication(backupName);
  if (application === 'studiq') {
    return {
      mongoUri: getStudiqMongoConnectionUrl(),
      databaseName: getStudiqMongoDatabaseName(),
    };
  }

  if (application === 'cms-builder') {
    return {
      mongoUri: getCmsBuilderMongoConnectionUrl(),
      databaseName: getCmsBuilderMongoDatabaseName(),
    };
  }

  if (application === 'products') {
    return {
      mongoUri: getProductsMongoConnectionUrl(),
      databaseName: getProductsMongoDatabaseName(),
    };
  }

  if (application === 'arch') {
    return {
      mongoUri: getArchMongoConnectionUrl(),
      databaseName: getArchMongoDatabaseName(),
    };
  }

  return {
    mongoUri: getMongoConnectionUrl(),
    databaseName: getMongoDatabaseName(),
  };
};

async function truncateDatabase(mongoUri: string, databaseName: string): Promise<void> {
  const mongoClient = new MongoClient(mongoUri);
  try {
    await mongoClient.connect();
    const db = mongoClient.db(databaseName);
    const collections = await db.listCollections().toArray();

    for (const collection of collections) {
      await db.collection(collection.name).drop();
    }
  } finally {
    await mongoClient.close();
  }
}

async function updateRestoreLog(backupPath: string, backupName: string): Promise<void> {
  const restoreLogPath = path.join(path.dirname(backupPath), 'restore-log.json');
  let logData: Record<string, { date: string; logFile: string }> = {};

  try {
    const logFile = await fs.readFile(restoreLogPath, 'utf-8');
    logData = JSON.parse(logFile) as Record<string, { date: string; logFile: string }>;
  } catch (error) {
    void ErrorSystem.captureException(error);
  }

  logData[backupName] = {
    date: new Date().toISOString(),
    logFile: `${backupName}.restore.log`,
  };

  await fs.writeFile(restoreLogPath, JSON.stringify(logData, null, 2));
}

export async function postDatabasesRestoreHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  await assertDatabaseEngineOperationEnabled('allowManualBackupMaintenance');

  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  if ((query.type ?? 'mongodb') !== 'mongodb') {
    throw badRequestError('Only MongoDB restores are supported.');
  }

  const parsed = await parseObjectJsonBody(req, {
    logPrefix: 'database-engine-web.databases.restore',
  });
  if (!parsed.ok) return parsed.response;

  const body = z.object({
    backupName: z.string(),
    truncateBeforeRestore: z.boolean().optional(),
  }).parse(parsed.data);

  const backupName = body.backupName;
  assertValidMongoBackupName(backupName);
  await ensureMongoBackupsDir();

  const backupPath = await resolveMongoBackupPath(backupName);
  const { mongoUri, databaseName } = resolveRestoreTarget(backupName);

  if (body.truncateBeforeRestore) {
    await truncateDatabase(mongoUri, databaseName);
  }

  const command = getMongoRestoreCommand();
  const args = ['--uri', mongoUri, '--db', databaseName, `--archive=${backupPath}`, '--gzip', '--drop'];
  const logPath = `${backupPath}.restore.log`;
  const commandString = `${command} ${args.join(' ')}`;

  try {
    const result = await mongoExecFileAsync(command, args);
    const logContent = `command:\n${commandString}\n\nstdout:\n${result.stdout}\n\nstderr:\n${result.stderr}`;
    await fs.writeFile(logPath, logContent);
    await updateRestoreLog(backupPath, backupName);
    return NextResponse.json({ message: 'Backup restored', log: logContent });
  } catch (error) {
    void ErrorSystem.captureException(error);
    const err = error as ExecOutputishError;
    const stdout = err.stdout ?? err.cause?.stdout ?? '';
    const stderr = err.stderr ?? err.cause?.stderr ?? '';
    const logContent = `command:\n${commandString}\n\nstdout:\n${stdout}\n\nstderr:\n${stderr}`;
    await fs.writeFile(logPath, logContent);
    throw internalError('Failed to restore backup', { stage: 'mongorestore', backupName, log: logContent });
  }
}
