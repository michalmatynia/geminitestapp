import 'dotenv/config';

import { getMongoDb } from '@/shared/lib/db/mongo-client';
import {
  AI_BRAIN_ROUTING_COLLECTION,
  AI_BRAIN_ROUTING_GLOBAL_ID,
  BRAIN_CAPABILITY_KEYS,
  parseBrainSettings,
  resolveBrainCapabilityAssignment,
  sanitizeBrainAssignment,
} from '@/shared/lib/ai-brain/settings';
import type {
  AiBrainAssignment,
  AiBrainCapabilityKey,
  AiBrainSettings,
} from '@/shared/contracts/ai-brain';

type CliOptions = {
  dryRun: boolean;
};

type SettingDoc = {
  _id?: string;
  key?: string;
  settings?: unknown;
  schemaVersion?: number;
  createdAt?: Date;
  updatedAt?: Date;
};

const parseArgs = (argv: string[]): CliOptions => ({
  dryRun: !argv.includes('--write'),
});

const readBrainSettings = async (): Promise<AiBrainSettings> => {
  const mongo = await getMongoDb();
  const doc = await mongo.collection<SettingDoc>(AI_BRAIN_ROUTING_COLLECTION).findOne({
    _id: AI_BRAIN_ROUTING_GLOBAL_ID,
  });
  return doc?.settings === undefined
    ? parseBrainSettings(null)
    : parseBrainSettings(JSON.stringify(doc.settings));
};

const writeBrainSettings = async (settings: AiBrainSettings): Promise<void> => {
  const mongo = await getMongoDb();
  const now = new Date();
  await mongo.collection<SettingDoc>(AI_BRAIN_ROUTING_COLLECTION).updateOne(
    { _id: AI_BRAIN_ROUTING_GLOBAL_ID },
    {
      $set: {
        key: AI_BRAIN_ROUTING_GLOBAL_ID,
        schemaVersion: 1,
        settings,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );
};

async function main(): Promise<void> {
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is required.');
  }
  const options = parseArgs(process.argv.slice(2));
  const currentSettings = await readBrainSettings();

  const nextCapabilities = Object.fromEntries(
    BRAIN_CAPABILITY_KEYS.map(
      (capability: AiBrainCapabilityKey): [AiBrainCapabilityKey, AiBrainAssignment] => [
        capability,
        sanitizeBrainAssignment(resolveBrainCapabilityAssignment(currentSettings, capability)),
      ]
    )
  ) as Record<AiBrainCapabilityKey, AiBrainAssignment>;

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
