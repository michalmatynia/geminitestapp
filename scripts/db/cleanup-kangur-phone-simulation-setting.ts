import 'dotenv/config';

import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';
import {
  KANGUR_LEGACY_SETTINGS_COLLECTION,
  KANGUR_SETTINGS_COLLECTION,
} from './kangur-settings-store';

const REMOVED_PHONE_SIMULATION_KEY = 'kangur_phone_simulation_settings_v1';
const shouldApply = process.argv.includes('--apply');

type SettingDoc = {
  _id?: string;
  key?: string;
};

const buildFilter = () => ({
  $or: [
    { _id: REMOVED_PHONE_SIMULATION_KEY },
    { key: REMOVED_PHONE_SIMULATION_KEY },
  ],
});

async function main(): Promise<void> {
  if (!process.env['MONGODB_URI']) {
    throw new Error(
      'MONGODB_URI is required to cleanup the removed Kangur phone simulation setting.'
    );
  }

  const mongoClient = await getMongoClient();

  try {
    const db = await getMongoDb();
    const legacySettingsCollection =
      db.collection<SettingDoc>(KANGUR_LEGACY_SETTINGS_COLLECTION);
    const kangurSettingsCollection =
      db.collection<SettingDoc>(KANGUR_SETTINGS_COLLECTION);

    const [legacyMatches, kangurMatches] = await Promise.all([
      legacySettingsCollection.countDocuments(buildFilter()),
      kangurSettingsCollection.countDocuments(buildFilter()),
    ]);

    const result = {
      mode: shouldApply ? 'apply' : 'dry-run',
      key: REMOVED_PHONE_SIMULATION_KEY,
      collections: {
        [KANGUR_LEGACY_SETTINGS_COLLECTION]: {
          matched: legacyMatches,
          deleted: 0,
        },
        [KANGUR_SETTINGS_COLLECTION]: {
          matched: kangurMatches,
          deleted: 0,
        },
      },
    };

    if (shouldApply) {
      const [legacyDeleteResult, kangurDeleteResult] = await Promise.all([
        legacySettingsCollection.deleteMany(buildFilter()),
        kangurSettingsCollection.deleteMany(buildFilter()),
      ]);

      result.collections[KANGUR_LEGACY_SETTINGS_COLLECTION].deleted =
        legacyDeleteResult.deletedCount ?? 0;
      result.collections[KANGUR_SETTINGS_COLLECTION].deleted =
        kangurDeleteResult.deletedCount ?? 0;
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
