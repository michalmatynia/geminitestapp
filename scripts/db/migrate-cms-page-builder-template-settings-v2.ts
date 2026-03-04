import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { MongoClient, ObjectId, type Collection } from 'mongodb';
import { Pool } from 'pg';

import {
  normalizeGridTemplates,
} from '@/features/cms/components/page-builder/grid-templates';
import {
  normalizeSectionTemplates,
} from '@/features/cms/components/page-builder/section-template-store';
import { serializeSetting } from '@/shared/utils/settings-json';

type CliOptions = {
  dryRun: boolean;
};

type ProviderSummary = {
  provider: 'prisma' | 'mongodb';
  configured: boolean;
  changed: boolean;
  writesApplied: number;
  legacySectionPresent: boolean;
  legacyGridPresent: boolean;
  canonicalSectionPresent: boolean;
  canonicalGridPresent: boolean;
  sectionTemplateCount: number;
  gridTemplateCount: number;
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

type ParsedSetting = {
  present: boolean;
  value: string | null;
  warnings: string[];
};

type NormalizedTemplateSetting = {
  normalizedValue: string;
  count: number;
  warnings: string[];
};

type TemplateMigrationPlan = {
  nextValue: string | null;
  templateCount: number;
  shouldWriteCanonical: boolean;
  warnings: string[];
};

const SETTINGS_COLLECTION = 'settings';

const LEGACY_SECTION_TEMPLATE_KEY = 'cms_section_templates.v1';
const LEGACY_GRID_TEMPLATE_KEY = 'cms_grid_templates.v1';
const CANONICAL_SECTION_TEMPLATE_KEY = 'cms_section_templates.v2';
const CANONICAL_GRID_TEMPLATE_KEY = 'cms_grid_templates.v2';

const parseCliOptions = (argv: string[]): CliOptions => {
  const write = argv.some((arg: string) => arg === '--write' || arg === '--apply');
  return { dryRun: !write };
};

const toTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const dedupeWarnings = (warnings: string[]): string[] => Array.from(new Set(warnings.filter(Boolean)));

const parseJsonValue = (
  raw: string,
  label: string
): {
  value: unknown;
  warnings: string[];
} => {
  try {
    return {
      value: JSON.parse(raw),
      warnings: [],
    };
  } catch {
    return {
      value: [],
      warnings: [`Setting "${label}" contains invalid JSON and was reset to an empty list.`],
    };
  }
};

const normalizeSectionTemplateSettingValue = (
  raw: string,
  label: string
): NormalizedTemplateSetting => {
  const parsed = parseJsonValue(raw, label);
  const templates = normalizeSectionTemplates(parsed.value);
  return {
    normalizedValue: serializeSetting(templates),
    count: templates.length,
    warnings: parsed.warnings,
  };
};

const normalizeGridTemplateSettingValue = (
  raw: string,
  label: string
): NormalizedTemplateSetting => {
  const parsed = parseJsonValue(raw, label);
  const templates = normalizeGridTemplates(parsed.value);
  return {
    normalizedValue: serializeSetting(templates),
    count: templates.length,
    warnings: parsed.warnings,
  };
};

const buildTemplateMigrationPlan = (args: {
  canonicalRaw: string | null;
  legacyRaw: string | null;
  canonicalKey: string;
  legacyKey: string;
  normalize: (raw: string, label: string) => NormalizedTemplateSetting;
}): TemplateMigrationPlan => {
  const sourceRaw = args.canonicalRaw ?? args.legacyRaw;
  if (sourceRaw === null) {
    return {
      nextValue: null,
      templateCount: 0,
      shouldWriteCanonical: false,
      warnings: [],
    };
  }

  const normalized = args.normalize(sourceRaw, args.canonicalKey);
  const warnings = [...normalized.warnings];

  if (args.canonicalRaw === null && args.legacyRaw !== null) {
    warnings.push(
      `Migrating "${args.legacyKey}" payload into canonical "${args.canonicalKey}" setting.`
    );
  }

  return {
    nextValue: normalized.normalizedValue,
    templateCount: normalized.count,
    shouldWriteCanonical: args.canonicalRaw !== normalized.normalizedValue,
    warnings,
  };
};

const matchesSettingKey = (doc: SettingDoc, key: string): boolean => {
  const keyField = toTrimmedString(doc.key);
  const idField = typeof doc._id === 'string' ? doc._id.trim() : String(doc._id ?? '').trim();
  return keyField === key || idField === key;
};

const readMongoSetting = (docs: SettingDoc[], key: string): ParsedSetting => {
  const matching = docs.find((doc: SettingDoc): boolean => matchesSettingKey(doc, key));
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
    warnings: [`Setting "${key}" exists but does not store a string payload.`],
  };
};

const upsertMongoSetting = async (
  collection: Collection<SettingDoc>,
  key: string,
  value: string
): Promise<number> => {
  const now = new Date();
  const upsert = await collection.updateOne(
    { _id: key },
    {
      $set: {
        key,
        value,
        updatedAt: now,
      },
      $setOnInsert: {
        _id: key,
        createdAt: now,
      },
    },
    { upsert: true }
  );

  const duplicateDelete = await collection.deleteMany(
    {
      key,
      _id: { $ne: key },
    } as Record<string, unknown>
  );

  let writes = 0;
  if (upsert.modifiedCount > 0 || upsert.upsertedCount > 0) writes += 1;
  if (duplicateDelete.deletedCount > 0) writes += 1;
  return writes;
};

const migratePrisma = async (options: CliOptions): Promise<ProviderSummary> => {
  if (!process.env['DATABASE_URL']) {
    return {
      provider: 'prisma',
      configured: false,
      changed: false,
      writesApplied: 0,
      legacySectionPresent: false,
      legacyGridPresent: false,
      canonicalSectionPresent: false,
      canonicalGridPresent: false,
      sectionTemplateCount: 0,
      gridTemplateCount: 0,
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
          in: [
            LEGACY_SECTION_TEMPLATE_KEY,
            LEGACY_GRID_TEMPLATE_KEY,
            CANONICAL_SECTION_TEMPLATE_KEY,
            CANONICAL_GRID_TEMPLATE_KEY,
          ],
        },
      },
      select: {
        key: true,
        value: true,
      },
    });

    const byKey = new Map<string, string>();
    settings.forEach((setting) => {
      byKey.set(setting.key, setting.value);
    });

    const legacySectionRaw = byKey.get(LEGACY_SECTION_TEMPLATE_KEY) ?? null;
    const legacyGridRaw = byKey.get(LEGACY_GRID_TEMPLATE_KEY) ?? null;
    const canonicalSectionRaw = byKey.get(CANONICAL_SECTION_TEMPLATE_KEY) ?? null;
    const canonicalGridRaw = byKey.get(CANONICAL_GRID_TEMPLATE_KEY) ?? null;

    const sectionPlan = buildTemplateMigrationPlan({
      canonicalRaw: canonicalSectionRaw,
      legacyRaw: legacySectionRaw,
      canonicalKey: CANONICAL_SECTION_TEMPLATE_KEY,
      legacyKey: LEGACY_SECTION_TEMPLATE_KEY,
      normalize: normalizeSectionTemplateSettingValue,
    });
    const gridPlan = buildTemplateMigrationPlan({
      canonicalRaw: canonicalGridRaw,
      legacyRaw: legacyGridRaw,
      canonicalKey: CANONICAL_GRID_TEMPLATE_KEY,
      legacyKey: LEGACY_GRID_TEMPLATE_KEY,
      normalize: normalizeGridTemplateSettingValue,
    });

    const warnings = dedupeWarnings([...sectionPlan.warnings, ...gridPlan.warnings]);
    const legacySectionPresent = legacySectionRaw !== null;
    const legacyGridPresent = legacyGridRaw !== null;
    const canonicalSectionPresent = canonicalSectionRaw !== null;
    const canonicalGridPresent = canonicalGridRaw !== null;

    let writesApplied = 0;
    if (!options.dryRun) {
      if (sectionPlan.shouldWriteCanonical && sectionPlan.nextValue !== null) {
        await prisma.setting.upsert({
          where: { key: CANONICAL_SECTION_TEMPLATE_KEY },
          create: {
            key: CANONICAL_SECTION_TEMPLATE_KEY,
            value: sectionPlan.nextValue,
          },
          update: {
            value: sectionPlan.nextValue,
          },
        });
        writesApplied += 1;
      }

      if (gridPlan.shouldWriteCanonical && gridPlan.nextValue !== null) {
        await prisma.setting.upsert({
          where: { key: CANONICAL_GRID_TEMPLATE_KEY },
          create: {
            key: CANONICAL_GRID_TEMPLATE_KEY,
            value: gridPlan.nextValue,
          },
          update: {
            value: gridPlan.nextValue,
          },
        });
        writesApplied += 1;
      }

      const deletedLegacy = await prisma.setting.deleteMany({
        where: {
          key: {
            in: [LEGACY_SECTION_TEMPLATE_KEY, LEGACY_GRID_TEMPLATE_KEY],
          },
        },
      });
      if (deletedLegacy.count > 0) {
        writesApplied += 1;
      }
    }

    return {
      provider: 'prisma',
      configured: true,
      changed:
        sectionPlan.shouldWriteCanonical ||
        gridPlan.shouldWriteCanonical ||
        legacySectionPresent ||
        legacyGridPresent,
      writesApplied,
      legacySectionPresent,
      legacyGridPresent,
      canonicalSectionPresent,
      canonicalGridPresent,
      sectionTemplateCount: sectionPlan.templateCount,
      gridTemplateCount: gridPlan.templateCount,
      warnings,
      error: null,
    };
  } catch (error) {
    return {
      provider: 'prisma',
      configured: true,
      changed: false,
      writesApplied: 0,
      legacySectionPresent: false,
      legacyGridPresent: false,
      canonicalSectionPresent: false,
      canonicalGridPresent: false,
      sectionTemplateCount: 0,
      gridTemplateCount: 0,
      warnings: [],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await prisma?.$disconnect().catch(() => undefined);
    await pool?.end().catch(() => undefined);
  }
};

const migrateMongo = async (options: CliOptions): Promise<ProviderSummary> => {
  const uri = process.env['MONGODB_URI'];
  if (!uri) {
    return {
      provider: 'mongodb',
      configured: false,
      changed: false,
      writesApplied: 0,
      legacySectionPresent: false,
      legacyGridPresent: false,
      canonicalSectionPresent: false,
      canonicalGridPresent: false,
      sectionTemplateCount: 0,
      gridTemplateCount: 0,
      warnings: ['MONGODB_URI is not configured.'],
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
        $or: [
          LEGACY_SECTION_TEMPLATE_KEY,
          LEGACY_GRID_TEMPLATE_KEY,
          CANONICAL_SECTION_TEMPLATE_KEY,
          CANONICAL_GRID_TEMPLATE_KEY,
        ].flatMap((key) => [{ _id: key }, { key }]),
      })
      .toArray();

    const legacySection = readMongoSetting(docs, LEGACY_SECTION_TEMPLATE_KEY);
    const legacyGrid = readMongoSetting(docs, LEGACY_GRID_TEMPLATE_KEY);
    const canonicalSection = readMongoSetting(docs, CANONICAL_SECTION_TEMPLATE_KEY);
    const canonicalGrid = readMongoSetting(docs, CANONICAL_GRID_TEMPLATE_KEY);

    const sectionPlan = buildTemplateMigrationPlan({
      canonicalRaw: canonicalSection.value,
      legacyRaw: legacySection.value,
      canonicalKey: CANONICAL_SECTION_TEMPLATE_KEY,
      legacyKey: LEGACY_SECTION_TEMPLATE_KEY,
      normalize: normalizeSectionTemplateSettingValue,
    });
    const gridPlan = buildTemplateMigrationPlan({
      canonicalRaw: canonicalGrid.value,
      legacyRaw: legacyGrid.value,
      canonicalKey: CANONICAL_GRID_TEMPLATE_KEY,
      legacyKey: LEGACY_GRID_TEMPLATE_KEY,
      normalize: normalizeGridTemplateSettingValue,
    });

    const warnings = dedupeWarnings([
      ...legacySection.warnings,
      ...legacyGrid.warnings,
      ...canonicalSection.warnings,
      ...canonicalGrid.warnings,
      ...sectionPlan.warnings,
      ...gridPlan.warnings,
    ]);

    let writesApplied = 0;
    if (!options.dryRun) {
      if (sectionPlan.shouldWriteCanonical && sectionPlan.nextValue !== null) {
        writesApplied += await upsertMongoSetting(
          settingsCollection,
          CANONICAL_SECTION_TEMPLATE_KEY,
          sectionPlan.nextValue
        );
      }

      if (gridPlan.shouldWriteCanonical && gridPlan.nextValue !== null) {
        writesApplied += await upsertMongoSetting(
          settingsCollection,
          CANONICAL_GRID_TEMPLATE_KEY,
          gridPlan.nextValue
        );
      }

      const deletedLegacy = await settingsCollection.deleteMany({
        $or: [
          { _id: LEGACY_SECTION_TEMPLATE_KEY },
          { key: LEGACY_SECTION_TEMPLATE_KEY },
          { _id: LEGACY_GRID_TEMPLATE_KEY },
          { key: LEGACY_GRID_TEMPLATE_KEY },
        ],
      });
      if (deletedLegacy.deletedCount > 0) {
        writesApplied += 1;
      }
    }

    return {
      provider: 'mongodb',
      configured: true,
      changed:
        sectionPlan.shouldWriteCanonical ||
        gridPlan.shouldWriteCanonical ||
        legacySection.present ||
        legacyGrid.present,
      writesApplied,
      legacySectionPresent: legacySection.present,
      legacyGridPresent: legacyGrid.present,
      canonicalSectionPresent: canonicalSection.present,
      canonicalGridPresent: canonicalGrid.present,
      sectionTemplateCount: sectionPlan.templateCount,
      gridTemplateCount: gridPlan.templateCount,
      warnings,
      error: null,
    };
  } catch (error) {
    return {
      provider: 'mongodb',
      configured: true,
      changed: false,
      writesApplied: 0,
      legacySectionPresent: false,
      legacyGridPresent: false,
      canonicalSectionPresent: false,
      canonicalGridPresent: false,
      sectionTemplateCount: 0,
      gridTemplateCount: 0,
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

  console.log('[migrate-cms-page-builder-template-settings-v2] Summary');
  console.log(JSON.stringify(summary, null, 2));

  const hasError = summary.providers.some(
    (provider: ProviderSummary): boolean => provider.configured && Boolean(provider.error)
  );
  if (hasError) process.exitCode = 1;
};

void main();
