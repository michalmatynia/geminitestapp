import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { MongoClient, ObjectId } from 'mongodb';
import { Pool } from 'pg';

import { parseLegacyCompatibleScopedCatalogParameterLinkMap } from '@/features/integrations/services/imports/parameter-import/link-map-preference-migration';
import {
  stringifyScopedCatalogParameterLinkMap,
  type ScopedCatalogParameterLinkMap,
} from '@/features/integrations/services/imports/parameter-import/link-map-preference';

type CliOptions = {
  dryRun: boolean;
};

type ProviderSummary = {
  provider: 'prisma' | 'mongodb';
  configured: boolean;
  changed: boolean;
  writesApplied: number;
  present: boolean;
  legacyPayloadDetected: boolean;
  defaultCatalogCount: number;
  scopedBucketCount: number;
  scopedCatalogCount: number;
  totalLinks: number;
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

type PreparedSettingMigration = {
  nextValue: string;
  summary: Omit<ProviderSummary, 'provider' | 'configured' | 'writesApplied' | 'error'>;
};

const SETTINGS_KEY = 'base_import_parameter_link_map';
const SETTINGS_COLLECTION = 'settings';

const parseCliOptions = (argv: string[]): CliOptions => {
  const write = argv.some((arg: string) => arg === '--write' || arg === '--apply');
  return { dryRun: !write };
};

const countTotalLinks = (map: ScopedCatalogParameterLinkMap): number => {
  const countCatalogMap = (catalogMap: Record<string, Record<string, string>>): number =>
    Object.values(catalogMap).reduce(
      (acc: number, links: Record<string, string>) => acc + Object.keys(links).length,
      0
    );

  const defaultLinks = countCatalogMap(map.defaultByCatalog);
  const scopedLinks = Object.values(map.byScope).reduce(
    (acc: number, catalogMap: Record<string, Record<string, string>>) =>
      acc + countCatalogMap(catalogMap),
    0
  );
  return defaultLinks + scopedLinks;
};

const countScopedCatalogs = (map: ScopedCatalogParameterLinkMap): number =>
  Object.values(map.byScope).reduce(
    (acc: number, catalogMap: Record<string, Record<string, string>>) =>
      acc + Object.keys(catalogMap).length,
    0
  );

const prepareSettingMigration = (rawValue: string | null): PreparedSettingMigration => {
  if (rawValue == null) {
    return {
      nextValue: stringifyScopedCatalogParameterLinkMap({
        defaultByCatalog: {},
        byScope: {},
      }),
      summary: {
        present: false,
        changed: false,
        legacyPayloadDetected: false,
        defaultCatalogCount: 0,
        scopedBucketCount: 0,
        scopedCatalogCount: 0,
        totalLinks: 0,
        warnings: ['Setting not found.'],
      },
    };
  }

  const parsed = parseLegacyCompatibleScopedCatalogParameterLinkMap(rawValue);
  const nextValue = stringifyScopedCatalogParameterLinkMap(parsed.map);
  return {
    nextValue,
    summary: {
      present: true,
      changed: rawValue !== nextValue,
      legacyPayloadDetected: parsed.legacyPayloadDetected,
      defaultCatalogCount: Object.keys(parsed.map.defaultByCatalog).length,
      scopedBucketCount: Object.keys(parsed.map.byScope).length,
      scopedCatalogCount: countScopedCatalogs(parsed.map),
      totalLinks: countTotalLinks(parsed.map),
      warnings: parsed.warnings,
    },
  };
};

const migratePrisma = async (options: CliOptions): Promise<ProviderSummary> => {
  if (!process.env['DATABASE_URL']) {
    return {
      provider: 'prisma',
      configured: false,
      changed: false,
      writesApplied: 0,
      present: false,
      legacyPayloadDetected: false,
      defaultCatalogCount: 0,
      scopedBucketCount: 0,
      scopedCatalogCount: 0,
      totalLinks: 0,
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
    const setting = await prisma.setting.findUnique({
      where: { key: SETTINGS_KEY },
      select: { value: true },
    });

    const prepared = prepareSettingMigration(setting?.value ?? null);
    let writesApplied = 0;
    if (prepared.summary.present && prepared.summary.changed && !options.dryRun) {
      await prisma.setting.upsert({
        where: { key: SETTINGS_KEY },
        create: { key: SETTINGS_KEY, value: prepared.nextValue },
        update: { value: prepared.nextValue },
      });
      writesApplied = 1;
    }

    return {
      provider: 'prisma',
      configured: true,
      writesApplied,
      error: null,
      ...prepared.summary,
    };
  } catch (error) {
    return {
      provider: 'prisma',
      configured: true,
      changed: false,
      writesApplied: 0,
      present: false,
      legacyPayloadDetected: false,
      defaultCatalogCount: 0,
      scopedBucketCount: 0,
      scopedCatalogCount: 0,
      totalLinks: 0,
      warnings: [],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await prisma?.$disconnect().catch(() => undefined);
    await pool?.end().catch(() => undefined);
  }
};

const readMongoSettingValue = (
  doc: SettingDoc | null
): { present: boolean; value: string | null; warnings: string[] } => {
  if (!doc) {
    return {
      present: false,
      value: null,
      warnings: ['Setting not found.'],
    };
  }
  if (typeof doc.value === 'string') {
    return {
      present: true,
      value: doc.value,
      warnings: [],
    };
  }
  return {
    present: true,
    value: null,
    warnings: ['Setting exists but value is not a string.'],
  };
};

const migrateMongo = async (options: CliOptions): Promise<ProviderSummary> => {
  const uri = process.env['MONGODB_URI'];
  if (!uri) {
    return {
      provider: 'mongodb',
      configured: false,
      changed: false,
      writesApplied: 0,
      present: false,
      legacyPayloadDetected: false,
      defaultCatalogCount: 0,
      scopedBucketCount: 0,
      scopedCatalogCount: 0,
      totalLinks: 0,
      warnings: ['MONGODB_URI is not configured.'],
      error: null,
    };
  }

  const mongo = new MongoClient(uri);
  try {
    await mongo.connect();
    const db = mongo.db();
    const settingDoc = await db.collection<SettingDoc>(SETTINGS_COLLECTION).findOne({
      $or: [{ _id: SETTINGS_KEY }, { key: SETTINGS_KEY }],
    });
    const read = readMongoSettingValue(settingDoc);
    const prepared = prepareSettingMigration(read.value);
    prepared.summary.present = read.present;
    if (read.warnings.length > 0) {
      prepared.summary.warnings = Array.from(
        new Set([...prepared.summary.warnings, ...read.warnings])
      );
    }

    let writesApplied = 0;
    if (prepared.summary.present && prepared.summary.changed && !options.dryRun) {
      const now = new Date();
      await db.collection<SettingDoc>(SETTINGS_COLLECTION).updateMany(
        {
          $or: [{ _id: SETTINGS_KEY }, { key: SETTINGS_KEY }],
        },
        {
          $set: {
            key: SETTINGS_KEY,
            value: prepared.nextValue,
            updatedAt: now,
          },
          $setOnInsert: {
            _id: SETTINGS_KEY,
            createdAt: now,
          },
        },
        { upsert: true }
      );
      writesApplied = 1;
    }

    return {
      provider: 'mongodb',
      configured: true,
      writesApplied,
      error: null,
      ...prepared.summary,
    };
  } catch (error) {
    return {
      provider: 'mongodb',
      configured: true,
      changed: false,
      writesApplied: 0,
      present: false,
      legacyPayloadDetected: false,
      defaultCatalogCount: 0,
      scopedBucketCount: 0,
      scopedCatalogCount: 0,
      totalLinks: 0,
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

  console.log('[migrate-base-import-parameter-link-map-v2] Summary');
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
