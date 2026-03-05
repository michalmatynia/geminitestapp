import 'server-only';

import { internalError } from '@/shared/errors/app-error';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import {
  getDatabaseEnginePolicy,
  getDatabaseEngineServiceProvider,
  isPrimaryProviderConfigured,
} from '@/shared/lib/db/database-engine-policy';
import type { AppProviderValue as CmsDbProvider } from '@/shared/contracts/system';

export type { CmsDbProvider };

export const getCmsDataProvider = async (): Promise<CmsDbProvider> => {
  const policy = await getDatabaseEnginePolicy();
  const routeProvider = await getDatabaseEngineServiceProvider('cms');
  if (routeProvider) {
    if (routeProvider === 'redis') {
      throw internalError(
        'Database Engine route "cms" cannot target Redis. Configure Prisma or MongoDB.'
      );
    }
    if (policy.strictProviderAvailability && !isPrimaryProviderConfigured(routeProvider)) {
      throw internalError(
        `Database Engine route "cms" points to "${routeProvider}" but it is not configured.`
      );
    }
    return routeProvider;
  }

  if (policy.requireExplicitServiceRouting) {
    throw internalError(
      'Database Engine requires explicit routing for "cms". Configure it in Workflow Database -> Database Engine.'
    );
  }

  const provider = await getAppDbProvider();
  return provider;
};
