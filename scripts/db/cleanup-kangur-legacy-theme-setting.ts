import 'dotenv/config';

import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';

const LEGACY_THEME_KEY = 'kangur_cms_theme_v1';
const SETTINGS_COLLECTION = 'settings';
const KANGUR_SETTINGS_COLLECTION = 'kangur_settings';
const shouldApply = process.argv.includes('--apply');

type SettingDoc = {
  _id?: string;
  key?: string;
};

const buildFilter = () => ({
  $or: [{ _id: LEGACY_THEME_KEY }, { key: LEGACY_THEME_KEY }],
});

async function main(): Promise<void> {
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is required to cleanup the Kangur legacy theme setting.');
  }

  const mongoClient = await getMongoClient();

  try {
    const db = await getMongoDb();
    const settingsCollection = db.collection<SettingDoc>(SETTINGS_COLLECTION);
    const kangurSettingsCollection = db.collection<SettingDoc>(KANGUR_SETTINGS_COLLECTION);

    const [settingsMatches, kangurSettingsMatches] = await Promise.all([
      settingsCollection.countDocuments(buildFilter()),
      kangurSettingsCollection.countDocuments(buildFilter()),
    ]);

    const result = {
      mode: shouldApply ? 'apply' : 'dry-run',
      key: LEGACY_THEME_KEY,
      collections: {
        [SETTINGS_COLLECTION]: {
          matched: settingsMatches,
          deleted: 0,
        },
        [KANGUR_SETTINGS_COLLECTION]: {
          matched: kangurSettingsMatches,
          deleted: 0,
        },
      },
    };

    if (shouldApply) {
      const [settingsDeleteResult, kangurSettingsDeleteResult] = await Promise.all([
        settingsCollection.deleteMany(buildFilter()),
        kangurSettingsCollection.deleteMany(buildFilter()),
      ]);

      result.collections[SETTINGS_COLLECTION].deleted = settingsDeleteResult.deletedCount ?? 0;
      result.collections[KANGUR_SETTINGS_COLLECTION].deleted =
        kangurSettingsDeleteResult.deletedCount ?? 0;
    }

    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await mongoClient.close();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
