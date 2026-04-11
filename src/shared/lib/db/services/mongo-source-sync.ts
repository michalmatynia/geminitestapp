import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';

import type {
  DatabaseEngineMongoLastSync,
  DatabaseEngineMongoSyncBackup,
  DatabaseEngineMongoSyncDirection,
  DatabaseEngineMongoSyncResponse,
  MongoSource,
} from '@/shared/contracts/database';
import {
  configurationError,
  conflictError,
  forbiddenError,
  operationFailedError,
} from '@/shared/errors/app-error';
import { createMongoSourceBackup } from '@/shared/lib/db/services/database-backup';
import {
  getMongoSourceState,
  getMongoSyncIssue,
  recordMongoSourceSync,
  resolveMongoSourceConfig,
} from '@/shared/lib/db/mongo-source';
import {
  execFileAsync,
  getMongoDumpCommand,
  getMongoRestoreCommand,
} from '@/shared/lib/db/utils/mongo';

const mongoRuntimeDir = path.join(process.cwd(), 'mongo', 'runtime');
const mongoSyncLockPath = path.join(mongoRuntimeDir, 'sync.lock');

const resolveSyncEndpoints = (
  direction: DatabaseEngineMongoSyncDirection
): { source: MongoSource; target: MongoSource } =>
  direction === 'cloud_to_local'
    ? { source: 'cloud', target: 'local' }
    : { source: 'local', target: 'cloud' };

const buildArchivePaths = (
  direction: DatabaseEngineMongoSyncDirection,
  timestamp: number
): { archivePath: string; logPath: string } => {
  const baseName = `mongo-sync-${direction}-${timestamp}`;
  return {
    archivePath: path.join(mongoRuntimeDir, `${baseName}.archive`),
    logPath: path.join(mongoRuntimeDir, `${baseName}.log`),
  };
};

const acquireMongoSyncLock = async (
  direction: DatabaseEngineMongoSyncDirection
): Promise<() => Promise<void>> => {
  await fs.mkdir(mongoRuntimeDir, { recursive: true });

  let lockHandle;
  try {
    lockHandle = await fs.open(mongoSyncLockPath, 'wx');
    await lockHandle.writeFile(
      JSON.stringify(
        {
          direction,
          acquiredAt: new Date().toISOString(),
          pid: process.pid,
        },
        null,
        2
      ),
      'utf8'
    );
  } catch (error) {
    const errorCode = (error as NodeJS.ErrnoException).code;
    if (errorCode === 'EEXIST') {
      throw conflictError('MongoDB source sync is already in progress.');
    }

    throw operationFailedError('Failed to acquire MongoDB sync lock.', error);
  }

  return async () => {
    await lockHandle?.close().catch(() => undefined);
    await fs.rm(mongoSyncLockPath, { force: true }).catch(() => undefined);
  };
};

export async function syncMongoSources(
  direction: DatabaseEngineMongoSyncDirection
): Promise<DatabaseEngineMongoSyncResponse> {
  if (process.env['NODE_ENV'] === 'production') {
    throw forbiddenError('MongoDB source sync is disabled in production.');
  }

  const mongoSourceState = await getMongoSourceState();
  if (mongoSourceState.syncIssue) {
    throw configurationError(mongoSourceState.syncIssue);
  }
  if (!mongoSourceState.canSync) {
    throw configurationError(
      'MongoDB source sync requires both local and cloud MongoDB targets to be configured and reachable.'
    );
  }

  const releaseSyncLock = await acquireMongoSyncLock(direction);
  try {
    const { source, target } = resolveSyncEndpoints(direction);
    const sourceConfig = await resolveMongoSourceConfig(source);
    const targetConfig = await resolveMongoSourceConfig(target);
    const syncIssue = getMongoSyncIssue(sourceConfig, targetConfig);
    if (syncIssue) {
      throw configurationError(syncIssue);
    }
    const timestamp = Date.now();
    const syncedAt = new Date(timestamp).toISOString();
    const { archivePath, logPath } = buildArchivePaths(direction, timestamp);
    const preSyncBackups: DatabaseEngineMongoSyncBackup[] = [
      await createMongoSourceBackup({
        source,
        role: 'source',
        direction,
        timestamp,
      }),
      await createMongoSourceBackup({
        source: target,
        role: 'target',
        direction,
        timestamp,
      }),
    ];

    const dumpCommand = getMongoDumpCommand();
    const restoreCommand = getMongoRestoreCommand();
    const dumpArgs = [
      '--uri',
      sourceConfig.uri!,
      '--db',
      sourceConfig.dbName!,
      `--archive=${archivePath}`,
      '--gzip',
    ];
    const restoreArgs = [
      '--uri',
      targetConfig.uri!,
      `--archive=${archivePath}`,
      '--gzip',
      '--drop',
      '--stopOnError',
      '--nsFrom',
      `${sourceConfig.dbName!}.*`,
      '--nsTo',
      `${targetConfig.dbName!}.*`,
    ];

    try {
      const dumpResult = await execFileAsync(dumpCommand, dumpArgs);
      const restoreResult = await execFileAsync(restoreCommand, restoreArgs);
      await fs.writeFile(
        logPath,
        [
          'pre-sync backups:',
          ...preSyncBackups.map((backup) =>
            [
              `role: ${backup.role}`,
              `source: ${backup.source}`,
              `backup: ${backup.backupPath}`,
              `log: ${backup.logPath}`,
              backup.warning ? `warning: ${backup.warning}` : null,
            ]
              .filter(Boolean)
              .join('\n')
          ),
          `dump command: ${dumpCommand} ${dumpArgs.join(' ')}`,
          dumpResult.stdout,
          dumpResult.stderr,
          `restore command: ${restoreCommand} ${restoreArgs.join(' ')}`,
          restoreResult.stdout,
          restoreResult.stderr,
        ].join('\n\n'),
        'utf8'
      );

      const syncSnapshot: DatabaseEngineMongoLastSync = {
        direction,
        source,
        target,
        syncedAt,
        preSyncBackups,
        archivePath,
        logPath,
      };
      await recordMongoSourceSync(syncSnapshot);

      return {
        success: true,
        message: `MongoDB sync completed: ${source} -> ${target}. Created ${preSyncBackups.length} pre-sync backups before restore.`,
        ...syncSnapshot,
      };
    } catch (error) {
      throw operationFailedError(
        `Failed to sync MongoDB source ${source} -> ${target}.`,
        error
      );
    }
  } finally {
    await releaseSyncLock();
  }
}
