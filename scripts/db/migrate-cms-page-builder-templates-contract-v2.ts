import 'dotenv/config';

import {
  CMS_PAGE_BUILDER_TEMPLATE_MIGRATABLE_SETTING_KEYS,
  migrateCmsPageBuilderTemplateSettingValue,
  type CmsPageBuilderTemplateMigrationStats,
} from '@/features/cms/migrations/page-builder-template-contract-migration';
import { getAppDbProvider, type AppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import { decodeSettingValue, encodeSettingValue } from '@/shared/lib/settings/settings-compression';

type CliOptions = {
  dryRun: boolean;
  preferredProvider: 'auto' | AppDbProvider;
  keys: string[];
};

type MongoSettingDocument = {
  _id?: unknown;
  key?: unknown;
  value?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type KeyReport = {
  key: string;
  sourceProvider: AppDbProvider | null;
  foundInProviders: AppDbProvider[];
  status: 'missing' | 'changed' | 'unchanged' | 'invalid';
  changed: boolean;
  writesAttempted: number;
  writesApplied: number;
  writesFailed: number;
  writeFailures: Array<{ provider: AppDbProvider; message: string }>;
  warnings: string[];
  stats: CmsPageBuilderTemplateMigrationStats;
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
  reports: KeyReport[];
};

const SETTINGS_COLLECTION = 'settings';

const emptyStats = (): CmsPageBuilderTemplateMigrationStats => ({
  entriesScanned: 0,
  entriesKept: 0,
  entriesDropped: 0,
  idsBackfilled: 0,
  namesBackfilled: 0,
  categoriesBackfilled: 0,
  sectionTypesBackfilled: 0,
  createdAtBackfilled: 0,
});

const parseCliOptions = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
    preferredProvider: 'auto',
    keys: [...CMS_PAGE_BUILDER_TEMPLATE_MIGRATABLE_SETTING_KEYS],
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
      const keys = arg
        .slice('--keys='.length)
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
    // Fall back to deterministic provider preference below.
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
  let found = 0;
  let changed = 0;
  let unchanged = 0;
  let invalid = 0;
  let missing = 0;
  let writesAttempted = 0;
  let writesApplied = 0;
  let writesFailed = 0;

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
    const encodedSourceValue = valuesByProvider.get(sourceProvider) as string;
    const decodedSourceValue = decodeSettingValue(key, encodedSourceValue);
    const result = migrateCmsPageBuilderTemplateSettingValue({
      key,
      value: decodedSourceValue,
    });

    const changedForKey = result.status === 'changed' || result.status === 'invalid';
    if (result.status === 'invalid') invalid += 1;
    if (changedForKey) changed += 1;
    else unchanged += 1;

    const report: KeyReport = {
      key,
      sourceProvider,
      foundInProviders,
      status:
        result.status === 'invalid'
          ? 'invalid'
          : changedForKey
            ? 'changed'
            : 'unchanged',
      changed: changedForKey,
      writesAttempted: 0,
      writesApplied: 0,
      writesFailed: 0,
      writeFailures: [],
      warnings: result.warnings,
      stats: result.stats,
    };

    if (!options.dryRun && changedForKey) {
      const encodedNextValue = encodeSettingValue(key, result.value);
      for (const provider of availableProviders) {
        report.writesAttempted += 1;
        writesAttempted += 1;
        try {
          await writeSettingForProvider(provider, key, encodedNextValue);
          report.writesApplied += 1;
          writesApplied += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          report.writesFailed += 1;
          writesFailed += 1;
          report.writeFailures.push({ provider, message });
        }
      }
    }

    reports.push(report);
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
    reports,
  };
};

void run()
  .then((summary: MigrationSummary) => {
    console.log(JSON.stringify(summary, null, 2));
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ ok: false, error: message }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeResources();
  });
