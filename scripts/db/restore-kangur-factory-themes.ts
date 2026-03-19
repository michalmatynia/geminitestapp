import 'dotenv/config';

import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import {
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
} from '@/shared/contracts/kangur';
import type { MongoPersistedStringSettingRecord } from '@/shared/contracts/settings';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';
import { decodeSettingValue, encodeSettingValue } from '@/shared/lib/settings/settings-compression';
import { serializeSetting } from '@/shared/utils/settings-json';
import {
  KANGUR_FACTORY_DAILY_THEME,
  KANGUR_FACTORY_NIGHTLY_THEME,
} from '@/features/kangur/theme-settings';

type CliOptions = {
  dryRun: boolean;
};

type SettingPayload = {
  key: string;
  label: string;
  theme: ThemeSettings;
};

type SettingDoc = MongoPersistedStringSettingRecord<string, Date>;

type WriteResult = {
  key: string;
  label: string;
  status: 'unchanged' | 'update' | 'create';
};

const SETTINGS_COLLECTION = 'settings';

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
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
  });

  return options;
};

const buildPayloads = (): SettingPayload[] => {
  return [
    {
      key: KANGUR_DAILY_THEME_SETTINGS_KEY,
      label: 'daily',
      theme: KANGUR_FACTORY_DAILY_THEME,
    },
    {
      key: KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
      label: 'nightly',
      theme: KANGUR_FACTORY_NIGHTLY_THEME,
    },
  ];
};

const resolveStoredValue = (doc: SettingDoc | null | undefined, key: string): string | null => {
  if (!doc || typeof doc.value !== 'string') return null;
  return decodeSettingValue(key, doc.value);
};

const determineStatus = (current: string | null, nextValue: string): WriteResult['status'] => {
  if (current === nextValue) return 'unchanged';
  return current ? 'update' : 'create';
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is required to restore Kangur factory themes.');
  }

  const mongoClient = await getMongoClient();
  const results: WriteResult[] = [];

  try {
    const db = await getMongoDb();
    const collection = db.collection<SettingDoc>(SETTINGS_COLLECTION);
    const now = new Date();

    for (const payload of buildPayloads()) {
      const nextValue = serializeSetting(payload.theme);
      const existing = await collection.findOne({ key: payload.key }, { projection: { value: 1 } });
      const currentValue = resolveStoredValue(existing, payload.key);
      const status = determineStatus(currentValue, nextValue);
      results.push({ key: payload.key, label: payload.label, status });

      if (!options.dryRun && status !== 'unchanged') {
        await collection.updateOne(
          { key: payload.key },
          {
            $set: {
              value: encodeSettingValue(payload.key, nextValue),
              updatedAt: now,
            },
            $setOnInsert: {
              createdAt: now,
            },
          },
          { upsert: true }
        );
      }
    }

    process.stdout.write(
      `${JSON.stringify({ ok: true, dryRun: options.dryRun, results }, null, 2)}\n`
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
