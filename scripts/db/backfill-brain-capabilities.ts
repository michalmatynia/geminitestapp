import 'dotenv/config';

import prisma from '@/shared/lib/db/prisma';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import {
  AI_BRAIN_SETTINGS_KEY,
  BRAIN_CAPABILITY_KEYS,
  parseBrainSettings,
  resolveBrainCapabilityAssignment,
  sanitizeBrainAssignment,
} from '@/shared/lib/ai-brain/settings';
import type {
  AiBrainCapabilityAssignment,
  AiBrainCapabilityKey,
  AiBrainSettings,
} from '@/shared/contracts/ai-brain';

type CliOptions = {
  dryRun: boolean;
};

type SettingDoc = {
  _id?: string;
  key?: string;
  value?: string;
};

const parseArgs = (argv: string[]): CliOptions => ({
  dryRun: !argv.includes('--write'),
});

const readBrainSettings = async (): Promise<AiBrainSettings> => {
  const provider = await getAppDbProvider().catch(() => 'prisma' as const);

  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const doc = await mongo.collection<SettingDoc>('settings').findOne({
      $or: [{ _id: AI_BRAIN_SETTINGS_KEY }, { key: AI_BRAIN_SETTINGS_KEY }],
    });
    return parseBrainSettings(doc?.value ?? null);
  }

  if (!('setting' in prisma)) {
    return parseBrainSettings(null);
  }

  const setting = await prisma.setting.findUnique({
    where: { key: AI_BRAIN_SETTINGS_KEY },
    select: { value: true },
  });
  return parseBrainSettings(setting?.value ?? null);
};

const writeBrainSettings = async (settings: AiBrainSettings): Promise<void> => {
  const value = JSON.stringify(settings);
  const provider = await getAppDbProvider();

  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    await mongo.collection<SettingDoc>('settings').updateOne(
      {
        $or: [{ _id: AI_BRAIN_SETTINGS_KEY }, { key: AI_BRAIN_SETTINGS_KEY }],
      },
      {
        $set: {
          key: AI_BRAIN_SETTINGS_KEY,
          value,
        },
        $setOnInsert: {
          _id: AI_BRAIN_SETTINGS_KEY,
        },
      },
      { upsert: true }
    );
    return;
  }

  if (!('setting' in prisma)) {
    throw new Error('Prisma settings model is unavailable.');
  }

  await prisma.setting.upsert({
    where: { key: AI_BRAIN_SETTINGS_KEY },
    update: { value },
    create: { key: AI_BRAIN_SETTINGS_KEY, value },
  });
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const currentSettings = await readBrainSettings();

  const nextCapabilities = Object.fromEntries(
    BRAIN_CAPABILITY_KEYS.map(
      (capability: AiBrainCapabilityKey): [AiBrainCapabilityKey, AiBrainCapabilityAssignment] => [
        capability,
        sanitizeBrainAssignment(resolveBrainCapabilityAssignment(currentSettings, capability)),
      ]
    )
  ) as Record<AiBrainCapabilityKey, AiBrainCapabilityAssignment>;

  const nextSettings: AiBrainSettings = {
    ...currentSettings,
    capabilities: {
      ...(currentSettings.capabilities ?? {}),
      ...nextCapabilities,
    },
  };

  const changed =
    JSON.stringify(currentSettings.capabilities ?? null) !==
    JSON.stringify(nextSettings.capabilities ?? null);

  if (!options.dryRun && changed) {
    await writeBrainSettings(nextSettings);
  }

  console.log(
    JSON.stringify(
      {
        mode: options.dryRun ? 'dry-run' : 'write',
        changed,
        previousCapabilities: currentSettings.capabilities ?? null,
        nextCapabilities,
      },
      null,
      2
    )
  );
}

void main().catch((error) => {
  console.error('Failed to backfill Brain capabilities:', error);
  process.exit(1);
});
