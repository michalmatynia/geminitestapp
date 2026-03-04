import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { MongoClient, ObjectId } from 'mongodb';
import { Pool } from 'pg';

import {
  parseExportWarehouseByInventoryMap,
  stringifyExportWarehouseByInventoryMap,
} from '@/features/integrations/services/export-warehouse-preference';
import { migrateLegacyExportWarehousePreference } from '@/features/integrations/services/export-warehouse-preference-migration';

type CliOptions = {
  dryRun: boolean;
};

type ProviderSummary = {
  provider: 'prisma' | 'mongodb';
  configured: boolean;
  changed: boolean;
  writesApplied: number;
  mapPresent: boolean;
  legacySettingPresent: boolean;
  defaultInventoryId: string | null;
  migratedToInventoryId: string | null;
  legacyPayloadDetected: boolean;
  scopedMappingCount: number;
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
const EXPORT_WAREHOUSE_MAP_KEY = 'base_export_warehouse_by_inventory';
const LEGACY_EXPORT_WAREHOUSE_KEY = 'base_export_warehouse_id';
const DEFAULT_INVENTORY_KEY = 'base_export_default_inventory_id';

const parseCliOptions = (argv: string[]): CliOptions => {
  const write = argv.some((arg: string) => arg === '--write' || arg === '--apply');
  return { dryRun: !write };
};

const normalizeOptionalId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const migratePayload = (input: {
  mapValueRaw: string | null;
  legacyWarehouseValueRaw: string | null;
  defaultInventoryIdRaw: string | null;
}): {
  nextMapValue: string;
  changed: boolean;
  legacyPayloadDetected: boolean;
  migratedToInventoryId: string | null;
  defaultInventoryId: string | null;
  scopedMappingCount: number;
  warnings: string[];
} => {
  const normalizedCurrentMap =
    input.mapValueRaw == null
      ? null
      : stringifyExportWarehouseByInventoryMap(parseExportWarehouseByInventoryMap(input.mapValueRaw));
  const migrated = migrateLegacyExportWarehousePreference({
    mapValueRaw: input.mapValueRaw,
    legacyWarehouseValueRaw: input.legacyWarehouseValueRaw,
    defaultInventoryIdRaw: input.defaultInventoryIdRaw,
  });
  const nextMapValue = stringifyExportWarehouseByInventoryMap(migrated.map);

  const mapCanonicalizationChanged =
    normalizedCurrentMap !== null && normalizedCurrentMap !== input.mapValueRaw;
  const changed = migrated.changed || mapCanonicalizationChanged;
  return {
    nextMapValue,
    changed,
    legacyPayloadDetected: migrated.legacyPayloadDetected,
    migratedToInventoryId: migrated.migratedToInventoryId,
    defaultInventoryId: migrated.defaultInventoryId,
    scopedMappingCount: Object.keys(migrated.map).length,
    warnings: migrated.warnings,
  };
};

const migratePrisma = async (options: CliOptions): Promise<ProviderSummary> => {
  if (!process.env['DATABASE_URL']) {
    return {
      provider: 'prisma',
      configured: false,
      changed: false,
      writesApplied: 0,
      mapPresent: false,
      legacySettingPresent: false,
      defaultInventoryId: null,
      migratedToInventoryId: null,
      legacyPayloadDetected: false,
      scopedMappingCount: 0,
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

    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [EXPORT_WAREHOUSE_MAP_KEY, LEGACY_EXPORT_WAREHOUSE_KEY, DEFAULT_INVENTORY_KEY],
        },
      },
      select: {
        key: true,
        value: true,
      },
    });
    const byKey = new Map<string, string>();
    settings.forEach((entry) => {
      byKey.set(entry.key, entry.value);
    });

    const mapValueRaw = byKey.get(EXPORT_WAREHOUSE_MAP_KEY) ?? null;
    const legacyValueRaw = byKey.get(LEGACY_EXPORT_WAREHOUSE_KEY) ?? null;
    const defaultInventoryIdRaw = byKey.get(DEFAULT_INVENTORY_KEY) ?? null;
    const existingMap = parseExportWarehouseByInventoryMap(mapValueRaw);
    const migrated = migratePayload({
      mapValueRaw,
      legacyWarehouseValueRaw: legacyValueRaw,
      defaultInventoryIdRaw,
    });
    const canPruneLegacySetting =
      byKey.has(LEGACY_EXPORT_WAREHOUSE_KEY) &&
      (normalizeOptionalId(legacyValueRaw) === null ||
        Boolean(migrated.migratedToInventoryId) ||
        Object.keys(existingMap).length > 0);
    const warnings = [...migrated.warnings];
    if (byKey.has(LEGACY_EXPORT_WAREHOUSE_KEY) && !canPruneLegacySetting) {
      warnings.push(
        'Legacy export warehouse fallback was not pruned because it could not be safely migrated to scoped settings.'
      );
    }

    let writesApplied = 0;
    if (!options.dryRun) {
      if (migrated.changed && (mapValueRaw !== null || migrated.migratedToInventoryId)) {
        await prisma.setting.upsert({
          where: { key: EXPORT_WAREHOUSE_MAP_KEY },
          create: { key: EXPORT_WAREHOUSE_MAP_KEY, value: migrated.nextMapValue },
          update: { value: migrated.nextMapValue },
        });
        writesApplied += 1;
      }
      if (canPruneLegacySetting) {
        await prisma.setting.deleteMany({
          where: { key: LEGACY_EXPORT_WAREHOUSE_KEY },
        });
        writesApplied += 1;
      }
    }

    return {
      provider: 'prisma',
      configured: true,
      changed: migrated.changed || canPruneLegacySetting,
      writesApplied,
      mapPresent: byKey.has(EXPORT_WAREHOUSE_MAP_KEY),
      legacySettingPresent: byKey.has(LEGACY_EXPORT_WAREHOUSE_KEY),
      defaultInventoryId: normalizeOptionalId(defaultInventoryIdRaw),
      migratedToInventoryId: migrated.migratedToInventoryId,
      legacyPayloadDetected: migrated.legacyPayloadDetected,
      scopedMappingCount: migrated.scopedMappingCount,
      warnings,
      error: null,
    };
  } catch (error) {
    return {
      provider: 'prisma',
      configured: true,
      changed: false,
      writesApplied: 0,
      mapPresent: false,
      legacySettingPresent: false,
      defaultInventoryId: null,
      migratedToInventoryId: null,
      legacyPayloadDetected: false,
      scopedMappingCount: 0,
      warnings: [],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await prisma?.$disconnect().catch(() => undefined);
    await pool?.end().catch(() => undefined);
  }
};

const matchesSettingKey = (doc: SettingDoc, key: string): boolean => {
  const keyField = toTrimmedString(doc.key);
  const idField = typeof doc._id === 'string' ? doc._id.trim() : String(doc._id ?? '').trim();
  return keyField === key || idField === key;
};

const readMongoSettingValue = (
  docs: SettingDoc[],
  key: string
): { present: boolean; value: string | null; warnings: string[] } => {
  const matching = docs.find((doc: SettingDoc) => matchesSettingKey(doc, key));
  if (!matching) {
    return {
      present: false,
      value: null,
      warnings: [],
    };
  }
  if (typeof matching.value === 'string') {
    return {
      present: true,
      value: matching.value,
      warnings: [],
    };
  }
  return {
    present: true,
    value: null,
    warnings: [`Setting "${key}" exists but value is not a string.`],
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
      mapPresent: false,
      legacySettingPresent: false,
      defaultInventoryId: null,
      migratedToInventoryId: null,
      legacyPayloadDetected: false,
      scopedMappingCount: 0,
      warnings: ['MONGODB_URI is not configured.'],
      error: null,
    };
  }

  const mongo = new MongoClient(uri);
  try {
    await mongo.connect();
    const db = mongo.db();
    const docs = await db
      .collection<SettingDoc>(SETTINGS_COLLECTION)
      .find({
        $or: [EXPORT_WAREHOUSE_MAP_KEY, LEGACY_EXPORT_WAREHOUSE_KEY, DEFAULT_INVENTORY_KEY].flatMap(
          (key: string) => [{ _id: key }, { key }]
        ),
      })
      .toArray();

    const map = readMongoSettingValue(docs, EXPORT_WAREHOUSE_MAP_KEY);
    const legacy = readMongoSettingValue(docs, LEGACY_EXPORT_WAREHOUSE_KEY);
    const defaultInventory = readMongoSettingValue(docs, DEFAULT_INVENTORY_KEY);

    const migrated = migratePayload({
      mapValueRaw: map.value,
      legacyWarehouseValueRaw: legacy.value,
      defaultInventoryIdRaw: defaultInventory.value,
    });
    const existingMap = parseExportWarehouseByInventoryMap(map.value);
    const canPruneLegacySetting =
      legacy.present &&
      (normalizeOptionalId(legacy.value) === null ||
        Boolean(migrated.migratedToInventoryId) ||
        Object.keys(existingMap).length > 0);
    const warnings = Array.from(
      new Set([
        ...migrated.warnings,
        ...map.warnings,
        ...legacy.warnings,
        ...defaultInventory.warnings,
        ...(legacy.present && !canPruneLegacySetting
          ? [
              'Legacy export warehouse fallback was not pruned because it could not be safely migrated to scoped settings.',
            ]
          : []),
      ])
    );

    let writesApplied = 0;
    if (!options.dryRun) {
      if (migrated.changed && (map.present || migrated.migratedToInventoryId)) {
        const now = new Date();
        await db.collection<SettingDoc>(SETTINGS_COLLECTION).updateMany(
          {
            $or: [{ _id: EXPORT_WAREHOUSE_MAP_KEY }, { key: EXPORT_WAREHOUSE_MAP_KEY }],
          },
          {
            $set: {
              key: EXPORT_WAREHOUSE_MAP_KEY,
              value: migrated.nextMapValue,
              updatedAt: now,
            },
            $setOnInsert: {
              _id: EXPORT_WAREHOUSE_MAP_KEY,
              createdAt: now,
            },
          },
          { upsert: true }
        );
        writesApplied += 1;
      }

      if (canPruneLegacySetting) {
        await db.collection<SettingDoc>(SETTINGS_COLLECTION).deleteMany({
          $or: [{ _id: LEGACY_EXPORT_WAREHOUSE_KEY }, { key: LEGACY_EXPORT_WAREHOUSE_KEY }],
        });
        writesApplied += 1;
      }
    }

    return {
      provider: 'mongodb',
      configured: true,
      changed: migrated.changed || canPruneLegacySetting,
      writesApplied,
      mapPresent: map.present,
      legacySettingPresent: legacy.present,
      defaultInventoryId: normalizeOptionalId(defaultInventory.value),
      migratedToInventoryId: migrated.migratedToInventoryId,
      legacyPayloadDetected: migrated.legacyPayloadDetected,
      scopedMappingCount: migrated.scopedMappingCount,
      warnings,
      error: null,
    };
  } catch (error) {
    return {
      provider: 'mongodb',
      configured: true,
      changed: false,
      writesApplied: 0,
      mapPresent: false,
      legacySettingPresent: false,
      defaultInventoryId: null,
      migratedToInventoryId: null,
      legacyPayloadDetected: false,
      scopedMappingCount: 0,
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
  console.log('[migrate-base-export-warehouse-preferences-v2] Summary');
  console.log(JSON.stringify(summary, null, 2));

  const hasError = summary.providers.some(
    (provider: ProviderSummary): boolean => provider.configured && Boolean(provider.error)
  );
  if (hasError) process.exitCode = 1;
};

void main();
