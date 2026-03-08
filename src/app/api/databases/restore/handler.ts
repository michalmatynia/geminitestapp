import { promises as fs } from 'fs';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import {
  pgBackupsDir,
  ensurePgBackupsDir,
  assertValidPgBackupName,
  getPgConnectionUrl,
  getPgRestoreCommand,
  pgExecFileAsync,
  mongoBackupsDir,
  ensureMongoBackupsDir,
  assertValidMongoBackupName,
  getMongoConnectionUrl,
  getMongoDatabaseName,
  getMongoRestoreCommand,
  mongoExecFileAsync,
} from '@/features/database/server';
import { assertDatabaseEngineManageAccess } from '@/shared/lib/db/services/database-engine-access';
import { assertDatabaseEngineOperationEnabled } from '@/shared/lib/db/services/database-engine-operation-guards';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, internalError } from '@/shared/errors/app-error';
import { parseObjectJsonBody } from '@/shared/lib/api/parse-json';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

type ExecOutputishError = {
  stdout?: string;
  stderr?: string;
  cause?: {
    stdout?: string;
    stderr?: string;
  };
};

export async function postDatabasesRestoreHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  await assertDatabaseEngineManageAccess();
  await assertDatabaseEngineOperationEnabled('allowManualBackupMaintenance');

  let stage: string;
  let backupName: string | null;
  let truncateBeforeRestore: boolean;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'postgresql';

  const parsed = await parseObjectJsonBody(req, {
    logPrefix: 'databases.restore',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const body = parsed.data as {
    backupName: string;
    truncateBeforeRestore?: boolean;
  };

  backupName = body.backupName;
  truncateBeforeRestore = Boolean(body.truncateBeforeRestore);

  if (!backupName) {
    throw badRequestError('Backup name is required');
  }

  if (type === 'mongodb') {
    // MongoDB restore
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

    let stdout: string;
    let stderr: string;

    try {
      const result = await mongoExecFileAsync(command, args);
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error) {
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
      const { ErrorSystem } = await import('@/shared/lib/observability/system-logger');
      void ErrorSystem.logWarning('Failed to load restore-log.json', { error, stage, backupName });
      // No log yet.
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
  } else {
    // PostgreSQL restore
    assertValidPgBackupName(backupName);
    await ensurePgBackupsDir();

    const backupPath = path.join(pgBackupsDir, backupName);
    const databaseUrl = getPgConnectionUrl();

    // Data-only restore requires empty tables to avoid FK constraint violations.
    // Always truncate before restoring PostgreSQL data.
    const dbUrl = process.env['DATABASE_URL'] ?? '';
    if (!dbUrl.startsWith('postgres://') && !dbUrl.startsWith('postgresql://')) {
      throw badRequestError('Truncate before restore is only supported for PostgreSQL.');
    }

    const tables = (
      await prisma.$queryRaw<{ tablename: string }[]>`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
      `
    )
      .map((row: { tablename: string }) => row.tablename)
      .filter(Boolean);

    if (tables.length > 0) {
      const quotedTables = tables.map((name: string) => `"${name.replace(/"/g, '""')}"`).join(', ');

      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE`);
    }

    stage = 'pg_restore';
    const logPath = path.join(pgBackupsDir, `${backupName}.restore.log`);
    const command = getPgRestoreCommand();

    const args = [
      '--data-only',
      '--disable-triggers',
      '--no-owner',
      '--no-privileges',
      '--single-transaction',
      '--dbname',
      databaseUrl,
      backupPath,
    ];

    const commandString = `${command} ${args.join(' ')}`;

    let stdout: string;
    let stderr: string;

    try {
      const result = await pgExecFileAsync(command, args);
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error) {
      const err = error as ExecOutputishError;

      stdout = err.stdout ?? err.cause?.stdout ?? '';
      stderr = err.stderr ?? err.cause?.stderr ?? '';

      const logContent = `command:\n${commandString}\n\nstdout:\n${stdout}\n\nstderr:\n${stderr}`;
      await fs.writeFile(logPath, logContent);

      const hint = stderr.includes('foreign key')
        ? ' Try using JSON Restore as an alternative.'
        : '';
      throw internalError(`Failed to restore backup.${hint}`, {
        stage,
        backupName,
        log: logContent,
      });
    }

    // Reset all sequences so auto-increment IDs continue from the max restored value
    stage = 'sequence_reset';
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ DECLARE r RECORD; BEGIN
          FOR r IN (
            SELECT c.oid::regclass AS seq_name,
                   t.relname AS table_name,
                   a.attname AS column_name
            FROM pg_class c
            JOIN pg_depend d ON d.objid = c.oid AND d.deptype = 'a'
            JOIN pg_class t ON t.oid = d.refobjid
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
            WHERE c.relkind = 'S'
          ) LOOP
            EXECUTE format(
              'SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I), 1))',
              r.seq_name, r.column_name, r.table_name
            );
          END LOOP;
        END $$;
      `);
    } catch (error) {
      const { ErrorSystem } = await import('@/shared/lib/observability/system-logger');
      void ErrorSystem.logWarning('Sequence reset failed after restore', {
        error,
        stage,
        backupName,
      });
      // Sequence reset is best-effort; log but don't fail the restore
      stderr +=
        '\n[WARNING] Sequence reset failed. Auto-increment columns may need manual adjustment.';
    }

    const logContent = `command:\n${commandString}\n\nstdout:\n${stdout}\n\nstderr:\n${stderr}`;
    await fs.writeFile(logPath, logContent);

    stage = 'log';
    const restoreLogPath = path.join(pgBackupsDir, 'restore-log.json');
    let logData: Record<string, { date: string; logFile: string }> = {};

    try {
      const logFile = await fs.readFile(restoreLogPath, 'utf-8');
      logData = JSON.parse(logFile) as Record<string, { date: string; logFile: string }>;
    } catch (error) {
      const { ErrorSystem } = await import('@/shared/lib/observability/system-logger');
      void ErrorSystem.logWarning('Failed to load restore-log.json', { error, stage, backupName });
      // No log yet.
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
}
