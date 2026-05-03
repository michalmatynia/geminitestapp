import { config as loadDotenv } from 'dotenv';

import type { MongoSource } from '@/shared/contracts/database';

type MongoClientModule = typeof import('@/shared/lib/db/mongo-client');
type MongoSourceModule = typeof import('@/shared/lib/db/mongo-source');

type LoadedModules = {
  getMongoDb: MongoClientModule['getMongoDb'];
  invalidateMongoClientCache: MongoClientModule['invalidateMongoClientCache'];
  resolveMongoSourceConfig: MongoSourceModule['resolveMongoSourceConfig'];
};

type CliOptions = {
  source: MongoSource | 'both';
  apply: boolean;
};

type PurgeCollectionSpec = {
  collection: 'ai_path_runs' | 'ai_path_run_nodes' | 'ai_path_run_events';
  label: 'runs' | 'nodes' | 'events';
};

type CollectionSnapshot = {
  exists: boolean;
  totalDocuments: number;
  sizeBytes: number;
  storageSizeBytes: number;
  totalIndexSizeBytes: number;
};

type PurgeCollectionResult = {
  collection: string;
  label: string;
  deletedDocuments: number;
  before: CollectionSnapshot;
  after: CollectionSnapshot;
};

const PURGE_COLLECTIONS: readonly PurgeCollectionSpec[] = [
  {
    collection: 'ai_path_runs',
    label: 'runs',
  },
  {
    collection: 'ai_path_run_nodes',
    label: 'nodes',
  },
  {
    collection: 'ai_path_run_events',
    label: 'events',
  },
] as const;

const mutedConsoleMethod = (..._args: unknown[]): void => undefined;

const parseCliOptions = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    source: 'both',
    apply: false,
  };

  for (const arg of argv) {
    if (arg === '--apply') {
      options.apply = true;
      continue;
    }
    if (arg.startsWith('--source=')) {
      const source = arg.slice('--source='.length);
      if (source === 'local' || source === 'cloud' || source === 'both') {
        options.source = source;
      }
    }
  }

  return options;
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

const muteRuntimeConsole = (): void => {
  console.log = mutedConsoleMethod;
  console.warn = mutedConsoleMethod;
  console.error = mutedConsoleMethod;
};

const loadDbModules = async (): Promise<LoadedModules> => {
  const [mongoClient, mongoSource] = await Promise.all([
    import('@/shared/lib/db/mongo-client'),
    import('@/shared/lib/db/mongo-source'),
  ]);

  return {
    getMongoDb: mongoClient.getMongoDb,
    invalidateMongoClientCache: mongoClient.invalidateMongoClientCache,
    resolveMongoSourceConfig: mongoSource.resolveMongoSourceConfig,
  };
};

const listRequestedSources = (source: MongoSource | 'both'): MongoSource[] =>
  source === 'both' ? ['local', 'cloud'] : [source];

const isNamespaceMissingError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  return /namespace.*not found|ns not found|collection.*not found/i.test(error.message);
};

const getCollectionSnapshot = async (
  db: Awaited<ReturnType<LoadedModules['getMongoDb']>>,
  spec: PurgeCollectionSpec
): Promise<CollectionSnapshot> => {
  const collectionExists =
    (await db.listCollections({ name: spec.collection }, { nameOnly: true }).toArray()).length > 0;

  if (!collectionExists) {
    return {
      exists: false,
      totalDocuments: 0,
      sizeBytes: 0,
      storageSizeBytes: 0,
      totalIndexSizeBytes: 0,
    };
  }

  const [totalDocuments, stats] = await Promise.all([
    db.collection(spec.collection).countDocuments({}),
    db.command({ collStats: spec.collection }).catch((error: unknown) => {
      if (isNamespaceMissingError(error)) {
        return null;
      }
      throw error;
    }),
  ]);

  return {
    exists: true,
    totalDocuments,
    sizeBytes: typeof stats?.['size'] === 'number' ? stats['size'] : 0,
    storageSizeBytes: typeof stats?.['storageSize'] === 'number' ? stats['storageSize'] : 0,
    totalIndexSizeBytes: typeof stats?.['totalIndexSize'] === 'number' ? stats['totalIndexSize'] : 0,
  };
};

const purgeSourceHistory = async (
  modules: LoadedModules,
  source: MongoSource,
  apply: boolean
): Promise<{
  source: MongoSource;
  dbName: string | null;
  applied: boolean;
  collections: PurgeCollectionResult[];
}> => {
  const config = await modules.resolveMongoSourceConfig(source);
  const db = await modules.getMongoDb(source);
  const collections = await Promise.all(
    PURGE_COLLECTIONS.map(async (spec): Promise<PurgeCollectionResult> => {
      const before = await getCollectionSnapshot(db, spec);
      let deletedDocuments = 0;

      if (apply && before.exists && before.totalDocuments > 0) {
        const result = await db.collection(spec.collection).deleteMany({});
        deletedDocuments = result.deletedCount ?? 0;
      }

      const after = apply ? await getCollectionSnapshot(db, spec) : before;

      return {
        collection: spec.collection,
        label: spec.label,
        deletedDocuments,
        before,
        after,
      };
    })
  );

  return {
    source,
    dbName: config.dbName,
    applied: apply,
    collections,
  };
};

const printJson = (payload: unknown): void => {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
};

const main = async (): Promise<void> => {
  loadCliEnv();
  muteRuntimeConsole();

  const options = parseCliOptions(process.argv.slice(2));
  let modules: LoadedModules | null = null;

  try {
    modules = await loadDbModules();
    const sources = listRequestedSources(options.source);
    const results: Awaited<ReturnType<typeof purgeSourceHistory>>[] = [];
    for (const source of sources) {
      results.push(await purgeSourceHistory(modules, source, options.apply));
    }

    printJson({
      source: options.source,
      apply: options.apply,
      purgedAt: new Date().toISOString(),
      results,
    });
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
