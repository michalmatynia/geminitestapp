import 'server-only';

import { AUTH_SETTINGS_KEYS } from '@/features/auth/utils/auth-management';
import { ErrorSystem } from '@/features/observability/server';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

export type AuthDbProvider = 'mongodb' | 'prisma';

const normalizeProvider = (value?: string | null): AuthDbProvider | null => {
  if (!value) return null;
  return value.toLowerCase().trim() === 'prisma' ? 'prisma' : 'mongodb';
};

const readMongoAuthProvider = async (): Promise<AuthDbProvider | null> => {
  if (!process.env.MONGODB_URI) return null;
  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<{ _id: string; key?: string; value?: string }>('settings')
      .findOne({ $or: [{ _id: AUTH_SETTINGS_KEYS.provider }, { key: AUTH_SETTINGS_KEYS.provider }] });
    return normalizeProvider(doc?.value ?? null);
  } catch {
    return null;
  }
};

const readPrismaAuthProvider = async (): Promise<AuthDbProvider | null> => {
  if (!process.env.DATABASE_URL) return null;
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: AUTH_SETTINGS_KEYS.provider },
      select: { value: true },
    });
    return normalizeProvider(setting?.value ?? null);
  } catch {
    return null;
  }
};

// Auth provider must be deterministic and never fail.
export const getAuthDataProvider = async (): Promise<AuthDbProvider> => {
  const mongoSetting = await readMongoAuthProvider();
  if (mongoSetting) return mongoSetting;
  const prismaSetting = await readPrismaAuthProvider();
  if (prismaSetting) return prismaSetting;
  if (process.env.MONGODB_URI) return 'mongodb';
  return 'prisma';
};

export const requireAuthProvider = (provider: AuthDbProvider): AuthDbProvider => {
  if (provider === 'prisma') {
    if (!process.env.DATABASE_URL) {
      void ErrorSystem.logWarning('[auth-provider] DATABASE_URL missing; falling back to MongoDB.', {
        service: 'auth-provider',
        requestedProvider: 'prisma'
      });
      return 'mongodb';
    }
    return 'prisma';
  }
  if (!process.env.MONGODB_URI) {
    void ErrorSystem.logWarning('[auth-provider] MONGODB_URI missing; falling back to Prisma.', {
      service: 'auth-provider',
      requestedProvider: 'mongodb'
    });
    return 'prisma';
  }
  return 'mongodb';
};
