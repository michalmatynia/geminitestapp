import 'server-only';

import { z } from 'zod';

import type { Alert } from '@/shared/contracts/observability';
import { alertSchema } from '@/shared/contracts/observability';
import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

const SETTINGS_COLLECTION = 'settings';
const SYSTEM_ALERTS_SETTINGS_KEY = 'system_alert_definitions_v1';

const canUsePrismaSettings = (): boolean =>
  Boolean(process.env['DATABASE_URL']) && 'setting' in prisma;

const readPrismaSetting = async (key: string): Promise<string | null> => {
  if (!canUsePrismaSettings()) return null;
  try {
    const setting = await prisma.setting.findUnique({
      where: { key },
      select: { value: true },
    });
    return setting?.value ?? null;
  } catch {
    return null;
  }
};

const readMongoSetting = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoStringSettingRecord>(SETTINGS_COLLECTION)
    .findOne({ $or: [{ _id: key }, { key }] });
  return typeof doc?.value === 'string' ? doc.value : null;
};

const readSettingValue = async (key: string): Promise<string | null> => {
  const provider = await getAppDbProvider();
  if (provider === 'mongodb') {
    return readMongoSetting(key);
  }
  return readPrismaSetting(key);
};

const alertArraySchema = z.array(alertSchema).catch([]);

export const getSystemAlerts = async (): Promise<Alert[]> => {
  const raw = await readSettingValue(SYSTEM_ALERTS_SETTINGS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return alertArraySchema.parse(parsed);
  } catch {
    return [];
  }
};
