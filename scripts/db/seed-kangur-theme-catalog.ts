import 'dotenv/config';

import type { MongoPersistedStringSettingRecord } from '@/shared/contracts/settings';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';
import { decodeSettingValue, encodeSettingValue } from '@/shared/lib/settings/settings-compression';
import { serializeSetting } from '@/shared/utils/settings-json';
import {
  createKangurThemeCatalogSeedEntries,
} from '@/features/kangur/appearance/server/theme-catalog-source';
import {
  KANGUR_THEME_CATALOG_KEY,
  type KangurThemeCatalogEntry,
} from '@/features/kangur/appearance/theme-settings';

type CliOptions = {
  dryRun: boolean;
  force: boolean;
};

type SettingDoc = MongoPersistedStringSettingRecord<string, Date>;

const SETTINGS_COLLECTION = 'kangur_settings';

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
      { $or: [{ _id: KANGUR_THEME_CATALOG_KEY }, { key: KANGUR_THEME_CATALOG_KEY }] },
      { projection: { _id: 1, key: 1, value: 1 } }
    );
    const currentValue = existing?.value
      ? decodeSettingValue(KANGUR_THEME_CATALOG_KEY, existing.value)
      : null;
    const catalog = parseCatalog(currentValue);
    const nowIso = new Date().toISOString();
    const seedEntries = createKangurThemeCatalogSeedEntries({
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    const nextCatalog = (() => {
      const next = [...catalog];
      const upsert = (seedEntry: KangurThemeCatalogEntry) => {
        const existingIndex = next.findIndex((entry) => entry.id === seedEntry.id);
        const existingEntry = existingIndex === -1 ? undefined : next[existingIndex];
        if (existingIndex === -1) {
          next.push(seedEntry);
          return;
        }
        if (!options.force) {
          return;
        }
        next[existingIndex] = {
          ...seedEntry,
          createdAt: existingEntry?.createdAt ?? seedEntry.createdAt,
          updatedAt: nowIso,
        };
      };

      seedEntries.forEach(upsert);

      return next;
    })();

    const nextValue = serializeSetting(nextCatalog);
    const hasChanges = nextValue !== (currentValue ?? '');

    if (!options.dryRun && hasChanges) {
      await collection.updateOne(
        { $or: [{ _id: KANGUR_THEME_CATALOG_KEY }, { key: KANGUR_THEME_CATALOG_KEY }] },
        {
          $set: {
            key: KANGUR_THEME_CATALOG_KEY,
            value: encodeSettingValue(KANGUR_THEME_CATALOG_KEY, nextValue),
            updatedAt: new Date(),
          },
          $setOnInsert: {
            _id: KANGUR_THEME_CATALOG_KEY,
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
          entryPresent: Object.fromEntries(
            seedEntries.map((entry) => [entry.id, catalog.some((item) => item.id === entry.id)])
          ),
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
