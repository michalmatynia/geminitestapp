import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';

import type {
  DatabaseEngineMongoSyncDirection,
  DatabaseEngineMongoSyncResponse,
  MongoSource,
} from '@/shared/contracts/database';
import { forbiddenError, operationFailedError } from '@/shared/errors/app-error';
import { resolveMongoSourceConfig } from '@/shared/lib/db/mongo-source';
import {
  execFileAsync,
  getMongoDumpCommand,
  getMongoRestoreCommand,
} from '@/shared/lib/db/utils/mongo';

const mongoRuntimeDir = path.join(process.cwd(), 'mongo', 'runtime');

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

export async function syncMongoSources(
  direction: DatabaseEngineMongoSyncDirection
): Promise<DatabaseEngineMongoSyncResponse> {
  if (process.env['NODE_ENV'] === 'production') {
    throw forbiddenError('MongoDB source sync is disabled in production.');
  }

  const { source, target } = resolveSyncEndpoints(direction);
  const sourceConfig = await resolveMongoSourceConfig(source);
  const targetConfig = await resolveMongoSourceConfig(target);
  const timestamp = Date.now();
  const { archivePath, logPath } = buildArchivePaths(direction, timestamp);

  await fs.mkdir(mongoRuntimeDir, { recursive: true });

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
        `dump command: ${dumpCommand} ${dumpArgs.join(' ')}`,
        dumpResult.stdout,
        dumpResult.stderr,
        `restore command: ${restoreCommand} ${restoreArgs.join(' ')}`,
        restoreResult.stdout,
        restoreResult.stderr,
      ].join('\n\n'),
      'utf8'
    );

    return {
      success: true,
      message: `MongoDB sync completed: ${source} -> ${target}.`,
      direction,
      source,
      target,
      archivePath,
      logPath,
    };
  } catch (error) {
    throw operationFailedError(
      `Failed to sync MongoDB source ${source} -> ${target}.`,
      error
    );
  }
}
