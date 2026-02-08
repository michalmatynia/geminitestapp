import 'server-only';

import { AUTH_SETTINGS_KEYS } from '@/features/auth/utils/auth-management';
import { ErrorSystem } from '@/features/observability/server';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

export type AuthDbProvider = 'mongodb' | 'prisma';

const normalizeProvider = (value?: string | null): AuthDbProvider | null => {
  if (!value) return null;
  return value.toLowerCase().trim() === 'prisma' ? 'prisma' : 'mongodb';
};

const readMongoAuthProvider = async (): Promise<AuthDbProvider | null> => {
  if (!process.env["MONGODB_URI"]) return null;
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
  if (!process.env["DATABASE_URL"]) return null;
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

const warnAuthProviderDrift = (
  appProvider: 'prisma' | 'mongodb',
  authProvider: AuthDbProvider,
  source: 'mongo-setting' | 'prisma-setting' | 'fallback'
): void => {
  if (appProvider === authProvider) return;
  // Explicit auth provider settings are intentional overrides in mixed-provider deployments.
  if (source !== 'fallback') return;
  console.warn(
    `[auth-provider] Auth provider "${authProvider}" from ${source} differs from app provider "${appProvider}".`
  );
};

// Auth provider must be deterministic and never fail.
export const getAuthDataProvider = async (): Promise<AuthDbProvider> => {
  const appProvider = await getAppDbProvider();
  const mongoSetting = await readMongoAuthProvider();
  if (mongoSetting) {
    warnAuthProviderDrift(appProvider, mongoSetting, 'mongo-setting');
    return mongoSetting;
  }
  const prismaSetting = await readPrismaAuthProvider();
  if (prismaSetting) {
    warnAuthProviderDrift(appProvider, prismaSetting, 'prisma-setting');
    return prismaSetting;
  }
  const fallbackProvider: AuthDbProvider = process.env["MONGODB_URI"] ? 'mongodb' : 'prisma';
  warnAuthProviderDrift(appProvider, fallbackProvider, 'fallback');
  return fallbackProvider;
};

export const requireAuthProvider = (provider: AuthDbProvider): AuthDbProvider => {
  if (provider === 'prisma') {
    if (!process.env["DATABASE_URL"]) {
      void ErrorSystem.logWarning('[auth-provider] DATABASE_URL missing; falling back to MongoDB.', {
        service: 'auth-provider',
        requestedProvider: 'prisma'
      });
      return 'mongodb';
    }
    return 'prisma';
  }
  if (!process.env["MONGODB_URI"]) {
    void ErrorSystem.logWarning('[auth-provider] MONGODB_URI missing; falling back to Prisma.', {
      service: 'auth-provider',
      requestedProvider: 'mongodb'
    });
    return 'prisma';
  }
  return 'mongodb';
};
