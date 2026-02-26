import 'server-only';

import { internalError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import {
  getDatabaseEnginePolicy,
  getDatabaseEngineServiceProvider,
  isPrimaryProviderConfigured,
} from './database-engine-policy';

export const APP_DB_PROVIDER_SETTING_KEY = 'app_db_provider';

export type AppDbProvider = 'prisma' | 'mongodb';

const readPositiveIntegerEnv = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const PROVIDER_CACHE_TTL_MS = readPositiveIntegerEnv(
  'APP_DB_PROVIDER_CACHE_TTL_MS',
  5 * 60_000
);
let providerCache: { value: AppDbProvider | null; ts: number } | null = null;
let providerInflight: Promise<AppDbProvider | null> | null = null;

const normalizeProvider = (value?: string | null): AppDbProvider | null => {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  if (normalized === 'mongodb') return 'mongodb';
  if (normalized === 'prisma') return 'prisma';
  return null;
};

const readMongoAppProviderSetting = async (): Promise<AppDbProvider | null> => {
  if (!process.env['MONGODB_URI']) return null;
  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<{ _id: string; key?: string; value?: string }>('settings')
      .findOne({
        $or: [
          { _id: APP_DB_PROVIDER_SETTING_KEY },
          { key: APP_DB_PROVIDER_SETTING_KEY },
        ],
      });
    return normalizeProvider(doc?.value ?? null);
  } catch {
    return null;
  }
};

const readPrismaAppProviderSetting = async (): Promise<AppDbProvider | null> => {
  if (!process.env['DATABASE_URL']) return null;
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: APP_DB_PROVIDER_SETTING_KEY },
      select: { value: true },
    });
    return normalizeProvider(setting?.value ?? null);
  } catch {
    return null;
  }
};

export const getAppDbProviderSetting = async (): Promise<AppDbProvider | null> => {
  const now = Date.now();
  if (providerCache && now - providerCache.ts < PROVIDER_CACHE_TTL_MS) {
    return providerCache.value;
  }
  if (providerInflight) {
    return providerInflight;
  }
  providerInflight = (async (): Promise<AppDbProvider | null> => {
    if (process.env['APP_DB_PROVIDER']) {
      const envProvider = normalizeProvider(process.env['APP_DB_PROVIDER']);
      if (envProvider) return envProvider;
    }
    const mongoSetting = await readMongoAppProviderSetting();
    if (mongoSetting) return mongoSetting;
    const prismaSetting = await readPrismaAppProviderSetting();
    if (prismaSetting) return prismaSetting;
    return null;
  })();
  const value = await providerInflight;
  providerCache = { value, ts: Date.now() };
  providerInflight = null;
  return value;
};

let resolvedProviderCache: { value: AppDbProvider; ts: number } | null = null;
const RESOLVED_PROVIDER_TTL_MS = 10000; // 10 seconds

export const getAppDbProvider = async (): Promise<AppDbProvider> => {
  const now = Date.now();
  if (resolvedProviderCache && now - resolvedProviderCache.ts < RESOLVED_PROVIDER_TTL_MS) {
    return resolvedProviderCache.value;
  }

  const policy = await getDatabaseEnginePolicy();
  const routeProvider = await getDatabaseEngineServiceProvider('app');
  let result: AppDbProvider;

  if (routeProvider) {
    if (routeProvider === 'redis') {
      throw internalError(
        'Database Engine route "app" cannot target Redis. Use Prisma or MongoDB.'
      );
    }
    if (!isPrimaryProviderConfigured(routeProvider)) {
      throw internalError(
        `Database Engine route "app" targets "${routeProvider}" but it is not configured in environment variables.`
      );
    }
    result = routeProvider;
  } else if (policy.requireExplicitServiceRouting) {
    throw internalError(
      'Database Engine requires explicit service routing for "app". Configure it in Workflow Database -> Database Engine.'
    );
  } else {
    const setting = await getAppDbProviderSetting();
    if (setting === 'mongodb') {
      if (!process.env['MONGODB_URI']) {
        throw internalError('App provider is set to MongoDB but MONGODB_URI is missing.');
      }
      result = 'mongodb';
    } else if (setting === 'prisma') {
      if (!process.env['DATABASE_URL']) {
        throw internalError('App provider is set to Prisma but DATABASE_URL is missing.');
      }
      result = 'prisma';
    } else if (process.env['DATABASE_URL'] && process.env['MONGODB_URI']) {
      result = 'mongodb';
    } else if (process.env['DATABASE_URL']) {
      result = 'prisma';
    } else if (process.env['MONGODB_URI']) {
      result = 'mongodb';
    } else {
      throw internalError('No database provider is configured. Set DATABASE_URL or MONGODB_URI.');
    }
  }

  resolvedProviderCache = { value: result, ts: now };
  return result;
};

export const invalidateAppDbProviderCache = (): void => {
  providerCache = null;
  providerInflight = null;
  resolvedProviderCache = null;
};
