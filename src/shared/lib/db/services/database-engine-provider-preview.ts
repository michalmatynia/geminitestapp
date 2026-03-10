import 'server-only';

import type {
  DatabaseEngineCollectionProviderPreviewItem,
  DatabaseEngineProviderPreview,
} from '@/shared/contracts/database';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import {
  getCollectionProvider,
  getCollectionRouteMap,
} from '@/shared/lib/db/collection-provider-map';
import { getDatabaseEnginePolicy } from '@/shared/lib/db/database-engine-policy';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { getDatabaseEngineStatus } from './database-engine-status';

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const uniqueSorted = (items: string[]): string[] =>
  Array.from(new Set(items.filter((item) => item.trim().length > 0))).sort((a, b) =>
    a.localeCompare(b)
  );

export async function getDatabaseEngineProviderPreview(input?: {
  collections?: string[];
}): Promise<DatabaseEngineProviderPreview> {
  const [policy, routeMap, status] = await Promise.all([
    getDatabaseEnginePolicy(),
    getCollectionRouteMap(),
    getDatabaseEngineStatus(),
  ]);

  let appProvider: 'mongodb' | 'prisma' | null = null;
  let appProviderError: string | null = null;
  try {
    appProvider = await getAppDbProvider();
  } catch (error: unknown) {
    void ErrorSystem.logWarning(
      '[database-engine-provider-preview] Failed to get app DB provider',
      {
        service: 'database-engine-provider-preview',
        error,
      }
    );
    appProviderError = toErrorMessage(error);
  }

  const fromRequest = input?.collections ?? [];
  const candidates =
    fromRequest.length > 0
      ? uniqueSorted(fromRequest)
      : uniqueSorted([...status.collections.knownCollections, ...Object.keys(routeMap)]);

  const items: DatabaseEngineCollectionProviderPreviewItem[] = await Promise.all(
    candidates.map(async (collection) => {
      const configuredProvider = routeMap[collection] ?? null;
      if (configuredProvider === 'mongodb' || configuredProvider === 'prisma') {
        return {
          collection,
          configuredProvider,
          effectiveProvider: configuredProvider,
          source: 'collection_route' as const,
          error: null,
        };
      }
      if (configuredProvider === 'redis') {
        return {
          collection,
          configuredProvider,
          effectiveProvider: null,
          source: 'error' as const,
          error:
            `Collection "${collection}" is routed to Redis; ` +
            'this operation path supports only MongoDB/Prisma.',
        };
      }

      try {
        const effectiveProvider = await getCollectionProvider(collection);
        return {
          collection,
          configuredProvider: null,
          effectiveProvider,
          source: 'app_provider' as const,
          error: null,
        };
      } catch (error: unknown) {
        void ErrorSystem.logWarning(
          '[database-engine-provider-preview] Failed to get collection provider',
          {
            service: 'database-engine-provider-preview',
            collection,
            error,
          }
        );
        return {
          collection,
          configuredProvider: null,
          effectiveProvider: null,
          source: 'error' as const,
          error: toErrorMessage(error),
        };
      }
    })
  );

  return {
    timestamp: new Date().toISOString(),
    policy,
    appProvider,
    appProviderError,
    collections: items,
  };
}
