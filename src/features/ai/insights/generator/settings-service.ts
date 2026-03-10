import type { MongoStringSettingRecord } from '@/shared/contracts/settings';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

type PrismaSettingClient = {
  setting?: {
    findUnique: (input: {
      where: { key: string };
      select: { value: true };
    }) => Promise<{ value: string | null } | null>;
  };
};

type PrismaSettingDelegate = NonNullable<PrismaSettingClient['setting']>;

const isPrismaSettingDelegate = (value: unknown): value is PrismaSettingDelegate => {
  if (!value || typeof value !== 'object') return false;
  return typeof Reflect.get(value, 'findUnique') === 'function';
};

const getPrismaSettingDelegate = (): PrismaSettingDelegate | null => {
  if (!process.env['DATABASE_URL']) return null;
  const setting = Reflect.get(prisma, 'setting');
  return isPrismaSettingDelegate(setting) ? setting : null;
};

const readPrismaSettingValue = async (key: string): Promise<string | null> => {
  const prismaSetting = getPrismaSettingDelegate();
  if (!prismaSetting) return null;
  const setting = await prismaSetting.findUnique({
    where: { key },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const readMongoSettingValue = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoStringSettingRecord>('settings')
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

export const parseBooleanSetting = (
  value: string | null | undefined,
  fallback: boolean
): boolean => {
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
