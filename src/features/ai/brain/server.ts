import 'server-only';

import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import {
  AI_BRAIN_SETTINGS_KEY,
  parseBrainSettings,
  resolveBrainAssignment,
  type AiBrainAssignment,
  type AiBrainFeature,
} from './settings';

type SettingDoc = { key?: string; value?: string; _id?: string };

const canUsePrismaSettings = (): boolean =>
  Boolean(process.env['DATABASE_URL']) && 'setting' in prisma;

const readPrismaSettingValue = async (key: string): Promise<string | null> => {
  if (!canUsePrismaSettings()) return null;
  const setting = await prisma.setting.findUnique({
    where: { key },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const readMongoSettingValue = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<SettingDoc>('settings')
    .findOne({ $or: [{ _id: key }, { key }] });
  return typeof doc?.value === 'string' ? doc.value : null;
};

let cachedBrainSettingsValue: string | null = null;
let lastBrainSettingsFetchAt = 0;
const BRAIN_SETTINGS_TTL_MS = 30000; // 30 seconds

const readBrainSettingValue = async (key: string): Promise<string | null> => {
  const now = Date.now();
  if (key === AI_BRAIN_SETTINGS_KEY && cachedBrainSettingsValue !== null && now - lastBrainSettingsFetchAt < BRAIN_SETTINGS_TTL_MS) {
    return cachedBrainSettingsValue;
  }

  const provider = await getAppDbProvider().catch(() => null);
  let value: string | null = null;

  const tryPrisma = async () => {
    try { return await readPrismaSettingValue(key); } catch { return null; }
  };
  const tryMongo = async () => {
    try { return await readMongoSettingValue(key); } catch { return null; }
  };

  if (provider === 'mongodb') {
    value = await tryMongo() || await tryPrisma();
  } else {
    value = await tryPrisma() || await tryMongo();
  }

  if (key === AI_BRAIN_SETTINGS_KEY) {
    cachedBrainSettingsValue = value;
    lastBrainSettingsFetchAt = now;
  }

  return value;
};

export const getBrainAssignmentForFeature = async (
  feature: AiBrainFeature
): Promise<AiBrainAssignment> => {
  const raw = await readBrainSettingValue(AI_BRAIN_SETTINGS_KEY);
  const settings = parseBrainSettings(raw);
  return resolveBrainAssignment(settings, feature);
};
