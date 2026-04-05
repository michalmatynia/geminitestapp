import {
  fetchBaseCategories,
  resolveBaseConnectionToken,
} from '@/features/integrations/server';
import {
  getTraderaCategories,
  type TraderaPublicApiCredentials,
} from '@/features/integrations/services/tradera-api-client';
import { resolveTraderaPublicApiCredentials } from '@/features/integrations/services/tradera-listing/api';
import { fetchTraderaCategoriesForConnection } from '@/features/integrations/services/tradera-listing/categories';
import type {
  BaseCategory,
  IntegrationConnectionRecord,
  IntegrationRecord,
  MarketplaceConnectionRequest,
  MarketplaceFetchResponse,
} from '@/shared/contracts/integrations';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

const BASE_MARKETPLACE_SLUGS = new Set(['baselinker', 'base', 'base-com']);
const TRADERA_MARKETPLACE_SLUGS = new Set(['tradera', 'tradera-api']);

export type CategoryFetchIntegrationRepository = {
  getConnectionById: (id: string) => Promise<IntegrationConnectionRecord | null>;
  getIntegrationById: (id: string) => Promise<IntegrationRecord | null>;
};

export type MarketplaceCategoryFetchContext =
  | {
      connectionId: string;
      connection: IntegrationConnectionRecord;
      inventoryId: string | null;
      sourceName: 'Base.com';
      token: string;
      mode: 'base';
    }
  | {
      connectionId: string;
      connection: IntegrationConnectionRecord;
      sourceName: 'Tradera';
      mode: 'tradera';
    }
  | {
      connectionId: string;
      connection: IntegrationConnectionRecord;
      sourceName: 'Tradera';
      apiCredentials: TraderaPublicApiCredentials;
      mode: 'tradera-api';
    };

export const requireMarketplaceConnectionId = (
  body: Pick<MarketplaceConnectionRequest, 'connectionId'>
): string => {
  if (!body.connectionId) {
    throw badRequestError('connectionId is required');
  }
  return body.connectionId;
};

export const resolveMarketplaceCategoryFetchContext = async (
  integrationRepo: CategoryFetchIntegrationRepository,
  connectionId: string
): Promise<MarketplaceCategoryFetchContext> => {
  const connection = await integrationRepo.getConnectionById(connectionId);
  if (!connection) {
    throw notFoundError('Connection not found');
  }

  const integration = await integrationRepo.getIntegrationById(connection.integrationId);
  if (!integration) {
    throw notFoundError('Integration not found');
  }

  const integrationSlug = (integration.slug ?? '').toLowerCase();
  if (!integrationSlug) {
    throw badRequestError('Integration slug is missing');
  }

  if (BASE_MARKETPLACE_SLUGS.has(integrationSlug)) {
    const tokenResolution = resolveBaseConnectionToken({
      baseApiToken: connection.baseApiToken,
    });
    if (!tokenResolution.token) {
      throw badRequestError(
        tokenResolution.error ?? 'Base.com API token not configured for this connection'
      );
    }

    return {
      connectionId,
      connection,
      inventoryId: connection.baseLastInventoryId ?? null,
      sourceName: 'Base.com',
      token: tokenResolution.token,
      mode: 'base',
    };
  }

  if (TRADERA_MARKETPLACE_SLUGS.has(integrationSlug)) {
    // Prefer the SOAP API when the connection has API credentials (appId + appKey).
    // The API is faster and not subject to UI changes on the Tradera listing form.
    try {
      const apiCredentials = resolveTraderaPublicApiCredentials(connection);
      return {
        connectionId,
        connection,
        sourceName: 'Tradera',
        apiCredentials,
        mode: 'tradera-api',
      };
    } catch {
      // No API credentials — fall back to Playwright browser scrape.
      return {
        connectionId,
        connection,
        sourceName: 'Tradera',
        mode: 'tradera',
      };
    }
  }

  throw badRequestError(`${integration.name} is not yet supported for category fetch`);
};

export const fetchMarketplaceCategories = async (
  context: MarketplaceCategoryFetchContext
): Promise<BaseCategory[]> => {
  if (context.mode === 'base') {
    return fetchBaseCategories(context.token, {
      inventoryId: context.inventoryId,
    });
  }

  if (context.mode === 'tradera-api') {
    return getTraderaCategories(context.apiCredentials);
  }

  return fetchTraderaCategoriesForConnection(context.connection);
};

export const buildEmptyMarketplaceCategoryFetchResponse = (
  sourceName: string
): MarketplaceFetchResponse => ({
  fetched: 0,
  total: 0,
  message: `No categories found in ${sourceName}.`,
});

export const buildMarketplaceCategoryFetchResponse = (
  sourceName: string,
  syncedCount: number,
  total: number
): MarketplaceFetchResponse => ({
  fetched: syncedCount,
  total,
  message: `Successfully synced ${syncedCount} categories from ${sourceName}`,
});
