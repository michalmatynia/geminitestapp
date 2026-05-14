/* eslint-disable complexity, max-lines, max-lines-per-function, max-params, no-await-in-loop */
import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';

import { MongoClient } from 'mongodb';

import type {
  DatabaseEngineManagedMongoApplicationTarget,
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
import {
  getManagedMongoApplicationSyncControl,
  getManagedMongoSyncControls,
} from '@/shared/lib/db/managed-mongo-sync-controls';
import { createMongoSourceBackup } from '@/shared/lib/db/services/database-backup';
import { verifyMongoSourceParity } from '@/shared/lib/db/services/mongo-source-parity';
import {
  getMongoSyncIssue,
  recordMongoSourceSync,
  resolveMongoSourceConfig,
} from '@/shared/lib/db/mongo-source';
import {
  execFileAsync,
  getMongoDumpCommand,
  getMongoRestoreCommand,
  MONGO_BACKUP_APPLICATIONS,
  resolveArchMongoSourceConfig,
  resolveCmsBuilderMongoSourceConfig,
  resolveEcommerceMongoSourceConfig,
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

type MongoSyncRecoveryLog = {
  backupPath: string | null;
  command: string | null;
  args: string[];
  result: MongoToolResult | null;
  error: string | null;
  succeeded: boolean;
};

type MongoSyncPreflightEndpoint = {
  application: MongoBackupApplication;
  source: MongoSource;
  config: ResolvedMongoSourceConfig | null;
  configIssue: string | null;
};

const MONGO_APPLICATION_LABELS: Record<MongoBackupApplication, string> = {
  geminitestapp: 'GeminiTest App',
  studiq: 'StudiQ',
  'cms-builder': 'CMS Builder',
  products: 'Ecommerce',
  arch: 'Milkbar Designers',
};

const MONGO_SYNC_EXCLUDED_COLLECTIONS: Partial<Record<MongoBackupApplication, string[]>> = {
  products: ['settings'],
};

const getExcludedCollectionsForSync = (application: MongoBackupApplication): string[] =>
  MONGO_SYNC_EXCLUDED_COLLECTIONS[application] ?? [];

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

const getMongoUriDefaultDatabaseName = (uri: string): string | null => {
  try {
    const parsed = new URL(uri);
    const dbName = decodeURIComponent(parsed.pathname.replace(/^\/+/, '').trim());
    return dbName.length > 0 ? dbName : null;
  } catch {
    return null;
  }
};

const buildMongoNamespaceRestoreUri = (uri: string): string => {
  const defaultDatabaseName = getMongoUriDefaultDatabaseName(uri);
  if (defaultDatabaseName === null) return uri;

  try {
    const parsed = new URL(uri);
    const hasCredentials = parsed.username.length > 0 || parsed.password.length > 0;
    if (hasCredentials && !parsed.searchParams.has('authSource')) {
      parsed.searchParams.set('authSource', defaultDatabaseName);
    }
    parsed.pathname = '';
    return parsed.toString();
  } catch {
    return uri;
  }
};

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

const isLikelySingleNodeLocalMongoUri = (uri: string): boolean => {
  const trimmed = uri.trim();
  if (trimmed.length === 0) return false;
  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.trim().toLowerCase();
    return (
      (hostname === 'localhost' || hostname === '127.0.0.1') &&
      !parsed.searchParams.has('replicaSet')
    );
  } catch {
    return trimmed.includes('localhost') || trimmed.includes('127.0.0.1');
  }
};

const getMongoClientOptions = (uri: string): ConstructorParameters<typeof MongoClient>[1] => ({
  connectTimeoutMS: 10_000,
  serverSelectionTimeoutMS: 10_000,
  ...(isLikelySingleNodeLocalMongoUri(uri) ? { directConnection: true } : {}),
});

const hasSyncConfig = (
  config: ResolvedMongoSourceConfig | null
): config is ResolvedMongoSourceConfig & { uri: string; dbName: string } =>
  config !== null &&
  config.configured &&
  typeof config.uri === 'string' &&
  config.uri.trim().length > 0 &&
  typeof config.dbName === 'string' &&
  config.dbName.trim().length > 0;

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
  if (application === 'products') {
    return resolveEcommerceMongoSourceConfig(source);
  }
  if (application === 'arch') {
    return resolveArchMongoSourceConfig(source);
  }
  return resolveMongoSourceConfig(source);
};

const getApplicationSourceConfigIssue = (
  application: MongoBackupApplication,
  source: MongoSource,
  config: ResolvedMongoSourceConfig | null
): string | null => {
  if (hasSyncConfig(config)) return null;

  if (application === 'studiq') {
    const prefix = `STUDIQ_MONGODB_${source.toUpperCase()}`;
    return `StudiQ MongoDB source "${source}" is not configured. Set ${prefix}_URI and ${prefix}_DB in the effective env.`;
  }

  if (application === 'cms-builder') {
    const prefix = `CMS_BUILDER_MONGODB_${source.toUpperCase()}`;
    return `CMS Builder MongoDB source "${source}" is not configured. Set ${prefix}_URI and ${prefix}_DB in the effective env.`;
  }

  if (application === 'products') {
    const prefix = `ECOM_MONGODB_${source.toUpperCase()}`;
    return `Ecommerce MongoDB source "${source}" is not configured. Set ${prefix}_URI and ${prefix}_DB in the effective env.`;
  }

  if (application === 'arch') {
    const prefix = `ARCH_MONGODB_${source.toUpperCase()}`;
    return `Milkbar Designers MongoDB source "${source}" is not configured. Set ${prefix}_URI and ${prefix}_DB in the effective env.`;
  }

  const prefix = source === 'local' ? 'MONGODB_LOCAL' : 'MONGODB_CLOUD';
  return `MongoDB source "${source}" is not configured. Set ${prefix}_URI and ${prefix}_DB in the effective env.`;
};

const assertApplicationSourceConfigured = (
  application: MongoBackupApplication,
  source: MongoSource,
  config: ResolvedMongoSourceConfig
): void => {
  const issue = getApplicationSourceConfigIssue(application, source, config);
  if (issue === null) return;

  throw configurationError(issue);
};

const resolveApplicationsForSync = (
  applicationTarget: DatabaseEngineManagedMongoApplicationTarget
): MongoBackupApplication[] =>
  applicationTarget === 'all' ? [...MONGO_BACKUP_APPLICATIONS] : [applicationTarget];

const resolveEnabledApplicationsForSync = async (
  applicationTarget: DatabaseEngineManagedMongoApplicationTarget
): Promise<MongoBackupApplication[]> => {
  const applications = resolveApplicationsForSync(applicationTarget);
  const controls = await getManagedMongoSyncControls();
  const enabledApplications = applications.filter((application) => {
    const control = getManagedMongoApplicationSyncControl(controls, application);
    return !control.disabled;
  });

  if (applicationTarget !== 'all' && enabledApplications.length === 0) {
    throw forbiddenError(
      `${MONGO_APPLICATION_LABELS[applicationTarget]} MongoDB sync is temporarily disabled in Database Engine.`
    );
  }

  if (enabledApplications.length === 0) {
    throw forbiddenError('All managed MongoDB application syncs are temporarily disabled.');
  }

  return enabledApplications;
};

const resolvePreflightEndpoint = async (
  application: MongoBackupApplication,
  source: MongoSource
): Promise<MongoSyncPreflightEndpoint> => {
  try {
    const config = await resolveApplicationMongoSourceConfig(application, source);
    return {
      application,
      source,
      config,
      configIssue: getApplicationSourceConfigIssue(application, source, config),
    };
  } catch (error) {
    return {
      application,
      source,
      config: null,
      configIssue: `${MONGO_APPLICATION_LABELS[application]} ${source} MongoDB source configuration failed: ${getErrorMessage(error)}`,
    };
  }
};

const probePreflightEndpoint = async (
  endpoint: MongoSyncPreflightEndpoint
): Promise<string | null> => {
  if (endpoint.configIssue !== null) {
    return endpoint.configIssue;
  }
  if (!hasSyncConfig(endpoint.config)) {
    return `${MONGO_APPLICATION_LABELS[endpoint.application]} ${endpoint.source} MongoDB source is not configured.`;
  }

  const client = new MongoClient(endpoint.config.uri, getMongoClientOptions(endpoint.config.uri));
  try {
    await client.connect();
    await client.db(endpoint.config.dbName).admin().command({ ping: 1 });
    return null;
  } catch (error) {
    return `${MONGO_APPLICATION_LABELS[endpoint.application]} ${endpoint.source} MongoDB source is unreachable: ${getErrorMessage(error)}`;
  } finally {
    await client.close().catch(() => undefined);
  }
};

const inspectApplicationSyncReadiness = async (
  application: MongoBackupApplication,
  direction: DatabaseEngineMongoSyncDirection
): Promise<string[]> => {
  const { source, target } = resolveSyncEndpoints(direction);
  const endpoints: [MongoSyncPreflightEndpoint, MongoSyncPreflightEndpoint] = await Promise.all([
    resolvePreflightEndpoint(application, source),
    resolvePreflightEndpoint(application, target),
  ]);
  const [sourceEndpoint, targetEndpoint] = endpoints;
  const syncIssue =
    hasSyncConfig(sourceEndpoint.config) &&
    hasSyncConfig(targetEndpoint.config)
      ? getMongoSyncIssue(sourceEndpoint.config, targetEndpoint.config)
      : null;
  const probeResults = await Promise.allSettled(endpoints.map(probePreflightEndpoint));
  const failures = probeResults.flatMap((result) => {
    if (result.status === 'fulfilled') {
      return result.value === null ? [] : [result.value];
    }
    return [
      `${MONGO_APPLICATION_LABELS[application]} MongoDB source readiness probe failed: ${getErrorMessage(result.reason)}`,
    ];
  });

  if (syncIssue !== null && syncIssue !== '') {
    failures.push(`${MONGO_APPLICATION_LABELS[application]}: ${syncIssue}`);
  }

  return failures;
};

const assertAllApplicationsSyncReady = async (
  applicationTarget: DatabaseEngineManagedMongoApplicationTarget,
  direction: DatabaseEngineMongoSyncDirection
): Promise<void> => {
  const applications = await resolveEnabledApplicationsForSync(applicationTarget);
  const results = await Promise.all(
    applications.map((application) =>
      inspectApplicationSyncReadiness(application, direction)
    )
  );
  const failures = results.flat();
  if (failures.length === 0) return;

  throw configurationError(
    ['MongoDB source sync pre-flight failed:', ...failures.map((failure) => `- ${failure}`)].join(
      '\n'
    )
  );
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
  direction: DatabaseEngineMongoSyncDirection,
  applicationTarget: DatabaseEngineManagedMongoApplicationTarget
): Promise<MongoSyncContext[]> => {
  const timestamp = Date.now();
  const applications = await resolveEnabledApplicationsForSync(applicationTarget);
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
    ...getExcludedCollectionsForSync(context.application).flatMap((collectionName) => [
      `--excludeCollection=${collectionName}`,
    ]),
    `--archive=${context.archivePath}`,
    '--gzip',
  ],
  restoreArgs: [
    '--uri',
    buildMongoNamespaceRestoreUri(context.targetUri),
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
  const client = new MongoClient(context.targetUri, getMongoClientOptions(context.targetUri));
  try {
    await client.connect();
    await client.db(context.targetDbName).dropDatabase();
  } finally {
    await client.close().catch(() => undefined);
  }
};

const restoreTargetFromPreSyncBackup = async (
  context: MongoSyncContext
): Promise<MongoSyncRecoveryLog> => {
  const targetBackup = context.preSyncBackups.find(
    (backup) => backup.role === 'target' && backup.source === context.target
  );
  if (targetBackup === undefined) {
    return {
      backupPath: null,
      command: null,
      args: [],
      result: null,
      error: 'Target pre-sync backup was not found.',
      succeeded: false,
    };
  }

  const command = getMongoRestoreCommand();
  const args = [
    '--uri',
    context.targetUri,
    `--archive=${targetBackup.backupPath}`,
    '--gzip',
    '--drop',
    '--stopOnError',
  ];

  try {
    await dropTargetDatabaseBeforeRestore(context);
    const result = await execFileAsync(command, args);
    return {
      backupPath: targetBackup.backupPath,
      command,
      args,
      result,
      error: null,
      succeeded: true,
    };
  } catch (error) {
    return {
      backupPath: targetBackup.backupPath,
      command,
      args,
      result: readMongoToolOutput(error),
      error: getErrorMessage(error),
      succeeded: false,
    };
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
  recovery: MongoSyncRecoveryLog | null;
  targetDropped: boolean;
  error: unknown;
}): Promise<void> => {
  const {
    context,
    commands,
    phase,
    dumpResult,
    restoreResult,
    recovery,
    targetDropped,
    error,
  } = params;
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
        recovery !== null
          ? [
              'automatic target recovery:',
              `succeeded: ${recovery.succeeded ? 'true' : 'false'}`,
              `backup: ${recovery.backupPath ?? 'unavailable'}`,
              recovery.command !== null
                ? `restore command: ${formatCommandForLog(recovery.command, recovery.args)}`
                : 'restore command: unavailable',
              recovery.result?.stdout ?? '',
              recovery.result?.stderr ?? '',
              recovery.error !== null ? `recovery error: ${recovery.error}` : null,
            ]
              .filter((line): line is string => line !== null)
              .join('\n')
          : 'automatic target recovery: not attempted',
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
      recovery: null,
      targetDropped: false,
      error,
    });
    throw error;
  }

  await dropTargetDatabaseBeforeRestore(context);

  try {
    restoreResult = await execFileAsync(commands.restoreCommand, commands.restoreArgs);
  } catch (error) {
    const recovery = await restoreTargetFromPreSyncBackup(context);
    await writeMongoSyncFailureLog({
      context,
      commands,
      phase: 'restore',
      dumpResult,
      restoreResult: readMongoToolOutput(error),
      recovery,
      targetDropped: true,
      error,
    });
    if (recovery.succeeded) {
      throw operationFailedError(
        `MongoDB source sync failed during restore for ${context.application}, but the target database was recovered from pre-sync backup.`,
        error,
        {
          application: context.application,
          backupPath: recovery.backupPath,
          logPath: context.logPath,
        }
      );
    }

    throw operationFailedError(
      `MongoDB source sync failed during restore for ${context.application} AND automatic recovery failed. Manual restore required from: ${recovery.backupPath ?? 'target pre-sync backup unavailable'}.`,
      error,
      {
        application: context.application,
        backupPath: recovery.backupPath,
        logPath: context.logPath,
        recoveryError: recovery.error,
      }
    );
  }

  const verification = await verifyMongoSourceParity({
    source: context.source,
    target: context.target,
    sourceDbName: context.sourceDbName,
    targetDbName: context.targetDbName,
    sourceUri: context.sourceUri,
    targetUri: context.targetUri,
    excludedCollections: getExcludedCollectionsForSync(context.application),
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
  direction: DatabaseEngineMongoSyncDirection,
  applicationTarget: DatabaseEngineManagedMongoApplicationTarget = 'all'
): Promise<DatabaseEngineMongoSyncResponse> {
  if (process.env['NODE_ENV'] === 'production') {
    throw forbiddenError('MongoDB source sync is disabled in production.');
  }

  await assertAllApplicationsSyncReady(applicationTarget, direction);

  const releaseSyncLock = await acquireMongoSyncLock(direction, applicationTarget);
  try {
    const contexts = await prepareMongoSyncContexts(direction, applicationTarget);
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
        `Synced ${applicationTransfers.length} application database${applicationTransfers.length === 1 ? '' : 's'} and created ${preSyncBackups.length} pre-sync backups before restore.`,
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

export const testOnly = {
  assertAllApplicationsSyncReady,
  buildMongoNamespaceRestoreUri,
  inspectApplicationSyncReadiness,
  restoreTargetFromPreSyncBackup,
};
