import 'server-only';

import { AUTH_SETTINGS_KEYS } from '@/features/auth/utils/auth-management';
import { ErrorSystem } from '@/features/observability/server';
import { internalError } from '@/shared/errors/app-error';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import {
  getDatabaseEnginePolicy,
  getDatabaseEngineServiceProvider,
  isPrimaryProviderConfigured,
} from '@/shared/lib/db/database-engine-policy';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

export type AuthDbProvider = 'mongodb' | 'prisma';

const normalizeProvider = (value?: string | null): AuthDbProvider | null => {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  if (normalized === 'prisma') return 'prisma';
  if (normalized === 'mongodb') return 'mongodb';
  return null;
};

const readMongoAuthProvider = async (): Promise<AuthDbProvider | null> => {
  if (!process.env['MONGODB_URI']) return null;
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
  if (!process.env['DATABASE_URL']) return null;
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
  source: 'mongo-setting' | 'prisma-setting' | 'route-map' | 'fallback'
): void => {
  if (appProvider === authProvider) return;
  // Explicit auth provider settings are intentional overrides in mixed-provider deployments.
  if (source !== 'fallback') return;
  void ErrorSystem.logWarning(`Auth provider "${authProvider}" from ${source} differs from app provider "${appProvider}".`, {
    service: 'auth-provider',
    appProvider,
    authProvider,
    source
  });
};

const ensureAvailableAuthProvider = (
  provider: AuthDbProvider,
  options: {
    allowAutomaticFallback: boolean;
    source: 'mongo-setting' | 'prisma-setting' | 'route-map' | 'fallback';
  }
): AuthDbProvider => {
  if (isPrimaryProviderConfigured(provider)) return provider;

  if (!options.allowAutomaticFallback) {
    throw internalError(
      `Auth provider "${provider}" is not configured in environment variables and automatic fallback is disabled by Database Engine policy.`
    );
  }

  const fallback: AuthDbProvider = provider === 'prisma' ? 'mongodb' : 'prisma';
  if (isPrimaryProviderConfigured(fallback)) {
    void ErrorSystem.logWarning('[auth-provider] Requested provider unavailable; using fallback provider.', {
      service: 'auth-provider',
      requestedProvider: provider,
      fallbackProvider: fallback,
      source: options.source,
    });
    return fallback;
  }

  throw internalError(
    `Auth provider "${provider}" is unavailable and no fallback provider is configured.`
  );
};

// Auth provider must be deterministic and never fail.
export const getAuthDataProvider = async (): Promise<AuthDbProvider> => {
  const policy = await getDatabaseEnginePolicy();
  const appProvider = await getAppDbProvider();
  const mongoSetting = await readMongoAuthProvider();
  if (mongoSetting) {
    warnAuthProviderDrift(appProvider, mongoSetting, 'mongo-setting');
    return ensureAvailableAuthProvider(mongoSetting, {
      allowAutomaticFallback: policy.allowAutomaticFallback,
      source: 'mongo-setting',
    });
  }
  const prismaSetting = await readPrismaAuthProvider();
  if (prismaSetting) {
    warnAuthProviderDrift(appProvider, prismaSetting, 'prisma-setting');
    return ensureAvailableAuthProvider(prismaSetting, {
      allowAutomaticFallback: policy.allowAutomaticFallback,
      source: 'prisma-setting',
    });
  }

  const routeProvider = await getDatabaseEngineServiceProvider('auth');
  if (routeProvider) {
    if (routeProvider === 'redis') {
      throw internalError(
        'Database Engine route "auth" cannot target Redis. Configure Prisma or MongoDB.'
      );
    }
    warnAuthProviderDrift(appProvider, routeProvider, 'route-map');
    return ensureAvailableAuthProvider(routeProvider, {
      allowAutomaticFallback: policy.allowAutomaticFallback,
      source: 'route-map',
    });
  }

  if (policy.requireExplicitServiceRouting) {
    throw internalError(
      'Database Engine requires explicit routing for "auth". Configure it in Workflow Database -> Database Engine.'
    );
  }

  const fallbackProvider: AuthDbProvider = appProvider;
  warnAuthProviderDrift(appProvider, fallbackProvider, 'fallback');
  return ensureAvailableAuthProvider(fallbackProvider, {
    allowAutomaticFallback: policy.allowAutomaticFallback,
    source: 'fallback',
  });
};

export const requireAuthProvider = (provider: AuthDbProvider): AuthDbProvider => {
  if (provider === 'prisma' && !process.env['DATABASE_URL']) {
    throw internalError(
      'Auth provider is set to Prisma but DATABASE_URL is missing. Configure Database Engine routing before continuing.'
    );
  }
  if (provider === 'mongodb' && !process.env['MONGODB_URI']) {
    throw internalError(
      'Auth provider is set to MongoDB but MONGODB_URI is missing. Configure Database Engine routing before continuing.'
    );
  }

  return provider;
};
