import 'server-only';

import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import { type PrismaSettingClient, canUsePrismaSettings } from './types';

type PortablePathSettingsStoreSettingRecord = {
  _id?: string;
  key?: string;
  value?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

const readSettingsRawFromPrisma = async (key: string): Promise<string | null> => {
  if (!canUsePrismaSettings(prisma)) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaClient = (prisma as any) as PrismaSettingClient;
    if (!prismaClient.setting || typeof prismaClient.setting.findUnique !== 'function') {
      return null;
    }
    const setting = await prismaClient.setting.findUnique({
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaClient = (prisma as any) as PrismaSettingClient;
    if (!prismaClient.setting || typeof prismaClient.setting.upsert !== 'function') {
      return false;
    }
    await prismaClient.setting.upsert({
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
      .collection<PortablePathSettingsStoreSettingRecord>('settings')
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
    await mongo
      .collection<PortablePathSettingsStoreSettingRecord>('settings')
      .updateOne(
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
