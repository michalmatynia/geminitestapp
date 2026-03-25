import 'server-only';

import type { AppProviderValue as ProductDbProvider } from '@/shared/contracts/system';
import { internalError } from '@/shared/errors/app-error';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import {
  getDatabaseEnginePolicy,
  getDatabaseEngineServiceProvider,
  isPrimaryProviderConfigured,
} from '@/shared/lib/db/database-engine-policy';

export type { ProductDbProvider };

const PRODUCT_PROVIDER_CACHE_TTL_MS = 10_000;
let productProviderCache: { value: ProductDbProvider; ts: number } | null = null;
let productProviderInflight: Promise<ProductDbProvider> | null = null;

export const getProductDataProvider = async (): Promise<ProductDbProvider> => {
  const now = Date.now();
  if (productProviderCache && now - productProviderCache.ts < PRODUCT_PROVIDER_CACHE_TTL_MS) {
    return productProviderCache.value;
  }
  if (productProviderInflight) {
    return productProviderInflight;
  }

  productProviderInflight = (async (): Promise<ProductDbProvider> => {
    const [policy, routeProvider] = await Promise.all([
      getDatabaseEnginePolicy(),
      getDatabaseEngineServiceProvider('product'),
    ]);
    if (routeProvider) {
      if (routeProvider === 'redis') {
        throw internalError('Database Engine route "product" cannot target Redis. Configure MongoDB.');
      }
      if (routeProvider !== 'mongodb') {
        throw internalError(
          `Database Engine route "product" points to "${routeProvider}" but only MongoDB is supported.`
        );
      }
      if (policy.strictProviderAvailability && !isPrimaryProviderConfigured(routeProvider)) {
        throw internalError(
          `Database Engine route "product" points to "${routeProvider}" but it is not configured.`
        );
      }
      return routeProvider;
    }

    if (policy.requireExplicitServiceRouting) {
      throw internalError(
        'Database Engine requires explicit routing for "product". Configure it in Workflow Database -> Database Engine.'
      );
    }

    await getAppDbProvider();
    return 'mongodb';
  })();

  try {
    const value = await productProviderInflight;
    productProviderCache = { value, ts: Date.now() };
    return value;
  } finally {
    productProviderInflight = null;
  }
};

export const invalidateProductDataProviderCache = (): void => {
  productProviderCache = null;
  productProviderInflight = null;
};
