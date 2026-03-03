/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

type SettingDoc = { key?: string; value?: string; _id?: string };

const canUsePrismaSettings = (): boolean =>
  Boolean(process.env['DATABASE_URL']) && 'setting' in (prisma as any);

const readPrismaSettingValue = async (key: string): Promise<string | null> => {
  if (!canUsePrismaSettings()) return null;
  const setting = await (prisma as any).setting.findUnique({
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

export const readInsightSettingValue = async (key: string): Promise<string | null> => {
  const provider = await getAppDbProvider().catch(() => null);

  if (provider === 'mongodb') {
    try {
      const mongoValue = await readMongoSettingValue(key);
      if (mongoValue !== null) return mongoValue;
    } catch {
      // Continue with fallback
    }
    try {
      return await readPrismaSettingValue(key);
    } catch {
      return null;
    }
  }

  if (provider === 'prisma') {
    try {
      const prismaValue = await readPrismaSettingValue(key);
      if (prismaValue !== null) return prismaValue;
    } catch {
      // Continue with fallback
    }
    try {
      return await readMongoSettingValue(key);
    } catch {
      return null;
    }
  }

  try {
    const prismaValue = await readPrismaSettingValue(key);
    if (prismaValue !== null) return prismaValue;
  } catch {
    // Fall back
  }

  try {
    return await readMongoSettingValue(key);
  } catch {
    return null;
  }
};

export const parseBooleanSetting = (value: string | null | undefined, fallback: boolean): boolean => {
  if (value == null) return fallback;
  return value === 'true' || value === '1';
};

export const parseNumberSetting = (
  value: string | null | undefined,
  fallback: number,
  min: number = 1
): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return parsed;
};

export const readSettingWithFallback = async (keys: readonly string[]): Promise<string | null> => {
  for (const key of keys) {
    const value = await readInsightSettingValue(key);
    if (value !== null) return value;
  }
  return null;
};
