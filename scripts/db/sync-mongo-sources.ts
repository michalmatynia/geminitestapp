import { config as loadDotenv } from 'dotenv';

import {
  databaseEngineMongoSyncDirectionSchema,
  type DatabaseEngineMongoSyncDirection,
  type DatabaseEngineMongoSyncApplication,
  type MongoSource,
} from '@/shared/contracts/database';

type MongoSourceModule = typeof import('@/shared/lib/db/mongo-source');
type MongoSourceParityModule = typeof import('@/shared/lib/db/services/mongo-source-parity');
type MongoSourceSyncModule = typeof import('@/shared/lib/db/services/mongo-source-sync');
type MongoClientModule = typeof import('@/shared/lib/db/mongo-client');
type MongoUtilsModule = typeof import('@/shared/lib/db/utils/mongo');

type MongoDbModules = {
  getMongoSourceState: MongoSourceModule['getMongoSourceState'];
  resolveMongoSourceConfig: MongoSourceModule['resolveMongoSourceConfig'];
  resolveCmsBuilderMongoSourceConfig: MongoUtilsModule['resolveCmsBuilderMongoSourceConfig'];
  resolveStudiqMongoSourceConfig: MongoUtilsModule['resolveStudiqMongoSourceConfig'];
  verifyMongoSourceParity: MongoSourceParityModule['verifyMongoSourceParity'];
  syncMongoSources: MongoSourceSyncModule['syncMongoSources'];
  invalidateMongoClientCache: MongoClientModule['invalidateMongoClientCache'];
};

type CliOptions = {
  direction: DatabaseEngineMongoSyncDirection;
  apply: boolean;
  verifyOnly: boolean;
};

const parseCliOptions = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    direction: 'local_to_cloud',
    apply: false,
    verifyOnly: false,
  };

  for (const arg of argv) {
    if (arg === '--apply') {
      options.apply = true;
      continue;
    }
    if (arg === '--verify-only') {
      options.verifyOnly = true;
      continue;
    }
    if (arg.startsWith('--direction=')) {
      options.direction = databaseEngineMongoSyncDirectionSchema.parse(
        arg.slice('--direction='.length)
      );
    }
  }

  return options;
};

const resolveEndpoints = (
  direction: DatabaseEngineMongoSyncDirection
): { source: MongoSource; target: MongoSource } =>
  direction === 'cloud_to_local'
    ? { source: 'cloud', target: 'local' }
    : { source: 'local', target: 'cloud' };

const mutedConsoleMethod = (..._args: unknown[]): void => undefined;

const muteRuntimeConsole = (): void => {
  console.log = mutedConsoleMethod;
  console.warn = mutedConsoleMethod;
  console.error = mutedConsoleMethod;
};

const loadCliEnv = (): void => {
  const inheritedEnv = new Map(Object.entries(process.env));
  loadDotenv({ path: '.env', quiet: true });
  loadDotenv({ path: '.env.local', override: true, quiet: true });

  for (const [key, value] of inheritedEnv) {
    process.env[key] = value;
  }

  process.env['ENABLE_DEV_SYSTEM_LOG_PERSISTENCE'] ??= 'false';
  process.env['ENABLE_DEV_RUNTIME_LOGGING_CONTROLS'] ??= 'false';
};

const loadDbModules = async (): Promise<MongoDbModules> => {
  const [mongoSource, mongoSourceParity, mongoSourceSync, mongoClient, mongoUtils] = await Promise.all([
    import('@/shared/lib/db/mongo-source'),
    import('@/shared/lib/db/services/mongo-source-parity'),
    import('@/shared/lib/db/services/mongo-source-sync'),
    import('@/shared/lib/db/mongo-client'),
    import('@/shared/lib/db/utils/mongo'),
  ]);

  return {
    getMongoSourceState: mongoSource.getMongoSourceState,
    resolveMongoSourceConfig: mongoSource.resolveMongoSourceConfig,
    resolveCmsBuilderMongoSourceConfig: mongoUtils.resolveCmsBuilderMongoSourceConfig,
    resolveStudiqMongoSourceConfig: mongoUtils.resolveStudiqMongoSourceConfig,
    verifyMongoSourceParity: mongoSourceParity.verifyMongoSourceParity,
    syncMongoSources: mongoSourceSync.syncMongoSources,
    invalidateMongoClientCache: mongoClient.invalidateMongoClientCache,
  };
};

const printJson = (payload: unknown): void => {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
};

const runVerificationOnly = async (
  modules: MongoDbModules,
  direction: DatabaseEngineMongoSyncDirection
): Promise<void> => {
  const { source, target } = resolveEndpoints(direction);
  const applications: DatabaseEngineMongoSyncApplication[] = [
    'geminitestapp',
    'studiq',
    'cms-builder',
  ];
  const verifications = [];

  for (const application of applications) {
    const sourceConfig =
      application === 'studiq'
        ? modules.resolveStudiqMongoSourceConfig(source)
        : application === 'cms-builder'
          ? modules.resolveCmsBuilderMongoSourceConfig(source)
        : await modules.resolveMongoSourceConfig(source);
    const targetConfig =
      application === 'studiq'
        ? modules.resolveStudiqMongoSourceConfig(target)
        : application === 'cms-builder'
          ? modules.resolveCmsBuilderMongoSourceConfig(target)
        : await modules.resolveMongoSourceConfig(target);
    if (!sourceConfig.configured || !targetConfig.configured) {
      throw new Error(`${application} ${source} and ${target} MongoDB sources must be configured.`);
    }
    if (!sourceConfig.uri || !targetConfig.uri || !sourceConfig.dbName || !targetConfig.dbName) {
      throw new Error(`${application} ${source} and ${target} MongoDB URI/database values are required.`);
    }
    verifications.push({
      application,
      verification: await modules.verifyMongoSourceParity({
        source,
        target,
        sourceDbName: sourceConfig.dbName,
        targetDbName: targetConfig.dbName,
        sourceUri: sourceConfig.uri,
        targetUri: targetConfig.uri,
      }),
    });
  }

  printJson({
    mode: 'verify-only',
    direction,
    source,
    target,
    verifications,
  });

  if (verifications.some((entry) => entry.verification.status !== 'passed')) {
    process.exitCode = 1;
  }
};

const runPlan = async (
  modules: MongoDbModules,
  direction: DatabaseEngineMongoSyncDirection
): Promise<void> => {
  const { source, target } = resolveEndpoints(direction);
  const state = await modules.getMongoSourceState();
  printJson({
    mode: 'plan',
    direction,
    source,
    target,
    canSync: state.canSync,
    syncIssue: state.syncIssue,
    activeSource: state.activeSource,
    local: state.local,
    cloud: state.cloud,
    nextStep:
      direction === 'local_to_cloud'
        ? 'Run with --apply to overwrite cloud from local, then verify exact parity.'
        : 'Run with --apply to overwrite local from cloud, then verify exact parity.',
  });
};

const runApply = async (
  modules: MongoDbModules,
  direction: DatabaseEngineMongoSyncDirection
): Promise<void> => {
  const result = await modules.syncMongoSources(direction);
  printJson({
    mode: 'apply',
    direction,
    success: result.success,
    message: result.message,
    syncedAt: result.syncedAt,
    source: result.source,
    target: result.target,
    archivePath: result.archivePath,
    logPath: result.logPath,
    verification: result.verification,
    applicationTransfers: result.applicationTransfers,
  });
};

const main = async (): Promise<void> => {
  loadCliEnv();
  muteRuntimeConsole();
  const options = parseCliOptions(process.argv.slice(2));
  let modules: MongoDbModules | null = null;
  try {
    modules = await loadDbModules();
    if (options.verifyOnly) {
      await runVerificationOnly(modules, options.direction);
      return;
    }

    if (options.apply) {
      await runApply(modules, options.direction);
      return;
    }

    await runPlan(modules, options.direction);
  } finally {
    if (modules) {
      await modules.invalidateMongoClientCache();
    }
  }
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
