import 'server-only';

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

const AI_BRAIN_USE_MONGO_SETTINGS =
  process.env['AI_BRAIN_USE_MONGO_SETTINGS'] === 'true' ||
  !process.env['DATABASE_URL'];

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

const readBrainSettingValue = async (key: string): Promise<string | null> => {
  try {
    const prismaValue = await readPrismaSettingValue(key);
    if (prismaValue !== null) return prismaValue;
  } catch {
    // Continue with defaults if settings storage is unavailable.
  }

  if (!AI_BRAIN_USE_MONGO_SETTINGS) {
    return null;
  }

  try {
    return await readMongoSettingValue(key);
  } catch {
    return null;
  }
};

export const getBrainAssignmentForFeature = async (
  feature: AiBrainFeature
): Promise<AiBrainAssignment> => {
  const raw = await readBrainSettingValue(AI_BRAIN_SETTINGS_KEY);
  const settings = parseBrainSettings(raw);
  return resolveBrainAssignment(settings, feature);
};
