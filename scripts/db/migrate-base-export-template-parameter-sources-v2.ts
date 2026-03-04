import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { MongoClient, ObjectId } from 'mongodb';
import { Pool } from 'pg';

type CliOptions = {
  dryRun: boolean;
};

type ParameterNames = {
  name_en: string | null;
  name_pl: string | null;
  name_de: string | null;
};

type ProviderSummary = {
  provider: 'prisma' | 'mongodb';
  configured: boolean;
  changed: boolean;
  writesApplied: number;
  templatesScanned: number;
  legacyMappingsFound: number;
  mappingsMigrated: number;
  unresolvedParameterIds: string[];
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

const SETTINGS_KEY = 'base_export_templates';
const SETTINGS_COLLECTION = 'settings';
const PARAMETERS_COLLECTION = 'product_parameters';
const LEGACY_SOURCE_PREFIX = 'parameter:';

const toTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const parseCliOptions = (argv: string[]): CliOptions => {
  const write = argv.some((arg: string) => arg === '--write' || arg === '--apply');
  return { dryRun: !write };
};

const parseLegacyParameterSource = (
  sourceKey: string
): { parameterId: string; languageCode: string | null } | null => {
  const trimmed = sourceKey.trim();
  if (!trimmed.toLowerCase().startsWith(LEGACY_SOURCE_PREFIX)) return null;
  const payload = trimmed.slice(LEGACY_SOURCE_PREFIX.length).trim();
  if (!payload) return null;

  const separatorIndex = payload.indexOf('|');
  if (separatorIndex < 0) {
    return { parameterId: payload, languageCode: null };
  }

  const parameterId = payload.slice(0, separatorIndex).trim();
  if (!parameterId) return null;
  const languageCodeRaw = payload.slice(separatorIndex + 1).trim().toLowerCase();
  return {
    parameterId,
    languageCode: languageCodeRaw || null,
  };
};

const pickParameterName = (
  names: ParameterNames | undefined,
  parameterId: string,
  languageCode: string | null
): string => {
  if (!names) return parameterId;
  if (languageCode === 'pl' && names.name_pl) return names.name_pl;
  if (languageCode === 'de' && names.name_de) return names.name_de;
  return names.name_en || names.name_pl || names.name_de || parameterId;
};

const migrateTemplatesPayload = (
  raw: string,
  parameterNamesById: Map<string, ParameterNames>
): {
  nextValue: string | null;
  changed: boolean;
  templatesScanned: number;
  legacyMappingsFound: number;
  mappingsMigrated: number;
  unresolvedParameterIds: Set<string>;
  warnings: string[];
} => {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    return {
      nextValue: null,
      changed: false,
      templatesScanned: 0,
      legacyMappingsFound: 0,
      mappingsMigrated: 0,
      unresolvedParameterIds: new Set<string>(),
      warnings: ['Setting value is not an array; skipping migration.'],
    };
  }

  let changed = false;
  let legacyMappingsFound = 0;
  let mappingsMigrated = 0;
  const unresolvedParameterIds = new Set<string>();

  const nextTemplates = parsed.map((template: unknown) => {
    if (!template || typeof template !== 'object' || Array.isArray(template)) return template;
    const record = template as Record<string, unknown>;
    const mappingsRaw = record['mappings'];
    if (!Array.isArray(mappingsRaw)) return template;

    const nextMappings = mappingsRaw.map((mapping: unknown) => {
      if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) return mapping;
      const mappingRecord = mapping as Record<string, unknown>;
      const sourceKey = toTrimmedString(mappingRecord['sourceKey']);
      const legacy = parseLegacyParameterSource(sourceKey);
      if (!legacy) return mapping;

      legacyMappingsFound += 1;
      const lookupKey = legacy.parameterId.toLowerCase();
      const names = parameterNamesById.get(lookupKey);
      if (!names) {
        unresolvedParameterIds.add(legacy.parameterId);
      }
      const parameterName = pickParameterName(names, legacy.parameterId, legacy.languageCode);
      const suffix = legacy.languageCode ? `|${legacy.languageCode}` : '';
      const nextSourceKey = `text_fields.features${suffix}.${parameterName}`;
      if (nextSourceKey === sourceKey) return mapping;

      changed = true;
      mappingsMigrated += 1;
      return {
        ...mappingRecord,
        sourceKey: nextSourceKey,
      };
    });

    if (!changed && nextMappings === mappingsRaw) return template;
    return {
      ...record,
      mappings: nextMappings,
    };
  });

  return {
    nextValue: changed ? JSON.stringify(nextTemplates) : raw,
    changed,
    templatesScanned: parsed.length,
    legacyMappingsFound,
    mappingsMigrated,
    unresolvedParameterIds,
    warnings: [],
  };
};

const readPrismaParameterNames = async (prisma: PrismaClient): Promise<Map<string, ParameterNames>> => {
  const rows = await prisma.productParameter.findMany({
    select: {
      id: true,
      name_en: true,
      name_pl: true,
      name_de: true,
    },
  });
  const map = new Map<string, ParameterNames>();
  rows.forEach((row) => {
    map.set(row.id.toLowerCase(), {
      name_en: toTrimmedString(row.name_en) || null,
      name_pl: toTrimmedString(row.name_pl) || null,
      name_de: toTrimmedString(row.name_de) || null,
    });
  });
  return map;
};

const migratePrisma = async (options: CliOptions): Promise<ProviderSummary> => {
  if (!process.env['DATABASE_URL']) {
    return {
      provider: 'prisma',
      configured: false,
      changed: false,
      writesApplied: 0,
      templatesScanned: 0,
      legacyMappingsFound: 0,
      mappingsMigrated: 0,
      unresolvedParameterIds: [],
      warnings: [],
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
    const [setting, parameterNamesById] = await Promise.all([
      prisma.setting.findUnique({
        where: { key: SETTINGS_KEY },
        select: { value: true },
      }),
      readPrismaParameterNames(prisma),
    ]);
    const raw = setting?.value ?? null;
    if (!raw || !raw.trim()) {
      return {
        provider: 'prisma',
        configured: true,
        changed: false,
        writesApplied: 0,
        templatesScanned: 0,
        legacyMappingsFound: 0,
        mappingsMigrated: 0,
        unresolvedParameterIds: [],
        warnings: ['No base export templates setting found.'],
        error: null,
      };
    }

    const migrated = migrateTemplatesPayload(raw, parameterNamesById);
    if (!migrated.nextValue) {
      return {
        provider: 'prisma',
        configured: true,
        changed: false,
        writesApplied: 0,
        templatesScanned: migrated.templatesScanned,
        legacyMappingsFound: migrated.legacyMappingsFound,
        mappingsMigrated: migrated.mappingsMigrated,
        unresolvedParameterIds: Array.from(migrated.unresolvedParameterIds).sort(),
        warnings: migrated.warnings,
        error: null,
      };
    }

    let writesApplied = 0;
    if (migrated.changed && !options.dryRun) {
      await prisma.setting.upsert({
        where: { key: SETTINGS_KEY },
        create: { key: SETTINGS_KEY, value: migrated.nextValue },
        update: { value: migrated.nextValue },
      });
      writesApplied = 1;
    }

    return {
      provider: 'prisma',
      configured: true,
      changed: migrated.changed,
      writesApplied,
      templatesScanned: migrated.templatesScanned,
      legacyMappingsFound: migrated.legacyMappingsFound,
      mappingsMigrated: migrated.mappingsMigrated,
      unresolvedParameterIds: Array.from(migrated.unresolvedParameterIds).sort(),
      warnings: migrated.warnings,
      error: null,
    };
  } catch (error) {
    return {
      provider: 'prisma',
      configured: true,
      changed: false,
      writesApplied: 0,
      templatesScanned: 0,
      legacyMappingsFound: 0,
      mappingsMigrated: 0,
      unresolvedParameterIds: [],
      warnings: [],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await prisma?.$disconnect().catch(() => undefined);
    await pool?.end().catch(() => undefined);
  }
};

const readMongoParameterNames = async (mongo: MongoClient): Promise<Map<string, ParameterNames>> => {
  const db = mongo.db();
  const rows = await db
    .collection<{
      _id: ObjectId | string;
      id?: string;
      name_en?: string;
      name_pl?: string | null;
      name_de?: string | null;
    }>(PARAMETERS_COLLECTION)
    .find(
      {},
      {
        projection: {
          _id: 1,
          id: 1,
          name_en: 1,
          name_pl: 1,
          name_de: 1,
        },
      }
    )
    .toArray();

  const map = new Map<string, ParameterNames>();
  rows.forEach((row) => {
    const payload: ParameterNames = {
      name_en: toTrimmedString(row.name_en) || null,
      name_pl: toTrimmedString(row.name_pl) || null,
      name_de: toTrimmedString(row.name_de) || null,
    };
    const id = toTrimmedString(row.id);
    const objectId = String(row._id);
    if (id) map.set(id.toLowerCase(), payload);
    if (objectId) map.set(objectId.toLowerCase(), payload);
  });

  return map;
};

const migrateMongo = async (options: CliOptions): Promise<ProviderSummary> => {
  const uri = process.env['MONGODB_URI'];
  if (!uri) {
    return {
      provider: 'mongodb',
      configured: false,
      changed: false,
      writesApplied: 0,
      templatesScanned: 0,
      legacyMappingsFound: 0,
      mappingsMigrated: 0,
      unresolvedParameterIds: [],
      warnings: [],
      error: null,
    };
  }

  const mongo = new MongoClient(uri);
  try {
    await mongo.connect();
    const db = mongo.db();
    const [settingDoc, parameterNamesById] = await Promise.all([
      db.collection<SettingDoc>(SETTINGS_COLLECTION).findOne({
        $or: [{ _id: SETTINGS_KEY }, { key: SETTINGS_KEY }],
      }),
      readMongoParameterNames(mongo),
    ]);
    const raw = toTrimmedString(settingDoc?.['value']);
    if (!raw) {
      return {
        provider: 'mongodb',
        configured: true,
        changed: false,
        writesApplied: 0,
        templatesScanned: 0,
        legacyMappingsFound: 0,
        mappingsMigrated: 0,
        unresolvedParameterIds: [],
        warnings: ['No base export templates setting found.'],
        error: null,
      };
    }

    const migrated = migrateTemplatesPayload(raw, parameterNamesById);
    if (!migrated.nextValue) {
      return {
        provider: 'mongodb',
        configured: true,
        changed: false,
        writesApplied: 0,
        templatesScanned: migrated.templatesScanned,
        legacyMappingsFound: migrated.legacyMappingsFound,
        mappingsMigrated: migrated.mappingsMigrated,
        unresolvedParameterIds: Array.from(migrated.unresolvedParameterIds).sort(),
        warnings: migrated.warnings,
        error: null,
      };
    }

    let writesApplied = 0;
    if (migrated.changed && !options.dryRun) {
      const now = new Date();
      await db.collection<SettingDoc>(SETTINGS_COLLECTION).updateMany(
        {
          $or: [{ _id: SETTINGS_KEY }, { key: SETTINGS_KEY }],
        },
        {
          $set: {
            key: SETTINGS_KEY,
            value: migrated.nextValue,
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
      changed: migrated.changed,
      writesApplied,
      templatesScanned: migrated.templatesScanned,
      legacyMappingsFound: migrated.legacyMappingsFound,
      mappingsMigrated: migrated.mappingsMigrated,
      unresolvedParameterIds: Array.from(migrated.unresolvedParameterIds).sort(),
      warnings: migrated.warnings,
      error: null,
    };
  } catch (error) {
    return {
      provider: 'mongodb',
      configured: true,
      changed: false,
      writesApplied: 0,
      templatesScanned: 0,
      legacyMappingsFound: 0,
      mappingsMigrated: 0,
      unresolvedParameterIds: [],
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

  console.log('[migrate-base-export-template-parameter-sources-v2] Summary');
  console.log(JSON.stringify(summary, null, 2));

  const failedProviders = summary.providers.filter(
    (provider) => provider.configured && typeof provider.error === 'string' && provider.error.length > 0
  );
  if (failedProviders.length > 0) {
    process.exitCode = 1;
  }
};

void main();
