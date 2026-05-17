import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';

import type {
  DatabaseBackupResult,
  DatabaseEngineManagedMongoApplication,
  DatabaseEngineManagedMongoApplicationTarget,
  DatabaseEngineMongoSyncBackup,
  DatabaseEngineMongoSyncBackupRole,
  DatabaseEngineMongoSyncDirection,
  MongoSource,
} from '@/shared/contracts/database';
import { forbiddenError, operationFailedError } from '@/shared/errors/app-error';
import { resolveMongoSourceConfig } from '@/shared/lib/db/mongo-source';
import {
  backupsDir as mongoBackupsDir,
  buildMongoBackupName as buildMongoBackupRelativeName,
  ensureBackupsDir as ensureMongoBackupsDir,
  getArchMongoConnectionUrl,
  getArchMongoDatabaseName,
  getMongoConnectionUrl,
  getMongoDatabaseName,
  getMongoDumpCommand,
  getCmsBuilderMongoConnectionUrl,
  getCmsBuilderMongoDatabaseName,
  getProductsMongoConnectionUrl,
  getProductsMongoDatabaseName,
  getStudiqMongoConnectionUrl,
  getStudiqMongoDatabaseName,
  resolveCmsBuilderMongoSourceConfig,
  resolveProductsMongoSourceConfig,
  resolveArchMongoSourceConfig,
  resolveStudiqMongoSourceConfig,
  type MongoBackupApplication,
  execFileAsync as mongoExecFileAsync,
} from '@/shared/lib/db/utils/mongo';
import { resolveManagedMongoSourceConfig } from '@/shared/lib/db/services/managed-mongo-databases';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export type { DatabaseBackupResult };

type MongoBackupExecutionResult = {
  backupName: string;
  backupPath: string;
  logPath: string;
  logContent: string;
  warning: string | null;
};

const assertBackupsAllowed = (): void => {
  if (process.env['NODE_ENV'] === 'production') {
    throw forbiddenError('Database backups are disabled in production.');
  }
};

const parseMinimumFreeBytes = (): number => {
  const raw = Number.parseInt(process.env['DATABASE_BACKUP_MIN_FREE_BYTES'] ?? '', 10);
  if (!Number.isFinite(raw)) return 2 * 1024 * 1024 * 1024;
  return Math.max(0, raw);
};

const formatBytes = (value: number): string => {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  let nextValue = value;
  let unitIndex = 0;
  while (nextValue >= 1024 && unitIndex < units.length - 1) {
    nextValue /= 1024;
    unitIndex += 1;
  }
  return `${nextValue.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const assertBackupDiskSpaceAvailable = async (targetDir: string): Promise<void> => {
  const minimumFreeBytes = parseMinimumFreeBytes();
  if (minimumFreeBytes <= 0) return;

  const stats = await fs.statfs(targetDir);
  const availableBytes = stats.bavail * stats.bsize;
  if (availableBytes >= minimumFreeBytes) return;

  throw operationFailedError('Not enough disk space for MongoDB backup', undefined, {
    details: `Backup target has ${formatBytes(availableBytes)} free; requires at least ${formatBytes(
      minimumFreeBytes
    )}. Free disk space or lower DATABASE_BACKUP_MIN_FREE_BYTES.`,
  });
};

const sanitizeBackupSegment = (value: string): string => {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const sanitized = normalized.replace(/^-+|-+$/g, '');
  return sanitized.length > 0 ? sanitized : 'backup';
};

const buildMongoBackupName = (
  databaseName: string,
  timestamp: number,
  descriptor?: string
): string => {
  if (descriptor === undefined || descriptor.trim().length === 0) {
    return `${databaseName}-backup-${timestamp}.archive`;
  }

  return `${sanitizeBackupSegment(databaseName)}-${sanitizeBackupSegment(descriptor)}-${timestamp}.archive`;
};

const redactMongoUri = (value: string): string =>
  value.replace(
    /(mongodb(?:\+srv)?:\/\/)([^@/\s]+)@/g,
    (_match, prefix: string, auth: string) => {
      const [rawUsername] = auth.split(':');
      const username = rawUsername === undefined || rawUsername === '' ? '***' : rawUsername;
      return `${prefix}${username}:***@`;
    }
  );

const readMongoToolOutput = (
  error: unknown
): { stdout: string; stderr: string } => {
  const cause = (error as { cause?: { stdout?: unknown; stderr?: unknown } }).cause;
  return {
    stdout: typeof cause?.stdout === 'string' ? cause.stdout : '',
    stderr: typeof cause?.stderr === 'string' ? cause.stderr : '',
  };
};

const isNoSpaceFailure = (error: unknown, details = ''): boolean => {
  if ((error as NodeJS.ErrnoException | null)?.code === 'ENOSPC') return true;
  const message = error instanceof Error ? error.message : String(error);
  return `${message}\n${details}`.toLowerCase().includes('no space left on device');
};

const requireMongoConfigValue = (value: string | null, label: string): string => {
  if (value === null || value.trim().length === 0) {
    throw operationFailedError(`MongoDB source backup requires ${label} to be configured.`);
  }
  return value;
};

const resolveApplicationMongoSourceConfig = async (
  application: MongoBackupApplication,
  source: MongoSource
) => {
  if (application === 'studiq') {
    return resolveStudiqMongoSourceConfig(source);
  }
  if (application === 'cms-builder') {
    return resolveCmsBuilderMongoSourceConfig(source);
  }
  if (application === 'products') {
    return resolveProductsMongoSourceConfig(source);
  }
  if (application === 'arch') {
    return resolveArchMongoSourceConfig(source);
  }
  return resolveMongoSourceConfig(source);
};

const buildPreSyncBackupDescriptor = (
  application: MongoBackupApplication,
  source: MongoSource,
  role: DatabaseEngineMongoSyncBackupRole,
  direction: DatabaseEngineMongoSyncDirection
): string => {
  if (application === 'geminitestapp') {
    return `${source}-${role}-pre-sync-${direction}`;
  }
  return `${application}-${source}-${role}-pre-sync-${direction}`;
};

const runMongoBackup = async (params: {
  application: MongoBackupApplication;
  mongoUri: string;
  databaseName: string;
  backupName: string;
}): Promise<MongoBackupExecutionResult> => {
  await ensureMongoBackupsDir();
  const { application, mongoUri, databaseName } = params;
  const backupName = buildMongoBackupRelativeName(application, params.backupName);
  const backupPath = path.join(mongoBackupsDir, backupName);
  const logPath = path.join(mongoBackupsDir, `${backupName}.log`);
  await assertBackupDiskSpaceAvailable(path.dirname(backupPath));

  const command = getMongoDumpCommand();
  const args = ['--uri', mongoUri, '--db', databaseName, `--archive=${backupPath}`, '--gzip'];
  const commandString = `${command} ${args.map(redactMongoUri).join(' ')}`;

  let stdout: string;
  let stderr: string;
  try {
    const result = await mongoExecFileAsync(command, args);
    stdout = result.stdout;
    stderr = result.stderr;

    const logContent = `command:\n${commandString}\n\nstdout:\n${stdout}\n\nstderr:\n${stderr}`;
    await fs.writeFile(logPath, logContent);

    return {
      backupName,
      backupPath,
      logPath,
      logContent,
      warning: null,
    };
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'database-backup-mongo',
      databaseName,
    });
    const message = error instanceof Error ? error.message : 'Unknown error';
    const output = readMongoToolOutput(error);
    stdout = output.stdout;
    stderr = output.stderr;

    const logContent = `command:\n${commandString}\n\nstdout:\n${stdout}\n\nstderr:\n${stderr}\n\nerror:\n${message}`;
    const logWriteError = await fs.writeFile(logPath, logContent).then(
      () => null,
      (writeError: unknown) => writeError
    );

    const trimmedStderr = stderr.trim();
    const details = trimmedStderr.length > 0 ? trimmedStderr : message;
    if (isNoSpaceFailure(error, details) || isNoSpaceFailure(logWriteError)) {
      await Promise.all([
        fs.rm(backupPath, { force: true }).catch(() => undefined),
        fs.rm(logPath, { force: true }).catch(() => undefined),
      ]);
      throw operationFailedError('Failed to create MongoDB backup', error, { details });
    }

    const stat = await fs.stat(backupPath).catch(() => null);
    if (stat !== null && stat.size > 0) {
      return {
        backupName,
        warning: details,
        backupPath,
        logPath,
        logContent,
      };
    }

    if (logWriteError !== null) {
      throw operationFailedError('Failed to write MongoDB backup log', logWriteError, {
        details,
      });
    }

    throw operationFailedError('Failed to create MongoDB backup', error, { details });
  }
};

/**
 * createMongoBackup: Triggers a manual MongoDB backup, validating runtime environments and disk space before execution.
 * 
 * @returns A summary object indicating the backup's success, file path, and any associated warnings.
 * @throws {ForbiddenError} If executed in a production environment.
 * @throws {OperationFailedError} If disk space is insufficient.
 */
export const createMongoBackup = async (): Promise<DatabaseBackupResult> => {
  assertBackupsAllowed();
  const timestamp = Date.now();
  const geminitestappDatabaseName = getMongoDatabaseName();
  const studiqDatabaseName = getStudiqMongoDatabaseName();
  const cmsBuilderDatabaseName = getCmsBuilderMongoDatabaseName();
  const productsDatabaseName = getProductsMongoDatabaseName();
  const archDatabaseName = getArchMongoDatabaseName();
  const geminitestapp = await runMongoBackup({
    application: 'geminitestapp',
    mongoUri: getMongoConnectionUrl(),
    databaseName: geminitestappDatabaseName,
    backupName: buildMongoBackupName(geminitestappDatabaseName, timestamp),
  });
  const studiq = await runMongoBackup({
    application: 'studiq',
    mongoUri: getStudiqMongoConnectionUrl(),
    databaseName: studiqDatabaseName,
    backupName: buildMongoBackupName(studiqDatabaseName, timestamp),
  });
  const cmsBuilder = await runMongoBackup({
    application: 'cms-builder',
    mongoUri: getCmsBuilderMongoConnectionUrl(),
    databaseName: cmsBuilderDatabaseName,
    backupName: buildMongoBackupName(cmsBuilderDatabaseName, timestamp),
  });
  const products = await runMongoBackup({
    application: 'products',
    mongoUri: getProductsMongoConnectionUrl(),
    databaseName: productsDatabaseName,
    backupName: buildMongoBackupName(productsDatabaseName, timestamp),
  });
  const arch = await runMongoBackup({
    application: 'arch',
    mongoUri: getArchMongoConnectionUrl(),
    databaseName: archDatabaseName,
    backupName: buildMongoBackupName(archDatabaseName, timestamp),
  });
  const warnings = [
    geminitestapp.warning,
    studiq.warning,
    cmsBuilder.warning,
    products.warning,
    arch.warning,
  ].filter(
    (value): value is string => typeof value === 'string' && value.length > 0
  );
  const warning = warnings.length > 0 ? warnings.join('\n') : null;
  const logContent = [
    `--- geminitestapp: ${geminitestapp.backupName} ---`,
    geminitestapp.logContent,
    `--- studiq: ${studiq.backupName} ---`,
    studiq.logContent,
    `--- cms-builder: ${cmsBuilder.backupName} ---`,
    cmsBuilder.logContent,
    `--- products: ${products.backupName} ---`,
    products.logContent,
    `--- arch: ${arch.backupName} ---`,
    arch.logContent,
  ].join('\n\n');

  return {
    message:
      warning !== null && warning !== ''
        ? 'Backup created with warnings'
        : 'Backups created',
    backupName: geminitestapp.backupName,
    warning: warning ?? undefined,
    log: logContent,
  };
};

/**
 * createMongoApplicationLocalBackup: Initiates a local database backup for a specific application.
 * 
 * @param application - The managed application to backup.
 * @returns Details about the generated backup archive and logs.
 */
export const createMongoApplicationLocalBackup = async (
  application: DatabaseEngineManagedMongoApplication
): Promise<DatabaseBackupResult> => {
  assertBackupsAllowed();
  const timestamp = Date.now();
  const config = await resolveManagedMongoSourceConfig(application, 'local');
  const databaseName = requireMongoConfigValue(config.dbName, 'local database name');
  const result = await runMongoBackup({
    application,
    mongoUri: requireMongoConfigValue(config.uri, 'local URI'),
    databaseName,
    backupName: buildMongoBackupName(databaseName, timestamp),
  });

  return {
    message:
      result.warning !== null && result.warning !== ''
        ? 'Backup created with warnings'
        : 'Backup created',
    backupName: result.backupName,
    warning: result.warning ?? undefined,
    log: result.logContent,
  };
};

/**
 * createMongoManagedBackup: Handles backup operations for a managed MongoDB instance (e.g., cloud-hosted or remote).
 * 
 * @param application - The managed application.
 * @param applicationTarget - The specific target (local or cloud).
 * @returns Details about the generated backup archive and logs.
 */
export const createMongoManagedBackup = async (
  application: DatabaseEngineManagedMongoApplicationTarget = 'all'
): Promise<DatabaseBackupResult> => {
  if (application !== 'all') {
    return createMongoApplicationLocalBackup(application);
  }

  const applications: DatabaseEngineManagedMongoApplication[] = [
    'geminitestapp',
    'studiq',
    'cms-builder',
    'products',
    'arch',
  ];
  const results: Array<DatabaseBackupResult & { application: DatabaseEngineManagedMongoApplication }> = [];
  for (const managedApplication of applications) {
    const result = await createMongoApplicationLocalBackup(managedApplication);
    results.push({ ...result, application: managedApplication });
  }

  const warnings = results
    .map((result) => result.warning)
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
  const warning = warnings.length > 0 ? warnings.join('\n') : undefined;
  const log = results
    .map(
      (result) =>
        `--- ${result.application}: ${result.backupName} ---\n${result.log ?? 'No log available.'}`
    )
    .join('\n\n');

  return {
    message: warning ? 'Backups created with warnings' : 'Backups created',
    backupName: results[0]?.backupName ?? '',
    warning,
    log,
  };
};

/**
 * createMongoSourceBackup: Orchestrates the backup process for a defined MongoDB source (e.g., as part of a sync pre-flight).
 * 
 * @param params - Source configuration details including application, source type, URI, database name, and descriptor.
 * @returns Details about the generated backup archive and logs.
 */
export const createMongoSourceBackup = async (params: {
  application?: MongoBackupApplication;
  source: MongoSource;
  role: DatabaseEngineMongoSyncBackupRole;
  direction: DatabaseEngineMongoSyncDirection;
  timestamp?: number;
}): Promise<DatabaseEngineMongoSyncBackup> => {
  assertBackupsAllowed();

  const application = params.application ?? 'geminitestapp';
  const { source, role, direction } = params;
  const timestamp = params.timestamp ?? Date.now();
  const createdAt = new Date(timestamp).toISOString();
  const config = await resolveApplicationMongoSourceConfig(application, source);
  const databaseName = requireMongoConfigValue(config.dbName, `${source} database name`);
  const result = await runMongoBackup({
    application,
    mongoUri: requireMongoConfigValue(config.uri, `${source} URI`),
    databaseName,
    backupName: buildMongoBackupName(
      databaseName,
      timestamp,
      buildPreSyncBackupDescriptor(application, source, role, direction)
    ),
  });

  return {
    application,
    role,
    source,
    backupName: result.backupName,
    backupPath: result.backupPath,
    logPath: result.logPath,
    createdAt,
    warning: result.warning,
  };
};
