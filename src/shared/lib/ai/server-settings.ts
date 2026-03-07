import 'server-only';

import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const AI_SETTINGS_KEYS = new Set([
  'ai_vision_model',
  'ai_vision_user_prompt',
  'ai_vision_prompt',
  'ai_vision_output_enabled',
  'openai_model',
  'openai_api_key',
  'description_generation_user_prompt',
  'description_generation_prompt',
  'ai_generation_output_enabled',
]);

const canUsePrismaSettings = (): boolean =>
  Boolean(process.env['DATABASE_URL']) && 'setting' in prisma;

const readMongoSettingValue = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoStringSettingRecord>('settings')
    .findOne({ $or: [{ _id: key }, { key }] });
  return typeof doc?.value === 'string' ? doc.value : null;
};

const readPrismaSettingValue = async (key: string): Promise<string | null> => {
  if (!canUsePrismaSettings()) return null;
  const setting = await prisma.setting.findUnique({
    where: { key },
    select: { value: true },
  });
  return setting?.value ?? null;
};

export async function getSettingValue(key: string): Promise<string | null> {
  const provider = await getAppDbProvider();
  const preferMongo =
    Boolean(process.env['MONGODB_URI']) && (provider === 'mongodb' || AI_SETTINGS_KEYS.has(key));

  if (preferMongo) {
    try {
      const mongoValue = await readMongoSettingValue(key);
      if (mongoValue !== null) return mongoValue;
    } catch (err) {
      void ErrorSystem.logWarning(`Mongo setting fetch failed for ${key}`, {
        service: 'ai-server-settings',
        key,
        error: err,
      });
    }
    try {
      return await readPrismaSettingValue(key);
    } catch (err) {
      void ErrorSystem.logWarning(`Prisma setting fetch failed for ${key}`, {
        service: 'ai-server-settings',
        key,
        error: err,
      });
    }
    return null;
  }

  try {
    const prismaValue = await readPrismaSettingValue(key);
    if (prismaValue !== null) return prismaValue;
  } catch (err) {
    void ErrorSystem.logWarning(`Prisma setting fetch failed for ${key}`, {
      service: 'ai-server-settings',
      key,
      error: err,
    });
  }

  if (process.env['MONGODB_URI']) {
    try {
      return await readMongoSettingValue(key);
    } catch (err) {
      void ErrorSystem.logWarning(`Mongo fallback setting fetch failed for ${key}`, {
        service: 'ai-server-settings',
        key,
        error: err,
      });
    }
  }

  return null;
}
