import 'dotenv/config';

import {
  createKangurStorefrontAppearanceSeedSettings,
} from '@/features/kangur/appearance/server/storefront-appearance-source';
import { createKangurThemePresetManifestSeedSetting } from '@/features/kangur/appearance/server/theme-preset-manifest-source';
import {
  listKangurSettingsByKeys,
  upsertKangurSettingValue,
} from '@/features/kangur/services/kangur-settings-repository';
import { getMongoClient } from '@/shared/lib/db/mongo-client';

type CliOptions = {
  dryRun: boolean;
  force: boolean;
};

type WriteStatus = 'unchanged' | 'create' | 'update';

type WriteResult = {
  key: string;
  status: WriteStatus;
  willWrite: boolean;
};

const hasStoredSettingValue = (value: string | undefined): boolean =>
  typeof value === 'string' && value.trim().length > 0;

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

const resolveStatus = (currentValue: string | undefined, nextValue: string): WriteStatus => {
  if (currentValue === nextValue) {
    return 'unchanged';
  }
  return hasStoredSettingValue(currentValue) ? 'update' : 'create';
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is required to seed Kangur appearance settings.');
  }

  const mongoClient = await getMongoClient();

  try {
    const seedSettings = createKangurStorefrontAppearanceSeedSettings();
    const presetManifestSetting = createKangurThemePresetManifestSeedSetting();
    const allSeedSettings = [...seedSettings, presetManifestSetting];
    const seedKeys = allSeedSettings.map(({ key }) => key);
    const seedMap = new Map(allSeedSettings.map(({ key, value }) => [key, value]));
    const storedSettings = await listKangurSettingsByKeys(seedKeys);
    const storedMap = new Map(storedSettings.map(({ key, value }) => [key, value]));

    const results = seedKeys.map((key): WriteResult => {
      const currentValue = storedMap.get(key);
      const nextValue = seedMap.get(key) ?? '';
      const status = resolveStatus(currentValue, nextValue);
      const willWrite =
        status !== 'unchanged' &&
        (options.force || !hasStoredSettingValue(currentValue));

      return {
        key,
        status,
        willWrite,
      };
    });

    if (!options.dryRun) {
      for (const result of results) {
        if (!result.willWrite) {
          continue;
        }
        await upsertKangurSettingValue(result.key, seedMap.get(result.key) ?? '');
      }
    }

    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          dryRun: options.dryRun,
          force: options.force,
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
