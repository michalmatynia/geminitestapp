import 'dotenv/config';

import {
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_DAWN_THEME_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
  KANGUR_SUNSET_THEME_SETTINGS_KEY,
} from '@/shared/contracts/kangur';
import { createKangurStorefrontAppearanceSeedSettings } from '@/features/kangur/appearance/server/storefront-appearance-source';
import {
  listKangurSettingsByKeys,
  upsertKangurSettingValue,
} from '@/features/kangur/services/kangur-settings-repository';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';

type CliOptions = {
  dryRun: boolean;
};

type SettingPayload = {
  key: string;
  label: string;
  value: string;
};

type WriteStatus = 'unchanged' | 'update' | 'create';

type WriteResult = {
  key: string;
  label: string;
  status: WriteStatus;
};

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

const THEME_SETTING_LABELS: Record<string, string> = {
  [KANGUR_DAILY_THEME_SETTINGS_KEY]: 'daily',
  [KANGUR_DAWN_THEME_SETTINGS_KEY]: 'dawn',
  [KANGUR_SUNSET_THEME_SETTINGS_KEY]: 'sunset',
  [KANGUR_NIGHTLY_THEME_SETTINGS_KEY]: 'nightly',
};

const buildPayloads = (): SettingPayload[] => {
  const seedMap = new Map(
    createKangurStorefrontAppearanceSeedSettings().map(({ key, value }) => [key, value])
  );
  return [
    KANGUR_DAILY_THEME_SETTINGS_KEY,
    KANGUR_DAWN_THEME_SETTINGS_KEY,
    KANGUR_SUNSET_THEME_SETTINGS_KEY,
    KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
  ].map((key) => ({
    key,
    label: THEME_SETTING_LABELS[key] ?? key,
    value: seedMap.get(key) ?? '',
  }));
};

const determineStatus = (current: string | undefined, nextValue: string): WriteStatus => {
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
    await getMongoDb();
    const payloads = buildPayloads();
    const storedSettings = await listKangurSettingsByKeys(payloads.map(({ key }) => key));
    const storedMap = new Map(storedSettings.map(({ key, value }) => [key, value]));

    for (const payload of payloads) {
      const currentValue = storedMap.get(payload.key);
      const status = determineStatus(currentValue, payload.value);
      results.push({ key: payload.key, label: payload.label, status });

      if (!options.dryRun && status !== 'unchanged') {
        await upsertKangurSettingValue(payload.key, payload.value);
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
