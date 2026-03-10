import 'server-only';

import type { MongoTimestampedStringSettingRecord } from '@/shared/contracts/settings';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import { canUsePrismaSettings, getPrismaSettingDelegate } from './types';

const readSettingsRawFromPrisma = async (key: string): Promise<string | null> => {
  if (!canUsePrismaSettings(prisma)) return null;
  try {
    const settingDelegate = getPrismaSettingDelegate(prisma);
    if (!settingDelegate) return null;
    const setting = await settingDelegate.findUnique({
      where: { key },
      select: { value: true },
    });
    return setting?.value ?? null;
  } catch {
    return null;
  }
};

const writeSettingsRawToPrisma = async (key: string, raw: string): Promise<boolean> => {
  if (!canUsePrismaSettings(prisma)) return false;
  try {
    const settingDelegate = getPrismaSettingDelegate(prisma);
    if (!settingDelegate || typeof settingDelegate.upsert !== 'function') {
      return false;
    }
    await settingDelegate.upsert({
      where: { key },
      create: { key, value: raw },
      update: { value: raw },
    });
    return true;
  } catch {
    return false;
  }
};

const readSettingsRawFromMongo = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  try {
    const mongo = await getMongoDb();
    const record = await mongo
      .collection<MongoTimestampedStringSettingRecord<string, Date>>('settings')
      .findOne(
        {
          $or: [{ _id: key }, { key }],
        },
        { projection: { value: 1 } }
      );
    return typeof record?.value === 'string' ? record.value : null;
  } catch {
    return null;
  }
};

const writeSettingsRawToMongo = async (key: string, raw: string): Promise<boolean> => {
  if (!process.env['MONGODB_URI']) return false;
  try {
    const mongo = await getMongoDb();
    const now = new Date();
    await mongo.collection<MongoTimestampedStringSettingRecord<string, Date>>('settings').updateOne(
      {
        $or: [{ _id: key }, { key }],
      },
      {
        $set: {
          key,
          value: raw,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: key,
          createdAt: now,
        },
      },
      { upsert: true }
    );
    return true;
  } catch {
    return false;
  }
};

export const readSettingsRawByProviderPriority = async (key: string): Promise<string | null> => {
  const provider = await Promise.resolve(getAppDbProvider()).catch(() => null);
  if (provider === 'mongodb') {
    const mongoRaw = await readSettingsRawFromMongo(key);
    if (mongoRaw !== null) return mongoRaw;
    return readSettingsRawFromPrisma(key);
  }
  const prismaRaw = await readSettingsRawFromPrisma(key);
  if (prismaRaw !== null) return prismaRaw;
  return readSettingsRawFromMongo(key);
};

export const writeSettingsRawByProviderPriority = async (
  key: string,
  raw: string
): Promise<boolean> => {
  const provider = await Promise.resolve(getAppDbProvider()).catch(() => null);
  if (provider === 'mongodb') {
    const mongoOk = await writeSettingsRawToMongo(key, raw);
    if (mongoOk) return true;
    return writeSettingsRawToPrisma(key, raw);
  }
  const prismaOk = await writeSettingsRawToPrisma(key, raw);
  if (prismaOk) return true;
  return writeSettingsRawToMongo(key, raw);
};
