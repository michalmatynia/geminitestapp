import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { MongoClient, ObjectId, type Collection } from 'mongodb';
import { Pool } from 'pg';

import { migrateBaseImportRunConnectionId } from './lib/integrations/base-import-run-connection-migration';

type CliOptions = {
  dryRun: boolean;
};

type FallbackSource = 'default-setting' | 'single-base-connection' | 'none';

type ProviderSummary = {
  provider: 'prisma' | 'mongodb';
  configured: boolean;
  changed: boolean;
  writesApplied: number;
  runsScanned: number;
  runsMissingConnection: number;
  runsBackfilled: number;
  runsStillMissingConnection: number;
  invalidPayloadCount: number;
  fallbackConnectionId: string | null;
  fallbackSource: FallbackSource;
  baseConnectionCount: number;
  defaultConnectionId: string | null;
  warnings: string[];
  error: string | null;
};

type MigrationSummary = {
  mode: 'dry-run' | 'write';
  providers: ProviderSummary[];
};

type SettingDoc = {
  _id?: string | ObjectId;
  key?: unknown;
  value?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const SETTINGS_COLLECTION = 'settings';
const INTEGRATION_COLLECTION = 'integrations';
const INTEGRATION_CONNECTION_COLLECTION = 'integration_connections';
const RUN_KEY_PREFIX = 'base_import_run:';
const DEFAULT_CONNECTION_SETTING_KEY = 'base_export_default_connection_id';
const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com', 'base']);

const parseCliOptions = (argv: string[]): CliOptions => {
  const write = argv.some((arg: string) => arg === '--write' || arg === '--apply');
  return { dryRun: !write };
};

const normalizeOptionalId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeDocId = (value: unknown): string | null => {
  if (value instanceof ObjectId) return value.toHexString();
  return normalizeOptionalId(value);
};

const pushWarning = (warnings: string[], warning: string): void => {
  if (!warning.trim()) return;
  if (warnings.includes(warning)) return;
  if (warnings.length >= 25) return;
  warnings.push(warning);
};

const toDocumentIdCandidates = (id: string): Array<string | ObjectId> => {
  if (ObjectId.isValid(id) && id.length === 24) {
    return [id, new ObjectId(id)];
  }
  return [id];
};

const chooseFallbackConnection = (input: {
  baseConnectionIds: string[];
  defaultConnectionIdRaw: string | null;
  warnings: string[];
}): {
  fallbackConnectionId: string | null;
  fallbackSource: FallbackSource;
  defaultConnectionId: string | null;
} => {
  const defaultConnectionId = normalizeOptionalId(input.defaultConnectionIdRaw);
  const baseConnectionSet = new Set<string>(input.baseConnectionIds);

  if (defaultConnectionId && baseConnectionSet.has(defaultConnectionId)) {
    return {
      fallbackConnectionId: defaultConnectionId,
      fallbackSource: 'default-setting',
      defaultConnectionId,
    };
  }

  if (defaultConnectionId && !baseConnectionSet.has(defaultConnectionId)) {
    pushWarning(
      input.warnings,
      `Default Base connection "${defaultConnectionId}" is not among discovered Base integration connections.`
    );
  }

  if (input.baseConnectionIds.length === 1) {
    return {
      fallbackConnectionId: input.baseConnectionIds[0] ?? null,
      fallbackSource: 'single-base-connection',
      defaultConnectionId,
    };
  }

  if (input.baseConnectionIds.length === 0) {
    pushWarning(input.warnings, 'No Base integration connections were discovered.');
  } else {
    pushWarning(
      input.warnings,
      'Multiple Base integration connections found and no usable default connection is configured.'
    );
  }

  return {
    fallbackConnectionId: null,
    fallbackSource: 'none',
    defaultConnectionId,
  };
};

type RunSetting = {
  key: string;
  value: string;
};

type RunUpdate = {
  key: string;
  value: string;
};

type RunMigrationStats = {
  runsScanned: number;
  runsMissingConnection: number;
  runsBackfilled: number;
  runsStillMissingConnection: number;
  invalidPayloadCount: number;
  updates: RunUpdate[];
};

const migrateRunSettings = (input: {
  runs: RunSetting[];
  fallbackConnectionId: string | null;
  warnings: string[];
}): RunMigrationStats => {
  const stats: RunMigrationStats = {
    runsScanned: 0,
    runsMissingConnection: 0,
    runsBackfilled: 0,
    runsStillMissingConnection: 0,
    invalidPayloadCount: 0,
    updates: [],
  };

  input.runs.forEach((run) => {
    stats.runsScanned += 1;
    const migrated = migrateBaseImportRunConnectionId({
      runValueRaw: run.value,
      fallbackConnectionId: input.fallbackConnectionId,
    });

    if (!migrated.hadConnectionIdBefore) {
      stats.runsMissingConnection += 1;
    }
    if (migrated.backfilled) {
      stats.runsBackfilled += 1;
    }
    if (!migrated.hasConnectionIdAfter) {
      stats.runsStillMissingConnection += 1;
    }
    if (migrated.invalidPayload) {
      stats.invalidPayloadCount += 1;
    }
    migrated.warnings.forEach((warning) => pushWarning(input.warnings, warning));

    if (migrated.changed) {
      stats.updates.push({
        key: run.key,
        value: migrated.nextValue,
      });
    }
  });

  return stats;
};

const migratePrisma = async (options: CliOptions): Promise<ProviderSummary> => {
  if (!process.env['DATABASE_URL']) {
    return {
      provider: 'prisma',
      configured: false,
      changed: false,
      writesApplied: 0,
      runsScanned: 0,
      runsMissingConnection: 0,
      runsBackfilled: 0,
      runsStillMissingConnection: 0,
      invalidPayloadCount: 0,
      fallbackConnectionId: null,
      fallbackSource: 'none',
      baseConnectionCount: 0,
      defaultConnectionId: null,
      warnings: ['DATABASE_URL is not configured.'],
      error: null,
    };
  }

  let prisma: PrismaClient | null = null;
  let pool: Pool | null = null;
  try {
    pool = new Pool({
      connectionString: process.env['DATABASE_URL'],
    });
    prisma = new PrismaClient({
      adapter: new PrismaPg(pool),
    });

    const warnings: string[] = [];

    const [defaultConnectionSetting, baseIntegrations, runSettings] = await Promise.all([
      prisma.setting.findUnique({
        where: { key: DEFAULT_CONNECTION_SETTING_KEY },
        select: { value: true },
      }),
      prisma.integration.findMany({
        where: {
          slug: {
            in: Array.from(BASE_INTEGRATION_SLUGS),
          },
        },
        select: { id: true },
      }),
      prisma.setting.findMany({
        where: {
          key: {
            startsWith: RUN_KEY_PREFIX,
          },
        },
        select: {
          key: true,
          value: true,
        },
      }),
    ]);

    const integrationIds = baseIntegrations.map((integration) => integration.id);
    const baseConnections =
      integrationIds.length > 0
        ? await prisma.integrationConnection.findMany({
            where: {
              integrationId: {
                in: integrationIds,
              },
            },
            select: {
              id: true,
            },
          })
        : [];
    const baseConnectionIds = baseConnections.map((connection) => connection.id);

    const fallback = chooseFallbackConnection({
      baseConnectionIds,
      defaultConnectionIdRaw: defaultConnectionSetting?.value ?? null,
      warnings,
    });

    const stats = migrateRunSettings({
      runs: runSettings,
      fallbackConnectionId: fallback.fallbackConnectionId,
      warnings,
    });

    let writesApplied = 0;
    if (!options.dryRun) {
      for (const update of stats.updates) {
        await prisma.setting.update({
          where: { key: update.key },
          data: { value: update.value },
        });
        writesApplied += 1;
      }
    }

    if (stats.runsStillMissingConnection > 0) {
      pushWarning(
        warnings,
        `${stats.runsStillMissingConnection} run(s) still missing connectionId after migration.`
      );
    }

    return {
      provider: 'prisma',
      configured: true,
      changed: stats.updates.length > 0,
      writesApplied,
      runsScanned: stats.runsScanned,
      runsMissingConnection: stats.runsMissingConnection,
      runsBackfilled: stats.runsBackfilled,
      runsStillMissingConnection: stats.runsStillMissingConnection,
      invalidPayloadCount: stats.invalidPayloadCount,
      fallbackConnectionId: fallback.fallbackConnectionId,
      fallbackSource: fallback.fallbackSource,
      baseConnectionCount: baseConnectionIds.length,
      defaultConnectionId: fallback.defaultConnectionId,
      warnings,
      error: null,
    };
  } catch (error) {
    return {
      provider: 'prisma',
      configured: true,
      changed: false,
      writesApplied: 0,
      runsScanned: 0,
      runsMissingConnection: 0,
      runsBackfilled: 0,
      runsStillMissingConnection: 0,
      invalidPayloadCount: 0,
      fallbackConnectionId: null,
      fallbackSource: 'none',
      baseConnectionCount: 0,
      defaultConnectionId: null,
      warnings: [],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await prisma?.$disconnect().catch(() => undefined);
    await pool?.end().catch(() => undefined);
  }
};

const resolveSettingKey = (doc: SettingDoc): string | null => {
  const fromKey = normalizeOptionalId(doc.key);
  if (fromKey) return fromKey;
  if (typeof doc._id === 'string') {
    return normalizeOptionalId(doc._id);
  }
  return null;
};

const readMongoSettingValue = async (
  collection: Collection<SettingDoc>,
  key: string,
  warnings: string[]
): Promise<string | null> => {
  const doc = await collection.findOne({
    $or: [{ _id: key }, { key }],
  });
  if (!doc) return null;
  if (typeof doc.value === 'string') return doc.value;
  pushWarning(warnings, `Setting "${key}" exists but value is not a string.`);
  return null;
};

const migrateMongo = async (options: CliOptions): Promise<ProviderSummary> => {
  const uri = process.env['MONGODB_URI'];
  if (!uri) {
    return {
      provider: 'mongodb',
      configured: false,
      changed: false,
      writesApplied: 0,
      runsScanned: 0,
      runsMissingConnection: 0,
      runsBackfilled: 0,
      runsStillMissingConnection: 0,
      invalidPayloadCount: 0,
      fallbackConnectionId: null,
      fallbackSource: 'none',
      baseConnectionCount: 0,
      defaultConnectionId: null,
      warnings: ['MONGODB_URI is not configured.'],
      error: null,
    };
  }

  const mongo = new MongoClient(uri);
  try {
    await mongo.connect();
    const db = mongo.db();
    const settingsCollection = db.collection<SettingDoc>(SETTINGS_COLLECTION);
    const warnings: string[] = [];

    const [integrationDocs, defaultConnectionRaw] = await Promise.all([
      db
        .collection<Record<string, unknown>>(INTEGRATION_COLLECTION)
        .find(
          {
            slug: {
              $in: Array.from(BASE_INTEGRATION_SLUGS),
            },
          },
          {
            projection: {
              _id: 1,
              id: 1,
            },
          }
        )
        .toArray(),
      readMongoSettingValue(settingsCollection, DEFAULT_CONNECTION_SETTING_KEY, warnings),
    ]);

    const baseIntegrationIds = Array.from(
      new Set(
        integrationDocs
          .flatMap((doc) => [normalizeDocId(doc['id']), normalizeDocId(doc['_id'])])
          .filter((id): id is string => Boolean(id))
      )
    );

    const integrationIdCandidates = Array.from(
      new Map<string, string | ObjectId>(
        baseIntegrationIds.flatMap((integrationId) =>
          toDocumentIdCandidates(integrationId).map((candidate) => {
            const key = candidate instanceof ObjectId ? `oid:${candidate.toHexString()}` : `str:${candidate}`;
            return [key, candidate] as const;
          })
        )
      ).values()
    );

    const connectionDocs =
      integrationIdCandidates.length > 0
        ? await db
            .collection<Record<string, unknown>>(INTEGRATION_CONNECTION_COLLECTION)
            .find(
              {
                integrationId: {
                  $in: integrationIdCandidates,
                },
              },
              {
                projection: {
                  _id: 1,
                  id: 1,
                },
              }
            )
            .toArray()
        : [];

    const baseConnectionIds = Array.from(
      new Set(
        connectionDocs
          .flatMap((doc) => [normalizeDocId(doc['id']), normalizeDocId(doc['_id'])])
          .filter((id): id is string => Boolean(id))
      )
    );

    const fallback = chooseFallbackConnection({
      baseConnectionIds,
      defaultConnectionIdRaw: defaultConnectionRaw,
      warnings,
    });

    const runRegex = new RegExp(`^${RUN_KEY_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    const runDocs = await settingsCollection
      .find({
        $or: [{ key: { $regex: runRegex } }, { _id: { $regex: runRegex } }],
      })
      .toArray();

    const runs: RunSetting[] = [];
    let invalidPayloadCount = 0;
    runDocs.forEach((doc) => {
      const key = resolveSettingKey(doc);
      if (!key || !key.startsWith(RUN_KEY_PREFIX)) return;
      if (typeof doc.value !== 'string') {
        invalidPayloadCount += 1;
        pushWarning(warnings, `Run setting "${key}" value is not a string.`);
        return;
      }
      runs.push({ key, value: doc.value });
    });

    const stats = migrateRunSettings({
      runs,
      fallbackConnectionId: fallback.fallbackConnectionId,
      warnings,
    });
    stats.runsScanned += invalidPayloadCount;
    stats.invalidPayloadCount += invalidPayloadCount;

    let writesApplied = 0;
    if (!options.dryRun) {
      for (const update of stats.updates) {
        const now = new Date();
        await settingsCollection.updateMany(
          {
            $or: [{ key: update.key }, { _id: update.key }],
          },
          {
            $set: {
              key: update.key,
              value: update.value,
              updatedAt: now,
            },
            $setOnInsert: {
              _id: update.key,
              createdAt: now,
            },
          },
          { upsert: true }
        );
        writesApplied += 1;
      }
    }

    if (stats.runsStillMissingConnection > 0) {
      pushWarning(
        warnings,
        `${stats.runsStillMissingConnection} run(s) still missing connectionId after migration.`
      );
    }

    return {
      provider: 'mongodb',
      configured: true,
      changed: stats.updates.length > 0,
      writesApplied,
      runsScanned: stats.runsScanned,
      runsMissingConnection: stats.runsMissingConnection,
      runsBackfilled: stats.runsBackfilled,
      runsStillMissingConnection: stats.runsStillMissingConnection,
      invalidPayloadCount: stats.invalidPayloadCount,
      fallbackConnectionId: fallback.fallbackConnectionId,
      fallbackSource: fallback.fallbackSource,
      baseConnectionCount: baseConnectionIds.length,
      defaultConnectionId: fallback.defaultConnectionId,
      warnings,
      error: null,
    };
  } catch (error) {
    return {
      provider: 'mongodb',
      configured: true,
      changed: false,
      writesApplied: 0,
      runsScanned: 0,
      runsMissingConnection: 0,
      runsBackfilled: 0,
      runsStillMissingConnection: 0,
      invalidPayloadCount: 0,
      fallbackConnectionId: null,
      fallbackSource: 'none',
      baseConnectionCount: 0,
      defaultConnectionId: null,
      warnings: [],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await mongo.close().catch(() => undefined);
  }
};

const main = async (): Promise<void> => {
  const options = parseCliOptions(process.argv.slice(2));
  const [prisma, mongodb] = await Promise.all([migratePrisma(options), migrateMongo(options)]);
  const summary: MigrationSummary = {
    mode: options.dryRun ? 'dry-run' : 'write',
    providers: [prisma, mongodb],
  };

  console.log('[migrate-base-import-run-connection-ids-v2] Summary');
  console.log(JSON.stringify(summary, null, 2));

  const failedProviders = summary.providers.filter(
    (provider: ProviderSummary): boolean =>
      provider.configured && typeof provider.error === 'string' && provider.error.length > 0
  );
  if (failedProviders.length > 0) {
    process.exitCode = 1;
  }
};

void main();
