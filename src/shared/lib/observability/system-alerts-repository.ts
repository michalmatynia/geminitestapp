import 'server-only';

import { z } from 'zod';

import type { Alert } from '@/shared/contracts/observability';
import { alertSchema } from '@/shared/contracts/observability';
import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const SETTINGS_COLLECTION = 'settings';
const SYSTEM_ALERTS_SETTINGS_KEY = 'system_alert_definitions_v1';

const readMongoSetting = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoStringSettingRecord>(SETTINGS_COLLECTION)
    .findOne({ $or: [{ _id: key }, { key }] });
  return typeof doc?.value === 'string' ? doc.value : null;
};

const readSettingValue = async (key: string): Promise<string | null> => readMongoSetting(key);

const alertArraySchema = z.array(alertSchema).catch([]);

export const getSystemAlerts = async (): Promise<Alert[]> => {
  const raw = await readSettingValue(SYSTEM_ALERTS_SETTINGS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return alertArraySchema.parse(parsed);
  } catch (error) {
    void ErrorSystem.captureException(error);
    return [];
  }
};
