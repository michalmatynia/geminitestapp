import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { MongoClient, ObjectId } from 'mongodb';
import { Pool } from 'pg';

import {
  stringifyScopedActiveTemplateMap,
  type ScopedActiveTemplateMap,
} from '@/features/integrations/services/active-template-preference';

type CliOptions = {
  dryRun: boolean;
};

const ACTIVE_TEMPLATE_SCOPE_SEPARATOR = '::';
const LEGACY_ACTIVE_TEMPLATE_SCOPE_KEY = '__global__';
const SETTINGS_COLLECTION = 'settings';
const ACTIVE_TEMPLATE_SETTING_KEYS = [
  'base_export_active_template_id',
  'base_import_active_template_id',
] as const;

type ActiveTemplateSettingKey = (typeof ACTIVE_TEMPLATE_SETTING_KEYS)[number];

type SettingMigrationSummary = {
  key: ActiveTemplateSettingKey;
  present: boolean;
  changed: boolean;
  writesApplied: number;
  legacyPayloadDetected: boolean;
  defaultTemplateId: string | null;
  scopedEntryCount: number;
  warnings: string[];
  error: string | null;
};

type ProviderSummary = {
  provider: 'prisma' | 'mongodb';
  configured: boolean;
  changed: boolean;
  writesApplied: number;
  settings: SettingMigrationSummary[];
  error: string | null;
};

type MigrationSummary = {
  mode: 'dry-run' | 'write';
  providers: ProviderSummary[];
};

type ParsedLegacyMap = {
  map: ScopedActiveTemplateMap;
  legacyPayloadDetected: boolean;
  warnings: string[];
};

type PreparedSettingMigration = {
  summary: SettingMigrationSummary;
  nextValue: string | null;
};

type SettingDoc = {
  _id?: string | ObjectId;
  key?: unknown;
  value?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const parseCliOptions = (argv: string[]): CliOptions => {
  const write = argv.some((arg: string) => arg === '--write' || arg === '--apply');
  return { dryRun: !write };
};

const toTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const normalizeOptionalId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const parseLegacyCompatibleActiveTemplateMap = (raw: string): ParsedLegacyMap => {
  const warnings: string[] = [];
  const trimmed = raw.trim();
  let defaultTemplateId: string | null = null;
  const byScope: Record<string, string> = {};
  let legacyPayloadDetected = false;

  if (!trimmed) {
    return {
      map: { defaultTemplateId, byScope },
      legacyPayloadDetected: false,
      warnings,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const legacyTemplateId = normalizeOptionalId(trimmed);
    if (legacyTemplateId) {
      defaultTemplateId = legacyTemplateId;
      legacyPayloadDetected = true;
      warnings.push('Converted plain string payload to canonical scoped map.');
    } else {
      legacyPayloadDetected = true;
      warnings.push('Dropped non-JSON payload and reset to empty canonical scoped map.');
    }
    return {
      map: { defaultTemplateId, byScope },
      legacyPayloadDetected,
      warnings,
    };
  }

  if (typeof parsed === 'string') {
    const legacyTemplateId = normalizeOptionalId(parsed);
    if (legacyTemplateId) {
      defaultTemplateId = legacyTemplateId;
      legacyPayloadDetected = true;
      warnings.push('Converted JSON string payload to canonical scoped map.');
    }
    return {
      map: { defaultTemplateId, byScope },
      legacyPayloadDetected,
      warnings,
    };
  }

  if (!isRecord(parsed)) {
    legacyPayloadDetected = true;
    warnings.push('Dropped unsupported JSON payload and reset to empty canonical scoped map.');
    return {
      map: { defaultTemplateId, byScope },
      legacyPayloadDetected,
      warnings,
    };
  }

  const canonicalDefault = normalizeOptionalId(parsed['defaultTemplateId']);
  if (canonicalDefault) defaultTemplateId = canonicalDefault;

  const legacyDefault = normalizeOptionalId(parsed['templateId']);
  if (!defaultTemplateId && legacyDefault) {
    defaultTemplateId = legacyDefault;
    legacyPayloadDetected = true;
  }

  const byScopeRaw = parsed['byScope'];
  if (byScopeRaw != null && !isRecord(byScopeRaw)) {
    legacyPayloadDetected = true;
    warnings.push('Dropped non-object byScope payload.');
  }
  if (isRecord(byScopeRaw)) {
    Object.entries(byScopeRaw).forEach(([scopeKey, rawTemplateId]: [string, unknown]) => {
      const normalizedScopeKey = scopeKey.trim();
      const normalizedTemplateId = normalizeOptionalId(rawTemplateId);
      if (!normalizedScopeKey || !normalizedTemplateId) return;
      if (normalizedScopeKey === LEGACY_ACTIVE_TEMPLATE_SCOPE_KEY) {
        if (!defaultTemplateId) defaultTemplateId = normalizedTemplateId;
        legacyPayloadDetected = true;
        return;
      }
      if (!normalizedScopeKey.includes(ACTIVE_TEMPLATE_SCOPE_SEPARATOR)) {
        legacyPayloadDetected = true;
        warnings.push(`Dropped invalid byScope key "${normalizedScopeKey}".`);
        return;
      }
      byScope[normalizedScopeKey] = normalizedTemplateId;
    });
  }

  Object.entries(parsed).forEach(([key, rawTemplateId]: [string, unknown]) => {
    if (key === 'defaultTemplateId' || key === 'templateId' || key === 'byScope') return;
    const normalizedScopeKey = key.trim();
    const normalizedTemplateId = normalizeOptionalId(rawTemplateId);
    if (!normalizedScopeKey || !normalizedTemplateId) return;
    if (normalizedScopeKey === LEGACY_ACTIVE_TEMPLATE_SCOPE_KEY) {
      if (!defaultTemplateId) defaultTemplateId = normalizedTemplateId;
      legacyPayloadDetected = true;
      return;
    }
    if (normalizedScopeKey.includes(ACTIVE_TEMPLATE_SCOPE_SEPARATOR)) {
      byScope[normalizedScopeKey] = normalizedTemplateId;
      legacyPayloadDetected = true;
    }
  });

  return {
    map: { defaultTemplateId, byScope },
    legacyPayloadDetected,
    warnings,
  };
};

const prepareSettingMigration = (
  key: ActiveTemplateSettingKey,
  rawValue: string | null
): PreparedSettingMigration => {
  if (rawValue == null) {
    return {
      nextValue: null,
      summary: {
        key,
        present: false,
        changed: false,
        writesApplied: 0,
        legacyPayloadDetected: false,
        defaultTemplateId: null,
        scopedEntryCount: 0,
        warnings: ['Setting not found.'],
        error: null,
      },
    };
  }

  const parsed = parseLegacyCompatibleActiveTemplateMap(rawValue);
  const nextValue = stringifyScopedActiveTemplateMap(parsed.map);
  return {
    nextValue,
    summary: {
      key,
      present: true,
      changed: rawValue !== nextValue,
      writesApplied: 0,
      legacyPayloadDetected: parsed.legacyPayloadDetected,
      defaultTemplateId: parsed.map.defaultTemplateId,
      scopedEntryCount: Object.keys(parsed.map.byScope).length,
      warnings: parsed.warnings,
      error: null,
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
      settings: ACTIVE_TEMPLATE_SETTING_KEYS.map(
        (key: ActiveTemplateSettingKey): SettingMigrationSummary => ({
          key,
          present: false,
          changed: false,
          writesApplied: 0,
          legacyPayloadDetected: false,
          defaultTemplateId: null,
          scopedEntryCount: 0,
          warnings: ['DATABASE_URL is not configured.'],
          error: null,
        })
      ),
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
      where: { key: { in: [...ACTIVE_TEMPLATE_SETTING_KEYS] } },
      select: { key: true, value: true },
    });
    const valuesByKey = new Map<string, string>();
    settings.forEach((setting) => {
      valuesByKey.set(setting.key, setting.value);
    });

    const summaries: SettingMigrationSummary[] = [];
    for (const key of ACTIVE_TEMPLATE_SETTING_KEYS) {
      try {
        const prepared = prepareSettingMigration(key, valuesByKey.get(key) ?? null);
        if (prepared.summary.present && prepared.summary.changed && !options.dryRun && prepared.nextValue) {
          await prisma.setting.upsert({
            where: { key },
            create: { key, value: prepared.nextValue },
            update: { value: prepared.nextValue },
          });
          prepared.summary.writesApplied = 1;
        }
        summaries.push(prepared.summary);
      } catch (error) {
        summaries.push({
          key,
          present: valuesByKey.has(key),
          changed: false,
          writesApplied: 0,
          legacyPayloadDetected: false,
          defaultTemplateId: null,
          scopedEntryCount: 0,
          warnings: [],
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      provider: 'prisma',
      configured: true,
      changed: summaries.some((entry: SettingMigrationSummary) => entry.changed),
      writesApplied: summaries.reduce(
        (acc: number, entry: SettingMigrationSummary) => acc + entry.writesApplied,
        0
      ),
      settings: summaries,
      error: null,
    };
  } catch (error) {
    return {
      provider: 'prisma',
      configured: true,
      changed: false,
      writesApplied: 0,
      settings: ACTIVE_TEMPLATE_SETTING_KEYS.map(
        (key: ActiveTemplateSettingKey): SettingMigrationSummary => ({
          key,
          present: false,
          changed: false,
          writesApplied: 0,
          legacyPayloadDetected: false,
          defaultTemplateId: null,
          scopedEntryCount: 0,
          warnings: [],
          error: null,
        })
      ),
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await prisma?.$disconnect().catch(() => undefined);
    await pool?.end().catch(() => undefined);
  }
};

const matchesSettingKey = (doc: SettingDoc, key: ActiveTemplateSettingKey): boolean => {
  const keyField = toTrimmedString(doc.key);
  const idField = typeof doc._id === 'string' ? doc._id.trim() : String(doc._id ?? '').trim();
  return keyField === key || idField === key;
};

const readMongoSettingValue = (
  docs: SettingDoc[],
  key: ActiveTemplateSettingKey
): { value: string | null; warnings: string[] } => {
  const matching = docs.find((doc: SettingDoc) => matchesSettingKey(doc, key));
  if (!matching) return { value: null, warnings: ['Setting not found.'] };
  if (typeof matching.value === 'string') return { value: matching.value, warnings: [] };
  return { value: null, warnings: ['Setting exists but value is not a string.'] };
};

const migrateMongo = async (options: CliOptions): Promise<ProviderSummary> => {
  const uri = process.env['MONGODB_URI'];
  if (!uri) {
    return {
      provider: 'mongodb',
      configured: false,
      changed: false,
      writesApplied: 0,
      settings: ACTIVE_TEMPLATE_SETTING_KEYS.map(
        (key: ActiveTemplateSettingKey): SettingMigrationSummary => ({
          key,
          present: false,
          changed: false,
          writesApplied: 0,
          legacyPayloadDetected: false,
          defaultTemplateId: null,
          scopedEntryCount: 0,
          warnings: ['MONGODB_URI is not configured.'],
          error: null,
        })
      ),
      error: null,
    };
  }

  const mongo = new MongoClient(uri);
  try {
    await mongo.connect();
    const db = mongo.db();
    const settingsCollection = db.collection<SettingDoc>(SETTINGS_COLLECTION);
    const docs = await settingsCollection
      .find({
        $or: ACTIVE_TEMPLATE_SETTING_KEYS.flatMap((key: ActiveTemplateSettingKey) => [
          { _id: key },
          { key },
        ]),
      })
      .toArray();

    const summaries: SettingMigrationSummary[] = [];
    for (const key of ACTIVE_TEMPLATE_SETTING_KEYS) {
      try {
        const read = readMongoSettingValue(docs, key);
        const prepared = prepareSettingMigration(key, read.value);
        if (read.warnings.length > 0) {
          prepared.summary.warnings = [...prepared.summary.warnings, ...read.warnings];
        }
        if (prepared.summary.present && prepared.summary.changed && !options.dryRun && prepared.nextValue) {
          const now = new Date();
          await settingsCollection.updateMany(
            {
              $or: [{ _id: key }, { key }],
            },
            {
              $set: {
                key,
                value: prepared.nextValue,
                updatedAt: now,
              },
              $setOnInsert: {
                _id: key,
                createdAt: now,
              },
            },
            { upsert: true }
          );
          prepared.summary.writesApplied = 1;
        }
        summaries.push(prepared.summary);
      } catch (error) {
        summaries.push({
          key,
          present: false,
          changed: false,
          writesApplied: 0,
          legacyPayloadDetected: false,
          defaultTemplateId: null,
          scopedEntryCount: 0,
          warnings: [],
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      provider: 'mongodb',
      configured: true,
      changed: summaries.some((entry: SettingMigrationSummary) => entry.changed),
      writesApplied: summaries.reduce(
        (acc: number, entry: SettingMigrationSummary) => acc + entry.writesApplied,
        0
      ),
      settings: summaries,
      error: null,
    };
  } catch (error) {
    return {
      provider: 'mongodb',
      configured: true,
      changed: false,
      writesApplied: 0,
      settings: ACTIVE_TEMPLATE_SETTING_KEYS.map(
        (key: ActiveTemplateSettingKey): SettingMigrationSummary => ({
          key,
          present: false,
          changed: false,
          writesApplied: 0,
          legacyPayloadDetected: false,
          defaultTemplateId: null,
          scopedEntryCount: 0,
          warnings: [],
          error: null,
        })
      ),
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

  console.log('[migrate-base-active-template-preferences-v2] Summary');
  console.log(JSON.stringify(summary, null, 2));

  const hasError = summary.providers.some(
    (provider: ProviderSummary): boolean =>
      (provider.configured && Boolean(provider.error)) ||
      provider.settings.some((setting: SettingMigrationSummary): boolean => Boolean(setting.error))
  );
  if (hasError) {
    process.exitCode = 1;
  }
};

void main();
