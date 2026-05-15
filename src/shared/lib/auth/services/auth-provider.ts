/**
 * Auth Provider Service
 * 
 * Authentication database provider management.
 * Provides:
 * - Auth database provider resolution
 * - Database engine policy integration
 * - Primary provider configuration checking
 * - Service provider coordination
 * - Server-only provider management
 */

import 'server-only';

import type { AppProviderValue as AuthDbProvider } from '@/shared/contracts/system';
import { internalError } from '@/shared/errors/app-error';
import { AUTH_SETTINGS_KEYS } from '@/shared/lib/auth/constants';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import {
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

/**
 * getAuthDataProvider: Determines the authoritative database provider for authentication data.
 * It follows a prioritized resolution order:
 * 1. Environment variable (AUTH_DB_PROVIDER)
 * 2. MongoDB settings collection
 * 3. Database Engine policy/routing
 * 4. System-wide default application provider
 * 
 * @returns The resolved AuthDbProvider.
 * @throws {InternalError} If the resolved provider is not properly configured or routing is invalid.
 */
export const getAuthDataProvider = async (): Promise<AuthDbProvider> => {
  const appProvider = await getAppDbProvider();

  const envProvider = normalizeProvider(process.env['AUTH_DB_PROVIDER']);
  if (envProvider) {
    warnAuthProviderDrift(appProvider, envProvider, 'env');
    return ensureAvailableAuthProvider(envProvider);
  }

  const mongoProvider = await readMongoAuthProvider();
  if (mongoProvider) {
    warnAuthProviderDrift(appProvider, mongoProvider, 'mongo-setting');
    return ensureAvailableAuthProvider(mongoProvider);
  }

  const routeProvider = normalizeProvider(await getDatabaseEngineServiceProvider('auth'));
  if (routeProvider) {
    warnAuthProviderDrift(appProvider, routeProvider, 'route-map');
    return ensureAvailableAuthProvider(routeProvider);
  }

  warnAuthProviderDrift(appProvider, appProvider, 'default');
  return ensureAvailableAuthProvider(appProvider);
};

/**
 * requireAuthProvider: Validates that a provider can be utilized in the current environment
 * (e.g., checks for presence of connection strings).
 *
 * @param provider - The AuthDbProvider to validate.
 * @returns The validated provider.
 * @throws {InternalError} If the provider's connection requirements (e.g., MONGODB_URI) are missing.
 */
export const requireAuthProvider = (provider: AuthDbProvider): AuthDbProvider => {
  return ensureAvailableAuthProvider(provider);
}
