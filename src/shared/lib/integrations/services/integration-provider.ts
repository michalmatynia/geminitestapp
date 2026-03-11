import 'server-only';

import { internalError } from '@/shared/errors/app-error';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import {
  getDatabaseEnginePolicy,
  getDatabaseEngineServiceProvider,
  isPrimaryProviderConfigured,
} from '@/shared/lib/db/database-engine-policy';

type IntegrationDbProvider = 'mongodb';

export const getIntegrationDataProvider = async (): Promise<IntegrationDbProvider> => {
  const policy = await getDatabaseEnginePolicy();
  const routeProvider = await getDatabaseEngineServiceProvider('integrations');
  if (routeProvider) {
    if (routeProvider === 'redis') {
      throw internalError('Database Engine route "integrations" cannot target Redis. Configure MongoDB.');
    }
    if (routeProvider !== 'mongodb') {
      throw internalError(
        `Database Engine route "integrations" points to "${routeProvider}" but only MongoDB is supported.`
      );
    }
    if (policy.strictProviderAvailability && !isPrimaryProviderConfigured(routeProvider)) {
      throw internalError(
        `Database Engine route "integrations" points to "${routeProvider}" but it is not configured.`
      );
    }
    return routeProvider;
  }

  if (policy.requireExplicitServiceRouting) {
    throw internalError(
      'Database Engine requires explicit routing for "integrations". Configure it in Workflow Database -> Database Engine.'
    );
  }

  await getAppDbProvider();
  return 'mongodb';
};
