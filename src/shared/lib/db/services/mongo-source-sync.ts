import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';

import type {
  DatabaseEngineMongoLastSync,
  DatabaseEngineMongoSyncBackup,
  DatabaseEngineMongoSyncDirection,
  DatabaseEngineMongoSyncResponse,
  DatabaseEngineMongoSyncVerification,
  MongoSource,
} from '@/shared/contracts/database';
import {
  isAppError,
  configurationError,
  forbiddenError,
  operationFailedError,
} from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { acquireMongoSyncLock } from '@/shared/lib/db/mongo-sync-lock';
import { createMongoSourceBackup } from '@/shared/lib/db/services/database-backup';
import { verifyMongoSourceParity } from '@/shared/lib/db/services/mongo-source-parity';
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

type ResolvedMongoSourceConfig = Awaited<ReturnType<typeof resolveMongoSourceConfig>>;

type MongoSyncContext = {
  direction: DatabaseEngineMongoSyncDirection;
  source: MongoSource;
  target: MongoSource;
  sourceConfig: ResolvedMongoSourceConfig;
  targetConfig: ResolvedMongoSourceConfig;
  sourceUri: string;
  targetUri: string;
  sourceDbName: string;
  targetDbName: string;
  syncedAt: string;
  archivePath: string;
  logPath: string;
  preSyncBackups: DatabaseEngineMongoSyncBackup[];
};

type MongoTransferCommands = {
  dumpCommand: string;
  restoreCommand: string;
  dumpArgs: string[];
  restoreArgs: string[];
};

type MongoToolResult = {
  stdout: string;
  stderr: string;
};

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

const redactMongoUri = (value: string): string =>
  value.replace(/(mongodb(?:\+srv)?:\/\/)([^@/\s]+)@/g, (_match, prefix: string, auth: string) => {
    const [rawUsername] = auth.split(':');
    const username =
      rawUsername === undefined || rawUsername === '' ? '***' : rawUsername;
    return `${prefix}${username}:***@`;
  });

const formatCommandForLog = (command: string, args: string[]): string =>
  `${command} ${args.map(redactMongoUri).join(' ')}`;

const formatVerificationLog = (
  verification: DatabaseEngineMongoSyncVerification
): string =>
  [
    `status: ${verification.status}`,
    `verifiedAt: ${verification.verifiedAt}`,
    `source: ${verification.source}:${verification.sourceDbName}`,
    `target: ${verification.target}:${verification.targetDbName}`,
    `collectionsCompared: ${verification.collectionsCompared}`,
    `sourceCollections: ${verification.sourceCollections}`,
    `targetCollections: ${verification.targetCollections}`,
    'mismatches:',
    ...(verification.mismatches.length > 0 ? verification.mismatches : ['none']),
  ].join('\n');

const assertMongoSourceSyncReady = async (): Promise<void> => {
  const mongoSourceState = await getMongoSourceState();
  if (mongoSourceState.syncIssue !== null && mongoSourceState.syncIssue !== '') {
    throw configurationError(mongoSourceState.syncIssue);
  }
  if (!mongoSourceState.canSync) {
    throw configurationError(
      'MongoDB source sync requires both local and cloud MongoDB targets to be configured and reachable.'
    );
  }
};

const requireMongoConfigValue = (value: string | null, label: string): string => {
  if (value === null || value.trim() === '') {
    throw configurationError(`MongoDB source sync requires ${label} to be configured.`);
  }
  return value;
};

const createPreSyncBackups = async (
  source: MongoSource,
  target: MongoSource,
  direction: DatabaseEngineMongoSyncDirection,
  timestamp: number
): Promise<DatabaseEngineMongoSyncBackup[]> => [
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

const prepareMongoSyncContext = async (
  direction: DatabaseEngineMongoSyncDirection
): Promise<MongoSyncContext> => {
  const { source, target } = resolveSyncEndpoints(direction);
  const sourceConfig = await resolveMongoSourceConfig(source);
  const targetConfig = await resolveMongoSourceConfig(target);
  const syncIssue = getMongoSyncIssue(sourceConfig, targetConfig);
  if (syncIssue !== null && syncIssue !== '') {
    throw configurationError(syncIssue);
  }

  const timestamp = Date.now();
  const { archivePath, logPath } = buildArchivePaths(direction, timestamp);
  return {
    direction,
    source,
    target,
    sourceConfig,
    targetConfig,
    sourceUri: requireMongoConfigValue(sourceConfig.uri, `${source} URI`),
    targetUri: requireMongoConfigValue(targetConfig.uri, `${target} URI`),
    sourceDbName: requireMongoConfigValue(sourceConfig.dbName, `${source} database name`),
    targetDbName: requireMongoConfigValue(targetConfig.dbName, `${target} database name`),
    syncedAt: new Date(timestamp).toISOString(),
    archivePath,
    logPath,
    preSyncBackups: await createPreSyncBackups(source, target, direction, timestamp),
  };
};

const buildMongoTransferCommands = (context: MongoSyncContext): MongoTransferCommands => ({
  dumpCommand: getMongoDumpCommand(),
  restoreCommand: getMongoRestoreCommand(),
  dumpArgs: [
    '--uri',
    context.sourceUri,
    '--db',
    context.sourceDbName,
    `--archive=${context.archivePath}`,
    '--gzip',
  ],
  restoreArgs: [
    '--uri',
    context.targetUri,
    `--archive=${context.archivePath}`,
    '--gzip',
    '--drop',
    '--stopOnError',
    '--nsFrom',
    `${context.sourceDbName}.*`,
    '--nsTo',
    `${context.targetDbName}.*`,
  ],
});

const formatBackupLog = (backup: DatabaseEngineMongoSyncBackup): string =>
  [
    `role: ${backup.role}`,
    `source: ${backup.source}`,
    `backup: ${backup.backupPath}`,
    `log: ${backup.logPath}`,
    backup.warning !== null && backup.warning !== '' ? `warning: ${backup.warning}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

const readMongoToolOutput = (error: unknown): MongoToolResult => {
  const cause = (error as { cause?: { stdout?: unknown; stderr?: unknown } }).cause;
  return {
    stdout: typeof cause?.stdout === 'string' ? cause.stdout : '',
    stderr: typeof cause?.stderr === 'string' ? cause.stderr : '',
  };
};

const getErrorMessage = (error: unknown): string =>
  redactMongoUri(error instanceof Error ? error.message : String(error));

const dropTargetDatabaseBeforeRestore = async (
  context: MongoSyncContext
): Promise<void> => {
  const targetDb = await getMongoDb(context.target);
  await targetDb.dropDatabase();
};

const writeMongoSyncLog = async (params: {
  context: MongoSyncContext;
  commands: MongoTransferCommands;
  dumpResult: MongoToolResult;
  restoreResult: MongoToolResult;
  verification: DatabaseEngineMongoSyncVerification;
}): Promise<void> => {
  const { context, commands, dumpResult, restoreResult, verification } = params;
  await fs.writeFile(
    context.logPath,
    [
        'pre-sync backups:',
        ...context.preSyncBackups.map(formatBackupLog),
        'target database dropped before restore: true',
        `dump command: ${formatCommandForLog(commands.dumpCommand, commands.dumpArgs)}`,
      dumpResult.stdout,
      dumpResult.stderr,
      `restore command: ${formatCommandForLog(commands.restoreCommand, commands.restoreArgs)}`,
      restoreResult.stdout,
      restoreResult.stderr,
      'post-sync verification:',
      formatVerificationLog(verification),
    ].join('\n\n'),
    'utf8'
  );
};

const writeMongoSyncFailureLog = async (params: {
  context: MongoSyncContext;
  commands: MongoTransferCommands;
  phase: 'dump' | 'restore';
  dumpResult: MongoToolResult | null;
  restoreResult: MongoToolResult | null;
  targetDropped: boolean;
  error: unknown;
}): Promise<void> => {
  const { context, commands, phase, dumpResult, restoreResult, targetDropped, error } = params;
  await fs
    .writeFile(
      context.logPath,
      [
        'pre-sync backups:',
        ...context.preSyncBackups.map(formatBackupLog),
        `failed phase: ${phase}`,
        `target database dropped before restore: ${targetDropped ? 'true' : 'false'}`,
        `dump command: ${formatCommandForLog(commands.dumpCommand, commands.dumpArgs)}`,
        dumpResult?.stdout ?? '',
        dumpResult?.stderr ?? '',
        `restore command: ${formatCommandForLog(commands.restoreCommand, commands.restoreArgs)}`,
        restoreResult?.stdout ?? '',
        restoreResult?.stderr ?? '',
        `error: ${getErrorMessage(error)}`,
      ].join('\n\n'),
      'utf8'
    )
    .catch(() => undefined);
};

const assertVerificationPassed = (
  context: MongoSyncContext,
  verification: DatabaseEngineMongoSyncVerification
): void => {
  if (verification.status === 'passed') return;
  throw operationFailedError(
    `MongoDB source sync verification failed: ${context.source} -> ${context.target}. Cloud/local sources are not exact mirrors after restore.`,
    undefined,
    {
      source: context.source,
      target: context.target,
      logPath: context.logPath,
      mismatches: verification.mismatches,
    }
  );
};

const runMongoTransfer = async (context: MongoSyncContext): Promise<DatabaseEngineMongoLastSync> => {
  const commands = buildMongoTransferCommands(context);
  let dumpResult: MongoToolResult | null = null;
  let restoreResult: MongoToolResult | null = null;
  try {
    dumpResult = await execFileAsync(commands.dumpCommand, commands.dumpArgs);
  } catch (error) {
    await writeMongoSyncFailureLog({
      context,
      commands,
      phase: 'dump',
      dumpResult: readMongoToolOutput(error),
      restoreResult,
      targetDropped: false,
      error,
    });
    throw error;
  }

  await dropTargetDatabaseBeforeRestore(context);

  try {
    restoreResult = await execFileAsync(commands.restoreCommand, commands.restoreArgs);
  } catch (error) {
    await writeMongoSyncFailureLog({
      context,
      commands,
      phase: 'restore',
      dumpResult,
      restoreResult: readMongoToolOutput(error),
      targetDropped: true,
      error,
    });
    throw error;
  }

  const verification = await verifyMongoSourceParity({
    source: context.source,
    target: context.target,
    sourceDbName: context.sourceDbName,
    targetDbName: context.targetDbName,
  });
  await writeMongoSyncLog({ context, commands, dumpResult, restoreResult, verification });
  assertVerificationPassed(context, verification);

  return {
    direction: context.direction,
    source: context.source,
    target: context.target,
    syncedAt: context.syncedAt,
    preSyncBackups: context.preSyncBackups,
    archivePath: context.archivePath,
    logPath: context.logPath,
    verification,
  };
};

export async function syncMongoSources(
  direction: DatabaseEngineMongoSyncDirection
): Promise<DatabaseEngineMongoSyncResponse> {
  if (process.env['NODE_ENV'] === 'production') {
    throw forbiddenError('MongoDB source sync is disabled in production.');
  }

  await assertMongoSourceSyncReady();

  const releaseSyncLock = await acquireMongoSyncLock(direction);
  try {
    const context = await prepareMongoSyncContext(direction);
    try {
      const syncSnapshot = await runMongoTransfer(context);
      await recordMongoSourceSync(syncSnapshot);
      return {
        success: true,
        message: `MongoDB sync completed and verified: ${context.source} -> ${context.target}. Created ${context.preSyncBackups.length} pre-sync backups before restore.`,
        ...syncSnapshot,
      };
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }
      throw operationFailedError(
        `Failed to sync MongoDB source ${context.source} -> ${context.target}.`,
        error
      );
    }
  } finally {
    await releaseSyncLock();
  }
}
