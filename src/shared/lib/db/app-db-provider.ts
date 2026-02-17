import 'server-only';

import { internalError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import {
  getDatabaseEnginePolicy,
  getDatabaseEngineServiceProvider,
  isPrimaryProviderConfigured,
} from './database-engine-policy';

const logSystemEvent = async (params: { level: string; message: string; source: string; context?: Record<string, unknown> }): Promise<void> => {
  try {
    // eslint-disable-next-line import/no-restricted-paths
    const mod = await import('@/features/observability/server');
    await mod.logSystemEvent(params as any);
  } catch {
    // ignore
  }
};

export const APP_DB_PROVIDER_SETTING_KEY = 'app_db_provider';

export type AppDbProvider = 'prisma' | 'mongodb';

const PROVIDER_CACHE_TTL_MS = 30_000;
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

export const getAppDbProvider = async (): Promise<AppDbProvider> => {
  const policy = await getDatabaseEnginePolicy();
  const routeProvider = await getDatabaseEngineServiceProvider('app');
  if (routeProvider) {
    if (routeProvider === 'redis') {
      throw internalError(
        'Database Engine route "app" cannot target Redis. Use Prisma or MongoDB.'
      );
    }
    if (policy.strictProviderAvailability && !isPrimaryProviderConfigured(routeProvider)) {
      throw internalError(
        `Database Engine route "app" targets "${routeProvider}" but it is not configured in environment variables.`
      );
    }
    return routeProvider;
  }

  if (policy.requireExplicitServiceRouting) {
    throw internalError(
      'Database Engine requires explicit service routing for "app". Configure it in Workflow Database -> Database Engine.'
    );
  }

  const setting = await getAppDbProviderSetting();
  if (setting === 'mongodb') {
    if (process.env['MONGODB_URI']) return 'mongodb';
    if (!policy.allowAutomaticFallback || policy.strictProviderAvailability) {
      throw internalError(
        'App provider is set to MongoDB but MONGODB_URI is missing. Automatic fallback is disabled by Database Engine policy.'
      );
    }
    void logSystemEvent({
      level: 'warn',
      message: 'MONGODB_URI missing; falling back to Prisma.',
      source: 'app-db-provider'
    });
    if (process.env['DATABASE_URL']) return 'prisma';
    throw internalError(
      'No available fallback provider. Configure DATABASE_URL or update Database Engine routing.'
    );
  }
  if (setting === 'prisma') {
    if (process.env['DATABASE_URL']) return 'prisma';
    if (policy.allowAutomaticFallback && process.env['MONGODB_URI']) {
      void logSystemEvent({
        level: 'warn',
        message: 'DATABASE_URL missing; falling back to MongoDB.',
        source: 'app-db-provider'
      });
      return 'mongodb';
    }
    if (!policy.allowAutomaticFallback || policy.strictProviderAvailability) {
      throw internalError(
        'App provider is set to Prisma but DATABASE_URL is missing. Automatic fallback is disabled by Database Engine policy.'
      );
    }
    throw internalError(
      'DATABASE_URL missing; Prisma is selected but unavailable. Configure DATABASE_URL or set an explicit route in Database Engine.'
    );
  }

  if (!policy.allowAutomaticFallback) {
    throw internalError(
      'No explicit app provider configured. Configure APP provider in Workflow Database -> Database Engine.'
    );
  }

  // No explicit setting found — detect from available connections.
  // Prefer Prisma when both are configured to avoid accidental MongoDB drift.
  if (process.env['DATABASE_URL'] && process.env['MONGODB_URI']) {
    void logSystemEvent({
      level: 'warn',
      message: 'Both DATABASE_URL and MONGODB_URI are set without explicit provider; defaulting to Prisma.',
      source: 'app-db-provider'
    });
    return 'prisma';
  }
  if (process.env['MONGODB_URI']) return 'mongodb';
  return 'prisma';
};

export const invalidateAppDbProviderCache = (): void => {
  providerCache = null;
  providerInflight = null;
};
