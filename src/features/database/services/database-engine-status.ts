import 'server-only';

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { getAuthDataProvider } from '@/features/auth/services/auth-provider';
import { getCmsDataProvider } from '@/features/cms/services/cms-provider';
import { getIntegrationDataProvider } from '@/features/integrations/services/integration-provider';
import { getProductDataProvider } from '@/features/products/services/product-provider';
import type {
  DatabaseEngineCollectionStatusDto,
  DatabaseEnginePrimaryProviderDto,
  DatabaseEngineProviderDto,
  DatabaseEngineServiceStatusDto,
  DatabaseEngineServiceDto,
  DatabaseEngineStatusDto,
} from '@/shared/dtos/database';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import {
  getDatabaseEngineCollectionRouteMap,
  getDatabaseEnginePolicy,
  getDatabaseEngineServiceRouteMap,
  isPrimaryProviderConfigured,
  isRedisProviderConfigured,
} from '@/shared/lib/db/database-engine-policy';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

type DmmfModel = { name: string };
type DmmfDatamodel = { models?: DmmfModel[] };

const services: DatabaseEngineServiceDto[] = [
  'app',
  'auth',
  'product',
  'integrations',
  'cms',
];

const getPrismaSchemaPath = (): string => {
  const schemaPath = process.env['PRISMA_SCHEMA_PATH'];
  if (schemaPath) {
    return path.isAbsolute(schemaPath) ? schemaPath : path.join(process.cwd(), schemaPath);
  }
  return path.join(process.cwd(), 'prisma', 'schema.prisma');
};

const parsePrismaModelNamesFromSchema = (): string[] => {
  try {
    const raw = readFileSync(getPrismaSchemaPath(), 'utf8');
    const modelRegex = /model\s+(\w+)\s*\{/g;
    const names = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = modelRegex.exec(raw)) !== null) {
      if (match[1]) {
        names.add(match[1]);
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
};

const getKnownPrismaCollections = (): string[] => {
  if (!process.env['DATABASE_URL']) return [];
  try {
    const datamodel = (prisma as unknown as { _dmmf?: { datamodel?: DmmfDatamodel } })._dmmf?.datamodel;
    const modelNames = datamodel?.models?.map((model) => model.name) ?? [];
    if (modelNames.length > 0) {
      return Array.from(new Set(modelNames)).sort((a, b) => a.localeCompare(b));
    }
  } catch {
    // best effort
  }
  return parsePrismaModelNamesFromSchema();
};

const getKnownMongoCollections = async (): Promise<string[]> => {
  if (!process.env['MONGODB_URI']) return [];
  try {
    const mongo = await getMongoDb();
    const collections = await mongo.listCollections().toArray();
    return collections
      .map((collection) => collection.name)
      .filter((name): name is string => Boolean(name && !name.startsWith('system.')))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
};

const isProviderConfigured = (provider: DatabaseEngineProviderDto): boolean =>
  provider === 'redis'
    ? isRedisProviderConfigured()
    : isPrimaryProviderConfigured(provider);

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const resolveEffectiveServiceProvider = async (
  service: DatabaseEngineServiceDto
): Promise<DatabaseEnginePrimaryProviderDto> => {
  if (service === 'app') return getAppDbProvider();
  if (service === 'auth') return getAuthDataProvider();
  if (service === 'product') return getProductDataProvider();
  if (service === 'integrations') return getIntegrationDataProvider();
  return getCmsDataProvider();
};

const buildCollectionStatus = async (
  collectionRouteMap: Record<string, DatabaseEngineProviderDto>
): Promise<DatabaseEngineCollectionStatusDto> => {
  const [mongoCollections, prismaCollections] = await Promise.all([
    getKnownMongoCollections(),
    Promise.resolve(getKnownPrismaCollections()),
  ]);

  const knownCollections = Array.from(new Set([...mongoCollections, ...prismaCollections]))
    .sort((a, b) => a.localeCompare(b));
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
  policy: DatabaseEngineStatusDto['policy'];
  serviceRouteMap: Partial<Record<DatabaseEngineServiceDto, DatabaseEngineProviderDto>>;
}): Promise<DatabaseEngineServiceStatusDto[]> => {
  const { policy, serviceRouteMap } = params;
  return Promise.all(
    services.map(async (service): Promise<DatabaseEngineServiceStatusDto> => {
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
  policy: DatabaseEngineStatusDto['policy'];
  servicesStatus: DatabaseEngineServiceStatusDto[];
  collectionsStatus: DatabaseEngineCollectionStatusDto;
}): string[] => {
  const { policy, servicesStatus, collectionsStatus } = params;
  const issues: string[] = [];

  servicesStatus.forEach((status) => {
    if (status.unsupportedConfiguredProvider) {
      issues.push(`Service "${status.service}" is routed to Redis, but only Prisma/MongoDB are supported.`);
    }
    if (status.missingExplicitRoute) {
      issues.push(`Service "${status.service}" has no explicit route while explicit service routing is required.`);
    }
    if (policy.strictProviderAvailability && status.unavailableConfiguredProvider) {
      issues.push(`Service "${status.service}" is routed to an unavailable provider.`);
    }
    if (status.resolutionError) {
      issues.push(`Service "${status.service}" resolution failed: ${status.resolutionError}`);
    }
  });

  if (policy.requireExplicitCollectionRouting && collectionsStatus.missingExplicitRoutes.length > 0) {
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

export async function getDatabaseEngineStatus(): Promise<DatabaseEngineStatusDto> {
  const [policy, serviceRouteMap, collectionRouteMap] = await Promise.all([
    getDatabaseEnginePolicy(),
    getDatabaseEngineServiceRouteMap(),
    getDatabaseEngineCollectionRouteMap(),
  ]);

  const collectionsStatus = await buildCollectionStatus(collectionRouteMap);
  const servicesStatus = await buildServiceStatuses({ policy, serviceRouteMap });
  const blockingIssues = buildBlockingIssues({
    policy,
    servicesStatus,
    collectionsStatus,
  });

  return {
    timestamp: new Date().toISOString(),
    policy,
    providers: {
      prismaConfigured: isPrimaryProviderConfigured('prisma'),
      mongodbConfigured: isPrimaryProviderConfigured('mongodb'),
      redisConfigured: isRedisProviderConfigured(),
    },
    serviceRouteMap,
    collectionRouteMap,
    services: servicesStatus,
    collections: collectionsStatus,
    blockingIssues,
  };
}
