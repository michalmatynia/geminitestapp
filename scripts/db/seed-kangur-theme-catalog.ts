import 'dotenv/config';

import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import type { MongoPersistedStringSettingRecord } from '@/shared/contracts/settings';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';
import { decodeSettingValue, encodeSettingValue } from '@/shared/lib/settings/settings-compression';
import { serializeSetting } from '@/shared/utils/settings-json';
import {
  KANGUR_DAILY_BLOOM_THEME,
  KANGUR_NIGHTLY_AURORA_THEME,
  KANGUR_THEME_CATALOG_KEY,
  type KangurThemeCatalogEntry,
} from '@/features/kangur/theme-settings';

type CliOptions = {
  dryRun: boolean;
  force: boolean;
};

type SettingDoc = MongoPersistedStringSettingRecord<string, Date>;

const SETTINGS_COLLECTION = 'settings';
const DAILY_BLOOM_ID = 'kangur-daily-bloom';
const NIGHTLY_AURORA_ID = 'kangur-nightly-aurora';

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
    force: false,
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
    if (arg === '--force') {
      options.force = true;
    }
  });

  return options;
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

const buildDailyBloomEntry = (
  createdAt: string,
  updatedAt: string
): KangurThemeCatalogEntry => ({
  id: DAILY_BLOOM_ID,
  name: 'Daily Bloom',
  settings: KANGUR_DAILY_BLOOM_THEME as ThemeSettings,
  createdAt,
  updatedAt,
});

const buildNightlyAuroraEntry = (
  createdAt: string,
  updatedAt: string
): KangurThemeCatalogEntry => ({
  id: NIGHTLY_AURORA_ID,
  name: 'Nightly Aurora',
  settings: KANGUR_NIGHTLY_AURORA_THEME as ThemeSettings,
  createdAt,
  updatedAt,
});

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is required to seed the Kangur theme catalog.');
  }

  const mongoClient = await getMongoClient();

  try {
    const db = await getMongoDb();
    const collection = db.collection<SettingDoc>(SETTINGS_COLLECTION);

    const existing = await collection.findOne(
      { key: KANGUR_THEME_CATALOG_KEY },
      { projection: { value: 1 } }
    );
    const currentValue = existing?.value
      ? decodeSettingValue(KANGUR_THEME_CATALOG_KEY, existing.value)
      : null;
    const catalog = parseCatalog(currentValue);
    const existingDaily = catalog.find((entry) => entry.id === DAILY_BLOOM_ID);
    const existingNightly = catalog.find((entry) => entry.id === NIGHTLY_AURORA_ID);
    const nowIso = new Date().toISOString();

    const nextCatalog = (() => {
      const next = [...catalog];
      const upsert = (
        entryId: string,
        builder: (createdAt: string, updatedAt: string) => KangurThemeCatalogEntry,
        existing: KangurThemeCatalogEntry | undefined
      ) => {
        const existingIndex = next.findIndex((entry) => entry.id === entryId);
        if (existingIndex === -1) {
          next.push(builder(nowIso, nowIso));
          return;
        }
        if (!options.force) {
          return;
        }
        const updated = builder(existing?.createdAt ?? nowIso, nowIso);
        next[existingIndex] = {
          ...updated,
          createdAt: existing?.createdAt ?? updated.createdAt,
          updatedAt: nowIso,
        };
      };

      upsert(DAILY_BLOOM_ID, buildDailyBloomEntry, existingDaily);
      upsert(NIGHTLY_AURORA_ID, buildNightlyAuroraEntry, existingNightly);

      return next;
    })();

    const nextValue = serializeSetting(nextCatalog);
    const hasChanges = nextValue !== (currentValue ?? '');

    if (!options.dryRun && hasChanges) {
      await collection.updateOne(
        { key: KANGUR_THEME_CATALOG_KEY },
        {
          $set: {
            value: encodeSettingValue(KANGUR_THEME_CATALOG_KEY, nextValue),
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
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
          force: options.force,
          status: hasChanges ? 'update' : 'unchanged',
          entryPresent: {
            [DAILY_BLOOM_ID]: Boolean(existingDaily),
            [NIGHTLY_AURORA_ID]: Boolean(existingNightly),
          },
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
