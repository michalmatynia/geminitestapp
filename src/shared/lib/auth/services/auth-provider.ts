import 'server-only';

import type { AppProviderValue as AuthDbProvider } from '@/shared/contracts/system';
import { internalError } from '@/shared/errors/app-error';
import { AUTH_SETTINGS_KEYS } from '@/shared/lib/auth/constants';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import {
  getDatabaseEnginePolicy,
  getDatabaseEngineServiceProvider,
  isPrimaryProviderConfigured,
} from '@/shared/lib/db/database-engine-policy';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export type { AuthDbProvider };

const normalizeProvider = (value?: string | null): AuthDbProvider | null => {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  if (normalized === 'mongodb') return 'mongodb';
  return null;
};

const readMongoAuthProvider = async (): Promise<AuthDbProvider | null> => {
  if (!process.env['MONGODB_URI']) return null;
  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<{ _id: string; key?: string; value?: string }>('settings')
      .findOne({
        $or: [{ _id: AUTH_SETTINGS_KEYS.provider }, { key: AUTH_SETTINGS_KEYS.provider }],
      });
    return normalizeProvider(doc?.value ?? null);
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

const warnAuthProviderDrift = (
  appProvider: 'mongodb',
  authProvider: AuthDbProvider,
  source: 'env' | 'mongo-setting' | 'route-map' | 'default'
): void => {
  if (appProvider === authProvider) return;
  // Explicit auth provider settings are intentional overrides in mixed-provider deployments.
  if (source !== 'default') return;
  void ErrorSystem.logWarning(
    `Auth provider "${authProvider}" from ${source} differs from app provider "${appProvider}".`,
    {
      service: 'auth-provider',
      appProvider,
      authProvider,
      source,
    }
  );
};

const ensureAvailableAuthProvider = (provider: AuthDbProvider): AuthDbProvider => {
  if (isPrimaryProviderConfigured(provider)) return provider;

  throw internalError(`Auth provider "${provider}" is not configured in environment variables.`);
};

// Auth provider must be deterministic and never fail.
export const getAuthDataProvider = async (): Promise<AuthDbProvider> => {
  const policy = await getDatabaseEnginePolicy();
  const appProvider = await getAppDbProvider();
  const envProvider = normalizeProvider(process.env['AUTH_DB_PROVIDER']);
  if (envProvider) {
    warnAuthProviderDrift(appProvider, envProvider, 'env');
    return ensureAvailableAuthProvider(envProvider);
  }
  const mongoSetting = await readMongoAuthProvider();
  if (mongoSetting) {
    warnAuthProviderDrift(appProvider, mongoSetting, 'mongo-setting');
    return ensureAvailableAuthProvider(mongoSetting);
  }

  const routeProvider = await getDatabaseEngineServiceProvider('auth');
  if (routeProvider) {
    if (routeProvider === 'redis') {
      throw internalError('Database Engine route "auth" cannot target Redis. Configure MongoDB.');
    }
    if (routeProvider !== 'mongodb') {
      throw internalError(
        `Database Engine route "auth" targets "${routeProvider}" but only MongoDB is supported.`
      );
    }
    warnAuthProviderDrift(appProvider, routeProvider, 'route-map');
    return ensureAvailableAuthProvider(routeProvider);
  }

  if (policy.requireExplicitServiceRouting) {
    throw internalError(
      'Database Engine requires explicit routing for "auth". Configure it in Workflow Database -> Database Engine.'
    );
  }

  const defaultProvider: AuthDbProvider = appProvider;
  warnAuthProviderDrift(appProvider, defaultProvider, 'default');
  return ensureAvailableAuthProvider(defaultProvider);
};

export const requireAuthProvider = (provider: AuthDbProvider): AuthDbProvider => {
  if (provider === 'mongodb' && !process.env['MONGODB_URI']) {
    throw internalError(
      'Auth provider is set to MongoDB but MONGODB_URI is missing. Configure Database Engine routing before continuing.'
    );
  }

  return provider;
};
