import 'server-only';

import type {
  DatabaseEngineCollectionStatus,
  DatabaseEnginePrimaryProvider,
  DatabaseEngineProvider,
  DatabaseEngineServiceStatus,
  DatabaseEngineService,
  DatabaseEngineStatus,
} from '@/shared/contracts/database';
import { getAuthDataProvider } from '@/shared/lib/auth/services/auth-provider';
import { getCmsDataProvider } from '@/shared/lib/cms/services/cms-provider';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { applyActiveMongoSourceEnv, getMongoSourceState } from '@/shared/lib/db/mongo-source';
import {
  getDatabaseEngineCollectionRouteMap,
  getDatabaseEnginePolicy,
  getDatabaseEngineServiceRouteMap,
  isPrimaryProviderConfigured,
  isRedisProviderConfigured,
} from '@/shared/lib/db/database-engine-policy';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { getIntegrationDataProvider } from '@/shared/lib/integrations/services/integration-provider';
import { getProductDataProvider } from '@/shared/lib/products/services/product-provider';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const services: DatabaseEngineService[] = ['app', 'auth', 'product', 'integrations', 'cms'];

const getKnownMongoCollections = async (): Promise<string[]> => {
  await applyActiveMongoSourceEnv();
  if (!process.env['MONGODB_URI']) return [];
  try {
    const mongo = await getMongoDb();
    const collections = await mongo.listCollections().toArray();
    return collections
      .map((collection) => collection.name)
      .filter((name): name is string => Boolean(name && !name.startsWith('system.')))
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    void ErrorSystem.captureException(error);
    void ErrorSystem.logWarning('[database-engine-status] Failed to list Mongo collections', {
      service: 'database-engine-status',
      error,
    });
    return [];
  }
};

const isProviderConfigured = (provider: DatabaseEngineProvider): boolean =>
  provider === 'redis' ? isRedisProviderConfigured() : isPrimaryProviderConfigured(provider);

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const resolveEffectiveServiceProvider = async (
  service: DatabaseEngineService
): Promise<DatabaseEnginePrimaryProvider> => {
  if (service === 'app') return getAppDbProvider();
  if (service === 'auth') return getAuthDataProvider();
  if (service === 'product') return getProductDataProvider();
  if (service === 'integrations') return getIntegrationDataProvider();
  return getCmsDataProvider();
};

const buildCollectionStatus = async (
  collectionRouteMap: Record<string, DatabaseEngineProvider>
): Promise<DatabaseEngineCollectionStatus> => {
  const knownCollections = await getKnownMongoCollections();
  const knownCollectionSet = new Set<string>(knownCollections);

  const missingExplicitRoutes = knownCollections
    .filter((collection) => collectionRouteMap[collection] === undefined)
    .sort((a, b) => a.localeCompare(b));

  const orphanedRoutes = Object.keys(collectionRouteMap)
    .filter((collection) => !knownCollectionSet.has(collection))
    .sort((a, b) => a.localeCompare(b));

  const unavailableConfiguredRoutes = Object.entries(collectionRouteMap)
    .filter(([_, provider]) => !isProviderConfigured(provider))
    .map(([collection, provider]) => ({ collection, provider }))
    .sort((a, b) => a.collection.localeCompare(b.collection));

  return {
    knownCollections,
    configuredCount: Object.keys(collectionRouteMap).length,
    missingExplicitRoutes,
    orphanedRoutes,
    unavailableConfiguredRoutes,
  };
};

const buildServiceStatuses = async (params: {
  policy: DatabaseEngineStatus['policy'];
  serviceRouteMap: Partial<Record<DatabaseEngineService, DatabaseEngineProvider>>;
}): Promise<DatabaseEngineServiceStatus[]> => {
  const { policy, serviceRouteMap } = params;
  return Promise.all(
    services.map(async (service): Promise<DatabaseEngineServiceStatus> => {
      const configuredProvider = serviceRouteMap[service] ?? null;
      const missingExplicitRoute = policy.requireExplicitServiceRouting && !configuredProvider;
      const unsupportedConfiguredProvider = configuredProvider === 'redis';
      const unavailableConfiguredProvider = configuredProvider
        ? !isProviderConfigured(configuredProvider)
        : false;

      try {
        const effectiveProvider = await resolveEffectiveServiceProvider(service);
        return {
          service,
          configuredProvider,
          effectiveProvider,
          missingExplicitRoute,
          unsupportedConfiguredProvider,
          unavailableConfiguredProvider,
          resolutionError: null,
        };
      } catch (error: unknown) {
        void ErrorSystem.captureException(error);
        return {
          service,
          configuredProvider,
          effectiveProvider: null,
          missingExplicitRoute,
          unsupportedConfiguredProvider,
          unavailableConfiguredProvider,
          resolutionError: getErrorMessage(error),
        };
      }
    })
  );
};

const buildBlockingIssues = (params: {
  policy: DatabaseEngineStatus['policy'];
  servicesStatus: DatabaseEngineServiceStatus[];
  collectionsStatus: DatabaseEngineCollectionStatus;
}): string[] => {
  const { policy, servicesStatus, collectionsStatus } = params;
  const issues: string[] = [];

  servicesStatus.forEach((status) => {
    if (status.unsupportedConfiguredProvider) {
      issues.push(
        `Service "${status.service}" is routed to Redis, but only MongoDB is supported.`
      );
    }
    if (status.missingExplicitRoute) {
      issues.push(
        `Service "${status.service}" has no explicit route while explicit service routing is required.`
      );
    }
    if (policy.strictProviderAvailability && status.unavailableConfiguredProvider) {
      issues.push(`Service "${status.service}" is routed to an unavailable provider.`);
    }
    if (status.resolutionError) {
      issues.push(`Service "${status.service}" resolution failed: ${status.resolutionError}`);
    }
  });

  if (
    policy.requireExplicitCollectionRouting &&
    collectionsStatus.missingExplicitRoutes.length > 0
  ) {
    issues.push(
      `${collectionsStatus.missingExplicitRoutes.length} collection(s) are missing explicit routes.`
    );
  }

  if (
    policy.strictProviderAvailability &&
    collectionsStatus.unavailableConfiguredRoutes.length > 0
  ) {
    issues.push(
      `${collectionsStatus.unavailableConfiguredRoutes.length} collection route(s) target unavailable providers.`
    );
  }

  return issues;
};

export async function getDatabaseEngineStatus(): Promise<DatabaseEngineStatus> {
  await applyActiveMongoSourceEnv();
  const [policy, partialServiceRouteMap, collectionRouteMap] = await Promise.all([
    getDatabaseEnginePolicy(),
    getDatabaseEngineServiceRouteMap(),
    getDatabaseEngineCollectionRouteMap(),
  ]);

  const collectionsStatus = await buildCollectionStatus(collectionRouteMap);
  const servicesStatus = await buildServiceStatuses({
    policy,
    serviceRouteMap: partialServiceRouteMap,
  });
  const serviceStatusByService = new Map(
    servicesStatus.map((status: DatabaseEngineServiceStatus) => [status.service, status])
  );
  const serviceRouteMap = services.reduce(
    (acc, service) => {
      const status = serviceStatusByService.get(service);
      const fallbackProvider = (status?.effectiveProvider ?? 'mongodb') as DatabaseEngineProvider;
      acc[service] = partialServiceRouteMap[service] ?? fallbackProvider;
      return acc;
    },
    {} as Record<DatabaseEngineService, DatabaseEngineProvider>
  );
  const blockingIssues = buildBlockingIssues({
    policy,
    servicesStatus,
    collectionsStatus,
  });

  return {
    timestamp: new Date().toISOString(),
    policy,
    providers: {
      mongodbConfigured: isPrimaryProviderConfigured('mongodb'),
      redisConfigured: isRedisProviderConfigured(),
    },
    mongoSource: await getMongoSourceState(),
    serviceRouteMap,
    collectionRouteMap,
    services: servicesStatus,
    collections: collectionsStatus,
    blockingIssues,
  };
}
