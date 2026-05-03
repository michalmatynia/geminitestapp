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

type CollectionSnapshot = {
  exists: boolean;
  totalDocuments: number;
  sizeBytes: number;
  storageSizeBytes: number;
  totalIndexSizeBytes: number;
  avgObjSizeBytes: number;
};

type SettingsDoc = {
  key?: string;
  value?: string;
};

type RunDoc = {
  _id?: unknown;
  id?: string;
  pathId?: string | null;
  createdAt?: Date | string | null;
};

type OrphanPathReport = {
  pathId: string;
  runCount: number;
  nodeCount: number;
  eventCount: number;
  latestRunAt: string | null;
  estimatedDocumentBytes: number;
  hasStaleConfigKey: boolean;
  hasStaleDebugKey: boolean;
};

type SourceAuditResult = {
  source: MongoSource;
  dbName: string | null;
  indexStatus: 'valid' | 'missing' | 'invalid';
  indexError: string | null;
  activePathIds: string[];
  configPathIds: string[];
  debugPathIds: string[];
  staleConfigPathIds: string[];
  staleDebugPathIds: string[];
  staleSettingsKeys: string[];
  orphanRunIds: string[];
  orphanPathIds: string[];
  orphanPaths: OrphanPathReport[];
  totals: {
    orphanRunCount: number;
    orphanNodeCount: number;
    orphanEventCount: number;
    estimatedDocumentBytes: number;
  };
  collections: Record<string, CollectionSnapshot>;
};

type CleanupResult = {
  deletedRunDocuments: number;
  deletedNodeDocuments: number;
  deletedEventDocuments: number;
  deletedSettingsKeys: number;
  skipped: boolean;
  skippedReason: string | null;
};

const AI_PATH_RUNS_COLLECTION = 'ai_path_runs';
const AI_PATH_RUN_NODES_COLLECTION = 'ai_path_run_nodes';
const AI_PATH_RUN_EVENTS_COLLECTION = 'ai_path_run_events';
const AI_PATHS_SETTINGS_COLLECTION = 'ai_paths_settings';
const PATH_INDEX_KEY = 'ai_paths_index';
const PATH_CONFIG_PREFIX = 'ai_paths_config_';
const PATH_DEBUG_PREFIX = 'ai_paths_debug_';
const COLLECTION_NAMES = [
  AI_PATHS_SETTINGS_COLLECTION,
  AI_PATH_RUNS_COLLECTION,
  AI_PATH_RUN_NODES_COLLECTION,
  AI_PATH_RUN_EVENTS_COLLECTION,
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

const printJson = (payload: unknown): void => {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
};

const normalizePathId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const uniqueSortedStrings = (values: Iterable<string>): string[] => Array.from(new Set(values)).sort();

const toIsoString = (value: Date | string | null | undefined): string | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }
  return null;
};

const getCollectionSnapshot = async (
  db: Awaited<ReturnType<LoadedModules['getMongoDb']>>,
  collectionName: string
): Promise<CollectionSnapshot> => {
  const collectionExists =
    (await db.listCollections({ name: collectionName }, { nameOnly: true }).toArray()).length > 0;

  if (!collectionExists) {
    return {
      exists: false,
      totalDocuments: 0,
      sizeBytes: 0,
      storageSizeBytes: 0,
      totalIndexSizeBytes: 0,
      avgObjSizeBytes: 0,
    };
  }

  const [totalDocuments, stats] = await Promise.all([
    db.collection(collectionName).countDocuments({}),
    db.command({ collStats: collectionName }).catch((error: unknown) => {
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
    avgObjSizeBytes: typeof stats?.['avgObjSize'] === 'number' ? stats['avgObjSize'] : 0,
  };
};

const parseActivePathIds = (
  settings: SettingsDoc[],
  indexKey: string
): {
  status: 'valid' | 'missing' | 'invalid';
  error: string | null;
  activePathIds: string[];
} => {
  const indexValue = settings.find((record) => record.key === indexKey)?.value;
  if (typeof indexValue !== 'string' || indexValue.trim().length === 0) {
    return {
      status: 'missing',
      error: `Missing ${indexKey}.`,
      activePathIds: [],
    };
  }

  try {
    const parsed = JSON.parse(indexValue) as unknown;
    if (!Array.isArray(parsed)) {
      return {
        status: 'invalid',
        error: `${indexKey} is not a JSON array.`,
        activePathIds: [],
      };
    }

    return {
      status: 'valid',
      error: null,
      activePathIds: uniqueSortedStrings(
        parsed
          .map((entry) =>
            entry && typeof entry === 'object' && !Array.isArray(entry)
              ? normalizePathId((entry as { id?: unknown }).id)
              : null
          )
          .filter((value): value is string => value !== null)
      ),
    };
  } catch (error) {
    return {
      status: 'invalid',
      error: error instanceof Error ? error.message : String(error),
      activePathIds: [],
    };
  }
};

const collectPathIdsByPrefix = (settings: SettingsDoc[], prefix: string): string[] =>
  uniqueSortedStrings(
    settings
      .map((record) => {
        if (typeof record.key !== 'string' || !record.key.startsWith(prefix)) {
          return null;
        }
        return normalizePathId(record.key.slice(prefix.length));
      })
      .filter((value): value is string => value !== null)
  );

const buildCountMapByRunId = async (
  db: Awaited<ReturnType<LoadedModules['getMongoDb']>>,
  collectionName: string,
  runIds: string[]
): Promise<Map<string, number>> => {
  if (runIds.length === 0) return new Map();
  const rows = await db
    .collection<{ _id: string; count: number }>(collectionName)
    .aggregate([
      { $match: { runId: { $in: runIds } } },
      { $group: { _id: '$runId', count: { $sum: 1 } } },
    ])
    .toArray();
  return new Map(
    rows.map((row) => [row['_id'], typeof row['count'] === 'number' ? row['count'] : 0] as const)
  );
};

const auditSource = async (
  modules: LoadedModules,
  source: MongoSource
): Promise<SourceAuditResult> => {
  const config = await modules.resolveMongoSourceConfig(source);
  const db = await modules.getMongoDb(source);
  const settingsCollectionName = AI_PATHS_SETTINGS_COLLECTION;
  const settings = await db
    .collection<SettingsDoc>(settingsCollectionName)
    .find({}, { projection: { _id: 0, key: 1, value: 1 } })
    .toArray();

  const activePathState = parseActivePathIds(settings, PATH_INDEX_KEY);
  const activePathIds = activePathState.activePathIds;
  const activePathSet = new Set(activePathIds);
  const configPathIds = collectPathIdsByPrefix(settings, PATH_CONFIG_PREFIX);
  const debugPathIds = collectPathIdsByPrefix(settings, PATH_DEBUG_PREFIX);
  const staleConfigPathIds = configPathIds.filter((pathId) => !activePathSet.has(pathId));
  const staleDebugPathIds = debugPathIds.filter((pathId) => !activePathSet.has(pathId));
  const staleSettingsKeys = uniqueSortedStrings([
    ...staleConfigPathIds.map((pathId) => `${PATH_CONFIG_PREFIX}${pathId}`),
    ...staleDebugPathIds.map((pathId) => `${PATH_DEBUG_PREFIX}${pathId}`),
  ]);

  const rawRunPathIds = await db.collection<RunDoc>(AI_PATH_RUNS_COLLECTION).distinct('pathId', {
    pathId: { $type: 'string', $ne: '' },
  });
  const orphanPathIds = uniqueSortedStrings(
    rawRunPathIds
      .map((value) => normalizePathId(value))
      .filter((value): value is string => value !== null && !activePathSet.has(value))
  );

  const orphanRunDocs =
    orphanPathIds.length === 0
      ? []
      : await db
          .collection<RunDoc>(AI_PATH_RUNS_COLLECTION)
          .find(
            { pathId: { $in: orphanPathIds } },
            { projection: { _id: 1, id: 1, pathId: 1, createdAt: 1 } }
          )
          .toArray();

  const orphanRunIds = uniqueSortedStrings(
    orphanRunDocs
      .map((doc) => normalizePathId(doc.id) ?? normalizePathId(String(doc._id ?? '')))
      .filter((value): value is string => value !== null)
  );
  const runIdToPathId = new Map<string, string>();
  const runIdsByPath = new Map<string, string[]>();
  const latestRunAtByPath = new Map<string, string | null>();

  orphanRunDocs.forEach((doc) => {
    const pathId = normalizePathId(doc.pathId);
    const runId = normalizePathId(doc.id) ?? normalizePathId(String(doc._id ?? ''));
    if (!pathId || !runId) return;
    const currentRunIds = runIdsByPath.get(pathId) ?? [];
    currentRunIds.push(runId);
    runIdsByPath.set(pathId, currentRunIds);
    runIdToPathId.set(runId, pathId);
    const nextCreatedAt = toIsoString(doc.createdAt);
    const previousCreatedAt = latestRunAtByPath.get(pathId) ?? null;
    if (!previousCreatedAt || (nextCreatedAt && nextCreatedAt > previousCreatedAt)) {
      latestRunAtByPath.set(pathId, nextCreatedAt);
    }
  });

  const [nodeCountsByRunId, eventCountsByRunId, collectionEntries] = await Promise.all([
    buildCountMapByRunId(db, AI_PATH_RUN_NODES_COLLECTION, orphanRunIds),
    buildCountMapByRunId(db, AI_PATH_RUN_EVENTS_COLLECTION, orphanRunIds),
    Promise.all(
      COLLECTION_NAMES.map(async (collectionName) => [
        collectionName,
        await getCollectionSnapshot(db, collectionName),
      ] as const)
    ),
  ]);

  const collections = Object.fromEntries(collectionEntries);
  const orphanPaths = orphanPathIds
    .map((pathId) => {
      const runIds = runIdsByPath.get(pathId) ?? [];
      const nodeCount = runIds.reduce((total, runId) => total + (nodeCountsByRunId.get(runId) ?? 0), 0);
      const eventCount = runIds.reduce(
        (total, runId) => total + (eventCountsByRunId.get(runId) ?? 0),
        0
      );
      const estimatedDocumentBytes =
        runIds.length * (collections[AI_PATH_RUNS_COLLECTION]?.avgObjSizeBytes ?? 0) +
        nodeCount * (collections[AI_PATH_RUN_NODES_COLLECTION]?.avgObjSizeBytes ?? 0) +
        eventCount * (collections[AI_PATH_RUN_EVENTS_COLLECTION]?.avgObjSizeBytes ?? 0);

      return {
        pathId,
        runCount: runIds.length,
        nodeCount,
        eventCount,
        latestRunAt: latestRunAtByPath.get(pathId) ?? null,
        estimatedDocumentBytes,
        hasStaleConfigKey: staleConfigPathIds.includes(pathId),
        hasStaleDebugKey: staleDebugPathIds.includes(pathId),
      };
    })
    .sort((left, right) => {
      if (right.estimatedDocumentBytes !== left.estimatedDocumentBytes) {
        return right.estimatedDocumentBytes - left.estimatedDocumentBytes;
      }
      if (right.runCount !== left.runCount) {
        return right.runCount - left.runCount;
      }
      return left.pathId.localeCompare(right.pathId);
    });

  return {
    source,
    dbName: config.dbName,
    indexStatus: activePathState.status,
    indexError: activePathState.error,
    activePathIds,
    configPathIds,
    debugPathIds,
    staleConfigPathIds,
    staleDebugPathIds,
    staleSettingsKeys,
    orphanRunIds,
    orphanPathIds,
    orphanPaths,
    totals: {
      orphanRunCount: orphanPaths.reduce((total, path) => total + path.runCount, 0),
      orphanNodeCount: orphanPaths.reduce((total, path) => total + path.nodeCount, 0),
      orphanEventCount: orphanPaths.reduce((total, path) => total + path.eventCount, 0),
      estimatedDocumentBytes: orphanPaths.reduce(
        (total, path) => total + path.estimatedDocumentBytes,
        0
      ),
    },
    collections,
  };
};

const applyCleanup = async (
  modules: LoadedModules,
  audit: SourceAuditResult
): Promise<CleanupResult> => {
  if (audit.indexStatus !== 'valid') {
    return {
      deletedRunDocuments: 0,
      deletedNodeDocuments: 0,
      deletedEventDocuments: 0,
      deletedSettingsKeys: 0,
      skipped: true,
      skippedReason: `Skipped cleanup because ${PATH_INDEX_KEY} is ${audit.indexStatus}.`,
    };
  }

  if (audit.orphanPathIds.length === 0 && audit.staleSettingsKeys.length === 0) {
    return {
      deletedRunDocuments: 0,
      deletedNodeDocuments: 0,
      deletedEventDocuments: 0,
      deletedSettingsKeys: 0,
      skipped: false,
      skippedReason: null,
    };
  }

  const db = await modules.getMongoDb(audit.source);
  const [runDeleteResult, nodeDeleteResult, eventDeleteResult, settingsDeleteResult] =
    await Promise.all([
      audit.orphanPathIds.length === 0
        ? Promise.resolve({ deletedCount: 0 })
        : db.collection(AI_PATH_RUNS_COLLECTION).deleteMany({
            pathId: { $in: audit.orphanPathIds },
          }),
      audit.orphanRunIds.length === 0
        ? Promise.resolve({ deletedCount: 0 })
        : db.collection(AI_PATH_RUN_NODES_COLLECTION).deleteMany({
            runId: { $in: audit.orphanRunIds },
          }),
      audit.orphanRunIds.length === 0
        ? Promise.resolve({ deletedCount: 0 })
        : db.collection(AI_PATH_RUN_EVENTS_COLLECTION).deleteMany({
            runId: { $in: audit.orphanRunIds },
          }),
      audit.staleSettingsKeys.length === 0
        ? Promise.resolve({ deletedCount: 0 })
        : db.collection(AI_PATHS_SETTINGS_COLLECTION).deleteMany({
            key: { $in: audit.staleSettingsKeys },
          }),
    ]);

  return {
    deletedRunDocuments: runDeleteResult.deletedCount ?? 0,
    deletedNodeDocuments: nodeDeleteResult.deletedCount ?? 0,
    deletedEventDocuments: eventDeleteResult.deletedCount ?? 0,
    deletedSettingsKeys: settingsDeleteResult.deletedCount ?? 0,
    skipped: false,
    skippedReason: null,
  };
};

const main = async (): Promise<void> => {
  loadCliEnv();
  muteRuntimeConsole();

  const options = parseCliOptions(process.argv.slice(2));
  let modules: LoadedModules | null = null;

  try {
    modules = await loadDbModules();
    const results = [];

    for (const source of listRequestedSources(options.source)) {
      const before = await auditSource(modules, source);
      const applied = options.apply ? await applyCleanup(modules, before) : null;
      const after = options.apply ? await auditSource(modules, source) : before;
      results.push({
        source,
        before,
        applied,
        after,
      });
    }

    printJson({
      source: options.source,
      apply: options.apply,
      processedAt: new Date().toISOString(),
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
