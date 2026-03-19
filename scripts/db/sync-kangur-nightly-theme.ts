import 'dotenv/config';

import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import type { MongoPersistedStringSettingRecord } from '@/shared/contracts/settings';
import { KANGUR_NIGHTLY_THEME_SETTINGS_KEY } from '@/shared/contracts/kangur';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';
import { decodeSettingValue, encodeSettingValue } from '@/shared/lib/settings/settings-compression';
import { serializeSetting } from '@/shared/utils/settings-json';
import {
  KANGUR_NIGHTLY_AURORA_THEME,
  KANGUR_NIGHTLY_NOCTURNE_THEME,
  KANGUR_NIGHTLY_THEME,
  KANGUR_THEME_CATALOG_KEY,
  type KangurThemeCatalogEntry,
} from '@/features/kangur/theme-settings';

type CliOptions = {
  dryRun: boolean;
  forceCatalog: boolean;
};

type SettingDoc = MongoPersistedStringSettingRecord<string, Date>;

type SyncResult = {
  target: 'nightly-slot' | 'theme-catalog';
  status: 'create' | 'update' | 'unchanged';
  key: string;
};

const KANGUR_SETTINGS_COLLECTION = 'kangur_settings';
const NIGHTLY_AURORA_ID = 'kangur-nightly-aurora';
const NIGHTLY_AURORA_NAME = 'Nightly Aurora';
const NIGHTLY_NOCTURNE_ID = 'kangur-nightly-nocturne';
const NIGHTLY_NOCTURNE_NAME = 'Nightly Nocturne';

type CatalogThemeDefinition = {
  id: string;
  name: string;
  settings: ThemeSettings;
};

const CATALOG_THEMES: CatalogThemeDefinition[] = [
  {
    id: NIGHTLY_AURORA_ID,
    name: NIGHTLY_AURORA_NAME,
    settings: KANGUR_NIGHTLY_AURORA_THEME as ThemeSettings,
  },
  {
    id: NIGHTLY_NOCTURNE_ID,
    name: NIGHTLY_NOCTURNE_NAME,
    settings: KANGUR_NIGHTLY_NOCTURNE_THEME as ThemeSettings,
  },
];

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
    forceCatalog: true,
  };

  argv.forEach((arg) => {
    if (arg === '--write') {
      options.dryRun = false;
      return;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      return;
    }
    if (arg === '--no-force-catalog') {
      options.forceCatalog = false;
    }
  });

  return options;
};

const determineStatus = (current: string | null, nextValue: string): SyncResult['status'] => {
  if (current === nextValue) return 'unchanged';
  return current ? 'update' : 'create';
};

const resolveStoredValue = (doc: SettingDoc | null | undefined, key: string): string | null => {
  if (!doc || typeof doc.value !== 'string') return null;
  return decodeSettingValue(key, doc.value);
};

const parseCatalog = (raw: string | null): KangurThemeCatalogEntry[] => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is KangurThemeCatalogEntry =>
        entry !== null &&
        typeof entry === 'object' &&
        typeof (entry as Record<string, unknown>)['id'] === 'string' &&
        typeof (entry as Record<string, unknown>)['name'] === 'string'
    );
  } catch {
    return [];
  }
};

const buildCatalogEntry = (
  definition: CatalogThemeDefinition,
  createdAt: string,
  updatedAt: string
): KangurThemeCatalogEntry => ({
  id: definition.id,
  name: definition.name,
  settings: definition.settings,
  createdAt,
  updatedAt,
});

const isCatalogEntryCurrent = (
  entry: KangurThemeCatalogEntry | undefined,
  definition: CatalogThemeDefinition
): boolean => {
  if (!entry) return false;
  if (entry.name !== definition.name) return false;
  return serializeSetting(entry.settings) === serializeSetting(definition.settings);
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is required to sync the Kangur nightly theme.');
  }

  const mongoClient = await getMongoClient();
  const results: SyncResult[] = [];

  try {
    const db = await getMongoDb();
    const collection = db.collection<SettingDoc>(KANGUR_SETTINGS_COLLECTION);
    const now = new Date();
    const nowIso = new Date().toISOString();

    const nextNightlyValue = serializeSetting(KANGUR_NIGHTLY_THEME);
    const currentNightlyDoc = await collection.findOne(
      { $or: [{ _id: KANGUR_NIGHTLY_THEME_SETTINGS_KEY }, { key: KANGUR_NIGHTLY_THEME_SETTINGS_KEY }] },
      { projection: { _id: 1, key: 1, value: 1 } }
    );
    const currentNightlyValue = resolveStoredValue(
      currentNightlyDoc,
      KANGUR_NIGHTLY_THEME_SETTINGS_KEY
    );
    const nightlyStatus = determineStatus(currentNightlyValue, nextNightlyValue);
    results.push({
      target: 'nightly-slot',
      status: nightlyStatus,
      key: KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
    });

    if (!options.dryRun && nightlyStatus !== 'unchanged') {
      await collection.updateOne(
        { $or: [{ _id: KANGUR_NIGHTLY_THEME_SETTINGS_KEY }, { key: KANGUR_NIGHTLY_THEME_SETTINGS_KEY }] },
        {
          $set: {
            key: KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
            value: encodeSettingValue(KANGUR_NIGHTLY_THEME_SETTINGS_KEY, nextNightlyValue),
            updatedAt: now,
          },
          $setOnInsert: {
            _id: KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
            createdAt: now,
          },
        },
        { upsert: true }
      );
    }

    const currentCatalogDoc = await collection.findOne(
      { $or: [{ _id: KANGUR_THEME_CATALOG_KEY }, { key: KANGUR_THEME_CATALOG_KEY }] },
      { projection: { _id: 1, key: 1, value: 1 } }
    );
    const currentCatalogValue = resolveStoredValue(currentCatalogDoc, KANGUR_THEME_CATALOG_KEY);
    const currentCatalog = parseCatalog(currentCatalogValue);

    const nextCatalog = (() => {
      const next = [...currentCatalog];
      CATALOG_THEMES.forEach((definition) => {
        const existingIndex = next.findIndex((theme) => theme.id === definition.id);
        const existingEntry = next[existingIndex];
        if (existingIndex === -1) {
          next.push(buildCatalogEntry(definition, nowIso, nowIso));
          return;
        }
        if (options.forceCatalog && !isCatalogEntryCurrent(existingEntry, definition)) {
          next[existingIndex] = buildCatalogEntry(
            definition,
            existingEntry?.createdAt ?? nowIso,
            nowIso
          );
        }
      });
      return next;
    })();

    const nextCatalogValue = serializeSetting(nextCatalog);
    const catalogStatus = determineStatus(currentCatalogValue, nextCatalogValue);
    results.push({
      target: 'theme-catalog',
      status: catalogStatus,
      key: KANGUR_THEME_CATALOG_KEY,
    });

    if (!options.dryRun && catalogStatus !== 'unchanged') {
      await collection.updateOne(
        { $or: [{ _id: KANGUR_THEME_CATALOG_KEY }, { key: KANGUR_THEME_CATALOG_KEY }] },
        {
          $set: {
            key: KANGUR_THEME_CATALOG_KEY,
            value: encodeSettingValue(KANGUR_THEME_CATALOG_KEY, nextCatalogValue),
            updatedAt: now,
          },
          $setOnInsert: {
            _id: KANGUR_THEME_CATALOG_KEY,
            createdAt: now,
          },
        },
        { upsert: true }
      );
    }

    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          dryRun: options.dryRun,
          forceCatalog: options.forceCatalog,
          results,
        },
        null,
        2
      )}\n`
    );
  } finally {
    await mongoClient.close();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
