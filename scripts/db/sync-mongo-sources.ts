import 'dotenv/config';

import {
  databaseEngineMongoSyncDirectionSchema,
  type DatabaseEngineMongoSyncDirection,
  type MongoSource,
} from '@/shared/contracts/database';
import { getMongoSourceState, resolveMongoSourceConfig } from '@/shared/lib/db/mongo-source';
import { verifyMongoSourceParity } from '@/shared/lib/db/services/mongo-source-parity';
import { syncMongoSources } from '@/shared/lib/db/services/mongo-source-sync';
import { invalidateMongoClientCache } from '@/shared/lib/db/mongo-client';

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

const printJson = (payload: unknown): void => {
  console.log(JSON.stringify(payload, null, 2));
};

const runVerificationOnly = async (direction: DatabaseEngineMongoSyncDirection): Promise<void> => {
  const { source, target } = resolveEndpoints(direction);
  const sourceConfig = await resolveMongoSourceConfig(source);
  const targetConfig = await resolveMongoSourceConfig(target);
  const verification = await verifyMongoSourceParity({
    source,
    target,
    sourceDbName: sourceConfig.dbName ?? 'app',
    targetDbName: targetConfig.dbName ?? 'app',
  });

  printJson({
    mode: 'verify-only',
    direction,
    source,
    target,
    verification,
  });

  if (verification.status !== 'passed') {
    process.exitCode = 1;
  }
};

const runPlan = async (direction: DatabaseEngineMongoSyncDirection): Promise<void> => {
  const { source, target } = resolveEndpoints(direction);
  const state = await getMongoSourceState();
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

const runApply = async (direction: DatabaseEngineMongoSyncDirection): Promise<void> => {
  const result = await syncMongoSources(direction);
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
  });
};

const main = async (): Promise<void> => {
  const options = parseCliOptions(process.argv.slice(2));
  try {
    if (options.verifyOnly) {
      await runVerificationOnly(options.direction);
      return;
    }

    if (options.apply) {
      await runApply(options.direction);
      return;
    }

    await runPlan(options.direction);
  } finally {
    await invalidateMongoClientCache();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
