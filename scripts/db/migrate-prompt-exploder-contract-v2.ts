import 'dotenv/config';

import {
  PROMPT_EXPLODER_MIGRATABLE_SETTING_KEYS,
  migratePromptExploderPersistedSettingValue,
  type PromptExploderPersistenceMigrationResult,
  type PromptExploderPersistenceMigrationStats,
} from '@/features/prompt-exploder/persistence-contract-migration';
import { getAppDbProvider, type AppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import { decodeSettingValue, encodeSettingValue } from '@/shared/lib/settings/settings-compression';

type CliOptions = {
  dryRun: boolean;
  preferredProvider: 'auto' | AppDbProvider;
  keys: string[];
};

type KeyReport = {
  key: string;
  sourceProvider: AppDbProvider | null;
  foundInProviders: AppDbProvider[];
  status: PromptExploderPersistenceMigrationResult['status'] | 'missing';
  changed: boolean;
  writesAttempted: number;
  writesApplied: number;
  writesFailed: number;
  writeFailures: Array<{ provider: AppDbProvider; message: string }>;
  warnings: string[];
  stats: PromptExploderPersistenceMigrationStats;
};

type MigrationSummary = {
  mode: 'dry-run' | 'write';
  preferredProvider: AppDbProvider;
  availableProviders: AppDbProvider[];
  keys: string[];
  scanned: number;
  found: number;
  changed: number;
  unchanged: number;
  invalid: number;
  missing: number;
  writesAttempted: number;
  writesApplied: number;
  writesFailed: number;
  aggregateStats: PromptExploderPersistenceMigrationStats;
  reports: KeyReport[];
};

type MongoSettingDocument = {
  _id?: unknown;
  key?: unknown;
  value?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const SETTINGS_COLLECTION = 'settings';

const emptyStats = (): PromptExploderPersistenceMigrationStats => ({
  stackAliasesNormalized: 0,
  scopeAliasesNormalized: 0,
  bridgeAliasesNormalized: 0,
  bridgeDefaultsApplied: 0,
  recordsTouched: 0,
});

const mergeStats = (
  base: PromptExploderPersistenceMigrationStats,
  next: PromptExploderPersistenceMigrationStats
): PromptExploderPersistenceMigrationStats => ({
  stackAliasesNormalized: base.stackAliasesNormalized + next.stackAliasesNormalized,
  scopeAliasesNormalized: base.scopeAliasesNormalized + next.scopeAliasesNormalized,
  bridgeAliasesNormalized: base.bridgeAliasesNormalized + next.bridgeAliasesNormalized,
  bridgeDefaultsApplied: base.bridgeDefaultsApplied + next.bridgeDefaultsApplied,
  recordsTouched: base.recordsTouched + next.recordsTouched,
});

const parseCliOptions = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
    preferredProvider: 'auto',
    keys: [...PROMPT_EXPLODER_MIGRATABLE_SETTING_KEYS],
  };

  for (const arg of argv) {
    if (arg === '--write') {
      options.dryRun = false;
      continue;
    }
    if (arg.startsWith('--provider=')) {
      const token = arg.slice('--provider='.length).trim().toLowerCase();
      if (token === 'auto' || token === 'mongodb' || token === 'prisma') {
        options.preferredProvider = token;
      }
      continue;
    }
    if (arg.startsWith('--keys=')) {
      const raw = arg.slice('--keys='.length);
      const keys = raw
        .split(',')
        .map((entry: string): string => entry.trim())
        .filter((entry: string): boolean => entry.length > 0);
      if (keys.length > 0) {
        options.keys = Array.from(new Set(keys));
      }
    }
  }

  return options;
};

const resolveAvailableProviders = (): AppDbProvider[] => {
  const providers: AppDbProvider[] = [];
  if (process.env['DATABASE_URL']) providers.push('prisma');
  if (process.env['MONGODB_URI']) providers.push('mongodb');
  return providers;
};

const resolvePreferredProvider = async (
  preferred: 'auto' | AppDbProvider,
  availableProviders: AppDbProvider[]
): Promise<AppDbProvider> => {
  if (preferred !== 'auto') {
    if (!availableProviders.includes(preferred)) {
      throw new Error(`Preferred provider "${preferred}" is not configured in environment.`);
    }
    return preferred;
  }

  try {
    const provider = await getAppDbProvider();
    if (availableProviders.includes(provider)) return provider;
  } catch {
    // Fallback to available provider list.
  }

  if (availableProviders.includes('mongodb')) return 'mongodb';
  if (availableProviders.includes('prisma')) return 'prisma';
  throw new Error('No database provider configured. Set DATABASE_URL or MONGODB_URI.');
};

const readSettingFromMongo = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const db = await getMongoDb();
  const doc = await db.collection<MongoSettingDocument>(SETTINGS_COLLECTION).findOne({ key });
  return typeof doc?.value === 'string' ? doc.value : null;
};

const readSettingFromPrisma = async (key: string): Promise<string | null> => {
  if (!process.env['DATABASE_URL']) return null;
  if (!('setting' in prisma)) return null;
  const setting = await prisma.setting.findUnique({
    where: { key },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const writeSettingToMongo = async (key: string, encodedValue: string): Promise<void> => {
  if (!process.env['MONGODB_URI']) return;
  const db = await getMongoDb();
  const now = new Date();
  await db.collection<MongoSettingDocument>(SETTINGS_COLLECTION).updateOne(
    { key },
    {
      $set: {
        key,
        value: encodedValue,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );
};

const writeSettingToPrisma = async (key: string, encodedValue: string): Promise<void> => {
  if (!process.env['DATABASE_URL']) return;
  if (!('setting' in prisma)) return;
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: encodedValue },
    update: { value: encodedValue },
  });
};

const readSettingForProvider = async (
  provider: AppDbProvider,
  key: string
): Promise<string | null> =>
  provider === 'mongodb' ? readSettingFromMongo(key) : readSettingFromPrisma(key);

const writeSettingForProvider = async (
  provider: AppDbProvider,
  key: string,
  encodedValue: string
): Promise<void> => {
  if (provider === 'mongodb') {
    await writeSettingToMongo(key, encodedValue);
    return;
  }
  await writeSettingToPrisma(key, encodedValue);
};

const chooseSourceProvider = (
  valuesByProvider: Map<AppDbProvider, string | null>,
  preferredProvider: AppDbProvider,
  availableProviders: AppDbProvider[]
): AppDbProvider | null => {
  const readOrder: AppDbProvider[] = [
    preferredProvider,
    ...availableProviders.filter((provider: AppDbProvider): boolean => provider !== preferredProvider),
  ];
  return (
    readOrder.find((provider: AppDbProvider): boolean => {
      const value = valuesByProvider.get(provider);
      return typeof value === 'string';
    }) ?? null
  );
};

const closeResources = async (): Promise<void> => {
  await prisma.$disconnect().catch(() => {});
  if (process.env['MONGODB_URI']) {
    const client = await getMongoClient().catch(() => null);
    await client?.close().catch(() => {});
  }
};

const run = async (): Promise<MigrationSummary> => {
  const options = parseCliOptions(process.argv.slice(2));
  const availableProviders = resolveAvailableProviders();
  const preferredProvider = await resolvePreferredProvider(
    options.preferredProvider,
    availableProviders
  );

  const reports: KeyReport[] = [];
  let writesAttempted = 0;
  let writesApplied = 0;
  let writesFailed = 0;
  let changed = 0;
  let unchanged = 0;
  let invalid = 0;
  let missing = 0;
  let found = 0;
  let aggregateStats = emptyStats();

  for (const key of options.keys) {
    const valuesByProvider = new Map<AppDbProvider, string | null>();
    for (const provider of availableProviders) {
      const value = await readSettingForProvider(provider, key);
      valuesByProvider.set(provider, value);
    }

    const foundInProviders = availableProviders.filter((provider: AppDbProvider): boolean =>
      typeof valuesByProvider.get(provider) === 'string'
    );
    const sourceProvider = chooseSourceProvider(valuesByProvider, preferredProvider, availableProviders);
    if (!sourceProvider) {
      missing += 1;
      reports.push({
        key,
        sourceProvider: null,
        foundInProviders: [],
        status: 'missing',
        changed: false,
        writesAttempted: 0,
        writesApplied: 0,
        writesFailed: 0,
        writeFailures: [],
        warnings: [],
        stats: emptyStats(),
      });
      continue;
    }

    found += 1;
    const encodedSourceValue = valuesByProvider.get(sourceProvider) ?? '';
    const decodedSourceValue = decodeSettingValue(key, encodedSourceValue);
    const migrationResult = migratePromptExploderPersistedSettingValue({
      key,
      value: decodedSourceValue,
    });
    aggregateStats = mergeStats(aggregateStats, migrationResult.stats);

    if (migrationResult.status === 'invalid_json' || migrationResult.status === 'unsupported_shape') {
      invalid += 1;
      reports.push({
        key,
        sourceProvider,
        foundInProviders,
        status: migrationResult.status,
        changed: false,
        writesAttempted: 0,
        writesApplied: 0,
        writesFailed: 0,
        writeFailures: [],
        warnings: migrationResult.warnings,
        stats: migrationResult.stats,
      });
      continue;
    }

    if (!migrationResult.changed) {
      unchanged += 1;
      reports.push({
        key,
        sourceProvider,
        foundInProviders,
        status: migrationResult.status,
        changed: false,
        writesAttempted: 0,
        writesApplied: 0,
        writesFailed: 0,
        writeFailures: [],
        warnings: migrationResult.warnings,
        stats: migrationResult.stats,
      });
      continue;
    }

    changed += 1;
    const nextDecodedValue = migrationResult.nextValue ?? migrationResult.value;
    const nextEncodedValue = encodeSettingValue(key, nextDecodedValue);
    const writeFailures: Array<{ provider: AppDbProvider; message: string }> = [];
    let keyWritesAttempted = 0;
    let keyWritesApplied = 0;

    if (!options.dryRun) {
      for (const provider of availableProviders) {
        const currentEncodedValue = valuesByProvider.get(provider);
        if (currentEncodedValue === nextEncodedValue) continue;
        keyWritesAttempted += 1;
        writesAttempted += 1;
        try {
          await writeSettingForProvider(provider, key, nextEncodedValue);
          keyWritesApplied += 1;
          writesApplied += 1;
        } catch (error) {
          writesFailed += 1;
          writeFailures.push({
            provider,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    reports.push({
      key,
      sourceProvider,
      foundInProviders,
      status: migrationResult.status,
      changed: true,
      writesAttempted: keyWritesAttempted,
      writesApplied: keyWritesApplied,
      writesFailed: writeFailures.length,
      writeFailures,
      warnings: migrationResult.warnings,
      stats: migrationResult.stats,
    });
  }

  return {
    mode: options.dryRun ? 'dry-run' : 'write',
    preferredProvider,
    availableProviders,
    keys: options.keys,
    scanned: options.keys.length,
    found,
    changed,
    unchanged,
    invalid,
    missing,
    writesAttempted,
    writesApplied,
    writesFailed,
    aggregateStats,
    reports,
  };
};

void run()
  .then(async (summary: MigrationSummary) => {
    console.log(JSON.stringify(summary, null, 2));
    await closeResources();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error('Failed to migrate Prompt Exploder contract to v2 persistence format:', error);
    await closeResources();
    process.exit(1);
  });
