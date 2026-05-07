import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';

import { MongoClient } from 'mongodb';

import type {
  DatabaseEngineMongoLastSync,
  DatabaseEngineMongoSyncApplicationTransfer,
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
  resolveCmsBuilderMongoSourceConfig,
  resolveStudiqMongoSourceConfig,
  type MongoApplicationSourceConfig,
  type MongoBackupApplication,
} from '@/shared/lib/db/utils/mongo';

const mongoRuntimeDir = path.join(process.cwd(), 'mongo', 'runtime');

type ResolvedMongoSourceConfig =
  | Awaited<ReturnType<typeof resolveMongoSourceConfig>>
  | MongoApplicationSourceConfig;

type MongoSyncContext = {
  application: MongoBackupApplication;
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
  application: MongoBackupApplication,
  direction: DatabaseEngineMongoSyncDirection,
  timestamp: number
): { archivePath: string; logPath: string } => {
  const baseName =
    application === 'geminitestapp'
      ? `mongo-sync-${direction}-${timestamp}`
      : `mongo-sync-${application}-${direction}-${timestamp}`;
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
  application: MongoBackupApplication,
  source: MongoSource,
  target: MongoSource,
  direction: DatabaseEngineMongoSyncDirection,
  timestamp: number
): Promise<DatabaseEngineMongoSyncBackup[]> => [
  await createMongoSourceBackup({
    application,
    source,
    role: 'source',
    direction,
    timestamp,
  }),
  await createMongoSourceBackup({
    application,
    source: target,
    role: 'target',
    direction,
    timestamp,
  }),
];

const resolveApplicationMongoSourceConfig = async (
  application: MongoBackupApplication,
  source: MongoSource
): Promise<ResolvedMongoSourceConfig> => {
  if (application === 'studiq') {
    return resolveStudiqMongoSourceConfig(source);
  }
  if (application === 'cms-builder') {
    return resolveCmsBuilderMongoSourceConfig(source);
  }
  return resolveMongoSourceConfig(source);
};

const assertApplicationSourceConfigured = (
  application: MongoBackupApplication,
  source: MongoSource,
  config: ResolvedMongoSourceConfig
): void => {
  if (config.configured) return;

  if (application === 'studiq') {
    const prefix = `STUDIQ_MONGODB_${source.toUpperCase()}`;
    throw configurationError(
      `StudiQ MongoDB source "${source}" is not configured. Set ${prefix}_URI and ${prefix}_DB in the effective env.`
    );
  }

  if (application === 'cms-builder') {
    const prefix = `CMS_BUILDER_MONGODB_${source.toUpperCase()}`;
    throw configurationError(
      `CMS Builder MongoDB source "${source}" is not configured. Set ${prefix}_URI and ${prefix}_DB in the effective env.`
    );
  }

  throw configurationError(`MongoDB source "${source}" is not configured.`);
};

const prepareMongoSyncContext = async (
  application: MongoBackupApplication,
  timestamp: number,
  direction: DatabaseEngineMongoSyncDirection
): Promise<MongoSyncContext> => {
  const { source, target } = resolveSyncEndpoints(direction);
  const sourceConfig = await resolveApplicationMongoSourceConfig(application, source);
  const targetConfig = await resolveApplicationMongoSourceConfig(application, target);
  assertApplicationSourceConfigured(application, source, sourceConfig);
  assertApplicationSourceConfigured(application, target, targetConfig);
  const syncIssue = getMongoSyncIssue(sourceConfig, targetConfig);
  if (syncIssue !== null && syncIssue !== '') {
    throw configurationError(syncIssue);
  }

  const { archivePath, logPath } = buildArchivePaths(application, direction, timestamp);
  return {
    application,
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
    preSyncBackups: await createPreSyncBackups(
      application,
      source,
      target,
      direction,
      timestamp
    ),
  };
};

const prepareMongoSyncContexts = async (
  direction: DatabaseEngineMongoSyncDirection
): Promise<MongoSyncContext[]> => {
  const timestamp = Date.now();
  const applications: MongoBackupApplication[] = ['geminitestapp', 'studiq', 'cms-builder'];
  const contexts: MongoSyncContext[] = [];

  for (const application of applications) {
    contexts.push(await prepareMongoSyncContext(application, timestamp, direction));
  }

  return contexts;
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
    `application: ${backup.application}`,
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
  const client = new MongoClient(context.targetUri, {
    connectTimeoutMS: 10_000,
    serverSelectionTimeoutMS: 10_000,
  });
  try {
    await client.connect();
    await client.db(context.targetDbName).dropDatabase();
  } finally {
    await client.close().catch(() => undefined);
  }
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
      `application: ${context.application}`,
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
        `application: ${context.application}`,
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

const runMongoTransfer = async (
  context: MongoSyncContext
): Promise<DatabaseEngineMongoSyncApplicationTransfer> => {
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
    sourceUri: context.sourceUri,
    targetUri: context.targetUri,
  });
  await writeMongoSyncLog({ context, commands, dumpResult, restoreResult, verification });
  assertVerificationPassed(context, verification);

  return {
    application: context.application,
    sourceDbName: context.sourceDbName,
    targetDbName: context.targetDbName,
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
    const contexts = await prepareMongoSyncContexts(direction);
    const primaryContext =
      contexts.find((context) => context.application === 'geminitestapp') ?? contexts[0];
    if (primaryContext === undefined) {
      throw operationFailedError('Failed to prepare MongoDB source sync contexts.');
    }
    const preSyncBackups = contexts.flatMap((context) => context.preSyncBackups);
    try {
      const applicationTransfers: DatabaseEngineMongoSyncApplicationTransfer[] = [];
      for (const context of contexts) {
        applicationTransfers.push(await runMongoTransfer(context));
      }
      const primaryTransfer =
        applicationTransfers.find((transfer) => transfer.application === 'geminitestapp') ??
        applicationTransfers[0];
      const syncSnapshot: DatabaseEngineMongoLastSync = {
        direction,
        source: primaryContext.source,
        target: primaryContext.target,
        syncedAt: primaryContext.syncedAt,
        preSyncBackups,
        archivePath: primaryTransfer?.archivePath ?? null,
        logPath: primaryTransfer?.logPath ?? null,
        verification: primaryTransfer?.verification ?? null,
        applicationTransfers,
      };
      await recordMongoSourceSync(syncSnapshot);
      const message = [
        `MongoDB sync completed and verified: ${primaryContext.source} -> ${primaryContext.target}.`,
        `Synced ${applicationTransfers.length} application databases and created ${preSyncBackups.length} pre-sync backups before restore.`,
      ].join(' ');
      return {
        success: true,
        message,
        ...syncSnapshot,
      };
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }
      throw operationFailedError(
        `Failed to sync MongoDB source ${primaryContext.source} -> ${primaryContext.target}.`,
        error
      );
    }
  } finally {
    await releaseSyncLock();
  }
}
