import { config as loadDotenv } from 'dotenv';

import {
  databaseEngineManagedMongoApplicationTargetSchema,
  databaseEngineMongoSyncDirectionSchema,
  type DatabaseEngineManagedMongoApplicationTarget,
  type DatabaseEngineMongoSyncDirection,
  type DatabaseEngineMongoSyncApplication,
  type MongoSource,
} from '@/shared/contracts/database';

type MongoSourceModule = typeof import('@/shared/lib/db/mongo-source');
type MongoSourceParityModule = typeof import('@/shared/lib/db/services/mongo-source-parity');
type MongoSourceSyncModule = typeof import('@/shared/lib/db/services/mongo-source-sync');
type MongoClientModule = typeof import('@/shared/lib/db/mongo-client');
type MongoUtilsModule = typeof import('@/shared/lib/db/utils/mongo');
type ManagedMongoSyncControlsModule = typeof import('@/shared/lib/db/managed-mongo-sync-controls');

type MongoDbModules = {
  getMongoSourceState: MongoSourceModule['getMongoSourceState'];
  resolveMongoSourceConfig: MongoSourceModule['resolveMongoSourceConfig'];
  resolveArchMongoSourceConfig: MongoUtilsModule['resolveArchMongoSourceConfig'];
  resolveCmsBuilderMongoSourceConfig: MongoUtilsModule['resolveCmsBuilderMongoSourceConfig'];
  resolveEcommerceMongoSourceConfig: MongoUtilsModule['resolveEcommerceMongoSourceConfig'];
  resolveStudiqMongoSourceConfig: MongoUtilsModule['resolveStudiqMongoSourceConfig'];
  verifyMongoSourceParity: MongoSourceParityModule['verifyMongoSourceParity'];
  syncMongoSources: MongoSourceSyncModule['syncMongoSources'];
  invalidateMongoClientCache: MongoClientModule['invalidateMongoClientCache'];
  getManagedMongoSyncControls: ManagedMongoSyncControlsModule['getManagedMongoSyncControls'];
  getManagedMongoApplicationSyncControl: ManagedMongoSyncControlsModule['getManagedMongoApplicationSyncControl'];
};

type CliOptions = {
  direction: DatabaseEngineMongoSyncDirection;
  application: DatabaseEngineManagedMongoApplicationTarget;
  apply: boolean;
  verifyOnly: boolean;
};

type CliMongoSourceConfig = {
  source: MongoSource;
  configured: boolean;
  uri: string | null;
  dbName: string | null;
  usesLegacyEnv?: boolean;
};

const MONGO_SYNC_EXCLUDED_COLLECTIONS: Partial<Record<DatabaseEngineMongoSyncApplication, string[]>> = {
  products: ['settings'],
};

const getExcludedCollectionsForSync = (
  application: DatabaseEngineMongoSyncApplication
): string[] => MONGO_SYNC_EXCLUDED_COLLECTIONS[application] ?? [];

const parseCliOptions = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    direction: 'local_to_cloud',
    application: 'all',
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
      continue;
    }
    if (arg.startsWith('--application=')) {
      options.application = databaseEngineManagedMongoApplicationTargetSchema.parse(
        arg.slice('--application='.length)
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
  const [
    mongoSource,
    mongoSourceParity,
    mongoSourceSync,
    mongoClient,
    mongoUtils,
    managedMongoSyncControls,
  ] = await Promise.all([
    import('@/shared/lib/db/mongo-source'),
    import('@/shared/lib/db/services/mongo-source-parity'),
    import('@/shared/lib/db/services/mongo-source-sync'),
    import('@/shared/lib/db/mongo-client'),
    import('@/shared/lib/db/utils/mongo'),
    import('@/shared/lib/db/managed-mongo-sync-controls'),
  ]);

  return {
    getMongoSourceState: mongoSource.getMongoSourceState,
    resolveMongoSourceConfig: mongoSource.resolveMongoSourceConfig,
    resolveArchMongoSourceConfig: mongoUtils.resolveArchMongoSourceConfig,
    resolveCmsBuilderMongoSourceConfig: mongoUtils.resolveCmsBuilderMongoSourceConfig,
    resolveEcommerceMongoSourceConfig: mongoUtils.resolveEcommerceMongoSourceConfig,
    resolveStudiqMongoSourceConfig: mongoUtils.resolveStudiqMongoSourceConfig,
    verifyMongoSourceParity: mongoSourceParity.verifyMongoSourceParity,
    syncMongoSources: mongoSourceSync.syncMongoSources,
    invalidateMongoClientCache: mongoClient.invalidateMongoClientCache,
    getManagedMongoSyncControls: managedMongoSyncControls.getManagedMongoSyncControls,
    getManagedMongoApplicationSyncControl:
      managedMongoSyncControls.getManagedMongoApplicationSyncControl,
  };
};

const printJson = (payload: unknown): void => {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
};

const resolveApplications = (
  applicationTarget: DatabaseEngineManagedMongoApplicationTarget
): DatabaseEngineMongoSyncApplication[] =>
  applicationTarget === 'all'
    ? ['geminitestapp', 'studiq', 'cms-builder', 'products', 'arch']
    : [applicationTarget];

const resolveApplicationSourceConfig = async (
  modules: MongoDbModules,
  application: DatabaseEngineMongoSyncApplication,
  source: MongoSource
): Promise<CliMongoSourceConfig> => {
  if (application === 'studiq') return modules.resolveStudiqMongoSourceConfig(source);
  if (application === 'cms-builder') return modules.resolveCmsBuilderMongoSourceConfig(source);
  if (application === 'products') return modules.resolveEcommerceMongoSourceConfig(source);
  if (application === 'arch') return modules.resolveArchMongoSourceConfig(source);
  return modules.resolveMongoSourceConfig(source);
};

const maskMongoUri = (uri: string | null): string | null => {
  if (!uri) return null;

  try {
    const parsed = new URL(uri);
    if (parsed.username || parsed.password) {
      parsed.username = parsed.username ? '***' : '';
      parsed.password = parsed.password ? '***' : '';
    }
    return parsed.toString();
  } catch {
    return uri.replace(/\/\/([^:@/]+):([^@/]+)@/, '//***:***@');
  }
};

const summarizeConfig = (config: CliMongoSourceConfig) => ({
  source: config.source,
  configured: config.configured,
  dbName: config.dbName,
  maskedUri: maskMongoUri(config.uri),
  usesLegacyEnv: config.usesLegacyEnv ?? false,
});

const formatDisabledSyncIssue = (
  application: DatabaseEngineMongoSyncApplication,
  reason: string | null
): string =>
  `${application} MongoDB sync is temporarily disabled in Database Engine.${reason ? ` ${reason}` : ''}`;

const resolveEnabledApplicationsForCli = async (
  modules: MongoDbModules,
  applicationTarget: DatabaseEngineManagedMongoApplicationTarget
): Promise<DatabaseEngineMongoSyncApplication[]> => {
  const controls = await modules.getManagedMongoSyncControls();
  const applications = resolveApplications(applicationTarget);
  const enabledApplications = applications.filter((application) => {
    const control = modules.getManagedMongoApplicationSyncControl(controls, application);
    return !control.disabled;
  });

  if (applicationTarget !== 'all' && enabledApplications.length === 0) {
    const control = modules.getManagedMongoApplicationSyncControl(controls, applicationTarget);
    throw new Error(formatDisabledSyncIssue(applicationTarget, control.reason));
  }

  if (enabledApplications.length === 0) {
    throw new Error('All managed MongoDB application syncs are temporarily disabled.');
  }

  return enabledApplications;
};

const runVerificationOnly = async (
  modules: MongoDbModules,
  direction: DatabaseEngineMongoSyncDirection,
  applicationTarget: DatabaseEngineManagedMongoApplicationTarget
): Promise<void> => {
  const { source, target } = resolveEndpoints(direction);
  const applications = await resolveEnabledApplicationsForCli(modules, applicationTarget);
  const verifications = [];

  for (const application of applications) {
    const [sourceConfig, targetConfig] = await Promise.all([
      resolveApplicationSourceConfig(modules, application, source),
      resolveApplicationSourceConfig(modules, application, target),
    ]);
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
        excludedCollections: getExcludedCollectionsForSync(application),
      }),
    });
  }

  printJson({
    mode: 'verify-only',
    direction,
    application: applicationTarget,
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
  direction: DatabaseEngineMongoSyncDirection,
  applicationTarget: DatabaseEngineManagedMongoApplicationTarget
): Promise<void> => {
  const { source, target } = resolveEndpoints(direction);
  const [state, controls] = await Promise.all([
    modules.getMongoSourceState(),
    modules.getManagedMongoSyncControls(),
  ]);
  const applications = await Promise.all(
    resolveApplications(applicationTarget).map(async (application) => {
      const [sourceConfig, targetConfig] = await Promise.all([
        resolveApplicationSourceConfig(modules, application, source),
        resolveApplicationSourceConfig(modules, application, target),
      ]);
      const syncControl = modules.getManagedMongoApplicationSyncControl(controls, application);
      const syncIssue =
        syncControl.disabled
          ? formatDisabledSyncIssue(application, syncControl.reason)
          : !sourceConfig.configured || !targetConfig.configured
          ? `${application} ${source} and ${target} MongoDB sources must be configured.`
          : !sourceConfig.uri || !targetConfig.uri || !sourceConfig.dbName || !targetConfig.dbName
            ? `${application} ${source} and ${target} MongoDB URI/database values are required.`
            : null;

      return {
        application,
        source: summarizeConfig(sourceConfig),
        target: summarizeConfig(targetConfig),
        syncDisabled: syncControl.disabled,
        syncDisabledReason: syncControl.reason,
        syncDisabledAt: syncControl.updatedAt,
        canSync: syncIssue === null,
        syncIssue,
      };
    })
  );
  const enabledApplications = applications.filter((application) => !application.syncDisabled);
  const enabledApplicationSyncIssue =
    enabledApplications.find((application) => !application.canSync)?.syncIssue ?? null;
  const disabledOnlySyncIssue =
    applications.find((application) => !application.canSync)?.syncIssue ?? null;
  const canSyncApplications =
    enabledApplications.length > 0 &&
    enabledApplications.every((application) => application.canSync);
  const rootStateRequired = enabledApplications.some(
    (application) => application.application === 'geminitestapp'
  );
  const rootStateIssue = rootStateRequired && !state.canSync ? state.syncIssue : null;
  const canSync = canSyncApplications && rootStateIssue === null;
  const syncIssue = enabledApplicationSyncIssue ?? rootStateIssue ?? (canSync ? null : disabledOnlySyncIssue);

  printJson({
    mode: 'plan',
    direction,
    application: applicationTarget,
    source,
    target,
    canSync,
    syncIssue,
    activeSource: state.activeSource,
    rootLocal: state.local,
    rootCloud: state.cloud,
    applications,
    nextStep:
      direction === 'local_to_cloud'
        ? 'Run with --apply to overwrite cloud from local, then verify exact parity.'
        : 'Run with --apply to overwrite local from cloud, then verify exact parity.',
  });
};

const runApply = async (
  modules: MongoDbModules,
  direction: DatabaseEngineMongoSyncDirection,
  applicationTarget: DatabaseEngineManagedMongoApplicationTarget
): Promise<void> => {
  const result = await modules.syncMongoSources(direction, applicationTarget);
  printJson({
    mode: 'apply',
    direction,
    application: applicationTarget,
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
      await runVerificationOnly(modules, options.direction, options.application);
      return;
    }

    if (options.apply) {
      await runApply(modules, options.direction, options.application);
      return;
    }

    await runPlan(modules, options.direction, options.application);
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
